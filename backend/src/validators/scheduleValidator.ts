import { z } from 'zod';

export const scheduleEmailSchema = z.object({
  body: z.object({
    senderId: z.string().uuid(),
    campaignId: z.string().uuid(),
    recipient: z.string().email(),
    scheduledAt: z.string().datetime(),
    idempotencyKey: z.string().optional(),
  }),
});
