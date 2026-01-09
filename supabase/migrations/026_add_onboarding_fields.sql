-- Add onboarding fields to profiles table
-- These fields store user preferences and onboarding data

-- Add user intention (learner or expert)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS user_intention TEXT CHECK (user_intention IN ('learn', 'teach', NULL));

-- For learners: learning preferences
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS learning_interests TEXT[], -- Array of what they want to learn
ADD COLUMN IF NOT EXISTS learning_category_id UUID REFERENCES categories(id), -- Category of learning
ADD COLUMN IF NOT EXISTS learning_location TEXT, -- Location for learning
ADD COLUMN IF NOT EXISTS experience_level TEXT CHECK (experience_level IN ('beginner', 'intermediate', 'advanced', NULL)), -- Level of experience
ADD COLUMN IF NOT EXISTS age INTEGER; -- Age (optional)

-- For experts: teaching preferences (some overlap with existing fields)
-- Note: bio, category_id, title already exist, but we'll use these for onboarding
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS expertise_level TEXT CHECK (expertise_level IN ('beginner', 'intermediate', 'advanced', 'expert', NULL)), -- Level of expertise
ADD COLUMN IF NOT EXISTS teaching_interests TEXT[]; -- What they want to teach

-- Track if onboarding is completed
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

-- Create index for onboarding status
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_completed ON profiles(onboarding_completed);

-- Add comment to document the fields
COMMENT ON COLUMN profiles.user_intention IS 'User intention: learn (student) or teach (expert)';
COMMENT ON COLUMN profiles.learning_interests IS 'Array of learning interests for students';
COMMENT ON COLUMN profiles.learning_category_id IS 'Category of learning interest';
COMMENT ON COLUMN profiles.learning_location IS 'Preferred location for learning';
COMMENT ON COLUMN profiles.experience_level IS 'Experience level: beginner, intermediate, advanced';
COMMENT ON COLUMN profiles.expertise_level IS 'Expertise level for teachers: beginner, intermediate, advanced, expert';
COMMENT ON COLUMN profiles.teaching_interests IS 'Array of teaching interests for experts';
COMMENT ON COLUMN profiles.onboarding_completed IS 'Whether user has completed onboarding flow';
