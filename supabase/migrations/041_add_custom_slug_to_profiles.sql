-- Add custom_slug column to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS custom_slug TEXT UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_custom_slug ON profiles(custom_slug);

-- Add constraint to ensure slug format (lowercase, alphanumeric + hyphens)
ALTER TABLE profiles
ADD CONSTRAINT profiles_custom_slug_format CHECK (
  custom_slug IS NULL OR 
  (custom_slug ~ '^[a-z0-9-]+$' AND length(custom_slug) >= 3 AND length(custom_slug) <= 50)
);

-- Add comment
COMMENT ON COLUMN profiles.custom_slug IS 'Custom shortlink slug for expert profile (e.g., "john-doe" for sito.club/s/john-doe)';
