-- Add appointment_slot_id to appointments table to track which slot was booked
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS appointment_slot_id UUID REFERENCES appointment_slots(id) ON DELETE SET NULL;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_appointments_appointment_slot_id ON appointments(appointment_slot_id);


