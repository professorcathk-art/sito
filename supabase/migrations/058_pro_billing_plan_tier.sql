-- Pro billing: plan_tier, hide Powered-by badge, stripe customer on profiles
-- Keeps is_pro_store in sync; plan_tier is the canonical app-facing tier ('free' | 'pro')

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS plan_tier TEXT DEFAULT 'free',
ADD COLUMN IF NOT EXISTS hide_powered_by_sito BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_plan_tier_check'
  ) THEN
    ALTER TABLE profiles
      ADD CONSTRAINT profiles_plan_tier_check
      CHECK (plan_tier IN ('free', 'pro'));
  END IF;
END $$;

COMMENT ON COLUMN profiles.plan_tier IS 'SaaS plan: free | pro ($10/mo)';
COMMENT ON COLUMN profiles.hide_powered_by_sito IS 'Pro-only: hide Powered by Sito badge on storefront';
COMMENT ON COLUMN profiles.stripe_customer_id IS 'Stripe Customer ID for Billing Portal';

-- Backfill from existing Pro flag
UPDATE profiles
SET plan_tier = CASE WHEN COALESCE(is_pro_store, false) THEN 'pro' ELSE 'free' END
WHERE plan_tier IS NULL OR plan_tier NOT IN ('free', 'pro');

UPDATE profiles
SET monthly_email_limit = 2500
WHERE plan_tier = 'pro'
  AND (monthly_email_limit IS NULL OR monthly_email_limit < 2500);

-- Free users cannot keep badge hidden
UPDATE profiles
SET hide_powered_by_sito = false
WHERE plan_tier = 'free' AND COALESCE(hide_powered_by_sito, false) = true;

-- Extend Pro status sync to also set plan_tier + email quota
CREATE OR REPLACE FUNCTION update_pro_store_status()
RETURNS TRIGGER AS $$
DECLARE
  target_user UUID;
  is_active BOOLEAN;
  period_end TIMESTAMPTZ;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_user := OLD.user_id;
  ELSE
    target_user := NEW.user_id;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM saas_subscriptions
    WHERE user_id = target_user
      AND status IN ('active', 'trialing')
      AND current_period_end > NOW()
  ),
  (
    SELECT MAX(current_period_end) FROM saas_subscriptions
    WHERE user_id = target_user
      AND status IN ('active', 'trialing')
      AND current_period_end > NOW()
  )
  INTO is_active, period_end;

  UPDATE profiles
  SET
    is_pro_store = COALESCE(is_active, false),
    plan_tier = CASE WHEN COALESCE(is_active, false) THEN 'pro' ELSE 'free' END,
    monthly_email_limit = CASE WHEN COALESCE(is_active, false) THEN 2500 ELSE 50 END,
    pro_subscription_expires_at = period_end,
    hide_powered_by_sito = CASE
      WHEN COALESCE(is_active, false) THEN hide_powered_by_sito
      ELSE false
    END,
    updated_at = NOW()
  WHERE id = target_user;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Keep plan_tier ↔ is_pro_store consistent on direct profile updates
CREATE OR REPLACE FUNCTION sync_plan_tier_with_pro_store()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_pro_store IS DISTINCT FROM OLD.is_pro_store THEN
    NEW.plan_tier := CASE WHEN NEW.is_pro_store THEN 'pro' ELSE 'free' END;
    NEW.monthly_email_limit := CASE WHEN NEW.is_pro_store THEN 2500 ELSE 50 END;
    IF NOT NEW.is_pro_store THEN
      NEW.hide_powered_by_sito := false;
    END IF;
  ELSIF NEW.plan_tier IS DISTINCT FROM OLD.plan_tier THEN
    NEW.is_pro_store := (NEW.plan_tier = 'pro');
    NEW.monthly_email_limit := CASE WHEN NEW.plan_tier = 'pro' THEN 2500 ELSE 50 END;
    IF NEW.plan_tier = 'free' THEN
      NEW.hide_powered_by_sito := false;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_plan_tier_with_pro_store ON profiles;
CREATE TRIGGER sync_plan_tier_with_pro_store
  BEFORE UPDATE OF is_pro_store, plan_tier ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_plan_tier_with_pro_store();
