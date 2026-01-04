-- Fix unlinked questionnaires after migration 022
-- This script links any questionnaires that still have NULL product_id

-- First, let's see what we're working with
-- Check questionnaires without product_id
SELECT 
  q.id,
  q.expert_id,
  q.type,
  q.title,
  q.product_id
FROM questionnaires q
WHERE q.product_id IS NULL;

-- For course_interest questionnaires: Link to products with matching course_id
UPDATE questionnaires q
SET product_id = p.id
FROM products p
WHERE q.type = 'course_interest'
  AND q.product_id IS NULL
  AND p.course_id IS NOT NULL
  AND q.expert_id = p.expert_id
  AND p.product_type = 'course';

-- For appointment questionnaires: Link to appointment products
UPDATE questionnaires q
SET product_id = (
  SELECT p.id
  FROM products p
  WHERE p.product_type = 'appointment'
    AND p.expert_id = q.expert_id
  ORDER BY p.created_at ASC
  LIMIT 1
)
WHERE q.type = 'appointment'
  AND q.product_id IS NULL
  AND EXISTS (
    SELECT 1
    FROM products p
    WHERE p.product_type = 'appointment'
      AND p.expert_id = q.expert_id
  );

-- Check remaining unlinked questionnaires (these need manual linking)
SELECT 
  q.id,
  q.expert_id,
  q.type,
  q.title,
  'No matching product found' as issue
FROM questionnaires q
WHERE q.product_id IS NULL;

-- Show products that might need questionnaires
SELECT 
  p.id as product_id,
  p.expert_id,
  p.product_type,
  p.name,
  p.course_id,
  CASE 
    WHEN p.product_type = 'course' THEN 'course_interest'
    WHEN p.product_type = 'appointment' THEN 'appointment'
    ELSE NULL
  END as expected_questionnaire_type,
  q.id as existing_questionnaire_id
FROM products p
LEFT JOIN questionnaires q ON q.product_id = p.id
WHERE p.product_type IN ('course', 'appointment')
  AND q.id IS NULL
ORDER BY p.expert_id, p.product_type;
