import { ScheduleService } from '../src/services/ScheduleService';
import { QueueService, emailQueue } from '../src/services/QueueService';
import { prisma } from '../src/lib/prisma';

jest.mock('../src/services/QueueService', () => ({
  QueueService: { enqueueBulkDeliveries: jest.fn().mockResolvedValue(undefined) },
  emailQueue: { close: jest.fn() }
}));

jest.mock('../src/lib/prisma', () => ({
  prisma: {
    user: { create: jest.fn() },
    sender: { create: jest.fn(), findFirst: jest.fn() },
    campaign: { create: jest.fn(), findFirst: jest.fn() },
    emailDelivery: { createMany: jest.fn(), findMany: jest.fn(), updateMany: jest.fn() },
    $transaction: jest.fn((callback) => callback(prisma)),
    $disconnect: jest.fn(),
  }
}));

describe('Campaign Bulk Scheduling API', () => {
  let userId = 'user-1';
  let senderId = 'sender-1';
  let otherSenderId = 'sender-2';

  beforeAll(() => {
    (prisma.sender.findFirst as jest.Mock).mockImplementation(async ({ where }) => {
      if (where.id === senderId && where.userId === userId) {
        return { id: senderId, userId };
      }
      return null;
    });

    (prisma.campaign.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.campaign.create as jest.Mock).mockResolvedValue({ id: 'camp-1' });
    (prisma.emailDelivery.createMany as jest.Mock).mockResolvedValue({ count: 3 });
    (prisma.emailDelivery.findMany as jest.Mock).mockResolvedValue([
      { id: 'del-1', scheduledAt: new Date(Date.now()) },
      { id: 'del-2', scheduledAt: new Date(Date.now() + 1000) },
      { id: 'del-3', scheduledAt: new Date(Date.now() + 2000) }
    ]);
  });

  afterAll(async () => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('TEST B: Valid campaign creates deliveries and enqueues bulk', async () => {
    const startAt = new Date();
    
    const campaign = await ScheduleService.bulkScheduleCampaign({
      userId,
      senderId,
      subject: 'Test Bulk',
      body: 'Hello',
      recipients: ['a@example.com', 'b@example.com', 'c@example.com'],
      startAt,
      delayBetweenEmails: 1000,
      hourlyLimit: 100,
      idempotencyKey: 'bulk_1'
    });

    expect(campaign.id).toBeDefined();

    expect(prisma.campaign.create).toHaveBeenCalled();
    expect(prisma.emailDelivery.createMany).toHaveBeenCalled();
    expect(QueueService.enqueueBulkDeliveries).toHaveBeenCalledTimes(1);
    
    const mockCallArgs = (QueueService.enqueueBulkDeliveries as jest.Mock).mock.calls[0][0];
    expect(mockCallArgs.length).toBe(3);
  });

  it('TEST F: User cannot use another users sender', async () => {
    await expect(
      ScheduleService.bulkScheduleCampaign({
        userId, // Current user
        senderId: otherSenderId, // Belongs to other user
        subject: 'Test Auth',
        body: 'Hello',
        recipients: ['a@example.com'],
        startAt: new Date(),
        delayBetweenEmails: 1000,
        hourlyLimit: 100,
        idempotencyKey: 'bulk_auth'
      })
    ).rejects.toThrow('Sender not found or does not belong to user');
  });

  it('TEST C: Duplicate idempotency key returns existing campaign without recreating', async () => {
    // Override the mock to simulate existing campaign
    (prisma.campaign.findFirst as jest.Mock).mockResolvedValueOnce({ id: 'camp-existing' });

    const req = {
      userId,
      senderId,
      subject: 'Test Dupe',
      body: 'Hello',
      recipients: ['a@example.com'],
      startAt: new Date(),
      delayBetweenEmails: 1000,
      hourlyLimit: 100,
      idempotencyKey: 'bulk_dupe'
    };

    const campaign = await ScheduleService.bulkScheduleCampaign(req);
    
    expect(campaign.id).toBe('camp-existing');
    expect(prisma.campaign.create).not.toHaveBeenCalled();
    expect(QueueService.enqueueBulkDeliveries).not.toHaveBeenCalled();
  });
});
