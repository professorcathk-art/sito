# Phase 1: Supabase Theme Preset Schema

## Assessment

The `profiles` table has a `storefront_theme_preset` column with a CHECK constraint that limits allowed values.

## Current Schema (from migrations 045, 047)

- **Column:** `storefront_theme_preset` (TEXT)
- **Allowed values:** minimal, midnight-glass, neo-brutalist, soft-gradient, fluid-aura, default, minimal-light, bold-dark

## Migration 048: Add pearl-silk

Run this SQL in Supabase SQL Editor or via `supabase db push`:

```sql
-- Add pearl-silk to allowed storefront theme presets (luxury light mode)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_storefront_theme_preset_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_storefront_theme_preset_check
  CHECK (storefront_theme_preset IN ('minimal', 'midnight-glass', 'neo-brutalist', 'soft-gradient', 'fluid-aura', 'pearl-silk', 'default', 'minimal-light', 'bold-dark'));
```

## Note

- `fluid-aura` was added in migration 047
- `pearl-silk` is added in migration 048
- Both themes are now supported in the schema
