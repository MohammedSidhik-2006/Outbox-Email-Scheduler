# Redis & PostgreSQL Setup - Exact Links & Steps

## 🔗 EXACT LINKS TO USE

### For Redis Configuration:
```
https://dashboard.render.com/d/srv-da93ea942hec7383qm4g/env
```

Then click **"Add-ons"** tab at the top

---

### For PostgreSQL Configuration:
```
https://dashboard.render.com/d/srv-da93ea942hec7383qm4g/env
```

Then click **"Add-ons"** tab at the top

---

## 📋 STEP-BY-STEP GUIDE

### STEP 1: Go to Your Render Service

**Link:** https://dashboard.render.com

You should see your service listed:
- Service Name: `outbox-email-scheduler-wl9y`
- Type: `Web Service`

Click on it to open.

---

### STEP 2: Click "Add-ons" Tab

Once inside your service, at the top you'll see tabs:
- Overview
- **Add-ons** ← Click here
- Deploys
- Events
- Settings
- Environment

Click on **"Add-ons"**

---

### STEP 3: Check if Redis Exists

In the Add-ons section, look for:
- **Redis** service

If you see it listed:
- ✅ Redis is already created
- Click on it
- Copy the connection details

If you DON'T see it:
- ❌ You need to create it
- See section "CREATE REDIS" below

---

### STEP 4: Get Redis Connection Details

**When you click on Redis service, you'll see:**

```
Redis Instance Name: outbox-email-scheduler-redis
Host: redis-xxxxx.render.internal
Port: 6379
Database: 0
Password: xxxxxxxxxxxxxxxxxxxx
```

**Copy These Values:**
- `Host` → This goes in `REDIS_HOST`
- `Port` → This is `REDIS_PORT` (always 6379)
- `Password` → This goes in `REDIS_PASSWORD`

---

### STEP 5: Check if PostgreSQL Exists

In the Add-ons section, look for:
- **PostgreSQL** service

If you see it listed:
- ✅ PostgreSQL is already created
- Click on it
- Copy the connection string

If you DON'T see it:
- ❌ You need to create it
- See section "CREATE POSTGRESQL" below

---

### STEP 6: Get PostgreSQL Connection String

**When you click on PostgreSQL service, you'll see:**

```
PostgreSQL Instance Name: outbox-email-scheduler-db
Host: xxxxx.render.internal
Port: 5432
Database: email_scheduler
Username: postgres
Password: xxxxxxxxxxxxxxxxxxxx
```

Or a complete connection string:
```
postgresql://user:password@host:5432/dbname?schema=public
```

**Copy the entire connection string** → This goes in `DATABASE_URL`

---

## 🚀 IF REDIS DOESN'T EXIST - CREATE IT

### Step 1: In Add-ons tab, click "Create New"

You'll see options:
- Create PostgreSQL
- Create Redis
- etc.

Click **"Create Redis"**

### Step 2: Configure Redis

- Name: `outbox-email-scheduler-redis` (or any name)
- Click **"Create Redis"**

### Step 3: Wait

Redis takes 1-2 minutes to provision. You'll see status:
- "Creating..."
- "Deploying..."
- "Available" ← Ready!

### Step 4: Copy Details

Once it says "Available", click on it and copy:
- Host
- Port
- Password

---

## 🚀 IF POSTGRESQL DOESN'T EXIST - CREATE IT

### Step 1: In Add-ons tab, click "Create New"

Click **"Create PostgreSQL"**

### Step 2: Configure PostgreSQL

- Name: `outbox-email-scheduler-db` (or any name)
- Database name: `email_scheduler`
- Postgres Version: Latest
- Click **"Create PostgreSQL"**

### Step 3: Wait

PostgreSQL takes 2-5 minutes to provision. Status:
- "Creating..."
- "Deploying..."
- "Available" ← Ready!

### Step 4: Copy Connection String

Once it says "Available", click on it and copy the full connection string:

```
postgresql://postgres:password@hostname.render.internal:5432/email_scheduler?schema=public
```

---

## 📍 WHERE TO PASTE THE VALUES

After getting the connection details:

### Go to Environment Tab

**Link:** https://dashboard.render.com/d/srv-da93ea942hec7383qm4g/env

Then in the Environment Variables list, update:

### For Redis:

Find or create these 3 variables:

```
REDIS_HOST = redis-xxxxx.render.internal

REDIS_PORT = 6379

REDIS_PASSWORD = xxxxxxxxxxxxxxxxxxxx
```

### For PostgreSQL:

Find or create this variable:

```
DATABASE_URL = postgresql://postgres:password@hostname.render.internal:5432/email_scheduler?schema=public
```

---

## ✅ VERIFICATION

After pasting values:

1. Scroll to top/bottom of Environment tab
2. Look for **"Save Changes"** button
3. Click it
4. Render will restart service automatically
5. Wait 2-3 minutes

---

## 🔍 HOW TO VERIFY IT WORKS

After saving changes:

### Test 1: Health Check
```bash
curl https://outbox-email-scheduler-wl9y.onrender.com/health
```

Expected response:
```json
{"status":"ok","environment":"production"}
```

### Test 2: Check Logs
Go to **Logs** tab in Render. You should see:
```
✓ PostgreSQL connected
✓ Redis connected
✓ Email worker ready
✓ Server listening on port 3000
```

---

## 🆘 TROUBLESHOOTING

### Problem: Can't find Add-ons tab

**Solution:**
1. Make sure you're on the service page (not dashboard)
2. Look at the top of the page
3. You should see tabs: Overview, Add-ons, Deploys, etc.
4. If still not visible, scroll the tab bar left/right

### Problem: Add-ons tab is empty

**Solution:**
1. You haven't created Redis or PostgreSQL yet
2. Click "Create PostgreSQL" or "Create Redis"
3. Wait 2-5 minutes for provisioning
4. It will appear in Add-ons list when done

### Problem: Connection string shows `localhost`

**Solution:**
This is WRONG for production. Use the connection string from Render Add-ons, which should have:
- `.render.internal` hostname (NOT localhost)
- Full connection string with credentials

### Problem: "Save Changes" button doesn't work

**Solution:**
1. Make sure you've filled in all required variables
2. Check that values don't have extra spaces
3. Scroll down to see if there are validation errors
4. Try refreshing page and try again

---

## 📋 QUICK REFERENCE

| What | Link |
|------|------|
| Render Dashboard | https://dashboard.render.com |
| Your Service | https://dashboard.render.com/d/srv-da93ea942hec7383qm4g/env |
| Add-ons | Click "Add-ons" tab on service page |
| Environment | Click "Environment" tab on service page |

---

## 🎯 NEXT STEPS AFTER REDIS & POSTGRESQL

1. ✅ Set REDIS_HOST, REDIS_PORT, REDIS_PASSWORD
2. ✅ Set DATABASE_URL
3. ✅ Set NODE_ENV = `production`
4. ✅ Set FRONTEND_URL = `https://emailscheduler-3ja3rfexv-professional7.vercel.app`
5. ✅ Set GOOGLE_CALLBACK_URL = `https://outbox-email-scheduler-wl9y.onrender.com/api/auth/google/callback`
6. ✅ Set SMTP variables (SendGrid)
7. Click **"Save Changes"**
8. Wait 2-3 minutes
9. Test health endpoint

---

Generated: August 30, 2026
