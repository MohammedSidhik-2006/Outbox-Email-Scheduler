# Quick Fix Checklist - 15 Minutes to Production

## 🔴 DO THIS NOW - CRITICAL FIXES

Go to: https://dashboard.render.com → Your Service → Environment Tab

### Fix 1: NODE_ENV (1 minute)
- [ ] Click on `NODE_ENV` row
- [ ] Change value from `development` to `production`
- [ ] Click checkmark to save

### Fix 2: FRONTEND_URL (1 minute)
- [ ] Click on `FRONTEND_URL` row
- [ ] Change value to: `https://emailscheduler-3ja3rfexv-professional7.vercel.app`
- [ ] Click checkmark to save

### Fix 3: GOOGLE_CALLBACK_URL (1 minute)
- [ ] Click on `GOOGLE_CALLBACK_URL` row
- [ ] Change value to: `https://outbox-email-scheduler-wl9y.onrender.com/api/auth/google/callback`
- [ ] Click checkmark to save

### Fix 4: SLACK_CALLBACK_URL (1 minute)
- [ ] Click on `SLACK_CALLBACK_URL` row
- [ ] Change value to: `https://outbox-email-scheduler-wl9y.onrender.com/api/integrations/slack/callback`
- [ ] Click checkmark to save

---

## 🔴 FIX DATABASE & REDIS (Check Add-ons)

### Fix 5: Check Redis (2 minutes)
- [ ] Go to: Dashboard → Add-ons tab
- [ ] Click on "Redis" service
- [ ] Copy the connection URL or hostname
- [ ] Go back to Environment tab
- [ ] Update `REDIS_HOST` with the hostname (e.g., `redis-abc123.render.internal`)
- [ ] Verify `REDIS_PORT` is `6379`
- [ ] Update `REDIS_PASSWORD` if needed
- [ ] Click Save Changes

### Fix 6: Verify PostgreSQL (2 minutes)
- [ ] Go to: Dashboard → Add-ons tab
- [ ] Check if PostgreSQL exists
- [ ] If YES: Copy the connection URL and set `DATABASE_URL` in Environment
- [ ] If NO: Click "Create PostgreSQL" and wait 2 minutes, then copy URL

---

## 🟠 FIX EMAIL SERVICE (Choose One - 5 minutes)

### Option A: SendGrid (Recommended)
- [ ] Go to https://sendgrid.com
- [ ] Sign up or login
- [ ] Get API key: Settings → API Keys → Create API Key
- [ ] Verify sender: Settings → Sender Authentication → Verify Email
- [ ] Go back to Render Environment tab
- [ ] Update:
  ```
  SMTP_HOST = smtp.sendgrid.net
  SMTP_PORT = 587
  SMTP_USER = apikey
  SMTP_PASSWORD = SG.your-sendgrid-api-key-here
  SMTP_FROM = your-verified-email@example.com
  ```
- [ ] Click Save Changes

### Option B: AWS SES
- [ ] Go to AWS SES console
- [ ] Request production access
- [ ] Verify sender email
- [ ] Create SMTP credentials
- [ ] Update in Render Environment tab

### Option C: Mailgun
- [ ] Go to https://mailgun.com
- [ ] Create account
- [ ] Get SMTP credentials
- [ ] Update in Render Environment tab

---

## ✅ FINAL STEP: Save All Changes

- [ ] Scroll to top/bottom of Environment tab
- [ ] Click **"Save Changes"** button (large button)
- [ ] Wait 2-3 minutes for automatic redeploy

---

## 🧪 TEST EVERYTHING (5 minutes)

### Test 1: Health Check
```bash
curl https://outbox-email-scheduler-wl9y.onrender.com/health
```
Expected response:
```json
{"status":"ok","environment":"production"}
```

### Test 2: OAuth Login
1. Go to: https://emailscheduler-3ja3rfexv-professional7.vercel.app/login
2. Click "Continue with Google"
3. Should see Google login form (NOT error page)
4. Complete login
5. Should see Dashboard

### Test 3: Bull Board (Queue)
1. Go to: https://outbox-email-scheduler-wl9y.onrender.com/admin/queues
2. Should see queue dashboard with stats
3. Should NOT see connection errors

### Test 4: Send Test Email
1. Go to Dashboard (after login)
2. Click "Compose New Email"
3. Fill in: To, Subject, Body
4. Click "Schedule Campaign" for now (or future time)
5. Check Bull Board - should see job appear
6. Wait for it to complete

---

## ❓ IF SOMETHING GOES WRONG

### Issue: "Invalid state parameter"
**Solution:** Check FRONTEND_URL - should be exact Vercel domain

### Issue: "redirect_uri_mismatch"
**Solution:** Check GOOGLE_CALLBACK_URL - update Google Cloud Console too

### Issue: "Cannot connect to Redis"
**Solution:** Check REDIS_HOST - should be from Render Redis add-on (not localhost)

### Issue: "Cannot connect to database"
**Solution:** Check DATABASE_URL - should be from Render PostgreSQL add-on (not localhost)

### Issue: "SMTP authentication failed"
**Solution:** Check SMTP credentials - verify with SendGrid/SES/Mailgun account

---

## COPY-PASTE VALUES (If needed)

```
NODE_ENV = production

FRONTEND_URL = https://emailscheduler-3ja3rfexv-professional7.vercel.app

GOOGLE_CALLBACK_URL = https://outbox-email-scheduler-wl9y.onrender.com/api/auth/google/callback

SLACK_CALLBACK_URL = https://outbox-email-scheduler-wl9y.onrender.com/api/integrations/slack/callback

SMTP_HOST = smtp.sendgrid.net

SMTP_PORT = 587

SMTP_USER = apikey

SMTP_FROM = your-email@example.com
```

---

## ⏱️ ESTIMATED TIME: 15-20 MINUTES

✅ After these fixes, your backend will be:
- Running on production
- Connected to database
- Connected to Redis
- Sending emails
- Processing OAuth
- All working! 🎉

---

**Last Updated:** August 30, 2026  
**Status:** Ready to fix
