import { Page, Locator, expect } from '@playwright/test';

/**
 * Page object for the Login page
 */
export class LoginPage {
  readonly page: Page;
  
  // Form fields
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  
  // Buttons
  readonly signInButton: Locator;
  readonly forgotPasswordLink: Locator;
  
  // Demo user buttons
  readonly adminDemoButton: Locator;
  readonly agentDemoButton: Locator;
  readonly endUserDemoButton: Locator;
  
  // Error messages
  readonly errorAlert: Locator;

  constructor(page: Page) {
    this.page = page;
    
    // Form fields
    this.emailInput = page.getByLabel('Email');
    this.passwordInput = page.getByLabel('Password');
    
    // Buttons
    this.signInButton = page.getByRole('button', { name: /sign in/i });
    this.forgotPasswordLink = page.getByRole('link', { name: /forgot password/i });
    
    // Demo user buttons - using patterns to match "Admin User" or "admin@example.com"
    this.adminDemoButton = page.getByRole('button', { name: /admin user|admin@example/i });
    this.agentDemoButton = page.getByRole('button', { name: /support agent|agent@example/i });
    this.endUserDemoButton = page.getByRole('button', { name: /end user|user@example/i });
    
    // Error messages
    this.errorAlert = page.locator('[role="alert"]').filter({ hasText: /invalid|error|failed/i });
  }

  /**
   * Navigate to the login page
   */
  async goto() {
    await this.page.goto('/login');
    await this.waitForPageLoad();
  }

  /**
   * Wait for the page to be fully loaded
   */
  async waitForPageLoad() {
    await expect(this.page).toHaveURL(/\/login/);
    await expect(this.signInButton).toBeVisible({ timeout: 10000 });
  }

  /**
   * Login using the form with email and password
   */
  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.signInButton.click();
    
    // Wait for navigation after successful login
    await this.page.waitForURL(/\/(dashboard|tickets|automation|unauthorized|\?)?/, { timeout: 15000 });
  }

  /**
   * Login as admin using the demo button
   */
  async loginAsAdmin() {
    await expect(this.adminDemoButton).toBeVisible({ timeout: 10000 });
    await this.adminDemoButton.click();
    await this.page.waitForURL(/\/(dashboard|tickets|automation|unauthorized|\?)?/, { timeout: 15000 });
  }

  /**
   * Login as agent using the demo button
   */
  async loginAsAgent() {
    await expect(this.agentDemoButton).toBeVisible({ timeout: 10000 });
    await this.agentDemoButton.click();
    await this.page.waitForURL(/\/(dashboard|tickets|automation|unauthorized|\?)?/, { timeout: 15000 });
  }

  /**
   * Login as end user using the demo button
   */
  async loginAsEndUser() {
    await expect(this.endUserDemoButton).toBeVisible({ timeout: 10000 });
    await this.endUserDemoButton.click();
    await this.page.waitForURL(/\/(dashboard|tickets|automation|unauthorized|\?)?/, { timeout: 15000 });
  }

  /**
   * Check if error message is displayed
   */
  async hasError(): Promise<boolean> {
    return await this.errorAlert.isVisible().catch(() => false);
  }

  /**
   * Get error message text
   */
  async getErrorText(): Promise<string | null> {
    if (await this.hasError()) {
      return await this.errorAlert.textContent();
    }
    return null;
  }

  /**
   * Navigate to forgot password page
   */
  async goToForgotPassword() {
    await this.forgotPasswordLink.click();
    await expect(this.page).toHaveURL(/\/forgot-password/);
  }

  /**
   * Assert that all demo buttons are visible
   */
  async assertDemoButtonsVisible() {
    await expect(this.adminDemoButton).toBeVisible();
    await expect(this.agentDemoButton).toBeVisible();
    await expect(this.endUserDemoButton).toBeVisible();
  }
}
