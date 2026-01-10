# 🚀 Switching Stripe to Live Mode

This guide will help you switch from Stripe test/sandbox mode to live/production mode.

## ⚠️ Important Notes Before Switching

1. **Test thoroughly in test mode first** - Make sure everything works before going live
2. **Live mode charges real money** - All transactions will be real payments
3. **You need a verified Stripe account** - Complete Stripe account verification first
4. **Webhooks must be reconfigured** - Live mode requires separate webhook endpoints

## Step-by-Step Guide

### Step 1: Get Your Live Mode API Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. **Toggle to Live mode** (switch in the top right corner)
3. Navigate to **Developers** → **API keys**
4. Copy your **Live mode** keys:
   - **Secret key** (starts with `sk_live_...`)
   - **Publishable key** (starts with `pk_live_...`)

### Step 2: Update Local Environment Variables

Update your `.env.local` file:

```bash
# Replace test keys with live keys
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...  # Will update in Step 3
```

**Note:** Keep your test keys commented out for local testing:
```bash
# Test mode keys (for local testing)
# STRIPE_SECRET_KEY=sk_test_...
# NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### Step 3: Set Up Live Mode Webhooks

1. In Stripe Dashboard (Live mode), go to **Developers** → **Webhooks**
2. Click **"+ Add endpoint"** (or **"+ Add destination"** for Connected Accounts)

#### Webhook Endpoint 1: Platform Events

- **Endpoint URL:** `https://www.sito.club/api/stripe/webhooks`
- **Events from:** Select **"Events on your account"** (Platform events)
- **Events to send:**
  - ✅ `checkout.session.completed` ⚠️ **CRITICAL**
  - ✅ `charge.refunded` (for refund webhooks)
  - ✅ `account.updated` (optional)
  - ✅ `account.application.deauthorized` (optional)

#### Webhook Endpoint 2: Connected Account Events (if using Stripe Connect)

- **Endpoint URL:** `https://www.sito.club/api/stripe/webhooks`
- **Events from:** Select **"Events from connected accounts"**
- **Payload style:** Select **"Thin"** (required for V2 accounts)
- **Events to send:**
  - ✅ `v2.core.account[requirements].updated`
  - ✅ `v2.core.account[.recipient].capability_status_updated`

3. After creating each endpoint, click on it and copy the **Signing secret** (starts with `whsec_...`)

### Step 4: Update Vercel Environment Variables

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your **sito** project
3. Navigate to **Settings** → **Environment Variables**
4. Update these variables for **Production** environment:

   ```
   STRIPE_SECRET_KEY=sk_live_...
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
   STRIPE_WEBHOOK_SECRET=whsec_...  # Or comma-separated if multiple endpoints
   ```

   **Important:**
   - ✅ Update **Production** environment
   - ✅ Keep **Preview** and **Development** with test keys if you want
   - ✅ If you have multiple webhook secrets, use comma-separated: `whsec_secret1,whsec_secret2`

5. Click **Save**

### Step 5: Redeploy Your Application

After updating environment variables:

1. Go to **Deployments** tab in Vercel
2. Click **⋯** (three dots) on the latest deployment
3. Click **"Redeploy"**
   - OR push a new commit to trigger auto-deploy

### Step 6: Verify Live Mode Setup

1. **Check API keys are live:**
   - Make a test purchase (use a real card or Stripe test card in live mode)
   - Check Vercel logs to confirm no "test mode" errors

2. **Verify webhooks are working:**
   - Go to Stripe Dashboard → **Developers** → **Webhooks**
   - Click on your webhook endpoint
   - Check **"Recent events"** - you should see events being received
   - Check Vercel logs for webhook processing

3. **Test a real transaction:**
   - Create a small test product
   - Make a purchase with a real card
   - Verify payment appears in Stripe Dashboard
   - Verify enrollment/appointment is created in your database

## Key Differences: Test vs Live Mode

| Feature | Test Mode | Live Mode |
|---------|-----------|-----------|
| API Keys | `sk_test_...`, `pk_test_...` | `sk_live_...`, `pk_live_...` |
| Payments | Fake/test cards only | Real money transactions |
| Webhooks | Separate test endpoints | Separate live endpoints |
| Dashboard | Test mode toggle ON | Test mode toggle OFF |
| Verification | Not required | Account verification required |

## Troubleshooting

### "Invalid API key" error
- ✅ Verify you're using live keys (`sk_live_...`, `pk_live_...`)
- ✅ Check keys are copied correctly (no extra spaces)
- ✅ Ensure keys are from Live mode dashboard (not Test mode)

### Webhooks not working
- ✅ Verify webhook endpoint URL is correct: `https://www.sito.club/api/stripe/webhooks`
- ✅ Check `STRIPE_WEBHOOK_SECRET` is set in Vercel (Production environment)
- ✅ Verify webhook secret matches the one from Live mode dashboard
- ✅ Check webhook is enabled in Stripe Dashboard
- ✅ Verify events are selected in webhook configuration

### Payments not processing
- ✅ Ensure Stripe account is fully verified
- ✅ Check account status in Stripe Dashboard
- ✅ Verify connected accounts (experts) have completed onboarding
- ✅ Check Vercel logs for API errors

### Still seeing test mode behavior
- ✅ Clear browser cache
- ✅ Verify environment variables are updated in Vercel
- ✅ Ensure you redeployed after updating variables
- ✅ Check you're accessing the production URL (not preview)

## Switching Back to Test Mode

If you need to switch back to test mode:

1. Update `.env.local` with test keys
2. Update Vercel environment variables (Preview/Development) with test keys
3. Use test mode webhook endpoints
4. Redeploy

## Security Checklist

Before going live:

- [ ] Stripe account is fully verified
- [ ] All environment variables are set correctly
- [ ] Webhooks are configured and tested
- [ ] SSL certificate is active (HTTPS)
- [ ] Error handling is in place
- [ ] Refund system is tested
- [ ] Connected accounts (experts) understand live mode
- [ ] Terms of Service and Privacy Policy are updated
- [ ] Customer support process is ready

## Additional Resources

- [Stripe Dashboard](https://dashboard.stripe.com)
- [Stripe API Keys](https://dashboard.stripe.com/apikeys)
- [Stripe Webhooks](https://dashboard.stripe.com/webhooks)
- [Stripe Account Verification](https://dashboard.stripe.com/account)
- [Stripe Testing Guide](./STRIPE_TESTING_GUIDE.md)
