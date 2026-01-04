# Fixing Stripe Connect Region Restrictions

## The Problem

You're seeing this error:
```
Funds can't be sent to accounts located in US because it's restricted outside of your platform's region
```

This happens when your Stripe **platform account** (the one making API calls) is in a different region than your **connected accounts** (your users' accounts).

## Understanding Stripe Connect Regions

Stripe Connect has regional restrictions:
- Your platform account's region determines which countries can receive transfers
- By default, you can only send funds to connected accounts in the same region
- Cross-region transfers require special configuration

## Solution Options

### Option 1: Move Platform Account to US (Recommended for US-based users)

If most of your users are in the US:

1. **Create a new Stripe account in the US:**
   - Go to https://dashboard.stripe.com/register
   - Sign up with a US address
   - Complete US business verification

2. **Update your API keys:**
   - Get new API keys from the US account
   - Update `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` in Vercel
   - Redeploy your application

3. **Recreate connected accounts:**
   - Users will need to create new Stripe Connect accounts
   - Old accounts won't work with the new platform account

### Option 2: Enable Cross-Region Transfers (Advanced)

Contact Stripe Support to enable cross-region transfers:
- Email: support@stripe.com
- Subject: "Request to enable cross-region transfers for Connect"
- Explain your use case

**Note:** This may not be available for all account types and regions.

### Option 3: Use Separate Platform Accounts (Complex)

Maintain separate Stripe accounts for different regions:
- US account for US users
- EU account for EU users
- etc.

This requires more complex code to route payments to the correct account.

## Quick Fix: Check Your Current Platform Account Region

1. Go to https://dashboard.stripe.com/settings/account
2. Check "Country" - this is your platform account's region
3. If it's not US and your users are in US, you need to either:
   - Create a US Stripe account (Option 1)
   - Contact Stripe support (Option 2)

## Testing After Fix

Once you've updated your platform account region:

1. **Update environment variables in Vercel**
2. **Redeploy your application**
3. **Test account creation** - should work without region errors
4. **Test checkout** - transfers should work to US accounts

## Common Regions

- **US**: United States
- **EU**: European Union countries
- **GB**: United Kingdom (post-Brexit)
- **CA**: Canada
- **AU**: Australia
- **SG**: Singapore

## Need Help?

- Stripe Support: https://support.stripe.com
- Stripe Connect Docs: https://stripe.com/docs/connect
- Region Restrictions: https://stripe.com/docs/connect/regional-requirements

---

**Most Common Solution:** If your users are primarily in the US, create a US Stripe account and update your API keys.

