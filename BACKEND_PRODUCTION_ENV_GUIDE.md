# Backend Production Environment Configuration Guide

## Quick Summary: What Needs to Change for Render

Your backend is currently configured for **localhost development**. For production on Render, you need to:

1. **Update all localhost URLs** to use your Render production domain
2. **Set up production databases** (PostgreSQL + Redis)
3. **Configure production credentials** (OAuth, SMTP, encryption keys)
4. **Secure all sensitive values** (never commit to git)

---

## Part 1: Environment Variables Reference

### CRITICAL: Variables That MUST Be Changed

| Variable | Dev Value | Production Value | Where to Get It |
|----------|-----------|------------------|-----------------|
| **NODE_ENV** | `development` | `production` | Set in Render dashboard |
| **DATABASE_URL** | `postgresql://postgres:postgres@localhost:5432/email_scheduler?schema=public` | PostgreSQL connection URL | Use Render PostgreSQL add-on |
| **REDIS_HOST** | `localhost` | Redis hostname | Use Render Redis add-on or Upstash |
| **REDIS_PORT** | `6379` | From Redis service | From Redis service |
| **REDIS_PASSWORD** | (empty) | Redis password | From Redis service |
| **FRONTEND_URL** | `http://localhost:5173` | `https://emailscheduler-3ja3rfexv-professional7.vercel.app` | Your Vercel frontend URL |
| **GOOGLE_CALLBACK_URL** | `http://localhost:3000/api/auth/google/callback` | `https://outbox-email-scheduler-wl9y.onrender.com/api/auth/google/callback` | Render backend URL |
| **GOOGLE_CLIENT_ID** | (dev credentials) | Production OAuth app ID | Create new app in Google Console |
| **GOOGLE_CLIENT_SECRET** | (dev credentials) | Production OAuth app secret | Create new app in Google Console |
| **SESSION_SECRET** | `super-secret-key-for-local-testing` | 64-char random hex | Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| **SLACK_CALLBACK_URL** | `http://localhost:3000/api/integrations/slack/callback` | `https://outbox-email-scheduler-wl9y.onrender.com/api/integrations/slack/callback` | Render backend URL |
| **SLACK_CLIENT_ID** | `mock_slack_id` | Real Slack app ID | Create app at https://api.slack.com/apps |
| **SLACK_CLIENT_SECRET** | `mock_slack_secret` | Real Slack app secret | From Slack app settings |
| **SLACK_TOKEN_ENCRYPTION_KEY** | `0123456789abcdef...` | 64-char random hex | Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| **SMTP_HOST** | `smtp.ethereal.email` | Your mail service host | SendGrid, AWS SES, Mailgun, etc. |
| **SMTP_PORT** | `587` | Service-specific port | Usually 587 or 465 |
| **SMTP_USER** | Ethereal test account | Production account | From mail service |
| **SMTP_PASSWORD** | Ethereal password | Production password | From mail service |
| **SMTP_FROM** | `brionna.abbott48@ethereal.email` | Your sender email | Must match authenticated sender in mail service |

### OPTIONAL: Variables With Safe Defaults

| Variable | Default | Use Cases | Notes |
|----------|---------|-----------|-------|
| **PORT** | `3000` | N/A | Render automatically assigns via $PORT env var - **Don't set this** |
| **WORKER_CONCURRENCY** | `5` | Tune email throughput | 5 concurrent emails. Increase for faster delivery. |
| **MIN_EMAIL_DELAY_MS** | `0` | Minimum spacing between emails | Set to 1000-2000 for throttling |
| **MAX_EMAILS_PER_HOUR_PER_SENDER** | `1000` | Rate limit | Adjust based on your mail provider limits |
| **ELASTICSEARCH_URL** | (optional) | Email search/analytics | Can omit if not using search features |
| **ELASTICSEARCH_API_KEY** | (optional) | Email search/analytics | Can omit if not using search features |

---

## Part 2: Step-by-Step Production Setup

### Step 1: Create Production Secrets (Do This First!)

Generate random secure values. Run these commands in your terminal:

```bash
# Session Secret (64-char hex)
node -e "console.log('SESSION_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"

# Slack Token Encryption Key (64-char hex)
node -e "console.log('SLACK_TOKEN_ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('hex'))"
```

**Example Output:**
```
SESSION_SECRET=a1b2c3d4e5f6....(64 characters total)
SLACK_TOKEN_ENCRYPTION_KEY=x9y8z7w6v5u4....(64 characters total)
```

Save these values - you'll need them for Render dashboard.

---

### Step 2: Set Up Database & Redis on Render

#### Option A: Use Render Add-ons (Recommended)

1. **Go to your Render service dashboard**
2. **Click "Add-ons"** (or "Resources" tab)
3. **Add PostgreSQL:**
   - Click "Create PostgreSQL"
   - Name: `email-scheduler-db`
   - Database name: `email_scheduler`
   - Render will automatically create `DATABASE_URL` env var
   - Copy the connection string for backup

4. **Add Redis:**
   - Click "Create Redis"
   - Name: `email-scheduler-redis`
   - Render will automatically create `REDIS_URL` env var
   - You may need to parse it into components OR use `redis://user:pass@host:port` format

**Problem with Render Redis Add-on:** It returns `REDIS_URL` but the backend expects separate `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`.

**Solution:** Parse the REDIS_URL in Render environment:
- If Render gives: `redis://:password@hostname:6379`
- Extract: `REDIS_HOST=hostname`, `REDIS_PORT=6379`, `REDIS_PASSWORD=password`

#### Option B: Use External Services

**PostgreSQL - Neon.tech (Free PostgreSQL Hosting)**
1. Go to https://neon.tech
2. Sign up (free tier)
3. Create project
4. Get connection string: `postgresql://user:password@host/dbname`
5. Set `DATABASE_URL` on Render

**Redis - Upstash.com (Free Serverless Redis)**
1. Go to https://upstash.com
2. Sign up (free tier)
3. Create Redis database
4. Get connection details
5. Set `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` on Render

---

### Step 3: Configure Google OAuth for Production

1. **Go to Google Cloud Console:** https://console.cloud.google.com
2. **Create new OAuth app or use existing:**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth 2.0 Client ID"
   - Select "Web application"
   - Add authorized redirect URI:
     ```
     https://outbox-email-scheduler-wl9y.onrender.com/api/auth/google/callback
     ```
   - Click "Create"
3. **Copy credentials:**
   - Copy `Client ID` → `GOOGLE_CLIENT_ID`
   - Copy `Client Secret` → `GOOGLE_CLIENT_SECRET`

---

### Step 4: Configure Slack Integration (Optional)

If you want Slack notifications for rate limit alerts:

1. **Go to Slack App Marketplace:** https://api.slack.com/apps
2. **Create new app:**
   - Click "Create New App" → "From scratch"
   - App name: `Email Scheduler Bot`
   - Development workspace: (your Slack workspace)
3. **Set OAuth redirect URL:**
   - Go to "OAuth & Permissions"
   - Scroll to "Redirect URLs"
   - Add: `https://outbox-email-scheduler-wl9y.onrender.com/api/integrations/slack/callback`
   - Click "Save"
4. **Add permission scopes:**
   - Scroll to "Bot Token Scopes"
   - Click "Add Scopes"
   - Add: `chat:write`
5. **Get credentials:**
   - Scroll to "Tokens for Your Workspace"
   - Copy "Bot User OAuth Token" (this is NOT the secret - it's for testing only)
   - Go to "Basic Information" tab
   - Copy `Client ID` → `SLACK_CLIENT_ID`
   - Copy `Client Secret` → `SLACK_CLIENT_SECRET`

**For production:** Users will authenticate via OAuth link, not using bot token directly.

---

### Step 5: Configure SMTP for Production Email

Choose one option:

#### Option A: SendGrid (Recommended - Free tier)
1. Go to https://sendgrid.com
2. Sign up (free tier: 100 emails/day)
3. Get API key from Settings → API Keys
4. Create sender identity at Settings → Sender Authentication
5. Set environment variables:
   ```
   SMTP_HOST=smtp.sendgrid.net
   SMTP_PORT=587
   SMTP_USER=apikey
   SMTP_PASSWORD=<your SendGrid API key>
   SMTP_FROM=<your verified sender email>
   ```

#### Option B: AWS SES (If using AWS)
1. Go to AWS SES Console
2. Request production access
3. Verify sender email address
4. Create SMTP credentials
5. Set environment variables:
   ```
   SMTP_HOST=email-smtp.<region>.amazonaws.com
   SMTP_PORT=587
   SMTP_USER=<SMTP username from AWS>
   SMTP_PASSWORD=<SMTP password from AWS>
   SMTP_FROM=<your verified sender email>
   ```

#### Option C: Mailgun (Free tier with limitations)
1. Go to https://www.mailgun.com
2. Sign up (free tier)
3. Get SMTP credentials
4. Set environment variables:
   ```
   SMTP_HOST=smtp.mailgun.org
   SMTP_PORT=587
   SMTP_USER=<mailgun SMTP username>
   SMTP_PASSWORD=<mailgun SMTP password>
   SMTP_FROM=<your sending domain>
   ```

---

### Step 6: Set All Environment Variables on Render Dashboard

1. **Go to your Render service:** https://dashboard.render.com
2. **Click your backend service**
3. **Go to "Environment"** tab
4. **Add each variable** (copy-paste from list below):

```
NODE_ENV=production
PORT=3000
DATABASE_URL=<from PostgreSQL add-on or external service>
REDIS_HOST=<from Redis service>
REDIS_PORT=<from Redis service>
REDIS_PASSWORD=<from Redis service>
FRONTEND_URL=https://emailscheduler-3ja3rfexv-professional7.vercel.app
GOOGLE_CLIENT_ID=<from Google Console>
GOOGLE_CLIENT_SECRET=<from Google Console>
GOOGLE_CALLBACK_URL=https://outbox-email-scheduler-wl9y.onrender.com/api/auth/google/callback
SESSION_SECRET=<from generated value step 1>
SLACK_CLIENT_ID=<from Slack app or mock_slack_id if skipping>
SLACK_CLIENT_SECRET=<from Slack app or mock_slack_secret if skipping>
SLACK_CALLBACK_URL=https://outbox-email-scheduler-wl9y.onrender.com/api/integrations/slack/callback
SLACK_TOKEN_ENCRYPTION_KEY=<from generated value step 1>
SMTP_HOST=<from email provider>
SMTP_PORT=<from email provider>
SMTP_USER=<from email provider>
SMTP_PASSWORD=<from email provider>
SMTP_FROM=<your verified sender email>
WORKER_CONCURRENCY=5
MIN_EMAIL_DELAY_MS=0
MAX_EMAILS_PER_HOUR_PER_SENDER=1000
ELASTICSEARCH_URL=<optional - from Elastic Cloud or leave blank>
ELASTICSEARCH_API_KEY=<optional - from Elastic Cloud or leave blank>
```

5. **Click "Save Changes"**
6. **Render will automatically restart your service** ✅

---

## Part 3: Verification Checklist

After setting all environment variables on Render:

### Check 1: Backend Service Health
```bash
curl https://outbox-email-scheduler-wl9y.onrender.com/health
```
Expected response:
```json
{"status":"ok","environment":"production"}
```

### Check 2: Google OAuth Redirect Works
1. Go to https://emailscheduler-3ja3rfexv-professional7.vercel.app/login
2. Click "Continue with Google"
3. You should be redirected to Google login (NOT error page)
4. After login, you should see dashboard

### Check 3: Database Connection
1. Login successfully (this tests DB connection)
2. Go to BullMQ Dashboard: https://outbox-email-scheduler-wl9y.onrender.com/admin/queues
3. You should see the dashboard (this tests Redis connection)

### Check 4: Email Sending
1. From dashboard, compose and send test email
2. Check Render logs for success/error messages
3. Verify SMTP provider received the email

### Check 5: Render Logs
```bash
# View logs in Render dashboard or via CLI
render logs your-service-id
```

Look for:
- ✅ "Server listening on port 3000"
- ✅ "PostgreSQL connected"
- ✅ "Redis connected"
- ✅ "Email worker ready"
- ❌ "ERROR" messages indicate problems

---

## Part 4: Common Production Errors & Fixes

### Error: "Invalid state parameter. Session may have expired."

**Cause:** `FRONTEND_URL` is still pointing to localhost

**Fix:** On Render dashboard, set:
```
FRONTEND_URL=https://emailscheduler-3ja3rfexv-professional7.vercel.app
```

### Error: "CORS policy: request has been blocked"

**Cause:** `FRONTEND_URL` in CORS origin doesn't match frontend domain

**Fix:** Verify `FRONTEND_URL` matches your Vercel domain exactly (including https://)

### Error: "connect ECONNREFUSED localhost:5432"

**Cause:** `DATABASE_URL` is still pointing to localhost

**Fix:** 
1. Ensure PostgreSQL add-on is added to Render service
2. Verify `DATABASE_URL` env var is set from add-on
3. Check Render dashboard shows PostgreSQL in "Add-ons" section

### Error: "Error: Redis connection failed"

**Cause:** `REDIS_HOST` is still localhost

**Fix:**
1. Ensure Redis add-on is added to Render service
2. Parse `REDIS_URL` into `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`
3. Or use `redis://user:pass@host:port` format if backend supports it

### Error: "SMTP authentication failed"

**Cause:** Wrong SMTP credentials

**Fix:**
1. Verify credentials from email provider (SendGrid, SES, Mailgun)
2. Check `SMTP_FROM` matches verified sender in email provider
3. Test credentials locally first before pushing to Render

### Error: "Google OAuth error: invalid_grant"

**Cause:** 
- `GOOGLE_CALLBACK_URL` doesn't match Google Console redirect URI
- OR Google Console OAuth app was not updated with production URL

**Fix:**
1. Go to Google Cloud Console
2. Find your OAuth app
3. Update redirect URI to: `https://outbox-email-scheduler-wl9y.onrender.com/api/auth/google/callback`
4. Save and wait 5 minutes for changes to propagate

---

## Part 5: Security Best Practices

### ✅ DO:
- ✅ Generate random secrets with `crypto.randomBytes(32).toString('hex')`
- ✅ Store all secrets in Render environment variables (never in git)
- ✅ Use HTTPS for all callbacks and redirects
- ✅ Rotate secrets periodically (every 3-6 months)
- ✅ Use production OAuth credentials (separate from dev)
- ✅ Set `NODE_ENV=production` for security headers and secure cookies

### ❌ DON'T:
- ❌ Commit `.env` file to git (add to `.gitignore`)
- ❌ Share credentials in Slack, email, or chat
- ❌ Use localhost URLs in production
- ❌ Use weak secrets like "super-secret-key-for-local-testing"
- ❌ Use dev OAuth credentials in production
- ❌ Leave Elasticsearch API key exposed in git

### Current Issues in Your Repo:
1. ❌ All secrets exposed in `.env` file in git history
2. ❌ Google OAuth secret visible in commit history
3. ❌ Elasticsearch API key visible in commit history
4. ❌ SMTP credentials in git

**Action Required:**
```bash
# Rotate all exposed credentials immediately
# 1. Change all passwords/secrets on their respective platforms
# 2. Generate new values (crypto.randomBytes)
# 3. Update Render environment variables
# 4. Consider using git-crypt or sealed-secrets for .env files
```

---

## Part 6: Render Deployment Checklist

Before pushing to production, verify:

- [ ] NODE_ENV = production
- [ ] PORT = 3000 (or leave default)
- [ ] DATABASE_URL = Render PostgreSQL (not localhost)
- [ ] REDIS_HOST = Render Redis or Upstash (not localhost)
- [ ] FRONTEND_URL = Vercel production URL (https://emailscheduler-3ja3rfexv-professional7.vercel.app)
- [ ] GOOGLE_CLIENT_ID = Production OAuth app ID
- [ ] GOOGLE_CLIENT_SECRET = Production OAuth app secret
- [ ] GOOGLE_CALLBACK_URL = https://outbox-email-scheduler-wl9y.onrender.com/api/auth/google/callback
- [ ] SESSION_SECRET = 64-char random hex (generated)
- [ ] SMTP_HOST = Production mail service (not ethereal)
- [ ] SMTP_USER = Production mail account
- [ ] SMTP_PASSWORD = Production mail password
- [ ] SMTP_FROM = Verified sender email in mail service
- [ ] SLACK_CLIENT_ID = Real Slack app ID or mock_slack_id
- [ ] SLACK_CLIENT_SECRET = Real Slack app secret or mock_slack_secret
- [ ] SLACK_CALLBACK_URL = https://outbox-email-scheduler-wl9y.onrender.com/api/integrations/slack/callback
- [ ] SLACK_TOKEN_ENCRYPTION_KEY = 64-char random hex (generated)
- [ ] WORKER_CONCURRENCY = 5 (or tuned for your load)
- [ ] All sensitive values removed from .env file in git

---

## Quick Copy-Paste Checklists

### Generate All Secrets at Once

```bash
# Run these commands and save the output
echo "=== GENERATE ALL SECRETS ==="
echo "SESSION_SECRET:"
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
echo ""
echo "SLACK_TOKEN_ENCRYPTION_KEY:"
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Render Environment Variables Template

```
# Core Server
NODE_ENV=production
PORT=3000

# Database (from Render PostgreSQL add-on)
DATABASE_URL=postgresql://user:pass@host/dbname

# Redis (from Render Redis add-on or Upstash)
REDIS_HOST=hostname
REDIS_PORT=6379
REDIS_PASSWORD=password

# Frontend
FRONTEND_URL=https://emailscheduler-3ja3rfexv-professional7.vercel.app

# Google OAuth (create new app in Google Console)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=https://outbox-email-scheduler-wl9y.onrender.com/api/auth/google/callback

# Session (generate with crypto.randomBytes)
SESSION_SECRET=

# Slack (optional - create app at api.slack.com)
SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=
SLACK_CALLBACK_URL=https://outbox-email-scheduler-wl9y.onrender.com/api/integrations/slack/callback
SLACK_TOKEN_ENCRYPTION_KEY=

# SMTP (SendGrid, SES, Mailgun, etc.)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=

# Performance (optional - use defaults if unsure)
WORKER_CONCURRENCY=5
MIN_EMAIL_DELAY_MS=0
MAX_EMAILS_PER_HOUR_PER_SENDER=1000

# Elasticsearch (optional - leave blank if not using)
ELASTICSEARCH_URL=
ELASTICSEARCH_API_KEY=
```

---

## Need Help?

1. **Error message?** → Check "Part 4: Common Production Errors & Fixes"
2. **Service not connecting?** → Check Render logs with dashboard or CLI
3. **Database issues?** → Use Render PostgreSQL dashboard to view connections
4. **Email not sending?** → Check SMTP credentials match provider settings
5. **OAuth failing?** → Verify callback URLs match exactly in Google/Slack console

---

**Last Updated:** August 29, 2026
**Status:** Production Ready for Render Deployment
