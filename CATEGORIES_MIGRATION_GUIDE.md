# Categories Migration Guide

## Overview

A new migration has been created to expand the category list from 19 to approximately 50 categories, covering a wide range of expertise areas and job natures.

## Migration File

**File:** `supabase/migrations/034_add_comprehensive_categories.sql`

## What This Migration Does

1. **Adds 31+ new categories** to the existing 19 categories
2. **Uses `ON CONFLICT DO NOTHING`** - Safe to run multiple times, won't duplicate existing categories
3. **Organized by industry sectors:**
   - Technology & Development (6 categories)
   - Data & Analytics (3 categories)
   - Design & Creative (6 categories)
   - Business & Strategy (7 categories)
   - Marketing & Sales (5 categories)
   - Finance & Accounting (4 categories)
   - Professional Services (6 categories)
   - Education & Learning (3 categories)
   - Healthcare & Wellness (3 categories)
   - Content & Media (3 categories)
   - Specialized Industries (6 categories)
   - Emerging Fields (3 categories)

## New Categories Added

### Technology & Development
- DevOps & Cloud
- Cybersecurity
- Blockchain & Web3
- Game Development

### Data & Analytics
- Business Intelligence
- Database Administration

### Design & Creative
- 3D Modeling & Animation
- Video Production
- Writing & Editing

### Business & Strategy
- Business Strategy
- Project Management
- Supply Chain
- Quality Assurance

### Marketing & Sales
- Social Media Marketing
- Public Relations
- E-commerce

### Finance & Accounting
- Accounting (separated from Finance)

### Professional Services
- Recruiting
- Coaching
- Training & Development

### Education & Learning
- Language Learning
- Test Preparation

### Healthcare & Wellness
- Fitness & Nutrition
- Mental Health

### Content & Media
- Podcasting
- Streaming

### Specialized Industries
- Architecture
- Engineering
- Science & Research
- Agriculture
- Aviation
- Maritime

### Emerging Fields
- Sustainability
- Virtual Reality
- Robotics

## How to Apply

### Option 1: Via Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy and paste the contents of `supabase/migrations/034_add_comprehensive_categories.sql`
5. Click **Run** or press `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac)

### Option 2: Via Supabase CLI

If you're using Supabase CLI locally:

```bash
supabase db push
```

This will apply all pending migrations including this one.

## Verification

After running the migration, verify the categories were added:

```sql
SELECT COUNT(*) FROM categories;
-- Should return approximately 50 (19 existing + 31 new)

SELECT name FROM categories ORDER BY name;
-- View all categories alphabetically
```

## Notes

- **Safe to re-run**: The migration uses `ON CONFLICT DO NOTHING`, so it's safe to run multiple times
- **No data loss**: Existing categories remain unchanged
- **No breaking changes**: Existing profiles with category_id will continue to work
- **Icons included**: Each category has an emoji icon for visual identification

## Impact on Existing Data

- ✅ **No impact** on existing profiles - all existing category_id references remain valid
- ✅ **No impact** on existing courses or products
- ✅ **New categories** immediately available for selection in profile setup and expert directory

## Next Steps

After running the migration:

1. ✅ Categories will appear in the profile setup form dropdown
2. ✅ Categories will be available in the expert directory filters
3. ✅ Users can select from the expanded list when creating/updating profiles
4. ✅ Existing profiles remain unchanged unless users update them
