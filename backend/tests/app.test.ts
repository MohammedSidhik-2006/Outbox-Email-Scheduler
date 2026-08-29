import request from 'supertest';
import { app } from '../src/app';
import { emailQueue } from '../src/services/QueueService';
import { redis } from '../src/lib/redis';

describe('App', () => {
  afterAll(async () => {
    await emailQueue.close();
    await redis.quit();
  });

  it('GET /health should return 200 OK', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
