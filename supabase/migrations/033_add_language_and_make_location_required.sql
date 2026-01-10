-- Add language_supported column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS language_supported TEXT[];

-- Add comment to document the field
COMMENT ON COLUMN profiles.language_supported IS 'Array of languages supported by the expert (e.g., ["English", "Mandarin", "Cantonese"])';

-- Note: Making country_id NOT NULL will require existing profiles to have a country
-- We'll set a default for existing profiles first
UPDATE profiles 
SET country_id = (SELECT id FROM countries WHERE name = 'Remote' LIMIT 1)
WHERE country_id IS NULL;

-- Now make country_id NOT NULL (this will require all new profiles to have a location)
-- Note: This is a breaking change, but since we've set defaults, it should be safe
-- We'll do this carefully by checking if constraint exists first
DO $$ 
BEGIN
    -- Check if column is already NOT NULL
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'country_id' 
        AND is_nullable = 'YES'
    ) THEN
        -- First, ensure all existing profiles have a country_id
        UPDATE profiles 
        SET country_id = (SELECT id FROM countries WHERE name = 'Remote' LIMIT 1)
        WHERE country_id IS NULL;
        
        -- Then make it NOT NULL
        ALTER TABLE profiles ALTER COLUMN country_id SET NOT NULL;
    END IF;
END $$;
