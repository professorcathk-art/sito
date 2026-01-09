-- Fix Expert Directory: Ensure experts are listed and visible
-- Run this in Supabase Dashboard → SQL Editor

-- Step 1: Check current status
-- See how many experts exist and how many are listed
SELECT 
  COUNT(*) as total_profiles,
  COUNT(*) FILTER (WHERE listed_on_marketplace = true) as listed_profiles,
  COUNT(*) FILTER (WHERE name IS NOT NULL) as profiles_with_name,
  COUNT(*) FILTER (WHERE listed_on_marketplace = true AND name IS NOT NULL) as ready_to_show
FROM profiles;

-- Step 2: List all profiles with their listing status
SELECT 
  id,
  name,
  email,
  listed_on_marketplace,
  category_id,
  country_id,
  created_at
FROM profiles
ORDER BY created_at DESC
LIMIT 20;

-- Step 3: Fix - Mark experts with profiles as listed
-- Option A: List ALL profiles that have a name (most permissive)
UPDATE profiles 
SET listed_on_marketplace = true 
WHERE name IS NOT NULL 
  AND (listed_on_marketplace IS NULL OR listed_on_marketplace = false);

-- Option B: Only list profiles that have category_id (more selective)
-- Uncomment this if you want to be more selective:
-- UPDATE profiles 
-- SET listed_on_marketplace = true 
-- WHERE name IS NOT NULL 
--   AND category_id IS NOT NULL
--   AND (listed_on_marketplace IS NULL OR listed_on_marketplace = false);

-- Step 4: Verify the fix
SELECT 
  COUNT(*) as total_profiles,
  COUNT(*) FILTER (WHERE listed_on_marketplace = true) as listed_profiles,
  COUNT(*) FILTER (WHERE listed_on_marketplace = true AND name IS NOT NULL) as ready_to_show
FROM profiles;

-- Step 5: Check RLS policies are correct
-- This should return the policy details
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'profiles' 
  AND policyname LIKE '%Public%';

-- Step 6: Test query (should return experts)
SELECT 
  id,
  name,
  title,
  tagline,
  bio,
  listed_on_marketplace,
  category_id,
  country_id
FROM profiles
WHERE listed_on_marketplace = true
  AND name IS NOT NULL
LIMIT 10;
