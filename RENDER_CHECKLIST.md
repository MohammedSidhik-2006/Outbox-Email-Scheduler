# Render Deployment Checklist

## Pre-Deployment Verification ✅

- [x] Project analyzed from existing files
- [x] No code changes required
- [x] No new files needed (documentation only)
- [x] Build command verified: `npm install && npm run build`
- [x] Start command verified: `npm start`
- [x] Root directory correct: `./backend`
- [x] Server listens on PORT environment variable
- [x] CORS properly configured
- [x] Database connection via DATABASE_URL
- [x] Environment variables centralized in config/env.ts
- [x] Prisma schema ready for migrations
- [x] All secrets in environment variables (not hardcoded)
- [x] Graceful shutdown handling implemented

---

## Render Dashboard Setup Checklist

### Step 1: Repository Connection
- [ ] Go to https://dashboard.render.com/web/new
- [ ] Login with GitHub
- [ ] Select repository: `Outbox-Email-Scheduler`
- [ ] Branch: `main`
- [ ] Click "Connect"

### Step 2: Service Configuration
- [ ] Service Name: `email-scheduler-backend`
- [ ] Environment: `Node`
- [ ] Build Command: `npm install && npm run build`
- [ ] Start Command: `npm start`
- [ ] Node Version: `18`
- [ ] Root Directory: `./backend`

### Step 3: Environment Variables (25 required)

#### Core
- [ ] NODE_ENV = `production`
- [ ] PORT = (leave empty, Render assigns)

#### Database
- [ ] DATABASE_URL = `postgresql://user:pass@host:port/db?schema=public`

#### Redis
- [ ] REDIS_HOST = (your Redis host)
- [ ] REDIS_PORT = `6379`
- [ ] REDIS_PASSWORD = (your Redis password)

#### SMTP
- [ ] SMTP_HOST = `smtp.ethereal.email` (or your provider)
- [ ] SMTP_PORT = `587`
- [ ] SMTP_USER = (your SMTP username)
- [ ] SMTP_PASSWORD = (your SMTP password)
- [ ] SMTP_FROM = (your sender email)

#### Google OAuth
- [ ] GOOGLE_CLIENT_ID = (from Google Cloud)
- [ ] GOOGLE_CLIENT_SECRET = (from Google Cloud)
- [ ] GOOGLE_CALLBACK_URL = (will be filled after deployment)

#### Slack Integration
- [ ] SLACK_CLIENT_ID = (from Slack app)
- [ ] SLACK_CLIENT_SECRET = (from Slack app)
- [ ] SLACK_CALLBACK_URL = (will be filled after deployment)
- [ ] SLACK_TOKEN_ENCRYPTION_KEY = (64-char hex string)

#### Frontend
- [ ] FRONTEND_URL = (your frontend domain)
- [ ] SESSION_SECRET = (64-char random string)

#### Elasticsearch (Optional)
- [ ] ELASTICSEARCH_URL = (optional)
- [ ] ELASTICSEARCH_API_KEY = (optional)

#### Performance
- [ ] WORKER_CONCURRENCY = `5`
- [ ] MIN_EMAIL_DELAY_MS = `2000`
- [ ] MAX_EMAILS_PER_HOUR_PER_SENDER = `100`

### Step 4: Deploy
- [ ] Review all settings
- [ ] Click "Create Web Service"
- [ ] Monitor build logs

---

## Post-Deployment Setup

### Immediately After Deployment

1. **Get Service URL**
   - [ ] Render provides URL like: `https://email-scheduler-backend.onrender.com`
   - [ ] Note this URL

2. **Update Callback URLs**
   - [ ] GOOGLE_CALLBACK_URL = `https://[service-url]/api/auth/google/callback`
   - [ ] SLACK_CALLBACK_URL = `https://[service-url]/api/integrations/slack/callback`
   - [ ] Update these in Render environment variables
   - [ ] Service will auto-restart

3. **Run Database Migrations**
   - [ ] Click on service
   - [ ] Go to "Shell" tab
   - [ ] Run: `npm run prisma:migrate`

### Verification Tests

- [ ] Health check: `curl https://[service-url]/health`
- [ ] Expected response: `{"status":"ok","environment":"production"}`
- [ ] Check Render logs for errors
- [ ] Monitor resource usage

---

## Troubleshooting Reference

### Build Fails
- Check Node version (18+)
- Verify `npm install` completes
- Check for missing environment variables

### Runtime Errors
- Check Render logs tab
- Verify all environment variables set
- Verify database/Redis connectivity

### OAuth Errors
- Ensure GOOGLE_CALLBACK_URL matches exactly
- Check Google Cloud Console authorized URIs
- Verify SESSION_SECRET is set

### Database Connection Errors
- Verify DATABASE_URL format
- Check PostgreSQL is accessible from Render
- Run migrations in Shell

### Redis Connection Errors
- Verify REDIS_HOST and REDIS_PORT
- Check REDIS_PASSWORD if required
- Verify Redis is accessible from Render

---

## Important Notes

1. **No Code Changes Needed** - Project is ready as-is
2. **Secrets Only in Render** - Never commit .env
3. **Database First** - Must be PostgreSQL
4. **Redis Required** - For sessions and job queue
5. **SMTP Needed** - For email sending
6. **Migrations Manual** - Run in Shell after deployment
7. **Restart Auto** - When environment vars change
8. **Free Tier Available** - Sufficient for testing

---

## Quick Reference: Environment Variable Sources

| Variable | Where to Get |
|----------|-------------|
| DATABASE_URL | PostgreSQL provider (RDS, Supabase, etc.) |
| REDIS_HOST | Redis provider (ElastiCache, Upstash, etc.) |
| SMTP_USER | Email provider (Ethereal, SendGrid, etc.) |
| GOOGLE_CLIENT_ID | Google Cloud Console |
| SLACK_CLIENT_ID | Slack App Configuration |
| SESSION_SECRET | Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| SLACK_TOKEN_ENCRYPTION_KEY | Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |

---

## Files in Repository

✅ All existing files preserved  
✅ No code modified  
✅ Documentation added only:
- RENDER_DEPLOYMENT_STEPS.md
- RENDER_CHECKLIST.md
- DEPLOYMENT_GUIDE.md

---

**Status:** ✅ READY FOR RENDER DEPLOYMENT  
**Date:** August 29, 2026  
**Repository:** https://github.com/MohammedSidhik-2006/Outbox-Email-Scheduler
