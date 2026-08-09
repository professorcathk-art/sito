-- Calendly-style weekly availability rules on appointment products
ALTER TABLE products
ADD COLUMN IF NOT EXISTS availability_rules JSONB;

COMMENT ON COLUMN products.availability_rules IS
  'Weekly availability: timezone, durationMinutes, bufferMinutes, minNoticeHours, horizonDays, weekly hours, dateOverrides';

CREATE INDEX IF NOT EXISTS idx_products_availability_rules
  ON products USING GIN (availability_rules)
  WHERE product_type = 'appointment';
