# User Deactivation Flow Test Plan

## Overview
This document outlines the test plan for verifying that the user deactivation feature works correctly after the recent fixes.

## Changes Made
1. **Enhanced Email Verification**
   - Added trimming of whitespace from input
   - Made email comparison case-insensitive
   - Added input blur handler to auto-trim

2. **Changed to Soft Deletion**
   - API now sets `isActive = false` instead of hard deleting
   - Updated GET /api/users to filter out inactive users
   - Changed audit log action from USER_DELETE to USER_DEACTIVATE
   - Updated response format from 204 to JSON

## Test Cases

### Test Case 1: Email Verification
**Objective**: Verify that the deactivation button is only enabled when the correct email is entered.

**Steps**:
1. Navigate to Users page
2. Click on the "..." menu for any active user
3. Select "Deactivate" from the dropdown
4. Verify the dialog opens with the user's email displayed
5. Type the wrong email (e.g., "wrong@email.com")
6. Verify the "Deactivate User" button remains disabled
7. Type the correct email (matching exactly what's displayed)
8. Verify the "Deactivate User" button becomes enabled
9. Try with leading/trailing spaces in the input
10. Verify the button still gets enabled (trimming should handle it)
11. Try with different case (e.g., EXAMPLE@EMAIL.COM vs example@email.com)
12. Verify the button gets enabled (case-insensitive comparison)

**Expected Results**:
- Button disabled until correct email is entered
- Whitespace is trimmed automatically
- Case differences are ignored
- Button enables immediately when criteria are met

### Test Case 2: Successful User Deactivation
**Objective**: Verify that clicking the deactivation button properly deactivates a user.

**Steps**:
1. Follow steps from Test Case 1 to enable the deactivation button
2. Click "Deactivate User" button
3. Verify loading spinner appears
4. Verify success toast message appears
5. Verify dialog closes automatically
6. Verify user disappears from the users list
7. Check the database directly to confirm:
   - User still exists in database
   - User's `isActive` field is set to `false`
   - Audit log entry exists with action "USER_DEACTIVATE"

**Expected Results**:
- User is "soft deleted" (isActive = false)
- User no longer appears in the users list
- Success message displayed
- Audit log records the action

### Test Case 3: API Response Handling
**Objective**: Verify correct handling of API responses.

**Steps**:
1. Use browser dev tools to monitor network requests
2. Deactivate a user as in Test Case 2
3. Check the DELETE request to `/api/users/{id}`
4. Verify the response status is 200 (not 204)
5. Verify the response JSON contains:
   ```json
   {
     "success": true,
     "message": "User deactivated successfully",
     "data": { /* user data with isActive: false */ },
     "timestamp": "..."
   }
   ```

**Expected Results**:
- API returns 200 status code
- Response includes success indicator and user data
- Frontend correctly processes the response

### Test Case 4: Error Handling
**Objective**: Verify proper error handling when deactivation fails.

**Steps**:
1. Try to deactivate a non-existent user (modify URL in dev tools)
2. Try to deactivate your own account (should be prevented)
3. Try to deactivate without proper permissions
4. Simulate network error (disconnect network)

**Expected Results**:
- Appropriate error messages displayed to user
- Error details logged to console
- Dialog remains open on error
- Loading state properly reset

### Test Case 5: Database Integrity
**Objective**: Verify database operations maintain data integrity.

**Steps**:
1. Before deactivation, note user's ID
2. Deactivate the user
3. Verify user still exists in database:
   ```sql
   SELECT * FROM "users" WHERE id = 'user-id';
   ```
4. Verify isActive is false:
   ```sql
   SELECT "isActive" FROM "users" WHERE id = 'user-id';
   ```
5. Verify related records still exist (tickets, comments, assets):
   ```sql
   SELECT * FROM "tickets" WHERE "userId" = 'user-id';
   SELECT * FROM "comments" WHERE "userId" = 'user-id';
   SELECT * FROM "assets" WHERE "userId" = 'user-id';
   ```
6. Verify audit log entry created:
   ```sql
   SELECT * FROM "audit_logs" WHERE "entityId" = 'user-id' AND action = 'USER_DEACTIVATE';
   ```

**Expected Results**:
- User record preserved in database
- isActive field set to false
- All related records intact
- Audit log entry created with proper details

## Testing Approach

### Manual Testing
1. Start the application: `npm run dev`
2. Log in as an admin user
3. Navigate to Users page
4. Execute each test case manually
5. Monitor browser console and network tab
6. Check database directly using Prisma Studio or SQL queries

### Automated Testing
Consider creating Playwright tests:

```typescript
// tests/e2e/user-deactivation.spec.ts
test('user deactivation flow', async ({ page }) => {
  // Login as admin
  await page.goto('/login');
  // ... login steps
  
  // Navigate to users page
  await page.goto('/users');
  
  // Click deactivate on first user
  await page.click('tr:first-child button[aria-haspopup="menu"]');
  await page.click('text=Deactivate');
  
  // Verify dialog opens
  await expect(page.locator('text=Deactivate User')).toBeVisible();
  
  // Verify button disabled
  const deactivateButton = page.locator('button', { hasText: 'Deactivate User' });
  await expect(deactivateButton).toBeDisabled();
  
  // Get email from label
  const emailLabel = await page.locator('label[for="confirm"] strong').textContent();
  
  // Type wrong email
  await page.fill('#confirm', 'wrong@email.com');
  await expect(deactivateButton).toBeDisabled();
  
  // Type correct email
  await page.fill('#confirm', emailLabel || '');
  await expect(deactivateButton).toBeEnabled();
  
  // Click deactivate
  await deactivateButton.click();
  
  // Verify success
  await expect(page.locator('text=User deactivated successfully')).toBeVisible();
});
```

## Verification Checklist

- [ ] Email verification works with exact match
- [ ] Email verification works with different case
- [ ] Email verification works with leading/trailing spaces
- [ ] Deactivation button enables/disables correctly
- [ ] User disappears from list after deactivation
- [ ] User record preserved in database with isActive = false
- [ ] Related records (tickets, assets, comments) remain intact
- [ ] Audit log entry created
- [ ] Success toast appears
- [ ] Error handling works for edge cases
- [ ] User cannot deactivate themselves
- [ ] Only admins can deactivate users

## Rollback Plan

If issues are found:
1. Revert changes to `UserDeactivateDialog.tsx`
2. Revert changes to `app/api/users/[id]/route.ts`
3. Revert changes to `app/api/users/route.ts`
4. Run database migration to set isActive = true for any accidentally deactivated users

## Additional Notes

- The soft deletion approach maintains data integrity and allows for user reactivation if needed
- Consider adding a "Reactivate User" feature in the future
- Consider adding a filter to show/hide deactivated users in the admin interface
- The audit log now correctly records USER_DEACTIVATE actions instead of USER_DELETE