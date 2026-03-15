-- Add storefront_button_variant for advanced button styles (glass, neon, organic)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS storefront_button_variant TEXT DEFAULT 'default';

COMMENT ON COLUMN profiles.storefront_button_variant IS 'Button style variant: default, glass, neon, organic';

-- Add new premium theme presets to allowed values
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_storefront_theme_preset_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_storefront_theme_preset_check
  CHECK (storefront_theme_preset IN (
    'minimal', 'midnight-glass', 'neo-brutalist', 'soft-gradient',
    'fluid-aura', 'pearl-silk', 'organic-earth', 'neon-cyber', 'glass-ocean', 'liquid-velvet',
    'default', 'minimal-light', 'bold-dark'
  ));
