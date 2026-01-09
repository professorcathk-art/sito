-- Add questionnaire_response_id column to course_enrollments table
-- This links course enrollments to questionnaire responses submitted during enrollment

ALTER TABLE course_enrollments
ADD COLUMN IF NOT EXISTS questionnaire_response_id UUID REFERENCES questionnaire_responses(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_course_enrollments_questionnaire_response_id 
ON course_enrollments(questionnaire_response_id);

-- Add comment to document the column
COMMENT ON COLUMN course_enrollments.questionnaire_response_id IS 'Optional link to questionnaire response if user filled out a questionnaire when enrolling in the course';

-- Verify the column was added
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'course_enrollments'
  AND column_name = 'questionnaire_response_id';
