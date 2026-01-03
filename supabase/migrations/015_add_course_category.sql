-- Add category field to courses table
ALTER TABLE courses
ADD COLUMN IF NOT EXISTS category VARCHAR(100);

-- Create index for faster category queries
CREATE INDEX IF NOT EXISTS idx_courses_category ON courses(category);

-- Add comment
COMMENT ON COLUMN courses.category IS 'Category of the course (e.g., AI Courses, Business, Design, etc.)';

