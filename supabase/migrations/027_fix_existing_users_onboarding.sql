-- Fix: Mark all existing users as having completed onboarding
-- This migration fixes the issue where existing users were incorrectly redirected to onboarding

-- Mark all existing profiles as having completed onboarding
-- (Only update if they haven't been marked as completed yet)
UPDATE profiles 
SET onboarding_completed = true 
WHERE onboarding_completed IS NULL 
   OR onboarding_completed = false;

-- If you want to be more selective and only mark users who have actual profile data:
-- UPDATE profiles 
-- SET onboarding_completed = true 
-- WHERE (onboarding_completed IS NULL OR onboarding_completed = false)
--   AND (name IS NOT NULL OR bio IS NOT NULL OR category_id IS NOT NULL OR title IS NOT NULL);
