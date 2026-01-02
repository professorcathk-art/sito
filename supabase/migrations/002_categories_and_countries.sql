-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create countries table
CREATE TABLE IF NOT EXISTS countries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Insert comprehensive categories
INSERT INTO categories (name, description, icon) VALUES
  ('Website Development', 'Frontend, backend, and full-stack web development', '🌐'),
  ('Software Development', 'Mobile apps, desktop applications, and enterprise solutions', '💻'),
  ('Trading', 'Stock market, forex, cryptocurrency, and investment strategies', '📈'),
  ('Entrepreneur', 'Business strategy, startup guidance, and scaling expertise', '🚀'),
  ('Design', 'UI/UX design, graphic design, and creative direction', '🎨'),
  ('Marketing', 'Digital marketing, SEO, content strategy, and brand building', '📢'),
  ('Data Science', 'Machine learning, data analysis, and AI', '📊'),
  ('Product Management', 'Product strategy, roadmap planning, and execution', '📦'),
  ('Finance', 'Financial planning, accounting, and investment advisory', '💰'),
  ('Consulting', 'Business consulting and strategic advisory', '💼'),
  ('Education', 'Teaching, training, and educational content creation', '📚'),
  ('Healthcare', 'Medical advice, health coaching, and wellness', '🏥'),
  ('Legal', 'Legal advice and consultation', '⚖️'),
  ('Real Estate', 'Property investment and real estate consulting', '🏠'),
  ('Sales', 'Sales strategy and business development', '💬'),
  ('Operations', 'Operations management and process optimization', '⚙️'),
  ('Human Resources', 'HR strategy, talent acquisition, and people management', '👥'),
  ('Content Creation', 'Writing, video production, and content strategy', '✍️'),
  ('Photography', 'Photography and visual storytelling', '📷'),
  ('Music & Audio', 'Music production, audio engineering, and sound design', '🎵')
ON CONFLICT (name) DO NOTHING;

-- Insert comprehensive country list
INSERT INTO countries (name, code) VALUES
  ('United States', 'US'),
  ('United Kingdom', 'GB'),
  ('Canada', 'CA'),
  ('Australia', 'AU'),
  ('Germany', 'DE'),
  ('France', 'FR'),
  ('Japan', 'JP'),
  ('Singapore', 'SG'),
  ('Hong Kong', 'HK'),
  ('China', 'CN'),
  ('India', 'IN'),
  ('South Korea', 'KR'),
  ('Netherlands', 'NL'),
  ('Sweden', 'SE'),
  ('Switzerland', 'CH'),
  ('Spain', 'ES'),
  ('Italy', 'IT'),
  ('Brazil', 'BR'),
  ('Mexico', 'MX'),
  ('Argentina', 'AR'),
  ('South Africa', 'ZA'),
  ('United Arab Emirates', 'AE'),
  ('Saudi Arabia', 'SA'),
  ('Israel', 'IL'),
  ('New Zealand', 'NZ'),
  ('Ireland', 'IE'),
  ('Belgium', 'BE'),
  ('Austria', 'AT'),
  ('Denmark', 'DK'),
  ('Norway', 'NO'),
  ('Finland', 'FI'),
  ('Poland', 'PL'),
  ('Portugal', 'PT'),
  ('Greece', 'GR'),
  ('Turkey', 'TR'),
  ('Russia', 'RU'),
  ('Thailand', 'TH'),
  ('Malaysia', 'MY'),
  ('Indonesia', 'ID'),
  ('Philippines', 'PH'),
  ('Vietnam', 'VN'),
  ('Taiwan', 'TW'),
  ('Remote', 'REMOTE')
ON CONFLICT (name) DO NOTHING;

-- Update profiles table to reference categories and countries
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id),
  ADD COLUMN IF NOT EXISTS country_id UUID REFERENCES countries(id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_category_id ON profiles(category_id);
CREATE INDEX IF NOT EXISTS idx_profiles_country_id ON profiles(country_id);
CREATE INDEX IF NOT EXISTS idx_profiles_listed_on_marketplace ON profiles(listed_on_marketplace);

-- Enable RLS on new tables
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;

-- Categories and countries are public
CREATE POLICY "Categories are viewable by everyone"
  ON categories FOR SELECT
  USING (true);

CREATE POLICY "Countries are viewable by everyone"
  ON countries FOR SELECT
  USING (true);

