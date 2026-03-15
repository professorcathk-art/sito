-- Pending course enrollments for guest checkout (user paid but has no account yet)
CREATE TABLE IF NOT EXISTS pending_course_enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  payment_intent_id TEXT,
  questionnaire_response_id UUID REFERENCES questionnaire_responses(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pending_course_enrollments_email ON pending_course_enrollments(email);
CREATE INDEX IF NOT EXISTS idx_pending_course_enrollments_course_id ON pending_course_enrollments(course_id);

ALTER TABLE pending_course_enrollments ENABLE ROW LEVEL SECURITY;

-- Pending appointments for guest checkout (user paid but has no account yet)
CREATE TABLE IF NOT EXISTS pending_appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_slot_id UUID NOT NULL REFERENCES appointment_slots(id) ON DELETE CASCADE,
  expert_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  slot_start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  slot_end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER NOT NULL,
  rate_per_hour DECIMAL(10, 2) NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  payment_intent_id TEXT,
  questionnaire_response_id UUID REFERENCES questionnaire_responses(id) ON DELETE SET NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pending_appointments_email ON pending_appointments(email);

ALTER TABLE pending_appointments ENABLE ROW LEVEL SECURITY;

-- No policies: tables are only accessible via service role (API routes)
