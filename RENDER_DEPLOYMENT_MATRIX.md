# Render Deployment Environment Matrix

## Quick Reference: What Goes Where

### Legend
- 🟢 **Render Auto-Assigns** - Don't set manually, Render creates these
- 🔵 **Set in Render Dashboard** - Manually enter in Environment tab
- 🟡 **Set via Add-on** - Automatically created when you add service
- 🟣 **Generate First** - Generate locally, then paste into Render

---

## Complete Environment Variables Matrix

| Variable | Type | Auto/Manual | Source | Notes |
|----------|------|-------------|--------|-------|
| **NODE_ENV** | String | 🔵 Set | You | Must be `production` for security |
| **PORT** | Integer | 🟢 Auto | Render | Ignore this - Render assigns dynamically |
| **DATABASE_URL** | URL | 🟡 Add-on | PostgreSQL Add-on | Click "Add PostgreSQL" in Render, it auto-populates |
| **REDIS_HOST** | String | 🟡 Add-on | Redis Add-on | Parse from REDIS_URL or set manually from Upstash |
| **REDIS_PORT** | Integer | 🟡 Add-on | Redis Add-on | From Redis service (usually 6379) |
| **REDIS_PASSWORD** | String | 🟡 Add-on | Redis Add-on | From Redis service authentication |
| **FRONTEND_URL** | URL | 🔵 Set | You | Your Vercel frontend: `https://emailscheduler-3ja3rfexv-professional7.vercel.app` |
| **GOOGLE_CLIENT_ID** | String | 🔵 Set | Google | Create OAuth app in Google Console |
| **GOOGLE_CLIENT_SECRET** | String | 🔵 Set | Google | 🚨 SENSITIVE - Never share |
| **GOOGLE_CALLBACK_URL** | URL | 🔵 Set | You | Must match Google Console: `https://outbox-email-scheduler-wl9y.onrender.com/api/auth/google/callback` |
| **SESSION_SECRET** | String | 🟣 Generate | You | Create with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| **SLACK_CLIENT_ID** | String | 🔵 Set | Slack or Mock | Real Slack app ID or `mock_slack_id` if not using |
| **SLACK_CLIENT_SECRET** | String | 🔵 Set | Slack or Mock | Real Slack secret or `mock_slack_secret` if not using |
| **SLACK_CALLBACK_URL** | URL | 🔵 Set | You | `https://outbox-email-scheduler-wl9y.onrender.com/api/integrations/slack/callback` |
| **SLACK_TOKEN_ENCRYPTION_KEY** | String | 🟣 Generate | You | Create with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| **SMTP_HOST** | String | 🔵 Set | Mail Provider | SendGrid, AWS SES, Mailgun, etc. |
| **SMTP_PORT** | Integer | 🔵 Set | Mail Provider | Usually 587 or 465 |
| **SMTP_USER** | String | 🔵 Set | Mail Provider | Authentication username |
| **SMTP_PASSWORD** | String | 🔵 Set | Mail Provider | 🚨 SENSITIVE - Authentication password |
| **SMTP_FROM** | Email | 🔵 Set | You | Verified sender email in mail provider |
| **WORKER_CONCURRENCY** | Integer | 🔵 Set | You | Default: `5` (tune for your load) |
| **MIN_EMAIL_DELAY_MS** | Integer | 🔵 Set | You | Default: `0` (no delay) |
| **MAX_EMAILS_PER_HOUR_PER_SENDER** | Integer | 🔵 Set | You | Default: `1000` (adjust for SMTP limits) |
| **ELASTICSEARCH_URL** | URL | 🔵 Set | Optional | Leave blank to disable search features |
| **ELASTICSEARCH_API_KEY** | String | 🔵 Set | Optional | Leave blank to disable search features |

---

## Render Dashboard Setup Instructions

### Step 1: Add PostgreSQL Add-on (Creates DATABASE_URL)

1. Go to: https://dashboard.render.com
2. Click your backend service
3. Click **"Add-ons"** tab (or scroll to Resources section)
4. Click **"Create New" → "PostgreSQL"**
5. Name: `email-scheduler-db`
6. PostgreSQL Version: Latest
7. Click **"Create PostgreSQL"**
8. **Automatically adds to Environment:**
   ```
   DATABASE_URL=postgresql://user:password@hostname.render.internal:5432/email_scheduler
   ```

✅ **Done** - Render auto-sets DATABASE_URL

---

### Step 2: Add Redis Add-on (Creates REDIS_* variables)

1. Same **"Add-ons"** tab
2. Click **"Create New" → "Redis"**
3. Name: `email-scheduler-redis`
4. Click **"Create Redis"**
5. **Automatically adds to Environment:**
   ```
   REDIS_URL=redis://:password@hostname.render.internal:6379
   ```

**Note:** Backend expects separate `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`

**Option A - Parse REDIS_URL (recommended for simplicity):**
- If Render gives: `redis://:mypassword@redis-hostname:6379`
- Manually add to Environment:
  ```
  REDIS_HOST=redis-hostname
  REDIS_PORT=6379
  REDIS_PASSWORD=mypassword
  ```

**Option B - Use External Redis (Upstash.com):**
- Create free account at https://upstash.com
- Create Redis database
- Get connection URL
- Parse into REDIS_HOST, REDIS_PORT, REDIS_PASSWORD

✅ **Done** - Render auto-sets REDIS_URL, you manually add REDIS_HOST/PORT/PASSWORD

---

### Step 3: Manually Set All Other Environment Variables

1. Go to **"Environment"** tab in Render dashboard
2. Click **"Add Environment Variable"** for each one below
3. Enter exactly as shown (replace `YOUR_VALUE_HERE` with actual value)

#### Copy-Paste Block 1: Core Configuration

```
NODE_ENV
production

FRONTEND_URL
https://emailscheduler-3ja3rfexv-professional7.vercel.app
```

#### Copy-Paste Block 2: Google OAuth

```
GOOGLE_CLIENT_ID
YOUR_VALUE_HERE

GOOGLE_CLIENT_SECRET
YOUR_VALUE_HERE

GOOGLE_CALLBACK_URL
https://outbox-email-scheduler-wl9y.onrender.com/api/auth/google/callback
```

#### Copy-Paste Block 3: Session & Encryption

```
SESSION_SECRET
YOUR_VALUE_HERE

SLACK_TOKEN_ENCRYPTION_KEY
YOUR_VALUE_HERE
```

#### Copy-Paste Block 4: Slack Integration (Or use mock values)

```
SLACK_CLIENT_ID
YOUR_VALUE_HERE

SLACK_CLIENT_SECRET
YOUR_VALUE_HERE

SLACK_CALLBACK_URL
https://outbox-email-scheduler-wl9y.onrender.com/api/integrations/slack/callback
```

#### Copy-Paste Block 5: Email Service (SendGrid Example)

```
SMTP_HOST
smtp.sendgrid.net

SMTP_PORT
587

SMTP_USER
apikey

SMTP_PASSWORD
YOUR_VALUE_HERE

SMTP_FROM
noreply@yourdomain.com
```

#### Copy-Paste Block 6: Performance Tuning (Optional)

```
WORKER_CONCURRENCY
5

MIN_EMAIL_DELAY_MS
0

MAX_EMAILS_PER_HOUR_PER_SENDER
1000
```

#### Copy-Paste Block 7: Elasticsearch (Optional - Leave blank if not using)

```
ELASTICSEARCH_URL
YOUR_VALUE_HERE

ELASTICSEARCH_API_KEY
YOUR_VALUE_HERE
```

---

## Before You Start: Generate Secrets Locally

Run these commands in your terminal and save the output:

```bash
# Generate SESSION_SECRET (64-char hex)
node -e "console.log('SESSION_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"

# Generate SLACK_TOKEN_ENCRYPTION_KEY (64-char hex)
node -e "console.log('SLACK_TOKEN_ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('hex'))"
```

**Example Output:**
```
SESSION_SECRET=a1b2c3d4e5f6789012345678901234567890123456789012345678901234
SLACK_TOKEN_ENCRYPTION_KEY=b1c2d3e4f5a6789012345678901234567890123456789012345678901234
```

Keep these values safe - you'll paste them into Render dashboard.

---

## Get Production Credentials

### Google OAuth Credentials

1. Go to: https://console.cloud.google.com
2. Create new project or select existing
3. Go to **"APIs & Services" → "Credentials"**
4. Click **"Create Credentials" → "OAuth 2.0 Client ID"**
5. Select **"Web application"**
6. Under "Authorized redirect URIs", add:
   ```
   https://outbox-email-scheduler-wl9y.onrender.com/api/auth/google/callback
   ```
7. Click **"Create"**
8. Copy the **Client ID** and **Client Secret**
9. Set on Render:
   - `GOOGLE_CLIENT_ID` = Client ID
   - `GOOGLE_CLIENT_SECRET` = Client Secret

### SendGrid Email Credentials (Recommended)

1. Go to: https://sendgrid.com
2. Sign up (free tier: 100 emails/day)
3. Go to **"Settings" → "API Keys"**
4. Click **"Create API Key"**
5. Copy the API key
6. Go to **"Settings" → "Sender Authentication"**
7. Verify your sender email address
8. Set on Render:
   - `SMTP_HOST` = `smtp.sendgrid.net`
   - `SMTP_PORT` = `587`
   - `SMTP_USER` = `apikey`
   - `SMTP_PASSWORD` = Your API key
   - `SMTP_FROM` = Your verified sender email

### Slack Integration Credentials (Optional)

1. Go to: https://api.slack.com/apps
2. Click **"Create New App" → "From scratch"**
3. App name: "Email Scheduler Bot"
4. Select development workspace
5. Go to **"OAuth & Permissions"**
6. Add redirect URL: `https://outbox-email-scheduler-wl9y.onrender.com/api/integrations/slack/callback`
7. Add scopes: `chat:write`
8. Go to **"Basic Information"**
9. Copy **Client ID** and **Client Secret**
10. Set on Render:
    - `SLACK_CLIENT_ID` = Client ID
    - `SLACK_CLIENT_SECRET` = Client Secret

**If not using Slack**, set these mock values:
```
SLACK_CLIENT_ID=mock_slack_id
SLACK_CLIENT_SECRET=mock_slack_secret
```

---

## Verification Checklist After Deployment

After you've set all environment variables on Render and clicked "Save Changes":

### ✅ Check 1: Backend is Running
```bash
curl https://outbox-email-scheduler-wl9y.onrender.com/health
```
Expected response:
```json
{"status":"ok","environment":"production"}
```

### ✅ Check 2: Google OAuth Works
1. Go to: https://emailscheduler-3ja3rfexv-professional7.vercel.app/login
2. Click **"Continue with Google"**
3. You should see Google login (NOT an error)
4. After login, you should see the dashboard

### ✅ Check 3: Database Connected
1. Login successfully (proves database connection works)
2. Your user data is saved

### ✅ Check 4: Redis & Job Queue Connected
1. Go to: https://outbox-email-scheduler-wl9y.onrender.com/admin/queues
2. You should see Bull Board dashboard with queue stats

### ✅ Check 5: SMTP Email Works
1. From dashboard, create and send a test email
2. Go to Render service logs
3. Look for: `"event":"EMAIL_SENT"` or similar success message
4. Check your SMTP provider (SendGrid/SES/etc) inbox to verify delivery

### ✅ Check 6: Render Logs Show No Errors
1. Go to Render dashboard → **"Logs"** tab
2. Look for startup messages:
   - ✅ "Server listening on port 3000"
   - ✅ "PostgreSQL connected"
   - ✅ "Redis connected"
   - ❌ NO "ERROR" messages

---

## Environment Variable Dependency Graph

```
┌─────────────────────────────────────────┐
│   Render Auto-Assigns These             │
├─────────────────────────────────────────┤
│ PORT (dynamic)                          │
│ DATABASE_URL (PostgreSQL add-on)        │
│ REDIS_URL (Redis add-on)                │
└─────────────────────────────────────────┘
           ↓
        (Parse into)
           ↓
┌─────────────────────────────────────────┐
│   You Set These in Render Dashboard     │
├─────────────────────────────────────────┤
│ NODE_ENV = production                   │
│ FRONTEND_URL = Vercel domain            │
│ REDIS_HOST, REDIS_PORT, REDIS_PASSWORD │
│ GOOGLE_CLIENT_ID, SECRET                │
│ SESSION_SECRET (generated)              │
│ SLACK_CLIENT_ID, SECRET                 │
│ SLACK_TOKEN_ENCRYPTION_KEY (generated)  │
│ SMTP_HOST, PORT, USER, PASSWORD         │
│ SMTP_FROM = Your email                  │
│ WORKER_CONCURRENCY                      │
└─────────────────────────────────────────┘
           ↓
      (Backend reads)
           ↓
┌─────────────────────────────────────────┐
│   Backend Uses For                      │
├─────────────────────────────────────────┤
│ ✅ Security (secure cookies)            │
│ ✅ Database (Prisma)                    │
│ ✅ Job queue (BullMQ + Redis)           │
│ ✅ Email (SMTP)                         │
│ ✅ Authentication (OAuth)               │
│ ✅ Session store (Redis)                │
│ ✅ Notifications (Slack)                │
└─────────────────────────────────────────┘
```

---

## Common Issues & Solutions

### Problem: "DATABASE_URL not set"

**Cause:** PostgreSQL add-on not added to Render service

**Solution:**
1. Go to Render → Your service → "Add-ons"
2. Click "Create PostgreSQL"
3. Wait 1-2 minutes for provisioning
4. Refresh browser
5. DATABASE_URL should appear in Environment tab

### Problem: "CORS policy: request has been blocked"

**Cause:** FRONTEND_URL doesn't match your Vercel domain

**Solution:**
1. Check your Vercel domain: https://vercel.com → Your project
2. On Render dashboard, update:
   ```
   FRONTEND_URL=https://your-exact-vercel-domain.vercel.app
   ```
3. Click "Save Changes"
4. Wait 1 minute for redeploy

### Problem: "Invalid state parameter. Session may have expired."

**Cause:** FRONTEND_URL is still localhost

**Solution:** Same as above - update FRONTEND_URL to production domain

### Problem: "Error: SMTP authentication failed"

**Cause:** Wrong SMTP credentials

**Solution:**
1. Verify credentials with your email provider
2. Test locally first by updating `.env` and running `npm run dev`
3. If it works locally, copy same values to Render
4. Check SMTP_FROM matches verified sender in provider

### Problem: "Google callback error: redirect_uri_mismatch"

**Cause:** GOOGLE_CALLBACK_URL doesn't match Google Console redirect URI

**Solution:**
1. Go to Google Cloud Console
2. Find your OAuth app in Credentials
3. Edit and verify redirect URI is exactly:
   ```
   https://outbox-email-scheduler-wl9y.onrender.com/api/auth/google/callback
   ```
4. Check Render GOOGLE_CALLBACK_URL matches exactly

---

## Quick Setup Checklists

### Before Starting
- [ ] Generate SESSION_SECRET and SLACK_TOKEN_ENCRYPTION_KEY locally
- [ ] Have SendGrid account with API key ready
- [ ] Have Google OAuth credentials ready
- [ ] Have Vercel frontend URL copied
- [ ] (Optional) Have Slack app created if using Slack

### Render Dashboard Setup
- [ ] Add PostgreSQL add-on
- [ ] Add Redis add-on
- [ ] Set NODE_ENV = production
- [ ] Set FRONTEND_URL
- [ ] Set REDIS_HOST, REDIS_PORT, REDIS_PASSWORD
- [ ] Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
- [ ] Set SESSION_SECRET
- [ ] Set SLACK_CLIENT_ID, SLACK_CLIENT_SECRET
- [ ] Set SLACK_TOKEN_ENCRYPTION_KEY
- [ ] Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM
- [ ] Set WORKER_CONCURRENCY, MIN_EMAIL_DELAY_MS, MAX_EMAILS_PER_HOUR_PER_SENDER
- [ ] Click "Save Changes"

### After Deployment
- [ ] curl health endpoint
- [ ] Test Google OAuth login
- [ ] Send test email
- [ ] Check Render logs for errors
- [ ] Verify Bull Board accessible

---

**Last Updated:** August 29, 2026  
**For:** Render.com Deployment
