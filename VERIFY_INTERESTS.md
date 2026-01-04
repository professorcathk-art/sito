# Verify Product Interests Are Being Saved

## Quick Check

Run this in Supabase SQL Editor to verify interests exist:

```sql
-- Check if interests exist for your products
SELECT 
  pi.id,
  pi.product_id,
  pi.user_id,
  pi.user_email,
  pi.questionnaire_response_id,
  pi.created_at,
  p.name as product_name,
  p.expert_id,
  pr.name as expert_name
FROM product_interests pi
JOIN products p ON p.id = pi.product_id
JOIN profiles pr ON pr.id = p.expert_id
ORDER BY pi.created_at DESC
LIMIT 10;
```

## Check RLS Policies

```sql
-- Verify RLS policies exist
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'product_interests'
ORDER BY policyname;
```

You should see:
- ✅ "Experts can view interests for their products"
- ✅ "Users can view own interests"
- ✅ "Users can register interest"

## Test as Expert

If you're logged in as the expert, run:

```sql
-- This should return interests (as expert)
SELECT 
  pi.*,
  p.name as product_name
FROM product_interests pi
JOIN products p ON p.id = pi.product_id
WHERE p.expert_id = auth.uid()
ORDER BY pi.created_at DESC;
```

If this returns results but the UI shows 0, it's likely a cache issue.

## Solutions

1. **Clear Browser Cache** - Hard refresh (Cmd+Shift+R or Ctrl+Shift+R)
2. **Check Console** - Look for any errors in browser console
3. **Verify User ID** - Make sure you're logged in as the expert who owns the product
4. **Refresh Page** - Sometimes Supabase client needs to refresh
