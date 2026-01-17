-- Add enrollment_on_request field to products table
ALTER TABLE products
ADD COLUMN IF NOT EXISTS enrollment_on_request BOOLEAN DEFAULT false;

-- Add comment
COMMENT ON COLUMN products.enrollment_on_request IS 'If true, enrollment is on request and price/payment method is not displayed';

-- Update e_learning_subtype constraint to include 'live-webinar'
-- First, drop the existing constraint if it exists
DO $$ 
BEGIN
    -- Find and drop the existing constraint
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'products_e_learning_subtype_check'
    ) THEN
        ALTER TABLE products DROP CONSTRAINT products_e_learning_subtype_check;
    END IF;
END $$;

-- Add new constraint with live-webinar option
ALTER TABLE products
ADD CONSTRAINT products_e_learning_subtype_check CHECK (
  e_learning_subtype IS NULL OR 
  e_learning_subtype IN ('online-course', 'ebook', 'ai-prompt', 'live-webinar', 'other')
);

-- Create index for enrollment_on_request
CREATE INDEX IF NOT EXISTS idx_products_enrollment_on_request ON products(enrollment_on_request);
