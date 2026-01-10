# Google Domain Ownership Verification Guide

## Problem
Google OAuth is showing this error:
> 首頁網址「https://sito.club」的網站未註冊給您。請驗證首頁擁有權。
> (Homepage URL "https://sito.club" is not registered to you. Please verify homepage ownership.)

## Solution: Verify Domain Ownership

You need to verify that you own the domain `sito.club` through Google Search Console.

### Step 1: Go to Google Search Console

1. Visit [Google Search Console](https://search.google.com/search-console/welcome)
2. Sign in with the same Google account you use for Google Cloud Console

### Step 2: Add Your Property

1. Click **"Add Property"** (新增資源)
2. Select **"URL prefix"** method
3. Enter your homepage URL: `https://sito.club`
4. Click **"Continue"**

### Step 3: Choose Verification Method

Google will show you several verification methods. Choose **"HTML tag"** method:

1. Select **"HTML tag"** from the verification methods
2. Google will provide you with a meta tag that looks like this:
   ```html
   <meta name="google-site-verification" content="YOUR_UNIQUE_VERIFICATION_CODE" />
   ```
3. **Copy this meta tag** - you'll need to add it to your website

### Step 4: Add Meta Tag to Your Website

I've updated your `app/layout.tsx` file to include a placeholder for the verification code.

**You need to:**

1. Get your verification code from Google Search Console (from Step 3)
2. Update the `GOOGLE_SITE_VERIFICATION` environment variable in Vercel:
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add or update: `GOOGLE_SITE_VERIFICATION` = `YOUR_UNIQUE_VERIFICATION_CODE`
   - (Just the code, not the full meta tag)
3. Redeploy your application

**OR** if you prefer to hardcode it temporarily:

1. Edit `/app/layout.tsx`
2. Replace `process.env.GOOGLE_SITE_VERIFICATION` with your actual verification code
3. Commit and push

### Step 5: Verify in Google Search Console

1. After adding the meta tag and redeploying, go back to Google Search Console
2. Click **"Verify"** button
3. Google will check your website for the meta tag
4. If successful, you'll see a success message

### Step 6: Wait for Google OAuth to Recognize

After verification:
- It may take a few hours for Google OAuth to recognize the verification
- Check back in Google Cloud Console → OAuth consent screen
- The domain ownership error should disappear

## Alternative: DNS Verification

If HTML tag doesn't work, you can also verify via DNS:

1. In Google Search Console, choose **"DNS record"** method
2. Add a TXT record to your domain's DNS settings:
   - Type: `TXT`
   - Name: `@` (or root domain)
   - Value: The verification code Google provides
3. Wait for DNS propagation (can take up to 48 hours)
4. Click "Verify" in Google Search Console

## Troubleshooting

**Meta tag not found:**
- Make sure you redeployed after adding the environment variable
- Check that the meta tag appears in the page source (View Page Source)
- Verify the code matches exactly (no extra spaces)

**Still showing error:**
- Wait 24-48 hours for Google to re-check
- Make sure you're using the same Google account for Search Console and Cloud Console
- Try the DNS verification method instead

## Quick Checklist

- [ ] Added property in Google Search Console
- [ ] Got verification code from Google
- [ ] Added `GOOGLE_SITE_VERIFICATION` environment variable in Vercel
- [ ] Redeployed application
- [ ] Verified in Google Search Console
- [ ] Waited for Google OAuth to recognize (may take hours)
