# Supabase Setup Guide for New Features

## 1. Run Database Migration

Run the following SQL migration in your Supabase SQL Editor:

**File:** `supabase/migrations/004_add_avatar_url.sql`

This adds the `avatar_url` column to the `profiles` table.

## 2. Set Up Storage Bucket for Profile Pictures

### Step 1: Create Storage Bucket

1. Go to your Supabase Dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **New bucket**
4. Name it: `avatars`
5. Make it **Public** (uncheck "Private bucket")
6. Click **Create bucket**

### Step 2: Set Up Storage Policies

Run the following SQL in your Supabase SQL Editor:

```sql
-- Drop existing policies if they exist (optional, for clean setup)
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Public can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can manage avatars" ON storage.objects;

-- Allow authenticated users to upload any file in avatars bucket
CREATE POLICY "Users can upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars');

-- Allow authenticated users to update any file in avatars bucket
CREATE POLICY "Users can update avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars')
WITH CHECK (bucket_id = 'avatars');

-- Allow authenticated users to delete any file in avatars bucket
CREATE POLICY "Users can delete avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars');

-- Allow public read access to avatars
CREATE POLICY "Public can view avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');
```

**Important:** These policies allow any authenticated user to upload/update/delete files in the avatars bucket. If you want more restrictive policies (users can only manage their own files), you'll need to adjust the file naming pattern in the upload code to include the user ID in a folder structure like `avatars/{user_id}/{filename}`.

## 3. Enable Google OAuth

### Step 1: Get Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google+ API**
4. Go to **Credentials** → **Create Credentials** → **OAuth client ID**
5. Choose **Web application**
6. Add authorized redirect URIs:
   - `https://zyqjurzximonwpojeazp.supabase.co/auth/v1/callback`
   - For local development: `http://localhost:3000/auth/callback` (if needed)
7. Copy the **Client ID** and **Client Secret**

### Step 2: Configure in Supabase

1. Go to your Supabase Dashboard
2. Navigate to **Authentication** → **Providers**
3. Find **Google** and enable it
4. Enter your **Client ID** and **Client Secret** from Google Cloud Console
5. Click **Save**

### Step 3: Update Redirect URLs (if needed)

In Supabase Dashboard → **Authentication** → **URL Configuration**, make sure your site URL is set correctly:
- **Site URL**: `http://localhost:3000` (for development) or your production URL
- **Redirect URLs**: Add your production URL if deploying

## 4. Verify Setup

After completing the above steps:

1. ✅ Profile pictures should upload successfully
2. ✅ Profile pictures should display in the directory
3. ✅ Google login button should work on login/register pages
4. ✅ Tagline field should have 100 character limit

## Troubleshooting

### Profile Pictures Not Uploading
- Check that the `avatars` bucket exists and is public
- Verify storage policies are set correctly
- Check browser console for errors

### Google Login Not Working
- Verify Google OAuth credentials are correct
- Check that redirect URIs match exactly
- Ensure Google+ API is enabled in Google Cloud Console
- Check Supabase logs for authentication errors

### Tagline Character Limit
- The limit is enforced in the frontend (maxLength={100})
- Character count is displayed in real-time

