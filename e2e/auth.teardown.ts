import { test as teardown } from '@playwright/test';

/**
 * Authentication Teardown
 * 
 * This file runs after all tests complete.
 * Can be used to clean up test data or sessions if needed.
 */

teardown('cleanup', async () => {
  // Add any cleanup logic here if needed
  // For example, cleaning up test automation rules created during tests
  
  // Auth state files are preserved for reuse in subsequent test runs
  // To force re-authentication, delete the e2e/.auth directory
});
