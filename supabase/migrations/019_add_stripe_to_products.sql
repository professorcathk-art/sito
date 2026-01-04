-- Add Stripe integration fields to products table
ALTER TABLE products
ADD COLUMN IF NOT EXISTS stripe_product_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_price_id TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_products_stripe_product_id ON products(stripe_product_id);
CREATE INDEX IF NOT EXISTS idx_products_stripe_price_id ON products(stripe_price_id);

-- Add comment to document the columns
COMMENT ON COLUMN products.stripe_product_id IS 'Stripe product ID for payment processing';
COMMENT ON COLUMN products.stripe_price_id IS 'Stripe price ID for payment processing';


