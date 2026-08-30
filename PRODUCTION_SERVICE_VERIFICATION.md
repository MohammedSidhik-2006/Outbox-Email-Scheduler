# Production Service Configuration Verification

## Verify Each Service Before Deploying to Render

This guide shows how to test each service locally FIRST, then on production.

---

## Service 1: PostgreSQL Database

### Local Verification (Before Production)

```bash
# 1. Check if PostgreSQL is running locally
psql -U postgres -c "SELECT version();"

# Expected output:
# PostgreSQL 12.x on x86_64-pc-linux-gnu...

# 2. Create database
createdb email_scheduler

# 3. Check DATABASE_URL in .env
cat .env | grep DATABASE_URL

# Should show: postgresql://postgres:postgres@localhost:5432/email_scheduler?schema=public

# 4. Run Prisma migrations
npx prisma migrate dev --name init

# Expected output:
# ✓ Prisma migrations applied
# ✓ Generated Prisma Client

# 5. Verify schema created
npx prisma studio
# This opens http://localhost:5555
# You should see tables: User, OAuthAccount, Campaign, EmailDelivery, etc.

# 6. Check backend connects to database
npm run dev

# Look in logs for:
# ✓ "PostgreSQL connected"
# OR
# ✗ "Error: ECONNREFUSED 127.0.0.1:5432"
```

### Production Verification (On Render)

1. **After adding PostgreSQL add-on to Render:**
   - Check Render dashboard → Your Service → Environment tab
   - Verify `DATABASE_URL` is auto-populated
   - Format: `postgresql://user:password@hostname.render.internal:5432/email_scheduler?schema=public`

2. **After deploying:**
   ```bash
   # Check Render logs for:
   curl https://outbox-email-scheduler-wl9y.onrender.com/health
   
   # Expected: {"status":"ok","environment":"production"}
   ```

3. **After login (tests database connection):**
   - Go to frontend login page
   - Click "Continue with Google"
   - Login with your Google account
   - Dashboard should load (this proves database connection works)

4. **Verify data persisted:**
   - Check Render PostgreSQL dashboard (if available)
   - Or connect with external DB tool:
     ```bash
     psql postgresql://user:password@hostname.render.internal:5432/email_scheduler
     \dt
     SELECT * FROM "User";
     ```

### Common PostgreSQL Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `ECONNREFUSED 127.0.0.1:5432` | DATABASE_URL pointing to localhost | Check DATABASE_URL env var, should be Render hostname |
| `Error: connect ETIMEDOUT` | Database not running or wrong host | On Render: add PostgreSQL add-on. Locally: start PostgreSQL |
| `Error: password authentication failed` | Wrong credentials | Check DATABASE_URL format: `postgresql://user:pass@host/db` |
| `relation "User" does not exist` | Migrations not run | Run: `npx prisma migrate dev` |

---

## Service 2: Redis Cache & Job Queue

### Local Verification (Before Production)

```bash
# 1. Check if Redis is running locally
redis-cli ping

# Expected output:
# PONG

# 2. Check REDIS_* env vars in .env
cat .env | grep REDIS_

# Should show:
# REDIS_HOST=localhost
# REDIS_PORT=6379
# REDIS_PASSWORD= (empty or set)

# 3. Test Redis connection
redis-cli -h localhost -p 6379
# You should get: 127.0.0.1:6379>

# Type: PING
# Should respond: PONG

# Type: exit

# 4. Start backend with Redis watch
npm run dev

# Look in logs for:
# ✓ "Redis connected"
# ✓ "Email worker ready"
# OR
# ✗ "Error: connect ECONNREFUSED 127.0.0.1:6379"

# 5. Check session storage in Redis
redis-cli
KEYS session:*
# Should show session keys when you login

# 6. Check job queue in Redis
redis-cli
KEYS bull:*
# Should show BullMQ queue keys when emails are scheduled

# 7. Access Bull Board dashboard
open http://localhost:3000/admin/queues
# You should see queue statistics and job list

# 8. Test by scheduling an email
# Go to http://localhost:5173/dashboard
# Compose and schedule an email
# In Bull Board, watch it move from "delayed" → "active" → "completed"
```

### Production Verification (On Render)

1. **After adding Redis add-on to Render:**
   - Check Render dashboard → Your Service → Add-ons
   - You should see Redis listed
   - Click on it to view connection details

2. **Parse REDIS_URL into components:**
   - Render provides: `REDIS_URL=redis://:password@hostname:6379`
   - Split into:
     - `REDIS_HOST=hostname`
     - `REDIS_PORT=6379`
     - `REDIS_PASSWORD=password`
   - Set these in Environment tab

3. **After deploying, verify connection:**
   - Go to Bull Board: https://outbox-email-scheduler-wl9y.onrender.com/admin/queues
   - You should see dashboard (proves Redis connected)
   - Queue stats should show, even if no jobs queued

4. **Test by scheduling email:**
   - From frontend dashboard, schedule an email
   - Go to Bull Board
   - Watch job appear in queue
   - After delay time, job should move to "completed" state

5. **Check Render logs:**
   ```
   Look for:
   ✓ "Redis connected"
   ✓ "Email worker ready"
   ```

### Common Redis Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `ECONNREFUSED 127.0.0.1:6379` | Redis not running or wrong host | Locally: `redis-server`. On Render: add Redis add-on |
| `Error: connect ETIMEDOUT` | Wrong hostname or no connection | Check REDIS_HOST, REDIS_PORT, REDIS_PASSWORD |
| `Error: WRONGPASS invalid password` | Wrong password | Check REDIS_PASSWORD matches service password |
| `Cannot GET /admin/queues` | Express routing issue | Check backend is running, try `/health` first |

---

## Service 3: SMTP Email Service

### Local Verification with Ethereal (Before Production)

```bash
# 1. Create Ethereal test account
# Go to https://ethereal.email
# Click "Create Ethereal Account"
# You get credentials instantly

# 2. Set in .env
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USER=your-ethereal-email@ethereal.email
SMTP_PASSWORD=your-ethereal-password
SMTP_FROM=your-ethereal-email@ethereal.email

# 3. Start backend
npm run dev

# Look in logs for:
# ✓ "SMTP configured" or similar
# (Some backends don't log this - that's ok)

# 4. Test email sending from dashboard
# Go to http://localhost:5173/dashboard
# Click "Compose New Email"
# Fill in:
# - To: test@example.com (any email)
# - Subject: Test
# - Body: Test email
# - Schedule for: Now (or future time)
# Click "Schedule Campaign"

# 5. Wait for email to send
# Check backend logs for:
# ✓ "Email sent successfully" or similar
# ✗ "SMTP authentication failed" = wrong credentials
# ✗ "SMTP connection timeout" = wrong host/port

# 6. View email in Ethereal
# Go to https://ethereal.email/messages
# Login with your credentials
# You should see the test email in "Sent" folder

# 7. Verify email content
# Click the email in Ethereal
# Check sender, recipient, subject, body are correct
```

### Production Verification with SendGrid (On Render)

```bash
# 1. Create SendGrid account
# Go to https://sendgrid.com
# Sign up (free tier: 100 emails/day)

# 2. Get API key
# Dashboard → Settings → API Keys
# Click "Create API Key"
# Copy the key

# 3. Verify sender email
# Dashboard → Settings → Sender Authentication
# Click "Verify a Single Sender"
# Enter your email address
# Click link in verification email
# Now that email is "verified" for sending

# 4. Set on Render dashboard → Environment
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=SG.your-api-key-here
SMTP_FROM=your-verified-sender-email@example.com

# 5. After deploying, test from frontend
# Go to https://emailscheduler-3ja3rfexv-professional7.vercel.app/dashboard
# Compose and schedule email
# Check Render logs for success

# 6. Verify email received
# Check recipient inbox for the email
# Check SendGrid dashboard → Activity for sending stats
```

### Common SMTP Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `SMTP authentication failed` | Wrong credentials | Verify SMTP_USER and SMTP_PASSWORD with provider |
| `ECONNREFUSED` | Wrong SMTP_HOST | Check provider's SMTP hostname (e.g., smtp.sendgrid.net) |
| `Error: 535 Authentication failed` | Base64 encoding issue | Ensure credentials don't have special characters |
| `554 Message rejected` | Sender not verified | In SendGrid: Verify sender email address |
| `421 Service not available` | Rate limited | Check SendGrid rate limits; may need to upgrade account |

---

## Service 4: Google OAuth

### Local Verification (Before Production)

```bash
# 1. Check Google credentials in .env
cat .env | grep GOOGLE_

# Should show:
# GOOGLE_CLIENT_ID=...apps.googleusercontent.com
# GOOGLE_CLIENT_SECRET=...
# GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback

# 2. Start backend
npm run dev

# Look in logs for:
# ✓ OAuth service initialized (or similar)
# ✗ "Error: Invalid client"

# 3. Start frontend
cd frontend && npm run dev

# 4. Test OAuth flow
# Go to http://localhost:5173/login
# Click "Continue with Google"
# You should see Google login page (NOT error)

# 5. Complete Google login
# Enter your Google credentials
# Accept permissions
# You should be redirected to http://localhost:5173/dashboard

# 6. Verify user created in database
# Check Render logs or local DB:
# SELECT * FROM "User" WHERE email='your-google-email@gmail.com';

# 7. Logout and try again
# Click logout
# Go back to login
# Click "Continue with Google"
# Google should remember you - quick login
```

### Production Verification (On Render)

```bash
# 1. Create new OAuth app in Google Console
# Go to https://console.cloud.google.com
# Create or select project
# APIs & Services → Credentials
# Create OAuth 2.0 Client ID (Web application)
# Add redirect URI:
# https://outbox-email-scheduler-wl9y.onrender.com/api/auth/google/callback

# 2. Copy credentials to Render Environment
# GOOGLE_CLIENT_ID=...
# GOOGLE_CLIENT_SECRET=...
# GOOGLE_CALLBACK_URL=https://outbox-email-scheduler-wl9y.onrender.com/api/auth/google/callback

# 3. Verify on production
# Go to https://emailscheduler-3ja3rfexv-professional7.vercel.app/login
# Click "Continue with Google"
# Should see Google login (NOT error like "redirect_uri_mismatch")

# 4. Complete login
# Enter Google credentials
# Accept permissions
# Should be redirected to production dashboard

# 5. Check Render logs
# Look for:
# ✓ "Google auth succeeded"
# ✗ "redirect_uri_mismatch" = callback URL wrong in Google Console
# ✗ "invalid_client" = wrong CLIENT_ID or SECRET
```

### Common OAuth Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `redirect_uri_mismatch` | Callback URL not registered in Google Console | Update Google Console with exact Render URL |
| `invalid_client` | Wrong GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET | Get new credentials from Google Console |
| `invalid_grant` | Authorization code expired or already used | Refresh page and try again |
| `access_denied` | User rejected permissions | Ask user to accept permissions or try again |
| `Error: No id_token returned` | Google response incomplete | Check network tab in browser for errors |

---

## Service 5: Slack Integration (Optional)

### Local Verification (Before Production)

```bash
# 1. If NOT using Slack, set mock values in .env
SLACK_CLIENT_ID=mock_slack_id
SLACK_CLIENT_SECRET=mock_slack_secret

# 2. Start backend
npm run dev

# Look for:
# ✓ No errors (Slack is optional)
# ✗ "Error: missing Slack credentials" (only if you try to use Slack)

# 3. Verify Slack features are disabled but app works
# Test email sending (doesn't use Slack)
# Email should send without Slack errors
```

### Production Verification (If Using Slack)

```bash
# 1. Create Slack app
# Go to https://api.slack.com/apps
# Click "Create New App" → "From scratch"
# App name: Email Scheduler Bot
# Development workspace: your Slack workspace

# 2. Add OAuth
# OAuth & Permissions
# Redirect URIs: https://outbox-email-scheduler-wl9y.onrender.com/api/integrations/slack/callback
# Bot Token Scopes: chat:write
# Install app to workspace

# 3. Get credentials
# Basic Information tab
# Copy Client ID and Client Secret

# 4. Set on Render
# SLACK_CLIENT_ID=...
# SLACK_CLIENT_SECRET=...
# SLACK_CALLBACK_URL=https://outbox-email-scheduler-wl9y.onrender.com/api/integrations/slack/callback

# 5. Generate encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Set: SLACK_TOKEN_ENCRYPTION_KEY=...

# 6. Test Slack notification
# When hourly email limit is reached:
# - Backend sends DM to your Slack user
# Check your Slack workspace for notification
```

---

## Service 6: Elasticsearch Search (Optional)

### Local Verification (Before Production)

```bash
# 1. If NOT using Elasticsearch, leave blank in .env
ELASTICSEARCH_URL=
ELASTICSEARCH_API_KEY=

# 2. Start backend
npm run dev

# Look for:
# ✓ No errors (Elasticsearch is optional)

# 3. Verify search is gracefully disabled
# Dashboard should load without search features
# Email list still works, just can't search
```

### Production Verification (If Using Elasticsearch)

```bash
# 1. Create Elastic Cloud account
# Go to https://cloud.elastic.co
# Create deployment

# 2. Get credentials
# Copy endpoint URL
# Generate API key

# 3. Set on Render
# ELASTICSEARCH_URL=https://...
# ELASTICSEARCH_API_KEY=...

# 4. Test after deploying
# Send a test email
# Go to dashboard search
# Search for email sender or recipient
# Email should appear in results
```

---

## Complete Production Verification Checklist

Run through this before declaring production ready:

### Pre-Deployment (Local Testing)

- [ ] PostgreSQL running: `psql -U postgres -c "SELECT 1"`
- [ ] Redis running: `redis-cli ping` returns PONG
- [ ] Backend starts: `npm run dev` has no errors
- [ ] Database connected: Prisma studio loads at http://localhost:5555
- [ ] Google OAuth works: Click login button, see Google login
- [ ] Ethereal email works: Schedule email, see it in Ethereal inbox
- [ ] Bull Board accessible: http://localhost:3000/admin/queues loads
- [ ] Email job processes: Job visible in Bull Board, moves to completed

### Production Setup (Render Dashboard)

- [ ] PostgreSQL add-on created and DATABASE_URL set
- [ ] Redis add-on created and REDIS_* vars set
- [ ] NODE_ENV=production
- [ ] FRONTEND_URL set to Vercel domain
- [ ] Google OAuth credentials updated with production callback URL
- [ ] SESSION_SECRET generated and set
- [ ] SMTP credentials from SendGrid (or provider) set
- [ ] SLACK_* credentials set (or mock values)
- [ ] SLACK_TOKEN_ENCRYPTION_KEY generated and set

### Post-Deployment (Production Testing)

- [ ] Health check returns 200: `curl https://outbox-email-scheduler-wl9y.onrender.com/health`
- [ ] OAuth login works: Frontend → Login → Google → Dashboard
- [ ] User created in database: Can see user in DB after login
- [ ] Bull Board accessible: https://outbox-email-scheduler-wl9y.onrender.com/admin/queues
- [ ] Email sends: Schedule email, check provider inbox and Bull Board
- [ ] Logs show no errors: Render dashboard → Logs tab
- [ ] Session persists: Close browser, login again - should be remembered
- [ ] CORS works: Frontend can call backend APIs

### Monitoring (Ongoing)

- [ ] Check Render logs daily for errors
- [ ] Monitor email delivery success rate
- [ ] Test login weekly
- [ ] Check database growth (not bloating unnecessarily)
- [ ] Monitor Redis memory usage
- [ ] Set up alerts for service failures

---

## Quick Test Commands

```bash
# Test health endpoint
curl https://outbox-email-scheduler-wl9y.onrender.com/health

# Test CORS
curl -H "Origin: https://emailscheduler-3ja3rfexv-professional7.vercel.app" \
     https://outbox-email-scheduler-wl9y.onrender.com/health

# Check API response times
time curl https://outbox-email-scheduler-wl9y.onrender.com/health

# Test with auth (after login, get session cookie)
curl -b "connect.sid=<session_id>" \
     https://outbox-email-scheduler-wl9y.onrender.com/api/auth/me
```

---

**Last Updated:** August 29, 2026  
**Purpose:** Service verification before and after production deployment
