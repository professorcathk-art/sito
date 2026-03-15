-- Add storefront_subheadline_color for tagline, link descriptions, etc.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS storefront_subheadline_color TEXT;

COMMENT ON COLUMN profiles.storefront_subheadline_color IS 'Color for sub-headlines: tagline, link descriptions, bio secondary text';
