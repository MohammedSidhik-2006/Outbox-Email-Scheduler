import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// Load .env - In production (Render), environment variables are set via the platform
// This will gracefully fail if .env doesn't exist (which is expected in production)
dotenv.config({ path: path.resolve(__dirname, '../../../.env') }); // assuming .env is at root d:\emailSender\.env

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000'),
  DATABASE_URL: z.string().url(),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().default('6379'),
  REDIS_PASSWORD: z.string().optional(),
  SMTP_HOST: z.string(),
  SMTP_PORT: z.string(),
  SMTP_USER: z.string(),
  SMTP_PASSWORD: z.string(),
  SMTP_FROM: z.string().email(),
  WORKER_CONCURRENCY: z.string().default('5'),
  MIN_EMAIL_DELAY_MS: z.string().default('0'),
  MAX_EMAILS_PER_HOUR_PER_SENDER: z.string().default('1000'),
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
  GOOGLE_CALLBACK_URL: z.string().url(),
  FRONTEND_URL: z.string().url(),
  SESSION_SECRET: z.string(),
  
  // Slack Integration
  SLACK_CLIENT_ID: z.string(),
  SLACK_CLIENT_SECRET: z.string(),
  SLACK_CALLBACK_URL: z.string().url(),
  SLACK_TOKEN_ENCRYPTION_KEY: z.string().length(64, 'Must be 64 characters (32 bytes hex)'),

  // Elasticsearch
  ELASTICSEARCH_URL: z.string().url().optional(),
  ELASTICSEARCH_API_KEY: z.string().optional(),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error('❌ Invalid environment variables:', _env.error.format());
  throw new Error('Invalid environment variables');
}

export const env = _env.data;
