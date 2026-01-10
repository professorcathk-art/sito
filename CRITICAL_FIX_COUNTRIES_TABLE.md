# CRITICAL FIX: countries Table Missing

## Error

```
ERROR: relation "countries" does not exist (SQLSTATE 42P01)
```

## Root Cause

The `countries` table doesn't exist in your database. This means migration `002_categories_and_countries.sql` hasn't been run or failed.

## Immediate Fix Required

### Step 1: Run Migration 002 (CRITICAL)

1. Go to: **Supabase Dashboard → SQL Editor**
2. Open: `supabase/migrations/002_categories_and_countries.sql`
3. Copy the entire file
4. Paste into SQL Editor
5. Click **"Run"**
6. Verify: Should create `countries` and `categories` tables

### Step 2: Verify Tables Exist

Run this query in SQL Editor:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('countries', 'categories');
```

Should return both `countries` and `categories`.

### Step 3: Run Migration 038 (Updated Function)

1. Go to: **Supabase Dashboard → SQL Editor**
2. Open: `supabase/migrations/038_fix_handle_new_user_country_id.sql`
3. Copy and paste into SQL Editor
4. Click **"Run"**
5. This updates `handle_new_user()` function

### Step 4: Verify Migration 033 Was Run

Check if `country_id` is NOT NULL:

```sql
SELECT column_name, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'profiles' 
AND column_name = 'country_id';
```

If `is_nullable = 'NO'`, migration 033 was run.

## Migration Order

Migrations must be run in this order:

1. ✅ `001_initial_schema.sql` - Creates profiles table
2. ✅ `002_categories_and_countries.sql` - **Creates countries table** (MISSING!)
3. ✅ `033_add_language_and_make_location_required.sql` - Makes country_id NOT NULL
4. ✅ `038_fix_handle_new_user_country_id.sql` - Fixes function

## Why This Happened

- Migration 002 creates the `countries` table
- Migration 033 makes `country_id` NOT NULL (requires countries table)
- Migration 038 updates the function to use countries table
- If migration 002 wasn't run, the function fails

## Quick Fix Script

Run this in Supabase SQL Editor to create countries table if missing:

```sql
-- Create countries table if it doesn't exist
CREATE TABLE IF NOT EXISTS countries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Insert essential countries (at minimum)
INSERT INTO countries (name, code) VALUES
  ('Remote', 'REMOTE'),
  ('Hong Kong', 'HK'),
  ('United States', 'US')
ON CONFLICT (name) DO NOTHING;

-- Verify
SELECT * FROM countries LIMIT 5;
```

## After Fixing

1. ✅ Countries table exists
2. ✅ Migration 038 function updated
3. ✅ Test registration - should work now

---

**ACTION REQUIRED:** Run migration `002_categories_and_countries.sql` in Supabase SQL Editor NOW!
