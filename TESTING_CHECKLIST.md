# Testing Checklist: Stripe Checkout Custom Descriptions

## Last Fix Summary

**Problem:** Stripe checkout page was showing HTML code (like `<p>`, `</p>`) in product descriptions when courses had HTML in their descriptions.

**Solution:** Generate custom descriptions for courses instead of using the product description:
- **For Courses:** "Course provided by [Expert Name]"
- **For Appointments:** Already had custom descriptions ("1-on-1 session with [Expert Name]")

**Files Changed:**
- `/app/api/stripe/checkout/create-session/route.ts` - Generates custom descriptions for courses

---

## What to Test

### Test 1: Course Checkout Description ✅

**Steps:**
1. Go to a course product page (any paid course)
2. Click "Enroll" or "Purchase"
3. You'll be redirected to Stripe checkout page
4. **Check the product description**

**Expected Result:**
- ✅ Description should show: **"Course provided by [Expert Name]"**
- ✅ NO HTML tags visible (no `<p>`, `</p>`, etc.)
- ✅ Clean, readable text
- ✅ Expert name should be correct

**Example:**
- ✅ Good: "Course provided by John Smith"
- ❌ Bad: "Course provided by <p>John Smith</p>"
- ❌ Bad: "<p>Learn advanced techniques...</p>"

---

### Test 2: Appointment Checkout Description ✅

**Steps:**
1. Go to an expert's appointment booking page
2. Select a time slot
3. Proceed to payment
4. Check Stripe checkout page

**Expected Result:**
- ✅ Description should show: **"1-on-1 session with [Expert Name]"**
- ✅ NO HTML tags visible
- ✅ Clean, readable text

---

### Test 3: Multiple Courses ✅

**Steps:**
1. Test with different courses from different experts
2. Verify each shows correct expert name
3. Verify descriptions are clean

**Expected Result:**
- ✅ Each course shows correct expert name
- ✅ All descriptions are clean (no HTML)

---

### Test 4: Course Without Expert Name ✅

**Steps:**
1. Test a course where expert name might be missing
2. Check what description shows

**Expected Result:**
- ✅ Should show: "Course provided by Expert" (fallback)
- ✅ Or: "Course enrollment" (if courseId not provided)
- ✅ Still no HTML tags

---

## Quick Test Steps

### Fastest Way to Test:

1. **Find a Course:**
   - Go to your site
   - Navigate to a course product page
   - Or go to `/courses` and find a paid course

2. **Start Purchase:**
   - Click "Enroll" or "Purchase" button
   - Fill in any required forms (questionnaire if needed)

3. **Check Stripe Checkout:**
   - You'll be redirected to Stripe checkout
   - **Look at the product description area**
   - Should see: "Course provided by [Expert Name]"
   - Should NOT see any HTML code

4. **Verify:**
   - Description is clean text
   - Expert name is correct
   - No HTML tags visible

---

## What Was Fixed

### Before:
- Product descriptions with HTML (e.g., `<p>Learn advanced techniques...</p>`) were showing as raw HTML in Stripe checkout
- Looked unprofessional
- Confusing for customers

### After:
- Custom description: "Course provided by [Expert Name]"
- Clean, professional text
- No HTML tags
- Consistent format

---

## Files to Check (If Needed)

If you want to verify the code:

1. **API Route:** `/app/api/stripe/checkout/create-session/route.ts`
   - Lines 86-106: Generates custom description for courses
   - Fetches expert name from database
   - Uses `price_data` with `product_data` to override description

2. **Appointments:** `/app/appointments/book/[expertId]/page.tsx`
   - Line 347: Already uses `stripHtml()` and custom description
   - No changes needed

---

## Success Criteria

✅ **Test Passes If:**
- Stripe checkout shows clean description
- No HTML tags visible
- Expert name is correct
- Description format: "Course provided by [Expert Name]"

❌ **Test Fails If:**
- HTML tags visible in checkout
- Description shows raw HTML code
- Expert name is wrong or missing
- Description format is different

---

## Additional Notes

- **Deployment:** Make sure latest code is deployed (commit `1f9aae1` or later)
- **Cache:** Clear browser cache if you see old checkout page
- **Multiple Tests:** Test with different courses to ensure it works consistently

---

**Main Test:** Purchase a course and verify Stripe checkout shows "Course provided by [Expert Name]" with NO HTML tags!
