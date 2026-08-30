# Deployment Status

## Production URLs
- **Backend API:** https://outbox-email-scheduler-wl9y.onrender.com/
- **Frontend App:** https://emailscheduler-3ja3rfexv-professional7.vercel.app/login

## Current Status
🟡 **Backend Service Deployed but Not Responding**

The Render service is deployed but appears to be failing to start or respond to health checks.

## Likely Cause
The backend requires environment variables to be set in the Render dashboard. Without them, the service crashes at startup.

## Required Environment Variables on Render Dashboard

To make the backend work, go to Render dashboard → Your Service → Environment tab and set:

```
NODE_ENV=production
PORT=3000
DATABASE_URL=<from PostgreSQL add-on>
REDIS_HOST=<from Redis add-on>
REDIS_PORT=6379
REDIS_PASSWORD=<from Redis add-on>
FRONTEND_URL=https://emailscheduler-3ja3rfexv-professional7.vercel.app
GOOGLE_CLIENT_ID=<your Google OAuth ID>
GOOGLE_CLIENT_SECRET=<your Google OAuth secret>
GOOGLE_CALLBACK_URL=https://outbox-email-scheduler-wl9y.onrender.com/api/auth/google/callback
SESSION_SECRET=<64-char random hex>
SLACK_CLIENT_ID=mock_slack_id
SLACK_CLIENT_SECRET=mock_slack_secret
SLACK_CALLBACK_URL=https://outbox-email-scheduler-wl9y.onrender.com/api/integrations/slack/callback
SLACK_TOKEN_ENCRYPTION_KEY=<64-char random hex>
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=<SendGrid API key>
SMTP_FROM=<your verified email>
```

## Quick Fix Steps

1. **Go to Render Dashboard:** https://dashboard.render.com
2. **Select Backend Service:** outbox-email-scheduler-wl9y
3. **Click Environment Tab**
4. **Add All Variables Above**
5. **Click Save Changes** (automatic redeploy)
6. **Wait 2-3 minutes**
7. **Test:** `curl https://outbox-email-scheduler-wl9y.onrender.com/health`

## Expected Response After Fix
```json
{"status":"ok","environment":"production"}
```

## Troubleshooting

**If still not working:**
1. Check Render Logs: Dashboard → Logs tab
2. Look for error messages about missing env vars
3. Verify DATABASE_URL and REDIS_* are from add-ons (not localhost)
4. Make sure you saved changes on Render dashboard

## Local Development

To test locally:
1. Create `.env` file with development values
2. Run: `npm run dev` in backend folder
3. Should start on http://localhost:3000
