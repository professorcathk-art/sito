# Stripe Connect Testing Guide

This guide will help you test the Stripe Connect integration step by step.

## Prerequisites Checklist

- [x] Stripe keys added to `.env.local`
- [x] Webhook configured in Stripe Dashboard
- [x] Domain: sito.club

## Step 1: Verify Environment Variables

First, let's make sure your environment variables are set correctly:

```bash
# Check if variables are loaded (in your terminal)
cat .env.local | grep STRIPE
```

You should see:
- `STRIPE_SECRET_KEY=sk_test_...` (or `sk_live_...` for production)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...` (or `pk_live_...`)
- `STRIPE_WEBHOOK_SECRET=whsec_...`
- `NEXT_PUBLIC_SITE_URL=https://sito.club` (or `http://localhost:3000` for local)

**Important:** Restart your development server after adding environment variables:
```bash
npm run dev
```

## Step 2: Test Account Creation & Onboarding

### 2.1 Create a Stripe Connect Account

1. **Sign in** to your application at `https://sito.club` (or `http://localhost:3000`)
2. Go to **Dashboard** → **Payment Setup** (or navigate to `/dashboard/stripe-connect`)
3. Click **"Create Stripe Account"**
4. You should see:
   - ✅ Success message: "Account created successfully"
   - Account ID displayed (starts with `acct_`)

**Expected Result:** Account is created and stored in your database.

### 2.2 Start Onboarding

1. After account creation, click **"Onboard to Collect Payments"**
2. You'll be redirected to Stripe's hosted onboarding page
3. Fill out the onboarding form:
   - **Business type** (Individual or Company)
   - **Business details** (name, address, etc.)
   - **Bank account** (use test account: `000123456789`)
   - **Identity verification** (use test SSN: `000-00-0000`)

**Test Bank Account (US):**
- Account number: `000123456789`
- Routing number: `110000000`
- Account type: Checking

**Test Identity (US):**
- SSN: `000-00-0000`
- DOB: Any date

4. Complete all required fields
5. Submit the form
6. You'll be redirected back to `https://sito.club/dashboard/stripe-connect?accountId=acct_xxx`

**Expected Result:** 
- Status shows "Complete"
- "Payment Ready" shows "Yes"
- Green success message displayed

## Step 3: Test Product Creation

### 3.1 Create a Test Product

1. Navigate to `/dashboard/stripe-products` (or add this to your dashboard menu)
2. Fill out the product form:
   - **Name:** "Test Course"
   - **Description:** "This is a test product"
   - **Price:** `10.00` (or any amount)
   - **Currency:** USD
3. Click **"Create Product"**

**Expected Result:**
- Success message: "Product created successfully!"
- Product ID returned (starts with `prod_`)

### 3.2 Verify Product in Stripe Dashboard

1. Go to [Stripe Dashboard](https://dashboard.stripe.com) → **Products**
2. You should see your product listed
3. Check the metadata:
   - `connected_account_id` should match your account ID
   - `created_by_user_id` should match your user ID

## Step 4: Test Storefront & Checkout

### 4.1 View Storefront

1. Navigate to `/stripe/storefront`
2. You should see your product displayed:
   - Product name
   - Description
   - Price formatted correctly
   - "Buy Now" button

**Expected Result:** Product is visible and formatted correctly.

### 4.2 Test Purchase Flow

1. Click **"Buy Now"** on your test product
2. You'll be redirected to Stripe Checkout
3. Use Stripe test card:
   - **Card number:** `4242 4242 4242 4242`
   - **Expiry:** Any future date (e.g., `12/34`)
   - **CVC:** Any 3 digits (e.g., `123`)
   - **ZIP:** Any 5 digits (e.g., `12345`)
4. Click **"Pay"**

**Expected Result:**
- Payment processes successfully
- Redirected to `/stripe/success`
- Success message displayed
- Session ID shown

### 4.3 Verify Payment in Stripe Dashboard

1. Go to [Stripe Dashboard](https://dashboard.stripe.com) → **Payments**
2. You should see:
   - Payment amount: $10.00 (or your test amount)
   - Status: Succeeded
   - Application fee: $2.00 (20% of $10)
   - Transfer to connected account: $8.00

**Expected Result:** Payment shows correct fee split.

## Step 5: Test Webhooks

### 5.1 Local Testing (Recommended for Development)

Use Stripe CLI to forward webhooks to your local server:

```bash
# Install Stripe CLI if not already installed
# macOS: brew install stripe/stripe-cli/stripe
# Or download from: https://stripe.com/docs/stripe-cli

# Login to Stripe
stripe login

# Forward thin events to local endpoint
stripe listen \
  --thin-events 'v2.core.account[requirements].updated,v2.core.account[.recipient].capability_status_updated' \
  --forward-thin-to http://localhost:3000/api/stripe/webhooks
```

**Expected Result:**
- CLI shows: "Ready! Your webhook signing secret is whsec_..."
- Copy this secret to your `.env.local` as `STRIPE_WEBHOOK_SECRET`
- When events occur, you'll see them forwarded to your local endpoint

### 5.2 Test Webhook Events

Trigger webhook events:

1. **Requirements Updated Event:**
   - Go to Stripe Dashboard → **Connect** → **Accounts**
   - Select your connected account
   - Update any business information
   - This should trigger `v2.core.account[requirements].updated`

2. **Capability Status Event:**
   - Complete onboarding (if not already done)
   - This should trigger `v2.core.account[.recipient].capability_status_updated`

**Expected Result:**
- Webhook events appear in Stripe CLI (if using local testing)
- Check your server logs for: "Received webhook event: ..."
- Database updates (if implemented)

### 5.3 Production Webhook Testing

For production (`https://sito.club`):

1. Go to [Stripe Dashboard](https://dashboard.stripe.com) → **Developers** → **Webhooks**
2. Find your webhook endpoint: `https://sito.club/api/stripe/webhooks`
3. Click on it to view:
   - **Recent events** - See if events are being received
   - **Event logs** - Check for errors
4. Click **"Send test webhook"** to manually trigger an event

**Expected Result:**
- Events show as "Succeeded" (200 status)
- No errors in event logs

## Step 6: Verify Database Updates

Check that account information is stored correctly:

1. Check your Supabase database:
   ```sql
   SELECT id, stripe_connect_account_id, stripe_connect_onboarding_complete 
   FROM profiles 
   WHERE stripe_connect_account_id IS NOT NULL;
   ```

2. Verify:
   - `stripe_connect_account_id` is set
   - `stripe_connect_onboarding_complete` is `true` after onboarding

## Common Issues & Solutions

### Issue: "STRIPE_SECRET_KEY is not set"
**Solution:** 
- Check `.env.local` file exists
- Verify variable name is exactly `STRIPE_SECRET_KEY`
- Restart development server

### Issue: Webhook signature verification fails
**Solution:**
- Verify `STRIPE_WEBHOOK_SECRET` matches the secret from Stripe Dashboard
- For local testing, use the secret from `stripe listen` command
- Ensure webhook endpoint URL matches exactly

### Issue: Account not ready to receive payments
**Solution:**
- Complete all onboarding steps in Stripe
- Check account requirements in Stripe Dashboard
- Verify bank account is added and verified

### Issue: Products not showing in storefront
**Solution:**
- Verify product was created successfully
- Check API response for errors
- Verify `connectedAccountId` is set correctly

### Issue: Checkout fails
**Solution:**
- Verify Stripe keys are correct (test vs live)
- Check product has a valid price
- Ensure connected account is ready to receive payments

## Testing Checklist

Use this checklist to verify everything works:

- [ ] Environment variables loaded correctly
- [ ] Can create Stripe Connect account
- [ ] Can start onboarding flow
- [ ] Onboarding completes successfully
- [ ] Account status shows "Ready to Receive Payments"
- [ ] Can create a product
- [ ] Product appears in storefront
- [ ] Can initiate checkout
- [ ] Payment processes successfully
- [ ] Redirected to success page
- [ ] Payment appears in Stripe Dashboard
- [ ] Application fee calculated correctly
- [ ] Transfer to connected account works
- [ ] Webhooks are received (check logs)
- [ ] Database updates correctly

## Next Steps After Testing

Once testing is complete:

1. **Switch to Live Mode:**
   - Update environment variables with live keys
   - Update webhook endpoint to production URL
   - Test with real bank accounts (small amounts)

2. **Add Error Monitoring:**
   - Set up error tracking (Sentry, etc.)
   - Monitor webhook failures
   - Set up alerts for failed payments

3. **Enhance Features:**
   - Add product management UI (edit/delete)
   - Add payout dashboard for experts
   - Add email notifications
   - Add analytics and reporting

## Support Resources

- [Stripe Connect Docs](https://stripe.com/docs/connect)
- [Stripe Testing Guide](https://stripe.com/docs/testing)
- [Stripe CLI Docs](https://stripe.com/docs/stripe-cli)
- [V2 Accounts API](https://stripe.com/docs/api/v2/core/accounts)

## Quick Test Commands

```bash
# Test API endpoint (replace with your actual account ID)
curl https://sito.club/api/stripe/connect/account-status?accountId=acct_xxx

# List products
curl https://sito.club/api/stripe/products/list

# Check webhook endpoint (should return 405 Method Not Allowed for GET)
curl https://sito.club/api/stripe/webhooks
```

---

**Ready to test?** Start with Step 1 and work through each step. If you encounter any issues, check the "Common Issues & Solutions" section above.


