-- Add payment method and contact email fields to products table
ALTER TABLE products
ADD COLUMN IF NOT EXISTS payment_method TEXT CHECK (payment_method IN ('stripe', 'offline')) DEFAULT 'stripe',
ADD COLUMN IF NOT EXISTS contact_email TEXT;

-- Add user_email field to course_enrollments for email-based enrollment
ALTER TABLE course_enrollments
ADD COLUMN IF NOT EXISTS user_email TEXT;

-- Create index for email-based enrollment lookups
CREATE INDEX IF NOT EXISTS idx_course_enrollments_user_email ON course_enrollments(user_email);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_course_email ON course_enrollments(course_id, user_email);

-- Update unique constraint to allow email-based enrollment
-- Remove the old unique constraint if it exists
ALTER TABLE course_enrollments DROP CONSTRAINT IF EXISTS course_enrollments_course_id_user_id_key;

-- Create partial unique indexes that allow one enrollment per course per user (by ID or email)
-- These indexes only apply when the respective field is NOT NULL
CREATE UNIQUE INDEX IF NOT EXISTS course_enrollments_course_user_id_unique 
  ON course_enrollments(course_id, user_id) 
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS course_enrollments_course_user_email_unique 
  ON course_enrollments(course_id, user_email) 
  WHERE user_email IS NOT NULL AND user_email != '';

-- Add comment to document the columns
COMMENT ON COLUMN products.payment_method IS 'Payment method: stripe (Stripe checkout) or offline (show contact email)';
COMMENT ON COLUMN products.contact_email IS 'Expert contact email for offline payment transactions';
COMMENT ON COLUMN course_enrollments.user_email IS 'User email for email-based enrollment (when user_id is NULL)';

