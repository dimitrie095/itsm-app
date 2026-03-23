import { test, expect } from '@playwright/test';

const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'demo123';

test.describe('Knowledge Base E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.getByLabel('Email').fill(ADMIN_EMAIL);
    await page.getByLabel('Password').fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
    // Wait for navigation
    await expect(page).toHaveURL(/\//);
  });

  test('should navigate to knowledge base and view article details', async ({ page }) => {
    // Navigate to knowledge base
    await page.goto('/knowledge');
    await expect(page).toHaveURL('/knowledge');
    await expect(page.getByRole('heading', { name: /knowledge base/i })).toBeVisible();

    // Verify the demo articles are displayed
    await expect(page.getByText('KB-001')).toBeVisible();
    await expect(page.getByText('How to reset your password')).toBeVisible();

    // Click on the article link
    await page.getByRole('link', { name: 'How to reset your password' }).click();

    // Should navigate to article detail page
    await expect(page).toHaveURL('/knowledge/KB-001');
    
    // Verify article content is displayed
    await expect(page.getByRole('heading', { name: 'How to reset your password' })).toBeVisible();
    await expect(page.getByText(/Article ID: KB-001/)).toBeVisible();
    await expect(page.getByText('Security')).toBeVisible();
    
    // Verify the back button works
    await page.getByRole('link', { name: '' }).first().click();
    await expect(page).toHaveURL('/knowledge');
  });

  test('should view different article (KB-003)', async ({ page }) => {
    // Navigate directly to KB-003
    await page.goto('/knowledge/KB-003');
    
    // Should display the article details
    await expect(page.getByRole('heading', { name: 'Troubleshooting printer issues' })).toBeVisible();
    await expect(page.getByText(/Article ID: KB-003/)).toBeVisible();
    await expect(page.getByText('Hardware')).toBeVisible();
    await expect(page.getByText(/If your printer is not working/)).toBeVisible();
  });

  test('should show 404 for non-existent article', async ({ page }) => {
    // Navigate to non-existent article
    await page.goto('/knowledge/KB-999');
    
    // Should show 404 page
    await expect(page.getByText(/404|page could not be found/i)).toBeVisible();
  });
});
