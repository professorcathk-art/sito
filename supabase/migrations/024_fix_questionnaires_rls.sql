-- Fix RLS policies for questionnaires to allow public viewing of active questionnaires
-- This allows users to see questionnaires when registering interest or enrolling

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Experts can view their own questionnaires" ON questionnaires;

-- Create new policy: Experts can view their own questionnaires
CREATE POLICY "Experts can view their own questionnaires"
  ON questionnaires FOR SELECT
  USING (auth.uid() = expert_id);

-- Create new policy: Anyone can view active questionnaires linked to products
-- This allows users to see questionnaires when registering interest or enrolling
CREATE POLICY "Anyone can view active questionnaires for products"
  ON questionnaires FOR SELECT
  USING (
    is_active = true 
    AND product_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM products p
      WHERE p.id = questionnaires.product_id
      AND p.product_type IN ('course', 'appointment')
    )
  );

-- Verify the policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'questionnaires'
ORDER BY policyname;
