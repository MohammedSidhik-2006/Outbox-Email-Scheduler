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

    if (redis.status !== 'ready') {
      logger.info('Waiting for Redis...');
      // It connects asynchronously, but we trust it or it will crash later
    }

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
