# Alternative Ways to Deploy to Vercel

Since you can't find Git integration settings, here are alternative methods:

## Method 1: Vercel CLI (Recommended)

Deploy directly from your terminal:

### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

### Step 2: Login to Vercel

```bash
vercel login
```

This will open your browser to authenticate.

### Step 3: Link Your Project

```bash
cd /Users/mickeylau/Sito
vercel link
```

When prompted:
- **Set up and deploy?** → Yes
- **Which scope?** → Select your account
- **Link to existing project?** → Yes (if project exists) or No (to create new)
- **What's your project's name?** → `sito` (or your project name)
- **In which directory is your code located?** → `./` (current directory)

### Step 4: Deploy

**Preview deployment:**
```bash
vercel
```

**Production deployment:**
```bash
vercel --prod
```

This will deploy your code directly without needing GitHub integration!

---

## Method 2: Manual Deployment via Dashboard

### Step 1: Go to Vercel Dashboard

1. Go to: **https://vercel.com/dashboard**
2. Select your project: **sito**

### Step 2: Manual Deploy

1. Go to **Deployments** tab
2. Click **"..."** menu on any deployment
3. Click **"Redeploy"**
4. Or click **"Create Deployment"** button (if available)

### Step 3: Upload Files (If Available)

Some Vercel projects allow direct file upload:
1. Look for **"Import"** or **"Upload"** option
2. Upload your project files
3. Deploy

---

## Method 3: Check Project Settings Directly

### Step 1: Project Settings

1. Go to: **https://vercel.com/dashboard**
2. Click on your project: **sito**
3. Click **Settings** tab (gear icon)
4. Look for:
   - **Git** section
   - **General** section
   - **Deployments** section

### Step 2: Find Git Connection

In Settings, look for:
- **Connected Git Repository**
- **Git Provider**
- **Repository**
- **Disconnect** / **Connect** button

If you see "Disconnect", the repo is connected. If you see "Connect", click it.

---

## Method 4: GitHub Actions Workflow

Create a GitHub Actions workflow to deploy on push:

### Step 1: Create Workflow File

Create: `.github/workflows/vercel-deploy.yml`

```yaml
name: Deploy to Vercel

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install Vercel CLI
        run: npm install -g vercel
      
      - name: Deploy to Vercel
        run: vercel --prod --token ${{ secrets.VERCEL_TOKEN }} --yes
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
```

### Step 2: Get Vercel Tokens

1. Go to: **https://vercel.com/account/tokens**
2. Create a new token
3. Copy the token

### Step 3: Add Secrets to GitHub

1. Go to: **https://github.com/professorcathk-art/sito/settings/secrets/actions**
2. Add secrets:
   - `VERCEL_TOKEN` - Your Vercel token
   - `VERCEL_ORG_ID` - Found in Vercel project settings
   - `VERCEL_PROJECT_ID` - Found in Vercel project settings

### Step 4: Push Workflow

```bash
git add .github/workflows/vercel-deploy.yml
git commit -m "Add Vercel deployment workflow"
git push origin main
```

---

## Method 5: Check Vercel Dashboard Navigation

The Git integration might be in a different location:

### Try These Paths:

1. **Dashboard → Project → Settings → Git**
2. **Dashboard → Project → Settings → General → Git Repository**
3. **Dashboard → Team Settings → Integrations → GitHub**
4. **Account Settings → Integrations → GitHub**

### Look For:

- "Git" tab in Settings
- "Repository" section
- "Connected Git Provider"
- "Disconnect Git Repository" button
- "Connect Git Repository" button

---

## Method 6: Direct API Deployment

Use Vercel API directly:

### Get API Token

1. Go to: **https://vercel.com/account/tokens**
2. Create token

### Deploy via API

```bash
# Get project ID from Vercel dashboard URL or settings
PROJECT_ID="your-project-id"
VERCEL_TOKEN="your-token"

# Create deployment
curl -X POST "https://api.vercel.com/v13/deployments" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "sito",
    "project": "'$PROJECT_ID'",
    "gitSource": {
      "type": "github",
      "repo": "professorcathk-art/sito",
      "ref": "main"
    }
  }'
```

---

## Quick Test: Vercel CLI

**Fastest way to deploy right now:**

```bash
# Install CLI
npm install -g vercel

# Login
vercel login

# Deploy (from your project directory)
cd /Users/mickeylau/Sito
vercel --prod
```

This bypasses GitHub entirely and deploys directly!

---

## Finding Your Project Settings

If you can't find Git integration, try:

1. **Vercel Dashboard URL:**
   - `https://vercel.com/[your-team]/sito/settings`
   - Look for tabs: General, Git, Environment Variables, etc.

2. **Check Project Overview:**
   - Dashboard → Click project → Look for "Settings" in sidebar
   - Or click project name → Settings dropdown

3. **Team Settings:**
   - If using a team, check team-level integrations
   - Dashboard → Team Settings → Integrations

---

## Recommended: Use Vercel CLI

**Easiest and most reliable method:**

```bash
npm install -g vercel
vercel login
cd /Users/mickeylau/Sito
vercel --prod
```

This will:
- ✅ Deploy directly without GitHub
- ✅ Work with private repositories
- ✅ Give you full control
- ✅ Show deployment progress in terminal

---

**Try Vercel CLI first - it's the simplest solution!**
