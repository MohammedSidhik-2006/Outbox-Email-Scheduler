import { app } from './app';
import { env } from './config/env';
import { logger } from './lib/logger';
import { prisma } from './lib/prisma';
import { redis } from './lib/redis';
import { QueueService } from './services/QueueService';
import { emailWorker } from './workers/EmailWorker';

async function startServer() {
  try {
    // Check connections
    await prisma.$connect();
    logger.info('Connected to PostgreSQL');

    // Wait for Redis connection to be ready
    if (redis.status !== 'ready') {
      logger.info('Waiting for Redis...');
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Redis connection timeout after 10s'));
        }, 10000);
        
        const onReady = () => {
          clearTimeout(timeout);
          redis.off('ready', onReady);
          redis.off('error', onError);
          resolve(undefined);
        };
        
        const onError = (err: any) => {
          clearTimeout(timeout);
          redis.off('ready', onReady);
          redis.off('error', onError);
          reject(err);
        };
        
        redis.on('ready', onReady);
        redis.on('error', onError);
      });
    }

    logger.info('Connected to Redis');

    // Queue Reconciliation
    await QueueService.reconcileQueue();

    // Start Worker
    emailWorker.run();
    logger.info('Email worker started');

    // Start Server
    const port = env.PORT;
    app.listen(port, () => {
      logger.info(`Server listening on port ${port}`);
      logger.info(`Bull Board available at http://localhost:${port}/admin/queues`);
    });
  } catch (error) {
    logger.error({ error }, 'Failed to start server');
    process.exit(1);
  }
}

startServer();

// Graceful Shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  await emailWorker.close();
  await prisma.$disconnect();
  await redis.quit();
  process.exit(0);
});
