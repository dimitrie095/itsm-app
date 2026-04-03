import { Page, Locator, expect } from '@playwright/test';

export class AutomationMonitorPage {
  readonly page: Page;
  
  // Stats cards
  readonly totalExecutionsCard: Locator;
  readonly successRateCard: Locator;
  readonly successCountCard: Locator;
  readonly failureCountCard: Locator;
  
  // Filters
  readonly timeRangeFilter: Locator;
  readonly ruleFilter: Locator;
  readonly statusFilter: Locator;
  readonly searchInput: Locator;
  readonly refreshButton: Locator;
  readonly exportButton: Locator;
  
  // Table
  readonly executionsTable: Locator;
  readonly tableRows: Locator;
  
  // Pagination
  readonly paginationInfo: Locator;
  readonly prevPageButton: Locator;
  readonly nextPageButton: Locator;
  
  // Details dialog
  readonly detailsDialog: Locator;
  readonly closeDetailsButton: Locator;

  constructor(page: Page) {
    this.page = page;
    
    // Stats cards
    this.totalExecutionsCard = page.locator('[data-testid="stats-card"]').first();
    this.successRateCard = page.locator('[data-testid="stats-card"]').nth(1);
    this.successCountCard = page.locator('[data-testid="stats-card"]').nth(2);
    this.failureCountCard = page.locator('[data-testid="stats-card"]').nth(3);
    
    // Filters
    this.timeRangeFilter = page.locator('button').filter({ hasText: /last 7 days|today|30 days|90 days|all time/i });
    this.ruleFilter = page.locator('button').filter({ hasText: /all rules|select rule/i });
    this.statusFilter = page.locator('button').filter({ hasText: /all status|success|failed/i });
    this.searchInput = page.getByPlaceholder(/search executions|search/i);
    this.refreshButton = page.getByRole('button', { name: /refresh/i });
    this.exportButton = page.getByRole('button', { name: /export/i });
    
    // Table
    this.executionsTable = page.locator('table');
    this.tableRows = page.locator('table tbody tr');
    
    // Pagination
    this.paginationInfo = page.getByText(/showing|page|of/i);
    this.prevPageButton = page.getByRole('button', { name: /previous|prev/i });
    this.nextPageButton = page.getByRole('button', { name: /next/i });
    
    // Details dialog
    this.detailsDialog = page.locator('[role="dialog"]').filter({ hasText: /execution details/i });
    this.closeDetailsButton = page.getByRole('button', { name: /close/i });
  }

  async goto() {
    await this.page.goto('/automation/monitor');
    await this.waitForPageLoad();
  }

  async waitForPageLoad() {
    await expect(this.page).toHaveURL('/automation/monitor');
    await expect(this.page.getByRole('heading', { name: /execution monitor|monitor/i })).toBeVisible();
  }

  async assertStatsVisible() {
    await expect(this.totalExecutionsCard).toBeVisible();
    await expect(this.successRateCard).toBeVisible();
    await expect(this.successCountCard).toBeVisible();
    await expect(this.failureCountCard).toBeVisible();
  }

  async filterByTimeRange(range: 'today' | '7d' | '30d' | '90d' | 'all') {
    await this.timeRangeFilter.click();
    const rangeMap = {
      today: 'Today',
      '7d': 'Last 7 days',
      '30d': 'Last 30 days', 
      '90d': 'Last 90 days',
      all: 'All time'
    };
    await this.page.getByRole('option', { name: rangeMap[range] }).click();
    await this.page.waitForLoadState('networkidle');
  }

  async filterByRule(ruleName: string) {
    await this.ruleFilter.click();
    await this.page.getByRole('option', { name: ruleName }).click();
    await this.page.waitForLoadState('networkidle');
  }

  async filterByStatus(status: 'all' | 'success' | 'failed') {
    await this.statusFilter.click();
    const optionName = status === 'all' ? 'All Status' : status === 'success' ? 'Success' : 'Failed';
    await this.page.getByRole('option', { name: optionName }).click();
    await this.page.waitForLoadState('networkidle');
  }

  async searchExecutions(query: string) {
    await this.searchInput.fill(query);
    await this.page.waitForTimeout(500);
    await this.page.waitForLoadState('networkidle');
  }

  async refreshData() {
    await this.refreshButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async clickExport() {
    await this.exportButton.click();
  }

  async getExecutionsCount() {
    return await this.tableRows.count();
  }

  async viewExecutionDetails(rowIndex: number = 0) {
    const row = this.tableRows.nth(rowIndex);
    await row.getByRole('button', { name: /view|details/i }).click();
    await expect(this.detailsDialog).toBeVisible();
  }

  async closeDetails() {
    await this.closeDetailsButton.click();
    await expect(this.detailsDialog).not.toBeVisible();
  }

  async goToNextPage() {
    await this.nextPageButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async goToPrevPage() {
    await this.prevPageButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async assertExecutionVisible(ruleName: string) {
    await expect(this.page.getByText(ruleName).first()).toBeVisible();
  }
}
