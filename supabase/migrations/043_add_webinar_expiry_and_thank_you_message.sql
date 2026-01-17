-- Add webinar_expiry_date to products table
ALTER TABLE products
ADD COLUMN IF NOT EXISTS webinar_expiry_date TIMESTAMPTZ;

-- Add comment
COMMENT ON COLUMN products.webinar_expiry_date IS 'Expiry date for live webinar products (Hong Kong time). Products are hidden after this date.';

-- Add webinar_date_time to products table for live webinar schedule
ALTER TABLE products
ADD COLUMN IF NOT EXISTS webinar_date_time TIMESTAMPTZ;

-- Add comment
COMMENT ON COLUMN products.webinar_date_time IS 'Date and time of the live webinar (Hong Kong time). Displayed on product detail page.';

-- Add thank_you_message to questionnaires table
ALTER TABLE questionnaires
ADD COLUMN IF NOT EXISTS thank_you_message TEXT;

-- Add comment
COMMENT ON COLUMN questionnaires.thank_you_message IS 'Thank you message shown after form submission (rich text HTML supported)';

-- Create index for webinar_expiry_date for efficient filtering
CREATE INDEX IF NOT EXISTS idx_products_webinar_expiry_date ON products(webinar_expiry_date) WHERE webinar_expiry_date IS NOT NULL;
