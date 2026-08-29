# Email Scheduler Backend (Phase 1)

This is the Phase 1 backend implementation for the Full-Stack Email Job Scheduler.

## Architecture

- **Web Framework:** Express.js
- **Language:** Strict TypeScript
- **Database:** PostgreSQL (using Prisma ORM)
- **Job Queue:** BullMQ (backed by Redis)
- **Email Delivery:** Nodemailer (using Ethereal SMTP)
- **Validation:** Zod
- **Logging:** Pino (structured JSON logging)

## Setup Instructions

1. Install dependencies:
   ```bash
   npm install
   ```
2. Setup environment variables by copying `.env.example` to `.env` in the root folder, or simply use the provided `.env`.
3. Start external dependencies (PostgreSQL and Redis).
4. Run database migrations and generate the client:
   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```
5. Start the server in development mode:
   ```bash
   npm run dev
   ```

## Running Tests
Run the Jest test suite:
```bash
npm run test
```

### Slack Rate-Limit Notifications

The system integrates with Slack via OAuth to send real-time notifications when a sender hits their hourly limit.

- **Deduplication:** A Redis lock (`slack:rate-limit-notified:{sender}:{hour}`) ensures that only one notification is sent per sender per hour, even if thousands of jobs fail concurrently.
- **Resiliency:** Slack API failures gracefully swallow exceptions and release the Redis lock for retry, completely preventing email job pipeline crashes.
- **Security:** Slack OAuth access tokens are encrypted at rest using AES-256-GCM. The encryption key must be provided in `SLACK_TOKEN_ENCRYPTION_KEY` (64-character hex string). Tokens are never exposed to the frontend or logged.

## Known Limitations (Phase 1)

- **Authentication & Authorization**: Currently, the system lacks Google/Slack OAuth integration (planned for a future phase).
- **Frontend Dashboard**: There is no frontend implemented yet.
- **Error Rescheduling**: Some advanced features like auto-pausing a sender on consecutive failures are not yet implemented.
- **Elasticsearch**: Search functionality is stubbed/omitted in this phase.
- **External Exactly-Once Guarantee**: Due to the inherent nature of distributed systems, we guarantee "at-least-once" job execution and exactly-once *internal* state transitions, but there exists a tiny crash window where an email might be sent via SMTP, but the process crashes before updating the database. We prioritize database state as the source of truth and optimize to prevent duplicates.

## Verification Checklist Completed

- [x] Backend starts successfully
- [x] PostgreSQL connection works
- [x] Redis connection works
- [x] GET /health works
- [x] POST /api/emails/schedule works
- [x] Email delivery is persisted
- [x] BullMQ delayed job exists
- [x] BullMQ dashboard works (http://localhost:3000/admin/queues)
- [x] Worker starts
- [x] Worker concurrency is configurable
- [x] Ethereal SMTP integration exists
- [x] Idempotency behavior prevents duplicate processing
- [x] Restart/reconciliation behavior safely reschedules orphaned jobs
