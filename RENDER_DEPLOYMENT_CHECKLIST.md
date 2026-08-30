# Render Deployment Checklist - Final Pre-Flight

Complete this entire checklist before deploying to production.

---

## Phase 1: Pre-Deployment (Local Validation)

### 1.1 Environment Setup

- [ ] Copy `.env.example` to `.env` in project root
- [ ] Fill in all required values in `.env`
- [ ] Verify `.env` is in `.gitignore` (should be - check with `cat .gitignore | grep .env`)
- [ ] Run validation script: `node backend/scripts/validate-env.js`
- [ ] Script output shows: "All required variables are set ✓"

### 1.2 Local Services Running

- [ ] PostgreSQL running locally: `psql -U postgres -c "SELECT 1"`
- [ ] Redis running locally: `redis-cli ping` returns PONG
- [ ] Backend builds successfully: `cd backend && npm run build`
- [ ] Frontend builds successfully: `cd frontend && npm run build`
- [ ] No TypeScript errors: `cd backend && npm run typecheck`

### 1.3 Local Testing

- [ ] Backend starts without errors: `cd backend && npm run dev`
  - Look for: "Server listening on port 3000"
  - Look for: "PostgreSQL connected"
  - Look for: "Redis connected"
- [ ] Frontend starts: `cd frontend && npm run dev`
- [ ] Frontend loads at http://localhost:5173 without errors
- [ ] No console errors in browser DevTools

### 1.4 OAuth Testing (Local)

- [ ] Go to http://localhost:5173/login
- [ ] Click "Continue with Google"
- [ ] You see Google login form (NOT error page)
- [ ] After login, redirected to dashboard
- [ ] Dashboard loads and shows logged-in user

### 1.5 Email Testing (Local)

- [ ] Go to http://localhost:5173/dashboard
- [ ] Click "Compose New Email"
- [ ] Fill in: To, Subject, Body
- [ ] Schedule for: Now (or 1 minute from now)
- [ ] Click "Schedule Campaign"
- [ ] Check backend logs: "Email sent successfully" or similar
- [ ] Check Ethereal inbox: https://ethereal.email/messages
- [ ] Email appears in Ethereal with correct content

### 1.6 Bull Board Testing (Local)

- [ ] Go to http://localhost:3000/admin/queues
- [ ] See Bull Board dashboard (queue stats)
- [ ] Schedule an email and watch it in Bull Board:
  - Should see job in "delayed" queue initially
  - Move to "active" when processing
  - Move to "completed" when done
- [ ] No errors in Bull Board UI

### 1.7 Git Status Check

- [ ] All changes committed: `git status` shows "nothing to commit"
- [ ] `.env` is NOT staged: `git ls-files | grep .env` returns nothing
- [ ] All code is pushed: `git log --oneline -5` shows recent commits
- [ ] No uncommitted changes: `git diff HEAD` shows nothing

---

## Phase 2: Credential Preparation

### 2.1 Generate Production Secrets

Run these commands locally and save the output:

```bash
# Generate SESSION_SECRET (64-char hex)
node -e "console.log('SESSION_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"

# Generate SLACK_TOKEN_ENCRYPTION_KEY (64-char hex)
node -e "console.log('SLACK_TOKEN_ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('hex'))"
```

- [ ] SESSION_SECRET copied to secure location (password manager)
- [ ] SLACK_TOKEN_ENCRYPTION_KEY copied to secure location

### 2.2 Google OAuth Credentials

- [ ] Google Cloud Console: https://console.cloud.google.com
- [ ] Create new OAuth 2.0 Client ID (Web application)
- [ ] Add redirect URI: `https://outbox-email-scheduler-wl9y.onrender.com/api/auth/google/callback`
- [ ] Copy Client ID: `________________`
- [ ] Copy Client Secret: `________________`
- [ ] Credentials saved in secure location

### 2.3 Email Service Credentials (SendGrid Example)

- [ ] SendGrid account: https://sendgrid.com
- [ ] Free tier active (100 emails/day minimum)
- [ ] Sender email verified: Settings → Sender Authentication
- [ ] API key created: Settings → API Keys
- [ ] API key: `________________`
- [ ] Credentials saved in secure location

### 2.4 Slack Integration (Optional)

If using Slack:
- [ ] Slack app created: https://api.slack.com/apps
- [ ] OAuth & Permissions configured:
  - Redirect URI: `https://outbox-email-scheduler-wl9y.onrender.com/api/integrations/slack/callback`
  - Bot scopes: `chat:write`
- [ ] Client ID: `________________`
- [ ] Client Secret: `________________`
- [ ] Credentials saved in secure location

If NOT using Slack:
- [ ] Use mock values:
  - SLACK_CLIENT_ID = `mock_slack_id`
  - SLACK_CLIENT_SECRET = `mock_slack_secret`

---

## Phase 3: Render Setup

### 3.1 Create/Connect Render Service

- [ ] Go to: https://dashboard.render.com
- [ ] Connect GitHub account if not already connected
- [ ] Create new service or select existing backend service
- [ ] Service name: email-scheduler-backend (or your name)
- [ ] GitHub repo: Outbox-Email-Scheduler
- [ ] Branch: main
- [ ] Runtime: Node
- [ ] Build command: `cd backend && npm install && npm run build`
- [ ] Start command: `cd backend && npm start`

### 3.2 Add PostgreSQL Add-on

- [ ] In Render dashboard → Your service
- [ ] Click **"Add-ons"** tab (or scroll to Resources)
- [ ] Click **"Create PostgreSQL"**
- [ ] Database name: `email_scheduler`
- [ ] Click **"Create PostgreSQL"**
- [ ] Wait 1-2 minutes for provisioning
- [ ] Refresh browser
- [ ] In **Environment** tab, verify `DATABASE_URL` is present
- [ ] DATABASE_URL format: `postgresql://user:password@hostname.render.internal:5432/email_scheduler`

### 3.3 Add Redis Add-on

- [ ] Same **"Add-ons"** tab
- [ ] Click **"Create Redis"**
- [ ] Click **"Create Redis"**
- [ ] Wait 1-2 minutes for provisioning
- [ ] In **Environment** tab, verify `REDIS_URL` is present
- [ ] REDIS_URL format: `redis://:password@hostname:6379`

### 3.4 Parse Redis URL (If Needed)

If Render gives REDIS_URL, extract components:
- [ ] REDIS_HOST: `________________` (from REDIS_URL hostname part)
- [ ] REDIS_PORT: `6379` (from REDIS_URL port)
- [ ] REDIS_PASSWORD: `________________` (from REDIS_URL password part)

---

## Phase 4: Set Environment Variables on Render

### 4.1 Core Configuration

Go to Render Dashboard → Your Service → **Environment** tab

Add each variable:

```
NODE_ENV
production

PORT
3000
```

- [ ] NODE_ENV set to `production`
- [ ] PORT set to `3000`

### 4.2 Database & Cache (From Add-ons)

These should already be populated:

- [ ] DATABASE_URL present (auto from PostgreSQL add-on)
- [ ] REDIS_HOST set (manually from REDIS_URL parse)
- [ ] REDIS_PORT set to `6379` (manually)
- [ ] REDIS_PASSWORD set (manually from REDIS_URL parse)

### 4.3 Frontend URL

```
FRONTEND_URL
https://emailscheduler-3ja3rfexv-professional7.vercel.app
```

- [ ] FRONTEND_URL set to your Vercel domain
- [ ] Includes https:// (not http://)
- [ ] No trailing slash

### 4.4 Google OAuth

```
GOOGLE_CLIENT_ID
<your-production-google-client-id>

GOOGLE_CLIENT_SECRET
<your-production-google-client-secret>

GOOGLE_CALLBACK_URL
https://outbox-email-scheduler-wl9y.onrender.com/api/auth/google/callback
```

- [ ] GOOGLE_CLIENT_ID set
- [ ] GOOGLE_CLIENT_SECRET set
- [ ] GOOGLE_CALLBACK_URL set (must match Google Console exactly)

### 4.5 Session & Encryption

```
SESSION_SECRET
<64-char-hex-from-generation>

SLACK_TOKEN_ENCRYPTION_KEY
<64-char-hex-from-generation>
```

- [ ] SESSION_SECRET set to generated value
- [ ] SLACK_TOKEN_ENCRYPTION_KEY set to generated value

### 4.6 Slack Integration

Option A - Using Slack:
```
SLACK_CLIENT_ID
<your-slack-client-id>

SLACK_CLIENT_SECRET
<your-slack-client-secret>

SLACK_CALLBACK_URL
https://outbox-email-scheduler-wl9y.onrender.com/api/integrations/slack/callback
```

Option B - Not using Slack:
```
SLACK_CLIENT_ID
mock_slack_id

SLACK_CLIENT_SECRET
mock_slack_secret

SLACK_CALLBACK_URL
https://outbox-email-scheduler-wl9y.onrender.com/api/integrations/slack/callback
```

- [ ] SLACK_CLIENT_ID set
- [ ] SLACK_CLIENT_SECRET set
- [ ] SLACK_CALLBACK_URL set

### 4.7 Email Service (SendGrid Example)

```
SMTP_HOST
smtp.sendgrid.net

SMTP_PORT
587

SMTP_USER
apikey

SMTP_PASSWORD
SG.<your-sendgrid-api-key>

SMTP_FROM
noreply@yourdomain.com
```

- [ ] SMTP_HOST set to provider's SMTP server
- [ ] SMTP_PORT set to provider's port (usually 587 or 465)
- [ ] SMTP_USER set
- [ ] SMTP_PASSWORD set (🔒 sensitive - use Render's secret input)
- [ ] SMTP_FROM set to verified sender email

### 4.8 Performance Tuning (Optional)

```
WORKER_CONCURRENCY
5

MIN_EMAIL_DELAY_MS
0

MAX_EMAILS_PER_HOUR_PER_SENDER
1000
```

- [ ] WORKER_CONCURRENCY set (or use default 5)
- [ ] MIN_EMAIL_DELAY_MS set (or use default 0)
- [ ] MAX_EMAILS_PER_HOUR_PER_SENDER set (or use default 1000)

### 4.9 Elasticsearch (Optional)

If using Elasticsearch:
```
ELASTICSEARCH_URL
<your-elastic-cloud-url>

ELASTICSEARCH_API_KEY
<your-elastic-api-key>
```

If NOT using Elasticsearch:
- [ ] Leave ELASTICSEARCH_URL blank
- [ ] Leave ELASTICSEARCH_API_KEY blank

### 4.10 Save Changes

- [ ] Click **"Save Changes"** button
- [ ] Render shows: "Updating environment..."
- [ ] Service redeploys automatically
- [ ] Wait 2-3 minutes for redeploy to complete

---

## Phase 5: Post-Deployment Verification

### 5.1 Health Check

```bash
curl https://outbox-email-scheduler-wl9y.onrender.com/health
```

- [ ] Response code: 200
- [ ] Response body: `{"status":"ok","environment":"production"}`

### 5.2 Render Logs (No Errors)

Go to Render Dashboard → Logs tab:

- [ ] Look for: "Server listening on port 3000"
- [ ] Look for: "PostgreSQL connected"
- [ ] Look for: "Redis connected"
- [ ] Look for: "Email worker ready"
- [ ] ❌ NO "ERROR" or "FATAL" messages

### 5.3 Frontend to Backend Connection

- [ ] Go to frontend: https://emailscheduler-3ja3rfexv-professional7.vercel.app/login
- [ ] Page loads without CORS errors
- [ ] No errors in browser console

### 5.4 Google OAuth (Production)

- [ ] Click "Continue with Google"
- [ ] You see Google login form (NOT redirect_uri_mismatch error)
- [ ] Enter Google credentials
- [ ] Accept permissions
- [ ] Redirected to https://emailscheduler-3ja3rfexv-professional7.vercel.app/dashboard
- [ ] Dashboard loads with your user info

### 5.5 Database Connection (Verified by Login)

- [ ] Successful login means database connected
- [ ] User data is saved in PostgreSQL
- [ ] Session is stored in Redis

### 5.6 Bull Board & Redis Connection

- [ ] Go to: https://outbox-email-scheduler-wl9y.onrender.com/admin/queues
- [ ] Bull Board dashboard loads
- [ ] Shows queue statistics
- [ ] No "Redis connection failed" error

### 5.7 Email Sending (End-to-End)

From production frontend:
- [ ] Go to dashboard
- [ ] Click "Compose New Email"
- [ ] Fill in test email details
- [ ] Schedule for: Now (or immediate time)
- [ ] Check backend logs: "Email sent successfully" or similar
- [ ] Check SendGrid/SES dashboard: Email appears in activity log
- [ ] Check recipient email inbox: Email arrived (may take 1-5 minutes)

### 5.8 Session Persistence

- [ ] Logged in to production
- [ ] Close browser completely
- [ ] Open frontend URL again
- [ ] You're still logged in (session persisted to Redis)
- [ ] Logout works: Click logout, redirected to login

### 5.9 CORS Verification

- [ ] Open browser DevTools → Network tab
- [ ] Make any request from frontend to backend
- [ ] Response has `Access-Control-Allow-Origin: https://emailscheduler-3ja3rfexv-professional7.vercel.app`
- [ ] No CORS errors in console

---

## Phase 6: Production Verification (24-Hour Monitoring)

### 6.1 First Day Checks

- [ ] Render logs show no recurring errors
- [ ] Database connections stable (Render dashboard → Logs)
- [ ] Redis connections stable
- [ ] Test another email send (if available)
- [ ] Test another user login (share demo link with someone)

### 6.2 First Week Checks

- [ ] Monitor email delivery success rate (should be >99%)
- [ ] Check Render resource usage (CPU, memory)
- [ ] Verify no database connection pool exhaustion
- [ ] Test OAuth login with new user account
- [ ] Run health check daily: `curl https://outbox-email-scheduler-wl9y.onrender.com/health`

### 6.3 Ongoing Monitoring

- [ ] Set up Render alerts for service failures (optional)
- [ ] Check logs weekly for any errors
- [ ] Monitor PostgreSQL storage usage
- [ ] Rotate secrets every 6 months (calendar reminder)
- [ ] Update dependencies monthly

---

## Phase 7: Troubleshooting (If Something Fails)

### Issue: Service won't start / "Build failed"

**Check:**
1. Render logs for build errors
2. `npm run build` succeeds locally
3. `package.json` has correct scripts
4. All dependencies installed

**Fix:**
```bash
# Test locally
npm install
npm run build
npm start
```

### Issue: "Invalid state parameter" during OAuth

**Check:**
- FRONTEND_URL set correctly in Render
- GOOGLE_CALLBACK_URL matches Google Console exactly

**Fix:**
1. Update FRONTEND_URL to exact Vercel domain
2. Update Google OAuth app with correct callback URL
3. Wait 5 minutes for changes to propagate

### Issue: "CORS policy: request has been blocked"

**Check:**
- FRONTEND_URL matches frontend domain exactly
- Includes https://
- No trailing slash

**Fix:**
Update FRONTEND_URL on Render and redeploy

### Issue: "Database connection failed" or "Redis connection failed"

**Check:**
- DATABASE_URL exists in Environment tab
- REDIS_HOST/PORT/PASSWORD are set
- Add-ons show PostgreSQL and Redis active

**Fix:**
1. Verify add-ons are added (not just services)
2. Re-add add-ons if needed
3. Parse REDIS_URL components correctly

### Issue: "SMTP authentication failed"

**Check:**
- SMTP_HOST matches provider
- SMTP_USER and SMTP_PASSWORD are correct
- SMTP_FROM is verified sender in provider

**Fix:**
1. Test credentials with provider's tools first
2. Verify sender email is authenticated
3. Check provider's SMTP port (587 vs 465)

### Need More Help?

See documentation:
- `BACKEND_PRODUCTION_ENV_GUIDE.md` - Env var reference
- `RENDER_DEPLOYMENT_MATRIX.md` - Render-specific setup
- `PRODUCTION_SERVICE_VERIFICATION.md` - Service testing
- `SECURITY_CREDENTIALS_ROTATION.md` - Security issues

---

## Final Approval Checklist

Before declaring production ready:

- [ ] All checks in Phase 1-5 passed ✓
- [ ] No errors in Render logs
- [ ] OAuth login works end-to-end
- [ ] Email sends successfully
- [ ] Database and Redis connected
- [ ] Bull Board accessible
- [ ] Session persistence works
- [ ] CORS configured correctly
- [ ] All credentials rotated from development values
- [ ] .env file not in git repository

**Status:** ✅ READY FOR PRODUCTION

---

**Last Updated:** August 29, 2026
**For:** Render.com Production Deployment
**Deployment URLs:**
- Backend: https://outbox-email-scheduler-wl9y.onrender.com/
- Frontend: https://emailscheduler-3ja3rfexv-professional7.vercel.app/login
