# How to Revoke Old Supabase Service Role Key

## ⚠️ IMPORTANT: Revoke Exposed Keys Immediately

If your Supabase service role key was exposed in Git history (even if the repo is now private), you **MUST** revoke it immediately.

---

## Step-by-Step: Revoke Old Key in Supabase

### Option 1: Generate New Key (Recommended)

1. Go to: **https://supabase.com/dashboard**
2. Select your project
3. Navigate to: **Settings** → **API**
4. Scroll to **"Project API keys"** section
5. Find the **"service_role"** key
6. Click **"Generate new service role key"** (if available)
   - This will create a new key and invalidate the old one
7. **Copy the new key immediately** (you can only see it once)
8. Update it in:
   - ✅ Vercel Dashboard → Environment Variables
   - ✅ Local `.env.local` file
9. Redeploy your application

### Option 2: Revoke and Create New Key

If Supabase doesn't have a "Generate new" option:

1. Go to: **https://supabase.com/dashboard**
2. Select your project
3. Navigate to: **Settings** → **API**
4. Find the **"service_role"** key
5. Look for **"Revoke"** or **"Delete"** button
6. Click to revoke/delete the old key
7. Create a new service role key:
   - Look for **"Create new service role key"** or similar
   - Or contact Supabase support if this option isn't available
8. Copy the new key
9. Update in Vercel and `.env.local`
10. Redeploy

---

## Why This Is Critical

### What Can Someone Do With Your Service Role Key?

The service role key has **full database access** and **bypasses Row Level Security (RLS)**. Someone with this key can:

- ❌ **Read all data** in your database (user profiles, payments, enrollments, etc.)
- ❌ **Modify/delete data** (change user records, delete courses, etc.)
- ❌ **Access sensitive information** (emails, payment intents, etc.)
- ❌ **Bypass all security policies** (RLS is disabled for service role)

### Timeline of Exposure

If your repo was **public** before you made it private:
- ⚠️ Keys may have been indexed by GitHub's search
- ⚠️ Bots may have scraped the repository
- ⚠️ Anyone who cloned the repo has the keys
- ⚠️ Keys are still in Git history (even if repo is now private)

**Bottom line:** Assume the old key is compromised and revoke it immediately.

---

## After Revoking the Old Key

### 1. Update All Locations

Make sure the new key is set in:

- ✅ **Vercel Dashboard** → Environment Variables → `SUPABASE_SERVICE_ROLE_KEY`
- ✅ **Local `.env.local`** file → `SUPABASE_SERVICE_ROLE_KEY`
- ✅ **Any CI/CD systems** (GitHub Actions, etc.)

### 2. Redeploy Immediately

**Vercel:**
- Go to Deployments → Latest deployment → ... → Redeploy
- This ensures production uses the new key

**Local:**
- Restart your dev server (`npm run dev`)

### 3. Test Critical Features

Test these features that use the service role key:

- ✅ Stripe webhooks (payment processing)
- ✅ Refund processing
- ✅ Payment verification
- ✅ Course enrollment management (invite/remove users)

### 4. Monitor for Suspicious Activity

Check Supabase Dashboard for:
- Unusual database queries
- Unexpected data changes
- Unauthorized access patterns

---

## What If You Can't Revoke?

If Supabase doesn't allow you to revoke the service role key directly:

1. **Contact Supabase Support:**
   - Go to: https://supabase.com/dashboard/support
   - Explain that your service role key was exposed
   - Request immediate revocation

2. **Alternative: Rotate All Keys:**
   - Generate new anon key (if possible)
   - Update all environment variables
   - This won't revoke the old service role key, but limits damage

3. **Monitor Database:**
   - Set up Supabase database alerts
   - Review access logs regularly
   - Watch for suspicious activity

---

## Security Checklist

- [ ] Revoked old Supabase service role key
- [ ] Generated new service role key
- [ ] Updated key in Vercel Dashboard
- [ ] Updated key in local `.env.local`
- [ ] Redeployed application on Vercel
- [ ] Restarted local dev server
- [ ] Tested critical features
- [ ] Monitored for suspicious activity

---

## Additional Security Measures

### 1. Review Database Access Logs

Check Supabase Dashboard → Logs for:
- Unusual query patterns
- Access from unexpected IPs
- Large data exports

### 2. Enable Database Alerts

Set up alerts in Supabase for:
- Failed authentication attempts
- Unusual query patterns
- Large data deletions

### 3. Review Row Level Security (RLS) Policies

Even though service role bypasses RLS, ensure your RLS policies are strong:
- Go to Supabase Dashboard → Authentication → Policies
- Review all table policies
- Ensure proper access controls

### 4. Rotate Other Exposed Keys

If other keys were exposed:
- ✅ Rotate Resend API key (if exposed)
- ✅ Rotate Stripe keys (if exposed)
- ✅ Review all environment variables

---

## Prevention for Future

### ✅ Best Practices:

1. **Never commit secrets:**
   - Use `.env.local` for local development
   - Use Vercel Dashboard for production
   - Use placeholders in documentation

2. **Use Git hooks:**
   - Pre-commit hooks to scan for secrets
   - Tools like `git-secrets` or `truffleHog`

3. **Regular audits:**
   - Periodically check Git history for secrets
   - Use tools like `git-secrets` or GitHub's secret scanning

4. **Keep repos private:**
   - ✅ Already done - repository is now private
   - Use private repos for production code

5. **Rotate keys regularly:**
   - Set a schedule to rotate keys (e.g., every 90 days)
   - Rotate immediately if exposed

---

## Summary

**YES, you MUST revoke the old key if it was exposed.**

1. ✅ Revoke old key in Supabase Dashboard
2. ✅ Generate new service role key
3. ✅ Update in Vercel and `.env.local`
4. ✅ Redeploy application
5. ✅ Test functionality
6. ✅ Monitor for suspicious activity

**Time is critical** - the longer the exposed key is active, the higher the risk of unauthorized access.

---

**Last Updated:** $(date)
