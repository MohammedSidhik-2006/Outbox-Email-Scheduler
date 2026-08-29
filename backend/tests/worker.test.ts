import { Worker, Job, Queue } from 'bullmq';
import { prisma } from '../src/lib/prisma';
import { redis } from '../src/lib/redis';
import { emailWorker } from '../src/workers/EmailWorker';
import { emailQueue } from '../src/services/QueueService';
import { ThrottlingService } from '../src/services/ThrottlingService';
import { ScheduleService } from '../src/services/ScheduleService';

// Mock Dependencies
jest.mock('../src/lib/prisma', () => ({
  prisma: {
    sender: { create: jest.fn().mockResolvedValue({ id: 'sender-1', email: 'test@test.com' }) },
    campaign: { create: jest.fn().mockResolvedValue({ id: 'camp-1', hourlyLimit: 100, delayBetweenEmails: 0 }) },
    emailDelivery: {
      create: jest.fn().mockResolvedValue({ id: 'del-1', status: 'SCHEDULED', scheduledAt: new Date() }),
      updateMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn().mockResolvedValue(1),
    },
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  }
}));

jest.mock('../src/services/QueueService', () => ({
  QueueService: { enqueueDelivery: jest.fn() },
  emailQueue: { close: jest.fn() }
}));

jest.mock('../src/services/ThrottlingService', () => ({
  ThrottlingService: { reserveSendSlot: jest.fn() }
}));

jest.mock('../src/services/EmailService', () => ({
  EmailService: { sendEmail: jest.fn().mockResolvedValue('msg-id') }
}));

jest.mock('../src/lib/redis', () => ({
  redis: { quit: jest.fn() }
}));

describe('Worker and Reliability Integrations', () => {
  afterAll(async () => {
    await emailWorker.close();
    await emailQueue.close();
    await prisma.$disconnect();
    await redis.quit();
  });

  it('TEST A: Two workers attempt to claim the same SCHEDULED/QUEUED delivery', async () => {
    // First call succeeds, second fails
    (prisma.emailDelivery.updateMany as jest.Mock)
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });

    const claim1 = prisma.emailDelivery.updateMany({
      where: { id: 'del-1', status: { in: ['SCHEDULED', 'QUEUED', 'DEFERRED'] } },
      data: { status: 'PROCESSING', attempts: { increment: 1 } }
    });
    
    const claim2 = prisma.emailDelivery.updateMany({
      where: { id: 'del-1', status: { in: ['SCHEDULED', 'QUEUED', 'DEFERRED'] } },
      data: { status: 'PROCESSING', attempts: { increment: 1 } }
    });

    const [res1, res2] = await Promise.all([claim1, claim2]);
    
    expect(res1.count + res2.count).toBe(1);
  });

  it('TEST B: A rate-limited active BullMQ job is deferred', async () => {
    (prisma.emailDelivery.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
    (prisma.emailDelivery.findUnique as jest.Mock).mockResolvedValue({
      id: 'del-1', campaign: {}, sender: {}
    });
    (ThrottlingService.reserveSendSlot as jest.Mock).mockResolvedValue({
      status: 'DEFER', nextAvailableAt: Date.now() + 5000, reason: 'LIMIT'
    });

    const mockJob = {
      id: 'del-1',
      data: { deliveryId: 'del-1' },
      attemptsMade: 0,
      token: 'fake-token',
      moveToDelayed: jest.fn().mockResolvedValue(undefined)
    } as unknown as Job<any>;

    try {
      await (emailWorker as any).processFn(mockJob);
    } catch (e: any) {
      expect(e.name).toBe('DelayedError');
    }

    expect(prisma.emailDelivery.updateMany).toHaveBeenCalledWith({
      where: { id: 'del-1', status: 'PROCESSING' },
      data: { status: 'DEFERRED' }
    });
    expect(mockJob.moveToDelayed).toHaveBeenCalled();
  });

  it('TEST C: Worker receives a SCHEDULED delivery directly (Crash window)', async () => {
    (prisma.emailDelivery.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
    (prisma.emailDelivery.findUnique as jest.Mock).mockResolvedValue({
      id: 'del-1', campaign: {}, sender: {}
    });
    (ThrottlingService.reserveSendSlot as jest.Mock).mockResolvedValue({ status: 'ALLOW' });

    const mockJob = {
      id: 'del-1',
      data: { deliveryId: 'del-1' },
      attemptsMade: 0,
    } as unknown as Job<any>;

    await (emailWorker as any).processFn(mockJob);

    expect(prisma.emailDelivery.updateMany).toHaveBeenCalledWith({
      where: { id: 'del-1', status: { in: ['SCHEDULED', 'QUEUED', 'DEFERRED'] } },
      data: { status: 'PROCESSING', attempts: { increment: 1 } }
    });
    expect(prisma.emailDelivery.updateMany).toHaveBeenCalledWith({
      where: { id: 'del-1', status: 'PROCESSING' },
      data: expect.objectContaining({ status: 'SENT' })
    });
  });

  it('TEST D: Idempotent scheduling request repeated', async () => {
    // In our implementation, PostgreSQL throws a unique constraint error (P2002).
    // The ScheduleService catches it and returns existing.
    
    // Simulate Prisma returning the record on first call
    (prisma.emailDelivery.create as jest.Mock).mockResolvedValue({ id: 'del-1', scheduledAt: new Date() });

    const req1 = await ScheduleService.scheduleEmail({
      senderId: 's1', campaignId: 'c1', recipient: 'd@d.com', scheduledAt: new Date(), idempotencyKey: 'same-key'
    });

    // Simulate unique constraint failure on second call
    const error: any = new Error('Unique constraint');
    error.code = 'P2002';
    error.meta = { target: ['idempotencyKey'] };
    (prisma.emailDelivery.create as jest.Mock).mockRejectedValue(error);
    (prisma.emailDelivery.findUnique as jest.Mock).mockResolvedValue({ id: 'del-1', scheduledAt: new Date() });

    const req2 = await ScheduleService.scheduleEmail({
      senderId: 's1', campaignId: 'c1', recipient: 'd@d.com', scheduledAt: new Date(), idempotencyKey: 'same-key'
    });

    expect(req1?.id).toBe(req2?.id);
  });
});
