# Domain Update Guide: https://www.sito.club/

This guide will help you update all URLs from the old domain to the new domain: **https://www.sito.club/**

## 1. Vercel Environment Variables

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project: **Sito**
3. Go to **Settings** → **Environment Variables**
4. Find and update:
   - `NEXT_PUBLIC_SITE_URL` → Change to: `https://www.sito.club`
5. **Redeploy** your application after updating environment variables

## 2. Supabase Authentication URLs

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Authentication** → **URL Configuration**
4. Update the following URLs:

   **Site URL:**
   ```
   https://www.sito.club
   ```

   **Redirect URLs** (add these):
   ```
   https://www.sito.club/**
   https://www.sito.club/dashboard
   https://www.sito.club/profile/setup
   https://www.sito.club/messages
   https://www.sito.club/connections
   https://www.sito.club/products
   ```

5. **Save** the changes

## 3. Google OAuth Configuration

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Go to **APIs & Services** → **Credentials**
4. Find your **OAuth 2.0 Client ID** (the one used for Sito)
5. Click **Edit**
6. Under **Authorized redirect URIs**, update/add:
   ```
   https://www.sito.club/auth/callback
   ```
   (Supabase will handle the callback at this path)
7. **Save** the changes

## 4. Supabase OAuth Provider Settings

1. In Supabase Dashboard, go to **Authentication** → **Providers**
2. Find **Google** provider
3. Make sure the **Redirect URL** matches what you set in Google Cloud Console
4. The redirect URL should be:
   ```
   https://[your-project-ref].supabase.co/auth/v1/callback
   ```
   (This is automatically handled by Supabase, but verify it's correct)

## 5. Verify Changes

After making all changes:

1. **Wait 5-10 minutes** for changes to propagate
2. Test the following:
   - ✅ Visit https://www.sito.club/ - should load correctly
   - ✅ Sign up with email - should redirect correctly
   - ✅ Sign in with Google - should work and redirect correctly
   - ✅ Email notifications - links should point to new domain
   - ✅ Password reset emails - should work correctly

## 6. Check Email Templates (if using Resend)

If you're using Resend for email notifications, check that links in emails use the new domain. The code should automatically use `NEXT_PUBLIC_SITE_URL` environment variable, but verify:

- Product interest notifications
- Connection request notifications  
- Message notifications

## Quick Checklist

- [ ] Updated `NEXT_PUBLIC_SITE_URL` in Vercel to `https://www.sito.club`
- [ ] Updated Site URL in Supabase Authentication settings
- [ ] Added redirect URLs in Supabase Authentication settings
- [ ] Updated Google OAuth redirect URI to include new domain
- [ ] Redeployed Vercel application
- [ ] Tested email sign-up
- [ ] Tested Google sign-in
- [ ] Tested email notifications

## Important Notes

- **Vercel**: After updating environment variables, you MUST redeploy for changes to take effect
- **Supabase**: Changes take effect immediately, but may take a few minutes to propagate
- **Google OAuth**: Changes can take up to 10 minutes to propagate
- Always test in an incognito window to avoid cached redirects

## Troubleshooting

If Google sign-in doesn't work:
1. Check that the redirect URI in Google Cloud Console matches exactly
2. Verify Supabase callback URL is correct
3. Clear browser cache and try again
4. Check browser console for errors

If email links don't work:
1. Verify `NEXT_PUBLIC_SITE_URL` is set correctly in Vercel
2. Redeploy the application
3. Check that environment variable is available at build time

