# 🚀 Quick Setup: Add Stripe Keys to Vercel (2 Minutes)

## The Problem
Your `.env.local` file is **NOT** synced to Vercel. Environment variables must be set in Vercel's dashboard.

## Quick Steps

### 1. Go to Vercel Dashboard
👉 https://vercel.com/dashboard → Select your **sito** project

### 2. Go to Settings → Environment Variables
- Click **Settings** tab
- Click **Environment Variables** in left sidebar

### 3. Add These 4 Variables

**Click "Add New" for each:**

1. **STRIPE_SECRET_KEY**
   - Value: `sk_test_...` (from your .env.local)
   - ✅ Check: Production, Preview, Development
   - Click **Save**

2. **NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY**
   - Value: `pk_test_...` (from your .env.local)
   - ✅ Check: Production, Preview, Development
   - Click **Save**

3. **STRIPE_WEBHOOK_SECRET**
   - Value: `whsec_...` (from your .env.local)
   - ✅ Check: Production, Preview, Development
   - Click **Save**

4. **NEXT_PUBLIC_SITE_URL**
   - Value: `https://sito.club`
   - ✅ Check: Production, Preview, Development
   - Click **Save**

### 4. Redeploy
- Go to **Deployments** tab
- Click **⋯** (three dots) on latest deployment
- Click **Redeploy**

### 5. Test
Visit: `https://sito.club/dashboard/stripe-connect`
- ✅ Should NOT see "STRIPE_SECRET_KEY is not set" error
- ✅ Should see "Create Stripe Account" button

## 📋 Copy Your Keys from .env.local

Open your `.env.local` file and copy:
- Line with `STRIPE_SECRET_KEY=...`
- Line with `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=...`
- Line with `STRIPE_WEBHOOK_SECRET=...`

Paste these values into Vercel (without the variable name, just the value after `=`).

## ⚠️ Important Notes

- `.env.local` is **local only** - never synced to GitHub/Vercel
- You must set variables in **Vercel Dashboard** for production
- Variables only apply to **new deployments** - redeploy after adding
- Make sure to check **all environments** (Production, Preview, Development)

---

**Done?** Test at: https://sito.club/dashboard/stripe-connect

