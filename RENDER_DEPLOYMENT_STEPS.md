# Render Deployment - Step by Step

## Project Configuration (Verified from Existing Files)

### Build Configuration
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm start`
- **Node Version:** 18+ (auto-detect recommended)
- **Root Directory:** `./backend`
- **Repository:** https://github.com/MohammedSidhik-2006/Outbox-Email-Scheduler
- **Branch:** `main`

---

## STEP-BY-STEP DEPLOYMENT INSTRUCTIONS

### 1. Go to Render Dashboard
- URL: https://dashboard.render.com/web/new
- Login with GitHub account

### 2. Connect GitHub Repository
- Click "New +" → "Web Service"
- Select: `Outbox-Email-Scheduler`
- Connect Repository
- Branch: `main`

### 3. Configure Service
- **Name:** `email-scheduler-backend`
- **Environment:** `Node`
- **Region:** Choose closest to users
- **Branch:** `main`
- **Root Directory:** `./backend`
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm start`
- **Node Version:** `18`
- **Plan:** Select appropriate tier

### 4. Add Environment Variables

Go to **Environment** section and add EXACTLY these variables:

```
NODE_ENV=production
PORT=3000

DATABASE_URL=postgresql://[user]:[password]@[host]:[port]/[database]?schema=public
REDIS_HOST=[your-redis-host]
REDIS_PORT=6379
REDIS_PASSWORD=[your-redis-password]

SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USER=[your-ethereal-email]
SMTP_PASSWORD=[your-ethereal-password]
SMTP_FROM=[your-ethereal-email]

GOOGLE_CLIENT_ID=[from-google-cloud-console]
GOOGLE_CLIENT_SECRET=[from-google-cloud-console]
GOOGLE_CALLBACK_URL=https://[your-render-service-name].onrender.com/api/auth/google/callback

FRONTEND_URL=https://[your-frontend-domain]

SESSION_SECRET=[generate-64-char-random-string]

SLACK_CLIENT_ID=[from-slack-app-config]
SLACK_CLIENT_SECRET=[from-slack-app-config]
SLACK_CALLBACK_URL=https://[your-render-service-name].onrender.com/api/integrations/slack/callback
SLACK_TOKEN_ENCRYPTION_KEY=[64-character-hex-string]

WORKER_CONCURRENCY=5
MIN_EMAIL_DELAY_MS=2000
MAX_EMAILS_PER_HOUR_PER_SENDER=100

ELASTICSEARCH_URL=[optional]
ELASTICSEARCH_API_KEY=[optional]
```

### 5. Generate Required Secrets

#### SESSION_SECRET
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### SLACK_TOKEN_ENCRYPTION_KEY
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 6. Database Setup (First Time Only)

After service starts successfully, run migrations:

1. Click service name
2. Go to "Shell"
3. Run command:
```bash
npm run prisma:migrate
```

### 7. Deploy
- Click "Create Web Service"
- Render will automatically build and deploy

### 8. Monitor Deployment
- Go to "Logs" tab
- Watch for: `Server listening on port 3000`
- Check for any errors

### 9. Get Your Service URL
- Once deployed, Render provides URL like:
  `https://email-scheduler-backend.onrender.com`
- Use this in GOOGLE_CALLBACK_URL and SLACK_CALLBACK_URL

### 10. Verify Deployment
Test the endpoints:
```bash
curl https://email-scheduler-backend.onrender.com/health
# Should return: {"status":"ok","environment":"production"}
```

---

## Environment Variable Sources

| Variable | Source | Example |
|----------|--------|---------|
| DATABASE_URL | PostgreSQL connection string | postgresql://user:pass@host:5432/db |
| REDIS_HOST | Redis instance host | redis.example.com |
| REDIS_PASSWORD | Redis auth password | your-redis-password |
| SMTP_* | Email provider credentials | From Ethereal or SendGrid |
| GOOGLE_CLIENT_ID | Google Cloud Console | xxxxx.apps.googleusercontent.com |
| GOOGLE_CLIENT_SECRET | Google Cloud Console | Secret key |
| GOOGLE_CALLBACK_URL | Your Render service URL | https://service.onrender.com/api/auth/google/callback |
| FRONTEND_URL | Your frontend deployment | https://app.vercel.app |
| SESSION_SECRET | Random 64-char string | Generate with crypto module |
| SLACK_* | Slack App Configuration | From api.slack.com |
| SLACK_TOKEN_ENCRYPTION_KEY | Random 64-char hex | Generate with crypto module |

---

## Important Notes

1. **Never commit .env file** - Use Render environment variables
2. **PORT is automatic** - Render assigns the port, don't override
3. **Service URL** - Will be provided after first successful deploy
4. **Database** - Must be PostgreSQL, accessible from Render
5. **Redis** - Must be accessible from Render
6. **HTTPS Only** - Render provides auto HTTPS
7. **Node Version** - 18+ required for crypto modules
8. **Build takes ~2-3 minutes** - First deploy may take longer

---

## Troubleshooting

| Error | Solution |
|-------|----------|
| "Cannot find module '@prisma/client'" | Run `npm install` before build |
| "DATABASE_URL not set" | Add DATABASE_URL to environment variables |
| "Connection refused" | Verify database/redis URLs are accessible from Render |
| "oauth state mismatch" | Update GOOGLE_CALLBACK_URL to actual Render URL |
| "Cannot connect to Redis" | Verify REDIS_HOST and REDIS_PASSWORD |

---

## After Successful Deployment

1. Update GOOGLE_CALLBACK_URL with actual Render URL
2. Update SLACK_CALLBACK_URL with actual Render URL
3. Update FRONTEND_URL if deploying frontend
4. Test OAuth flow
5. Monitor logs for any runtime errors

---

Generated: August 29, 2026
Ready for Production Deployment
