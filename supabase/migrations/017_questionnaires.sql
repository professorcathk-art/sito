-- Create questionnaires table for experts to set up custom forms
CREATE TABLE IF NOT EXISTS questionnaires (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  expert_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('appointment', 'course_interest')),
  title VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(expert_id, type) -- One questionnaire per expert per type
);

-- Create questionnaire_fields table for custom questions
CREATE TABLE IF NOT EXISTS questionnaire_fields (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  questionnaire_id UUID REFERENCES questionnaires(id) ON DELETE CASCADE NOT NULL,
  field_type VARCHAR(50) NOT NULL CHECK (field_type IN ('text', 'email', 'textarea', 'select', 'checkbox', 'radio')),
  label VARCHAR(255) NOT NULL,
  placeholder VARCHAR(255),
  required BOOLEAN DEFAULT false,
  options JSONB, -- For select, checkbox, radio options
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create questionnaire_responses table for storing user responses
CREATE TABLE IF NOT EXISTS questionnaire_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  questionnaire_id UUID REFERENCES questionnaires(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
  product_interest_id UUID REFERENCES product_interests(id) ON DELETE CASCADE,
  responses JSONB NOT NULL, -- Store all field responses as JSON
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_questionnaires_expert_id ON questionnaires(expert_id);
CREATE INDEX IF NOT EXISTS idx_questionnaires_type ON questionnaires(type);
CREATE INDEX IF NOT EXISTS idx_questionnaire_fields_questionnaire_id ON questionnaire_fields(questionnaire_id);
CREATE INDEX IF NOT EXISTS idx_questionnaire_responses_questionnaire_id ON questionnaire_responses(questionnaire_id);
CREATE INDEX IF NOT EXISTS idx_questionnaire_responses_appointment_id ON questionnaire_responses(appointment_id);
CREATE INDEX IF NOT EXISTS idx_questionnaire_responses_product_interest_id ON questionnaire_responses(product_interest_id);

-- RLS Policies for questionnaires
ALTER TABLE questionnaires ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Experts can view their own questionnaires"
  ON questionnaires FOR SELECT
  USING (auth.uid() = expert_id);

CREATE POLICY "Experts can insert their own questionnaires"
  ON questionnaires FOR INSERT
  WITH CHECK (auth.uid() = expert_id);

CREATE POLICY "Experts can update their own questionnaires"
  ON questionnaires FOR UPDATE
  USING (auth.uid() = expert_id)
  WITH CHECK (auth.uid() = expert_id);

CREATE POLICY "Experts can delete their own questionnaires"
  ON questionnaires FOR DELETE
  USING (auth.uid() = expert_id);

-- RLS Policies for questionnaire_fields
ALTER TABLE questionnaire_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view questionnaire fields for active questionnaires"
  ON questionnaire_fields FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM questionnaires 
      WHERE questionnaires.id = questionnaire_fields.questionnaire_id 
      AND questionnaires.is_active = true
    )
  );

CREATE POLICY "Experts can manage fields for their own questionnaires"
  ON questionnaire_fields FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM questionnaires 
      WHERE questionnaires.id = questionnaire_fields.questionnaire_id 
      AND questionnaires.expert_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM questionnaires 
      WHERE questionnaires.id = questionnaire_fields.questionnaire_id 
      AND questionnaires.expert_id = auth.uid()
    )
  );

-- RLS Policies for questionnaire_responses
ALTER TABLE questionnaire_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own responses"
  ON questionnaire_responses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own responses"
  ON questionnaire_responses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Experts can view responses to their questionnaires"
  ON questionnaire_responses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM questionnaires 
      WHERE questionnaires.id = questionnaire_responses.questionnaire_id 
      AND questionnaires.expert_id = auth.uid()
    )
  );

