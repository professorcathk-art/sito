# Webhook Setup for Pro Subscriptions

## ✅ Yes, You Can Use the Same Webhook!

Your existing webhook endpoint (`we_1SnijB2crJYsp2G8Z5sd1qdp`) can handle **both** marketplace events and subscription events. The webhook handler already supports multiple event types.

## 📋 Required: Add Subscription Events to Your Webhook

You need to add these subscription events to your existing webhook in Stripe Dashboard:

### Step 1: Go to Stripe Dashboard
1. Visit: https://dashboard.stripe.com/webhooks
2. Find your webhook endpoint: `we_1SnijB2crJYsp2G8Z5sd1qdp`
3. Click on it to edit

### Step 2: Add Subscription Events

In the **"Events to send"** section, add these events:

#### ✅ Required Subscription Events:
- **`customer.subscription.created`** - When a new Pro subscription is created
- **`customer.subscription.updated`** - When subscription status changes (renewed, canceled, etc.)
- **`customer.subscription.deleted`** - When subscription is canceled and period ends

#### ✅ Already Handled (Keep These):
- `checkout.session.completed` - Already handles subscription checkout
- `charge.refunded` - For refunds
- `account.updated` - For Stripe Connect accounts
- `account.application.deauthorized` - For account disconnection

### Step 3: Save Changes

Click **"Save changes"** at the bottom of the webhook configuration page.

## 🔍 How It Works

The webhook handler (`/app/api/stripe/webhooks/route.ts`) automatically:

1. **Detects event type** - Checks if it's a subscription event or marketplace event
2. **Routes accordingly** - Handles subscription events separately from marketplace events
3. **Updates database** - Creates/updates `saas_subscriptions` table
4. **Syncs Pro status** - Automatically updates `is_pro_store` in profiles via database trigger

## ✅ Verification

After adding the events, test by:

1. **Create a test subscription** via `/dashboard/storefront` → Click "Upgrade to Pro"
2. **Check webhook logs** in Stripe Dashboard → Your webhook → "Recent events"
3. **Verify database** - Check `saas_subscriptions` table in Supabase

## 📝 Summary

- ✅ **Same webhook endpoint**: `we_1SnijB2crJYsp2G8Z5sd1qdp`
- ✅ **Same webhook secret**: `whsec_SdhqSdtyGasSMH1cZMuN1F4DYQTJ8xtU`
- ✅ **Add 3 subscription events** to the existing webhook
- ✅ **No code changes needed** - handler already supports both

Your webhook will now handle:
- Marketplace payments (courses, appointments)
- Pro subscriptions
- Refunds
- Account updates

All in one endpoint! 🎉
