-- Add country_code and phone_number columns to product_interests table
ALTER TABLE product_interests 
ADD COLUMN IF NOT EXISTS country_code TEXT,
ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- Add comment to document the columns
COMMENT ON COLUMN product_interests.country_code IS 'Optional country code for phone number (e.g., +1, +852)';
COMMENT ON COLUMN product_interests.phone_number IS 'Optional phone number without country code';

