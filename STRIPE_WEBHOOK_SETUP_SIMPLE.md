# Stripe Webhook Setup - Step by Step Guide

## ⚠️ CRITICAL: This is Required for Purchases to Show Up

Without the webhook, purchases won't automatically create enrollments/appointments in your database.

## Step-by-Step Setup

### Step 1: Go to Stripe Dashboard

1. Visit: https://dashboard.stripe.com/webhooks
2. Make sure you're in **Test mode** (toggle in top right) if testing, or **Live mode** for production

### Step 2: Add Webhook Endpoint

1. Click **"+ Add endpoint"** button (top right)

### Step 3: Configure Endpoint URL

**Endpoint URL:**
```
https://www.sito.club/api/stripe/webhooks
```

Paste this exact URL into the "Endpoint URL" field.

### Step 4: Select Events

**IMPORTANT:** You need to select **"Events on your account"** (Platform events)

Then, in the "Events to send" section, search for and select:

✅ **`checkout.session.completed`** ⚠️ **THIS IS CRITICAL - REQUIRED**

Optional but recommended:
- `account.updated`
- `account.application.deauthorized`

### Step 5: Save the Endpoint

Click **"Add endpoint"** or **"Save"** button

### Step 6: Copy Webhook Secret

1. After creating, click on your webhook endpoint (it will show in the list)
2. Scroll down to **"Signing secret"** section
3. Click **"Reveal"** button to show the secret
4. Copy the secret (it starts with `whsec_...`)
   - Example: `whsec_1234567890abcdef...`

### Step 7: Add Secret to Vercel

1. Go to: https://vercel.com/dashboard
2. Select your **sito** project
3. Go to **Settings** → **Environment Variables**
4. Click **"Add New"**
5. Add:
   - **Key:** `STRIPE_WEBHOOK_SECRET`
   - **Value:** `whsec_...` (paste the secret you copied)
   - ✅ Check: **Production**, **Preview**, **Development**
6. Click **"Save"**

### Step 8: Redeploy

After adding the environment variable:
1. Go to **Deployments** tab
2. Click **⋯** (three dots) on latest deployment
3. Click **"Redeploy"**
   - OR just push a new commit to trigger auto-deploy

## Verify Setup

### Check Webhook is Working:

1. Go back to Stripe Dashboard → Webhooks
2. Click on your webhook endpoint
3. Go to **"Recent events"** tab
4. Make a test purchase
5. You should see `checkout.session.completed` events appear

### Test Purchase:

1. Use test card: `4242 4242 4242 4242`
2. Complete a purchase
3. Check:
   - Stripe Dashboard → Payments (should show the payment)
   - Your app → Purchase History (should show the purchase)
   - Your app → My Bookings (should show appointment if applicable)

## Troubleshooting

### Webhook Not Receiving Events?

1. ✅ Check endpoint URL is exactly: `https://www.sito.club/api/stripe/webhooks`
2. ✅ Verify `STRIPE_WEBHOOK_SECRET` is set in Vercel
3. ✅ Make sure webhook is **enabled** (not disabled)
4. ✅ Check you selected `checkout.session.completed` event
5. ✅ Make sure you're in the correct mode (Test vs Live)

### Events Not Showing in Stripe?

- Check "Recent events" tab in your webhook endpoint
- If no events appear, the webhook might not be receiving them
- Check Vercel function logs for `/api/stripe/webhooks`

### Signature Verification Failed?

- Make sure `STRIPE_WEBHOOK_SECRET` matches the secret from Stripe Dashboard
- Redeploy after adding the secret
- Check you're using the correct secret for Test vs Live mode

## Important Notes

1. **Test Mode vs Live Mode:** You need separate webhooks for Test and Live modes
2. **Webhook Secret:** Keep this secret secure - never commit to git
3. **Endpoint URL:** Must be HTTPS in production
4. **Multiple Secrets:** If you have multiple webhook endpoints, you can use comma-separated secrets:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_secret1,whsec_secret2
   ```

## Quick Checklist

- [ ] Created webhook endpoint in Stripe Dashboard
- [ ] Endpoint URL: `https://www.sito.club/api/stripe/webhooks`
- [ ] Selected `checkout.session.completed` event
- [ ] Copied webhook secret (`whsec_...`)
- [ ] Added `STRIPE_WEBHOOK_SECRET` to Vercel environment variables
- [ ] Redeployed application
- [ ] Tested with test card `4242 4242 4242 4242`
- [ ] Verified payment appears in Stripe Dashboard
- [ ] Verified purchase appears in Purchase History

## Still Not Working?

Even with webhook set up, the **fallback mechanism** (verify-payment API) will create records from the success page. So purchases should show up even if webhook hasn't fired yet.

If purchases still don't show:
1. Check browser console for errors
2. Check Vercel function logs
3. Use debug endpoint: `/api/stripe/debug/check-session?session_id=YOUR_SESSION_ID`
