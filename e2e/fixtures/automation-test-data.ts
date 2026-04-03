import { test as baseTest } from '../fixtures/auth';
import { AutomationPage } from '../pages/AutomationPage';
import { AutomationNewPage } from '../pages/AutomationNewPage';

/**
 * Fixture für Automation-Tests mit Test-Daten
 * 
 * Diese Fixture stellt sicher, dass Test-Rules existieren,
 * bevor die eigentlichen Tests ausgeführt werden.
 */

export const test = baseTest.extend<{
  testRule: { name: string; id?: string };
  testRules: Array<{ name: string; id?: string; category?: string; status?: 'active' | 'inactive' }>;
}>({
  // Einzelne Test-Rule
  testRule: async ({ adminPage }, use) => {
    const page = adminPage;
    const automationPage = new AutomationPage(page);
    const newPage = new AutomationNewPage(page);
    
    await automationPage.goto();
    await page.waitForLoadState('networkidle');
    
    // Prüfe, ob Test-Rule bereits existiert
    const ruleName = 'E2E Test Rule';
    const existingRule = page.locator('tr', { hasText: ruleName });
    
    if (!(await existingRule.isVisible().catch(() => false))) {
      // Erstelle neue Test-Rule
      await automationPage.clickCreateRule();
      
      await newPage.fillRuleName(ruleName);
      await newPage.fillDescription('This is a test rule created by E2E tests');
      await newPage.selectTrigger('ticket.created');
      await newPage.selectCategory('Tickets');
      await newPage.selectAction('send_notification');
      await newPage.save();
      
      // Warte auf Redirect
      await page.waitForURL(/\/automation/);
    }
    
    await use({ name: ruleName });
  },

  // Mehrere Test-Rules für Filter-Tests
  testRules: async ({ adminPage }, use) => {
    const page = adminPage;
    const automationPage = new AutomationPage(page);
    const newPage = new AutomationNewPage(page);
    
    // Sicherstellen, dass wir auf der Automation-Page sind
    await automationPage.goto();
    await page.waitForLoadState('networkidle');
    
    const testRules = [
      { name: 'E2E Ticket Rule', category: 'Tickets', status: 'active' as const },
      { name: 'E2E Asset Rule', category: 'Assets', status: 'active' as const },
      { name: 'E2E User Rule', category: 'Users', status: 'inactive' as const },
      { name: 'E2E Duplicate Test', category: 'Tickets', status: 'active' as const },
    ];
    
    // Erstelle fehlende Test-Rules
    for (const rule of testRules) {
      const existingRule = page.locator('tr', { hasText: rule.name });
      
      if (!(await existingRule.isVisible().catch(() => false))) {
        await automationPage.clickCreateRule();
        
        await newPage.fillRuleName(rule.name);
        await newPage.fillDescription(`Test rule for ${rule.category} category`);
        await newPage.selectTrigger('ticket.created');
        await newPage.selectCategory(rule.category);
        
        if (rule.status === 'inactive') {
          await newPage.setStatus('inactive');
        }
        
        await newPage.save();
        await page.waitForURL(/\/automation/);
        await page.waitForLoadState('networkidle');
      }
    }
    
    await use(testRules);
  },
});