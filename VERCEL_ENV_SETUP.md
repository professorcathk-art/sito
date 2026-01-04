# Setting Up Environment Variables in Vercel

## ⚠️ Important: .env.local is NOT synced to GitHub/Vercel

The `.env.local` file is in `.gitignore` and will **NOT** be deployed to Vercel. You need to set environment variables directly in Vercel's dashboard.

## Step-by-Step: Add Environment Variables to Vercel

### Method 1: Vercel Dashboard (Recommended)

1. **Go to Vercel Dashboard**
   - Visit: https://vercel.com/dashboard
   - Select your project: **sito**

2. **Navigate to Settings**
   - Click on your project
   - Go to **Settings** tab
   - Click **Environment Variables** in the left sidebar

3. **Add Each Variable**

   Add these 4 environment variables:

   **Variable 1:**
   - **Key:** `STRIPE_SECRET_KEY`
   - **Value:** `sk_test_...` (your Stripe secret key)
   - **Environment:** Select all (Production, Preview, Development)
   - Click **Save**

   **Variable 2:**
   - **Key:** `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - **Value:** `pk_test_...` (your Stripe publishable key)
   - **Environment:** Select all (Production, Preview, Development)
   - Click **Save**

   **Variable 3:**
   - **Key:** `STRIPE_WEBHOOK_SECRET`
   - **Value:** `whsec_...` (your webhook secret)
   - **Environment:** Select all (Production, Preview, Development)
   - Click **Save**

   **Variable 4:**
   - **Key:** `NEXT_PUBLIC_SITE_URL`
   - **Value:** `https://sito.club`
   - **Environment:** Select all (Production, Preview, Development)
   - Click **Save**

4. **Redeploy**
   - After adding variables, go to **Deployments** tab
   - Click **⋯** (three dots) on latest deployment
   - Click **Redeploy**
   - Or push a new commit to trigger automatic deployment

### Method 2: Vercel CLI (Alternative)

If you have Vercel CLI installed:

```bash
# Install Vercel CLI if not installed
npm i -g vercel

# Login to Vercel
vercel login

# Link your project (if not already linked)
vercel link

# Add environment variables
vercel env add STRIPE_SECRET_KEY
# Paste your key when prompted
# Select environments: Production, Preview, Development

vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
# Paste your key when prompted
# Select environments: Production, Preview, Development

vercel env add STRIPE_WEBHOOK_SECRET
# Paste your key when prompted
# Select environments: Production, Preview, Development

vercel env add NEXT_PUBLIC_SITE_URL
# Enter: https://sito.club
# Select environments: Production, Preview, Development

# Pull environment variables to verify
vercel env pull .env.local
```

## Verify Your .env.local File (Local Development)

Your local `.env.local` should look like this:

```bash
# Stripe Keys
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Site URL
NEXT_PUBLIC_SITE_URL=https://sito.club

# Supabase (if you have these)
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## Important Notes

1. **Never commit .env.local to GitHub** - It's in `.gitignore` for security
2. **Vercel environment variables are separate** - They don't sync from your local file
3. **Restart dev server** - After changing `.env.local`, restart `npm run dev`
4. **Redeploy after adding variables** - Vercel needs a new deployment to pick up new env vars

## Testing After Setup

1. **Local Testing:**
   ```bash
   npm run dev
   # Visit: http://localhost:3000/dashboard/stripe-connect
   ```

2. **Vercel Testing:**
   - Wait for deployment to complete
   - Visit: `https://sito.club/dashboard/stripe-connect`
   - Should NOT see "STRIPE_SECRET_KEY is not set" error

## Troubleshooting

### Still seeing "STRIPE_SECRET_KEY is not set" in Vercel?

1. **Check variable names** - Must be exactly:
   - `STRIPE_SECRET_KEY` (not `STRIPE_SECRET_KEYS` or `STRIPE_KEY`)
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (must start with `NEXT_PUBLIC_`)

2. **Check environments** - Make sure variables are added to:
   - ✅ Production
   - ✅ Preview  
   - ✅ Development

3. **Redeploy** - Variables only apply to NEW deployments:
   - Go to Deployments → Click ⋯ → Redeploy
   - Or push a new commit

4. **Check Vercel logs** - Go to Deployments → Click on deployment → View logs

### Variables not showing in build?

- **NEXT_PUBLIC_*** variables** - Available at build time and runtime
- **Other variables** - Only available at runtime (server-side)

Make sure `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` are server-side only (don't add `NEXT_PUBLIC_` prefix).

## Quick Checklist

- [ ] Added `STRIPE_SECRET_KEY` to Vercel (all environments)
- [ ] Added `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` to Vercel (all environments)
- [ ] Added `STRIPE_WEBHOOK_SECRET` to Vercel (all environments)
- [ ] Added `NEXT_PUBLIC_SITE_URL` to Vercel (all environments)
- [ ] Redeployed after adding variables
- [ ] Tested on `https://sito.club/dashboard/stripe-connect`
- [ ] No error messages showing

---

**Need help?** Check Vercel's docs: https://vercel.com/docs/concepts/projects/environment-variables


