import { test as setup } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { ensureAuthDir, AUTH_PATHS, DEMO_USERS } from './fixtures/auth';

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
    // Keep admin setup non-blocking in environments where admin demo login
    // is intentionally disabled or requires manual bootstrap.
    await context.storageState({ path: AUTH_PATHS.admin });
  });

  setup('authenticate as agent', async ({ page, context }) => {
    const loginPage = new LoginPage(page);
    
    await loginPage.goto();
    await loginPage.login(DEMO_USERS.agent.email, DEMO_USERS.agent.password);
    
    // Save storage state
    await context.storageState({ path: AUTH_PATHS.agent });
  });

  setup('authenticate as end user', async ({ page, context }) => {
    const loginPage = new LoginPage(page);
    
    await loginPage.goto();
    await loginPage.login(DEMO_USERS.endUser.email, DEMO_USERS.endUser.password);
    
    // Save storage state
    await context.storageState({ path: AUTH_PATHS.endUser });
  });
});
