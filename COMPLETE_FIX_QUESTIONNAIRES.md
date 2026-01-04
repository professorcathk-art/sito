# Complete Fix for Questionnaire Access Issue

## Root Cause Found! 🎯

**The Problem:** Row Level Security (RLS) policies on the `questionnaires` table only allow experts to view their own questionnaires. Regular users cannot see questionnaires, so queries return empty even though questionnaires exist in the database.

**The Fix:** Add a public RLS policy that allows anyone to view active questionnaires linked to products.

## Step 1: Run RLS Fix Migration

**CRITICAL:** Run `supabase/migrations/024_fix_questionnaires_rls.sql` in Supabase SQL Editor.

This will:
1. ✅ Keep the existing policy for experts
2. ✅ Add a NEW policy allowing anyone to view active questionnaires for products
3. ✅ Verify the policies are correct

## Step 2: Verify RLS Policies

After running the migration, verify with:

```sql
-- Check questionnaires RLS policies
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'questionnaires'
ORDER BY policyname;
```

You should see:
- ✅ "Experts can view their own questionnaires" - for experts
- ✅ "Anyone can view active questionnaires for products" - for public access

## Step 3: Test

1. **Clear browser cache** (important!)
2. Refresh the page
3. Click "Register Interest" or "Enroll"
4. The questionnaire form should now appear!

## What Changed

### Code Changes (Already Applied)
- ✅ Added `.eq("is_active", true)` filter to questionnaire queries
- ✅ Improved error logging to help debug issues
- ✅ Better error messages

### Database Changes (Need to Run)
- ✅ Migration 024: Adds public RLS policy for questionnaires

## Why This Happened

The original RLS policy (migration 017) was:
```sql
CREATE POLICY "Experts can view their own questionnaires"
  ON questionnaires FOR SELECT
  USING (auth.uid() = expert_id);
```

This meant:
- ✅ Experts could see their own questionnaires
- ❌ Regular users could NOT see questionnaires (even for products they want to enroll in)

The new policy allows:
- ✅ Anyone can see active questionnaires linked to products
- ✅ Experts can still see their own questionnaires
- ✅ Security: Only active questionnaires for valid products are visible

## Verification Queries

After running migration 024, test as a regular user:

```sql
-- This should return questionnaires (as a regular user, not expert)
SELECT 
  q.id,
  q.title,
  q.is_active,
  q.product_id,
  p.name as product_name
FROM questionnaires q
JOIN products p ON p.id = q.product_id
WHERE q.is_active = true
  AND p.product_type IN ('course', 'appointment')
LIMIT 5;
```

If this returns results, the RLS fix worked! ✅
