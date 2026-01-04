# Stripe Webhook Setup Guide

## ⚠️ CRITICAL: Webhook Configuration Required

You **MUST** configure webhooks in Stripe Dashboard for automatic enrollment to work after payment.

## Step-by-Step Webhook Setup

### 1. Go to Stripe Dashboard
- Visit: https://dashboard.stripe.com/webhooks
- Make sure you're in **Test mode** or **Live mode** (depending on your environment)

### 2. Add Webhook Endpoint

Click **"+ Add endpoint"** (or **"+ Add destination"** if using Connected Accounts)

### 3. Configure Endpoint

**Endpoint URL:**
```
https://www.sito.club/api/stripe/webhooks
```

**Events to Listen For:**

You need to add **TWO separate webhook endpoints**:

#### Endpoint 1: Platform Events (for checkout.session.completed)
- **Events from:** Select **"Events on your account"** (Platform events)
- **Events to send:** Search and select:
  - ✅ `checkout.session.completed` ⚠️ **CRITICAL - Required for enrollment**
  - ✅ `account.updated` (optional - for account status tracking)
  - ✅ `account.application.deauthorized` (optional - for account disconnection)

#### Endpoint 2: Connected Account Events (for account updates)
- **Events from:** Select **"Events from connected accounts"**
- **Payload style:** Select **"Thin"** (required for V2 accounts)
- **Events to send:** Search and select:
  - ✅ `v2.core.account[requirements].updated`
  - ✅ `v2.core.account[.recipient].capability_status_updated`

### 4. Copy Webhook Secret

After creating the endpoint:
1. Click on the webhook endpoint you just created
2. Find **"Signing secret"** section
3. Click **"Reveal"** to show the secret
4. Copy the secret (starts with `whsec_...`)

### 5. Add Webhook Secret to Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add/Update:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```
   **Note:** If you have multiple webhook endpoints (e.g., one for platform events, one for connected accounts), you can use comma-separated secrets:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_secret1,whsec_secret2
   ```
4. Make sure to add it to **Production**, **Preview**, and **Development** environments
5. Redeploy your application

**Important:** The code will try each secret until one matches, so you can use multiple secrets if needed.

## Events Explained

### `checkout.session.completed` ⚠️ CRITICAL
- **When:** Customer completes payment
- **What it does:** Automatically creates enrollment in your database
- **Why needed:** Without this, users won't be enrolled after payment

### `account.updated`
- **When:** Connected account status changes
- **What it does:** Updates account onboarding status in database

### `account.application.deauthorized`
- **When:** Expert disconnects their Stripe account
- **What it does:** Marks account as disconnected in database

## Testing Webhooks

### Option 1: Use Stripe Dashboard
1. Go to your webhook endpoint in Stripe Dashboard
2. Click **"Send test webhook"**
3. Select `checkout.session.completed`
4. Click **"Send test webhook"**
5. Check your Vercel logs to see if it was received

### Option 2: Use Stripe CLI (Local Testing)
```bash
# Install Stripe CLI
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/stripe/webhooks

# Trigger test event
stripe trigger checkout.session.completed
```

## Verify Webhook is Working

After setup, test by:
1. Creating a test product
2. Making a test purchase (use test card: `4242 4242 4242 4242`)
3. Check Vercel logs for webhook receipt
4. Verify enrollment was created in your database

## Troubleshooting

### Webhook Not Receiving Events
- ✅ Check endpoint URL is correct: `https://www.sito.club/api/stripe/webhooks`
- ✅ Verify `STRIPE_WEBHOOK_SECRET` is set in Vercel
- ✅ Check webhook is enabled in Stripe Dashboard
- ✅ Verify events are selected in webhook configuration

### Enrollment Not Created After Payment
- ✅ Check webhook logs in Stripe Dashboard
- ✅ Check Vercel function logs for errors
- ✅ Verify `checkout.session.completed` event is selected
- ✅ Check that `course_id` and `user_id` are in checkout session metadata

### Webhook Signature Verification Failed
- ✅ Ensure `STRIPE_WEBHOOK_SECRET` matches the secret from Stripe Dashboard
- ✅ Make sure you're using the correct secret for Test vs Live mode
- ✅ Redeploy after updating environment variables

## Important Notes

1. **Test Mode vs Live Mode**: You need separate webhooks for Test and Live modes
2. **Webhook Secret**: Keep this secret secure - never commit to git
3. **Endpoint URL**: Must be HTTPS in production
4. **Multiple Events**: You can add multiple events to the same endpoint

