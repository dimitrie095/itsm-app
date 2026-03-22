# Security Test Suite

## Overview
Comprehensive security testing for the ITSM application. This suite focuses on identifying and preventing security vulnerabilities before they reach production.

## Test Categories

### 1. Authentication Security
- Password security and hashing
- Account lockout mechanisms
- Session management
- Brute force protection
- Password reset security
- Multi-factor authentication readiness
- Security headers validation
- Input validation for auth endpoints

### 2. Input Validation Security
- SQL injection prevention
- XSS (Cross-Site Scripting) prevention
- Path traversal prevention
- Command injection prevention
- NoSQL injection prevention
- Buffer overflow prevention
- Type validation
- Enum validation
- UUID validation
- Business logic validation

### 3. API Security
- Authentication bypass prevention
- Authorization bypass prevention
- IDOR (Insecure Direct Object Reference) prevention
- Mass assignment protection
- Rate limiting implementation
- CORS configuration
- HTTP security headers
- Error handling security
- Content-Type validation
- Size limits enforcement
- HTTP method validation
- Parameter pollution handling
- Session management
- API versioning considerations

## Running Tests

### Quick Start
```bash
# Run all security tests
npm run test:security

# Or run manually
./scripts/run-security-tests.sh  # Linux/macOS
scripts\run-security-tests.bat    # Windows
```

### Individual Test Suites
```bash
# Authentication tests
npx jest tests/security/auth.test.ts

# Input validation tests  
npx jest tests/security/validation.test.ts

# API security tests
npx jest tests/security/api.test.ts
```

### With Coverage
```bash
npx jest tests/security --coverage
# Report available at: coverage/security/index.html
```

## Test Configuration

### Environment Setup
Tests run in `NODE_ENV=test` with:
- Reduced log noise (`LOG_LEVEL=error`)
- Test database (separate from production)
- Mock authentication secrets
- Isolated test data

### Database Requirements
- Tests use a separate test database
- Test data is automatically cleaned up
- No production data is touched
- Database connection is verified before tests

### Dependencies
- Jest test framework
- TypeScript support (ts-jest)
- Prisma for database operations
- bcryptjs for password hashing tests
- Zod for validation testing

## Writing New Security Tests

### Test Structure
```typescript
import { describe, it, expect } from '@jest/globals'

describe('Security Category', () => {
  beforeEach(() => {
    // Setup test data
  })

  afterEach(() => {
    // Cleanup test data
  })

  it('should prevent specific vulnerability', () => {
    // Test implementation
    expect(securityControl).toBeEffective()
  })
})
```

### Best Practices for Security Tests

1. **Isolate Test Data**
   - Use unique identifiers for test data
   - Clean up after each test
   - Never touch production data

2. **Test Negative Cases**
   - Test what should NOT happen
   - Verify error handling
   - Check boundary conditions

3. **Use Real Attack Patterns**
   - Use actual exploit patterns
   - Test common vulnerability types
   - Include OWASP Top 10 scenarios

4. **Verify Security Controls**
   - Don't just test functionality
   - Verify security mechanisms work
   - Check defense in depth

5. **Maintain Test Independence**
   - Tests should not depend on each other
   - Reset state between tests
   - Avoid shared mutable state

## Test Coverage

### Current Coverage Areas
- ✅ Authentication security
- ✅ Input validation security  
- ✅ API endpoint security
- ✅ Database security basics
- ✅ Error handling security

### Planned Coverage Areas
- 🔲 Web security headers
- 🔲 CORS and CSRF protection
- 🔲 File upload security
- 🔲 Dependency vulnerability scanning
- 🔲 Secret management
- 🔲 Logging security
- 🔲 Monitoring and alerting

## Integration with CI/CD

### GitHub Actions Example
```yaml
name: Security Tests
on: [push, pull_request]
jobs:
  security-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:security
```

### Failure Conditions
Tests fail when:
- Security vulnerability is detected
- Security control is missing
- Expected security behavior fails
- Test infrastructure fails

## Security Test Patterns

### Injection Testing
```typescript
const injectionAttempts = [
  "' OR '1'='1", // SQL injection
  '<script>alert("xss")</script>', // XSS
  '../../../etc/passwd', // Path traversal
]

for (const attempt of injectionAttempts) {
  expect(validationRejects(attempt)).toBe(true)
}
```

### Authorization Testing
```typescript
// Test that END_USER cannot access ADMIN endpoints
const userResponse = await makeRequestAsUser(Role.END_USER, '/api/admin')
expect(userResponse.status).toBe(403)

// Test that users cannot access other users' data
const otherUserData = await getUserDataAsUser(userId, otherUserId)
expect(otherUserData).toBeNull()
```

### Input Validation Testing
```typescript
// Test schema validation
const invalidData = { email: 'not-an-email', password: 'short' }
const result = await userSchema.safeParseAsync(invalidData)
expect(result.success).toBe(false)
```

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   ```
   Error: Database connection failed
   ```
   **Solution**: Check DATABASE_URL environment variable

2. **Test Dependencies Missing**
   ```
   Cannot find module 'jest'
   ```
   **Solution**: Run `npm install --save-dev jest ts-jest @types/jest`

3. **Test Data Conflicts**
   ```
   Unique constraint failed
   ```
   **Solution**: Use unique identifiers in test data

4. **Environment Variables Missing**
   ```
   NEXTAUTH_SECRET is required
   ```
   **Solution**: Set test environment variables in setup.ts

### Debugging Tests
```bash
# Run tests with verbose output
npx jest tests/security --verbose

# Run specific test with debug
npx jest tests/security/auth.test.ts --testNamePattern="password security"

# Run with Node.js debugger
node --inspect-brk node_modules/.bin/jest tests/security
```

## Security Test Reports

### Coverage Reports
- HTML report: `coverage/security/index.html`
- LCOV report: `coverage/security/lcov.info`
- Text summary in console

### Test Results
- Pass/fail status for each test
- Detailed error messages
- Stack traces for failures
- Performance metrics

### Security Findings
- Vulnerabilities detected
- Missing security controls
- Configuration issues
- Recommendations for improvement

## Continuous Improvement

### Regular Updates
- Update test patterns quarterly
- Add new vulnerability tests
- Review OWASP Top 10 changes
- Update dependencies

### Feedback Loop
- Integrate with bug tracking
- Link tests to security requirements
- Track vulnerability fixes
- Measure security posture improvement

### Metrics
- Test coverage percentage
- Vulnerability detection rate
- False positive rate
- Test execution time
- Security debt reduction

## Contributing

### Adding New Tests
1. Identify security requirement
2. Create test file in appropriate category
3. Follow existing test patterns
4. Include cleanup logic
5. Document test purpose
6. Submit pull request

### Reporting Issues
1. Create issue with vulnerability details
2. Include reproduction steps
3. Suggest fix if known
4. Label as security issue
5. Follow responsible disclosure

### Security Researchers
- Follow responsible disclosure policy
- Use test environment for research
- Do not test production systems
- Contact security team for coordination

## Support

For security test issues:
1. Check test setup and configuration
2. Review error messages and logs
3. Verify database connectivity
4. Check environment variables
5. Contact security team if needed

## Related Resources

- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Prisma Testing Guide](https://www.prisma.io/docs/guides/testing)
- [Zod Validation](https://zod.dev/)
- [NextAuth.js Security](https://next-auth.js.org/configuration/options)