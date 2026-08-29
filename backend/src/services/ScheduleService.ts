import { prisma } from '../lib/prisma';
import { QueueService } from './QueueService';
import { logger } from '../lib/logger';
import { ElasticsearchService } from './ElasticsearchService';

export interface ScheduleEmailOptions {
  senderId: string;
  campaignId: string;
  recipient: string;
  scheduledAt: Date;
  idempotencyKey?: string;
}

export class ScheduleService {
  static async scheduleEmail(opts: ScheduleEmailOptions) {
    try {
      // 1. Create the EmailDelivery record with SCHEDULED status
      // We rely on PostgreSQL unique constraint on idempotencyKey
      const delivery = await prisma.emailDelivery.create({
        data: {
          senderId: opts.senderId,
          campaignId: opts.campaignId,
          recipient: opts.recipient,
          scheduledAt: opts.scheduledAt,
          idempotencyKey: opts.idempotencyKey,
          status: 'SCHEDULED'
        }
      });

      logger.info({ deliveryId: delivery.id, event: 'EMAIL_SCHEDULED' }, 'Email scheduled in database');

      // Elasticsearch indexing (fire-and-forget)
      ElasticsearchService.indexDelivery(delivery).catch(err => {
        logger.error({ err, deliveryId: delivery.id }, 'Failed to index new delivery');
      });

      // 2. Enqueue to BullMQ
      const delayMs = Math.max(0, delivery.scheduledAt.getTime() - Date.now());
      await QueueService.enqueueDelivery(delivery.id, delayMs);

      // 3. Mark as QUEUED safely
      await prisma.emailDelivery.updateMany({
        where: { id: delivery.id, status: 'SCHEDULED' },
        data: { status: 'QUEUED' }
      });
      
      // Update ES status (fire-and-forget)
      ElasticsearchService.updateDeliveryStatus(delivery.id, 'QUEUED').catch(err => {
        logger.error({ err, deliveryId: delivery.id }, 'Failed to index status update');
      });

      return delivery;
    } catch (error: any) {
      // Handle Postgres unique constraint violation
      if (error.code === 'P2002' && error.meta?.target?.includes('idempotencyKey')) {
        logger.info({ idempotencyKey: opts.idempotencyKey }, 'Idempotency key match: Request safely ignored');
        // Fetch existing record
        const existing = await prisma.emailDelivery.findUnique({
          where: { idempotencyKey: opts.idempotencyKey }
        });
        return existing;
      }
      throw error;
    }
  }

  static async bulkScheduleCampaign(opts: {
    userId: string;
    senderId: string;
    subject: string;
    body: string;
    recipients: string[];
    startAt: Date;
    delayBetweenEmails: number;
    hourlyLimit: number;
    idempotencyKey: string;
  }) {
    try {
      // Step A: Database Transaction (Source of Truth)
      const { campaign, insertedDeliveries } = await prisma.$transaction(async (tx) => {
        // 1. Check sender ownership
        const sender = await tx.sender.findFirst({
          where: { id: opts.senderId, userId: opts.userId }
        });

        if (!sender) {
          throw new Error('Sender not found or does not belong to user');
        }

        // 2. Check Idempotency (has this campaign already been created?)
        let campaign = await tx.campaign.findFirst({
          where: { 
            senderId: opts.senderId, 
            emailDeliveries: {
              some: { idempotencyKey: `${opts.idempotencyKey}_0` }
            }
          },
          include: { emailDeliveries: true }
        });

        if (campaign) {
          logger.info({ idempotencyKey: opts.idempotencyKey }, 'Idempotency key match: Bulk campaign already exists');
          return { campaign, insertedDeliveries: [] };
        }

        // 3. Create Campaign
        campaign = await tx.campaign.create({
          data: {
            senderId: opts.senderId,
            subject: opts.subject,
            body: opts.body,
            startAt: opts.startAt,
            delayBetweenEmails: opts.delayBetweenEmails,
            hourlyLimit: opts.hourlyLimit,
            status: 'SCHEDULED'
          },
          include: { emailDeliveries: true }
        });

        // 4. Create Deliveries
        const deliveryData = opts.recipients.map((recipient, index) => {
          const scheduledAt = new Date(opts.startAt.getTime() + (opts.delayBetweenEmails * index));
          return {
            campaignId: campaign.id,
            senderId: opts.senderId,
            recipient,
            scheduledAt,
            status: 'SCHEDULED' as const,
            idempotencyKey: `${opts.idempotencyKey}_${index}`,
          };
        });

        if (deliveryData.length > 0) {
          await tx.emailDelivery.createMany({
            data: deliveryData,
            skipDuplicates: true
          });
        }

        // 5. Fetch the inserted deliveries to get their UUIDs for BullMQ and ES
        const insertedDeliveries = await tx.emailDelivery.findMany({
          where: { campaignId: campaign.id },
          select: { id: true, scheduledAt: true, recipient: true, status: true, senderId: true, campaignId: true, createdAt: true }
        });

        logger.info({ campaignId: campaign.id, count: insertedDeliveries.length }, 'Created bulk deliveries in database');

        return { campaign, insertedDeliveries };
      });

      // Step B: Out-of-Transaction Operations (Queueing & Indexing)
      if (insertedDeliveries.length > 0) {
        // Fire-and-forget Elasticsearch indexing
        insertedDeliveries.forEach(delivery => {
          ElasticsearchService.indexDelivery({
            ...delivery,
            campaign: { subject: opts.subject }
          }).catch(err => {
            logger.error({ err, deliveryId: delivery.id }, 'Failed to index bulk delivery');
          });
        });

        // Enqueue to BullMQ
        const now = Date.now();
        const queueJobs = insertedDeliveries.map(d => ({
          id: d.id,
          delayMs: Math.max(0, d.scheduledAt.getTime() - now)
        }));
        
        await QueueService.enqueueBulkDeliveries(queueJobs);

        // Update to QUEUED safely (if it fails, reconciliation will fix it)
        await prisma.emailDelivery.updateMany({
          where: { campaignId: campaign.id, status: 'SCHEDULED' },
          data: { status: 'QUEUED' }
        });
        
        // Fire-and-forget Elasticsearch status update
        insertedDeliveries.forEach(delivery => {
          ElasticsearchService.updateDeliveryStatus(delivery.id, 'QUEUED').catch(err => {
            logger.error({ err, deliveryId: delivery.id }, 'Failed to update ES status');
          });
        });
      }

      return campaign;
    } catch (error: any) {
      logger.error({ err: error }, 'Failed to bulk schedule campaign');
      throw error;
    }
  }
}
