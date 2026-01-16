/**
 * Health Check Script: Verify Course to e-Learning Rename
 * 
 * This script checks:
 * 1. All setFormData calls include e_learning_subtype
 * 2. All Product interfaces are consistent
 * 3. All database queries use "e-learning" instead of "course"
 * 4. All UI text references updated
 * 5. Migration file exists
 */

import * as fs from 'fs';
import * as path from 'path';

const errors: string[] = [];
const warnings: string[] = [];

// Check 1: Verify all setFormData calls include e_learning_subtype
function checkSetFormDataCalls() {
  console.log('\n📋 Check 1: Verifying setFormData calls...');
  const filePath = 'components/products-management.tsx';
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Find all setFormData calls with object literals
  const setFormDataRegex = /setFormData\(\s*\{[^}]*\}\s*\)/gs;
  const matches = content.matchAll(setFormDataRegex);
  
  let count = 0;
  for (const match of matches) {
    count++;
    const matchText = match[0];
    
    // Check if it's a full object (not spread)
    if (matchText.includes('name:') && !matchText.includes('e_learning_subtype')) {
      const lineNumber = content.substring(0, match.index).split('\n').length;
      errors.push(`❌ Missing e_learning_subtype in setFormData at line ${lineNumber}`);
    }
  }
  
  console.log(`   ✓ Found ${count} setFormData calls`);
}

// Check 2: Verify Product interfaces
function checkProductInterfaces() {
  console.log('\n📋 Check 2: Verifying Product interfaces...');
  const files = [
    'components/products-management.tsx',
    'components/expert-profile.tsx',
    'components/featured-courses.tsx',
  ];
  
  files.forEach(file => {
    const content = fs.readFileSync(file, 'utf-8');
    
    // Check if Product interface has e_learning_subtype
    if (content.includes('interface Product')) {
      if (!content.includes('e_learning_subtype') && file === 'components/products-management.tsx') {
        errors.push(`❌ Product interface missing e_learning_subtype in ${file}`);
      }
      
      // Check for old "course" product_type
      if (content.includes('product_type?: "course"')) {
        errors.push(`❌ Found old "course" product_type in ${file}`);
      }
    }
  });
  
  console.log(`   ✓ Checked ${files.length} files`);
}

// Check 3: Verify database queries
function checkDatabaseQueries() {
  console.log('\n📋 Check 3: Verifying database queries...');
  const files = [
    'components/products-management.tsx',
    'components/featured-courses.tsx',
    'app/featured-courses/page.tsx',
    'components/expert-profile.tsx',
  ];
  
  files.forEach(file => {
    const content = fs.readFileSync(file, 'utf-8');
    
    // Check for old "course" product_type in queries
    if (content.includes('.eq("product_type", "course")')) {
      errors.push(`❌ Found old "course" product_type query in ${file}`);
    }
    
    if (content.includes("product_type === 'course'") || content.includes('product_type === "course"')) {
      errors.push(`❌ Found old "course" product_type comparison in ${file}`);
    }
  });
  
  console.log(`   ✓ Checked ${files.length} files`);
}

// Check 4: Verify UI text
function checkUIText() {
  console.log('\n📋 Check 4: Verifying UI text updates...');
  const files = [
    'components/navigation.tsx',
    'components/featured-courses.tsx',
    'app/featured-courses/page.tsx',
  ];
  
  files.forEach(file => {
    const content = fs.readFileSync(file, 'utf-8');
    
    // Check for old "Featured Course" or "Featured Learnings"
    if (content.includes('Featured Course') || content.includes('Featured Learnings')) {
      if (!content.includes('Secret Recipe')) {
        warnings.push(`⚠️  Found old "Featured Course/Learnings" text in ${file}`);
      }
    }
    
    // Check for "Course" product type option
    if (content.includes('<option value="course">Course</option>')) {
      errors.push(`❌ Found old "Course" option in ${file}`);
    }
  });
  
  console.log(`   ✓ Checked ${files.length} files`);
}

// Check 5: Verify migration file
function checkMigration() {
  console.log('\n📋 Check 5: Verifying migration file...');
  const migrationFile = 'supabase/migrations/039_rename_course_to_elearning.sql';
  
  if (!fs.existsSync(migrationFile)) {
    errors.push(`❌ Migration file not found: ${migrationFile}`);
  } else {
    const content = fs.readFileSync(migrationFile, 'utf-8');
    
    if (!content.includes("product_type = 'e-learning'")) {
      errors.push(`❌ Migration file missing e-learning update`);
    }
    
    if (!content.includes('e_learning_subtype')) {
      errors.push(`❌ Migration file missing e_learning_subtype column`);
    }
  }
  
  console.log(`   ✓ Migration file checked`);
}

// Run all checks
console.log('🔍 Running Health Check: Course to e-Learning Rename\n');
console.log('=' .repeat(60));

checkSetFormDataCalls();
checkProductInterfaces();
checkDatabaseQueries();
checkUIText();
checkMigration();

// Print results
console.log('\n' + '='.repeat(60));
console.log('\n📊 Results:\n');

if (errors.length === 0 && warnings.length === 0) {
  console.log('✅ All checks passed! No issues found.\n');
  process.exit(0);
} else {
  if (errors.length > 0) {
    console.log(`❌ Found ${errors.length} error(s):\n`);
    errors.forEach(err => console.log(`   ${err}`));
  }
  
  if (warnings.length > 0) {
    console.log(`\n⚠️  Found ${warnings.length} warning(s):\n`);
    warnings.forEach(warn => console.log(`   ${warn}`));
  }
  
  console.log('\n');
  process.exit(errors.length > 0 ? 1 : 0);
}
