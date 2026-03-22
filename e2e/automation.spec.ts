import { test, expect } from '@playwright/test';

const ADMIN_EMAIL = 'admin@example.com';
// IMPORTANT: Use environment variables for passwords in production
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'demo123';

test.describe('Automation Page E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.getByLabel('Email').fill(ADMIN_EMAIL);
    await page.getByLabel('Password').fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
    // Wait for navigation to dashboard, automation, or home
    await expect(page).toHaveURL(/\/|\/dashboard|\/automation/);
    // Ensure we are logged in by checking for something like "Dashboard" in sidebar
    await expect(page.getByText(/dashboard|automation|tickets/i).first()).toBeVisible();
  });

  test('should create a new automation rule', async ({ page }) => {
    // Navigate to automation page
    await page.goto('/automation');
    await expect(page).toHaveURL('/automation');
    await expect(page.getByRole('heading', { name: /automation/i })).toBeVisible();

    // Click create rule button
    await page.getByRole('link', { name: /create.*rule/i }).click();
    await expect(page).toHaveURL('/automation/new');

    // Fill rule form
    const ruleName = `Test Rule ${Date.now()}`;
    const ruleDescription = 'Test description for automation rule';
    const trigger = 'Ticket Created';
    const condition = 'Category = "Hardware"';
    const action = 'Assign to Team';
    const actionParam = 'Hardware Team';
    
    // Rule Name
    await page.getByLabel('Rule Name', { exact: true }).fill(ruleName);
    // Description
    await page.getByLabel('Description').fill(ruleDescription);
    
    // Trigger selection - click the button containing the trigger label
    // The trigger section is open by default
    await page.getByText(trigger, { exact: true }).first().click();
    
    // Condition - input field (no label)
    await page.getByPlaceholder('e.g., Category = \'Hardware\' AND Priority = \'High\'').fill(condition);
    
    // Action selection - click button containing action label
    // Need to ensure the Actions collapsible is open (default open)
    await page.getByText(action, { exact: true }).first().click();
    
    // Action parameter field appears after action selection
    // The label may be "Team Name" or similar
    // Wait for the field to appear
    const paramField = page.getByLabel('Team Name', { exact: false }).or(page.getByPlaceholder(/enter.*team/i));
    await expect(paramField).toBeVisible({ timeout: 5000 });
    await paramField.fill(actionParam);
    
    // Ensure rule is active (switch on)
    const activeSwitch = page.getByLabel('Active Rule');
    if (await activeSwitch.isVisible() && !await activeSwitch.isChecked()) {
      await activeSwitch.click();
    }
    
    // Submit form
    await page.getByRole('button', { name: /create.*rule/i }).click();
    
    // Wait for redirect to automation page and verify success message
    await expect(page).toHaveURL('/automation');
    // Check for success toast (sonner toast) - optional
    // The page should contain the new rule in the table
    await expect(page.getByText(ruleName)).toBeVisible();
    await expect(page.getByText(trigger)).toBeVisible();
    await expect(page.getByText(action)).toBeVisible();
  });

  test('should edit an existing automation rule', async ({ page }) => {
    // First create a rule to edit
    await page.goto('/automation/new');
    const ruleName = `Edit Test Rule ${Date.now()}`;
    const ruleDescription = 'Rule to be edited';
    const trigger = 'Ticket Updated';
    const condition = 'Priority = "High"';
    const action = 'Change Priority';
    const actionParam = 'Critical';
    
    await page.getByLabel('Rule Name').fill(ruleName);
    await page.getByLabel('Description').fill(ruleDescription);
    await page.getByText(trigger, { exact: true }).first().click();
    await page.getByPlaceholder('e.g., Category = \'Hardware\' AND Priority = \'High\'').fill(condition);
    await page.getByText(action, { exact: true }).first().click();
    // Wait for param field to appear
    const paramField = page.getByLabel('Priority (Low/Medium/High/Critical)', { exact: false })
      .or(page.getByPlaceholder(/enter.*priority/i));
    await expect(paramField).toBeVisible({ timeout: 5000 });
    await paramField.fill(actionParam);
    await page.getByRole('button', { name: /create.*rule/i }).click();
    
    // Wait for redirect to automation page
    await expect(page).toHaveURL('/automation');
    
    // Find the rule row and hover to show actions button
    const ruleRow = page.locator('tr', { hasText: ruleName });
    await ruleRow.hover();
    // Click the actions button (three dots)
    await ruleRow.getByRole('button', { name: /more/i }).click();
    // Click Edit Rule menu item
    await page.getByRole('menuitem', { name: /edit.*rule/i }).click();
    
    // Should navigate to edit page (URL pattern /automation/[id])
    await expect(page).toHaveURL(/\/automation\/[a-zA-Z0-9-]+/);
    
    // Update fields
    const newRuleName = `${ruleName} Updated`;
    const newDescription = 'Updated description';
    await page.getByLabel('Rule Name').fill(newRuleName);
    await page.getByLabel('Description').fill(newDescription);
    
    // Save changes (button text may be "Save Rule")
    await page.getByRole('button', { name: /save.*rule/i }).click();
    
    // Verify redirect and updated rule appears
    await expect(page).toHaveURL('/automation');
    await expect(page.getByText(newRuleName)).toBeVisible();
    await expect(page.getByText(newDescription)).toBeVisible();
  });
});