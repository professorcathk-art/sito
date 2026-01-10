-- Add phone number field to profiles table (required for expert profiles)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- Add comment to document the field
COMMENT ON COLUMN profiles.phone_number IS 'Expert phone number in E.164 format (e.g., +1234567890). Required for expert profile completion.';

-- Create index for phone lookups
CREATE INDEX IF NOT EXISTS idx_profiles_phone_number ON profiles(phone_number) WHERE phone_number IS NOT NULL;

-- Note: Phone number is required for expert profiles but no verification is needed
-- Users simply provide their phone number when completing their expert profile
