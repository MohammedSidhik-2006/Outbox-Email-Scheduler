# Deployment Guide: Render + Vercel

## 🚀 Quick Deployment Checklist

### ✅ Status: READY FOR PRODUCTION

---

## BACKEND - Render Deployment

### Prerequisites
- [x] Render account (render.com)
- [x] PostgreSQL database (Render or external)
- [x] Redis instance (Render or external)

### Deployment Steps

#### 1. Create New Web Service on Render
```
1. Go to render.com → Dashboard
2. Click "New +" → "Web Service"
3. Connect GitHub repository
4. Select branch: main
5. Configure:
   - Name: email-scheduler-backend
   - Environment: Node
   - Build Command: cd backend && npm install && npm run build
   - Start Command: cd backend && npm start
   - Plan: Starter (free) or paid
```

#### 2. Set Environment Variables
In Render dashboard → Environment:

```
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:pass@host:5432/email_scheduler
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USER=your-ethereal-email@ethereal.email
SMTP_PASSWORD=your-ethereal-password
SMTP_FROM=sender@yourdomain.com
WORKER_CONCURRENCY=5
MIN_EMAIL_DELAY_MS=2000
MAX_EMAILS_PER_HOUR_PER_SENDER=100
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=https://your-backend.onrender.com/api/auth/google/callback
FRONTEND_URL=https://your-frontend.vercel.app
SESSION_SECRET=generate-a-long-random-string
SLACK_CLIENT_ID=your-slack-client-id
SLACK_CLIENT_SECRET=your-slack-client-secret
SLACK_CALLBACK_URL=https://your-backend.onrender.com/api/integrations/slack/callback
SLACK_TOKEN_ENCRYPTION_KEY=generate-64-char-hex-string
ELASTICSEARCH_URL=https://your-es-instance:9200
ELASTICSEARCH_API_KEY=your-api-key
```

#### 3. Database Migration
```bash
# After deployment, run in Render shell:
cd backend
npm run prisma:migrate
```

#### 4. Verify Deployment
- Backend URL: `https://your-backend.onrender.com`
- Health check: `https://your-backend.onrender.com/health`
- BullMQ Dashboard: `https://your-backend.onrender.com/admin/queues`

---

## FRONTEND - Vercel Deployment

### Prerequisites
- [x] Vercel account (vercel.com)
- [x] GitHub repository connected

### Deployment Steps

#### 1. Create New Project on Vercel
```
1. Go to vercel.com → Add New → Project
2. Import GitHub Repository
3. Select: Outbox-Email-Scheduler
4. Framework Preset: Vite (auto-detected)
5. Root Directory: ./frontend
```

#### 2. Build Configuration
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`

#### 3. Environment Variables
In Vercel project settings → Environment Variables:

```
VITE_API_BASE_URL=https://your-backend.onrender.com
```

#### 4. Deploy
- Vercel auto-deploys on push to main
- URL: `https://your-app.vercel.app`

---

## 🔐 Security Checklist Before Deployment

- [ ] **Secrets Never in Code**
  - .env file NOT in git (checked via .gitignore)
  - All credentials in Render/Vercel environment variables

- [ ] **Database Security**
  - PostgreSQL: Strong password, encrypted connection (SSL)
  - Backup enabled
  - User permissions restricted

- [ ] **Redis Security**
  - Password protected
  - Not publicly accessible
  - Encrypted connection in production

- [ ] **OAuth Credentials**
  - Google: Authorized redirect URIs include production URL
  - Slack: Authorized redirect URIs include production URL
  - Client secrets stored only in environment

- [ ] **SSL/HTTPS**
  - Render: Auto HTTPS (included)
  - Vercel: Auto HTTPS (included)
  - Cookies: secure=true in production

- [ ] **CORS Configuration**
  - Backend: Frontend origin only
  - Frontend: Backend origin only

---

## 📝 Environment Variables Reference

### Required Backend Variables
```
DATABASE_URL       = PostgreSQL connection string
REDIS_HOST         = Redis host
REDIS_PORT         = Redis port (default: 6379)
REDIS_PASSWORD     = Redis password (if any)
SMTP_HOST          = SMTP server hostname
SMTP_PORT          = SMTP port (usually 587 or 465)
SMTP_USER          = SMTP username
SMTP_PASSWORD      = SMTP password
SMTP_FROM          = Sender email address
GOOGLE_CLIENT_ID   = From Google Cloud Console
GOOGLE_CLIENT_SECRET = From Google Cloud Console
SESSION_SECRET     = Random string (64+ chars recommended)
FRONTEND_URL       = https://your-frontend.vercel.app
```

### Required Frontend Variables
```
VITE_API_BASE_URL = https://your-backend.onrender.com
```

---

## 🧪 Post-Deployment Verification

### Backend Tests
```bash
# After deployment, run:
curl https://your-backend.onrender.com/health
# Expected: {"status":"ok","environment":"production"}
```

### Frontend Tests
```
1. Visit https://your-frontend.vercel.app
2. Click "Login with Google"
3. Should redirect to Google OAuth
4. Should redirect back to dashboard
5. Should be able to compose and schedule emails
```

### Email Sending Test
```
1. Login to dashboard
2. Create campaign
3. Schedule email to yourself
4. Check email inbox
5. Verify email received in sent table
```

---

## 🔄 Database Setup

### On Render (if using Render PostgreSQL)

1. Go to Render Dashboard → PostgreSQL
2. Create new instance
3. Copy connection string
4. Paste into backend environment variable: `DATABASE_URL`

### First Migration
```bash
# SSH into Render backend:
render shell

# Run migrations:
cd backend
npm run prisma:migrate
```

---

## 📊 Monitoring & Logs

### Render Backend Logs
```
Render Dashboard → Your Service → Logs
```

### Vercel Frontend Logs
```
Vercel Dashboard → Project → Deployments → View Logs
```

### Issues & Debugging

| Issue | Solution |
|-------|----------|
| "Connection refused" | Check DATABASE_URL, ensure PostgreSQL is running |
| "Redis connection error" | Verify REDIS_HOST, REDIS_PORT, REDIS_PASSWORD |
| "OAuth state mismatch" | Verify GOOGLE_CALLBACK_URL matches exactly |
| "SMTP error" | Check SMTP credentials, port, and firewall rules |
| "Emails not sending" | Check BullMQ queue at `/admin/queues` |

---

## 🚀 Performance Tips

1. **Database Indexes**: Ensure Prisma indices are created
2. **Redis Persistence**: Enable AOF or RDB backups
3. **Worker Concurrency**: Adjust `WORKER_CONCURRENCY` based on CPU/memory
4. **CDN**: Vercel includes CDN by default (200+ edge locations)
5. **Caching**: Frontend caching via Vercel headers

---

## 🔄 CI/CD (Automatic)

Both Render and Vercel have built-in CI/CD:

1. **Push to main** → Render detects changes
2. **Render rebuilds backend** (npm install → npm run build)
3. **Vercel rebuilds frontend** (npm install → npm run build)
4. **Both deploy automatically**

---

## 💰 Cost Estimation (Monthly)

| Service | Free Plan | Cost (if paid) |
|---------|-----------|---|
| Render Backend | ✅ Available | $7-50+ |
| Render PostgreSQL | Not free | $15+ |
| Render Redis | Not free | $10+ |
| Vercel Frontend | ✅ Free | $20+ for pro |
| **Total** | **$0** | **$42+** |

*Free tier sufficient for development/demo. Upgrade for production.*

---

## 📞 Support Resources

- **Render Docs**: https://render.com/docs
- **Vercel Docs**: https://vercel.com/docs
- **Prisma Docs**: https://www.prisma.io/docs
- **Express Docs**: https://expressjs.com

---

## ✅ Final Checklist

- [x] All environment variables documented
- [x] Backend ready for Render
- [x] Frontend ready for Vercel
- [x] Database migrations prepared
- [x] OAuth credentials configured
- [x] SMTP credentials set
- [x] Security best practices followed
- [x] Code committed to GitHub
- [x] No secrets in repository

**Status: ✅ READY FOR PRODUCTION DEPLOYMENT**

---

*Generated: August 29, 2026*
*Repository: https://github.com/MohammedSidhik-2006/Outbox-Email-Scheduler*
