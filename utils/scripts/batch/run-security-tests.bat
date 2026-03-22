@echo off
REM Security Test Runner for Windows
REM Run security-focused tests for the ITSM application

echo 🔒 Running Security Test Suite
echo ==============================

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ✗ Node.js is not installed
    exit /b 1
)

REM Check if npm is installed
where npm >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ✗ npm is not installed
    exit /b 1
)

REM Create test database if needed
if not exist "test.db" (
    if not exist "itsm.db" (
        echo ⚠ No database found. Creating test database...
        type nul > test.db
    )
)

REM Set test environment
set NODE_ENV=test
set LOG_LEVEL=error
set NEXTAUTH_SECRET=test-secret-for-security-tests
set NEXTAUTH_URL=http://localhost:3000

REM Install test dependencies if needed
if not exist "node_modules\jest" (
    echo ⚠ Installing test dependencies...
    npm install --no-save jest ts-jest @types/jest @jest/globals --legacy-peer-deps
)

set FAILED=false

REM Run security tests
echo.
echo Running Authentication Security Tests...
npx jest tests/security/auth.test.ts --config=tests/security/jest.config.js --passWithNoTests

if %ERRORLEVEL% equ 0 (
    echo ✓ Authentication security tests passed
) else (
    echo ✗ Authentication security tests failed
    set FAILED=true
)

echo.
echo Running Input Validation Security Tests...
npx jest tests/security/validation.test.ts --config=tests/security/jest.config.js --passWithNoTests

if %ERRORLEVEL% equ 0 (
    echo ✓ Input validation security tests passed
) else (
    echo ✗ Input validation security tests failed
    set FAILED=true
)

echo.
echo Running API Security Tests...
npx jest tests/security/api.test.ts --config=tests/security/jest.config.js --passWithNoTests

if %ERRORLEVEL% equ 0 (
    echo ✓ API security tests passed
) else (
    echo ✗ API security tests failed
    set FAILED=true
)

REM Run all security tests together
echo.
echo Running Complete Security Test Suite...
npx jest tests/security --config=tests/security/jest.config.js --passWithNoTests

if %ERRORLEVEL% equ 0 (
    echo ✓ All security tests passed
) else (
    echo ✗ Some security tests failed
    set FAILED=true
)

REM Generate coverage report
echo.
echo Generating Security Test Coverage Report...
npx jest tests/security --config=tests/security/jest.config.js --coverage --passWithNoTests

if %ERRORLEVEL% equ 0 (
    echo ✓ Coverage report generated: coverage\security\index.html
) else (
    echo ⚠ Coverage report generation failed
)

REM Cleanup test database
if exist "test.db" (
    del test.db
    echo ✓ Test database cleaned up
)

REM Summary
echo.
echo ==============================
echo Security Test Suite Complete
echo ==============================

if "%FAILED%"=="true" (
    echo ✗ Security tests failed. Please review the issues above.
    exit /b 1
) else (
    echo ✓ All security tests passed successfully!
    echo.
    echo Next steps:
    echo 1. Review the coverage report: coverage\security\index.html
    echo 2. Run the tests in CI/CD pipeline
    echo 3. Add more security tests as needed
    echo 4. Consider penetration testing for production
    exit /b 0
)