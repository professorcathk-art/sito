# How to Update Supabase Service Role Key

## Step 1: Get Your New Key from Supabase

1. Go to: **https://supabase.com/dashboard**
2. Select your project
3. Go to: **Settings** → **API**
4. Find **"service_role"** key (under "Project API keys")
5. Click **"Reveal"** or **"Copy"** to get the new key
6. **Important:** If rotating due to exposure, generate a new key first:
   - Click **"Generate new service role key"** (if available)
   - Or revoke the old one and create a new one

---

## Step 2: Update in Vercel (Production)

### Option A: Via Vercel Dashboard (Recommended)

1. Go to: **https://vercel.com/dashboard**
2. Click on your project: **sito** (or your project name)
3. Click **Settings** tab
4. Click **Environment Variables** in the left sidebar
5. Find `SUPABASE_SERVICE_ROLE_KEY` in the list
6. Click **Edit** (pencil icon)
7. Replace the value with your new key
8. Click **Save**
9. **IMPORTANT:** Redeploy your application:
   - Go to **Deployments** tab
   - Click **"..."** menu on the latest deployment
   - Click **Redeploy**
   - Or push a new commit to trigger automatic redeployment

### Option B: Via Vercel CLI

```bash
vercel env add SUPABASE_SERVICE_ROLE_KEY production
# Paste your new key when prompted
# Then redeploy
vercel --prod
```

---

## Step 3: Update Local `.env.local` File

1. Open your project root directory: `/Users/mickeylau/Sito`
2. Open `.env.local` file (create it if it doesn't exist)
3. Find or add this line:
   ```
   SUPABASE_SERVICE_ROLE_KEY=your_new_key_here
   ```
4. Replace `your_new_key_here` with your actual new key
5. Save the file
6. **Restart your development server** if it's running:
   ```bash
   # Stop the server (Ctrl+C)
   # Then restart:
   npm run dev
   ```

### Example `.env.local` Format

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_new_service_role_key_here

# Other environment variables...
RESEND_API_KEY=your_resend_key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

---

## Step 4: Verify It Works

### Test Locally:
1. Start your dev server: `npm run dev`
2. Test a feature that uses service role (e.g., webhook, refund, invite user)
3. Check browser console and terminal for errors

### Test Production:
1. After redeploying on Vercel, test the same features
2. Check Vercel logs: **Deployments** → Click deployment → **Functions** tab
3. Look for any errors related to Supabase authentication

---

## Where This Key Is Used

The `SUPABASE_SERVICE_ROLE_KEY` is used in these API routes:

- ✅ `/app/api/stripe/webhooks/route.ts` - Stripe webhook processing
- ✅ `/app/api/stripe/refund/route.ts` - Refund processing
- ✅ `/app/api/stripe/checkout/verify-payment/route.ts` - Payment verification
- ✅ `/app/api/courses/manage-enrollment/route.ts` - Invite/remove users

All these routes use `createServiceRoleClient()` from `/lib/supabase/server.ts` which reads `process.env.SUPABASE_SERVICE_ROLE_KEY`.

---

## Troubleshooting

### Error: "SUPABASE_SERVICE_ROLE_KEY is not set"
- **Solution:** Make sure the key is set in `.env.local` (local) or Vercel Dashboard (production)
- **Check:** Restart your dev server after updating `.env.local`

### Error: "Invalid API key"
- **Solution:** Verify you copied the entire key correctly (no extra spaces)
- **Check:** The key should start with `eyJ...` (JWT format)

### Changes Not Taking Effect
- **Local:** Restart your dev server (`npm run dev`)
- **Production:** Redeploy on Vercel (environment variables are only loaded at build time)

---

## Security Reminders

✅ **DO:**
- Keep `.env.local` in `.gitignore` (already done)
- Use Vercel Dashboard for production keys
- Rotate keys immediately if exposed

❌ **DON'T:**
- Commit `.env.local` to Git
- Share keys in documentation or chat
- Use the same key for multiple projects

---

## Quick Checklist

- [ ] Generated new Supabase service role key
- [ ] Updated in Vercel Dashboard → Environment Variables
- [ ] Redeployed on Vercel
- [ ] Updated in local `.env.local` file
- [ ] Restarted local dev server
- [ ] Tested functionality locally
- [ ] Tested functionality in production

---

**Last Updated:** $(date)
