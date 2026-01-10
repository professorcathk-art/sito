-- Fix handle_new_user function to include country_id
-- Migration 033 made country_id NOT NULL, but handle_new_user() wasn't updated
-- This causes registration failures when country_id is not provided

-- Update handle_new_user function to include country_id with default value
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_country_id UUID;
BEGIN
  -- Get the default country ID (Remote or Hong Kong as fallback)
  SELECT id INTO default_country_id
  FROM countries
  WHERE name = 'Remote'
  LIMIT 1;
  
  -- If Remote doesn't exist, try Hong Kong
  IF default_country_id IS NULL THEN
    SELECT id INTO default_country_id
    FROM countries
    WHERE name = 'Hong Kong' OR code = 'HK'
    LIMIT 1;
  END IF;
  
  -- If still no country found, get the first available country
  IF default_country_id IS NULL THEN
    SELECT id INTO default_country_id
    FROM countries
    LIMIT 1;
  END IF;
  
  -- Insert profile with country_id
  INSERT INTO public.profiles (id, name, email, country_id)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'display_name',
      split_part(NEW.email, '@', 1)
    ),
    NEW.email,
    default_country_id  -- Set default country_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify the function was updated
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = 'handle_new_user'
  ) THEN
    RAISE EXCEPTION 'Function handle_new_user() not found';
  END IF;
END $$;
