import { Worker, Job, DelayedError } from 'bullmq';
import { redis } from '../lib/redis';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { env } from '../config/env';
import { ThrottlingService } from '../services/ThrottlingService';
import { EmailService } from '../services/EmailService';
import { QueueService } from '../services/QueueService';
import { SlackIntegrationService } from '../services/SlackIntegrationService';
import { ElasticsearchService } from '../services/ElasticsearchService';

interface EmailJobData {
  deliveryId: string;
}

export const emailWorker = new Worker<EmailJobData>(
  'email-deliveries',
  async (job: Job<EmailJobData>) => {
    const { deliveryId } = job.data;
    const attempt = job.attemptsMade;
    
    logger.info({ jobId: job.id, deliveryId, attempt, event: 'EMAIL_PROCESSING' }, 'Worker started processing job');

    // 1. Atomic DB state transition to PROCESSING (includes SCHEDULED for crash window)
    const updatedCount = await prisma.emailDelivery.updateMany({
      where: {
        id: deliveryId,
        status: { in: ['SCHEDULED', 'QUEUED', 'DEFERRED'] }
      },
      data: { status: 'PROCESSING', attempts: { increment: 1 } }
    });

    if (updatedCount.count === 0) {
      logger.warn({ deliveryId }, 'Aborting job: Delivery not in SCHEDULED/QUEUED/DEFERRED state');
      return;
    }

    // Update ES status (fire-and-forget)
    ElasticsearchService.updateDeliveryStatus(deliveryId, 'PROCESSING').catch(err => {
      logger.error({ err, deliveryId }, 'Failed to update ES status to PROCESSING');
    });

    const delivery = await prisma.emailDelivery.findUnique({
      where: { id: deliveryId },
      include: { campaign: true, sender: true }
    });

    if (!delivery) {
      logger.error({ deliveryId }, 'Delivery record not found after transition');
      return;
    }

    // 2. Throttling Check
    const throttleConstraints = {
      minDelayMs: delivery.campaign.delayBetweenEmails ?? parseInt(env.MIN_EMAIL_DELAY_MS, 10),
      hourlyLimit: delivery.campaign.hourlyLimit ?? parseInt(env.MAX_EMAILS_PER_HOUR_PER_SENDER, 10)
    };

    const throttleResult = await ThrottlingService.reserveSendSlot(delivery.senderId, delivery.id, throttleConstraints);

    if (throttleResult.status === 'DEFER') {
      logger.info({ 
        deliveryId, 
        reason: throttleResult.reason, 
        nextAvailableAt: throttleResult.nextAvailableAt,
        event: 'EMAIL_DEFERRED'
      }, 'Throttling limit reached. Deferring job.');

      if (throttleResult.reason === 'HOURLY_LIMIT_REACHED') {
        // Run notification in background without awaiting, or await it but wrap in try/catch 
        // to guarantee it never fails the worker. The service itself is safe, but we double protect.
        SlackIntegrationService.notifyHourlyLimitReached(
          delivery.sender.userId, 
          delivery.sender.email, 
          throttleConstraints.hourlyLimit
        ).catch(err => {
          logger.error({ err, deliveryId }, 'Failed to trigger Slack notification logic');
        });
      }

      await prisma.emailDelivery.updateMany({
        where: { id: deliveryId, status: 'PROCESSING' },
        data: { status: 'DEFERRED' }
      });

      // Update ES status (fire-and-forget)
      ElasticsearchService.updateDeliveryStatus(deliveryId, 'DEFERRED', throttleResult.reason).catch(err => {
        logger.error({ err, deliveryId }, 'Failed to update ES status to DEFERRED');
      });

      const delayMs = Math.max(0, throttleResult.nextAvailableAt - Date.now());
      if (job.token) {
        await job.moveToDelayed(Date.now() + delayMs, job.token);
        throw new DelayedError();
      } else {
        logger.error({ deliveryId }, 'Job has no token for moveToDelayed');
        throw new Error('Rate limited but no job token available');
      }
    }

    // 3. Send Email
    try {
      const startedAt = new Date();
      const providerMessageId = await EmailService.sendEmail({
        to: delivery.recipient,
        subject: delivery.campaign.subject,
        html: delivery.campaign.body,
        senderEmail: delivery.sender.email,
        senderName: delivery.sender.name || undefined
      });

      // 4. Success -> SENT
      await prisma.emailDelivery.updateMany({
        where: { id: deliveryId, status: 'PROCESSING' },
        data: {
          status: 'SENT',
          sentAt: new Date(),
          providerMessageId
        }
      });

      const completedAt = new Date();
      logger.info({ 
        deliveryId, 
        providerMessageId, 
        attempt: delivery.attempts,
        scheduledAt: delivery.scheduledAt,
        startedAt,
        completedAt,
        event: 'EMAIL_SENT' 
      }, 'Email sent successfully');

      // Update ES status (fire-and-forget)
      ElasticsearchService.updateDeliveryStatus(deliveryId, 'SENT').catch(err => {
        logger.error({ err, deliveryId }, 'Failed to update ES status to SENT');
      });

    } catch (error: any) {
      // 5. Failure -> QUEUED (retryable) or FAILED
      const isFinalAttempt = attempt >= (job.opts.attempts || 3);
      const nextStatus = isFinalAttempt ? 'FAILED' : 'QUEUED';
      const lastError = error instanceof Error ? error.message : String(error);

      await prisma.emailDelivery.updateMany({
        where: { id: deliveryId, status: 'PROCESSING' },
        data: {
          status: nextStatus,
          failedAt: nextStatus === 'FAILED' ? new Date() : null,
          lastError
        }
      });

      // Update ES status (fire-and-forget)
      ElasticsearchService.updateDeliveryStatus(deliveryId, nextStatus, lastError).catch(err => {
        logger.error({ err, deliveryId }, `Failed to update ES status to ${nextStatus}`);
      });

      logger.error({ 
        deliveryId, 
        error: lastError, 
        nextStatus, 
        event: 'EMAIL_FAILED' 
      }, 'Email sending failed');

      if (!isFinalAttempt) {
        throw error; // Let BullMQ retry
      }
    }
  },
  { 
    connection: redis,
    concurrency: parseInt(env.WORKER_CONCURRENCY, 10),
    autorun: false // We will start it manually
  }
);

emailWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err: err.message }, 'BullMQ job failed');
});
