-- Ensure Profiles RLS Policies Are Correct
-- This migration ensures all policies exist and are properly configured

-- First, ensure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to recreate them cleanly
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;

-- Recreate SELECT policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (listed_on_marketplace = true);

-- Recreate INSERT policy - critical for upsert operations
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Recreate UPDATE policy - must have both USING and WITH CHECK for upsert
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Verify: Users should be able to:
-- 1. SELECT their own profile (auth.uid() = id)
-- 2. SELECT public profiles (listed_on_marketplace = true)
-- 3. INSERT their own profile (WITH CHECK: auth.uid() = id)
-- 4. UPDATE their own profile (USING: auth.uid() = id, WITH CHECK: auth.uid() = id)
