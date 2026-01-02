# Supabase Products Feature Setup

## Database Migration

You need to run the following migration in your Supabase Dashboard:

1. Go to **Supabase Dashboard** → Your Project → **SQL Editor**
2. Copy and paste the contents of `supabase/migrations/006_products_and_interests.sql`
3. Click **Run** to execute the migration

This will create:
- `products` table for expert products/services
- `product_interests` table for user interest registrations
- Row Level Security (RLS) policies
- Indexes for performance

## Database Schema

### products
- `id` (UUID, Primary Key)
- `expert_id` (UUID) - References auth.users
- `name` (TEXT) - Product/service name
- `description` (TEXT) - Product description
- `price` (DECIMAL) - Product price
- `pricing_type` (TEXT) - Either "one-off" or "hourly"
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### product_interests
- `id` (UUID, Primary Key)
- `product_id` (UUID) - References products
- `user_id` (UUID) - References auth.users
- `user_email` (TEXT) - User's email address
- `created_at` (TIMESTAMP)
- Unique constraint on (product_id, user_id)

## Features

1. **Products Management**: Experts can add, edit, and delete products in their dashboard
2. **Product Display**: Products are shown on expert profile pages
3. **Interest Registration**: Users can register interest in products
4. **Interest Management**: Experts can view and download CSV of interested users
5. **Email Notifications**: Experts receive email notifications when users register interest

## Email Notifications

Email notifications are sent via Resend API when:
- A user registers interest in an expert's product

The email includes:
- Product name
- Interested user's name and email
- Link to view products and interests in dashboard

## Daily Email Digest (Future Enhancement)

For daily email digests, you can set up:
1. A cron job (using Vercel Cron Jobs or similar)
2. A scheduled function in Supabase
3. An external service like Zapier or Make.com

The daily digest would:
- Collect all new interests from the past 24 hours
- Group by expert
- Send a single email with all interests

## Testing

After running the migration:
1. Go to Dashboard → Products
2. Add a test product
3. View your profile page to see the product
4. Register interest as another user
5. Check the Products → Registered Interests tab
6. Download the CSV file

