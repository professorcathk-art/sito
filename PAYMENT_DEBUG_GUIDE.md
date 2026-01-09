# Payment Debugging Guide

## Issue: Stripe Dashboard Shows 0 Movement & Purchases Not Showing

### Step 1: Verify You're Completing the Payment

1. **When you click "Enroll" or "Book Appointment":**
   - Does it redirect to Stripe Checkout page?
   - Do you see the payment form?
   - Do you actually complete the payment (enter card and click "Pay")?

2. **After clicking "Pay":**
   - Do you get redirected to the success page (`/stripe/success`)?
   - Or do you see an error?

### Step 2: Check Browser Console

1. Open browser Developer Tools (F12)
2. Go to Console tab
3. Try making a purchase
4. Look for any red errors
5. Copy any errors you see

### Step 3: Check Stripe Dashboard Mode

**CRITICAL:** Make sure you're checking the correct mode:

- **Test Mode:** If you're using test cards (`4242 4242 4242 4242`)
  - Check: https://dashboard.stripe.com/test/payments
  - Look for "Test mode" toggle in top right

- **Live Mode:** If you're using real cards
  - Check: https://dashboard.stripe.com/payments
  - Make sure "Test mode" is OFF

### Step 4: Verify Checkout Session is Created

After clicking "Enroll" or "Book", check Vercel logs:

1. Go to Vercel Dashboard → Your Project → Functions
2. Look for `/api/stripe/checkout/create-session` logs
3. Check if you see:
   - "Creating checkout session with metadata: ..."
   - "Checkout session created: cs_..."
   - "Checkout URL: https://checkout.stripe.com/..."

If you see errors, copy them.

### Step 5: Check Success Page Logs

After payment, check browser console for:
- "Payment verification result: ..."
- Any errors from `/api/stripe/checkout/verify-payment`

### Step 6: Debug Session Details

If you have a session ID from the success page, check it:

Visit: `https://www.sito.club/api/stripe/debug/check-session?session_id=YOUR_SESSION_ID`

This will show:
- Payment status
- Metadata (course_id, appointment_id, user_id)
- Payment intent ID
- All session details

### Step 7: Common Issues

#### Issue A: "Expert has not set up payment processing"
- **Cause:** Expert doesn't have `stripe_connect_account_id` in their profile
- **Fix:** Expert needs to complete Stripe Connect onboarding

#### Issue B: "Failed to create checkout session"
- **Cause:** Missing Stripe keys or invalid connected account
- **Fix:** Check Vercel environment variables

#### Issue C: Payment completes but nothing shows
- **Cause:** Metadata not being stored correctly
- **Fix:** Check logs for metadata extraction

#### Issue D: "Payment not completed" in verify-payment
- **Cause:** Payment status is not "paid"
- **Fix:** Check Stripe dashboard for actual payment status

### Step 8: Test with Stripe Test Card

Use Stripe's test card:
- **Card:** `4242 4242 4242 4242`
- **Expiry:** Any future date (e.g., `12/34`)
- **CVC:** Any 3 digits (e.g., `123`)
- **ZIP:** Any 5 digits (e.g., `12345`)

### Step 9: Check Webhook Events

1. Go to Stripe Dashboard → Developers → Webhooks
2. Click on your webhook endpoint
3. Check "Recent events" tab
4. Look for `checkout.session.completed` events
5. Click on an event to see details
6. Check if it was successful or failed

### Step 10: Manual Database Check

Check if records exist in database:

```sql
-- Check enrollments
SELECT * FROM course_enrollments 
WHERE user_id = 'YOUR_USER_ID' 
ORDER BY enrolled_at DESC;

-- Check appointments
SELECT * FROM appointments 
WHERE user_id = 'YOUR_USER_ID' 
ORDER BY created_at DESC;
```

## Quick Test Checklist

- [ ] Click "Enroll" or "Book Appointment"
- [ ] See Stripe Checkout page
- [ ] Enter test card: `4242 4242 4242 4242`
- [ ] Click "Pay"
- [ ] Redirected to success page
- [ ] Check browser console for errors
- [ ] Check Stripe Dashboard (Test Mode) for payment
- [ ] Check Purchase History page
- [ ] Check My Bookings page

## What to Report

If still not working, provide:
1. Browser console errors (screenshot)
2. Vercel function logs (from `/api/stripe/checkout/create-session`)
3. Session ID from success page URL
4. Stripe Dashboard screenshot (showing payments or empty)
5. Whether you're in Test Mode or Live Mode
