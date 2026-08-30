# WHAT TO DO NOW - Complete Action Plan

## 📋 Current Situation

Your backend is deployed on Render at: https://outbox-email-scheduler-wl9y.onrender.com/

But it's **NOT WORKING** because environment variables are misconfigured.

---

## 🚨 WHAT'S WRONG (Summary of Issues)

| Issue | Current | Should Be | Impact |
|-------|---------|-----------|--------|
| NODE_ENV | `development` | `production` | ❌ Server not in production mode |
| FRONTEND_URL | `localhost:5173` | `https://emailscheduler-...` | ❌ OAuth redirects fail |
| REDIS_HOST | `localhost` | `redis-xxx.render.internal` | ❌ Cannot connect to cache |
| SMTP Service | Ethereal (test) | SendGrid/SES/Mailgun | ❌ Emails won't send |
| GOOGLE_CALLBACK_URL | `localhost` | Production URL | ❌ Google OAuth fails |
| SLACK_CALLBACK_URL | `localhost` | Production URL | ⚠️ Slack won't work |
| DATABASE | PostgreSQL add-on exists | Verified connected | ✓ Should be OK |

---

## ✅ WHAT YOU NEED TO DO

### STEP 1: Read the Analysis (5 minutes)
📄 **File:** `RENDER_ENV_ANALYSIS.md`
- Explains each variable
- Shows what's wrong
- Shows how to fix each one

### STEP 2: Follow the Checklist (15 minutes)
📋 **File:** `QUICK_FIX_CHECKLIST.md`
- Checkbox for each fix
- Copy-paste values
- Test commands

### STEP 3: Execute Fixes on Render Dashboard (15 minutes)

**Go to:** https://dashboard.render.com → Environment Tab

**Change These (CRITICAL):**
1. `NODE_ENV` = `production`
2. `FRONTEND_URL` = `https://emailscheduler-3ja3rfexv-professional7.vercel.app`
3. `GOOGLE_CALLBACK_URL` = `https://outbox-email-scheduler-wl9y.onrender.com/api/auth/google/callback`
4. `SLACK_CALLBACK_URL` = `https://outbox-email-scheduler-wl9y.onrender.com/api/integrations/slack/callback`
5. `REDIS_HOST` = (copy from Redis add-on)
6. `SMTP_*` = (set up SendGrid or similar)

**Click:** "Save Changes" button

**Wait:** 2-3 minutes for automatic redeploy

### STEP 4: Test (5 minutes)

```bash
# Test 1: Health check
curl https://outbox-email-scheduler-wl9y.onrender.com/health

# Expected: {"status":"ok","environment":"production"}
```

Then:
- Go to frontend login
- Click "Continue with Google"
- Try sending an email

---

## 📊 PRIORITY ORDER

### 🔴 CRITICAL (Do First - These Break Everything)
1. NODE_ENV = `production`
2. FRONTEND_URL = correct Vercel domain
3. REDIS_HOST = from Redis add-on (not localhost)
4. DATABASE_URL = from PostgreSQL add-on (verify it exists)

### 🟠 HIGH PRIORITY (Do Next - OAuth Won't Work Without These)
5. GOOGLE_CALLBACK_URL = production URL
6. GOOGLE_CLIENT_ID/SECRET = verify they're set
7. SMTP configuration = use SendGrid or similar

### 🟡 MEDIUM PRIORITY (Do After - Optional but Nice to Have)
8. SLACK_CALLBACK_URL = production URL
9. SESSION_SECRET = strong random value

### 🟢 LOW PRIORITY (Optional)
10. Elasticsearch setup (if using search)
11. Slack integration (if using notifications)

---

## ⚡ FASTEST PATH (10 MINUTES)

If you just want to get it working ASAP:

1. **Open Render Dashboard Environment**
   - Change NODE_ENV to `production`
   - Change FRONTEND_URL to Vercel domain
   - Change GOOGLE_CALLBACK_URL to production URL
   - Check REDIS_HOST is not localhost
   - Verify DATABASE_URL exists

2. **Fix SMTP (Choose One)**
   - SendGrid: 2 minutes to get API key
   - AWS SES: 5 minutes to verify sender
   - Mailgun: 3 minutes to get credentials

3. **Click Save & Wait**
   - Render auto-restarts
   - 2-3 minutes

4. **Test**
   - Check health endpoint
   - Try OAuth login

---

## 📚 DETAILED GUIDES AVAILABLE

| File | Purpose | Read When |
|------|---------|-----------|
| RENDER_ENV_ANALYSIS.md | Complete analysis of each variable | Before making changes |
| QUICK_FIX_CHECKLIST.md | Step-by-step checkbox guide | While making changes |
| DEPLOYMENT_STATUS.md | Overview & quick reference | Anytime |
| README.md | Project documentation | For understanding architecture |

---

## 🆘 IF YOU GET STUCK

### Problem: "Cannot connect to Redis"
**Check:** REDIS_HOST in Environment
- Go to Add-ons tab
- Click Redis service
- Copy hostname (not localhost!)

### Problem: "Cannot connect to database"
**Check:** DATABASE_URL in Environment
- Go to Add-ons tab
- Check PostgreSQL exists
- Copy connection string

### Problem: "OAuth redirect_uri_mismatch"
**Check Two Places:**
1. Render: GOOGLE_CALLBACK_URL
2. Google Console: Authorized redirect URIs

Must match exactly!

### Problem: "CORS error from frontend"
**Check:** FRONTEND_URL
- Must be exact Vercel domain
- Must include https://
- No trailing slash

### Problem: "SMTP authentication failed"
**Check:** SMTP credentials with provider
- Login to SendGrid/SES/Mailgun
- Verify sender is verified
- Copy API key/password exactly

---

## ✔️ SUCCESS CRITERIA

After fixes, you should have:

- ✅ Backend responding at health endpoint
- ✅ Frontend can login with Google
- ✅ Dashboard loads after login
- ✅ Can compose and send emails
- ✅ Bull Board shows job queue
- ✅ Render logs show no errors
- ✅ All OAuth redirects work
- ✅ Database stores data
- ✅ Redis caches sessions

---

## 🎯 YOUR NEXT ACTION

**Right Now:**
1. Open `QUICK_FIX_CHECKLIST.md`
2. Go to Render dashboard
3. Follow checklist item by item
4. Check boxes as you complete each one
5. Click "Save Changes"
6. Wait & test

**Expected Time:** 15-20 minutes

**Result:** Fully working production backend ✅

---

## 📞 REFERENCE

**Production URLs:**
- Backend: https://outbox-email-scheduler-wl9y.onrender.com/
- Frontend: https://emailscheduler-3ja3rfexv-professional7.vercel.app/login

**Test After Fixes:**
- Health: https://outbox-email-scheduler-wl9y.onrender.com/health
- Queue: https://outbox-email-scheduler-wl9y.onrender.com/admin/queues

---

**Status:** 🔴 Needs Immediate Action  
**Difficulty:** Easy (just copy-paste values)  
**Time:** 15 minutes  
**Result:** Production ready ✅

Start with `QUICK_FIX_CHECKLIST.md` now!
