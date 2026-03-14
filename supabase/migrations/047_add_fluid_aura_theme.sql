-- Add fluid-aura to allowed storefront theme presets
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_storefront_theme_preset_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_storefront_theme_preset_check
  CHECK (storefront_theme_preset IN ('minimal', 'midnight-glass', 'neo-brutalist', 'soft-gradient', 'fluid-aura', 'default', 'minimal-light', 'bold-dark'));
