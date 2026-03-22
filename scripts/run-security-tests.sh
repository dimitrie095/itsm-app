#!/bin/bash

# Security Test Runner
# Run security-focused tests for the ITSM application

set -e

echo "🔒 Running Security Test Suite"
echo "=============================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    if [ "$1" = "success" ]; then
        echo -e "${GREEN}✓ $2${NC}"
    elif [ "$1" = "error" ]; then
        echo -e "${RED}✗ $2${NC}"
    elif [ "$1" = "warning" ]; then
        echo -e "${YELLOW}⚠ $2${NC}"
    else
        echo -e "$2"
    fi
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_status "error" "Node.js is not installed"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_status "error" "npm is not installed"
    exit 1
fi

# Create test database if needed
if [ ! -f "test.db" ] && [ ! -f "itsm.db" ]; then
    print_status "warning" "No database found. Creating test database..."
    touch test.db
fi

# Set test environment
export NODE_ENV=test
export LOG_LEVEL=error
export NEXTAUTH_SECRET="test-secret-for-security-tests"
export NEXTAUTH_URL="http://localhost:3000"

# Install test dependencies if needed
if [ ! -d "node_modules/jest" ]; then
    print_status "warning" "Installing test dependencies..."
    npm install --no-save jest ts-jest @types/jest @jest/globals --legacy-peer-deps
fi

# Run security tests
echo ""
echo "Running Authentication Security Tests..."
npx jest tests/security/auth.test.ts --config=tests/security/jest.config.js --passWithNoTests

if [ $? -eq 0 ]; then
    print_status "success" "Authentication security tests passed"
else
    print_status "error" "Authentication security tests failed"
    FAILED=true
fi

echo ""
echo "Running Input Validation Security Tests..."
npx jest tests/security/validation.test.ts --config=tests/security/jest.config.js --passWithNoTests

if [ $? -eq 0 ]; then
    print_status "success" "Input validation security tests passed"
else
    print_status "error" "Input validation security tests failed"
    FAILED=true
fi

echo ""
echo "Running API Security Tests..."
npx jest tests/security/api.test.ts --config=tests/security/jest.config.js --passWithNoTests

if [ $? -eq 0 ]; then
    print_status "success" "API security tests passed"
else
    print_status "error" "API security tests failed"
    FAILED=true
fi

# Run all security tests together
echo ""
echo "Running Complete Security Test Suite..."
npx jest tests/security --config=tests/security/jest.config.js --passWithNoTests

if [ $? -eq 0 ]; then
    print_status "success" "All security tests passed"
else
    print_status "error" "Some security tests failed"
    FAILED=true
fi

# Generate coverage report
echo ""
echo "Generating Security Test Coverage Report..."
npx jest tests/security --config=tests/security/jest.config.js --coverage --passWithNoTests

if [ $? -eq 0 ]; then
    print_status "success" "Coverage report generated: coverage/security/index.html"
else
    print_status "warning" "Coverage report generation failed"
fi

# Cleanup test database
if [ -f "test.db" ]; then
    rm test.db
    print_status "success" "Test database cleaned up"
fi

# Summary
echo ""
echo "=============================="
echo "Security Test Suite Complete"
echo "=============================="

if [ "$FAILED" = true ]; then
    print_status "error" "Security tests failed. Please review the issues above."
    exit 1
else
    print_status "success" "All security tests passed successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Review the coverage report: coverage/security/index.html"
    echo "2. Run the tests in CI/CD pipeline"
    echo "3. Add more security tests as needed"
    echo "4. Consider penetration testing for production"
    exit 0
fi