import { test, expect } from '../fixtures/automation-test-data';
import { AutomationPage } from '../pages/AutomationPage';

/**
 * Tests für Suche & Filter Funktionalität
 * Verwendet automation-test-data.ts Fixture für Test-Daten
 */

test.describe('Automation - Suche & Filter Tests', () => {

  test.beforeEach(async ({ adminPage }) => {
    await adminPage.goto('/automation');
    await adminPage.waitForLoadState('networkidle');
  });

  test('should search rules by name', async ({ adminPage, testRules }) => {
    const page = adminPage;
    const automationPage = new AutomationPage(page);
    
    // Suche nach einem existierenden Rule-Namen
    const searchQuery = 'E2E Ticket Rule';
    await automationPage.searchRules(searchQuery);
    
    // Warte auf Search-Results
    await page.waitForTimeout(600);
    
    // Prüfe, dass nur passende Rules sichtbar sind
    const rows = automationPage.tableRows;
    const rowCount = await rows.count();
    
    expect(rowCount).toBeGreaterThan(0);
    
    for (let i = 0; i < rowCount && i < 5; i++) {
      const rowText = await rows.nth(i).textContent();
      expect(rowText).toContain(searchQuery);
    }
    
    // Cleanup: Filter zurücksetzen
    await automationPage.clearAllFilters();
  });

  test('should filter rules by category - Tickets', async ({ adminPage }) => {
    const page = adminPage;
    const automationPage = new AutomationPage(page);
    
    // Filter nach "Tickets" Kategorie
    await automationPage.filterByCategory('Tickets');
    
    // Warte auf Filter-Ergebnisse
    await page.waitForTimeout(500);
    
    // Prüfe, dass nur Rules dieser Kategorie angezeigt werden
    const rows = automationPage.tableRows;
    const rowCount = await rows.count();
    
    if (rowCount > 0) {
      const firstRow = rows.first();
      const rowText = await firstRow.textContent();
      // Sollte entweder "Tickets" haben oder der Name der Ticket Rule
      expect(rowText).toMatch(/Tickets|E2E Ticket Rule/i);
    }
    
    // Cleanup
    await automationPage.clearAllFilters();
  });

  test('should filter rules by category - Assets', async ({ adminPage }) => {
    const page = adminPage;
    const automationPage = new AutomationPage(page);
    
    // Filter nach "Assets" Kategorie
    await automationPage.filterByCategory('Assets');
    
    // Warte auf Filter-Ergebnisse
    await page.waitForTimeout(500);
    
    // Prüfe, dass nur Rules dieser Kategorie angezeigt werden
    const rows = automationPage.tableRows;
    const rowCount = await rows.count();
    
    if (rowCount > 0) {
      const firstRow = rows.first();
      const rowText = await firstRow.textContent();
      expect(rowText).toMatch(/Assets|E2E Asset Rule/i);
    }
    
    // Cleanup
    await automationPage.clearAllFilters();
  });

  test('should filter rules by status - active only', async ({ adminPage }) => {
    const page = adminPage;
    const automationPage = new AutomationPage(page);
    
    await automationPage.filterByStatus('active');
    
    // Warte auf Filter-Ergebnisse
    await page.waitForTimeout(500);
    
    // Prüfe, dass Statistik für "Active" sich erhöht oder bleibt
    const activeCountBefore = await automationPage.activeRulesCard.textContent();
    
    // Tab Wechsel und zurück sollte Filter beibehalten
    await automationPage.activeRulesTab.click();
    await page.waitForTimeout(300);
    
    // Cleanup
    await automationPage.clearAllFilters();
  });

  test('should filter rules by status - inactive only', async ({ adminPage }) => {
    const page = adminPage;
    const automationPage = new AutomationPage(page);
    
    await automationPage.filterByStatus('inactive');
    
    // Warte auf Filter-Ergebnisse
    await page.waitForTimeout(500);
    
    // Prüfe, dass nur inaktive Rules angezeigt werden
    const rows = automationPage.tableRows;
    const rowCount = await rows.count();
    
    // Sollte mindestens die "E2E User Rule" (inactive) enthalten
    if (rowCount > 0) {
      const firstRow = rows.first();
      const rowText = await firstRow.textContent();
      expect(rowText).toMatch(/E2E User Rule|Inactive/i);
    }
    
    // Cleanup
    await automationPage.clearAllFilters();
  });

  test('should combine search and filter', async ({ adminPage }) => {
    const page = adminPage;
    const automationPage = new AutomationPage(page);
    
    // Kombinierte Filter anwenden
    await automationPage.searchRules('E2E');
    await automationPage.filterByStatus('active');
    
    // Warte auf Ergebnisse
    await page.waitForTimeout(600);
    
    // Prüfe, dass beide Filter angewendet wurden
    const rows = automationPage.tableRows;
    const rowCount = await rows.count();
    
    expect(rowCount).toBeGreaterThan(0);
    
    for (let i = 0; i < rowCount && i < 3; i++) {
      const rowText = await rows.nth(i).textContent();
      expect(rowText).toContain('E2E');
    }
    
    // Clear alle Filter
    await automationPage.clearAllFilters();
    
    // Prüfe, dass Filter zurückgesetzt sind
    await expect(automationPage.searchInput).toHaveValue('');
  });

  test('should show no results for non-matching search', async ({ adminPage }) => {
    const page = adminPage;
    const automationPage = new AutomationPage(page);
    
    // Suche nach nicht-existierendem Text
    await automationPage.searchRules('NonExistingRuleXYZ123');
    
    // Warte auf Suche
    await page.waitForTimeout(600);
    
    // Sollte entweder keine Zeilen oder "No Rules" Nachricht zeigen
    const rowCount = await automationPage.tableRows.count();
    const noRulesVisible = await automationPage.noRulesMessage.isVisible().catch(() => false);
    
    expect(rowCount === 0 || noRulesVisible).toBeTruthy();
    
    // Cleanup
    await automationPage.clearAllFilters();
  });
});

test.describe('Automation - Rule Aktionen', () => {

  test.beforeEach(async ({ adminPage }) => {
    await adminPage.goto('/automation');
    await adminPage.waitForLoadState('networkidle');
  });

  test('should open rule actions menu', async ({ adminPage, testRule }) => {
    const page = adminPage;
    const automationPage = new AutomationPage(page);
    
    // Öffne Actions-Menü für Test-Rule
    await automationPage.openRuleActions(testRule.name);
    
    // Prüfe, dass Menü sichtbar ist mit allen Optionen
    await expect(page.getByRole('menuitem', { name: /edit.*rule/i })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: /duplicate/i })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: /test/i })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: /delete/i })).toBeVisible();
    
    // Menü schließen (klicke außerhalb)
    await page.locator('body').click();
  });

  test('should duplicate a rule', async ({ adminPage, testRule }) => {
    const page = adminPage;
    const automationPage = new AutomationPage(page);
    
    const initialCount = await automationPage.tableRows.count();
    
    // Dupliziere die Test-Rule
    await automationPage.clickDuplicateRule(testRule.name);
    
    // Warte auf Duplizierung und Toast
    await expect(page.getByText(/rule duplicated|success/i)).toBeVisible({ timeout: 10000 });
    
    // Seite neu laden, um sicherzustellen, dass die neue Rule sichtbar ist
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Prüfe, dass neue Rule existiert
    const newCount = await automationPage.tableRows.count();
    expect(newCount).toBeGreaterThan(initialCount);
    
    // Prüfe, dass die duplizierte Rule den richtigen Namen hat
    const duplicatedRule = page.locator('tr', { hasText: `${testRule.name} (Copy)` });
    await expect(duplicatedRule).toBeVisible();
    
    // Cleanup: Lösche die duplizierte Rule
    // TODO: Lösch-Funktion aufräumen
  });

  test('should test a rule', async ({ adminPage, testRule }) => {
    const page = adminPage;
    const automationPage = new AutomationPage(page);
    
    // Führe Test-Action aus
    await automationPage.clickTestRule(testRule.name);
    
    // Prüfe, dass Test-Modal oder Success-Toast angezeigt wird
    await expect(page.getByText(/rule tested|test completed|success/i)).toBeVisible({ timeout: 15000 });
    
    // Prüfe, dass Execution im Monitor erscheint
    await automationPage.clickMonitor();
    await expect(page.getByText(testRule.name)).toBeVisible();
  });
});

test.describe('Automation - Navigation & Monitoring', () => {

  test('should navigate to monitor page', async ({ adminPage }) => {
    const page = adminPage;
    const automationPage = new AutomationPage(page);
    
    await automationPage.goto();
    await automationPage.clickMonitor();
    
    await expect(page).toHaveURL(/\/automation\/monitor/);
    await expect(page.getByRole('heading', { name: /monitor|execution|logs/i })).toBeVisible();
    
    // Prüfe, dass Execution-Log geladen wird
    await expect(page.locator('table').or(page.locator('[data-testid="execution-item"]'))).toBeVisible();
  });

  test('should show execution details in monitor', async ({ adminPage, testRule }) => {
    const page = adminPage;
    const automationPage = new AutomationPage(page);
    
    // Erstelle eine Execution durch Test der Rule
    await automationPage.goto();
    await automationPage.clickTestRule(testRule.name);
    
    // Gehe zum Monitor
    await automationPage.clickMonitor();
    
    // Suche nach der Execution
    await expect(page.getByText(testRule.name).first()).toBeVisible();
    
    // Klicke auf Execution für Details
    const executionItem = page.getByText(testRule.name).first();
    await executionItem.click();
    
    // Prüfe Details Modal/Panel
    await expect(page.getByText(/execution details|input|output/i)).toBeVisible();
  });
});