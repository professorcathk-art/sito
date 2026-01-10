# 🔄 Stripe Test to Live Mode Migration Guide

## Problem

When switching from Stripe test mode to live mode, you may encounter:
- **"Failed to fetch account status"** error
- **"Account already exists"** when trying to create a new account

This happens because:
- Your database still has a **test mode Stripe account ID** stored
- You're now using **live mode Stripe API keys**
- Stripe can't find the test account with live keys (they're in different environments)

## Solution

### Option 1: Use Reset Account Button (Recommended)

1. Go to **Dashboard** → **Stripe Connect** (`/dashboard/stripe-connect`)
2. Scroll down to find the **"Reset Account"** button
3. Click **"Reset Account"**
4. Confirm the reset
5. Click **"Create Stripe Account"** to create a new live mode account

### Option 2: Manual Database Reset

If you have database access, you can manually clear the account:

```sql
-- Clear Stripe Connect account for your user
UPDATE profiles
SET 
  stripe_connect_account_id = NULL,
  stripe_connect_onboarding_complete = FALSE
WHERE id = 'your-user-id';
```

### Option 3: Automatic Detection

The system now automatically detects when:
- A test account ID is used with live keys
- An account doesn't exist in Stripe

When detected, it will:
- Automatically clear the invalid account ID
- Show a message: "Previous test account was cleared. Please create a new account for live mode."
- Allow you to create a new account

## Steps to Migrate

### 1. Verify You're Using Live Keys

Check your environment variables:
- `STRIPE_SECRET_KEY` should start with `sk_live_...`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` should start with `pk_live_...`

### 2. Reset Old Test Account

Use the **Reset Account** button in the Stripe Connect page, or wait for automatic detection.

### 3. Create New Live Account

1. Click **"Create Stripe Account"**
2. Complete the onboarding process in Stripe
3. Your new live account will be linked

### 4. Verify Account Status

- Account status should show "Complete"
- Payment Ready should show "Yes"
- You should see your earnings dashboard

## Important Notes

### Test vs Live Accounts

- **Test accounts** (`acct_test_...`) only work with test keys (`sk_test_...`)
- **Live accounts** (`acct_...`) only work with live keys (`sk_live_...`)
- You **cannot** use a test account with live keys
- You **must** create a new account when switching modes

### What Gets Reset

When you reset an account:
- ✅ `stripe_connect_account_id` is cleared from database
- ✅ `stripe_connect_onboarding_complete` is set to `false`
- ✅ You can create a new account
- ⚠️ Any products linked to the old account will need to be recreated

### Products and Payments

**Important:** If you have products created with the test account:
- They are linked to the test account
- You'll need to create new products with the live account
- Test payments won't transfer to live mode

## Troubleshooting

### Still Seeing "Account already exists"

1. Check if reset was successful:
   - Refresh the page
   - Check browser console for errors
   - Verify database was updated

2. Try manual reset:
   - Use the Reset Account button
   - Or use SQL query above

### Account Status Still Failing

1. Verify Stripe keys are correct:
   - Check `.env.local` (local)
   - Check Vercel environment variables (production)

2. Check Stripe Dashboard:
   - Go to Stripe Dashboard (Live mode)
   - Verify account exists
   - Check account status

### Can't Create New Account

1. Ensure country is set to Hong Kong (HK)
2. Verify email is in your profile
3. Check browser console for detailed errors
4. Verify Stripe API keys are live mode keys

## Prevention

To avoid this issue in the future:

1. **Use separate databases** for test and production
2. **Use separate Stripe accounts** for test and live
3. **Never mix test and live keys** in the same environment
4. **Clear test accounts** before switching to live mode

## Support

If you continue to have issues:

1. Check Vercel logs for detailed error messages
2. Check Stripe Dashboard for account status
3. Verify all environment variables are set correctly
4. Contact support with:
   - Error messages from browser console
   - Vercel deployment logs
   - Stripe account IDs (if any)
