-- Add refund status and refund_id fields to course_enrollments and appointments tables
-- This allows tracking refund status and linking to Stripe refund objects

-- Add refund fields to course_enrollments
ALTER TABLE course_enrollments
ADD COLUMN IF NOT EXISTS refund_status TEXT CHECK (refund_status IN ('none', 'requested', 'processing', 'refunded', 'failed')) DEFAULT 'none',
ADD COLUMN IF NOT EXISTS refund_id TEXT, -- Stripe refund ID
ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(10, 2), -- Amount refunded (can be partial)
ADD COLUMN IF NOT EXISTS refund_reason TEXT; -- Reason for refund

-- Add refund fields to appointments
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS refund_status TEXT CHECK (refund_status IN ('none', 'requested', 'processing', 'refunded', 'failed')) DEFAULT 'none',
ADD COLUMN IF NOT EXISTS refund_id TEXT, -- Stripe refund ID
ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(10, 2), -- Amount refunded (can be partial)
ADD COLUMN IF NOT EXISTS refund_reason TEXT; -- Reason for refund

-- Create indexes for refund lookups
CREATE INDEX IF NOT EXISTS idx_course_enrollments_refund_status ON course_enrollments(refund_status);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_refund_id ON course_enrollments(refund_id);
CREATE INDEX IF NOT EXISTS idx_appointments_refund_status ON appointments(refund_status);
CREATE INDEX IF NOT EXISTS idx_appointments_refund_id ON appointments(refund_id);

-- Add comments to document the columns
COMMENT ON COLUMN course_enrollments.refund_status IS 'Refund status: none, requested, processing, refunded, failed';
COMMENT ON COLUMN course_enrollments.refund_id IS 'Stripe refund ID for tracking refunds';
COMMENT ON COLUMN course_enrollments.refunded_at IS 'Timestamp when refund was processed';
COMMENT ON COLUMN course_enrollments.refund_amount IS 'Amount refunded (can be partial refund)';
COMMENT ON COLUMN course_enrollments.refund_reason IS 'Reason for refund';

COMMENT ON COLUMN appointments.refund_status IS 'Refund status: none, requested, processing, refunded, failed';
COMMENT ON COLUMN appointments.refund_id IS 'Stripe refund ID for tracking refunds';
COMMENT ON COLUMN appointments.refunded_at IS 'Timestamp when refund was processed';
COMMENT ON COLUMN appointments.refund_amount IS 'Amount refunded (can be partial refund)';
COMMENT ON COLUMN appointments.refund_reason IS 'Reason for refund';
