-- Expand storefront theme engine schema
-- New fields: font_family, background_type, background_color, card_style
-- Extend theme_preset to allow: minimal, neo-brutalist, soft-gradient

-- Add new columns
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS storefront_font_family TEXT DEFAULT 'font-sans',
  ADD COLUMN IF NOT EXISTS storefront_background_type TEXT DEFAULT 'solid',
  ADD COLUMN IF NOT EXISTS storefront_background_color TEXT,
  ADD COLUMN IF NOT EXISTS storefront_card_style TEXT DEFAULT 'flat';

-- Extend theme_preset constraint to allow new values
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_storefront_theme_preset_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_storefront_theme_preset_check 
  CHECK (storefront_theme_preset IN ('minimal', 'midnight-glass', 'neo-brutalist', 'soft-gradient', 'default', 'minimal-light', 'bold-dark'));

-- Extend button_style to allow 'sharp' (maps from hard-edge)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_storefront_button_style_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_storefront_button_style_check 
  CHECK (storefront_button_style IN ('rounded-full', 'rounded-md', 'hard-edge', 'sharp', 'outline'));
