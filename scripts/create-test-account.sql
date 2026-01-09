-- Create Test Account for Onboarding Testing
-- Run this in Supabase Dashboard → SQL Editor

-- Step 1: Create auth user
-- Note: This requires service role access. If you don't have it, use the registration form instead.
DO $$
DECLARE
  new_user_id UUID;
BEGIN
  -- Generate a new user ID
  new_user_id := gen_random_uuid();
  
  -- Insert into auth.users (requires service role)
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    role,
    aud,
    confirmation_token,
    recovery_token
  ) VALUES (
    new_user_id,
    '00000000-0000-0000-0000-000000000000',
    'test@example.com',
    crypt('Test1234!', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"Test User"}',
    false,
    'authenticated',
    'authenticated',
    '',
    ''
  );
  
  -- Create profile (onboarding_completed = false so they'll see onboarding)
  INSERT INTO profiles (
    id,
    name,
    email,
    onboarding_completed
  ) VALUES (
    new_user_id,
    'Test User',
    'test@example.com',
    false
  );
  
  RAISE NOTICE 'Test account created with ID: %', new_user_id;
END $$;

-- Alternative: If the above doesn't work due to RLS, use this simpler approach:
-- Just create the profile and let the user register through the UI
-- The profile will be created automatically via the trigger when they sign up
