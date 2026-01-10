-- Fix handle_new_user function to include country_id
-- Migration 033 made country_id NOT NULL, but handle_new_user() wasn't updated
-- This causes registration failures when country_id is not provided

-- Update handle_new_user function to include country_id with default value
-- Handles case where countries table might not exist yet
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_country_id UUID;
  countries_table_exists BOOLEAN;
BEGIN
  -- Check if countries table exists
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'countries'
  ) INTO countries_table_exists;
  
  -- Only try to get country_id if countries table exists
  IF countries_table_exists THEN
    -- Get the default country ID (Remote or Hong Kong as fallback)
    SELECT id INTO default_country_id
    FROM public.countries
    WHERE name = 'Remote'
    LIMIT 1;
    
    -- If Remote doesn't exist, try Hong Kong
    IF default_country_id IS NULL THEN
      SELECT id INTO default_country_id
      FROM public.countries
      WHERE name = 'Hong Kong' OR code = 'HK'
      LIMIT 1;
    END IF;
    
    -- If still no country found, get the first available country
    IF default_country_id IS NULL THEN
      SELECT id INTO default_country_id
      FROM public.countries
      LIMIT 1;
    END IF;
  END IF;
  
  -- Check if country_id column exists and is NOT NULL
  -- If countries table doesn't exist or no country found, we need to handle it
  IF default_country_id IS NULL THEN
    -- Check if country_id column requires NOT NULL
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'profiles' 
      AND column_name = 'country_id' 
      AND is_nullable = 'NO'
    ) THEN
      -- If country_id is NOT NULL but we don't have a value, we have a problem
      -- This should not happen if migrations are run in order
      -- But we'll try to insert anyway and let the constraint error surface
      -- (Better than silently failing)
      RAISE EXCEPTION 'country_id is required but countries table is missing or empty. Please run migration 002_categories_and_countries.sql first.';
    END IF;
  END IF;
  
  -- Insert profile with country_id (if available)
  IF default_country_id IS NOT NULL THEN
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
      default_country_id
    );
  ELSE
    -- Fallback: Insert without country_id (only if column allows NULL)
    INSERT INTO public.profiles (id, name, email)
    VALUES (
      NEW.id,
      COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        NEW.raw_user_meta_data->>'display_name',
        split_part(NEW.email, '@', 1)
      ),
      NEW.email
    );
  END IF;
  
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
