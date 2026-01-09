# Health Check Report - User Journey

## ✅ Working Correctly

### 1. Registration Flow
- ✅ User registers → Profile created with name/email → Redirects to onboarding
- ✅ Google OAuth → Profile created → Redirects to onboarding

### 2. Onboarding Flow
- ✅ Checks if onboarding already completed → Redirects to dashboard if yes
- ✅ Step 1: Intention selection (learn/teach)
- ✅ Step 2a: Learner details → Stores learning preferences
- ✅ Step 2b: Expert details → Stores category_id, bio, teaching interests
- ✅ Step 3: Profile completion → Sets name, tagline, location, onboarding_completed = true
- ✅ Redirects to dashboard after completion

### 3. Dashboard Flow
- ✅ Checks onboarding_completed → Redirects to onboarding if not completed
- ✅ Checks expert profile (category_id, bio, name) → Shows "Become an Expert" if not expert
- ✅ Shows expert features only if isExpert = true

### 4. Expert Features Gating
- ✅ Products page → Requires expert profile (ExpertRoute)
- ✅ Payment Setup page → Requires expert profile (ExpertRoute)
- ✅ Sidebar menu → Expert items hidden until expert profile complete

### 5. Marketplace Visibility
- ✅ Directory filters by `listed_on_marketplace = true`
- ✅ Profile setup has checkbox to control visibility
- ✅ Default is `false` (not visible)

## ⚠️ Potential Issues Found

### Issue 1: Expert Onboarding Validation
**Location**: `components/onboarding-flow.tsx` - `handleExpertSubmit`
**Problem**: User can submit expert details without filling `category_id` or `bio` (fields can be null)
**Impact**: User chooses "teach" but doesn't fill required fields → Completes onboarding → Not recognized as expert → Confusing UX
**Fix Needed**: Add validation to require category_id and bio before allowing profile completion step

### Issue 2: Profile Setup Form Validation
**Location**: `components/profile-setup-form.tsx`
**Problem**: Category field has `required={!formData.categoryId}` but this is only HTML5 validation. Form can still submit if empty.
**Impact**: User might submit profile without category, won't be recognized as expert
**Fix Needed**: Add proper validation in handleSubmit to check category_id and bio are filled

### Issue 3: Onboarding Profile Update vs Upsert
**Location**: `components/onboarding-flow.tsx` - `handleExpertSubmit`, `handleLearnerSubmit`
**Problem**: Uses `.update()` which requires profile to exist. If profile creation failed during registration, this will error.
**Impact**: Edge case - if profile doesn't exist, onboarding will fail
**Fix Needed**: Use `.upsert()` instead of `.update()` to handle both cases

### Issue 4: Expert Profile Check Consistency
**Location**: Multiple places check `category_id && bio && name`
**Status**: ✅ Consistent across dashboard, ExpertRoute, sidebar
**Note**: This is correct - all three fields required

## 🔧 Recommended Fixes

1. **Add validation to expert onboarding step** - Require category_id and bio before proceeding
2. **Add validation to profile setup form** - Ensure category_id and bio are required for expert profile
3. **Change onboarding updates to upserts** - Handle edge case where profile might not exist
4. **Add error handling** - Better error messages for validation failures

## 📋 User Journey Test Checklist

### New User Journey (Learner)
- [ ] Register → Onboarding → Choose "Learn" → Fill learner details → Complete profile → Dashboard shows "Become an Expert"
- [ ] Click "Become an Expert" → Profile Setup → Fill category, bio, name → Save → Dashboard shows expert features
- [ ] Check "List on marketplace" → Save → Appears in directory
- [ ] Uncheck "List on marketplace" → Save → Disappears from directory

### New User Journey (Expert)
- [ ] Register → Onboarding → Choose "Teach" → Fill expert details (category, bio) → Complete profile → Dashboard shows expert features
- [ ] Check "List on marketplace" → Save → Appears in directory
- [ ] Access Products page → Should work
- [ ] Access Payment Setup → Should work

### Edge Cases
- [ ] User chooses "teach" but doesn't fill category/bio → Should show validation error
- [ ] User completes onboarding but profile doesn't exist → Should handle gracefully
- [ ] User tries to access Products without expert profile → Should show "Complete Your Profile" message
- [ ] User unchecks marketplace visibility → Should disappear from directory immediately
