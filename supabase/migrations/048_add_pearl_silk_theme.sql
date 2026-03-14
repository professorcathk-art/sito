-- Add pearl-silk to allowed storefront theme presets (luxury light mode)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_storefront_theme_preset_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_storefront_theme_preset_check
  CHECK (storefront_theme_preset IN ('minimal', 'midnight-glass', 'neo-brutalist', 'soft-gradient', 'fluid-aura', 'pearl-silk', 'default', 'minimal-light', 'bold-dark'));
