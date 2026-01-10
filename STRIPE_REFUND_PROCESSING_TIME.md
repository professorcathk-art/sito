# Stripe Refund Processing Time Guide

## ⚡ Refund Appearance in Stripe Dashboard

**Refunds appear IMMEDIATELY** in Stripe Dashboard when created. If you don't see it:

### Where to Check in Stripe Dashboard:

1. **Go to Payments**: https://dashboard.stripe.com/payments
2. **Find the original payment** (search by customer email or payment intent ID)
3. **Click on the payment** to see details
4. **Scroll down** to see "Refunds" section
5. The refund should appear there immediately

### Alternative: Check Refunds Directly

1. **Go to Refunds**: https://dashboard.stripe.com/refunds
2. **Filter by date** (today)
3. **Search for refund ID** (starts with `re_`)

## ⏱️ Refund Processing Times

### Immediate (Most Cases)
- **Stripe Dashboard**: Appears immediately
- **Refund Status**: Usually "succeeded" immediately for cards
- **API Response**: Returns immediately with refund ID

### Customer Bank Account
- **Credit Cards**: 5-10 business days
- **Debit Cards**: 5-10 business days  
- **Bank Transfers**: Can take longer
- **Reversals**: If refunded within 2-3 days, may show as reversal (original charge disappears)

## 🔍 How to Verify Refund Was Created

### Method 1: Check API Response
When you click "Refund", check the browser console or network tab:
- Look for response from `/api/stripe/refund`
- Should contain: `{ success: true, refund: { id: "re_...", status: "succeeded" } }`

### Method 2: Check Database
The refund should update your database immediately:
- `refund_status` = "refunded" or "processing"
- `refund_id` = "re_..." (Stripe refund ID)
- `refunded_at` = timestamp

### Method 3: Check Stripe Dashboard
1. Go to Stripe Dashboard → Payments
2. Find the original payment
3. Look for refunds section
4. Should show refund ID and amount

### Method 4: Use Stripe API Directly
```bash
# Get refund details
curl https://api.stripe.com/v1/refunds/re_REFUND_ID \
  -u sk_live_YOUR_SECRET_KEY:
```

## 🐛 Troubleshooting

### Refund Not Showing in Dashboard

**Possible Causes:**
1. **Wrong Stripe Account**: Make sure you're checking the correct account (Live vs Test)
2. **Refund Failed**: Check refund status in API response
3. **Payment Method**: Some payment methods take longer
4. **Dashboard Cache**: Try refreshing the page

**How to Check:**
1. Look at the success message in admin dashboard - it shows refund ID
2. Copy the refund ID (starts with `re_`)
3. Go to Stripe Dashboard → Search for that refund ID
4. If not found, check Vercel logs for errors

### Refund Status is "Pending"

Some payment methods show as "pending":
- **ACH Direct Debit**: Can take 5-7 business days
- **Bank Transfers**: Can take longer
- **International Cards**: May take longer

**What to Do:**
- Wait 5-10 business days
- Check Stripe Dashboard periodically
- Refund will eventually show as "succeeded" or "failed"

### Refund Created But Not in Database

If refund appears in Stripe but not in your database:
1. Check webhook is configured: `charge.refunded` event
2. Check Vercel logs for webhook errors
3. Manually verify refund in Stripe Dashboard
4. Database will update when webhook fires

## 📊 Refund Status Meanings

- **succeeded**: Refund processed successfully (money returned to customer)
- **pending**: Refund is being processed (may take a few days)
- **failed**: Refund failed (check Stripe Dashboard for reason)
- **canceled**: Refund was canceled

## ✅ Quick Verification Checklist

After clicking "Refund":
- [ ] Check browser console for success message
- [ ] Note the refund ID (starts with `re_`)
- [ ] Go to Stripe Dashboard → Payments
- [ ] Find original payment → Check refunds section
- [ ] Verify refund ID matches
- [ ] Check refund status (should be "succeeded" or "pending")
- [ ] Refresh admin dashboard → Status should update to "Refunded"

## 🔗 Useful Stripe Dashboard Links

- **All Payments**: https://dashboard.stripe.com/payments
- **All Refunds**: https://dashboard.stripe.com/refunds
- **Webhook Logs**: https://dashboard.stripe.com/webhooks
- **API Logs**: https://dashboard.stripe.com/logs

## 💡 Pro Tips

1. **Always note the refund ID** from the success message
2. **Check Stripe Dashboard immediately** after refunding
3. **If not visible**, check you're in the correct Stripe account (Live vs Test)
4. **Webhook delays**: Database may update a few seconds after Stripe shows refund
5. **Customer notification**: Stripe automatically emails customer about refund
