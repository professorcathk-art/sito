-- Lead email broadcasts + monthly quota (Pro-ready)
-- Free default: 50/month · Pro: 2500/month (enforced in app via is_pro_store)

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS monthly_email_limit INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS emails_sent_this_month INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS email_quota_period TEXT;

COMMENT ON COLUMN profiles.monthly_email_limit IS 'Monthly broadcast email quota (50 free / 2500 pro)';
COMMENT ON COLUMN profiles.emails_sent_this_month IS 'Emails sent in the current email_quota_period month';
COMMENT ON COLUMN profiles.email_quota_period IS 'YYYY-MM period for emails_sent_this_month reset';

-- Backfill pro creators to higher limit
UPDATE profiles
SET monthly_email_limit = 2500
WHERE is_pro_store = true
  AND (monthly_email_limit IS NULL OR monthly_email_limit < 2500);

CREATE TABLE IF NOT EXISTS email_broadcasts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subject TEXT NOT NULL,
  body_content TEXT NOT NULL,
  recipient_count INTEGER NOT NULL DEFAULT 0,
  target_lead_magnet_id UUID REFERENCES lead_magnets(id) ON DELETE SET NULL,
  audience_label TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'sending'
    CHECK (status IN ('draft', 'sending', 'completed', 'failed', 'partial')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_email_broadcasts_creator_id ON email_broadcasts(creator_id);
CREATE INDEX IF NOT EXISTS idx_email_broadcasts_sent_at ON email_broadcasts(sent_at DESC);

ALTER TABLE email_broadcasts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Creators manage own broadcasts" ON email_broadcasts;
CREATE POLICY "Creators manage own broadcasts"
  ON email_broadcasts FOR ALL
  USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

-- Optional unsubscribe list (exclude from future broadcasts)
CREATE TABLE IF NOT EXISTS broadcast_unsubscribes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE (creator_id, email)
);

CREATE INDEX IF NOT EXISTS idx_broadcast_unsubscribes_creator ON broadcast_unsubscribes(creator_id);

ALTER TABLE broadcast_unsubscribes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Creators read own unsubscribes" ON broadcast_unsubscribes;
CREATE POLICY "Creators read own unsubscribes"
  ON broadcast_unsubscribes FOR SELECT
  USING (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Anyone can unsubscribe" ON broadcast_unsubscribes;
CREATE POLICY "Anyone can unsubscribe"
  ON broadcast_unsubscribes FOR INSERT
  TO public
  WITH CHECK (true);

-- Upsert onConflict needs UPDATE for idempotent unsubscribe clicks
DROP POLICY IF EXISTS "Anyone can re-unsubscribe" ON broadcast_unsubscribes;
CREATE POLICY "Anyone can re-unsubscribe"
  ON broadcast_unsubscribes FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- Keep monthly_email_limit in sync when Pro status changes
CREATE OR REPLACE FUNCTION sync_email_quota_on_pro_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_pro_store IS DISTINCT FROM OLD.is_pro_store THEN
    NEW.monthly_email_limit := CASE WHEN NEW.is_pro_store THEN 2500 ELSE 50 END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_email_quota_on_pro_change ON profiles;
CREATE TRIGGER sync_email_quota_on_pro_change
  BEFORE UPDATE OF is_pro_store ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_email_quota_on_pro_change();
