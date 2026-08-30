import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import session from 'express-session';
import type { Store } from 'express-session';
import RedisStore from 'connect-redis';
import { emailRoutes } from './routes/emailRoutes';
import { authRoutes } from './routes/authRoutes';
import { slackRoutes } from './routes/slackRoutes';
import { sendersRoutes } from './routes/sendersRoutes';
import { env } from './config/env';
import { redis } from './lib/redis';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { emailQueue } from './services/QueueService';
import { logger } from './lib/logger';
import { NextFunction, Request, Response } from 'express';

export const app = express();

// Security and standard middlewares
app.use(helmet());
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true,
}));
app.use(express.json());

// Session Middleware
const redisStore = new RedisStore({
  client: redis,
  prefix: 'session:',
});

app.use(
  session({
    store: redisStore,
    secret: env.SESSION_SECRET || 'fallback-secret-for-tests',
    resave: false,
    saveUninitialized: false,
    name: 'connect.sid',
    cookie: {
      secure: env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week in milliseconds
      sameSite: 'lax', // Required for OAuth redirects to Google and back
    },
  })
);

// Root route
app.get('/', (req: Request, res: Response) => {
  res.json({ 
    message: 'Email Scheduler API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      senders: '/api/senders',
      slack: '/api/integrations/slack',
      emails: '/api/emails',
      admin: '/admin/queues'
    }
  });
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', environment: env.NODE_ENV });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/senders', sendersRoutes);
app.use('/api/integrations/slack', slackRoutes);
app.use('/api/emails', emailRoutes);

// Bull Board
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');
createBullBoard({
  queues: [new BullMQAdapter(emailQueue as any) as any],
  serverAdapter: serverAdapter,
});
app.use('/admin/queues', serverAdapter.getRouter());

// Error Handling Middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error({ err }, 'Unhandled error');
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  res.status(status).json({
    status: 'error',
    message,
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {})
  });
});
