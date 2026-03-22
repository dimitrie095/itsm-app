import { prisma } from '@/lib/prisma'

// Global test setup
beforeAll(async () => {
  // Set test environment
  process.env.NODE_ENV = 'test'
  process.env.LOG_LEVEL = 'error' // Reduce log noise during tests
  
  // Verify database connection
  try {
    await prisma.$connect()
    console.log('✅ Database connected for security tests')
  } catch (error) {
    console.error('❌ Database connection failed:', error)
    throw error
  }
})

// Global test teardown
afterAll(async () => {
  // Clean up any remaining test data
  try {
    await prisma.user.deleteMany({
      where: { email: { contains: 'test.security' } }
    })
    await prisma.ticket.deleteMany({
      where: { title: { contains: '[Security Test]' } }
    })
    
    await prisma.$disconnect()
    console.log('✅ Database disconnected after security tests')
  } catch (error) {
    console.error('❌ Database cleanup failed:', error)
  }
})

// Mock environment variables for tests
process.env.NEXTAUTH_SECRET = 'test-secret-key-for-security-tests-only'
process.env.NEXTAUTH_URL = 'http://localhost:3000'
process.env.DATABASE_URL = process.env.DATABASE_URL || 'file:./test.db'

// Suppress console logs during tests
const originalConsoleLog = console.log
const originalConsoleError = console.error
const originalConsoleWarn = console.warn

beforeEach(() => {
  console.log = jest.fn()
  console.error = jest.fn()
  console.warn = jest.fn()
})

afterEach(() => {
  console.log = originalConsoleLog
  console.error = originalConsoleError
  console.warn = originalConsoleWarn
})

// Export test utilities
export const testUtils = {
  createTestUser: async (email: string, role: string = 'END_USER') => {
    return await prisma.user.create({
      data: {
        email,
        name: 'Test User',
        role,
        passwordHash: 'hashed_password_for_test', // In real tests, use bcrypt
      },
    })
  },
  
  createTestTicket: async (userId: string) => {
    return await prisma.ticket.create({
      data: {
        title: `Test Ticket ${Date.now()}`,
        description: 'Test ticket description',
        userId,
        priority: 'MEDIUM',
        status: 'NEW',
        category: 'Test',
      },
    })
  },
  
  cleanupTestData: async () => {
    await prisma.user.deleteMany({
      where: { email: { contains: 'test.' } }
    })
    await prisma.ticket.deleteMany({
      where: { title: { contains: 'Test Ticket' } }
    })
  },
}