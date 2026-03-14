-- Add granular design columns for CSS variable-driven storefront
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS storefront_text_color TEXT,
  ADD COLUMN IF NOT EXISTS storefront_button_text_color TEXT;

COMMENT ON COLUMN profiles.storefront_text_color IS 'Text color hex for storefront';
COMMENT ON COLUMN profiles.storefront_button_text_color IS 'Button text color hex for storefront';
