# Create Test Account for Onboarding

## Option 1: Manual Registration (Recommended)

1. Go to `/register` page
2. Fill in the registration form:
   - Name: Test User
   - Email: test@example.com (or any email you can access)
   - Password: Test1234! (must be at least 8 characters)
3. Click "Create Account"
4. You will be redirected to `/onboarding` page
5. Complete the onboarding flow:
   - Step 1: Choose "Learn from Experts" or "Share Knowledge & Experience"
   - Step 2: Fill in the relevant details based on your choice
   - Step 3: Complete your profile (display name, tagline, location)
6. After completion, you'll be redirected to the dashboard

## Option 2: Using Supabase SQL Editor

If you want to create a test account directly in the database:

1. Go to Supabase Dashboard → SQL Editor
2. Run this SQL (replace email and password hash):

```sql
-- Create auth user
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
  role
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'test@example.com',
  crypt('Test1234!', gen_salt('bf')), -- Password: Test1234!
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"Test User"}',
  false,
  'authenticated'
) RETURNING id;

-- Then create profile (use the id from above)
INSERT INTO profiles (
  id,
  name,
  email,
  onboarding_completed
) VALUES (
  '<USER_ID_FROM_ABOVE>',
  'Test User',
  'test@example.com',
  false
);
```

## Option 3: Using Supabase Auth API

You can also use the Supabase Auth API to create a test user programmatically.

## Testing the Onboarding Flow

After creating the account:

1. **Test Learner Path:**
   - Choose "Learn from Experts"
   - Add learning interests (e.g., "Web Development", "Trading")
   - Select a category
   - Select location
   - Choose experience level
   - Optionally add age
   - Complete profile

2. **Test Expert Path:**
   - Choose "Share Knowledge & Experience"
   - Select area of expertise
   - Choose expertise level
   - Write a bio
   - Add teaching interests
   - Complete profile

3. **Verify Data Storage:**
   - Check `profiles` table in Supabase
   - Verify `onboarding_completed` is `true`
   - Verify all fields are populated correctly
   - For learners: Check `learning_interests`, `learning_category_id`, etc.
   - For experts: Check `teaching_interests`, `category_id`, `bio`, etc.

## Test Account Credentials

- **Email:** test@example.com (or your chosen email)
- **Password:** Test1234!
- **Name:** Test User

## Notes

- The onboarding flow will redirect users who haven't completed it
- Users can go back to previous steps
- All data is stored in the `profiles` table
- The `onboarding_completed` flag prevents re-showing the onboarding
