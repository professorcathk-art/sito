-- Debug Expert Directory Issues
-- Run this in Supabase Dashboard → SQL Editor

-- 1. Check if profiles exist and are listed
SELECT 
  id,
  name,
  email,
  listed_on_marketplace,
  onboarding_completed,
  category_id,
  country_id,
  created_at
FROM profiles
WHERE listed_on_marketplace = true
ORDER BY created_at DESC
LIMIT 10;

-- 2. Check if profiles have names (required for directory)
SELECT 
  COUNT(*) as total_listed,
  COUNT(*) FILTER (WHERE name IS NOT NULL) as with_name,
  COUNT(*) FILTER (WHERE name IS NULL) as without_name
FROM profiles
WHERE listed_on_marketplace = true;

-- 3. Test the exact query the directory uses
SELECT 
  p.id,
  p.name,
  p.title,
  p.tagline,
  p.bio,
  p.verified,
  p.listed_on_marketplace,
  p.category_id,
  p.country_id,
  p.avatar_url,
  c.name as category_name,
  co.name as country_name
FROM profiles p
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN countries co ON p.country_id = co.id
WHERE p.listed_on_marketplace = true
  AND p.name IS NOT NULL
LIMIT 10;

-- 4. Check RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'profiles';

-- 5. Check if categories and countries tables exist and have data
SELECT COUNT(*) as category_count FROM categories;
SELECT COUNT(*) as country_count FROM countries;

-- 6. Check for any profiles that should be visible but aren't
SELECT 
  id,
  name,
  listed_on_marketplace,
  category_id,
  country_id,
  CASE 
    WHEN name IS NULL THEN 'Missing name'
    WHEN category_id IS NULL THEN 'Missing category'
    ELSE 'Should be visible'
  END as issue
FROM profiles
WHERE listed_on_marketplace = true
  AND (name IS NULL OR category_id IS NULL);
