# Vercel Environment Variables

Copy and paste these into Vercel Dashboard → Settings → Environment Variables

## Required Environment Variables

### Supabase Configuration
```
NEXT_PUBLIC_SUPABASE_URL=https://zyqjurzximonwpojeazp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_Pw741jqAbshYugXZZcizig_aCZN9vJs
SUPABASE_SERVICE_ROLE_KEY=sb_secret_Xu8vgXM2Spc8tybODD1nzQ_GG-corr8
```

### Email Service (Resend)
```
RESEND_API_KEY=re_iH4pcquy_PMoPupZh4aYbnMBcSPtjDWoJ
```

### Site URL
```
NEXT_PUBLIC_SITE_URL=https://sito-xi.vercel.app
```

## How to Add in Vercel

1. Go to **Vercel Dashboard** → Your Project
2. Click **Settings** → **Environment Variables**
3. For each variable above:
   - Click **Add New**
   - Paste the **Name** (left side)
   - Paste the **Value** (right side)
   - Select **Environment**: Choose **Production**, **Preview**, and **Development** (or just **Production** if you only want it for production)
   - Click **Save**

## Important Notes

- **NEXT_PUBLIC_SITE_URL**: Update this to your actual Vercel domain after deployment if it's different
- After adding variables, you **must redeploy** for them to take effect
- Variables starting with `NEXT_PUBLIC_` are exposed to the browser
- `SUPABASE_SERVICE_ROLE_KEY` should be kept secret (server-side only)

## After Adding Variables

1. Go to **Deployments** tab
2. Click the **"..."** menu on the latest deployment
3. Click **Redeploy**
4. Or push a new commit to trigger automatic redeployment

