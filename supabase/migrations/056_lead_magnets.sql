-- Multi-asset Lead Magnets + submissions CRM
-- Also allow questionnaires of type 'lead_magnet'

-- Expand questionnaire type constraint
ALTER TABLE questionnaires DROP CONSTRAINT IF EXISTS questionnaires_type_check;
ALTER TABLE questionnaires
  ADD CONSTRAINT questionnaires_type_check
  CHECK (type IN ('appointment', 'course_interest', 'lead_magnet', 'e-learning'));

-- Lead magnets (source of truth for free downloadable offers)
CREATE TABLE IF NOT EXISTS lead_magnets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  expert_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  cta_text TEXT DEFAULT 'Download free',
  placeholder TEXT DEFAULT 'Enter your email',
  success_message TEXT DEFAULT 'You''re in! Here''s your download.',
  cover_image_url TEXT,
  material_type TEXT NOT NULL DEFAULT 'file' CHECK (material_type IN ('file', 'link')),
  file_url TEXT,
  file_name TEXT,
  file_type TEXT,
  external_link TEXT,
  questionnaire_id UUID REFERENCES questionnaires(id) ON DELETE SET NULL,
  instant_download BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_lead_magnets_expert_id ON lead_magnets(expert_id);
CREATE INDEX IF NOT EXISTS idx_lead_magnets_questionnaire_id ON lead_magnets(questionnaire_id);

-- Captured submissions
CREATE TABLE IF NOT EXISTS lead_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_magnet_id UUID REFERENCES lead_magnets(id) ON DELETE CASCADE NOT NULL,
  expert_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  questionnaire_response_id UUID REFERENCES questionnaire_responses(id) ON DELETE SET NULL,
  responses JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_lead_submissions_expert_id ON lead_submissions(expert_id);
CREATE INDEX IF NOT EXISTS idx_lead_submissions_magnet_id ON lead_submissions(lead_magnet_id);
CREATE INDEX IF NOT EXISTS idx_lead_submissions_created_at ON lead_submissions(created_at DESC);

ALTER TABLE lead_magnets ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_submissions ENABLE ROW LEVEL SECURITY;

-- Experts manage own magnets
DROP POLICY IF EXISTS "Experts manage own lead magnets" ON lead_magnets;
CREATE POLICY "Experts manage own lead magnets"
  ON lead_magnets FOR ALL
  USING (auth.uid() = expert_id)
  WITH CHECK (auth.uid() = expert_id);

-- Public can read active magnets (storefront)
DROP POLICY IF EXISTS "Public can view active lead magnets" ON lead_magnets;
CREATE POLICY "Public can view active lead magnets"
  ON lead_magnets FOR SELECT
  TO public
  USING (is_active = true);

-- Experts read own submissions
DROP POLICY IF EXISTS "Experts read own lead submissions" ON lead_submissions;
CREATE POLICY "Experts read own lead submissions"
  ON lead_submissions FOR SELECT
  USING (auth.uid() = expert_id);

-- Public/anon can insert submissions
DROP POLICY IF EXISTS "Anyone can insert lead submissions" ON lead_submissions;
CREATE POLICY "Anyone can insert lead submissions"
  ON lead_submissions FOR INSERT
  TO public
  WITH CHECK (true);

-- Public can read lead_magnet questionnaires + fields when active magnet references them
DROP POLICY IF EXISTS "Public can view lead magnet questionnaires" ON questionnaires;
CREATE POLICY "Public can view lead magnet questionnaires"
  ON questionnaires FOR SELECT
  TO public
  USING (
    type = 'lead_magnet'
    AND is_active = true
    AND EXISTS (
      SELECT 1 FROM lead_magnets lm
      WHERE lm.questionnaire_id = questionnaires.id
        AND lm.is_active = true
    )
  );

DROP POLICY IF EXISTS "Public can view lead magnet questionnaire fields" ON questionnaire_fields;
CREATE POLICY "Public can view lead magnet questionnaire fields"
  ON questionnaire_fields FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM questionnaires q
      JOIN lead_magnets lm ON lm.questionnaire_id = q.id
      WHERE q.id = questionnaire_fields.questionnaire_id
        AND q.type = 'lead_magnet'
        AND q.is_active = true
        AND lm.is_active = true
    )
  );
