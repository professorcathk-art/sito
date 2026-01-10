# Fix: country_id NOT NULL Constraint Error

## Error

```
ERROR: null value in column "country_id" of relation "profiles" violates not-null constraint (SQLSTATE 23502)
```

## Root Cause

Migration `033_add_language_and_make_location_required.sql` made `country_id` NOT NULL, but:
1. ❌ `handle_new_user()` function (trigger) doesn't include `country_id`
2. ❌ `register-form.tsx` component doesn't include `country_id`

## Solution

### 1. Database Function Fix

**File:** `supabase/migrations/038_fix_handle_new_user_country_id.sql`

Updates `handle_new_user()` function to:
- ✅ Include `country_id` when creating profiles
- ✅ Default to "Remote" country (or Hong Kong as fallback)
- ✅ Handle cases where countries table might be empty

**Run this migration in Supabase Dashboard → SQL Editor**

### 2. Component Fix

**File:** `components/register-form.tsx`

Updated to:
- ✅ Fetch default country_id before inserting profile
- ✅ Include `country_id` in profile insert
- ✅ Fallback to null if no country found (trigger will handle it)

## Steps to Fix

### Step 1: Run Database Migration

1. Go to: **Supabase Dashboard → SQL Editor**
2. Copy contents of: `supabase/migrations/038_fix_handle_new_user_country_id.sql`
3. Paste and run in SQL Editor
4. Verify: Should see "CREATE FUNCTION" success

### Step 2: Deploy Code Changes

The `register-form.tsx` fix is already in code. After deploying:
- ✅ New registrations will include `country_id`
- ✅ Trigger function will also include `country_id`

### Step 3: Verify Fix

1. **Test Registration:**
   - Go to `/register`
   - Create a new account
   - Should succeed without errors

2. **Check Database:**
   - Supabase Dashboard → Table Editor → `profiles`
   - New profiles should have `country_id` set

## Why This Happened

- Migration 033 made `country_id` required (NOT NULL)
- But the automatic profile creation functions weren't updated
- This caused registration failures for new users

## Prevention

- ✅ Migration includes function update
- ✅ Component code includes country_id
- ✅ Both paths (trigger + component) now handle country_id

---

**Action Required:** Run migration `038_fix_handle_new_user_country_id.sql` in Supabase SQL Editor!
