import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ScheduleService } from '../services/ScheduleService';
import { logger } from '../lib/logger';
import { prisma } from '../lib/prisma';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const createCampaignSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Body is required'),
  recipients: z.array(z.string()).min(1, 'At least one recipient is required'),
  startAt: z.string().datetime(),
  delayBetweenEmails: z.number().min(0),
  hourlyLimit: z.number().min(1),
  senderId: z.string().uuid(),
  idempotencyKey: z.string().min(1)
});

export class CampaignController {
  static async scheduleBulk(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = createCampaignSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ status: 'error', errors: parsed.error.errors });
      }

      const { subject, body, recipients, startAt, delayBetweenEmails, hourlyLimit, senderId, idempotencyKey } = parsed.data;

      // Validate & Deduplicate recipients
      const validEmails = new Set<string>();
      const invalidEmails: string[] = [];

      for (const email of recipients) {
        const cleaned = email.trim().replace(/^["']|["']$/g, '').toLowerCase();
        if (emailRegex.test(cleaned)) {
          validEmails.add(cleaned);
        } else {
          invalidEmails.push(email);
        }
      }

      if (validEmails.size === 0) {
        return res.status(400).json({ 
          status: 'error', 
          message: 'No valid recipients provided',
          invalidCount: invalidEmails.length 
        });
      }

      const campaign = await ScheduleService.bulkScheduleCampaign({
        userId: req.user!.id,
        senderId,
        subject,
        body,
        recipients: Array.from(validEmails),
        startAt: new Date(startAt),
        delayBetweenEmails,
        hourlyLimit,
        idempotencyKey
      });

      return res.status(202).json({
        status: 'success',
        data: {
          campaignId: campaign.id,
          totalValidRecipients: validEmails.size,
          invalidRecipientsCount: invalidEmails.length
        }
      });
    } catch (error: any) {
      if (error.message === 'Sender not found or does not belong to user') {
        return res.status(403).json({ status: 'error', message: error.message });
      }
      logger.error({ error }, 'Error in CampaignController.scheduleBulk');
      next(error);
    }
  }

  static async getScheduledEmails(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const skip = (page - 1) * limit;

      const [deliveries, total] = await Promise.all([
        prisma.emailDelivery.findMany({
          where: {
            sender: { userId: req.user!.id },
            status: { in: ['SCHEDULED', 'QUEUED', 'PROCESSING', 'DEFERRED'] }
          },
          include: { campaign: { select: { subject: true } } },
          orderBy: { scheduledAt: 'asc' },
          skip,
          take: limit
        }),
        prisma.emailDelivery.count({
          where: {
            sender: { userId: req.user!.id },
            status: { in: ['SCHEDULED', 'QUEUED', 'PROCESSING', 'DEFERRED'] }
          }
        })
      ]);

      return res.json({
        status: 'success',
        data: deliveries,
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
      });
    } catch (error) {
      logger.error({ error }, 'Error fetching scheduled emails');
      next(error);
    }
  }

  static async getSentEmails(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const skip = (page - 1) * limit;

      const [deliveries, total] = await Promise.all([
        prisma.emailDelivery.findMany({
          where: {
            sender: { userId: req.user!.id },
            status: { in: ['SENT', 'FAILED'] }
          },
          include: { campaign: { select: { subject: true } } },
          orderBy: { sentAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.emailDelivery.count({
          where: {
            sender: { userId: req.user!.id },
            status: { in: ['SENT', 'FAILED'] }
          }
        })
      ]);

      return res.json({
        status: 'success',
        data: deliveries,
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
      });
    } catch (error) {
      logger.error({ error }, 'Error fetching sent emails');
      next(error);
    }
  }
}
