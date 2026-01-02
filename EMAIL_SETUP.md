# Email Setup Instructions

## Overview
This application requires email functionality for:
1. Contact form submissions (sends to professor.cat.hk@gmail.com)
2. Message notifications (notifies users when they receive messages)
3. Connection request notifications (notifies users when they receive connection requests)

## Option 1: Using Resend (Recommended)

### Step 1: Sign up for Resend
1. Go to https://resend.com
2. Sign up for a free account
3. Verify your email address

### Step 2: Get API Key
1. In Resend dashboard, go to API Keys
2. Create a new API key
3. Copy the API key

### Step 3: Add to Environment Variables
Add to your `.env.local` file:
```
RESEND_API_KEY=re_your_api_key_here
NEXT_PUBLIC_SITE_URL=http://localhost:3000  # or your production URL
```

### Step 4: Verify Domain (Optional but Recommended)
1. In Resend dashboard, go to Domains
2. Add your domain
3. Add the DNS records provided
4. Update the `from` email in API routes to use your verified domain

## Option 2: Using Supabase Edge Functions

Alternatively, you can use Supabase Edge Functions with an email service:

1. Create a Supabase Edge Function
2. Use a service like SendGrid, Mailgun, or AWS SES
3. Set up database webhooks to trigger the function

## Option 3: Using Nodemailer with SMTP

You can also use Nodemailer with any SMTP provider (Gmail, SendGrid, etc.):

1. Install nodemailer: `npm install nodemailer`
2. Update the API routes to use nodemailer
3. Configure SMTP settings in environment variables

## Database Setup Required

Run the following migration in Supabase SQL Editor:

```sql
-- File: supabase/migrations/003_contact_messages.sql
-- This creates the contact_messages table for storing contact form submissions
```

## Testing

After setup, test the email functionality:
1. Submit the contact form on the About page
2. Send a message to another user
3. Send a connection request

All should trigger email notifications.

