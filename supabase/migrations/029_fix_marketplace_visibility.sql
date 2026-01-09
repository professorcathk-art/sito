-- Fix Marketplace Visibility
-- Reset listed_on_marketplace to false for users who haven't explicitly opted in
-- Only users who have completed their expert profile AND explicitly checked the box should be listed

-- Reset all users to not listed (they can opt-in via profile settings)
UPDATE profiles 
SET listed_on_marketplace = false;

-- Note: Users can enable marketplace visibility by:
-- 1. Completing their expert profile (category_id, bio, name)
-- 2. Going to Profile Setup
-- 3. Checking the "List my profile on the marketplace" checkbox
-- 4. Saving their profile

-- This ensures only users who explicitly want to be visible are shown in the directory
