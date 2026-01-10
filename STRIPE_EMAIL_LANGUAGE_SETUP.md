# How to Change Stripe Email Language to English

## Method 1: Stripe Dashboard Settings (Recommended)

This is the **easiest and most comprehensive** way to change email language:

### Step 1: Go to Stripe Dashboard Settings
1. Visit: https://dashboard.stripe.com/settings/account
2. Make sure you're in **Live mode** (toggle in top right)

### Step 2: Change Email Language
1. Scroll down to **"Email notifications"** section
2. Click on **"Email preferences"** or **"Notification settings"**
3. Find **"Email language"** or **"Locale"** setting
4. Select **"English"** or **"en"**
5. Click **"Save"**

### Step 3: Update Customer Communication Settings
1. Go to: https://dashboard.stripe.com/settings/branding
2. Check **"Email language"** setting
3. Set to **"English"**
4. Save changes

## Method 2: Set Locale in Checkout Sessions (Code Level)

I've already updated the code to set `locale: "en"` in checkout sessions. This ensures:
- ✅ Checkout page is in English
- ✅ Payment confirmation emails are in English
- ✅ Receipt emails are in English

**Note:** This only affects checkout-related emails. Other Stripe emails (like account updates) are controlled by Dashboard settings.

## Method 3: Account-Level Language Setting

### For Your Platform Account:
1. Go to: https://dashboard.stripe.com/settings/account
2. Find **"Language"** or **"Locale"** setting
3. Set to **"English (United States)"** or **"en-US"**
4. Save

### For Connected Accounts (Experts):
Experts can change their own language in their Stripe Dashboard:
1. They log into their Stripe Connect account
2. Go to Settings → Account
3. Change language to English

## What Emails Are Affected?

### Emails Sent by Stripe:
- ✅ Payment receipts
- ✅ Refund notifications
- ✅ Invoice emails
- ✅ Account verification emails
- ✅ Dispute notifications
- ✅ Payout notifications

### Emails Sent by Your App:
- ✅ These use Resend API and are already in English
- ✅ Message notifications
- ✅ Connection requests
- ✅ Blog post notifications

## Verification

After changing settings:

1. **Test a payment:**
   - Make a test purchase
   - Check the receipt email language
   - Should be in English

2. **Test a refund:**
   - Process a refund
   - Check refund notification email
   - Should be in English

3. **Check Stripe Dashboard:**
   - Go to Payments → Select a payment
   - Click "Send receipt" or "Resend email"
   - Email should be in English

## Troubleshooting

### Emails Still in Another Language

1. **Check account-level setting:**
   - Go to Settings → Account
   - Verify language is set to English

2. **Check customer's Stripe account:**
   - If customer has a Stripe account, their language preference may override
   - This is normal Stripe behavior

3. **Clear browser cache:**
   - Sometimes settings don't apply immediately
   - Try logging out and back into Stripe Dashboard

4. **Wait a few minutes:**
   - Settings changes may take a few minutes to propagate

### Checkout Page Language

The checkout page language is controlled by:
- `locale: "en"` in checkout session (already set in code)
- Customer's browser language (Stripe auto-detects)
- Stripe account language setting

## Code Changes Made

I've updated `/app/api/stripe/checkout/create-session/route.ts` to include:
```typescript
locale: "en",
```

This ensures checkout pages and related emails are in English.

## Additional Notes

- **Customer preference:** If a customer has a Stripe account with a different language, Stripe may still send emails in their preferred language
- **Browser language:** Stripe checkout page may auto-detect browser language, but `locale: "en"` should override this
- **Account settings:** The account-level language setting in Stripe Dashboard is the most reliable way to ensure all emails are in English
