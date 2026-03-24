# E2E Tests for Knowledge Base

This directory contains comprehensive end-to-end tests for the Knowledge Base feature.

## Test Coverage

The `knowledge.spec.ts` test suite covers the following functionalities:

### 1. Login and Navigation
- Login via demo user profile (Admin User)
- Navigate to knowledge base via URL and navigation menu

### 2. Knowledge Base List View
- Display of metrics cards (Total Articles, Total Views, Helpful Rate, Draft Articles)
- Display of demo articles in the table
- Article details in table columns (Article, Category, Status, Views)
- Category filter display
- "New Article" button visibility for admin users

### 3. Search Functionality
- Search articles by title
- Search articles by category
- No results handling for non-matching searches

### 4. Category Filtering
- Filter articles by category
- Category sidebar functionality

### 5. Article Detail View
- Navigate to article detail page
- Display article metadata (views, helpful count, dates)
- Display article content
- View count increment
- Navigate back to knowledge base

### 6. Article CRUD Operations
- Create new article as draft
- Create and publish new article
- Validation errors for empty required fields
- Edit existing article
- Delete article with confirmation

### 7. Error Handling
- 404 for non-existent articles
- 404 for invalid article ID format

### 8. Permissions
- Admin user permissions (create, edit, delete)
- Agent user limited permissions
- End user view-only or no access

## Prerequisites

1. Install dependencies:
   ```bash
   npm install
   ```

2. Install Playwright browsers:
   ```bash
   npx playwright install chromium
   ```

## Running the Tests

### Quick Smoke Test (Verify Login Works)

Before running the full test suite, you can run a quick smoke test to verify the login works:

```bash
# First start the dev server
npm run dev

# In another terminal, run the smoke test
npx playwright test e2e/login-smoke.spec.ts --project=chromium

# Run with visible browser for debugging
npx playwright test e2e/login-smoke.spec.ts --project=chromium --headed
```

Screenshots will be saved to `e2e/screenshots/` for debugging.

### Option 1: With Auto-Started Dev Server

The Playwright configuration includes a `webServer` setting that automatically starts the Next.js dev server before running tests.

Uncomment the webServer section in `playwright.config.ts`:
```typescript
webServer: {
  command: 'npm run dev',
  url: 'http://localhost:3000',
  reuseExistingServer: !process.env.CI,
  timeout: 300 * 1000,
},
```

Then run:
```bash
npx playwright test e2e/knowledge.spec.ts
```

### Option 2: With Manual Dev Server (Recommended)

1. Start the dev server in a separate terminal:
   ```bash
   npm run dev
   ```

2. Wait for the server to be ready (http://localhost:3000)

3. Run the tests in another terminal:
   ```bash
   npx playwright test e2e/knowledge.spec.ts --project=chromium
   ```

### Option 3: Run Specific Test Groups

Run only specific test groups:
```bash
# Run only login tests
npx playwright test e2e/knowledge.spec.ts -g "Login and Navigation"

# Run only CRUD operations
npx playwright test e2e/knowledge.spec.ts -g "Article CRUD Operations"

# Run only search tests
npx playwright test e2e/knowledge.spec.ts -g "Search Functionality"
```

### Option 4: Run with UI Mode (for debugging)

```bash
npx playwright test e2e/knowledge.spec.ts --ui
```

### Option 5: Run in Headed Mode (see browser)

```bash
npx playwright test e2e/knowledge.spec.ts --headed
```

## Test Reports

After running tests, view the HTML report:
```bash
npx playwright show-report
```

## Test Data

The tests use the following credentials:
- **Admin User**: admin@example.com / demo123 (full permissions)
- **Support Agent**: agent@example.com / demo123 (limited permissions)
- **End User**: user@example.com / demo123 (view-only or no access)

The tests will automatically fill in the login form with these credentials.

Demo articles are automatically loaded if no articles exist in the database:
- KB-001: How to reset your password (Security)
- KB-002: VPN setup guide for remote work (Networking)
- KB-003: Troubleshooting printer issues (Hardware)
- KB-004: Microsoft Teams installation (Software, Draft)
- KB-005: Email signature configuration (Email)
- KB-006: Software license renewal process (Process)

## Troubleshooting

### Tests timing out
- Make sure the dev server is running and accessible at http://localhost:3000
- Increase timeout in playwright.config.ts

### Demo login fails
- Check that the login page has the demo user buttons
- Verify the credentials in the test match your environment

### Browser not found
- Run `npx playwright install chromium` to install the browser

### Element not found errors
- The UI may have changed; update the selectors in the test file
- Use `await page.pause()` in the test to debug and inspect elements

## CI/CD Integration

For CI/CD pipelines, use:
```bash
npx playwright test e2e/knowledge.spec.ts --reporter=line
```

The tests are configured to:
- Run on Chromium
- Retry failed tests twice in CI
- Use 1 worker in CI for stability
