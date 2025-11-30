# Supabase Fix Guide - Expert Directory & Products Not Showing

## Issues Identified

1. **Missing `tagline` column** - Code expects `tagline` but database only has `title`
2. **Missing `category_id` and `country_id`** - Code expects foreign keys but database might have old TEXT columns
3. **RLS Policy Issues** - Policies might be blocking queries

## Steps to Fix in Supabase

### Step 1: Run Migration 007

1. Go to **Supabase Dashboard** → Your Project → **SQL Editor**
2. Copy and paste the contents of `supabase/migrations/007_fix_profiles_schema.sql`
3. Click **Run** to execute the migration

This will:
- Add `tagline` column to profiles table
- Add `category_id` and `country_id` columns if they don't exist
- Fix RLS policies to allow public access to listed profiles

### Step 2: Verify Tables Exist

Go to **Database** → **Tables** and verify:
- ✅ `profiles` table exists
- ✅ `products` table exists (from migration 006)
- ✅ `categories` table exists
- ✅ `countries` table exists
- ✅ `product_interests` table exists (from migration 006)

### Step 3: Check RLS Policies

Go to **Database** → **Tables** → **profiles** → **Policies**

Verify these policies exist:
- ✅ "Public profiles are viewable by everyone" - Allows SELECT where `listed_on_marketplace = true`
- ✅ "Users can view own profile" - Allows SELECT where `auth.uid() = id`
- ✅ "Users can update own profile" - Allows UPDATE where `auth.uid() = id`
- ✅ "Users can insert own profile" - Allows INSERT where `auth.uid() = id`

### Step 4: Check Products Table RLS

Go to **Database** → **Tables** → **products** → **Policies**

Verify these policies exist:
- ✅ "Public products are viewable by everyone" - Allows SELECT where expert is listed
- ✅ "Experts can view own products" - Allows SELECT where `auth.uid() = expert_id`
- ✅ "Experts can insert own products" - Allows INSERT where `auth.uid() = expert_id`
- ✅ "Experts can update own products" - Allows UPDATE where `auth.uid() = expert_id`
- ✅ "Experts can delete own products" - Allows DELETE where `auth.uid() = expert_id`

### Step 5: Test Data

1. **Create a test profile:**
   - Sign up/login
   - Go to Profile Setup
   - Fill in all fields
   - **Important:** Check "List my profile on the marketplace"
   - Save

2. **Create a test product:**
   - Go to Dashboard → Products
   - Add a product
   - Fill in name, description, price, pricing type
   - Save

3. **Verify in Directory:**
   - Go to Find Experts (Directory)
   - Your profile should appear

4. **Verify Featured Courses:**
   - Go to Featured Courses page
   - Your product should appear

### Step 6: Check Browser Console

If data still doesn't show:
1. Open browser Developer Tools (F12)
2. Go to Console tab
3. Look for any Supabase errors
4. Common errors:
   - "new row violates row-level security policy" - RLS policy issue
   - "column does not exist" - Missing column
   - "relation does not exist" - Table not created

### Step 7: Verify Environment Variables

Check that your `.env.local` file has:
```
NEXT_PUBLIC_SUPABASE_URL=https://zyqjurzximonwpojeazp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_Pw741jqAbshYugXZZcizig_aCZN9vJs
```

And in Vercel, make sure these are set in Environment Variables.

## Troubleshooting

### If experts still don't show:

1. **Check if profiles have `listed_on_marketplace = true`:**
   ```sql
   SELECT id, name, listed_on_marketplace FROM profiles;
   ```

2. **Manually update a profile to be listed:**
   ```sql
   UPDATE profiles SET listed_on_marketplace = true WHERE id = 'your-user-id';
   ```

### If products still don't show:

1. **Check if products exist:**
   ```sql
   SELECT * FROM products;
   ```

2. **Check if expert profiles are listed:**
   ```sql
   SELECT p.id, p.name, pr.listed_on_marketplace 
   FROM products p
   JOIN profiles pr ON p.expert_id = pr.id;
   ```

### If RLS is blocking:

Temporarily disable RLS to test (NOT recommended for production):
```sql
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
```

Then re-enable after testing:
```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
```

## Summary

The main fixes are:
1. ✅ Run migration 007 to add missing columns
2. ✅ Ensure RLS policies are correct
3. ✅ Make sure profiles have `listed_on_marketplace = true`
4. ✅ Verify environment variables are set correctly

After running migration 007, the queries should work correctly!

