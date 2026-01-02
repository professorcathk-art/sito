# Supabase Setup Instructions

## Step 1: Create Environment Variables

Create a `.env.local` file in the root directory with the following content:

```
NEXT_PUBLIC_SUPABASE_URL=https://zyqjurzximonwpojeazp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_Pw741jqAbshYugXZZcizig_aCZN9vJs
SUPABASE_SERVICE_ROLE_KEY=sb_secret_Xu8vgXM2Spc8tybODD1nzQ_GG-corr8
```

## Step 2: Run Database Migration

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to SQL Editor
4. Copy and paste the contents of `supabase/migrations/001_initial_schema.sql`
5. Click "Run" to execute the migration

This will create:
- `profiles` table for expert profiles
- `messages` table for user messages
- `connections` table for user connections
- Row Level Security (RLS) policies
- Triggers for automatic profile creation and timestamp updates

## Step 3: Configure Authentication

1. In Supabase Dashboard, go to Authentication > Settings
2. Make sure "Enable Email Signup" is enabled
3. Configure email templates if needed
4. Set up email confirmation settings (optional but recommended)

## Step 4: Verify Setup

After running the migration, verify that:
- Tables are created in the Database > Tables section
- RLS policies are enabled
- Triggers are created

## Database Schema

### profiles
- `id` (UUID, Primary Key) - References auth.users
- `name` (TEXT)
- `email` (TEXT)
- `title` (TEXT) - Professional title
- `category` (TEXT) - Expert category
- `bio` (TEXT) - Biography
- `location` (TEXT)
- `website` (TEXT)
- `linkedin` (TEXT)
- `listed_on_marketplace` (BOOLEAN) - Whether profile is public
- `verified` (BOOLEAN) - Verification status
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### messages
- `id` (UUID, Primary Key)
- `from_id` (UUID) - Sender user ID
- `to_id` (UUID) - Recipient user ID
- `subject` (TEXT)
- `content` (TEXT)
- `read` (BOOLEAN)
- `created_at` (TIMESTAMP)

### connections
- `id` (UUID, Primary Key)
- `user_id` (UUID) - User requesting connection
- `expert_id` (UUID) - Expert being connected to
- `status` (TEXT) - 'pending', 'accepted', or 'rejected'
- `created_at` (TIMESTAMP)

## Security

Row Level Security (RLS) is enabled on all tables:
- Profiles: Public profiles are viewable by everyone, users can manage their own
- Messages: Users can only see messages they sent or received
- Connections: Users can only see their own connections

