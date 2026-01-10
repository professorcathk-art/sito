# Resend Email Setup Guide

## Overview
The application now sends email notifications to `professor.cat.hk@gmail.com` when:
1. A new user registers
2. A user completes the initial onboarding survey

## Setup Steps

### 1. Get Resend API Key
1. Go to [Resend.com](https://resend.com) and sign up/login
2. Navigate to API Keys section
3. Create a new API key
4. Copy the API key

### 2. Add Environment Variables

**In Vercel:**
1. Go to your project settings → Environment Variables
2. Add: `RESEND_API_KEY` = `your_api_key_here`
3. Optionally add: `RESEND_FROM_EMAIL` = `Sito <noreply@yourdomain.com>` (if you have a verified domain)

**In `.env.local` (for local development):**
```env
RESEND_API_KEY=your_api_key_here
RESEND_FROM_EMAIL=Sito <onboarding@resend.dev>
```

### 3. Verify Domain (Optional but Recommended)
1. In Resend dashboard, go to Domains
2. Add your domain (e.g., `sito.club`)
3. Add the DNS records provided by Resend
4. Once verified, update `RESEND_FROM_EMAIL` to use your domain

### 4. Email Content
The email includes:
- User name and email
- Intention (Learn from Experts / Share Knowledge & Experience)
- All survey responses:
  - For learners: Learning interests, category, location, experience level, age
  - For experts: Expertise category, level, bio, teaching interests
  - Profile completion: Display name, tagline, location

## Testing
After setup, test by:
1. Registering a new user
2. Completing the onboarding survey
3. Check `professor.cat.hk@gmail.com` for the notification email

## Troubleshooting
- If emails aren't sending, check Vercel logs for errors
- Make sure `RESEND_API_KEY` is set in Vercel environment variables
- Default sender email uses `onboarding@resend.dev` (works without domain verification)
