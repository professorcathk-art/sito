# Fix Google OAuth Consent Screen to Show Sito.Club

## Problem
Google OAuth consent screen shows:
> "Choose an account to continue to zyqjurzximonwpojeazp.supabase.co"

Instead of showing "Sito.Club"

## Solution: Update Google OAuth Consent Screen Settings

### Step 1: Go to Google Cloud Console

1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (the one used for Sito)
3. Navigate to **APIs & Services** → **OAuth consent screen**

### Step 2: Update OAuth Consent Screen Settings

#### 2.1 App Information
- **App name**: `Sito` or `Sito.Club`
- **User support email**: Your email (e.g., professor.cat.hk@gmail.com)
- **App logo**: Upload your Sito logo (optional but recommended)
- **Application home page**: `https://sito.club`
- **Application privacy policy link**: `https://sito.club/privacy`
- **Application terms of service link**: `https://sito.club/terms`
- **Authorized domains**: Add `sito.club` (without https://)

#### 2.2 Scopes
- Keep the existing scopes (usually `email`, `profile`, `openid`)

#### 2.3 Test Users (if in Testing mode)
- Add test users if your app is in testing mode

### Step 3: Update Authorized Domains

**Important:** In the OAuth consent screen:

1. Scroll down to **"Authorized domains"** section
2. **Remove** `zyqjurzximonwpojeazp.supabase.co` if it's listed (you can remove it)
3. Click **"+ ADD DOMAIN"** 
4. Enter: `sito.club` (just the domain, no https:// or www)
5. Click **"Add"**
6. **Save** the changes

**Note:** 
- **Authorized domains** (in OAuth consent screen) = Controls what domain name shows to users
- **Authorized redirect URIs** (in Credentials) = Technical requirement, must keep Supabase callback URL
- You can remove Supabase domain from "Authorized domains" - it only affects what users see
- You MUST keep Supabase callback URL in "Authorized redirect URIs" for OAuth to work

### Step 4: Verify Domain Ownership

If Google asks you to verify domain ownership:

1. You should have already verified `sito.club` in Google Search Console (from the previous guide)
2. If not verified yet, follow the steps in `GOOGLE_DOMAIN_VERIFICATION.md`
3. Once verified in Search Console, Google Cloud Console should recognize it

### Step 5: Update Authorized Redirect URIs

**Important:** Keep the Supabase callback URL in redirect URIs, but the consent screen will show your domain:

1. Go to **APIs & Services** → **Credentials**
2. Click on your **OAuth 2.0 Client ID**
3. Under **Authorized redirect URIs**, make sure you have:
   ```
   https://zyqjurzximonwpojeazp.supabase.co/auth/v1/callback
   ```
   (Keep this - Supabase needs it for the callback)
4. **Save** the changes

### Step 6: Submit for Verification (if needed)

If your app is in "Testing" mode and you want to make it public:

1. In OAuth consent screen, click **"PUBLISH APP"**
2. Google may ask for verification
3. Complete the verification process
4. Once approved, the consent screen will show "Sito.Club" instead of the Supabase URL

## Why This Happens

- Google shows domains from **"Authorized domains"** in the consent screen
- By adding `sito.club` to **Authorized domains** and removing `zyqjurzximonwpojeazp.supabase.co`, Google will show your domain
- The Supabase callback URL (`zyqjurzximonwpojeazp.supabase.co/auth/v1/callback`) must stay in **"Authorized redirect URIs"** (under Credentials) for OAuth to work technically, but users won't see it in the consent screen

## Key Difference

- **Authorized domains** (OAuth consent screen) = What users see → Remove Supabase domain, keep only `sito.club`
- **Authorized redirect URIs** (Credentials) = Technical requirement → Must keep Supabase callback URL

## Expected Result

After these changes:
- Users will see: **"Choose an account to continue to Sito.Club"**
- Instead of: "Choose an account to continue to zyqjurzximonwpojeazp.supabase.co"

## Important Notes

- Changes may take **24-48 hours** to propagate
- Make sure `sito.club` is verified in Google Search Console first
- The redirect URI (Supabase callback) must remain unchanged for OAuth to function
- If you're in testing mode, you may need to add test users

## Quick Checklist

- [ ] Updated App name to "Sito" or "Sito.Club"
- [ ] Set Application home page to `https://sito.club`
- [ ] Added Privacy Policy link: `https://sito.club/privacy`
- [ ] Added Terms of Service link: `https://sito.club/terms`
- [ ] Added `sito.club` to Authorized domains
- [ ] Verified domain ownership in Google Search Console
- [ ] Saved all changes
- [ ] Published app (if moving from Testing to Production)
