import { test, expect } from '@playwright/test';

test('open suggestions page and check for errors', async ({ page }) => {
  // Collect console errors
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  // Login via demo admin button
  await page.goto('/login');
  const adminDemoButton = page.getByRole('button', { name: /admin user.*click to login/i });
  if (await adminDemoButton.isVisible().catch(() => false)) {
    await adminDemoButton.click();
  } else {
    // Fallback to credential login
    await page.getByLabel('Email').fill('admin@example.com');
    await page.getByLabel('Password').fill('demo123');
    await page.getByRole('button', { name: 'Sign in' }).click();
  }
  await page.waitForURL('/dashboard');
  
  // Navigate to suggestions page
  await page.goto('/knowledge/suggestions');
  await page.waitForLoadState('networkidle');
  
  // Check for any console errors so far
  expect(errors).toEqual([]);
  
  // If there are suggestions, try to open the first one
  const firstRow = page.locator('table tbody tr').first();
  if (await firstRow.count() > 0) {
    // Find the "View Details" button (might be inside a dropdown)
    const viewButton = firstRow.getByRole('button', { name: 'View Details' });
    if (await viewButton.count() > 0) {
      await viewButton.click();
      await page.locator('[role="dialog"]').waitFor({ state: 'visible' });
      // Wait a bit for any potential errors
      await page.waitForTimeout(500);
      // Check again for errors
      expect(errors).toEqual([]);
      // Close dialog
      await page.locator('[role="dialog"] button[aria-label="Close"]').click();
    }
  }
});