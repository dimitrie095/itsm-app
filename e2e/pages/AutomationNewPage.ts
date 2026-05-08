import { Page, Locator, expect } from '@playwright/test';

export class AutomationNewPage {
  readonly page: Page;
  
  // Form fields
  readonly ruleNameInput: Locator;
  readonly descriptionInput: Locator;
  readonly conditionInput: Locator;
  readonly activeSwitch: Locator;
  
  // Buttons
  readonly createRuleButton: Locator;
  readonly cancelButton: Locator;
  readonly backButton: Locator;
  
  // Trigger section
  readonly triggerSearchInput: Locator;
  
  // Action section  
  readonly actionSearchInput: Locator;

  constructor(page: Page) {
    this.page = page;
    
    // Form fields
    this.ruleNameInput = page.getByLabel('Rule Name', { exact: true });
    this.descriptionInput = page.getByLabel('Description');
    this.conditionInput = page.getByPlaceholder(/e\.g\.|condition/i);
    this.activeSwitch = page.getByLabel('Active Rule');
    
    // Buttons
    this.createRuleButton = page.getByRole('button', { name: /create.*rule/i });
    this.cancelButton = page.getByRole('button', { name: /cancel/i });
    this.backButton = page.getByRole('link', { name: /back/i });
    
    // Trigger and action search
    this.triggerSearchInput = page.locator('input[placeholder*="trigger"], input[placeholder*="search"]').first();
    this.actionSearchInput = page.locator('input[placeholder*="action"], input[placeholder*="search"]').nth(1);
  }

  async goto() {
    await this.page.goto('/automation/new');
    await this.waitForPageLoad();
  }

  async waitForPageLoad() {
    await expect(this.page).toHaveURL('/automation/new');
    await expect(this.page.getByRole('heading', { name: /create.*rule|new.*rule/i })).toBeVisible();
  }

  async fillRuleName(name: string) {
    await this.ruleNameInput.fill(name);
  }

  async fillDescription(description: string) {
    await this.descriptionInput.fill(description);
  }

  async selectTrigger(triggerName: string) {
    // Try to find and click the trigger button/option
    const triggerButton = this.page.getByRole('button', { name: triggerName, exact: true })
      .or(this.page.getByText(triggerName, { exact: true }).locator('..').filter({ has: this.page.locator('button') }));
    
    // Scroll to trigger section if needed
    await this.page.getByText(/when.*trigger|trigger/i).first().scrollIntoViewIfNeeded();
    
    // Click on the trigger
    const triggerOption = this.page.getByText(triggerName, { exact: true }).first();
    await triggerOption.click();
  }

  async fillCondition(condition: string) {
    await this.conditionInput.fill(condition);
  }

  async selectAction(actionName: string) {
    // Scroll to action section
    await this.page.getByText(/then.*perform|action/i).first().scrollIntoViewIfNeeded();
    
    // Click on the action
    const actionOption = this.page.getByText(actionName, { exact: true }).first();
    await actionOption.click();
  }

  async selectCategory(category: string) {
    // Scroll to category section
    await this.page.getByText(/category/i).first().scrollIntoViewIfNeeded();
    
    // Click category dropdown
    const categoryDropdown = this.page.locator('button').filter({ hasText: /select category|choose category/i });
    await categoryDropdown.click();
    
    // Select category option
    const categoryOption = this.page.getByRole('option', { name: category });
    await categoryOption.click();
  }

  async selectCondition(field: string, operator: string, value: string) {
    // This is a simplified version - may need to be adapted based on actual UI
    await this.page.getByText(/condition/i).first().scrollIntoViewIfNeeded();
    
    // Fill condition fields
    const conditionField = this.page.getByPlaceholder(/field/i).or(this.page.locator('input').nth(2));
    await conditionField.fill(field);
    
    const conditionOperator = this.page.getByPlaceholder(/operator/i).or(this.page.locator('input').nth(3));
    await conditionOperator.fill(operator);
    
    const conditionValue = this.page.getByPlaceholder(/value/i).or(this.page.locator('input').nth(4));
    await conditionValue.fill(value);
  }

  async save() {
    await this.submitForm();
    
    // Wait for success toast
    await expect(this.page.getByText(/rule created|success/i)).toBeVisible({ timeout: 10000 });
  }

  async fillActionParameter(parameterValue: string, label?: string) {
    // Action parameter field - try different selectors
    let paramInput: Locator;
    
    if (label) {
      paramInput = this.page.getByLabel(label, { exact: false });
    } else {
      // Try common parameter field selectors
      paramInput = this.page.getByPlaceholder(/enter|team|priority|email|user/i)
        .or(this.page.locator('input[type="text"]').filter({ hasText: '' }).last());
    }
    
    await expect(paramInput).toBeVisible({ timeout: 5000 });
    await paramInput.fill(parameterValue);
  }

  async setActive(active: boolean) {
    const isChecked = await this.activeSwitch.isChecked();
    if (isChecked !== active) {
      await this.activeSwitch.click();
    }
  }

  async setStatus(status: "active" | "inactive") {
    await this.setActive(status === "active");
  }

  async submitForm() {
    await this.createRuleButton.click();
  }

  async createRule(data: {
    name: string;
    description: string;
    trigger: string;
    condition: string;
    action: string;
    actionParam?: string;
    active?: boolean;
  }) {
    await this.fillRuleName(data.name);
    await this.fillDescription(data.description);
    await this.selectTrigger(data.trigger);
    await this.fillCondition(data.condition);
    await this.selectAction(data.action);
    
    if (data.actionParam) {
      await this.fillActionParameter(data.actionParam);
    }
    
    if (data.active !== undefined) {
      await this.setActive(data.active);
    }
    
    await this.submitForm();
    
    // Wait for redirect back to automation page
    await expect(this.page).toHaveURL('/automation');
  }

  async cancel() {
    await this.cancelButton.click();
    await expect(this.page).toHaveURL('/automation');
  }

  async goBack() {
    await this.backButton.click();
    await expect(this.page).toHaveURL('/automation');
  }

  async assertValidationError(field: string) {
    await expect(this.page.getByText(new RegExp(`${field}.*required|${field}.*invalid`, 'i'))).toBeVisible();
  }
}
