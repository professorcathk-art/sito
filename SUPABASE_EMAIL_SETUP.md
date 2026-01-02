# Supabase Setup for Email Features

## What You Need to Do in Supabase

### 1. Run Database Migration

Run the following SQL migration in your Supabase SQL Editor:

**File:** `supabase/migrations/003_contact_messages.sql`

This creates the `contact_messages` table to store contact form submissions.

### 2. No Additional Supabase Configuration Needed

The email functionality uses Next.js API routes with an external email service (Resend). Supabase is only used to:
- Store contact form submissions in the `contact_messages` table
- Fetch user email addresses for notifications
- Store messages and connections (already set up)

## Email Service Setup Required

You need to set up an email service to send emails. The code uses **Resend** by default.

### Quick Setup with Resend:

1. **Sign up for Resend** (free tier available): https://resend.com
2. **Get your API key** from the Resend dashboard
3. **Add to `.env.local`**:
   ```
   RESEND_API_KEY=re_your_api_key_here
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

### Alternative Email Services

You can modify the API routes (`app/api/contact/route.ts`, `app/api/notify-message/route.ts`, `app/api/notify-connection/route.ts`) to use:
- SendGrid
- Mailgun
- AWS SES
- Nodemailer with SMTP

## What Happens When:

### Contact Form Submission:
1. Data is saved to `contact_messages` table in Supabase ✅
2. Email is sent to `professor.cat.hk@gmail.com` via Resend API

### New Message Received:
1. Message is saved to `messages` table ✅ (already working)
2. Email notification is sent to recipient via Resend API

### New Connection Request:
1. Connection is saved to `connections` table ✅ (already working)
2. Email notification is sent to expert via Resend API

## Summary

**In Supabase, you only need to:**
- ✅ Run the `003_contact_messages.sql` migration
- ✅ That's it! Everything else is handled by the application code

**Outside of Supabase, you need to:**
- Set up Resend (or another email service)
- Add `RESEND_API_KEY` to your `.env.local` file

