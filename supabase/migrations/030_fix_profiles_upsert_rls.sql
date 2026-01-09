-- Fix Profiles Upsert RLS Policy
-- Ensure INSERT and UPDATE policies work correctly for upsert operations

-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Recreate INSERT policy with proper WITH CHECK clause
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Recreate UPDATE policy with both USING and WITH CHECK clauses
-- USING: checks existing rows (can I update this row?)
-- WITH CHECK: validates new values (are the new values allowed?)
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Verify policies exist
-- Users should be able to:
-- 1. INSERT their own profile (id must match auth.uid())
-- 2. UPDATE their own profile (id must match auth.uid() for both old and new values)
-- 3. This allows upsert operations to work correctly
