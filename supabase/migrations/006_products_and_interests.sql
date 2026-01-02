-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  expert_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  pricing_type TEXT CHECK (pricing_type IN ('one-off', 'hourly')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create product_interests table
CREATE TABLE IF NOT EXISTS product_interests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user_email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(product_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_interests ENABLE ROW LEVEL SECURITY;

-- Products policies
-- Anyone can read products from listed experts
CREATE POLICY "Public products are viewable by everyone"
  ON products FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = products.expert_id
      AND profiles.listed_on_marketplace = true
    )
  );

-- Experts can read their own products
CREATE POLICY "Experts can view own products"
  ON products FOR SELECT
  USING (auth.uid() = expert_id);

-- Experts can insert their own products
CREATE POLICY "Experts can insert own products"
  ON products FOR INSERT
  WITH CHECK (auth.uid() = expert_id);

-- Experts can update their own products
CREATE POLICY "Experts can update own products"
  ON products FOR UPDATE
  USING (auth.uid() = expert_id);

-- Experts can delete their own products
CREATE POLICY "Experts can delete own products"
  ON products FOR DELETE
  USING (auth.uid() = expert_id);

-- Product interests policies
-- Experts can read interests for their products
CREATE POLICY "Experts can view interests for their products"
  ON product_interests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_interests.product_id
      AND products.expert_id = auth.uid()
    )
  );

-- Users can read their own interests
CREATE POLICY "Users can view own interests"
  ON product_interests FOR SELECT
  USING (auth.uid() = user_id);

-- Users can register interest
CREATE POLICY "Users can register interest"
  ON product_interests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create trigger to update updated_at on products
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_products_expert_id ON products(expert_id);
CREATE INDEX IF NOT EXISTS idx_product_interests_product_id ON product_interests(product_id);
CREATE INDEX IF NOT EXISTS idx_product_interests_user_id ON product_interests(user_id);

