import { test, expect } from '@playwright/test';

test('new login page design works correctly', async ({ page }) => {
  // Go to login page
  await page.goto('http://localhost:3005/login');

  // Check page title
  await expect(page).toHaveTitle('ITSM Portal - Modern IT Service Management');

  // Check branding is present
  await expect(page.getByText('ITSM Portal')).toBeVisible();
  
  // Check login form elements
  await expect(page.getByLabel('Email Address')).toBeVisible();
  await expect(page.getByLabel('Password')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();

  // Check demo login section
  await expect(page.getByText('Quick Demo Access')).toBeVisible();
  await expect(page.getByText('Admin User')).toBeVisible();
  await expect(page.getByText('Support Agent')).toBeVisible();
  await expect(page.getByText('End User')).toBeVisible();

  // Test manual login with demo credentials
  await page.fill('input[type="email"]', 'admin@example.com');
  await page.fill('input[type="password"]', 'demo123');
  await page.click('button[type="submit"]');
  
  // Wait for navigation to dashboard
  await page.waitForURL('http://localhost:3005/');
  await expect(page.getByRole('heading', { name: /Dashboard/i })).toBeVisible();
});

test('demo login buttons work', async ({ page }) => {
  await page.goto('http://localhost:3005/login');
  
  // Click admin demo button
  await page.getByText('Admin User').click();
  
  // Wait for navigation
  await page.waitForURL('http://localhost:3005/');
  await expect(page.getByRole('heading', { name: /Dashboard/i })).toBeVisible();
});