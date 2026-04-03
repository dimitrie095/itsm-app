import { test, expect } from '../fixtures/auth';
import { LoginPage } from '../pages/LoginPage';
import { AutomationPage } from '../pages/AutomationPage';
import { AutomationNewPage } from '../pages/AutomationNewPage';

test.describe('Automation Page - Phase 1: Kernfunktionalität', () => {

  // ==========================================
  // 1.1 LOGIN & NAVIGATION (Hohe Priorität)
  // ==========================================
  
  test('should login as admin and navigate to automation via sidebar', async ({ page }) => {
    // Step 1: Login als Admin
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAsAdmin();
    
    // Step 2: Warte auf Dashboard Load
    await page.waitForLoadState('networkidle');
    await page.waitForURL(url => !url.includes('/login'));
    
    // Step 3: Navigation via Sidebar
    const automationLink = page.getByRole('link', { name: 'Automation' });
    await expect(automationLink).toBeVisible({ timeout: 10000 });
    await automationLink.click();
    
    // Step 4: Verifikation Automation-Page
    await page.waitForURL('/automation');
    await expect(page.getByRole('heading', { name: /automation/i })).toBeVisible();
    
    const automationPage = new AutomationPage(page);
    await automationPage.assertStatsCardsVisible();
    await expect(automationPage.createRuleButton).toBeVisible();
    await expect(automationPage.monitorButton).toBeVisible();
  });

  test('should deny end-user access to automation', async ({ endUserPage }) => {
    const page = endUserPage;
    
    // Versuche direkt auf Automation zuzugreifen
    await page.goto('/automation');
    await page.waitForLoadState('networkidle');
    
    // Sollte zu Unauthorized weitergeleitet werden
    await expect(page).toHaveURL(/\/unauthorized/);
    await expect(page.getByText(/unauthorized|access denied|no permission/i)).toBeVisible();
    
    // Automation-Link sollte nicht in Sidebar sein
    const automationLink = page.getByRole('link', { name: 'Automation' });
    await expect(automationLink).not.toBeVisible();
  });

  // ==========================================
  // 1.2 SEITEN-LOAD & BASIS-ELEMENTE (Hohe Priorität)
  // ==========================================

  test('should load automation page with all statistics cards', async ({ adminPage }) => {
    const page = adminPage;
    const automationPage = new AutomationPage(page);
    
    await automationPage.goto();
    
    // Alle Statistik-Kards sind sichtbar
    await automationPage.assertStatsCardsVisible();
    
    // Werte sind formatiert
    await expect(automationPage.totalRulesCard).toContainText(/\d+/);
    await expect(automationPage.activeRulesCard).toContainText(/\d+/);
    await expect(automationPage.executionRateCard).toContainText(/\d+%/);
    await expect(automationPage.lastExecutionCard).toContainText(/.+/); // Irgendein Text
  });

  test('should display all base elements on automation page', async ({ adminPage }) => {
    const page = adminPage;
    const automationPage = new AutomationPage(page);
    
    await automationPage.goto();
    
    // Basis-Elemente sind sichtbar
    await expect(automationPage.searchInput).toBeVisible();
    await expect(automationPage.searchInput).toHaveAttribute('placeholder', /search rules/i);
    
    await expect(automationPage.categoryFilter).toBeVisible();
    await expect(automationPage.statusFilter).toBeVisible();
    
    await expect(automationPage.createRuleButton).toBeVisible();
    await expect(automationPage.monitorButton).toBeVisible();
  });

  // ==========================================
  // 1.3 RULE-TABLE GRUND-FUNKTIONALITÄT (Hohe Priorität)
  // ==========================================

  test('should display rules table with correct headers', async ({ adminPage }) => {
    const page = adminPage;
    const automationPage = new AutomationPage(page);
    
    await automationPage.goto();
    
    // Tabelle ist sichtbar
    await expect(automationPage.rulesTable).toBeVisible();
    
    // Headers prüfen
    const headers = automationPage.rulesTable.locator('thead th');
    await expect(headers.first()).toContainText(/rule name/i);
    
    // Mindestens eine Zeile oder "No Rules" Nachricht
    const hasRows = await automationPage.tableRows.count() > 0;
    const hasNoRulesMessage = await automationPage.noRulesMessage.isVisible().catch(() => false);
    
    expect(hasRows || hasNoRulesMessage).toBeTruthy();
  });
});

test.describe('Automation Page - Phase 2: Suche & Filter', () => {

  test.beforeEach(async ({ adminPage }) => {
    await adminPage.goto('/automation');
    await adminPage.waitForLoadState('networkidle');
  });

  // ==========================================
  // 2.1 SUCHE & FILTER (Mittlere Priorität)
  // ==========================================

  test('should search rules by name', async ({ adminPage }) => {
    test.skip(); // Erfordert existierende Test-Daten
    const page = adminPage;
    const automationPage = new AutomationPage(page);
    
    // Erstelle eine Test-Rule falls keine existiert
    // TODO: Setup Fixture für Test-Daten
    
    const searchQuery = 'Test Rule';
    await automationPage.searchRules(searchQuery);
    
    // Warte auf Search-Results
    await page.waitForTimeout(600);
    
    // Prüfe, dass nur passende Rules sichtbar sind
    const rows = automationPage.tableRows;
    const rowCount = await rows.count();
    
    for (let i = 0; i < rowCount; i++) {
      const rowText = await rows.nth(i).textContent();
      expect(rowText).toContain(searchQuery);
    }
  });

  test('should filter rules by category', async ({ adminPage }) => {
    test.skip(); // Erfordert existierende Test-Daten
    const page = adminPage;
    const automationPage = new AutomationPage(page);
    
    // Filter nach "Tickets" Kategorie
    await automationPage.filterByCategory('Tickets');
    
    // Prüfe, dass nur Rules dieser Kategorie angezeigt werden
    const categoryBadges = page.locator('[data-testid="category-badge"]');
    const badgeCount = await categoryBadges.count();
    
    if (badgeCount > 0) {
      for (let i = 0; i < badgeCount; i++) {
        const badgeText = await categoryBadges.nth(i).textContent();
        expect(badgeText).toContain('Tickets');
      }
    }
  });

  test('should filter rules by status - active only', async ({ adminPage }) => {
    test.skip(); // Erfordert existierende Test-Daten
    const page = adminPage;
    const automationPage = new AutomationPage(page);
    
    await automationPage.filterByStatus('active');
    
    // Prüfe, dass nur aktive Rules angezeigt werden
    // TODO: Status-Badges prüfen
    await expect(page.getByText('Active')).toBeVisible();
  });

  test('should clear all filters', async ({ adminPage }) => {
    test.skip(); // Erfordert existierende Test-Daten
    const page = adminPage;
    const automationPage = new AutomationPage(page);
    
    // Wende Filter an
    await automationPage.searchRules('Test');
    await automationPage.filterByStatus('active');
    
    // Clear alle Filter
    await automationPage.clearAllFilters();
    
    // Prüfe, dass Filter zurückgesetzt sind
    await expect(automationPage.searchInput).toHaveValue('');
  });
});

test.describe('Automation Page - Phase 2: Rule-Aktionen', () => {

  test.beforeEach(async ({ adminPage }) => {
    await adminPage.goto('/automation');
    await adminPage.waitForLoadState('networkidle');
  });

  // ==========================================
  // 2.2 RULE-AKTIONEN (Mittlere Priorität)
  // ==========================================

  test('should open rule actions menu', async ({ adminPage }) => {
    test.skip(); // Erfordert existierende Test-Daten
    const page = adminPage;
    const automationPage = new AutomationPage(page);
    
    const testRuleName = 'Test Rule for Actions';
    // TODO: Create test rule first
    
    await automationPage.openRuleActions(testRuleName);
    
    // Prüfe, dass Menü sichtbar ist
    await expect(page.getByRole('menuitem', { name: /edit/i })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: /duplicate/i })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: /delete/i })).toBeVisible();
  });

  test('should navigate to edit rule page', async ({ adminPage }) => {
    test.skip(); // Erfordert existierende Test-Daten
    const page = adminPage;
    const automationPage = new AutomationPage(page);
    
    const testRuleName = 'Test Rule for Edit';
    // TODO: Create test rule first
    
    await automationPage.clickEditRule(testRuleName);
    
    // Prüfe Navigation zur Edit-Page
    await expect(page).toHaveURL(/\/automation\/.*\/edit/);
    await expect(page.getByRole('heading', { name: /edit rule/i })).toBeVisible();
  });

  test('should duplicate a rule', async ({ adminPage }) => {
    test.skip(); // Erfordert existierende Test-Daten & Setup
    const page = adminPage;
    const automationPage = new AutomationPage(page);
    
    const originalRuleName = 'Rule to Duplicate';
    // TODO: Create test rule first
    
    const initialCount = await automationPage.tableRows.count();
    await automationPage.clickDuplicateRule(originalRuleName);
    
    // Warte auf Duplizierung
    await page.waitForTimeout(1000);
    await page.reload();
    
    // Prüfe, dass neue Rule existiert
    const newCount = await automationPage.tableRows.count();
    expect(newCount).toBeGreaterThan(initialCount);
    
    const duplicatedRule = page.locator('tr', { hasText: `${originalRuleName} (Copy)` });
    await expect(duplicatedRule).toBeVisible();
  });

  test('should delete a rule', async ({ adminPage }) => {
    test.skip(); // Erfordert existierende Test-Daten & Setup
    const page = adminPage;
    const automationPage = new AutomationPage(page);
    
    const ruleName = 'Rule to Delete';
    // TODO: Create test rule first
    
    const initialCount = await automationPage.tableRows.count();
    await automationPage.clickDeleteRule(ruleName);
    
    // Bestätigungs-Dialog
    await page.getByRole('button', { name: /confirm|delete/i }).click();
    
    // Prüfe, dass Rule gelöscht ist
    await page.waitForTimeout(1000);
    const newCount = await automationPage.tableRows.count();
    expect(newCount).toBeLessThan(initialCount);
  });
});

test.describe('Automation Page - Phase 2: Tabs', () => {

  // ==========================================
  // 2.3 TABS (Mittlere Priorität)
  // ==========================================

  test('should navigate between tabs', async ({ adminPage }) => {
    const page = adminPage;
    const automationPage = new AutomationPage(page);
    
    await automationPage.goto();
    
    // "All Rules" Tab ist standardmäßig aktiv
    await expect(automationPage.allRulesTab).toHaveAttribute('data-state', 'active');
    
    // Wechsle zu "Active" Tab
    await automationPage.activeRulesTab.click();
    await expect(automationPage.activeRulesTab).toHaveAttribute('data-state', 'active');
    
    // Wechsle zu "Inactive" Tab
    await automationPage.inactiveRulesTab.click();
    await expect(automationPage.inactiveRulesTab).toHaveAttribute('data-state', 'active');
    
    // Wechsle zu "Recent Executions" Tab
    await automationPage.recentExecutionsTab.click();
    await expect(automationPage.recentExecutionsTab).toHaveAttribute('data-state', 'active');
    
    // Tabelle sollte Executions zeigen
    await expect(page.getByText(/execution|run|timestamp/i)).toBeVisible();
  });
});

test.describe('Automation Page - Phase 3: Erweiterte Features', () => {

  // ==========================================
  // 3.1 NEUE RULE ERSTELLEN (Niedrige Priorität)
  // ==========================================

  test('should navigate to create rule page', async ({ adminPage }) => {
    const page = adminPage;
    const automationPage = new AutomationPage(page);
    
    await automationPage.goto();
    await automationPage.clickCreateRule();
    
    await expect(page).toHaveURL('/automation/new');
    await expect(page.getByRole('heading', { name: /create.*rule|new rule/i })).toBeVisible();
  });

  test('should create a new rule', async ({ adminPage }) => {
    test.skip(); // Erfordert vollständiges Formular-Handling
    const page = adminPage;
    const automationPage = new AutomationPage(page);
    
    await automationPage.goto();
    await automationPage.clickCreateRule();
    
    // TODO: Formular ausfüllen
    // const newRulePage = new AutomationNewPage(page);
    // await newRulePage.fillRuleName('E2E Test Rule');
    // await newRulePage.selectTrigger('Ticket Created');
    // await newRulePage.addAction('Send Email');
    // await newRulePage.save();
    
    // Prüfe Success-Toast und Redirect
    // await expect(page.getByText('Rule created successfully')).toBeVisible();
    // await expect(page).toHaveURL('/automation');
  });

  // ==========================================
  // 3.3 MONITORING (Niedrige Priorität)
  // ==========================================

  test('should navigate to monitor page', async ({ adminPage }) => {
    const page = adminPage;
    const automationPage = new AutomationPage(page);
    
    await automationPage.goto();
    await automationPage.clickMonitor();
    
    await expect(page).toHaveURL('/automation/monitor');
    await expect(page.getByRole('heading', { name: /execution monitor|monitor|logs/i })).toBeVisible();
  });
});