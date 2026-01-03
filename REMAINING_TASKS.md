# Remaining Tasks & Action Items

## ✅ Completed

1. ✅ Removed featured photo/icon from blog feed and blog creation
2. ✅ Removed "Explore by Category" section from landing page
3. ✅ Added learning request button for non-signed-in users
4. ✅ Filtered deleted courses from Featured Courses
5. ✅ Created email notification API for blog posts (Resend integration)
6. ✅ Renamed "Blog" to "Sharing" in navigation and key pages
7. ✅ Renamed "Manage Course" to "Classroom" in dashboard
8. ✅ Added course enrollment component with register interest and enroll buttons
9. ✅ Fixed product editing to update existing course instead of creating new one

## ⚠️ Action Required

### 1. Run Migration 018 in Supabase
**File:** `supabase/migrations/018_learning_requests.sql`

**Action:** Go to Supabase Dashboard → SQL Editor → Run the migration SQL

This will fix the error: "Could not find the table 'public.learning_requests' in the schema cache"

### 2. Product Editing UX Refactor (Optional Enhancement)
**Current:** Products are edited inline in the products management page
**Requested:** Show products as tiles, edit in separate page with back button

**Status:** Partially implemented - product editing now correctly updates instead of creating new courses. The UX refactor to separate page would require:
- Creating `/products/edit/[id]` page
- Updating ProductsManagement to link to edit page
- Moving edit form to separate page

This is a larger refactor and can be done later if needed.

## 📝 Notes

- Blog post email notifications are implemented and will send to subscribers when `notify_subscribers` is true
- Course enrollment supports questionnaires for both "register interest" and "enroll" actions
- Classroom page currently shows courses for experts only - student view with progress tracking can be added later
- Stripe payment integration for paid courses is marked as TODO in the enrollment component

