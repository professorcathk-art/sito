-- Add tagline column to profiles if it doesn't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tagline TEXT;

-- Add category_id and country_id columns if they don't exist
-- First check if category_id exists, if not add it
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'category_id'
    ) THEN
        ALTER TABLE profiles ADD COLUMN category_id UUID REFERENCES categories(id);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'country_id'
    ) THEN
        ALTER TABLE profiles ADD COLUMN country_id UUID REFERENCES countries(id);
    END IF;
END $$;

-- Update RLS policies to allow public read access to profiles with listed_on_marketplace = true
-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;

-- Create new policy that allows reading profiles with listed_on_marketplace = true
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (listed_on_marketplace = true);

-- Ensure users can still view their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

