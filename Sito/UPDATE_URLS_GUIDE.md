# Update URLs to New Domain: https://sito-smoky.vercel.app/

You need to update URLs in **3 places** for OAuth and redirects to work correctly.

## 1. Update Vercel Environment Variable

1. Go to **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**
2. Find `NEXT_PUBLIC_SITE_URL`
3. Click **Edit**
4. Change value from `https://sito-xi.vercel.app` to:
   ```
   https://sito-smoky.vercel.app
   ```
5. Click **Save**
6. **Redeploy** your project (Deployments → Redeploy)

## 2. Update Supabase Redirect URLs

1. Go to **Supabase Dashboard** → Your Project
2. Go to **Authentication** → **URL Configuration**
3. Update these fields:

   **Site URL:**
   ```
   https://sito-smoky.vercel.app
   ```

   **Redirect URLs:** Add these (one per line):
   ```
   https://sito-smoky.vercel.app/**
   https://sito-smoky.vercel.app/dashboard
   https://sito-smoky.vercel.app/profile/setup
   https://zyqjurzximonwpojeazp.supabase.co/auth/v1/callback
   ```

4. Click **Save**

## 3. Update Google OAuth Redirect URIs

1. Go to **Google Cloud Console**: https://console.cloud.google.com/
2. Select your project
3. Go to **APIs & Services** → **Credentials**
4. Click on your **OAuth 2.0 Client ID** (the one you created for Supabase)
5. Under **Authorized redirect URIs**, add/update:
   ```
   https://zyqjurzximonwpojeazp.supabase.co/auth/v1/callback
   ```
6. Click **Save**

**Note:** The Supabase callback URL stays the same - you don't need to change it. Supabase handles the redirect to your site URL automatically.

## Quick Checklist

- [ ] Updated `NEXT_PUBLIC_SITE_URL` in Vercel to `https://sito-smoky.vercel.app`
- [ ] Redeployed Vercel project after updating environment variable
- [ ] Updated Site URL in Supabase to `https://sito-smoky.vercel.app`
- [ ] Added redirect URLs in Supabase
- [ ] Verified Google OAuth redirect URI includes Supabase callback URL

## After Updates

1. **Redeploy** your Vercel project
2. Test Google login - it should redirect correctly after sign-in
3. Test email/password login - should work as before

## Troubleshooting

If sign-in still doesn't work:
- Clear browser cache and cookies
- Check Vercel deployment logs for errors
- Verify all URLs match exactly (no trailing slashes unless specified)
- Make sure you redeployed after changing environment variables

