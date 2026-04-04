#!/usr/bin/env node

/**
 * Manual Verification Script for User Deactivation
 * 
 * This script helps verify that the user deactivation feature works correctly.
 * It provides step-by-step verification instructions and automated checks where possible.
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

console.log('🔍 User Deactivation Verification Tool\n');
console.log('=' .repeat(60));

async function verifySetup() {
  console.log('\n✅ 1. Verifying Code Changes...\n');
  
  // Check UserDeactivateDialog.tsx
  const dialogPath = path.join(__dirname, '../app/users/components/UserDeactivateDialog.tsx');
  const dialogContent = fs.readFileSync(dialogPath, 'utf8');
  
  const checks = [
    {
      name: 'Email trimming function exists',
      test: () => dialogContent.includes('isEmailMatch()'),
      description: 'Helper function should exist for email comparison'
    },
    {
      name: 'Case-insensitive comparison',
      test: () => dialogContent.includes('toLowerCase()'),
      description: 'Email comparison should be case-insensitive'
    },
    {
      name: 'Whitespace trimming',
      test: () => dialogContent.includes('trim()'),
      description: 'Input should be trimmed before comparison'
    },
    {
      name: 'Button uses isEmailMatch',
      test: () => dialogContent.includes('!isEmailMatch()'),
      description: 'Button disabled state should use isEmailMatch function'
    },
    {
      name: 'Blur handler for trimming',
      test: () => dialogContent.includes('onBlur'),
      description: 'Input should have blur handler to auto-trim'
    }
  ];
  
  let passed = 0;
  for (const check of checks) {
    if (check.test()) {
      console.log(`  ✅ ${check.name}`);
      passed++;
    } else {
      console.log(`  ❌ ${check.name}`);
      console.log(`     ${check.description}`);
    }
  }
  
  console.log(`\nResult: ${passed}/${checks.length} checks passed`);
  return passed === checks.length;
}

async function verifyDatabaseSchema() {
  console.log('\n✅ 2. Verifying Database Schema...\n');
  
  try {
    // Check if users table has isActive column
    const result = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'isActive'
    `;
    
    if (result.length > 0) {
      console.log('  ✅ users table has isActive column');
      console.log(`     Type: ${result[0].data_type}`);
      return true;
    } else {
      console.log('  ❌ users table missing isActive column');
      return false;
    }
  } catch (error) {
    console.log('  ❌ Error checking database schema:', error.message);
    return false;
  }
}

async function verifyAPILogic() {
  console.log('\n✅ 3. Verifying API Changes...\n');
  
  const apiPath = path.join(__dirname, '../app/api/users/[id]/route.ts');
  const apiContent = fs.readFileSync(apiPath, 'utf8');
  
  const checks = [
    {
      name: 'Soft delete implementation',
      test: () => apiContent.includes('isActive: false'),
      description: 'API should set isActive to false instead of deleting'
    },
    {
      name: 'Uses update instead of delete',
      test: () => apiContent.includes('prisma.user.update') && !apiContent.includes('prisma.user.delete({'),
      description: 'Should use prisma.user.update, not delete'
    },
    {
      name: 'Returns JSON response',
      test: () => apiContent.includes('NextResponse.json') && apiContent.includes('success: true'),
      description: 'API should return JSON with success indicator'
    },
    {
      name: 'Audit log updated',
      test: () => apiContent.includes('USER_DEACTIVATE'),
      description: 'Audit log should record USER_DEACTIVATE action'
    },
    {
      name: 'Includes deactivated user data',
      test: () => apiContent.includes('isActive: true') && apiContent.includes('deactivatedUser'),
      description: 'Response should include deactivated user data'
    }
  ];
  
  let passed = 0;
  for (const check of checks) {
    if (check.test()) {
      console.log(`  ✅ ${check.name}`);
      passed++;
    } else {
      console.log(`  ❌ ${check.name}`);
      console.log(`     ${check.description}`);
    }
  }
  
  console.log(`\nResult: ${passed}/${checks.length} checks passed`);
  return passed === checks.length;
}

async function verifyFiltering() {
  console.log('\n✅ 4. Verifying User Filtering...\n');
  
  const apiPath = path.join(__dirname, '../app/api/users/route.ts');
  const apiContent = fs.readFileSync(apiPath, 'utf8');
  
  const checks = [
    {
      name: 'Filters inactive users',
      test: () => apiContent.includes('isActive: true'),
      description: 'GET /api/users should filter to only active users'
    },
    {
      name: 'Where clause added',
      test: () => apiContent.includes('where:') && apiContent.includes('isActive'),
      description: 'Prisma query should have where clause for isActive'
    }
  ];
  
  let passed = 0;
  for (const check of checks) {
    if (check.test()) {
      console.log(`  ✅ ${check.name}`);
      passed++;
    } else {
      console.log(`  ❌ ${check.name}`);
      console.log(`     ${check.description}`);
    }
  }
  
  console.log(`\nResult: ${passed}/${checks.length} checks passed`);
  return passed === checks.length;
}

async function createTestUser() {
  console.log('\n✅ 5. Creating Test User...\n');
  
  try {
    const testUser = await prisma.user.create({
      data: {
        email: `test-deactivation-${Date.now()}@example.com`,
        name: 'Test Deactivation User',
        role: 'END_USER',
        passwordHash: 'hashed_password',
        isActive: true,
      },
    });
    
    console.log(`  ✅ Created test user: ${testUser.email}`);
    console.log(`     ID: ${testUser.id}`);
    console.log(`     isActive: ${testUser.isActive}`);
    
    return testUser;
  } catch (error) {
    console.log(`  ❌ Error creating test user: ${error.message}`);
    return null;
  }
}

async function manualTestInstructions() {
  console.log('\n' + '='.repeat(60));
  console.log('📝 MANUAL TEST INSTRUCTIONS\n');
  console.log('='.repeat(60));
  
  console.log('\n1. Start the application:');
  console.log('   npm run dev\n');
  
  console.log('2. Open browser and navigate to:');
  console.log('   http://localhost:3000/login\n');
  
  console.log('3. Log in as an admin user\n');
  
  console.log('4. Navigate to Users page\n');
  
  console.log('5. Find the test user created above\n');
  
  console.log('6. Click the "..." menu and select "Deactivate"\n');
  
  console.log('7. Test email verification:');
  console.log('   - Type wrong email → button should be disabled');
  console.log('   - Type correct email → button should be enabled');
  console.log('   - Try with spaces → should still work (auto-trim)');
  console.log('   - Try with different case → should still work\n');
  
  console.log('8. Click "Deactivate User" and verify:');
  console.log('   - Loading spinner appears');
  console.log('   - Success message shows');
  console.log('   - User disappears from list');
  console.log('   - Dialog closes automatically\n');
  
  console.log('9. Verify in database:');
  console.log('   - User still exists (not hard deleted)');
  console.log('   - isActive = false');
  console.log('   - Related records still exist\n');
  
  console.log('10. Test error cases:');
  console.log('    - Try to deactivate yourself (should fail)');
  console.log('    - Try without permission (should fail)');
}

async function cleanup() {
  console.log('\n✅ 6. Cleanup\n');
  console.log('Remember to clean up test users from the database.');
  console.log('Run this SQL to delete test users:');
  console.log(`\n  DELETE FROM "users" WHERE email LIKE 'test-deactivation-%';`);
}

// Main execution
async function main() {
  let allPassed = true;
  
  try {
    allPassed = await verifySetup() && allPassed;
    allPassed = await verifyDatabaseSchema() && allPassed;
    allPassed = await verifyAPILogic() && allPassed;
    allPassed = await verifyFiltering() && allPassed;
    
    const testUser = await createTestUser();
    if (testUser) {
      console.log('\n✅ Test user created successfully!');
      console.log(`   Use this email for testing: ${testUser.email}`);
    } else {
      allPassed = false;
    }
    
    await manualTestInstructions();
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY\n');
    console.log('='.repeat(60));
    
    if (allPassed) {
      console.log('\n✅ All automated checks passed!');
      console.log('🎉 The user deactivation feature should now work correctly.');
      console.log('📝 Please follow the manual test instructions above to verify functionality.');
    } else {
      console.log('\n❌ Some automated checks failed.');
      console.log('🔧 Please review the errors above and fix any issues before testing.');
    }
    
    await cleanup();
    
  } catch (error) {
    console.error('\n❌ Fatal error during verification:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the verification
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { verifySetup, verifyDatabaseSchema, verifyAPILogic, verifyFiltering };