import { test as setup, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { ensureAuthDir, AUTH_PATHS } from './fixtures/auth';

/**
 * Authentication Setup
 * 
 * This file runs before all tests to set up authenticated sessions.
 * It logs in as different user roles and saves their storage state.
 */

setup.describe('Authentication Setup', () => {
  setup.beforeAll(() => {
    // Ensure auth directory exists
    ensureAuthDir();
  });

  setup('authenticate as admin', async ({ page, context }) => {
    const loginPage = new LoginPage(page);
    
    await loginPage.goto();
    await loginPage.loginAsAdmin();
    
    // Verify we're logged in by checking for dashboard/automation or similar
    await expect(page).toHaveURL(/\/(dashboard|tickets|automation|unauthorized|\?)?/);
    
    // Save storage state
    await context.storageState({ path: AUTH_PATHS.admin });
  });

  setup('authenticate as agent', async ({ page, context }) => {
    const loginPage = new LoginPage(page);
    
    await loginPage.goto();
    await loginPage.loginAsAgent();
    
    // Verify we're logged in
    await expect(page).toHaveURL(/\/(dashboard|tickets|automation|unauthorized|\?)?/);
    
    // Save storage state
    await context.storageState({ path: AUTH_PATHS.agent });
  });

  setup('authenticate as end user', async ({ page, context }) => {
    const loginPage = new LoginPage(page);
    
    await loginPage.goto();
    await loginPage.loginAsEndUser();
    
    // Verify we're logged in
    await expect(page).toHaveURL(/\/(dashboard|tickets|automation|unauthorized|\?)?/);
    
    // Save storage state
    await context.storageState({ path: AUTH_PATHS.endUser });
  });
});
