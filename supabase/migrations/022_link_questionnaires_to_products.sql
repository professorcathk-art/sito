-- Link questionnaires to products instead of experts
-- Add product_id column to questionnaires table
ALTER TABLE questionnaires
ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES products(id) ON DELETE CASCADE;

-- Drop the old unique constraint (expert_id, type)
ALTER TABLE questionnaires
DROP CONSTRAINT IF EXISTS questionnaires_expert_id_type_key;

-- Create new unique constraint: one questionnaire per product
-- Allow NULL temporarily for migration
CREATE UNIQUE INDEX IF NOT EXISTS questionnaires_product_id_key ON questionnaires(product_id)
WHERE product_id IS NOT NULL;

-- Migrate existing questionnaires to products
-- For course_interest questionnaires, link to the product with matching course_id
UPDATE questionnaires q
SET product_id = p.id
FROM products p
WHERE q.type = 'course_interest'
  AND p.course_id IS NOT NULL
  AND q.expert_id = p.expert_id
  AND q.product_id IS NULL;

-- For appointment questionnaires, link to the first appointment product for that expert
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
  AND q.product_id IS NULL;

-- Add constraint to limit 1 appointment product per expert
-- Use partial unique index to only enforce constraint for appointment products
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_one_appointment_per_expert
ON products(expert_id)
WHERE product_type = 'appointment';

-- Note: We keep product_id nullable for now to allow gradual migration
-- After verifying all questionnaires are linked, we can make it NOT NULL

