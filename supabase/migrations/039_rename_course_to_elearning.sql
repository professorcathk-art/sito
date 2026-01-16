-- Rename 'course' product_type to 'e-learning' and add e_learning_subtype column
-- This migration updates the product_type constraint and adds categorization for e-learning products

-- Step 1: Drop ALL existing CHECK constraints on product_type column
-- The constraint might have a system-generated name from migration 013
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    -- Find and drop any CHECK constraint on product_type
    FOR constraint_name IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'products'::regclass 
        AND contype = 'c'
        AND pg_get_constraintdef(oid) LIKE '%product_type%'
    LOOP
        EXECUTE 'ALTER TABLE products DROP CONSTRAINT IF EXISTS ' || constraint_name;
        RAISE NOTICE 'Dropped constraint: %', constraint_name;
    END LOOP;
END $$;

-- Step 2: Update existing 'course' records to 'e-learning'
UPDATE products
SET product_type = 'e-learning'
WHERE product_type = 'course';

-- Step 3: Add new CHECK constraint with 'e-learning' instead of 'course'
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
