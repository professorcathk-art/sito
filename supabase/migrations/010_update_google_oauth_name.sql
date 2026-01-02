-- Update handle_new_user function to use Google account name from user_metadata
-- Google OAuth provides name in user_metadata.full_name or user_metadata.name
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
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
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also update existing profiles that don't have names but have Google OAuth metadata
-- Only update if name is NULL or empty string - never overwrite user-set names
UPDATE public.profiles p
SET name = COALESCE(
  (SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = p.id),
  (SELECT raw_user_meta_data->>'name' FROM auth.users WHERE id = p.id),
  (SELECT raw_user_meta_data->>'display_name' FROM auth.users WHERE id = p.id),
  p.name
)
WHERE (p.name IS NULL OR TRIM(p.name) = '') 
AND EXISTS (
  SELECT 1 FROM auth.users u 
  WHERE u.id = p.id 
  AND (u.raw_user_meta_data->>'full_name' IS NOT NULL 
    OR u.raw_user_meta_data->>'name' IS NOT NULL
    OR u.raw_user_meta_data->>'display_name' IS NOT NULL)
);

