# Get DATABASE_URL from PostgreSQL - Step by Step

## 📸 What You're Showing

You're in the **Production environment** with 4 services listed:

1. ✅ **email-scheduler-redis** - Available
2. ❌ **Outbox Email Scheduler** - Failed deploy
3. ✅ **email-scheduler-db** - Available (PostgreSQL)
4. ✅ **food-delivery-backend** - Deployed

You need to click on **"email-scheduler-db"** (the PostgreSQL database)

---

## 🎯 EXACT STEPS

### Step 1: Click on "email-scheduler-db"

In the table, click on the row that says:
- Service Name: **email-scheduler-db**
- Status: ✅ Available
- Runtime: PostgreSQL 15

Click anywhere on that row.

---

### Step 2: You'll See Database Details

After clicking, you'll see a page with connection information:

Look for these fields:
- **Host** (or Server address)
- **Port** (usually 5432)
- **Database** (usually email_scheduler)
- **Username** (usually postgres)
- **Password** (hidden with dots)
- **Connection String** (or URI)

---

### Step 3: Copy the Connection String

The connection string looks like:

```
postgresql://postgres:password123@email-scheduler-db.abcd1234.render.internal:5432/email_scheduler
```

**Or it might say:**

```
postgresql://user:password@host:port/dbname
```

**COPY the entire string** (including `postgresql://` at the start)

---

## 🖥️ WHERE TO PASTE IT

### Go back to Your Main Service

Click on **"Outbox Email Scheduler"** (the one with Failed deploy)

---

### Click "Environment" Tab

At the top, you'll see tabs:
- Overview
- Add-ons
- Deploys
- **Environment** ← Click here

---

### Find or Create DATABASE_URL

In the Environment Variables list:

**Find:** `DATABASE_URL`

If it doesn't exist:
1. Click "Add Variable"
2. Name: `DATABASE_URL`
3. Value: Paste the connection string from PostgreSQL

If it exists:
1. Click on it
2. Clear old value
3. Paste the new connection string from PostgreSQL

---

## ⚠️ IMPORTANT NOTES

### Connection String Format

Must include:
- ✅ `postgresql://` (at start)
- ✅ `username:password@`
- ✅ `hostname.render.internal` (NOT localhost)
- ✅ `:5432` (port)
- ✅ `/email_scheduler` (database name)
- ✅ `?schema=public` (at end)

### Example - CORRECT:
```
postgresql://postgres:mypassword@email-scheduler-db.render.internal:5432/email_scheduler?schema=public
```

### Example - WRONG (Don't use):
```
postgresql://localhost:5432/email_scheduler  ❌ Has localhost
postgresql://user:pass@hostname  ❌ Missing port and database name
postgresql://hostname/db  ❌ Missing credentials
```

---

## ✅ AFTER PASTING DATABASE_URL

1. Scroll to bottom of Environment tab
2. Click **"Save Changes"** button
3. Render restarts automatically
4. Wait 2-3 minutes

---

## 🧪 TEST IT WORKS

After waiting 2-3 minutes:

```bash
curl https://outbox-email-scheduler-wl9y.onrender.com/health
```

Should return:
```json
{"status":"ok","environment":"production"}
```

If you see error about database connection, the DATABASE_URL is still wrong.

---

## 📋 QUICK CHECKLIST

- [ ] Click on "email-scheduler-db" row
- [ ] See PostgreSQL connection details
- [ ] Copy the connection string
- [ ] Click on "Outbox Email Scheduler" service
- [ ] Click "Environment" tab
- [ ] Find or create DATABASE_URL variable
- [ ] Paste connection string
- [ ] Scroll down
- [ ] Click "Save Changes"
- [ ] Wait 2-3 minutes
- [ ] Test with curl health command

---

Generated: August 30, 2026
