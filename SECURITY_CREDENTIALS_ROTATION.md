# Security: Exposed Credentials Rotation & Remediation

## ⚠️ CRITICAL: Your Credentials Are Exposed in Git

Your repository contains **REAL CREDENTIALS** in the `.env` file that are committed to git history. This is a **SECURITY INCIDENT**.

### What's Exposed

| Credential | Status | Risk Level | Location |
|-----------|--------|-----------|----------|
| **GOOGLE_CLIENT_SECRET** | ❌ Exposed | 🔴 CRITICAL | `.env` file in git |
| **ELASTICSEARCH_API_KEY** | ❌ Exposed | 🔴 CRITICAL | `.env` file in git |
| **SMTP_PASSWORD** | ❌ Exposed | 🟠 HIGH | `.env` file in git |
| **SLACK_TOKEN_ENCRYPTION_KEY** | ❌ Exposed | 🟠 HIGH | `.env` file in git |
| **SESSION_SECRET** | ❌ Exposed | 🟡 MEDIUM | `.env` file in git |
| **SMTP_USER (Ethereal)** | ⚠️ Test Account | 🟡 MEDIUM | Public in git |

### Immediate Actions Required

You must immediately:
1. **Rotate all exposed credentials** on their respective platforms
2. **Generate new values** for production
3. **Remove .env from git history** (or create new repo)
4. **Add .env to .gitignore** to prevent future exposure
5. **Never commit secrets to git again**

---

## Step 1: Rotate Each Exposed Credential

### 1A: Google OAuth Credentials (CRITICAL)

**Current Status:** `GOOGLE_CLIENT_SECRET` exposed in git

**Action:**
1. Go to: https://console.cloud.google.com
2. Navigate to **"APIs & Services" → "Credentials"**
3. Find your OAuth 2.0 Client ID
4. Delete the OLD client ID (exposed one)
5. Create a NEW OAuth 2.0 Client ID:
   - Type: Web application
   - Add redirect URI: `https://outbox-email-scheduler-wl9y.onrender.com/api/auth/google/callback`
6. Copy the NEW Client ID and Secret
7. **Use only the NEW credentials going forward**

**Set on Render:**
- Update `GOOGLE_CLIENT_ID` with new value
- Update `GOOGLE_CLIENT_SECRET` with new value
- Click "Save Changes" to redeploy

**Verify:** Try Google login on production frontend - should work with new credentials

---

### 1B: Elasticsearch API Key (CRITICAL)

**Current Status:** API key exposed in git

**Action:**
1. Go to: https://cloud.elastic.co
2. Find your deployment
3. Navigate to **"Management" → "API Keys"**
4. Delete the OLD API key (exposed one)
5. Create a NEW API key:
   - Name: `email-scheduler-prod`
   - Role: Full access (or custom read/write)
6. Copy the NEW key
7. **Use only the NEW key going forward**

**Set on Render:**
- Update `ELASTICSEARCH_API_KEY` with new value
- Click "Save Changes"

**Verify:** Search for an email in production dashboard - should work with new key

---

### 1C: SMTP Password (HIGH PRIORITY)

**Current Status:** Ethereal SMTP password exposed (test account, but still exposed)

**Action:**
1. Go to: https://ethereal.email
2. Click "Delete Account" or just create a NEW test account
3. Get NEW SMTP credentials:
   - Username: new-account@ethereal.email
   - Password: auto-generated

**For Production:**
1. Sign up for SendGrid, AWS SES, or Mailgun (choose one)
2. Get production SMTP credentials
3. **These are NOT the test credentials**

**Set on Render:**
- Update `SMTP_HOST` (sendgrid/amazonaws/mailgun)
- Update `SMTP_PORT` (from provider)
- Update `SMTP_USER` (from provider)
- Update `SMTP_PASSWORD` (from provider)
- Click "Save Changes"

**Verify:** Send test email - should work with new credentials

---

### 1D: Slack Token Encryption Key (HIGH PRIORITY)

**Current Status:** Weak key exposed in git

**Action:**
1. Generate a NEW strong encryption key locally:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
2. Copy the output (64-character hex string)

**Set on Render:**
- Update `SLACK_TOKEN_ENCRYPTION_KEY` with new value
- Click "Save Changes"

**Note:** Any previously encrypted Slack tokens won't decrypt with new key. Users will need to re-authorize Slack integration (this is acceptable - it's a security upgrade).

---

### 1E: Session Secret (MEDIUM PRIORITY)

**Current Status:** Weak dev secret exposed in git

**Action:**
1. Generate a NEW strong session secret locally:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
2. Copy the output (64-character hex string)

**Set on Render:**
- Update `SESSION_SECRET` with new value
- Click "Save Changes"

**Effect:** All existing user sessions will be invalidated (users must login again). This is acceptable - it's a security upgrade.

---

## Step 2: Remove .env from Git History

### Option A: Create New Repository (Recommended)

If credentials were shared widely:
1. Create a NEW repository on GitHub
2. Clone the old repo locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/Outbox-Email-Scheduler.git old-repo
   cd old-repo
   ```
3. Remove git history:
   ```bash
   rm -rf .git
   git init
   ```
4. Add new remote:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/Outbox-Email-Scheduler-New.git
   ```
5. Push clean history:
   ```bash
   git add .
   git commit -m "Initial commit - clean repository"
   git push -u origin main
   ```

### Option B: Use git-filter-branch (Advanced)

If you want to keep the same repository but remove sensitive files:

```bash
# Remove .env from git history
git filter-branch --tree-filter 'rm -f .env' -- --all

# Force push (WARNING: rewrites history)
git push --force --all
```

**Warning:** This rewrites git history for everyone. Only do this if you control all clones.

---

## Step 3: Add .env to .gitignore

1. Open `.gitignore` file:
   ```bash
   cat .gitignore
   ```

2. Add these lines (if not already present):
   ```
   # Environment variables - NEVER commit secrets
   .env
   .env.local
   .env.production.local
   .env.*.local

   # IDE and OS files
   .DS_Store
   .vscode/settings.json
   .idea/
   *.swp
   *.swo
   *~
   ```

3. Commit the change:
   ```bash
   git add .gitignore
   git commit -m "Add .env to gitignore - prevent accidental credential exposure"
   git push
   ```

---

## Step 4: Verify No Secrets Remain in Git

Run these commands to verify:

```bash
# Search for common secret patterns in git history
git log -p | grep -i "GOOGLE_CLIENT_SECRET\|ELASTICSEARCH_API_KEY\|SMTP_PASSWORD"

# Should return NOTHING if secrets are removed
```

If any secrets still appear in history, you must either:
- Use `git filter-branch` to remove them
- Create a new repository

---

## Step 5: Update GitHub Repository Settings

### 5A: Enable Branch Protection

1. Go to GitHub: https://github.com/YOUR_USERNAME/Outbox-Email-Scheduler
2. Settings → Branches
3. Click "Add rule" under "Branch protection rules"
4. Apply to: `main`
5. Enable:
   - [x] Require pull request reviews before merging
   - [x] Require code reviews from at least 1 person
   - [x] Require status checks to pass before merging (optional)
6. Click "Create"

### 5B: Add Secrets Scanning (If Available)

1. GitHub Settings → "Code security and analysis"
2. Enable "Secret scanning" (if available on your plan)
3. GitHub will automatically scan for and flag exposed credentials

### 5C: Add .env.example (Best Practice)

Create a template showing what environment variables are needed:

```bash
cat > .env.example << 'EOF'
# Server Configuration
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/email_scheduler?schema=public

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Frontend
FRONTEND_URL=http://localhost:5173

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback

# Session
SESSION_SECRET=your-session-secret-key-min-32-chars

# Slack Integration
SLACK_CLIENT_ID=your-slack-client-id
SLACK_CLIENT_SECRET=your-slack-client-secret
SLACK_CALLBACK_URL=http://localhost:3000/api/integrations/slack/callback
SLACK_TOKEN_ENCRYPTION_KEY=64-char-hex-key

# SMTP Email
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USER=your-ethereal-email@ethereal.email
SMTP_PASSWORD=your-ethereal-password
SMTP_FROM=your-ethereal-email@ethereal.email

# Performance
WORKER_CONCURRENCY=5
MIN_EMAIL_DELAY_MS=0
MAX_EMAILS_PER_HOUR_PER_SENDER=1000

# Elasticsearch (Optional)
ELASTICSEARCH_URL=
ELASTICSEARCH_API_KEY=
EOF

# Add to git
git add .env.example
git commit -m "Add .env.example template for development setup"
git push
```

---

## Step 6: Document Your Security Fix

Create a security audit log:

```bash
# Create a file documenting what was done
cat > SECURITY_AUDIT_LOG.md << 'EOF'
# Security Audit Log

## Date: August 29, 2026

### Issue: Exposed Credentials in Git Repository

#### What Was Exposed
- GOOGLE_CLIENT_SECRET
- ELASTICSEARCH_API_KEY
- SMTP_PASSWORD (Ethereal test account)
- SLACK_TOKEN_ENCRYPTION_KEY
- SESSION_SECRET
- Ethereal SMTP credentials

#### Remediation Completed
- ✅ Rotated Google OAuth credentials
- ✅ Rotated Elasticsearch API key
- ✅ Rotated SMTP credentials (switched to production SendGrid)
- ✅ Generated new Slack token encryption key
- ✅ Generated new session secret
- ✅ Removed .env from git history
- ✅ Added .env to .gitignore
- ✅ Created .env.example for developers
- ✅ Enabled GitHub branch protection
- ✅ Enabled GitHub secret scanning

#### New Environment Setup
- All production credentials now set only in Render dashboard (not in git)
- Development .env file generated from .env.example (never committed)
- All developers reminded to never commit secrets

#### Follow-up Actions
- [ ] Monitor Elasticsearch API key usage for suspicious activity
- [ ] Monitor Google OAuth logs for unexpected access
- [ ] Rotate credentials again in 6 months (best practice)
- [ ] Consider implementing git-secrets pre-commit hook

#### Contact
If you discover any suspicious activity related to exposed credentials, immediately:
1. Go to the respective service (Google, Elastic, etc.)
2. Disable the compromised credential
3. Rotate to a new one
4. Update Render environment variables
5. Check logs for unauthorized access
EOF

git add SECURITY_AUDIT_LOG.md
git commit -m "Document security audit and credential rotation"
git push
```

---

## Step 7: Set Up Pre-commit Hook (Prevent Future Exposure)

Create a git hook to prevent committing .env files:

```bash
# Create the hook file
mkdir -p .git/hooks
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash

# Prevent committing .env files
if git diff --cached --name-only | grep -E "\.env|secrets|credentials"; then
    echo "ERROR: Attempting to commit sensitive file (.env, secrets, etc.)"
    echo "This file should NOT be committed to git."
    echo ""
    echo "If this is a legitimate file:"
    echo "  1. Add it to .gitignore"
    echo "  2. Run: git rm --cached <filename>"
    echo "  3. Try committing again"
    echo ""
    exit 1
fi

exit 0
EOF

# Make the hook executable
chmod +x .git/hooks/pre-commit

# Commit the hook setup
git add .git/hooks/pre-commit
git commit -m "Add pre-commit hook to prevent accidental credential exposure"
git push
```

---

## Security Checklist: Credentials Rotation

### Immediate (Do Today)

- [ ] Rotate Google OAuth credentials (create new OAuth app)
- [ ] Rotate Elasticsearch API key (create new key)
- [ ] Rotate SMTP credentials (create new SendGrid/SES account or credentials)
- [ ] Generate new SESSION_SECRET (64-char hex)
- [ ] Generate new SLACK_TOKEN_ENCRYPTION_KEY (64-char hex)
- [ ] Update all values on Render dashboard
- [ ] Verify production still works (health check, login test, email test)

### Short-term (This Week)

- [ ] Remove .env from git history (use git-filter-branch or create new repo)
- [ ] Add .env to .gitignore
- [ ] Create .env.example
- [ ] Commit changes and push
- [ ] Enable GitHub branch protection rules
- [ ] Enable GitHub secret scanning

### Long-term (Best Practices)

- [ ] Implement git-secrets pre-commit hook
- [ ] Use Render Secrets Scanner if available
- [ ] Rotate all credentials every 6 months
- [ ] Audit git history for accidental commits monthly
- [ ] Train team on secrets management
- [ ] Use separate OAuth apps for dev/staging/production
- [ ] Consider using sealed-secrets or git-crypt for infrastructure config

---

## What NOT to Do

### ❌ DON'T:
- ❌ Leave .env file in git repository
- ❌ Commit any files containing API keys, passwords, or tokens
- ❌ Share credentials via Slack, email, or chat
- ❌ Use the same credentials for dev and production
- ❌ Rely on .gitignore alone (file may already be committed)
- ❌ Ignore this security issue - assume credentials are compromised

### ✅ DO:
- ✅ Store all secrets in Render environment variables dashboard
- ✅ Use .env.example for template (no real values)
- ✅ Rotate credentials after any suspected compromise
- ✅ Use git secrets scanning tools
- ✅ Review git history monthly for accidental commits
- ✅ Enable branch protection to require reviews before merge
- ✅ Treat secrets like passwords - never share them

---

## Reference: Credential Rotation Schedule

| Credential | Frequency | Last Rotated | Next Due |
|-----------|-----------|-------------|----------|
| Google OAuth Secret | 6 months | Aug 29, 2026 | Feb 29, 2027 |
| Elasticsearch API Key | 6 months | Aug 29, 2026 | Feb 29, 2027 |
| SMTP Password | 6 months | Aug 29, 2026 | Feb 29, 2027 |
| Session Secret | 3 months | Aug 29, 2026 | Nov 29, 2026 |
| Slack Encryption Key | 6 months | Aug 29, 2026 | Feb 29, 2027 |

---

## Commands Quick Reference

```bash
# Generate a new secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Check git history for secrets
git log -p | grep -i "SECRET\|PASSWORD\|API_KEY\|TOKEN"

# Remove .env from git history
git filter-branch --tree-filter 'rm -f .env' -- --all
git push --force --all

# Add .env to gitignore
echo ".env" >> .gitignore
git add .gitignore
git commit -m "Add .env to gitignore"
git push

# View all credentials in git (dangerous - use carefully)
git log -p -- .env

# Remove a file from git but keep it locally
git rm --cached .env
```

---

## Support & Questions

If you're unsure about any of these steps:
1. Check the BACKEND_PRODUCTION_ENV_GUIDE.md for environment setup
2. Review RENDER_DEPLOYMENT_MATRIX.md for Render-specific instructions
3. Visit GitHub's security guide: https://docs.github.com/en/code-security
4. Visit your credential provider's security documentation

---

**Last Updated:** August 29, 2026  
**Status:** ⚠️ CRITICAL - Credentials Exposed - Immediate Action Required  
**Priority:** P1 - Before Any Production Deployment
