import { test as baseTest, expect, Page, BrowserContext } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// Demo user credentials matching the login page
export const DEMO_USERS = {
  admin: {
    email: 'admin@example.com',
    password: process.env.DEMO_ADMIN_PASSWORD || 'demo123',
    name: 'Admin User',
    role: 'ADMIN'
  },
  agent: {
    email: 'agent@example.com',
    password: process.env.DEMO_AGENT_PASSWORD || 'demo123',
    name: 'Support Agent',
    role: 'AGENT'
  },
  endUser: {
    email: 'user@example.com',
    password: process.env.DEMO_USER_PASSWORD || 'demo123',
    name: 'End User',
    role: 'END_USER'
  }
};

// Storage state paths
const AUTH_DIR = path.join(process.cwd(), 'e2e', '.auth');
export const AUTH_PATHS = {
  admin: path.join(AUTH_DIR, 'admin.json'),
  agent: path.join(AUTH_DIR, 'agent.json'),
  endUser: path.join(AUTH_DIR, 'endUser.json')
};

/**
 * Ensure auth directory exists
 */
export function ensureAuthDir(): void {
  if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
  }
}

/**
 * Login as a specific user role using the demo login buttons
 */
export async function loginAsRole(page: Page, role: 'admin' | 'agent' | 'endUser'): Promise<void> {
  const user = DEMO_USERS[role];
  
  await page.goto('/login');
  
  // Use the demo user button for login
  const buttonPattern = role === 'admin' 
    ? /admin user|admin@example/i 
    : role === 'agent' 
    ? /support agent|agent@example/i 
    : /end user|user@example/i;
  
  const demoButton = page.getByRole('button', { name: buttonPattern });
  await expect(demoButton).toBeVisible({ timeout: 10000 });
  await demoButton.click();
  
  // Wait for navigation to complete
  await page.waitForURL(/\/(dashboard|tickets|automation|unauthorized|\?)?/, { timeout: 15000 });
}

/**
 * Login using the form (alternative method)
 */
export async function loginWithForm(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  
  // Fill the login form
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
  
  // Wait for navigation
  await page.waitForURL(/\/(dashboard|tickets|automation|unauthorized|\?)?/, { timeout: 15000 });
}

/**
 * Save storage state for a user role
 */
export async function saveAuthState(context: BrowserContext, role: 'admin' | 'agent' | 'endUser'): Promise<void> {
  ensureAuthDir();
  await context.storageState({ path: AUTH_PATHS[role] });
}

/**
 * Check if auth state exists for a role
 */
export function hasAuthState(role: 'admin' | 'agent' | 'endUser'): boolean {
  return fs.existsSync(AUTH_PATHS[role]);
}

/**
 * Clear all auth states
 */
export function clearAuthStates(): void {
  if (fs.existsSync(AUTH_DIR)) {
    fs.rmSync(AUTH_DIR, { recursive: true, force: true });
  }
}

// Extended test fixture with authentication
type AuthFixtures = {
  /** Page with admin authentication */
  adminPage: Page;
  /** Page with agent authentication */
  agentPage: Page;
  /** Page with end-user authentication */
  endUserPage: Page;
  /** Login helper function */
  login: (role: 'admin' | 'agent' | 'endUser') => Promise<void>;
};

/**
 * Base authenticated test fixture
 * 
 * Usage:
 * ```typescript
 * import { test } from '../fixtures/auth';
 * 
 * test('admin can access automation', async ({ adminPage }) => {
 *   await adminPage.goto('/automation');
 *   // ... test code
 * });
 * ```
 */
export const test = baseTest.extend<AuthFixtures>({
  // Admin authenticated page
  adminPage: async ({ browser }, use, testInfo) => {
    // Create context with admin auth state if it exists
    const context = await browser.newContext({
      storageState: hasAuthState('admin') ? AUTH_PATHS.admin : undefined
    });
    const page = await context.newPage();
    
    // If no auth state, login and save it
    if (!hasAuthState('admin')) {
      await loginAsRole(page, 'admin');
      await saveAuthState(context, 'admin');
    }
    
    await use(page);
    await context.close();
  },

  // Agent authenticated page
  agentPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: hasAuthState('agent') ? AUTH_PATHS.agent : undefined
    });
    const page = await context.newPage();
    
    if (!hasAuthState('agent')) {
      await loginAsRole(page, 'agent');
      await saveAuthState(context, 'agent');
    }
    
    await use(page);
    await context.close();
  },

  // End user authenticated page
  endUserPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: hasAuthState('endUser') ? AUTH_PATHS.endUser : undefined
    });
    const page = await context.newPage();
    
    if (!hasAuthState('endUser')) {
      await loginAsRole(page, 'endUser');
      await saveAuthState(context, 'endUser');
    }
    
    await use(page);
    await context.close();
  },

  // Login helper
  login: async ({ page }, use) => {
    await use(async (role: 'admin' | 'agent' | 'endUser') => {
      await loginAsRole(page, role);
    });
  }
});

export { expect };
