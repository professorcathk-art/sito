-- Create missing questionnaires for products that don't have them
-- This fixes products that were created before automatic questionnaire creation

-- First, check which products are missing questionnaires
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

-- Create questionnaires for course products that don't have them
-- Note: NOT EXISTS check prevents duplicates, so ON CONFLICT is not needed
INSERT INTO questionnaires (expert_id, product_id, type, title, is_active)
SELECT 
  p.expert_id,
  p.id as product_id,
  'course_interest' as type,
  COALESCE(p.name, 'Course Enrollment Form') || ' - Enrollment Form' as title,
  true as is_active
FROM products p
WHERE p.product_type = 'course'
  AND p.course_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 
    FROM questionnaires q 
    WHERE q.product_id = p.id
  );

-- Create questionnaires for appointment products that don't have them
-- Note: NOT EXISTS check prevents duplicates, so ON CONFLICT is not needed
INSERT INTO questionnaires (expert_id, product_id, type, title, is_active)
SELECT 
  p.expert_id,
  p.id as product_id,
  'appointment' as type,
  COALESCE(p.name, 'Appointment Booking Form') || ' - Booking Form' as title,
  true as is_active
FROM products p
WHERE p.product_type = 'appointment'
  AND NOT EXISTS (
    SELECT 1 
    FROM questionnaires q 
    WHERE q.product_id = p.id
  );

-- Create default fields (Name and Email) for newly created questionnaires
-- Only if they don't already have fields
INSERT INTO questionnaire_fields (questionnaire_id, field_type, label, placeholder, required, order_index)
SELECT 
  q.id as questionnaire_id,
  'text' as field_type,
  'Name' as label,
  'Enter your name' as placeholder,
  true as required,
  0 as order_index
FROM questionnaires q
WHERE q.id IN (
  SELECT id FROM questionnaires 
  WHERE product_id IN (
    SELECT id FROM products 
    WHERE product_type IN ('course', 'appointment')
  )
)
AND NOT EXISTS (
  SELECT 1 FROM questionnaire_fields qf 
  WHERE qf.questionnaire_id = q.id 
  AND LOWER(qf.label) LIKE '%name%'
);

INSERT INTO questionnaire_fields (questionnaire_id, field_type, label, placeholder, required, order_index)
SELECT 
  q.id as questionnaire_id,
  'email' as field_type,
  'Email' as label,
  'Enter your email' as placeholder,
  true as required,
  1 as order_index
FROM questionnaires q
WHERE q.id IN (
  SELECT id FROM questionnaires 
  WHERE product_id IN (
    SELECT id FROM products 
    WHERE product_type IN ('course', 'appointment')
  )
)
AND NOT EXISTS (
  SELECT 1 FROM questionnaire_fields qf 
  WHERE qf.questionnaire_id = q.id 
  AND LOWER(qf.label) LIKE '%email%'
);

-- Verify: Check that all products now have questionnaires
SELECT 
  COUNT(*) as total_products,
  COUNT(q.id) as products_with_questionnaires,
  COUNT(*) - COUNT(q.id) as products_without_questionnaires
FROM products p
LEFT JOIN questionnaires q ON q.product_id = p.id
WHERE p.product_type IN ('course', 'appointment');

-- Show any remaining products without questionnaires (should be 0)
SELECT 
  p.id as product_id,
  p.expert_id,
  p.product_type,
  p.name,
  'No questionnaire created - manual intervention needed' as issue
FROM products p
LEFT JOIN questionnaires q ON q.product_id = p.id
WHERE p.product_type IN ('course', 'appointment')
  AND q.id IS NULL;
