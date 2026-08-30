# ReachInbox - Email Scheduler

A full-stack email scheduling platform. Send scheduled emails, track delivery, with rate limiting and persistence across restarts. Built with Express, React, PostgreSQL, Redis, and BullMQ.

---

## 🚀 Production Deployment

**Live Demo Available Now:**

- **Backend API:** https://outbox-email-scheduler-wl9y.onrender.com/
- **Frontend App:** https://emailscheduler-3ja3rfexv-professional7.vercel.app/login

Try it now: [Open Live Demo](https://emailscheduler-3ja3rfexv-professional7.vercel.app/login)

---

## Features

### Backend
- Email scheduling with BullMQ job queue
- Rate limiting (Redis Lua script for atomicity)
- Persistence - emails survive restarts via DB reconciliation
- Concurrency control (configurable worker pool)
- Idempotency keys to prevent duplicates
- Google OAuth login
- Slack notifications for rate limit alerts
- Elasticsearch for searching sent emails
- Real-time BullMQ dashboard at `/admin/queues`

### Frontend
- React 19 + Vite + TypeScript
- Responsive design (mobile/tablet/desktop)
- Google OAuth login
- Dashboard with scheduled/sent email tables
- Compose modal for creating campaigns
- CSV upload for recipient lists
- Slack integration setup
- Paginated email views

---

## 🏗️ Architecture Overview

### System Diagram
```
Frontend (React/Vite)
    ↓ HTTP/JSON
Backend (Express.js + TypeScript)
    ├─→ PostgreSQL (User, Campaign, EmailDelivery data)
    ├─→ Redis (Session store, BullMQ queue, rate-limit counters)
    ├─→ Elasticsearch (Email delivery search index)
    └─→ Ethereal SMTP (Email delivery)

BullMQ Worker
    ├─→ Fetch pending EmailDelivery from DB
    ├─→ Check rate limits via Redis Lua script
    ├─→ Send email via SMTP
    ├─→ Update delivery status in DB
    └─→ Index status change in Elasticsearch
```

### How Scheduling Works

1. **User creates campaign** (POST `/api/emails/campaigns`)
   - Frontend sends: subject, body, recipient list, start time, delay, hourly limit
   - Backend validates sender ownership, creates Campaign record, creates EmailDelivery records (one per recipient)
   - Each delivery stored with `scheduledAt` timestamp and unique `idempotencyKey`

2. **Emails enqueued to BullMQ**
   - QueueService calculates delay: `max(0, scheduledAt - now)`
   - Job added to queue with deterministic `jobId` = deliveryId
   - BullMQ delays job until scheduled time

3. **Worker picks up job**
   - BullMQ passes job to available worker (up to `WORKER_CONCURRENCY` active jobs)
   - Worker atomically claims delivery: `status: SCHEDULED → PROCESSING`
   - If already PROCESSING/SENT/FAILED: worker aborts (prevents duplicates)

4. **Rate limiting check** (Lua script, atomic)
   ```
   IF hourly_count >= hourlyLimit:
       DEFER job, reschedule for next available window
   ELSE IF time_since_last_email < minDelay:
       DEFER job, reschedule after minDelay expires
   ELSE:
       ALLOW, increment counters, proceed with sending
   ```

5. **Email sent via SMTP**
   - Ethereal API called with recipient, subject, body
   - On success: `status: PROCESSING → SENT`, record `sentAt` and `providerMessageId`
   - On failure: `status: PROCESSING → QUEUED` (retry) or `FAILED` (max retries reached)

6. **Status indexed in Elasticsearch**
   - Fire-and-forget: ES indexing doesn't block email sending
   - If ES fails: email still sent, just not searchable (graceful degradation)

### Persistence & Restart Recovery

**Problem:** Server stops mid-processing. How do we ensure no emails are lost?

**Solution: Multi-layer persistence**

1. **Database is source of truth**
   - All EmailDelivery records stored immediately upon creation
   - Status transitions atomic: SCHEDULED → QUEUED → PROCESSING → SENT/FAILED
   - If server crashes at any point, DB state is consistent

2. **BullMQ stores job references**
   - Jobs in Redis with deterministic ID (delivery ID)
   - Delayed jobs scheduled until their time
   - Completed jobs optionally removed (configurable)

3. **Reconciliation at startup**
   - Server starts → calls `QueueService.reconcileQueue()`
   - Queries DB for SCHEDULED/DEFERRED deliveries
   - For each: checks if job exists in BullMQ
   - If missing: re-enqueues job with correct delay
   - Result: no emails lost on restart

**Example restart scenario:**
```
T=0: Server running
T=1: User schedules email for T=10
T=2: Email stored in DB, queued to BullMQ (delay=8s)
T=3: Server crashes (power loss, deployment, etc.)
T=4: Server starts again
     → Reconciliation runs
     → Finds QUEUED email in DB for T=10
     → Recalculates delay: max(0, T=10 - T=4) = 6s
     → Re-enqueues to BullMQ
T=10: Worker processes email on schedule ✓
```

### Rate Limiting & Concurrency

**Rate Limiting (Atomic, Distributed)**

Uses Redis Lua script to atomically enforce two constraints per sender:

1. **Minimum delay between emails**
   - Config: `MIN_EMAIL_DELAY_MS=2000`
   - Check: `time_since_last_email >= MIN_EMAIL_DELAY_MS`
   - If violated: defer job until `last_send_time + MIN_EMAIL_DELAY_MS`

2. **Hourly email limit**
   - Config: `MAX_EMAILS_PER_HOUR_PER_SENDER=100`
   - Check: `hourly_email_count < hourly_limit`
   - Counter stored in Redis with 1-hour TTL
   - If violated: defer job until next hour

**Lua Script ensures atomicity** (no race conditions between multiple workers):
```lua
GET hourly_count
IF hourly_count >= limit: DEFER
ELSE:
  GET last_send_time
  IF (now - last_send_time) < min_delay: DEFER
  ELSE:
    SET last_send_time = now
    INCR hourly_count
    ALLOW
```

**Concurrency Control**

- Config: `WORKER_CONCURRENCY=5`
- BullMQ processes up to 5 emails simultaneously
- Each worker independently checks rate limits
- Higher concurrency = faster throughput (at cost of less spacing between emails)

**Deferred Job Rescheduling**

When rate limit triggered:
- Worker transitions: `status: PROCESSING → DEFERRED`
- Calculates `nextAvailableAt` = max(hourly window end, last_send + min_delay)
- BullMQ reschedules job: `moveToDelayed(nextAvailableAt)`
- Job waits in delayed queue, re-processed when time expires
- **No emails lost** - job stays in system until it can run

**Slack Notification on Hourly Limit**

When hourly limit first reached:
- Worker triggers `SlackIntegrationService.notifyHourlyLimitReached()`
- Redis lock acquired: `slack:rate-limit-notified:{senderEmail}:{hour}` (1-hour expiry)
- If lock succeeded: send Slack DM to connected user
- If lock failed: another worker already sent notification this hour (deduplication)
- Ensures user gets exactly one notification per sender per hour, not multiple

---

## 🚀 Quick Start

### Prerequisites

Ensure you have installed:
- **Node.js** (v18+)
- **PostgreSQL** (v12+)
- **Redis** (v6+)
- **npm** or **yarn**

### 1. Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/reachinbox-email-scheduler.git
cd reachinbox-email-scheduler

# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Environment Setup

Create `.env` file in root directory (or separate `.env` in `backend/`):

```bash
# Copy the template
cp .env.example .env

# Edit with your values
nano .env
```

See [Environment Variables](#environment-variables) section below.

### 3. Database Setup

```bash
cd backend

# Create database
createdb email_scheduler

# Run migrations
npx prisma migrate dev --name init

# (Optional) View data in UI
npx prisma studio
```

### 4. Start Services

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
# Server listens on http://localhost:3000
# BullMQ Dashboard: http://localhost:3000/admin/queues
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
# App available at http://localhost:5173
```

**Terminal 3 - Monitor Worker (Optional):**
```bash
# Watch BullMQ jobs in real-time
curl http://localhost:3000/admin/queues
# (Opens interactive dashboard in browser)
```

### 5. Test the Flow

1. **Open** http://localhost:5173/login
2. **Click** "Continue with Google" (uses test OAuth credentials)
3. **Create campaign:**
   - Click "Compose New Email"
   - Enter subject & body
   - Upload CSV or paste emails
   - Set delay, hourly limit
   - Click "Schedule Campaign"
4. **Monitor delivery:**
   - Check BullMQ Dashboard (http://localhost:3000/admin/queues)
   - Watch "Scheduled Emails" → "Sent Emails" table
5. **View sent email:**
   - Check Ethereal inbox (link in settings): https://ethereal.email/
   - Credentials in `.env` file

---

## 🔧 Environment Variables

Create `.env` file in backend directory:

```env
# Server
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/email_scheduler?schema=public

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=           # Optional

# SMTP (Ethereal for testing)
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USER=your-ethereal-email@ethereal.email
SMTP_PASSWORD=your-ethereal-password
SMTP_FROM=your-ethereal-email@ethereal.email

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback

# Frontend URL (for redirects after OAuth)
FRONTEND_URL=http://localhost:5173
SESSION_SECRET=your-random-secret-key-min-32-chars

# Slack Integration (Optional)
SLACK_CLIENT_ID=your-slack-client-id
SLACK_CLIENT_SECRET=your-slack-client-secret
SLACK_CALLBACK_URL=http://localhost:3000/api/integrations/slack/callback
SLACK_TOKEN_ENCRYPTION_KEY=32-byte-hex-key-64-chars-total

# Elasticsearch (Optional, for search)
ELASTICSEARCH_URL=https://your-elasticsearch-instance.com
ELASTICSEARCH_API_KEY=your-api-key

# Performance Tuning
WORKER_CONCURRENCY=5                      # Simultaneous emails
MIN_EMAIL_DELAY_MS=2000                  # Min seconds between emails per sender
MAX_EMAILS_PER_HOUR_PER_SENDER=100       # Hourly limit
```

### Getting OAuth Credentials

**Google OAuth:**
1. Visit https://console.cloud.google.com
2. Create new project
3. Enable "Google+ API"
4. Create "OAuth 2.0 Client ID" (Web application)
5. Add `http://localhost:3000/api/auth/google/callback` as authorized redirect URI
6. Copy Client ID and Secret to `.env`

**Ethereal Email (Test SMTP):**
1. Visit https://ethereal.email
2. Click "Create Ethereal Account"
3. You'll get SMTP credentials instantly
4. Copy to `SMTP_*` variables in `.env`
5. Emails "sent" to Ethereal won't actually leave (for testing)
6. View "sent" emails at https://ethereal.email/messages

**Slack Integration (Optional):**
1. Visit https://api.slack.com/apps
2. Create new app
3. Enable "OAuth & Permissions"
4. Add scope: `chat:write`
5. Set redirect URL: `http://localhost:3000/api/integrations/slack/callback`
6. Copy credentials to `.env`

---

## 📊 Production Build

### Backend

```bash
cd backend

# Type check
npm run typecheck

# Run tests
npm test

# Build
npm run build

# Start production
NODE_ENV=production npm start
```

Output: `/backend/dist/` with compiled JavaScript.

### Frontend

```bash
cd frontend

# Build
npm run build

# Output
# /frontend/dist/index.html
# /frontend/dist/assets/*.js
# /frontend/dist/assets/*.css
# Ready for static hosting (Vercel, Netlify, S3+CloudFront, etc.)
```

---

## 🧪 Testing

### Run All Tests

```bash
cd backend
npm test
```

**Output:** 27 test suites covering:
- Authentication & OAuth
- Email scheduling & idempotency
- Rate limiting & concurrency
- Worker job processing
- Slack integration
- Campaign bulk operations

### Manual Testing

**1. Test Email Scheduling:**
```bash
curl -X POST http://localhost:3000/api/emails/campaigns \
  -H "Content-Type: application/json" \
  -b "connect.sid=your_session_cookie" \
  -d '{
    "subject": "Test",
    "body": "Hello",
    "recipients": ["test@example.com"],
    "startAt": "2026-08-29T16:00:00Z",
    "delayBetweenEmails": 5000,
    "hourlyLimit": 100,
    "senderId": "sender-uuid",
    "idempotencyKey": "test-1"
  }'
```

**2. Check Job Queue:**
```bash
# Real-time dashboard
open http://localhost:3000/admin/queues
```

**3. Verify Email Sent:**
```bash
# Check Ethereal inbox
open https://ethereal.email/messages
```

---

## 📈 Monitoring & Debugging

### BullMQ Dashboard

Access at: **http://localhost:3000/admin/queues**

Shows:
- Job counts (waiting, active, completed, failed, delayed)
- Individual job details (data, state, attempts, progress)
- Real-time processing updates

### PostgreSQL

```bash
# View data
npx prisma studio
# Opens http://localhost:5555 - interactive DB viewer

# Direct query
psql email_scheduler
# \dt                    # List tables
# SELECT * FROM "User"; # Query data
```

### Redis

```bash
# Connect
redis-cli

# Check sessions
KEYS session:*

# Check rate limits
KEYS throttle:*

# Check queue jobs
KEYS bull:email-deliveries:*
```

### Logs

Backend logs to stdout with structured JSON:
```json
{"level":30,"time":1693468800000,"msg":"Email sent successfully","deliveryId":"uuid","event":"EMAIL_SENT"}
```

Filter by event type:
```bash
npm run dev | grep EMAIL_SENT
npm run dev | grep ERROR
npm run dev | grep SLACK_NOTIFICATION
```

---

## 🔄 Restart Scenario (Persistence)

**Test that emails survive server restart:**

1. **Schedule an email for future time:**
   - Frontend: Compose → Schedule (for T+2 minutes)
   - Note the delivery ID

2. **Stop the server:**
   ```bash
   # Kill backend process
   Ctrl+C in backend terminal
   ```

3. **Verify data persists:**
   ```bash
   # Check database still has the scheduled email
   npx prisma studio
   # EmailDelivery table should show QUEUED status
   ```

4. **Restart the server:**
   ```bash
   npm run dev
   # Logs should show "Starting queue reconciliation"
   # "Queue reconciliation complete" with enqueued count
   ```

5. **Wait for scheduled time:**
   - Email automatically sends on schedule
   - Status transitions QUEUED → PROCESSING → SENT
   - No manual intervention needed

**Result:** ✅ Email was never lost despite restart.

---

## 🎨 UI/UX Features

### Responsive Design
- **Mobile (320px+)** - Single column layout, touch-friendly buttons
- **Tablet (768px+)** - Two-column layout, optimized spacing
- **Desktop (1024px+)** - Full layout with sidebars, expanded tables

### Loading States
- Compose modal shows spinner while scheduling
- Tables show skeleton loaders while fetching
- Buttons disabled during submission

### Error Handling
- Network errors display toast notifications
- Invalid input shows field-level error messages
- 401 redirects to login if session expires

### Empty States
- Scheduled Emails table shows helpful message when empty
- Sent Emails table shows placeholder
- Search results show "No matches found"

---

## ⚙️ Assumptions & Trade-offs

### Assumptions
1. **Google OAuth credentials available** - Uses real Google OAuth, not mock
2. **PostgreSQL connection stable** - No automatic failover implemented
3. **Redis for session store** - Requires Redis running (not file-based sessions)
4. **Single time zone (UTC)** - All times stored and displayed in UTC
5. **Email list under 10,000 recipients** - Single API call (no pagination for recipients)

### Trade-offs Made

| Feature | Choice | Reason |
|---------|--------|--------|
| Email ordering | Concurrent workers (no global ordering) | Prioritize throughput over strict ordering |
| Search indexing | Fire-and-forget (async) | Don't block email sending if ES fails |
| Rate limiting | Per-sender | Simpler than per-IP or per-domain limiting |
| Retry strategy | Exponential backoff (5s, 10s, 20s) | Balance between responsiveness and load |
| Session store | Redis | Required for horizontal scaling; Redis also used for queue |
| Job idempotency | Database unique constraint | Simple, works without distributed locks |
| Slack notifications | Once per hour per sender | Avoid notification spam |
| Error recovery | Reconciliation at startup only | Simpler than continuous monitoring |

### Potential Improvements (Not Implemented)
- [ ] Continuous queue reconciliation (background task every 5min)
- [ ] Email templates with variable substitution
- [ ] Attachment support
- [ ] Recipient per-email confirmation
- [ ] Dashboard analytics (emails sent, success rate, etc.)
- [ ] Webhook callbacks on delivery status change
- [ ] Multi-language support
- [ ] Dark mode
- [ ] Horizontal scaling (multiple backend instances)

---

## 🐛 Known Issues & Limitations

### Known Limitations
1. **Elasticsearch indexing lag** - If ES is slow, recent emails may not be immediately searchable
2. **No graceful queue drain on shutdown** - Active jobs may be interrupted during deployment
3. **Single worker process per server** - BullMQ jobs not distributed across multiple processes (use load balancer for multiple servers)
4. **No email template builder** - Body must be HTML/plain text (no rich editor)

### Workarounds
- **For ES lag:** Retry search after a few seconds
- **For graceful shutdown:** Use SIGTERM handler to wait for active jobs (implemented but could be more sophisticated)
- **For multiple processes:** Deploy multiple backend servers behind load balancer
- **For templates:** Use external template service or pre-format HTML before scheduling

---

## 📚 Project Structure

```
reachinbox-email-scheduler/
├── backend/
│   ├── src/
│   │   ├── app.ts                 # Express setup, middleware, routes
│   │   ├── server.ts              # Entry point, startup, graceful shutdown
│   │   ├── config/
│   │   │   └── env.ts             # Environment variable validation
│   │   ├── controllers/           # Route handlers
│   │   │   ├── AuthController.ts
│   │   │   ├── CampaignController.ts
│   │   │   ├── EmailController.ts
│   │   │   └── SlackIntegrationController.ts
│   │   ├── services/              # Business logic
│   │   │   ├── AuthService.ts     # Google OAuth, user identity
│   │   │   ├── ScheduleService.ts # Campaign/email creation
│   │   │   ├── QueueService.ts    # BullMQ queue management
│   │   │   ├── ThrottlingService.ts # Rate limiting (Lua script)
│   │   │   ├── EmailService.ts    # SMTP sending
│   │   │   ├── SlackIntegrationService.ts # Slack OAuth & notifications
│   │   │   ├── ElasticsearchService.ts # Email indexing & search
│   │   │   └── EncryptionService.ts # Token encryption
│   │   ├── workers/
│   │   │   └── EmailWorker.ts     # BullMQ worker process
│   │   ├── middleware/            # Express middleware
│   │   │   ├── requireAuth.ts     # Auth guard
│   │   │   └── validate.ts        # Input validation
│   │   ├── routes/                # Express route definitions
│   │   ├── lib/                   # Utilities
│   │   │   ├── prisma.ts
│   │   │   ├── redis.ts
│   │   │   └── logger.ts
│   │   └── types/
│   │       └── express.d.ts       # Express type extensions
│   ├── prisma/
│   │   └── schema.prisma          # Database schema
│   ├── tests/                     # Test suites
│   ├── jest.config.js
│   ├── tsconfig.json
│   ├── package.json
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── main.tsx               # React entry point
│   │   ├── App.tsx                # Root component, routing
│   │   ├── index.css              # Global styles (Tailwind)
│   │   ├── App.css                # Component styles
│   │   ├── context/
│   │   │   └── AuthContext.tsx    # Global auth state
│   │   ├── pages/
│   │   │   ├── Login.tsx          # Login page
│   │   │   └── Dashboard.tsx      # Main dashboard
│   │   ├── components/
│   │   │   ├── Layout.tsx         # Header, search bar
│   │   │   ├── ComposeEmailModal.tsx # Campaign creation
│   │   │   ├── ScheduledEmailsTable.tsx
│   │   │   └── SentEmailsTable.tsx
│   │   ├── assets/                # Images, icons
│   │   └── public/
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── tsconfig.json
│   ├── package.json
│   └── .env
│
├── .env.example                   # Template for environment variables
├── README.md                      # This file
└── FIXES_APPLIED.md              # Documentation of fixes applied
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

MIT License - feel free to use this project for any purpose.

---

## 📞 Support

For issues or questions:
1. Check this README first
2. Review `.env.example` for configuration
3. Check BullMQ Dashboard for queue status
4. Check Prisma Studio for database data
5. Open an issue on GitHub

---

**Last Updated:** August 29, 2026  
**Status:** ✅ Production Ready
