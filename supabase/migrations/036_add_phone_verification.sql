-- Add phone number and verification fields to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS phone_number TEXT,
ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS phone_verification_code TEXT,
ADD COLUMN IF NOT EXISTS phone_verification_expires_at TIMESTAMP WITH TIME ZONE;

-- Add comment to document the fields
COMMENT ON COLUMN profiles.phone_number IS 'User phone number in E.164 format (e.g., +1234567890)';
COMMENT ON COLUMN profiles.phone_verified IS 'Whether the phone number has been verified via SMS OTP';
COMMENT ON COLUMN profiles.phone_verification_code IS 'Temporary OTP code for phone verification';
COMMENT ON COLUMN profiles.phone_verification_expires_at IS 'Expiration time for verification code';

-- Create index for phone lookups
CREATE INDEX IF NOT EXISTS idx_profiles_phone_number ON profiles(phone_number) WHERE phone_number IS NOT NULL;

-- Note: Phone verification will be handled via Supabase Auth SMS OTP
-- The phone_number field stores the verified phone number
-- phone_verified flag indicates completion of verification step
