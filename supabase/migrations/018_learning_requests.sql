-- Create learning_requests table for students to post what they want to learn
CREATE TABLE IF NOT EXISTS learning_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(100),
  is_anonymous BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_learning_requests_user_id ON learning_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_requests_category ON learning_requests(category);
CREATE INDEX IF NOT EXISTS idx_learning_requests_is_active ON learning_requests(is_active);
CREATE INDEX IF NOT EXISTS idx_learning_requests_created_at ON learning_requests(created_at DESC);

-- RLS Policies
ALTER TABLE learning_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view active learning requests"
  ON learning_requests FOR SELECT
  USING (is_active = true);

CREATE POLICY "Users can view their own learning requests"
  ON learning_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own learning requests"
  ON learning_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own learning requests"
  ON learning_requests FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own learning requests"
  ON learning_requests FOR DELETE
  USING (auth.uid() = user_id);

