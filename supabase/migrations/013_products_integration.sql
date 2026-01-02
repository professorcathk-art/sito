-- Add product type and integration fields to products table
ALTER TABLE products
ADD COLUMN IF NOT EXISTS product_type TEXT CHECK (product_type IN ('service', 'course', 'appointment')) DEFAULT 'service',
ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS appointment_slot_id UUID REFERENCES appointment_slots(id) ON DELETE SET NULL;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_products_course_id ON products(course_id);
CREATE INDEX IF NOT EXISTS idx_products_appointment_slot_id ON products(appointment_slot_id);
CREATE INDEX IF NOT EXISTS idx_products_product_type ON products(product_type);

