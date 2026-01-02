# Vercel Deployment Guide

## Common 404 Error Fixes

If you're getting a 404 error on Vercel, check the following:

### 1. Environment Variables

Make sure all environment variables are set in Vercel Dashboard:

1. Go to your Vercel project → **Settings** → **Environment Variables**
2. Add the following variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://zyqjurzximonwpojeazp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_Pw741jqAbshYugXZZcizig_aCZN9vJs
SUPABASE_SERVICE_ROLE_KEY=sb_secret_Xu8vgXM2Spc8tybODD1nzQ_GG-corr8
RESEND_API_KEY=re_iH4pcquy_PMoPupZh4aYbnMBcSPtjDWoJ
NEXT_PUBLIC_SITE_URL=https://sito-xi.vercel.app
```

**Important:** After adding environment variables, you need to **redeploy** your application.

### 2. Check Build Logs

1. Go to Vercel Dashboard → Your Project → **Deployments**
2. Click on the latest deployment
3. Check the **Build Logs** for any errors

### 3. Verify Build Success

The build should show:
- ✓ Compiled successfully
- ✓ Linting and checking validity of types

### 4. Common Issues

#### Issue: Build fails with missing dependencies
**Solution:** Make sure `package.json` has all required dependencies

#### Issue: 404 on all routes
**Solution:** 
- Check that `next.config.mjs` is correct
- Verify `vercel.json` is in the root directory
- Ensure environment variables are set

#### Issue: API routes return 404
**Solution:** Make sure API routes are in `app/api/` directory

### 5. Redeploy After Changes

After fixing issues:
1. Push changes to GitHub
2. Vercel will automatically redeploy
3. Or manually trigger redeploy in Vercel Dashboard

### 6. Check Function Logs

If specific features aren't working:
1. Go to Vercel Dashboard → Your Project → **Functions**
2. Check logs for runtime errors

## Quick Checklist

- [ ] All environment variables are set in Vercel
- [ ] Build completes successfully (check logs)
- [ ] No TypeScript/ESLint errors
- [ ] `vercel.json` exists in root directory
- [ ] `next.config.mjs` is properly configured
- [ ] Supabase migrations are run
- [ ] Storage bucket and policies are set up

## Need Help?

If the 404 persists after checking all above:
1. Check Vercel deployment logs
2. Verify the deployment is using the correct branch (main)
3. Try redeploying from Vercel Dashboard

