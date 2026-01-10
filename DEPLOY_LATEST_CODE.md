# Deploy Latest Code to Vercel

## Issue
Vercel is deploying old commit (`1db3ea9` from 47 min ago) instead of latest (`37021da`).

## Latest Commits
- `37021da` - Add documentation for checkout descriptions and GitHub sync
- `1f9aae1` - Generate custom descriptions for Stripe checkout to avoid HTML display
- `1db3ea9` - Fix import path for createServiceRoleClient (currently deployed)

## Solutions

### Solution 1: Deploy from Local Code (Current Attempt)

The CLI should deploy your current local files, not from GitHub. If it's still failing due to Git author, try:

```bash
cd /Users/mickeylau/Sito

# Temporarily change Git author
git config user.email "your-vercel-email@example.com"

# Deploy
vercel --prod --token YOUR_TOKEN --yes

# Change back
git config user.email "mickeylau.finance@gmail.com"
```

### Solution 2: Connect Vercel to GitHub Properly

1. Go to: **https://vercel.com/dashboard**
2. Project → **Settings** → **Git**
3. Click **"Disconnect"** (if connected to wrong repo)
4. Click **"Connect Git Repository"**
5. Select **GitHub** → Authorize
6. Select repository: `professorcathk-art/sito`
7. Branch: `main`
8. This will trigger a new deployment with latest code

### Solution 3: Create New Deployment from Specific Commit

In Vercel Dashboard:
1. Go to **Deployments**
2. Click **"Create Deployment"** (if available)
3. Select **GitHub** as source
4. Choose commit: `37021da` or latest
5. Deploy

### Solution 4: Force GitHub Webhook

1. Go to GitHub: **https://github.com/professorcathk-art/sito/settings/hooks**
2. Find Vercel webhook
3. Click **"Redeliver"** on recent events
4. Or **"Edit"** → **"Redeliver"** to trigger deployment

### Solution 5: Push Empty Commit to Trigger

```bash
cd /Users/mickeylau/Sito
git commit --allow-empty -m "Trigger Vercel deployment"
git push origin main
```

This will trigger Vercel webhook if it's connected.

## Verify Latest Code is on GitHub

```bash
git log origin/main --oneline -3
```

Should show:
- `37021da` - Latest
- `1f9aae1` - Custom descriptions
- `1db3ea9` - Import fix

## Check Vercel Project Settings

1. **Dashboard** → Project → **Settings** → **Git**
2. Verify:
   - Repository: `professorcathk-art/sito`
   - Production Branch: `main`
   - Latest Deployment: Should show commit `37021da`

## Recommended Action

**Best approach:**
1. Go to Vercel Dashboard → Project → Settings → Git
2. Disconnect and reconnect GitHub
3. This will pull latest code from GitHub and deploy

**Or:**
1. Add your email to Vercel team
2. Then CLI deployment will work with latest code
