# Stripe Marketplace Commission Setup

## Overview

This marketplace uses Stripe Connect with **application fees** to collect a commission on each transaction. The commission rate is configurable via environment variables.

## Current Commission Rate

**Default: 10%**

The platform collects 10% of each transaction as commission, and the remaining 90% is transferred to the expert's connected account.

## Configuration

### Option 1: Environment Variable (Recommended)

Set the commission rate using an environment variable:

**In `.env.local` (for local development):**
```bash
STRIPE_PLATFORM_FEE_PERCENT=10
```

**In Vercel (for production):**
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add:
   - **Key:** `STRIPE_PLATFORM_FEE_PERCENT`
   - **Value:** `10` (or your desired percentage)
   - **Environment:** Production, Preview, Development

### Option 2: Code Default

If no environment variable is set, the default is **10%**.

## How It Works

### Payment Flow

1. **Customer pays** → Full amount (e.g., $100)
2. **Platform collects** → Commission (e.g., $10 = 10%)
3. **Expert receives** → Remaining amount (e.g., $90 = 90%)

### Implementation

The commission is calculated in `/app/api/stripe/checkout/create-session/route.ts`:

```typescript
// Get platform fee from environment variable or default to 10%
const defaultPlatformFee = parseFloat(process.env.STRIPE_PLATFORM_FEE_PERCENT || "10");

// Calculate application fee amount
const applicationFeeAmount = Math.round(
  (totalAmount * applicationFeePercent) / 100
);
```

### Stripe Connect Destination Charge

The commission is implemented using Stripe's **Destination Charge** model:

```typescript
payment_intent_data: {
  application_fee_amount: applicationFeeAmount, // Platform's commission
  transfer_data: {
    destination: connectedAccountId, // Expert's account
  },
}
```

## Where Commission is Applied

1. **Course Purchases** → `/components/course-enrollment.tsx`
2. **Appointment Bookings** → `/app/appointments/book/[expertId]/page.tsx`
3. **Storefront Purchases** → `/app/stripe/storefront/page.tsx`

All use the same API endpoint (`/api/stripe/checkout/create-session`) which applies the commission.

## Changing the Commission Rate

### To Change to a Different Rate:

1. **Update Environment Variable:**
   ```bash
   STRIPE_PLATFORM_FEE_PERCENT=15  # For 15% commission
   ```

2. **Redeploy** your application (if using Vercel, it will auto-deploy)

3. **New transactions** will use the new rate automatically

### Important Notes:

- ⚠️ **Existing transactions** are not affected - only new transactions use the new rate
- ⚠️ **Rate changes** apply immediately to all new checkout sessions
- ⚠️ **No database changes** needed - rate is calculated at payment time

## Verification

To verify the commission is working:

1. **Check Stripe Dashboard:**
   - Go to Payments → Select a payment
   - Check "Application fee" field
   - Should show 10% of the total amount

2. **Check Logs:**
   - Look for `application_fee_percent` in checkout session metadata
   - Should show "10" (or your configured rate)

3. **Check Expert Payouts:**
   - Expert should receive 90% of the payment
   - Platform receives 10% as application fee

## Example Calculation

**Transaction:** $100 course purchase

- **Total Amount:** $100.00
- **Platform Commission (10%):** $10.00
- **Expert Receives:** $90.00

**Transaction:** $50 appointment booking

- **Total Amount:** $50.00
- **Platform Commission (10%):** $5.00
- **Expert Receives:** $45.00

## Stripe Dashboard

In Stripe Dashboard, you can see:
- **Application fees** collected by the platform
- **Transfers** sent to connected accounts
- **Net amount** for each transaction

## Troubleshooting

### Commission Not Applied

1. Check environment variable is set correctly
2. Verify `STRIPE_PLATFORM_FEE_PERCENT` is in `.env.local` or Vercel
3. Check API route logs for `application_fee_percent` value
4. Ensure Stripe Connect is properly configured

### Wrong Commission Amount

1. Verify environment variable value (should be number, e.g., "10" not "10%")
2. Check that the value is being parsed correctly
3. Review Stripe Dashboard payment details

## Best Practices

1. **Set rate in production** via Vercel environment variables
2. **Document rate changes** in your team's changelog
3. **Notify experts** if commission rate changes
4. **Test rate changes** in test mode before production
