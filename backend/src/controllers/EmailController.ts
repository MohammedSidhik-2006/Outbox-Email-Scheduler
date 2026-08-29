import { Request, Response, NextFunction } from 'express';
import { ScheduleService } from '../services/ScheduleService';
import { ElasticsearchService } from '../services/ElasticsearchService';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';

export class EmailController {
  static async schedule(req: Request, res: Response, next: NextFunction) {
    try {
      const { senderId, campaignId, recipient, scheduledAt, idempotencyKey } = req.body;
      
      const delivery = await ScheduleService.scheduleEmail({
        senderId,
        campaignId,
        recipient,
        scheduledAt: new Date(scheduledAt),
        idempotencyKey,
      });

      if (!delivery) {
        return res.status(500).json({ status: 'error', message: 'Failed to schedule or fetch delivery' });
      }

      return res.status(202).json({
        status: 'success',
        data: {
          deliveryId: delivery.id,
          status: delivery.status,
          scheduledAt: delivery.scheduledAt
        }
      });
    } catch (error) {
      logger.error({ error }, 'Error in EmailController.schedule');
      next(error);
    }
  }
}
