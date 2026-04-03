import { Page, Locator, expect } from '@playwright/test';

export class AutomationPage {
  readonly page: Page;
  
  // Stats cards
  readonly totalRulesCard: Locator;
  readonly activeRulesCard: Locator;
  readonly executionRateCard: Locator;
  readonly lastExecutionCard: Locator;
  
  // Search and filters
  readonly searchInput: Locator;
  readonly categoryFilter: Locator;
  readonly statusFilter: Locator;
  readonly clearFiltersButton: Locator;
  
  // Action buttons
  readonly createRuleButton: Locator;
  readonly monitorButton: Locator;
  
  // Table
  readonly rulesTable: Locator;
  readonly tableRows: Locator;
  readonly noRulesMessage: Locator;
  
  // Tabs
  readonly allRulesTab: Locator;
  readonly activeRulesTab: Locator;
  readonly inactiveRulesTab: Locator;
  readonly recentExecutionsTab: Locator;

  constructor(page: Page) {
    this.page = page;
    
    // Stats cards
    this.totalRulesCard = page.locator('[data-testid="stats-card"]').first();
    this.activeRulesCard = page.locator('[data-testid="stats-card"]').nth(1);
    this.executionRateCard = page.locator('[data-testid="stats-card"]').nth(2);
    this.lastExecutionCard = page.locator('[data-testid="stats-card"]').nth(3);
    
    // Search and filters
    this.searchInput = page.getByPlaceholder('Search rules by name, trigger, or action...');
    this.categoryFilter = page.locator('button').filter({ hasText: /All Categories|Select a category/i });
    this.statusFilter = page.locator('button').filter({ hasText: /All Status|Active Only|Inactive Only/i });
    this.clearFiltersButton = page.getByRole('button', { name: 'Clear All' });
    
    // Action buttons
    this.createRuleButton = page.getByRole('link', { name: /create.*rule|new rule/i });
    this.monitorButton = page.getByRole('link', { name: /monitor|execution|logs/i });
    
    // Table
    this.rulesTable = page.locator('table');
    this.tableRows = page.locator('table tbody tr');
    this.noRulesMessage = page.getByText(/no.*rules|no.*automation/i);
    
    // Tabs
    this.allRulesTab = page.getByRole('tab', { name: /all rules/i });
    this.activeRulesTab = page.getByRole('tab', { name: /active/i });
    this.inactiveRulesTab = page.getByRole('tab', { name: /inactive/i });
    this.recentExecutionsTab = page.getByRole('tab', { name: /recent executions|execution history/i });
  }

  async goto() {
    await this.page.goto('/automation');
    await this.waitForPageLoad();
  }

  async waitForPageLoad() {
    await expect(this.page).toHaveURL(/\/automation/);
    await expect(this.page.getByRole('heading', { name: /automation/i })).toBeVisible();
  }

  async assertStatsCardsVisible() {
    await expect(this.totalRulesCard).toBeVisible();
    await expect(this.activeRulesCard).toBeVisible();
    await expect(this.executionRateCard).toBeVisible();
    await expect(this.lastExecutionCard).toBeVisible();
  }

  async searchRules(query: string) {
    await this.searchInput.fill(query);
    await this.page.waitForTimeout(500); // Wait for debounce
  }

  async filterByCategory(category: string) {
    await this.categoryFilter.click();
    await this.page.getByRole('option', { name: category }).click();
    await this.page.waitForLoadState('networkidle');
  }

  async filterByStatus(status: 'all' | 'active' | 'inactive') {
    await this.statusFilter.click();
    const optionName = status === 'all' ? 'All Status' : status === 'active' ? 'Active Only' : 'Inactive Only';
    await this.page.getByRole('option', { name: optionName }).click();
    await this.page.waitForLoadState('networkidle');
  }

  async clearAllFilters() {
    if (await this.clearFiltersButton.isVisible().catch(() => false)) {
      await this.clearFiltersButton.click();
      await this.page.waitForLoadState('networkidle');
    }
  }

  async clickCreateRule() {
    await this.createRuleButton.click();
    await expect(this.page).toHaveURL('/automation/new');
  }

  async clickMonitor() {
    await this.monitorButton.click();
    await expect(this.page).toHaveURL('/automation/monitor');
  }

  async getRuleRow(ruleName: string) {
    return this.page.locator('tr', { hasText: ruleName });
  }

  async openRuleActions(ruleName: string) {
    const row = await this.getRuleRow(ruleName);
    await row.hover();
    const actionsButton = row.getByRole('button', { name: /open menu|more|actions/i });
    await actionsButton.click();
  }

  async clickEditRule(ruleName: string) {
    await this.openRuleActions(ruleName);
    await this.page.getByRole('menuitem', { name: /edit.*rule/i }).click();
    await expect(this.page).toHaveURL(/\/automation\/.*\/edit/);
  }

  async clickDuplicateRule(ruleName: string) {
    await this.openRuleActions(ruleName);
    await this.page.getByRole('menuitem', { name: /duplicate/i }).click();
  }

  async clickTestRule(ruleName: string) {
    await this.openRuleActions(ruleName);
    await this.page.getByRole('menuitem', { name: /test.*rule/i }).click();
  }

  async clickDeleteRule(ruleName: string) {
    await this.openRuleActions(ruleName);
    await this.page.getByRole('menuitem', { name: /delete/i }).click();
  }

  async toggleRuleStatus(ruleName: string) {
    await this.openRuleActions(ruleName);
    const toggleOption = this.page.getByRole('menuitem', { name: /activate|deactivate/i });
    await toggleOption.click();
  }

  async assertRuleVisible(ruleName: string) {
    await expect(this.page.getByText(ruleName)).toBeVisible();
  }

  async assertRuleNotVisible(ruleName: string) {
    await expect(this.page.getByText(ruleName, { exact: true })).not.toBeVisible();
  }

  async getRulesCount() {
    return await this.tableRows.count();
  }

  async switchTab(tabName: 'all' | 'active' | 'inactive' | 'executions') {
    const tabMap = {
      all: this.allRulesTab,
      active: this.activeRulesTab,
      inactive: this.inactiveRulesTab,
      executions: this.recentExecutionsTab
    };
    await tabMap[tabName].click();
    await this.page.waitForLoadState('networkidle');
  }
}
