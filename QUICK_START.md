# Quick Start: Testing Stripe Connect

## 🚀 Quick Test Flow (5 Minutes)

### 1. Verify Setup (30 seconds)
```bash
# Make sure your dev server is running
npm run dev

# Check environment variables are loaded
# Visit: http://localhost:3000/dashboard/stripe-connect
# If you see "STRIPE_SECRET_KEY is not set" error, check your .env.local file
```

### 2. Create Account (1 minute)
1. Go to: **Dashboard** → **Payment Setup** (or `/dashboard/stripe-connect`)
2. Click: **"Create Stripe Account"**
3. ✅ Should see: "Account created successfully"

### 3. Onboard Account (2 minutes)
1. Click: **"Onboard to Collect Payments"**
2. Fill Stripe form:
   - Business type: **Individual**
   - Test bank: `000123456789` (routing: `110000000`)
   - Test SSN: `000-00-0000`
   - Complete all fields
3. Submit → Redirected back
4. ✅ Should see: "Ready to Receive Payments: Yes"

### 4. Create Product (1 minute)
1. Go to: **Dashboard** → **Create Stripe Product** (or `/dashboard/stripe-products`)
2. Fill form:
   - Name: "Test Product"
   - Price: `10.00`
3. Click: **"Create Product"**
4. ✅ Should see: "Product created successfully!"

### 5. Test Purchase (30 seconds)
1. Go to: **Storefront** (or `/stripe/storefront`)
2. Click: **"Buy Now"** on your product
3. Use test card: `4242 4242 4242 4242`
4. Complete checkout
5. ✅ Should see: "Payment Successful!"

## ✅ Success Checklist

- [ ] Account created
- [ ] Onboarding complete
- [ ] Product created
- [ ] Purchase successful
- [ ] Payment appears in Stripe Dashboard

## 🔍 Verify in Stripe Dashboard

1. Go to: https://dashboard.stripe.com
2. Check:
   - **Connect** → **Accounts** → See your account
   - **Products** → See your product
   - **Payments** → See test payment ($10.00)
   - **Payments** → Check application fee ($2.00 = 20%)

## 🐛 Common Issues

**"STRIPE_SECRET_KEY is not set"**
→ Check `.env.local` file exists and restart server

**"No Stripe Connect account found"**
→ Make sure you completed Step 2 (Create Account)

**"Account not ready to receive payments"**
→ Complete onboarding (Step 3)

**Products not showing**
→ Check you created a product (Step 4)

## 📚 Full Testing Guide

For detailed testing instructions, see: `STRIPE_TESTING_GUIDE.md`

## 🎯 Next Steps

Once basic flow works:
1. Test webhooks (see testing guide)
2. Test with multiple products
3. Test with different price amounts
4. Verify fee calculations
5. Test error scenarios

---

**Ready?** Start with Step 1 above! 🚀

