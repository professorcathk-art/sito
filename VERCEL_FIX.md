# Fix 404 Error on Vercel

## The Problem

Your build log shows:
```
Error: No Next.js version detected. Make sure your package.json has "next" in either "dependencies" or "devDependencies". Also check your Root Directory setting matches the directory of your package.json file.
```

**The issue:** Your project is in a `Sito/` subdirectory, but Vercel is looking in the root directory.

## Solution: Set Root Directory

Your project files are in the `Sito/` subdirectory, so Vercel needs to know where to look.

### Fix Root Directory Setting

1. Go to Vercel Dashboard
2. Click on your project **Settings**
3. Scroll down to **General** section
4. Find **Root Directory**
5. Click **Edit**
6. Change it from `.` (root) to **`Sito`**
7. Click **Save**
8. Go to **Deployments** tab
9. Click **Redeploy** on the latest deployment

### Also Verify Framework

While you're in Settings:
1. Find **Framework Preset**
2. Make sure it's set to **Next.js** (not "Other")
3. Click **Save**

### Option 2: Delete and Reimport (If above doesn't work)

1. Go to Vercel Dashboard
2. Click on your project **Settings**
3. Scroll to the bottom
4. Click **Delete Project**
5. Go to **Add New Project**
6. Import from GitHub: `professorcathk-art/sito`
7. **CRITICAL:** When configuring:
   - **Root Directory:** Set to **`Sito`** (NOT `.`)
   - **Framework Preset:** Select **Next.js**
   - Build Command: Should auto-fill as `npm run build`
   - Output Directory: Should auto-fill as `.next`
8. Add all environment variables
9. Click **Deploy**

## Verify Correct Configuration

After reconfiguring, your build log should show:
```
Running "npm run build"
Creating an optimized production build ...
✓ Compiled successfully
```

Instead of:
```
Running "vercel build"
Build Completed in /vercel/output [50ms]
```

## Environment Variables Checklist

Make sure these are set in Vercel:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `NEXT_PUBLIC_SITE_URL`

## After Fixing

Once you've changed the framework to Next.js and redeployed, the site should work correctly!

