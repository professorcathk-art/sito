-- Rename 'course' product_type to 'e-learning' and add e_learning_subtype column
-- This migration updates the product_type constraint and adds categorization for e-learning products

-- First, update existing 'course' records to 'e-learning'
UPDATE products
SET product_type = 'e-learning'
WHERE product_type = 'course';

-- Drop the old CHECK constraint
ALTER TABLE products
DROP CONSTRAINT IF EXISTS products_product_type_check;

-- Add new CHECK constraint with 'e-learning' instead of 'course'
ALTER TABLE products
ADD CONSTRAINT products_product_type_check 
CHECK (product_type IN ('service', 'e-learning', 'appointment'));

-- Add e_learning_subtype column for categorizing e-learning products
ALTER TABLE products
ADD COLUMN IF NOT EXISTS e_learning_subtype TEXT 
CHECK (e_learning_subtype IS NULL OR e_learning_subtype IN ('online-course', 'ebook', 'ai-prompt', 'other'));

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_products_e_learning_subtype ON products(e_learning_subtype);

-- Add comment to document the column
COMMENT ON COLUMN products.e_learning_subtype IS 'Sub-type categorization for e-learning products: online-course, ebook, ai-prompt, or other';
