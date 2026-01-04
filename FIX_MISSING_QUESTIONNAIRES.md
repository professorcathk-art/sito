# Fix Missing Questionnaires for Products

## Problem
Product `07007ed7-d753-43cd-93c9-0e11cd4703f1` exists but has no questionnaire linked to it. This causes the error:
- "Registration form is not yet set up by the expert"
- "No questionnaire found for product"

## Solution

### Step 1: Run the Fix Script

Run `supabase/migrations/023_create_missing_questionnaires.sql` in Supabase SQL Editor.

This script will:
1. ✅ Create questionnaires for all course products that don't have them
2. ✅ Create questionnaires for all appointment products that don't have them
3. ✅ Create default Name and Email fields for newly created questionnaires
4. ✅ Show verification results

### Step 2: Verify

After running the script, verify with:

```sql
-- Check that all products now have questionnaires
SELECT 
  p.id as product_id,
  p.name,
  p.product_type,
  q.id as questionnaire_id,
  q.title as questionnaire_title,
  CASE 
    WHEN q.id IS NULL THEN '❌ NO QUESTIONNAIRE'
    ELSE '✅ HAS QUESTIONNAIRE'
  END as status
FROM products p
LEFT JOIN questionnaires q ON q.product_id = p.id
WHERE p.product_type IN ('course', 'appointment')
ORDER BY p.product_type, p.name;
```

### Step 3: Check Fields

```sql
-- Verify questionnaires have fields
SELECT 
  q.id as questionnaire_id,
  q.title,
  COUNT(qf.id) as field_count,
  CASE 
    WHEN COUNT(qf.id) = 0 THEN '❌ NO FIELDS'
    ELSE '✅ HAS FIELDS'
  END as status
FROM questionnaires q
LEFT JOIN questionnaire_fields qf ON qf.questionnaire_id = q.id
WHERE q.product_id IN (
  SELECT id FROM products WHERE product_type IN ('course', 'appointment')
)
GROUP BY q.id, q.title
ORDER BY field_count ASC;
```

## What the Script Does

1. **Creates Missing Questionnaires:**
   - For course products: Creates `course_interest` type questionnaires
   - For appointment products: Creates `appointment` type questionnaires
   - Uses product name for questionnaire title
   - Sets `is_active = true`

2. **Creates Default Fields:**
   - Name field (text, required)
   - Email field (email, required)
   - Only creates if fields don't already exist

3. **Safety:**
   - Uses `ON CONFLICT DO NOTHING` to prevent duplicates
   - Only creates for products that don't have questionnaires
   - Only creates fields if they don't exist

## After Running

1. Refresh your browser
2. Try clicking "Register Interest" or "Enroll" again
3. The questionnaire form should now appear!

## If Issues Persist

If products still don't have questionnaires after running the script:

1. Check if the product exists:
```sql
SELECT * FROM products WHERE id = '07007ed7-d753-43cd-93c9-0e11cd4703f1';
```

2. Check if questionnaire was created:
```sql
SELECT * FROM questionnaires WHERE product_id = '07007ed7-d753-43cd-93c9-0e11cd4703f1';
```

3. Check for RLS (Row Level Security) issues - make sure the expert_id matches
