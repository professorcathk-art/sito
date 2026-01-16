#!/bin/bash

echo "🔍 Health Check: Course to e-Learning Rename"
echo "=============================================="

ERRORS=0
WARNINGS=0

# Check 1: Verify all setFormData calls include e_learning_subtype
echo ""
echo "📋 Check 1: Verifying setFormData calls..."
FORM_DATA_CALLS=$(grep -n "setFormData({" components/products-management.tsx | wc -l)
MISSING_SUBTYPE=$(grep -n "setFormData({" components/products-management.tsx -A 12 | grep -v "e_learning_subtype" | grep -E "(name:|description:|price:)" | wc -l)

if [ "$MISSING_SUBTYPE" -gt 0 ]; then
  echo "   ❌ Found setFormData calls missing e_learning_subtype"
  ERRORS=$((ERRORS + 1))
else
  echo "   ✓ All setFormData calls include e_learning_subtype"
fi

# Check 2: Verify no old "course" product_type references
echo ""
echo "📋 Check 2: Checking for old 'course' product_type references..."
COURSE_REFS=$(grep -r 'product_type.*"course"' components/ app/ --include="*.tsx" --include="*.ts" 2>/dev/null | grep -v "e-learning" | wc -l)

if [ "$COURSE_REFS" -gt 0 ]; then
  echo "   ❌ Found old 'course' product_type references:"
  grep -rn 'product_type.*"course"' components/ app/ --include="*.tsx" --include="*.ts" 2>/dev/null | grep -v "e-learning"
  ERRORS=$((ERRORS + 1))
else
  echo "   ✓ No old 'course' product_type references found"
fi

# Check 3: Verify database queries use "e-learning"
echo ""
echo "📋 Check 3: Verifying database queries..."
DB_QUERIES=$(grep -rn '.eq("product_type", "course")' components/ app/ --include="*.tsx" --include="*.ts" 2>/dev/null | wc -l)

if [ "$DB_QUERIES" -gt 0 ]; then
  echo "   ❌ Found database queries using old 'course' product_type:"
  grep -rn '.eq("product_type", "course")' components/ app/ --include="*.tsx" --include="*.ts" 2>/dev/null
  ERRORS=$((ERRORS + 1))
else
  echo "   ✓ All database queries use 'e-learning'"
fi

# Check 4: Verify UI text updates
echo ""
echo "📋 Check 4: Verifying UI text updates..."
OLD_TEXT=$(grep -rn "Featured Course\|Featured Learnings" components/navigation.tsx components/featured-courses.tsx app/featured-courses/page.tsx 2>/dev/null | grep -v "Secret Recipe" | wc -l)

if [ "$OLD_TEXT" -gt 0 ]; then
  echo "   ⚠️  Found old 'Featured Course/Learnings' text (should be 'Secret Recipe')"
  WARNINGS=$((WARNINGS + 1))
else
  echo "   ✓ UI text updated to 'Secret Recipe'"
fi

# Check 5: Verify migration file exists
echo ""
echo "📋 Check 5: Verifying migration file..."
if [ -f "supabase/migrations/039_rename_course_to_elearning.sql" ]; then
  echo "   ✓ Migration file exists"
  
  # Check migration content
  if ! grep -q "e-learning" supabase/migrations/039_rename_course_to_elearning.sql; then
    echo "   ❌ Migration file missing e-learning update"
    ERRORS=$((ERRORS + 1))
  fi
  
  if ! grep -q "e_learning_subtype" supabase/migrations/039_rename_course_to_elearning.sql; then
    echo "   ❌ Migration file missing e_learning_subtype column"
    ERRORS=$((ERRORS + 1))
  fi
else
  echo "   ❌ Migration file not found"
  ERRORS=$((ERRORS + 1))
fi

# Summary
echo ""
echo "=============================================="
echo "📊 Results:"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
  echo "✅ All checks passed! No issues found."
  exit 0
else
  if [ $ERRORS -gt 0 ]; then
    echo "❌ Found $ERRORS error(s)"
  fi
  if [ $WARNINGS -gt 0 ]; then
    echo "⚠️  Found $WARNINGS warning(s)"
  fi
  exit $ERRORS
fi
