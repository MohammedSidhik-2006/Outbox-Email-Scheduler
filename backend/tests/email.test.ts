import request from 'supertest';
jest.mock('../src/middleware/requireAuth', () => ({
  requireAuth: (req: any, res: any, next: any) => {
    req.session = req.session || {};
    req.session.userId = '123e4567-e89b-12d3-a456-426614174000';
    if (!req.session.touch) req.session.touch = jest.fn();
    if (!req.session.save) req.session.save = jest.fn((cb: any) => cb && cb());
    next();
  }
}));
import { app } from '../src/app';
jest.mock('../src/services/QueueService', () => ({
  QueueService: {
    enqueueDelivery: jest.fn().mockResolvedValue(undefined),
    reconcileQueue: jest.fn().mockResolvedValue(undefined),
  },
  emailQueue: {
    close: jest.fn().mockResolvedValue(undefined)
  }
}));

// Mock Prisma
jest.mock('../src/lib/prisma', () => ({
  prisma: {
    emailDelivery: {
      create: jest.fn().mockResolvedValue({ id: 'test-id', status: 'SCHEDULED', scheduledAt: new Date() }),
      update: jest.fn().mockResolvedValue({ id: 'test-id', status: 'QUEUED' }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  }
}));

import { emailQueue } from '../src/services/QueueService';
import { redis } from '../src/lib/redis';

describe('EmailController', () => {
  afterAll(async () => {
    await emailQueue.close();
    await redis.quit();
  });

  it('POST /api/emails/schedule should validate input', async () => {
    const res = await request(app)
      .post('/api/emails/schedule')
      .send({
        // Missing required fields
      });

    expect(res.status).toBe(400);
    expect(res.body.status).toBe('error');
    expect(res.body.message).toBe('Validation failed');
  });

  it('POST /api/emails/schedule should schedule email', async () => {
    const res = await request(app)
      .post('/api/emails/schedule')
      .send({
        senderId: '123e4567-e89b-12d3-a456-426614174000',
        campaignId: '123e4567-e89b-12d3-a456-426614174001',
        recipient: 'test@example.com',
        scheduledAt: new Date().toISOString(),
      });

    expect(res.status).toBe(202);
    expect(res.body.data.deliveryId).toBe('test-id');
  });
});
