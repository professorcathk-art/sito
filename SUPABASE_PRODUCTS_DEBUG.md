# Debug Guide: Products Not Showing in Featured Courses

## Quick Checklist

### 1. ✅ Run Migration 006 (Products Table)
Make sure you've run `006_products_and_interests.sql` in Supabase SQL Editor.

### 2. ✅ Run Migration 008 (Fix RLS)
Run `008_fix_products_rls.sql` to fix the RLS policies for products.

### 3. ✅ Verify Products Table Exists
Go to **Database** → **Tables** → Check if `products` table exists.

### 4. ✅ Check if Products Exist
Run this SQL query in Supabase SQL Editor:
```sql
SELECT * FROM products;
```

If this returns no rows, **you need to create products first!**

### 5. ✅ Check if Expert Profile is Listed
Run this SQL query:
```sql
SELECT id, name, listed_on_marketplace FROM profiles;
```

Make sure at least one profile has `listed_on_marketplace = true`.

### 6. ✅ Create a Test Product
1. Sign in to your account
2. Go to **Dashboard** → **Products**
3. Click **"+ Add Product"**
4. Fill in:
   - Product Name: "Test Course"
   - Description: "This is a test course"
   - Price: 100
   - Pricing Type: "One-off"
5. Click **"Add Product"**

### 7. ✅ Verify Product Was Created
Run this SQL query:
```sql
SELECT p.id, p.name, p.expert_id, pr.name as expert_name, pr.listed_on_marketplace
FROM products p
LEFT JOIN profiles pr ON p.expert_id = pr.id;
```

You should see your product with the expert name and `listed_on_marketplace = true`.

### 8. ✅ Check Browser Console
1. Open Featured Courses page
2. Press F12 to open Developer Tools
3. Go to **Console** tab
4. Look for any errors

Common errors:
- **"new row violates row-level security policy"** → RLS policy issue (run migration 008)
- **"relation 'products' does not exist"** → Migration 006 not run
- **"column does not exist"** → Missing column (run migration 007)

### 9. ✅ Test RLS Policy Directly
Run this SQL query to test if the RLS policy works:
```sql
-- This should return products from listed experts
SELECT p.*, pr.name as expert_name, pr.listed_on_marketplace
FROM products p
JOIN profiles pr ON p.expert_id = pr.id
WHERE pr.listed_on_marketplace = true;
```

If this returns products but the website doesn't show them, it's a frontend issue.

### 10. ✅ Verify Environment Variables
Make sure your `.env.local` has:
```
NEXT_PUBLIC_SUPABASE_URL=https://zyqjurzximonwpojeazp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_Pw741jqAbshYugXZZcizig_aCZN9vJs
```

And in Vercel, make sure these are set in **Settings** → **Environment Variables**.

## Step-by-Step Debugging

### If Products Don't Show:

1. **Check if products table exists:**
   ```sql
   SELECT COUNT(*) FROM products;
   ```
   If this returns 0, you need to create products via the dashboard.

2. **Check if expert is listed:**
   ```sql
   SELECT id, name, listed_on_marketplace 
   FROM profiles 
   WHERE id IN (SELECT DISTINCT expert_id FROM products);
   ```
   All experts with products should have `listed_on_marketplace = true`.

3. **Manually list an expert:**
   ```sql
   UPDATE profiles 
   SET listed_on_marketplace = true 
   WHERE id = 'your-expert-user-id';
   ```

4. **Check RLS policies:**
   Go to **Database** → **Tables** → **products** → **Policies**
   
   You should see:
   - ✅ "Public products are viewable by everyone"
   - ✅ "Experts can view own products"

5. **Test query without RLS:**
   Temporarily disable RLS to test (NOT for production):
   ```sql
   ALTER TABLE products DISABLE ROW LEVEL SECURITY;
   ```
   Then check if products show. If they do, the issue is RLS. Re-enable:
   ```sql
   ALTER TABLE products ENABLE ROW LEVEL SECURITY;
   ```

## Common Issues

### Issue 1: "No products available yet"
**Solution:** Create products via Dashboard → Products

### Issue 2: Products exist but don't show
**Solution:** 
1. Check if expert profile has `listed_on_marketplace = true`
2. Run migration 008 to fix RLS policies
3. Check browser console for errors

### Issue 3: RLS blocking queries
**Solution:** Run migration 008 to fix the RLS policy

### Issue 4: Products show for logged-in user but not anonymous
**Solution:** The RLS policy should allow anonymous reads. Run migration 008.

## Testing Checklist

- [ ] Migration 006 run (products table created)
- [ ] Migration 007 run (tagline column added)
- [ ] Migration 008 run (RLS policies fixed)
- [ ] At least one product created via Dashboard
- [ ] Expert profile has `listed_on_marketplace = true`
- [ ] Browser console shows no errors
- [ ] Environment variables are set correctly

## Still Not Working?

1. Check the browser Network tab (F12 → Network) when loading Featured Courses
2. Look for the Supabase API call to `/rest/v1/products`
3. Check the response - does it return products?
4. If the API returns products but the page doesn't show them, it's a frontend rendering issue
5. If the API returns empty array, it's a database/RLS issue

