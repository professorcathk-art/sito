-- Add storefront customization fields to profiles table
-- This enables Link-in-Bio Creator Storefront features

-- Storefront theme and customization
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS storefront_theme_preset TEXT CHECK (storefront_theme_preset IN ('midnight-glass', 'minimal-light', 'bold-dark', 'default')) DEFAULT 'default',
ADD COLUMN IF NOT EXISTS storefront_custom_brand_color TEXT, -- Hex color code
ADD COLUMN IF NOT EXISTS storefront_button_style TEXT CHECK (storefront_button_style IN ('rounded-full', 'rounded-md', 'hard-edge', 'outline')) DEFAULT 'rounded-md',
ADD COLUMN IF NOT EXISTS storefront_custom_links JSONB DEFAULT '[]'::jsonb, -- Array of {title, url, icon, order}
ADD COLUMN IF NOT EXISTS storefront_show_products BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS storefront_show_appointments BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS storefront_show_blog BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS storefront_bio_override TEXT; -- Optional custom bio for storefront

-- Pro subscription tracking
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_pro_store BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS pro_subscription_expires_at TIMESTAMP WITH TIME ZONE;

-- Create SaaS subscriptions table (separate from follow subscriptions)
CREATE TABLE IF NOT EXISTS saas_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  plan_type TEXT CHECK (plan_type IN ('pro', 'enterprise')) NOT NULL,
  status TEXT CHECK (status IN ('active', 'canceled', 'past_due', 'trialing')) NOT NULL,
  current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_saas_subscriptions_user_id ON saas_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_saas_subscriptions_stripe_subscription_id ON saas_subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_saas_subscriptions_status ON saas_subscriptions(status);

-- Enable Row Level Security
ALTER TABLE saas_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for saas_subscriptions
-- Users can read their own subscriptions
CREATE POLICY "Users can view own subscriptions"
  ON saas_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Only system/admin can insert/update subscriptions (via API with service role)
-- Regular users cannot directly modify subscriptions

-- Add comments
COMMENT ON COLUMN profiles.storefront_theme_preset IS 'Theme preset for storefront: midnight-glass, minimal-light, bold-dark, or default';
COMMENT ON COLUMN profiles.storefront_custom_brand_color IS 'Custom brand color hex code for storefront theming';
COMMENT ON COLUMN profiles.storefront_button_style IS 'Button style: rounded-full, rounded-md, hard-edge, or outline';
COMMENT ON COLUMN profiles.storefront_custom_links IS 'JSON array of custom links: [{title, url, icon, order}]';
COMMENT ON COLUMN profiles.storefront_show_products IS 'Whether to show products on storefront';
COMMENT ON COLUMN profiles.storefront_show_appointments IS 'Whether to show appointments on storefront';
COMMENT ON COLUMN profiles.storefront_show_blog IS 'Whether to show blog posts on storefront';
COMMENT ON COLUMN profiles.is_pro_store IS 'Whether user has active Pro subscription';
COMMENT ON COLUMN profiles.pro_subscription_expires_at IS 'When Pro subscription expires';

-- Function to update is_pro_store based on saas_subscriptions
CREATE OR REPLACE FUNCTION update_pro_store_status()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET 
    is_pro_store = EXISTS (
      SELECT 1 FROM saas_subscriptions
      WHERE saas_subscriptions.user_id = profiles.id
      AND saas_subscriptions.status = 'active'
      AND saas_subscriptions.current_period_end > NOW()
    ),
    pro_subscription_expires_at = (
      SELECT MAX(current_period_end)
      FROM saas_subscriptions
      WHERE saas_subscriptions.user_id = profiles.id
      AND saas_subscriptions.status = 'active'
    )
  WHERE profiles.id = NEW.user_id OR profiles.id = OLD.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update pro_store status when subscription changes
CREATE TRIGGER update_pro_store_on_subscription_change
  AFTER INSERT OR UPDATE OR DELETE ON saas_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_pro_store_status();
