# 🚀 Stripe Live Mode Deployment Checklist

## ✅ Step 1: Local Environment Updated

Your `.env.local` has been updated with live keys:
- ✅ `STRIPE_SECRET_KEY` = `sk_live_...`
- ✅ `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` = `pk_live_...`
- ✅ `STRIPE_WEBHOOK_SECRET` = `whsec_...`

**⚠️ IMPORTANT:** `.env.local` is in `.gitignore` and will NOT be committed to GitHub.

## 📋 Step 2: Update Vercel Environment Variables

### Go to Vercel Dashboard:
1. Visit: https://vercel.com/dashboard
2. Select your **sito** project
3. Go to **Settings** → **Environment Variables**

### Update These Variables for **Production** Environment:

```
STRIPE_SECRET_KEY=sk_live_... (Your live secret key from Stripe Dashboard)
```

```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_... (Your live publishable key from Stripe Dashboard)
```

```
STRIPE_WEBHOOK_SECRET=whsec_... (Your webhook secret from Stripe Dashboard)
```

**Important:**
- ✅ Make sure to select **Production** environment
- ✅ If you want to keep test mode for Preview/Development, leave those unchanged
- ✅ Click **Save** after adding each variable

## 🔗 Step 3: Configure Live Mode Webhooks in Stripe Dashboard

### Go to Stripe Dashboard (Live Mode):
1. Visit: https://dashboard.stripe.com
2. **Toggle to Live mode** (switch in top right corner)
3. Navigate to **Developers** → **Webhooks**
4. Click **"+ Add endpoint"**

### Webhook Endpoint Configuration:

**Endpoint URL:**
```
https://www.sito.club/api/stripe/webhooks
```

### Required Events to Select:

#### ⚠️ CRITICAL - Platform Events (Select "Events on your account"):

1. ✅ **`checkout.session.completed`** ⚠️ **REQUIRED**
   - **Purpose:** Automatically creates course enrollments and appointments after payment
   - **Why critical:** Without this, users won't be enrolled after payment

2. ✅ **`charge.refunded`** ⚠️ **REQUIRED**
   - **Purpose:** Updates refund status in database when refunds are processed
   - **Why critical:** Tracks refund status for course enrollments and appointments

3. ✅ **`account.updated`** (Recommended)
   - **Purpose:** Updates Stripe Connect account status when experts complete onboarding
   - **Why useful:** Keeps account status in sync

4. ✅ **`account.application.deauthorized`** (Recommended)
   - **Purpose:** Marks account as disconnected when expert disconnects Stripe
   - **Why useful:** Prevents issues with disconnected accounts

### Optional - Connected Account Events (If using Stripe Connect):

If you're using Stripe Connect for expert payouts, also create a second endpoint:

**Endpoint URL:** Same as above: `https://www.sito.club/api/stripe/webhooks`

**Configuration:**
- **Events from:** Select **"Events from connected accounts"**
- **Payload style:** Select **"Thin"** (required for V2 accounts)
- **Events to send:**
  - ✅ `v2.core.account[requirements].updated`
  - ✅ `v2.core.account[.recipient].capability_status_updated`

**Note:** If you create multiple webhook endpoints, you can use comma-separated secrets in Vercel:
```
STRIPE_WEBHOOK_SECRET=whsec_secret1,whsec_secret2
```

### After Creating Webhook Endpoint:

1. Click on the webhook endpoint you just created
2. Scroll to **"Signing secret"** section
3. Click **"Reveal"** to show the secret
4. **Verify** it matches: `whsec_SdhqSdtyGasSMH1cZMuN1F4DYQTJ8xtU`
5. If different, update `STRIPE_WEBHOOK_SECRET` in Vercel

## 🚀 Step 4: Redeploy Application

After updating Vercel environment variables:

1. Go to **Deployments** tab in Vercel
2. Click **⋯** (three dots) on the latest deployment
3. Click **"Redeploy"**
   - OR push a new commit to trigger auto-deploy

## ✅ Step 5: Verify Live Mode Setup

### Test 1: Check API Keys Are Live
1. Make a small test purchase (use a real card or Stripe test card in live mode)
2. Check Vercel logs - should NOT see "test mode" errors
3. Verify payment appears in Stripe Dashboard (Live mode)

### Test 2: Verify Webhooks Are Working
1. Go to Stripe Dashboard → **Developers** → **Webhooks**
2. Click on your webhook endpoint
3. Check **"Recent events"** tab
4. You should see events being received (green checkmarks)
5. Check Vercel logs for webhook processing messages

### Test 3: Test Complete Flow
1. Create a test product in your app
2. Make a purchase with a real card
3. Verify:
   - ✅ Payment appears in Stripe Dashboard (Live mode)
   - ✅ Enrollment/appointment is created in your database
   - ✅ Webhook events are received and processed
   - ✅ No errors in Vercel logs

## 🔍 Troubleshooting

### "Invalid API key" error
- ✅ Verify keys start with `sk_live_` and `pk_live_` (not `sk_test_` or `pk_test_`)
- ✅ Check keys are copied correctly (no extra spaces)
- ✅ Ensure keys are from Live mode dashboard (not Test mode)

### Webhooks not receiving events
- ✅ Verify webhook endpoint URL: `https://www.sito.club/api/stripe/webhooks`
- ✅ Check `STRIPE_WEBHOOK_SECRET` is set in Vercel (Production environment)
- ✅ Verify webhook secret matches the one from Live mode dashboard
- ✅ Check webhook is enabled in Stripe Dashboard
- ✅ Verify events are selected in webhook configuration
- ✅ Check Vercel logs for webhook errors

### Payments not processing
- ✅ Ensure Stripe account is fully verified
- ✅ Check account status in Stripe Dashboard → **Account**
- ✅ Verify connected accounts (experts) have completed onboarding
- ✅ Check Vercel logs for API errors

### Still seeing test mode behavior
- ✅ Clear browser cache
- ✅ Verify environment variables are updated in Vercel (Production)
- ✅ Ensure you redeployed after updating variables
- ✅ Check you're accessing production URL (not preview)

## 📝 Summary of Required Webhook Events

**Minimum Required Events:**
1. ✅ `checkout.session.completed` - Creates enrollments/appointments
2. ✅ `charge.refunded` - Updates refund status

**Recommended Additional Events:**
3. ✅ `account.updated` - Syncs account status
4. ✅ `account.application.deauthorized` - Handles disconnections

**For Stripe Connect (if applicable):**
5. ✅ `v2.core.account[requirements].updated` - Account requirements
6. ✅ `v2.core.account[.recipient].capability_status_updated` - Capability status

## 🔐 Security Reminders

- ✅ Never commit `.env.local` to GitHub (already in `.gitignore`)
- ✅ Never expose `STRIPE_SECRET_KEY` to client-side code
- ✅ Always use HTTPS for webhook endpoints
- ✅ Verify webhook signatures (already implemented)
- ✅ Keep webhook secrets secure

## 📞 Next Steps

1. ✅ Update Vercel environment variables
2. ✅ Configure webhooks in Stripe Dashboard (Live mode)
3. ✅ Redeploy application
4. ✅ Test with a small real transaction
5. ✅ Monitor webhook events and logs

---

**Need Help?** Check the logs:
- Vercel: Dashboard → Your Project → Logs
- Stripe: Dashboard → Developers → Webhooks → Your Endpoint → Recent events
