#!/usr/bin/env node

/**
 * Security Test Runner
 * Node.js version for cross-platform compatibility
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
}

function colorize(color, text) {
  return `${colors[color]}${text}${colors.reset}`
}

function printHeader() {
  console.log(colorize('cyan', '🔒 Running Security Test Suite'))
  console.log(colorize('cyan', '='.repeat(50)))
  console.log()
}

function printStatus(status, message) {
  const symbols = {
    success: '✓',
    error: '✗',
    warning: '⚠',
    info: 'ℹ',
  }
  
  const colorMap = {
    success: 'green',
    error: 'red',
    warning: 'yellow',
    info: 'blue',
  }
  
  const symbol = symbols[status] || symbols.info
  const color = colorMap[status] || 'blue'
  
  console.log(colorize(color, `${symbol} ${message}`))
}

function checkDependencies() {
  printStatus('info', 'Checking dependencies...')
  
  try {
    // Check Node.js version
    const nodeVersion = process.version
    const majorVersion = parseInt(nodeVersion.replace('v', '').split('.')[0])
    
    if (majorVersion < 16) {
      printStatus('warning', `Node.js ${nodeVersion} detected. Recommended: v16 or higher.`)
    } else {
      printStatus('success', `Node.js ${nodeVersion} detected.`)
    }
    
    // Check if jest is installed
    try {
      require.resolve('jest')
      printStatus('success', 'Jest is installed.')
    } catch {
      printStatus('warning', 'Jest not found. Installing test dependencies...')
      execSync('npm install --no-save jest ts-jest @types/jest @jest/globals --legacy-peer-deps', {
        stdio: 'inherit'
      })
    }
    
    return true
  } catch (error) {
    printStatus('error', `Dependency check failed: ${error.message}`)
    return false
  }
}

function setupTestEnvironment() {
  printStatus('info', 'Setting up test environment...')
  
  try {
    // Set environment variables
    process.env.NODE_ENV = 'test'
    process.env.LOG_LEVEL = 'error'
    process.env.NEXTAUTH_SECRET = 'test-secret-for-security-tests'
    process.env.NEXTAUTH_URL = 'http://localhost:3000'
    
    // Create test database if needed
    if (!fs.existsSync('test.db') && !fs.existsSync('itsm.db')) {
      printStatus('warning', 'No database found. Creating test database...')
      fs.writeFileSync('test.db', '')
    }
    
    printStatus('success', 'Test environment configured.')
    return true
  } catch (error) {
    printStatus('error', `Environment setup failed: ${error.message}`)
    return false
  }
}

function runTestSuite(suiteName, testFile) {
  printStatus('info', `Running ${suiteName}...`)
  
  try {
    const jestConfig = path.join(__dirname, '..', 'tests', 'security', 'jest.config.js')
    
    execSync(`npx jest ${testFile} --config=${jestConfig} --passWithNoTests`, {
      stdio: 'inherit',
      cwd: process.cwd()
    })
    
    printStatus('success', `${suiteName} passed.`)
    return true
  } catch (error) {
    printStatus('error', `${suiteName} failed.`)
    return false
  }
}

function runAllTests() {
  printStatus('info', 'Running complete security test suite...')
  
  try {
    const jestConfig = path.join(__dirname, '..', 'tests', 'security', 'jest.config.js')
    
    execSync(`npx jest tests/security --config=${jestConfig} --passWithNoTests`, {
      stdio: 'inherit',
      cwd: process.cwd()
    })
    
    printStatus('success', 'All security tests passed.')
    return true
  } catch (error) {
    printStatus('error', 'Some security tests failed.')
    return false
  }
}

function generateCoverageReport() {
  printStatus('info', 'Generating coverage report...')
  
  try {
    const jestConfig = path.join(__dirname, '..', 'tests', 'security', 'jest.config.js')
    
    execSync(`npx jest tests/security --config=${jestConfig} --coverage --passWithNoTests`, {
      stdio: 'inherit',
      cwd: process.cwd()
    })
    
    const coveragePath = path.join(process.cwd(), 'coverage', 'security', 'index.html')
    if (fs.existsSync(coveragePath)) {
      printStatus('success', `Coverage report generated: ${coveragePath}`)
    } else {
      printStatus('warning', 'Coverage report generation completed but file not found.')
    }
    
    return true
  } catch (error) {
    printStatus('warning', `Coverage report generation failed: ${error.message}`)
    return false
  }
}

function cleanup() {
  printStatus('info', 'Cleaning up test environment...')
  
  try {
    // Remove test database
    if (fs.existsSync('test.db')) {
      fs.unlinkSync('test.db')
      printStatus('success', 'Test database cleaned up.')
    }
    
    return true
  } catch (error) {
    printStatus('warning', `Cleanup failed: ${error.message}`)
    return false
  }
}

async function main() {
  printHeader()
  
  let allPassed = true
  const results = {}
  
  // Step 1: Check dependencies
  if (!checkDependencies()) {
    printStatus('error', 'Dependency check failed. Exiting.')
    process.exit(1)
  }
  
  // Step 2: Setup environment
  if (!setupTestEnvironment()) {
    printStatus('error', 'Environment setup failed. Exiting.')
    process.exit(1)
  }
  
  // Step 3: Run individual test suites
  const testSuites = [
    { name: 'Authentication Security Tests', file: 'tests/security/auth.test.ts' },
    { name: 'Input Validation Security Tests', file: 'tests/security/validation.test.ts' },
    { name: 'API Security Tests', file: 'tests/security/api.test.ts' },
  ]
  
  for (const suite of testSuites) {
    const passed = runTestSuite(suite.name, suite.file)
    results[suite.name] = passed
    if (!passed) allPassed = false
    
    console.log() // Add spacing between test suites
  }
  
  // Step 4: Run all tests together
  const allTestsPassed = runAllTests()
  results['All Security Tests'] = allTestsPassed
  if (!allTestsPassed) allPassed = false
  
  console.log()
  
  // Step 5: Generate coverage report (optional)
  generateCoverageReport()
  
  console.log()
  
  // Step 6: Cleanup
  cleanup()
  
  // Step 7: Print summary
  console.log(colorize('cyan', '='.repeat(50)))
  console.log(colorize('cyan', 'Security Test Suite Complete'))
  console.log(colorize('cyan', '='.repeat(50)))
  console.log()
  
  // Print results
  console.log(colorize('blue', 'Test Results:'))
  console.log(colorize('blue', '-'.repeat(30)))
  
  Object.entries(results).forEach(([name, passed]) => {
    const status = passed ? colorize('green', 'PASS') : colorize('red', 'FAIL')
    console.log(`${name}: ${status}`)
  })
  
  console.log()
  
  if (allPassed) {
    printStatus('success', 'All security tests passed successfully!')
    console.log()
    console.log(colorize('green', 'Next steps:'))
    console.log('  1. Review the coverage report: coverage/security/index.html')
    console.log('  2. Run the tests in CI/CD pipeline')
    console.log('  3. Add more security tests as needed')
    console.log('  4. Consider penetration testing for production')
    process.exit(0)
  } else {
    printStatus('error', 'Security tests failed. Please review the issues above.')
    console.log()
    console.log(colorize('yellow', 'Troubleshooting:'))
    console.log('  1. Check test output for specific failures')
    console.log('  2. Verify database connectivity')
    console.log('  3. Check environment variables')
    console.log('  4. Review test setup configuration')
    process.exit(1)
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error(colorize('red', `Uncaught error: ${error.message}`))
  console.error(error.stack)
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error(colorize('red', `Unhandled rejection at: ${promise}`))
  console.error(colorize('red', `Reason: ${reason}`))
  process.exit(1)
})

// Run main function
if (require.main === module) {
  main()
}

module.exports = {
  checkDependencies,
  setupTestEnvironment,
  runTestSuite,
  runAllTests,
  generateCoverageReport,
  cleanup,
}