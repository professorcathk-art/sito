# Supabase Changes Required

## 1. Add Phone Number Fields to product_interests Table

Run this SQL in Supabase SQL Editor:

```sql
-- Add country_code and phone_number columns to product_interests table
ALTER TABLE product_interests 
ADD COLUMN IF NOT EXISTS country_code TEXT,
ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- Add comment to document the columns
COMMENT ON COLUMN product_interests.country_code IS 'Optional country code for phone number (e.g., +1, +852)';
COMMENT ON COLUMN product_interests.phone_number IS 'Optional phone number without country code';
```

**Location**: Supabase Dashboard → SQL Editor → New Query → Paste and Run

## 2. Update Google OAuth Name Handling

Run this SQL in Supabase SQL Editor:

```sql
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
UPDATE public.profiles p
SET name = COALESCE(
  (SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = p.id),
  (SELECT raw_user_meta_data->>'name' FROM auth.users WHERE id = p.id),
  (SELECT raw_user_meta_data->>'display_name' FROM auth.users WHERE id = p.id),
  p.name
)
WHERE (p.name IS NULL OR p.name = '') 
AND EXISTS (
  SELECT 1 FROM auth.users u 
  WHERE u.id = p.id 
  AND (u.raw_user_meta_data->>'full_name' IS NOT NULL 
    OR u.raw_user_meta_data->>'name' IS NOT NULL
    OR u.raw_user_meta_data->>'display_name' IS NOT NULL)
);
```

**Location**: Supabase Dashboard → SQL Editor → New Query → Paste and Run

## What These Changes Do

### Phone Number Fields
- Adds optional `country_code` and `phone_number` columns to `product_interests` table
- Allows users to optionally provide their phone number when registering interest
- Experts can see phone numbers in their dashboard and CSV downloads

### Google OAuth Name
- Updates the `handle_new_user()` function to check multiple possible name fields from Google OAuth
- Checks in order: `full_name`, `name`, `display_name`, or falls back to email username
- Updates existing profiles that don't have names but have Google OAuth metadata
- Ensures users who sign in with Google get their display name automatically set

## Verification

After running the SQL:

1. **Phone Number**: 
   - Try registering interest in a product
   - Check that phone number fields appear in the form
   - Verify experts can see phone numbers in their dashboard

2. **Google OAuth Name**:
   - Sign out and sign in with Google
   - Check that your display name is automatically set from your Google account
   - Verify existing Google users get their names updated

