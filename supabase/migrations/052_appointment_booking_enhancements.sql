-- Appointment booking enhancements: product fields, appointment fields, intake form link

-- Add to products (for appointment type): what to expect and meeting location
ALTER TABLE products
ADD COLUMN IF NOT EXISTS what_to_expect TEXT,
ADD COLUMN IF NOT EXISTS meeting_location TEXT;

COMMENT ON COLUMN products.what_to_expect IS 'Description of what the client can expect during the appointment (for appointment products)';
COMMENT ON COLUMN products.meeting_location IS 'Meeting location or video call link placeholder (for appointment products)';

-- Add to appointments: meeting link, product reference, intake form response
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS meeting_link TEXT,
ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES products(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS questionnaire_response_id UUID REFERENCES questionnaire_responses(id) ON DELETE SET NULL;

COMMENT ON COLUMN appointments.meeting_link IS 'Video call or meeting URL for the appointment';
COMMENT ON COLUMN appointments.product_id IS 'Direct reference to the booked product (appointment type)';
COMMENT ON COLUMN appointments.questionnaire_response_id IS 'Link to intake form answers filled out when booking';

CREATE INDEX IF NOT EXISTS idx_appointments_product_id ON appointments(product_id);
CREATE INDEX IF NOT EXISTS idx_appointments_questionnaire_response_id ON appointments(questionnaire_response_id);
