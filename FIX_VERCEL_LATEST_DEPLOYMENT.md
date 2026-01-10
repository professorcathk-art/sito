# Fix: Deploy Latest Code to Vercel

## Problem
Vercel is deploying commit `1db3ea9` (47 min ago) instead of latest `37021da` (includes custom checkout descriptions fix).

## Root Cause
Vercel is connected to GitHub, but the webhook isn't triggering for new commits (common with private repos).

## Solution: Reconnect Vercel to GitHub

### Step 1: Disconnect and Reconnect

1. Go to: **https://vercel.com/dashboard**
2. Click project: **sito**
3. Go to: **Settings** → **Git** (or look for "Repository" section)
4. Click **"Disconnect"** (if you see this button)
5. Click **"Connect Git Repository"**
6. Select **GitHub**
7. Authorize Vercel (grant private repo access)
8. Select repository: `professorcathk-art/sito`
9. Branch: `main`
10. Click **"Import"** or **"Connect"**

This will:
- ✅ Pull latest code from GitHub
- ✅ Create new webhook
- ✅ Trigger immediate deployment with latest commit

### Step 2: Verify Latest Deployment

After reconnecting, check:
1. **Deployments** tab
2. Latest deployment should show commit: `37021da` or `1f9aae1`
3. Deployment message should include: "Generate custom descriptions for Stripe checkout"

## Alternative: Manual Trigger

If reconnecting doesn't work:

### Option A: Push Empty Commit

```bash
cd /Users/mickeylau/Sito
git commit --allow-empty -m "Trigger Vercel deployment"
git push origin main
```

This forces GitHub webhook to fire.

### Option B: GitHub Webhook Manual Trigger

1. Go to: **https://github.com/professorcathk-art/sito/settings/hooks**
2. Find Vercel webhook
3. Click **"Recent Deliveries"**
4. Find latest push event
5. Click **"Redeliver"**

### Option C: Vercel Dashboard - Create Deployment

1. Vercel Dashboard → Project
2. Look for **"Create Deployment"** button
3. Select source: **GitHub**
4. Repository: `professorcathk-art/sito`
5. Branch: `main`
6. Commit: Select latest (`37021da`)
7. Deploy

## Verify Code is on GitHub

Check that latest commits are pushed:

```bash
git log origin/main --oneline -3
```

Should show:
- `37021da` - Add documentation
- `1f9aae1` - Generate custom descriptions (THIS IS THE IMPORTANT ONE)
- `1db3ea9` - Fix import path (currently deployed)

## What Should Be Deployed

The latest deployment should include:
- ✅ Custom checkout descriptions ("Course provided by [Expert Name]")
- ✅ Fixed import path for createServiceRoleClient
- ✅ Invite/remove user functionality
- ✅ Stripe locale set to English

## Quick Checklist

- [ ] Verify latest commits are on GitHub (`git log origin/main`)
- [ ] Reconnect Vercel to GitHub in dashboard
- [ ] Check new deployment shows latest commit
- [ ] Verify deployment includes custom descriptions fix
- [ ] Test checkout page shows clean descriptions (no HTML)

---

**Most Important:** Reconnect Vercel to GitHub in dashboard - this will pull and deploy the latest code automatically.
