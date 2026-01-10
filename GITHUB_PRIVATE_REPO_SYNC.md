# How to Sync Code to Private GitHub Repository

Since your GitHub repository is now **private**, here's how to sync your code and trigger Vercel deployments.

## ✅ Current Status

Your repository is already connected:
- **Remote:** `origin` → `https://github.com/professorcathk-art/sito.git`
- **Branch:** `main`
- **Status:** Up to date with origin/main

## Method 1: Using HTTPS (Recommended for Private Repos)

### Step 1: Set Up Authentication

You have two options:

#### Option A: Personal Access Token (PAT)

1. **Create a Personal Access Token:**
   - Go to: https://github.com/settings/tokens
   - Click **"Generate new token"** → **"Generate new token (classic)"**
   - Name it: `Sito Development`
   - Select scopes:
     - ✅ `repo` (Full control of private repositories)
   - Click **"Generate token"**
   - **Copy the token immediately** (you won't see it again!)

2. **Use Token When Pushing:**
   ```bash
   git push origin main
   # When prompted for password, paste your Personal Access Token
   ```

#### Option B: Configure Git Credential Helper

```bash
# Store credentials (one-time setup)
git config --global credential.helper store

# Then push normally - enter your GitHub username and PAT when prompted
git push origin main
```

### Step 2: Push Your Code

```bash
# Check status
git status

# Add changes (if any)
git add .

# Commit (if needed)
git commit -m "Your commit message"

# Push to GitHub
git push origin main
```

## Method 2: Using SSH (Alternative)

### Step 1: Set Up SSH Key

1. **Check if you have SSH keys:**
   ```bash
   ls -al ~/.ssh
   ```

2. **Generate SSH key (if needed):**
   ```bash
   ssh-keygen -t ed25519 -C "your_email@example.com"
   # Press Enter to accept default file location
   # Enter a passphrase (optional but recommended)
   ```

3. **Add SSH key to GitHub:**
   ```bash
   # Copy your public key
   cat ~/.ssh/id_ed25519.pub
   # Copy the output
   
   # Then:
   # 1. Go to: https://github.com/settings/keys
   # 2. Click "New SSH key"
   # 3. Paste your public key
   # 4. Click "Add SSH key"
   ```

### Step 2: Change Remote URL to SSH

```bash
# Change remote URL from HTTPS to SSH
git remote set-url origin git@github.com:professorcathk-art/sito.git

# Verify
git remote -v

# Test connection
ssh -T git@github.com

# Push normally
git push origin main
```

## Method 3: GitHub Desktop (Easiest)

If you prefer a GUI:

1. **Download GitHub Desktop:**
   - https://desktop.github.com/

2. **Sign in with your GitHub account**

3. **Clone your repository:**
   - File → Clone Repository
   - Select your `sito` repository
   - Choose local path

4. **Push changes:**
   - Make changes in your code
   - GitHub Desktop will show changes
   - Write commit message
   - Click "Commit to main"
   - Click "Push origin"

## Verifying Push Success

After pushing:

```bash
# Check remote status
git status

# Should show: "Your branch is up to date with 'origin/main'"

# View recent commits
git log --oneline -5
```

## Triggering Vercel Deployment

### Automatic Deployment

Vercel automatically deploys when you push to `main` branch:

1. **Push to GitHub:**
   ```bash
   git push origin main
   ```

2. **Check Vercel Dashboard:**
   - Go to: https://vercel.com/dashboard
   - Your project should show a new deployment starting
   - Wait for deployment to complete (usually 1-3 minutes)

### Manual Deployment (If Needed)

If automatic deployment doesn't trigger:

1. Go to: https://vercel.com/dashboard
2. Select your project
3. Go to **Deployments** tab
4. Click **"..."** on latest deployment
5. Click **"Redeploy"**

## Troubleshooting

### Error: "Authentication failed"

**Solution:** Use Personal Access Token instead of password
- GitHub no longer accepts passwords for HTTPS
- Create a PAT: https://github.com/settings/tokens

### Error: "Permission denied (publickey)"

**Solution:** Set up SSH keys (see Method 2 above)

### Error: "Repository not found"

**Solution:** 
- Verify repository is private and you have access
- Check you're using the correct remote URL
- Ensure you're authenticated

### Vercel Not Deploying

**Check:**
1. Vercel Dashboard → Settings → Git
2. Verify GitHub connection is active
3. Check deployment settings (should auto-deploy on push to `main`)

## Quick Commands Reference

```bash
# Check status
git status

# Add all changes
git add .

# Commit
git commit -m "Your message"

# Push to GitHub
git push origin main

# Check remote
git remote -v

# View recent commits
git log --oneline -5
```

## Security Notes

✅ **Good Practices:**
- Use Personal Access Tokens (not passwords)
- Use SSH keys for better security
- Keep tokens private (never commit them)
- Rotate tokens periodically

❌ **Don't:**
- Commit `.env.local` files
- Share tokens in chat or email
- Use the same token for multiple projects

---

**Your code is already synced!** The last commit was pushed successfully. Future pushes will trigger Vercel deployments automatically.
