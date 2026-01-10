# Fix Vercel Deployment for Private GitHub Repository

## Issue: Vercel Not Triggering After Making Repo Private

When you make a GitHub repository private, Vercel's webhook connection may need to be refreshed.

## Solution: Reconnect Vercel to GitHub

### Step 1: Check Vercel Project Settings

1. Go to: **https://vercel.com/dashboard**
2. Select your project: **sito**
3. Go to: **Settings** → **Git**

### Step 2: Reconnect GitHub Integration

**Option A: Refresh Connection**

1. In **Settings** → **Git**, you should see:
   - **Git Repository:** `professorcathk-art/sito`
   - **Production Branch:** `main`
   
2. Click **"Disconnect"** (if available)
3. Then click **"Connect Git Repository"**
4. Select **GitHub**
5. Authorize Vercel to access your GitHub account
6. Select your repository: `professorcathk-art/sito`
7. Click **"Import"**

**Option B: Re-authorize GitHub**

1. Go to: **https://vercel.com/account/integrations**
2. Find **GitHub** integration
3. Click **"Configure"** or **"Reconnect"**
4. Authorize Vercel to access your private repositories
5. Make sure **"Private repositories"** permission is granted

### Step 3: Verify Webhook Settings

1. Go to your GitHub repository: **https://github.com/professorcathk-art/sito**
2. Go to: **Settings** → **Webhooks**
3. Look for a webhook from Vercel (should show `vercel.com` in URL)
4. If missing, Vercel will create it automatically when you reconnect

### Step 4: Test Deployment

**Manual Trigger:**

1. Go to Vercel Dashboard → Your Project
2. Go to **Deployments** tab
3. Click **"..."** on the latest deployment
4. Click **"Redeploy"**

**Or Push a New Commit:**

```bash
# Make a small change
echo "# Test" >> README.md

# Commit and push
git add README.md
git commit -m "Test deployment"
git push origin main
```

### Step 5: Check Deployment Settings

In Vercel Dashboard → Settings → Git:

- ✅ **Production Branch:** Should be `main`
- ✅ **Root Directory:** Should be `.` (or leave empty)
- ✅ **Build Command:** Should be `npm run build` (or auto-detected)
- ✅ **Output Directory:** Should be `.next` (or auto-detected)
- ✅ **Install Command:** Should be `npm install` (or auto-detected)

## Troubleshooting

### Issue: "Repository not found"

**Solution:**
- Re-authorize GitHub integration
- Make sure you grant access to private repositories
- Verify repository name is correct

### Issue: "Webhook not receiving events"

**Solution:**
1. Go to GitHub → Repository → Settings → Webhooks
2. Check if Vercel webhook exists
3. If missing, reconnect Vercel integration
4. If exists but failing, click "Redeliver" on recent events

### Issue: "Deployment not triggering"

**Solution:**
1. Check Vercel Dashboard → Settings → Git → **Production Branch**
2. Make sure it's set to `main`
3. Push to `main` branch (not other branches)
4. Check GitHub repository → Settings → Webhooks for errors

### Issue: "Permission denied"

**Solution:**
1. Go to: **https://vercel.com/account/integrations**
2. Re-authorize GitHub
3. Make sure **"Private repositories"** is checked
4. Grant all necessary permissions

## Verify Connection

After reconnecting, verify:

1. **Vercel Dashboard:**
   - Settings → Git should show your repository
   - Recent deployments should show GitHub commits

2. **GitHub:**
   - Settings → Webhooks should show Vercel webhook
   - Recent webhook deliveries should show successful calls

3. **Test:**
   - Make a small commit and push
   - Check Vercel Dashboard for new deployment

## Alternative: Manual Deployment

If automatic deployment still doesn't work:

1. **Deploy via Vercel CLI:**
   ```bash
   npm install -g vercel
   vercel login
   vercel --prod
   ```

2. **Or use GitHub Actions:**
   - Set up GitHub Actions workflow to trigger Vercel deployments
   - More complex but reliable

## Quick Checklist

- [ ] Reconnected Vercel to GitHub
- [ ] Authorized private repository access
- [ ] Verified webhook exists in GitHub
- [ ] Checked Production Branch is `main`
- [ ] Tested with a new commit
- [ ] Verified deployment appears in Vercel Dashboard

---

**Most Common Fix:** Re-authorize GitHub integration and grant private repository access.
