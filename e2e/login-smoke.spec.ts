import { test, expect } from '@playwright/test';

/**
 * Smoke test to verify login works with provided credentials
 * Email: admin@example.com
 * Password: demo123
 */
test.describe('Login Smoke Test', () => {
  
  test('should login with admin credentials', async ({ page }) => {
    // Go to login page
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    
    console.log('Login page loaded');
    
    // Take screenshot of login page for debugging
    await page.screenshot({ path: 'e2e/screenshots/login-page.png' });
    
    // Fill in email
    const emailInput = page.locator('input[type="email"], input[name="email"], input#email, input[placeholder*="email" i], input[inputmode="email"]').first();
    await expect(emailInput).toBeVisible();
    await emailInput.fill('admin@example.com');
    console.log('Email filled');
    
    // Fill in password
    const passwordInput = page.locator('input[type="password"], input[name="password"], input#password, input[placeholder*="password" i]').first();
    await expect(passwordInput).toBeVisible();
    await passwordInput.fill('demo123');
    console.log('Password filled');
    
    // Click sign in button
    const signInButton = page.getByRole('button', { name: /sign in|login|log in|signin/i });
    await expect(signInButton).toBeVisible();
    await signInButton.click();
    console.log('Sign in clicked');
    
    // Wait for navigation
    await page.waitForURL(/\//, { timeout: 15000 });
    console.log('Navigation complete');
    
    // Take screenshot after login
    await page.screenshot({ path: 'e2e/screenshots/logged-in.png' });
    
    // Verify we're logged in
    const heading = page.getByRole('heading', { name: /dashboard|welcome|overview/i });
    await expect(heading).toBeVisible({ timeout: 10000 });
    console.log('Successfully logged in!');
  });

  test('should login and access knowledge base', async ({ page }) => {
    // Login first
    await page.goto('/login');
    
    const emailInput = page.locator('input[type="email"]').first();
    await emailInput.fill('admin@example.com');
    
    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.fill('demo123');
    
    await page.getByRole('button', { name: /sign in|login/i }).click();
    await page.waitForURL(/\//, { timeout: 15000 });
    
    // Navigate to knowledge base
    await page.goto('/knowledge');
    
    // Verify knowledge base page
    await expect(page).toHaveURL('/knowledge');
    await expect(page.getByRole('heading', { name: /knowledge base/i })).toBeVisible();
    
    // Take screenshot
    await page.screenshot({ path: 'e2e/screenshots/knowledge-base.png' });
    
    console.log('Knowledge base page loaded successfully!');
  });
});
