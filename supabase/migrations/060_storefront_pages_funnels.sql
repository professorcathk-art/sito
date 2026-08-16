-- Storefront Pages & Funnels (nav + lead magnet landing pages)

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS storefront_nav JSONB DEFAULT NULL;

COMMENT ON COLUMN profiles.storefront_nav IS
  'Nav config: { items: [{ id, label, enabled }], version: 1 }. ids: home|shop|posts|guides';

ALTER TABLE lead_magnets
  ADD COLUMN IF NOT EXISTS public_slug TEXT,
  ADD COLUMN IF NOT EXISTS hide_nav BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS landing_enabled BOOLEAN DEFAULT false;

COMMENT ON COLUMN lead_magnets.public_slug IS 'Public path segment for /s/{storeSlug}/l/{public_slug}';
COMMENT ON COLUMN lead_magnets.hide_nav IS 'When true, lead landing page hides storefront nav (funnel mode)';
COMMENT ON COLUMN lead_magnets.landing_enabled IS 'Pro: expose standalone landing page when public_slug set';

CREATE UNIQUE INDEX IF NOT EXISTS lead_magnets_expert_public_slug_uidx
  ON lead_magnets (expert_id, public_slug)
  WHERE public_slug IS NOT NULL AND public_slug <> '';

CREATE INDEX IF NOT EXISTS idx_lead_magnets_public_slug
  ON lead_magnets (public_slug)
  WHERE public_slug IS NOT NULL;
