-- Allow user_id to be NULL for email-based enrollments (expert adds member by email)
ALTER TABLE course_enrollments
ALTER COLUMN user_id DROP NOT NULL;

-- Allow experts to insert enrollments in their own courses (e.g. add member by email)
DROP POLICY IF EXISTS "Users can enroll in courses" ON course_enrollments;
CREATE POLICY "Users can enroll in courses"
  ON course_enrollments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Experts can insert enrollments in own courses"
  ON course_enrollments FOR INSERT
  WITH CHECK (
    user_id IS NULL
    AND EXISTS (
      SELECT 1 FROM courses
      WHERE id = course_enrollments.course_id
      AND expert_id = auth.uid()
    )
  );
