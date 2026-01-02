-- Add product_id to appointment_slots to link slots to products
ALTER TABLE appointment_slots
ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES products(id) ON DELETE CASCADE;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_appointment_slots_product_id ON appointment_slots(product_id);

