-- Hybrid payouts: Stripe Connect (HK) + manual bank transfer (overseas)

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS payout_method TEXT,
ADD COLUMN IF NOT EXISTS available_balance DECIMAL(12, 2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS pending_payout_balance DECIMAL(12, 2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS bank_details JSONB;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_payout_method_check'
  ) THEN
    ALTER TABLE profiles
      ADD CONSTRAINT profiles_payout_method_check
      CHECK (payout_method IS NULL OR payout_method IN ('stripe_connect', 'manual_transfer'));
  END IF;
END $$;

COMMENT ON COLUMN profiles.payout_method IS 'stripe_connect (HK) | manual_transfer (overseas) | NULL = not enabled';
COMMENT ON COLUMN profiles.available_balance IS 'Net earnings ready for manual withdrawal (USD)';
COMMENT ON COLUMN profiles.pending_payout_balance IS 'Funds locked in a pending payout request';
COMMENT ON COLUMN profiles.bank_details IS 'JSON: recipientName, country, swiftBic, ibanOrAccount, bankCode';

CREATE TABLE IF NOT EXISTS payout_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  method TEXT NOT NULL DEFAULT 'manual_transfer'
    CHECK (method IN ('manual_transfer', 'stripe_connect')),
  bank_details_snapshot JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE,
  reference_id TEXT,
  admin_note TEXT
);

CREATE INDEX IF NOT EXISTS idx_payout_requests_user_id ON payout_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_payout_requests_status ON payout_requests(status);
CREATE INDEX IF NOT EXISTS idx_payout_requests_created_at ON payout_requests(created_at DESC);

ALTER TABLE payout_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Creators read own payout requests" ON payout_requests;
CREATE POLICY "Creators read own payout requests"
  ON payout_requests FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Creators insert own payout requests" ON payout_requests;
CREATE POLICY "Creators insert own payout requests"
  ON payout_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins manage payout requests" ON payout_requests;
CREATE POLICY "Admins manage payout requests"
  ON payout_requests FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Atomic: credit expert ledger after platform-held sale (net of platform fee)
CREATE OR REPLACE FUNCTION credit_expert_available_balance(
  p_expert_id UUID,
  p_net_amount DECIMAL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_net_amount IS NULL OR p_net_amount <= 0 THEN
    RETURN;
  END IF;
  UPDATE profiles
  SET
    available_balance = COALESCE(available_balance, 0) + p_net_amount,
    updated_at = NOW()
  WHERE id = p_expert_id;
END;
$$;

-- Atomic: request withdrawal (lock funds)
CREATE OR REPLACE FUNCTION request_manual_payout(
  p_user_id UUID,
  p_amount DECIMAL,
  p_currency TEXT DEFAULT 'usd'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_available DECIMAL;
  v_pending_count INT;
  v_bank JSONB;
  v_request_id UUID;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Invalid amount';
  END IF;

  SELECT available_balance, bank_details
  INTO v_available, v_bank
  FROM profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  IF COALESCE(v_available, 0) < p_amount THEN
    RAISE EXCEPTION 'Insufficient available balance';
  END IF;

  SELECT COUNT(*) INTO v_pending_count
  FROM payout_requests
  WHERE user_id = p_user_id AND status = 'pending';

  IF v_pending_count > 0 THEN
    RAISE EXCEPTION 'A payout request is already pending';
  END IF;

  IF v_bank IS NULL OR COALESCE(v_bank->>'recipientName', '') = '' THEN
    RAISE EXCEPTION 'Bank details required before requesting a payout';
  END IF;

  UPDATE profiles
  SET
    available_balance = available_balance - p_amount,
    pending_payout_balance = COALESCE(pending_payout_balance, 0) + p_amount,
    updated_at = NOW()
  WHERE id = p_user_id;

  INSERT INTO payout_requests (
    user_id, amount, currency, status, method, bank_details_snapshot
  ) VALUES (
    p_user_id, p_amount, COALESCE(p_currency, 'usd'), 'pending', 'manual_transfer', v_bank
  )
  RETURNING id INTO v_request_id;

  RETURN v_request_id;
END;
$$;

-- Atomic: approve payout (clear pending)
CREATE OR REPLACE FUNCTION approve_manual_payout(
  p_request_id UUID,
  p_reference_id TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req payout_requests%ROWTYPE;
BEGIN
  SELECT * INTO v_req
  FROM payout_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payout request not found';
  END IF;

  IF v_req.status <> 'pending' THEN
    RAISE EXCEPTION 'Payout request is not pending';
  END IF;

  UPDATE payout_requests
  SET
    status = 'approved',
    processed_at = NOW(),
    reference_id = NULLIF(TRIM(COALESCE(p_reference_id, '')), '')
  WHERE id = p_request_id;

  UPDATE profiles
  SET
    pending_payout_balance = GREATEST(0, COALESCE(pending_payout_balance, 0) - v_req.amount),
    updated_at = NOW()
  WHERE id = v_req.user_id;
END;
$$;

-- Reject: return funds to available
CREATE OR REPLACE FUNCTION reject_manual_payout(
  p_request_id UUID,
  p_admin_note TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req payout_requests%ROWTYPE;
BEGIN
  SELECT * INTO v_req
  FROM payout_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payout request not found';
  END IF;

  IF v_req.status <> 'pending' THEN
    RAISE EXCEPTION 'Payout request is not pending';
  END IF;

  UPDATE payout_requests
  SET
    status = 'rejected',
    processed_at = NOW(),
    admin_note = p_admin_note
  WHERE id = p_request_id;

  UPDATE profiles
  SET
    pending_payout_balance = GREATEST(0, COALESCE(pending_payout_balance, 0) - v_req.amount),
    available_balance = COALESCE(available_balance, 0) + v_req.amount,
    updated_at = NOW()
  WHERE id = v_req.user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION credit_expert_available_balance(UUID, DECIMAL) TO service_role;
GRANT EXECUTE ON FUNCTION request_manual_payout(UUID, DECIMAL, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION approve_manual_payout(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION reject_manual_payout(UUID, TEXT) TO authenticated, service_role;
