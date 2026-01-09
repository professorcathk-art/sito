-- Fix Dashboard Profile Query Issue
-- This ensures users can always read their own profile for dashboard

-- Drop and recreate the "Users can view own profile" policy to ensure it works
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Also ensure the public policy allows reading listed profiles
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;

CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (listed_on_marketplace = true);

-- Verify policies are correct
-- Users should be able to:
-- 1. Read their own profile (regardless of listed_on_marketplace)
-- 2. Read public profiles (where listed_on_marketplace = true)
