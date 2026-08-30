import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';

const createSenderSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(1, 'Name is required').optional()
});

const getSendersSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).default(50)
});

export class SendersController {
  static async createOrGetSender(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = createSenderSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ status: 'error', errors: parsed.error.errors });
      }

      const { email, name } = parsed.data;
      const userId = req.user!.id;

      // Try to find existing sender with this email for this user
      let sender = await prisma.sender.findUnique({
        where: { email }
      });

      if (sender) {
        // Verify it belongs to the user
        if (sender.userId !== userId) {
          return res.status(403).json({ status: 'error', message: 'Sender email already exists and belongs to another user' });
        }
        // Update name if provided
        if (name && sender.name !== name) {
          sender = await prisma.sender.update({
            where: { id: sender.id },
            data: { name }
          });
        }
      } else {
        // Create new sender
        sender = await prisma.sender.create({
          data: {
            email,
            name,
            userId
          }
        });
      }

      logger.info({ senderId: sender.id, email }, 'Sender created or retrieved');

      return res.status(201).json({
        status: 'success',
        data: {
          id: sender.id,
          email: sender.email,
          name: sender.name,
          createdAt: sender.createdAt
        }
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        // Unique constraint violation
        return res.status(409).json({ status: 'error', message: 'Email address already in use' });
      }
      logger.error({ error }, 'Error creating sender');
      next(error);
    }
  }

  static async getSenders(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = getSendersSchema.safeParse(req.query);
      if (!parsed.success) {
        return res.status(400).json({ status: 'error', errors: parsed.error.errors });
      }

      const { page, limit } = parsed.data;
      const skip = (page - 1) * limit;
      const userId = req.user!.id;

      const [senders, total] = await Promise.all([
        prisma.sender.findMany({
          where: { userId },
          select: {
            id: true,
            email: true,
            name: true,
            createdAt: true,
            _count: { select: { campaigns: true, emailDeliveries: true } }
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' }
        }),
        prisma.sender.count({ where: { userId } })
      ]);

      return res.json({
        status: 'success',
        data: senders,
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
      });
    } catch (error) {
      logger.error({ error }, 'Error fetching senders');
      next(error);
    }
  }

  static async deleteSender(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      // Verify sender belongs to user
      const sender = await prisma.sender.findUnique({
        where: { id }
      });

      if (!sender) {
        return res.status(404).json({ status: 'error', message: 'Sender not found' });
      }

      if (sender.userId !== userId) {
        return res.status(403).json({ status: 'error', message: 'Unauthorized' });
      }

      // Check if sender has active campaigns
      const activeCampaigns = await prisma.campaign.count({
        where: { 
          senderId: id,
          status: { in: ['DRAFT', 'SCHEDULED', 'ACTIVE'] }
        }
      });

      if (activeCampaigns > 0) {
        return res.status(409).json({ 
          status: 'error', 
          message: 'Cannot delete sender with active campaigns' 
        });
      }

      // Delete sender (will cascade delete campaigns and deliveries)
      await prisma.sender.delete({
        where: { id }
      });

      logger.info({ senderId: id }, 'Sender deleted');

      return res.json({ status: 'success', message: 'Sender deleted' });
    } catch (error) {
      logger.error({ error }, 'Error deleting sender');
      next(error);
    }
  }
}
