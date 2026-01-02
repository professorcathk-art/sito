-- Fix products RLS policy to allow public read access
-- Drop existing policy
DROP POLICY IF EXISTS "Public products are viewable by everyone" ON products;

-- Create a simpler policy that allows reading products where expert is listed
-- This uses a function to check if the expert is listed
CREATE POLICY "Public products are viewable by everyone"
  ON products FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = products.expert_id
      AND profiles.listed_on_marketplace = true
    )
    OR auth.uid() = expert_id
  );

-- Also ensure the policy allows anonymous users to read
-- We need to make sure the policy works for unauthenticated users too
-- The above policy should work, but let's also add a policy that explicitly allows
-- reading products from listed experts without authentication check

-- Drop and recreate with better logic
DROP POLICY IF EXISTS "Public products are viewable by everyone" ON products;

CREATE POLICY "Public products are viewable by everyone"
  ON products FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = products.expert_id
      AND profiles.listed_on_marketplace = true
    )
  );

-- Keep the expert's own products policy
DROP POLICY IF EXISTS "Experts can view own products" ON products;
CREATE POLICY "Experts can view own products"
  ON products FOR SELECT
  USING (auth.uid() = expert_id);

