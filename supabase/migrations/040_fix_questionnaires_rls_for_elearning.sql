-- Fix RLS policy for questionnaires to include 'e-learning' product_type
-- This allows questionnaires to be visible for e-learning products

-- Drop the old policy that only checks for 'course'
DROP POLICY IF EXISTS "Anyone can view active questionnaires for products" ON questionnaires;

-- Recreate the policy with 'e-learning' instead of 'course'
CREATE POLICY "Anyone can view active questionnaires for products"
  ON questionnaires FOR SELECT
  USING (
    is_active = true 
    AND product_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM products p
      WHERE p.id = questionnaires.product_id
      AND p.product_type IN ('e-learning', 'appointment')
    )
  );

-- Verify the policy was updated
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'questionnaires'
  AND policyname = 'Anyone can view active questionnaires for products';
