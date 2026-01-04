# Diagnose Questionnaire Linking Issues

## Problem
After running migration 022, questionnaires might still have `NULL` product_id if:
1. Questionnaires were created before products existed
2. Products don't match the expert_id
3. Products exist but weren't linked during migration

## Step 1: Check Current State

Run this in Supabase SQL Editor to see what's happening:

```sql
-- Check questionnaires without product_id
SELECT 
  q.id,
  q.expert_id,
  q.type,
  q.title,
  q.product_id,
  CASE 
    WHEN q.product_id IS NULL THEN '❌ NOT LINKED'
    ELSE '✅ LINKED'
  END as status
FROM questionnaires q
ORDER BY q.product_id NULLS FIRST;
```

## Step 2: Check Products

```sql
-- Check products that should have questionnaires
SELECT 
  p.id as product_id,
  p.expert_id,
  p.product_type,
  p.name,
  p.course_id,
  q.id as questionnaire_id,
  CASE 
    WHEN q.id IS NULL THEN '❌ NO QUESTIONNAIRE'
    ELSE '✅ HAS QUESTIONNAIRE'
  END as status
FROM products p
LEFT JOIN questionnaires q ON q.product_id = p.id
WHERE p.product_type IN ('course', 'appointment')
ORDER BY p.expert_id, p.product_type;
```

## Step 3: Fix Unlinked Questionnaires

Run the fix script: `supabase/migrations/022_fix_unlinked_questionnaires.sql`

This will:
1. Link course_interest questionnaires to course products
2. Link appointment questionnaires to appointment products
3. Show any remaining issues

## Step 4: Manual Linking (if needed)

If some questionnaires still can't be linked automatically, you can manually link them:

```sql
-- Example: Link a specific questionnaire to a specific product
UPDATE questionnaires
SET product_id = 'YOUR_PRODUCT_ID_HERE'
WHERE id = 'YOUR_QUESTIONNAIRE_ID_HERE';
```

## Step 5: Verify

```sql
-- Verify all questionnaires are linked
SELECT 
  COUNT(*) as total_questionnaires,
  COUNT(product_id) as linked_questionnaires,
  COUNT(*) - COUNT(product_id) as unlinked_questionnaires
FROM questionnaires;
```

If `unlinked_questionnaires` is 0, you're good! ✅

## Common Issues

### Issue 1: Questionnaires exist but products don't
**Solution:** Create products first, then run the fix script

### Issue 2: Products exist but questionnaires don't
**Solution:** Questionnaires are created automatically when products are created. Check if products were created through the Products Management page.

### Issue 3: Expert ID mismatch
**Solution:** Verify that `questionnaires.expert_id` matches `products.expert_id` for the same expert.

## Next Steps

After fixing, test:
1. Click "Register Interest" on a course - should show questionnaire form
2. Click "Enroll" on a course - should show questionnaire form  
3. Click "Register Interest" on appointment - should show questionnaire form
