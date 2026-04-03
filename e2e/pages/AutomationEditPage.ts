import { Page, Locator, expect } from '@playwright/test';

export class AutomationEditPage {
  readonly page: Page;
  
  // Form fields
  readonly ruleNameInput: Locator;
  readonly descriptionInput: Locator;
  readonly conditionInput: Locator;
  readonly activeSwitch: Locator;
  
  // Buttons
  readonly saveChangesButton: Locator;
  readonly cancelButton: Locator;
  readonly backButton: Locator;

  constructor(page: Page) {
    this.page = page;
    
    // Form fields
    this.ruleNameInput = page.getByLabel('Rule Name', { exact: true });
    this.descriptionInput = page.getByLabel('Description');
    this.conditionInput = page.getByPlaceholder(/e\.g\.|condition/i);
    this.activeSwitch = page.getByLabel('Active Rule');
    
    // Buttons
    this.saveChangesButton = page.getByRole('button', { name: /save.*changes|update.*rule/i });
    this.cancelButton = page.getByRole('button', { name: /cancel/i });
    this.backButton = page.getByRole('link', { name: /back/i });
  }

  async goto(ruleId: string) {
    await this.page.goto(`/automation/${ruleId}/edit`);
    await this.waitForPageLoad();
  }

  async waitForPageLoad() {
    await expect(this.page).toHaveURL(/\/automation\/.*\/edit/);
    await expect(this.page.getByRole('heading', { name: /edit.*rule/i })).toBeVisible();
  }

  async getCurrentRuleName() {
    return await this.ruleNameInput.inputValue();
  }

  async updateRuleName(name: string) {
    await this.ruleNameInput.clear();
    await this.ruleNameInput.fill(name);
  }

  async updateDescription(description: string) {
    await this.descriptionInput.clear();
    await this.descriptionInput.fill(description);
  }

  async updateCondition(condition: string) {
    await this.conditionInput.clear();
    await this.conditionInput.fill(condition);
  }

  async selectTrigger(triggerName: string) {
    const triggerOption = this.page.getByText(triggerName, { exact: true }).first();
    await triggerOption.click();
  }

  async selectAction(actionName: string) {
    const actionOption = this.page.getByText(actionName, { exact: true }).first();
    await actionOption.click();
  }

  async fillActionParameter(parameterValue: string, label?: string) {
    let paramInput: Locator;
    
    if (label) {
      paramInput = this.page.getByLabel(label, { exact: false });
    } else {
      paramInput = this.page.getByPlaceholder(/enter|team|priority|email|user/i)
        .or(this.page.locator('input[type="text"]').last());
    }
    
    await paramInput.clear();
    await paramInput.fill(parameterValue);
  }

  async setActive(active: boolean) {
    const isChecked = await this.activeSwitch.isChecked();
    if (isChecked !== active) {
      await this.activeSwitch.click();
    }
  }

  async saveChanges() {
    await this.saveChangesButton.click();
    // Wait for redirect back to automation page
    await expect(this.page).toHaveURL('/automation');
  }

  async cancel() {
    await this.cancelButton.click();
    await expect(this.page).toHaveURL('/automation');
  }

  async updateRule(data: {
    name?: string;
    description?: string;
    trigger?: string;
    condition?: string;
    action?: string;
    actionParam?: string;
    active?: boolean;
  }) {
    if (data.name) {
      await this.updateRuleName(data.name);
    }
    if (data.description) {
      await this.updateDescription(data.description);
    }
    if (data.trigger) {
      await this.selectTrigger(data.trigger);
    }
    if (data.condition) {
      await this.updateCondition(data.condition);
    }
    if (data.action) {
      await this.selectAction(data.action);
    }
    if (data.actionParam) {
      await this.fillActionParameter(data.actionParam);
    }
    if (data.active !== undefined) {
      await this.setActive(data.active);
    }
    
    await this.saveChanges();
  }
}
