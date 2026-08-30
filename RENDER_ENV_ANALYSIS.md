# Render Environment Variables - Complete Analysis & Fixes

## 🔴 CRITICAL ISSUES FOUND

Based on screenshot analysis of your Render dashboard, here are all issues:

---

## ❌ PROBLEM 1: FRONTEND_URL IS WRONG

**Current Value:** `http://localhost:5173`  
**Should Be:** `https://emailscheduler-3ja3rfexv-professional7.vercel.app`

**Impact:** OAuth redirects fail, CORS blocks requests

**Fix:**
1. Go to Render dashboard → Environment
2. Click on FRONTEND_URL row
3. Change to: `https://emailscheduler-3ja3rfexv-professional7.vercel.app`
4. Click Save

---

## ❌ PROBLEM 2: REDIS_HOST IS WRONG

**Current Value:** `localhost`  
**Should Be:** Get from Render Redis add-on details

**Impact:** Backend cannot connect to Redis cache/queue

**Fix:**
1. Go to Render dashboard → Add-ons tab
2. Click on Redis service
3. Copy the hostname (looks like: `redis-xxxx.render.internal`)
4. Update REDIS_HOST with this value
5. Click Save

---

## ⚠️ PROBLEM 3: GOOGLE_CALLBACK_URL IS WRONG

**Current Value:** (masked but appears to be development URL)  
**Should Be:** `https://outbox-email-scheduler-wl9y.onrender.com/api/auth/google/callback`

**Impact:** Google OAuth will reject requests with redirect_uri_mismatch error

**Fix:**
1. Go to Render dashboard → Environment
2. Find GOOGLE_CALLBACK_URL
3. Update to: `https://outbox-email-scheduler-wl9y.onrender.com/api/auth/google/callback`
4. Also update this URL in Google Cloud Console:
   - Go to https://console.cloud.google.com
   - APIs & Services → Credentials → Your OAuth app
   - Update authorized redirect URI
5. Click Save

---

## ⚠️ PROBLEM 4: SLACK_CALLBACK_URL IS WRONG

**Current Value:** `http://localhost:3000/api/integrations/slack/callback`  
**Should Be:** `https://outbox-email-scheduler-wl9y.onrender.com/api/integrations/slack/callback`

**Impact:** Slack integration won't work (but this is optional)

**Fix:**
1. Go to Render dashboard → Environment
2. Find SLACK_CALLBACK_URL
3. Update to: `https://outbox-email-scheduler-wl9y.onrender.com/api/integrations/slack/callback`
4. Also update in Slack app settings at https://api.slack.com/apps
5. Click Save

---

## ❓ PROBLEM 5: MISSING DATABASE_URL

**Current Value:** Not visible in screenshot  
**Should Be:** From PostgreSQL add-on

**What This Means:** Database connection string is missing

**Fix:**
1. Go to Render → Add-ons tab
2. Check if PostgreSQL is added
3. If YES: Copy DATABASE_URL from PostgreSQL add-on
4. If NO: Click "Create PostgreSQL" and wait 2 minutes
5. Add DATABASE_URL to Environment

---

## ✅ CORRECT VALUES (No Change Needed)

| Variable | Current Value | Status |
|----------|---------------|--------|
| NODE_ENV | development | ❌ Should be `production` |
| PORT | 3000 | ✅ Correct |
| ELASTICSEARCH_API_KEY | (shown) | ✅ OK if using Elasticsearch |
| ELASTICSEARCH_URL | (shown) | ✅ OK if using Elasticsearch |
| MAX_EMAILS_PER_HOUR_PER_SENDER | 100 | ✅ OK |
| MIN_EMAIL_DELAY_MS | 2000 | ✅ OK |
| SESSION_SECRET | super-secret... | ⚠️ Weak, but OK for now |
| SLACK_CLIENT_ID | mock_slack_id | ✅ OK |
| SLACK_CLIENT_SECRET | mock_slack_secret | ✅ OK |
| SLACK_TOKEN_ENCRYPTION_KEY | (64 char hex) | ✅ OK |
| SMTP_FROM | brionna.abbott48... | ⚠️ Still using test account |
| SMTP_HOST | smtp.ethereal.email | ❌ Should be production |
| SMTP_PASSWORD | Q5AY3X... | ❌ Test account password |
| SMTP_PORT | 587 | ✅ OK for STARTTLS |
| SMTP_USER | brionna.abbott48... | ❌ Test account |
| WORKER_CONCURRENCY | 5 | ✅ OK |

---

## 🔴 CRITICAL: NODE_ENV IS WRONG

**Current Value:** `development`  
**Should Be:** `production`

**Impact:** 
- Security cookies NOT secure
- Debug info exposed
- Server behaves in dev mode

**Fix:**
1. Go to Render → Environment
2. Click NODE_ENV
3. Change `development` → `production`
4. Click Save
5. Service will restart

---

## 🟠 HIGH PRIORITY: SMTP IS STILL ETHEREAL (TEST)

**Current Values:**
- SMTP_HOST = smtp.ethereal.email
- SMTP_USER = brionna.abbott48@ethereal.email
- SMTP_PASSWORD = Q5AY3X123HBtmNruTj
- SMTP_FROM = brionna.abbott48@ethereal.email

**Problem:** This is a test email service. Production emails won't be sent.

**Fix - Choose One:**

### Option A: Use SendGrid (Recommended - Free tier)
1. Go to https://sendgrid.com
2. Sign up (free: 100 emails/day)
3. Get API key from Settings → API Keys
4. Create verified sender at Settings → Sender Authentication
5. Update on Render:
   ```
   SMTP_HOST=smtp.sendgrid.net
   SMTP_PORT=587
   SMTP_USER=apikey
   SMTP_PASSWORD=SG.your-api-key-here
   SMTP_FROM=your-verified-email@domain.com
   ```

### Option B: Use AWS SES
1. Go to AWS SES console
2. Request production access
3. Verify sender email
4. Create SMTP credentials
5. Update on Render

### Option C: Use Mailgun
1. Go to https://mailgun.com
2. Create account
3. Get SMTP credentials
4. Update on Render

---

## EXACT STEPS TO FIX (IN ORDER)

### Step 1: Fix Critical Settings
```
NODE_ENV = production (change from development)
FRONTEND_URL = https://emailscheduler-3ja3rfexv-professional7.vercel.app
GOOGLE_CALLBACK_URL = https://outbox-email-scheduler-wl9y.onrender.com/api/auth/google/callback
SLACK_CALLBACK_URL = https://outbox-email-scheduler-wl9y.onrender.com/api/integrations/slack/callback
```

### Step 2: Fix Redis
1. Check Add-ons tab → Redis details
2. Copy hostname
3. Update REDIS_HOST with the hostname
4. Verify REDIS_PORT = 6379
5. Copy password and update REDIS_PASSWORD

### Step 3: Verify Database
1. Check Add-ons tab → PostgreSQL exists
2. If not: Create PostgreSQL add-on
3. Copy DATABASE_URL
4. Add to Environment (if not there)

### Step 4: Fix SMTP (Choose One Email Service)
- SendGrid (recommended)
- AWS SES
- Mailgun

### Step 5: Save & Test
1. Click Save Changes
2. Wait 2-3 minutes for redeploy
3. Test: `curl https://outbox-email-scheduler-wl9y.onrender.com/health`

---

## WHAT EACH VARIABLE DOES

| Variable | Purpose |
|----------|---------|
| NODE_ENV | Environment (dev/production) - MUST be production |
| PORT | Server port (Render uses 3000) |
| DATABASE_URL | PostgreSQL connection string |
| REDIS_HOST | Redis hostname (NOT localhost!) |
| REDIS_PORT | Redis port (usually 6379) |
| REDIS_PASSWORD | Redis authentication |
| FRONTEND_URL | Frontend domain for OAuth redirects & CORS |
| GOOGLE_CLIENT_ID | Google OAuth app ID |
| GOOGLE_CLIENT_SECRET | Google OAuth secret |
| GOOGLE_CALLBACK_URL | Where Google redirects after login |
| SESSION_SECRET | Express session encryption |
| SLACK_* | Slack bot credentials (or mock) |
| SMTP_* | Email sending service credentials |
| WORKER_CONCURRENCY | Number of concurrent emails |
| MIN_EMAIL_DELAY_MS | Delay between emails |
| MAX_EMAILS_PER_HOUR_PER_SENDER | Hourly email limit |
| ELASTICSEARCH_* | Email search (optional) |

---

## PRIORITY LIST (DO IN THIS ORDER)

🔴 **CRITICAL - Do First:**
1. ✅ NODE_ENV = `production` (currently `development`)
2. ✅ FRONTEND_URL = `https://emailscheduler-3ja3rfexv-professional7.vercel.app`
3. ✅ REDIS_HOST = (from Redis add-on)
4. ✅ DATABASE_URL = (from PostgreSQL add-on)

🟠 **HIGH PRIORITY - Do Next:**
5. ✅ GOOGLE_CALLBACK_URL = production URL
6. ✅ SMTP credentials = production email service

🟡 **MEDIUM PRIORITY - Do After:**
7. ✅ SLACK_CALLBACK_URL = production URL
8. ✅ SESSION_SECRET = generate new one

🟢 **LOW PRIORITY - Optional:**
9. Elasticsearch configuration
10. Slack configuration (optional)

---

## AFTER ALL FIXES - TEST

```bash
# 1. Health check
curl https://outbox-email-scheduler-wl9y.onrender.com/health
# Expected: {"status":"ok","environment":"production"}

# 2. Go to frontend login
https://emailscheduler-3ja3rfexv-professional7.vercel.app/login

# 3. Click "Continue with Google"
# Should see Google login form (not error)

# 4. After login, dashboard should load
# This proves DB & OAuth work

# 5. Try sending an email
# Dashboard → Compose New Email
# Check Bull Board: https://outbox-email-scheduler-wl9y.onrender.com/admin/queues
```

---

## SUMMARY

**Backend Status:** 🔴 Not working because environment variables are wrong

**Root Causes:**
1. NODE_ENV still set to development
2. FRONTEND_URL pointing to localhost
3. REDIS_HOST pointing to localhost
4. Callback URLs pointing to localhost
5. SMTP still using test service

**Time to Fix:** 15-20 minutes

**Result After Fix:** Backend will be fully operational ✅

---

Generated: August 30, 2026
