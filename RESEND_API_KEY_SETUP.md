# Resend API Key Setup

## Step 1: Get Your Resend API Key

1. Go to https://resend.com and sign up/login
2. Navigate to **API Keys** in the dashboard
3. Click **Create API Key**
4. Copy your API key (it starts with `re_`)

## Step 2: Add to .env.local

Open your `.env.local` file and replace `your_resend_api_key_here` with your actual API key:

```
RESEND_API_KEY=re_your_actual_api_key_here
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

**Important:** Make sure `.env.local` is in your `.gitignore` file (it should already be there) to keep your API key secure.

## Step 3: Restart Development Server

After adding the API key, restart your Next.js development server:

```bash
npm run dev
```

## Step 4: Verify Domain (Optional but Recommended)

For production, you should verify your domain in Resend:

1. Go to **Domains** in Resend dashboard
2. Add your domain
3. Add the DNS records provided
4. Update the `from` email in these files:
   - `app/api/contact/route.ts`
   - `app/api/notify-message/route.ts`
   - `app/api/notify-connection/route.ts`

Change `from: "Sito <onboarding@resend.dev>"` to `from: "Sito <noreply@yourdomain.com>"`

## Testing

After setup, test the email functionality:
1. Submit the contact form on the About page
2. Send a message to another user
3. Send a connection request

All should trigger email notifications successfully!

