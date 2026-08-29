import { Queue } from 'bullmq';
import { redis } from '../lib/redis';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';

export const emailQueue = new Queue('email-deliveries', { connection: redis });

export class QueueService {
  /**
   * Enqueue a delayed job into BullMQ
   * @param deliveryId - The ID of the EmailDelivery
   * @param delayMs - Delay in milliseconds
   */
  static async enqueueDelivery(deliveryId: string, delayMs: number = 0): Promise<void> {
    // The jobId must be deterministic based on the delivery identity
    await emailQueue.add('send-email', { deliveryId }, {
      jobId: deliveryId,
      delay: delayMs > 0 ? delayMs : 0,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000, // 5s, 10s, 20s
      },
      removeOnComplete: true,
      removeOnFail: false,
    });
    
    logger.info({ deliveryId, delayMs, event: 'EMAIL_QUEUED' }, 'Enqueued delivery to BullMQ');
  }

  /**
   * Bulk enqueue delayed jobs into BullMQ
   * @param deliveries - Array of { id, delayMs }
   */
  static async enqueueBulkDeliveries(deliveries: { id: string, delayMs: number }[]): Promise<void> {
    const jobs = deliveries.map(d => ({
      name: 'send-email',
      data: { deliveryId: d.id },
      opts: {
        jobId: d.id,
        delay: d.delayMs > 0 ? d.delayMs : 0,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: false,
      }
    }));
    
    // Type casting to any because addBulk typings can be strict
    await emailQueue.addBulk(jobs as any);
    
    logger.info({ count: deliveries.length, event: 'EMAIL_BULK_QUEUED' }, 'Bulk enqueued deliveries to BullMQ');
  }

  /**
   * Safe DB ↔ BullMQ Reconciliation
   * Queries DB for EmailDelivery records where status is 'SCHEDULED' or 'DEFERRED'.
   * Checks BullMQ if job exists, if not, enqueues it.
   */
  static async reconcileQueue(): Promise<void> {
    logger.info('Starting queue reconciliation...');
    
    // We check for items that might have missed being enqueued.
    // In a real system, you might paginate or process in batches.
    const pendingDeliveries = await prisma.emailDelivery.findMany({
      where: {
        status: {
          in: ['SCHEDULED', 'DEFERRED'],
        },
      },
      select: {
        id: true,
        scheduledAt: true,
      },
    });

    let enqueuedCount = 0;
    const now = Date.now();

    for (const delivery of pendingDeliveries) {
      // Check if job exists in BullMQ
      const job = await emailQueue.getJob(delivery.id);
      
      if (!job) {
        const delay = Math.max(0, delivery.scheduledAt.getTime() - now);
        
        await this.enqueueDelivery(delivery.id, delay);
        
        // Update DB status to QUEUED safely
        await prisma.emailDelivery.updateMany({
          where: {
            id: delivery.id,
            status: { in: ['SCHEDULED', 'DEFERRED'] }
          },
          data: { status: 'QUEUED' }
        });
        
        enqueuedCount++;
      }
    }

    logger.info({ found: pendingDeliveries.length, enqueued: enqueuedCount }, 'Queue reconciliation complete');
  }
}
