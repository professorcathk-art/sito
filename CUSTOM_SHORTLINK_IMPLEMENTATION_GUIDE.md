# Custom Shortlink Feature Implementation Guide

## Overview
Allow experts to create custom shortlinks for their profiles (e.g., `sito.club/s/john-doe` instead of `sito.club/expert/uuid`)

## Implementation Steps

### Step 1: Database Migration
Create a migration to add `custom_slug` field to profiles table:

**File: `supabase/migrations/041_add_custom_slug_to_profiles.sql`**
```sql
-- Add custom_slug column to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS custom_slug TEXT UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_custom_slug ON profiles(custom_slug);

-- Add constraint to ensure slug format (lowercase, alphanumeric + hyphens)
ALTER TABLE profiles
ADD CONSTRAINT profiles_custom_slug_format CHECK (
  custom_slug IS NULL OR 
  (custom_slug ~ '^[a-z0-9-]+$' AND length(custom_slug) >= 3 AND length(custom_slug) <= 50)
);

-- Add comment
COMMENT ON COLUMN profiles.custom_slug IS 'Custom shortlink slug for expert profile (e.g., "john-doe" for sito.club/s/john-doe)';
```

### Step 2: Create Shortlink Route
Create a route handler that redirects shortlinks to expert profiles:

**File: `app/s/[slug]/page.tsx`**
```typescript
import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";

interface ShortlinkPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function ShortlinkPage({ params }: ShortlinkPageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  try {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("custom_slug", slug)
      .eq("listed_on_marketplace", true)
      .single();

    if (error || !profile) {
      notFound();
    }

    redirect(`/expert/${profile.id}`);
  } catch (error) {
    console.error("Error fetching profile by slug:", error);
    notFound();
  }
}
```

### Step 3: Add UI in Dashboard
Add shortlink management to expert dashboard:

**File: `app/dashboard/profile/page.tsx`** (or create new component)

Add a section for managing custom shortlink:
- Input field for custom slug
- Validation (lowercase, alphanumeric + hyphens, 3-50 chars)
- Check availability button
- Save button
- Display current shortlink if set

### Step 4: API Route for Validation
Create API route to check slug availability:

**File: `app/api/profile/check-slug/route.ts`**
```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await request.json();

    // Validate format
    if (!/^[a-z0-9-]+$/.test(slug) || slug.length < 3 || slug.length > 50) {
      return NextResponse.json({ 
        available: false, 
        error: "Slug must be 3-50 characters, lowercase alphanumeric with hyphens only" 
      });
    }

    // Check if slug exists (excluding current user's slug)
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("custom_slug", slug)
      .neq("id", user.id)
      .single();

    return NextResponse.json({ 
      available: !existing,
      message: existing ? "This slug is already taken" : "Available"
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

### Step 5: Update Profile Update Logic
Update profile update to handle custom_slug:

In your profile update component/API:
- Add custom_slug field to update form
- Validate slug format before saving
- Check availability before saving
- Update profiles table with custom_slug

### Step 6: Display Shortlink in Dashboard
Show the shortlink URL in expert dashboard:
- Display: `sito.club/s/{custom_slug}` if set
- Show "Not set" if no custom slug
- Provide copy-to-clipboard functionality

## Database Schema Changes

**New Column:**
- `profiles.custom_slug` (TEXT, UNIQUE, nullable)
- Format: lowercase alphanumeric + hyphens only
- Length: 3-50 characters
- Indexed for fast lookups

## Example Usage

1. Expert sets custom slug: `john-doe`
2. Profile accessible at: `sito.club/s/john-doe`
3. Redirects to: `sito.club/expert/{uuid}`

## Validation Rules

- ✅ Lowercase letters only
- ✅ Numbers allowed
- ✅ Hyphens allowed
- ✅ 3-50 characters
- ❌ No spaces
- ❌ No special characters except hyphens
- ❌ Must be unique across all profiles

## Security Considerations

1. **Reserved Slugs**: Block common slugs like `admin`, `api`, `dashboard`, etc.
2. **Rate Limiting**: Limit slug change frequency (e.g., once per month)
3. **Slug History**: Consider keeping old slugs temporarily for redirects
4. **Case Insensitivity**: Store lowercase, compare case-insensitively

## Testing Checklist

- [ ] Create custom slug
- [ ] Update custom slug
- [ ] Delete custom slug (set to null)
- [ ] Validate slug format
- [ ] Check slug availability
- [ ] Test shortlink redirect
- [ ] Test reserved slugs are blocked
- [ ] Test duplicate slug prevention
- [ ] Test slug length limits

## Estimated Implementation Time

- Database migration: 15 minutes
- Shortlink route: 30 minutes
- Dashboard UI: 1-2 hours
- API validation: 30 minutes
- Testing: 1 hour

**Total: ~3-4 hours**

## Next Steps

1. Review this guide
2. Approve the approach
3. I can implement all the code changes
4. You run the database migration
5. Test the feature
