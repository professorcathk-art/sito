# Deploy to Vercel - Step by Step

## Current Status
✅ Vercel CLI is installed (`/usr/local/bin/vercel`)
❌ Not logged in (needs authentication)

## Option 1: Login and Deploy (Recommended)

### Step 1: Login to Vercel

Open your terminal and run:

```bash
cd /Users/mickeylau/Sito
vercel login
```

This will:
1. Open your browser
2. Ask you to authorize Vercel CLI
3. Complete authentication automatically

### Step 2: Deploy

After login, run:

```bash
vercel --prod
```

When prompted:
- **Set up and deploy?** → Yes
- **Which scope?** → Select your account/team
- **Link to existing project?** → Yes (if project exists)
- **What's your project's name?** → `sito`
- **In which directory is your code located?** → `./` (press Enter)

---

## Option 2: Use Vercel Token (Non-Interactive)

### Step 1: Get Vercel Token

1. Go to: **https://vercel.com/account/tokens**
2. Click **"Create Token"**
3. Name it: `CLI Deployment`
4. Copy the token

### Step 2: Set Token and Deploy

```bash
cd /Users/mickeylau/Sito

# Set token as environment variable
export VERCEL_TOKEN="your-token-here"

# Deploy
vercel --prod --token $VERCEL_TOKEN --yes
```

Or use it directly:

```bash
vercel --prod --token YOUR_TOKEN_HERE --yes
```

---

## Option 3: Manual Redeploy via Dashboard

If CLI doesn't work:

1. Go to: **https://vercel.com/dashboard**
2. Select project: **sito**
3. Go to **Deployments** tab
4. Click **"..."** on latest deployment
5. Click **"Redeploy"**

---

## Quick Commands

**After logging in:**

```bash
cd /Users/mickeylau/Sito
vercel --prod
```

**With token:**

```bash
cd /Users/mickeylau/Sito
vercel --prod --token YOUR_TOKEN --yes
```

---

## Troubleshooting

### "Not logged in" error
→ Run `vercel login` first

### "Permission denied" 
→ Vercel CLI is installed, just need to login

### "Project not found"
→ Make sure project name matches: `sito`

### Want to see what will be deployed?
```bash
vercel --dry-run
```

---

**Next Step:** Run `vercel login` in your terminal, then `vercel --prod`
