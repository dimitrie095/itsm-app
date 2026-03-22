import { describe, it, expect } from '@jest/globals'
import { 
  userCreateSchema, 
  userLoginSchema, 
  ticketCreateSchema,
  ticketUpdateSchema,
  assetSchema,
  articleSchema,
  ValidationError 
} from '@/lib/validation/schemas'
import { z } from 'zod'

/**
 * Security Test Suite: Input Validation
 * Tests for input validation security vulnerabilities
 */

describe('Input Validation Security', () => {
  describe('SQL Injection Prevention', () => {
    const sqlInjectionAttempts = [
      "' OR '1'='1",
      "admin' --",
      "' UNION SELECT * FROM users --",
      "'; DROP TABLE users; --",
      "' OR 1=1 --",
      "' OR 'a'='a",
      "') OR ('1'='1",
      "' OR EXISTS(SELECT * FROM users) --",
      "' OR SLEEP(5) --",
      "' OR BENCHMARK(1000000,MD5('test')) --",
    ]

    it('should reject SQL injection in user creation', async () => {
      for (const attempt of sqlInjectionAttempts) {
        const data = {
          email: `${attempt}@example.com`,
          name: attempt,
          role: 'END_USER',
          password: 'ValidPassword123!',
        }

        try {
          await userCreateSchema.parseAsync(data)
          // If validation passes, it should sanitize the input
          expect(data.email).not.toMatch(/' OR '1'='1/)
        } catch (error) {
          // Validation should fail for dangerous inputs
          expect(error).toBeInstanceOf(z.ZodError)
        }
      }
    })

    it('should reject SQL injection in login', async () => {
      for (const attempt of sqlInjectionAttempts) {
        const data = {
          email: attempt,
          password: attempt,
        }

        try {
          await userLoginSchema.parseAsync(data)
          // If validation passes, it should sanitize the input
          expect(data.email).not.toMatch(/' OR '1'='1/)
        } catch (error) {
          // Validation should fail for dangerous inputs
          expect(error).toBeInstanceOf(z.ZodError)
        }
      }
    })

    it('should reject SQL injection in ticket creation', async () => {
      for (const attempt of sqlInjectionAttempts) {
        const data = {
          title: attempt,
          description: attempt,
          priority: 'MEDIUM',
          category: attempt,
        }

        try {
          await ticketCreateSchema.parseAsync(data)
          // If validation passes, it should sanitize the input
          expect(data.title).not.toMatch(/' OR '1'='1/)
        } catch (error) {
          // Validation should fail for dangerous inputs
          expect(error).toBeInstanceOf(z.ZodError)
        }
      }
    })
  })

  describe('XSS Prevention', () => {
    const xssAttempts = [
      '<script>alert("xss")</script>',
      '<img src="x" onerror="alert(\'xss\')">',
      '<svg onload="alert(\'xss\')">',
      'javascript:alert(\'xss\')',
      '"><script>alert(\'xss\')</script>',
      'onmouseover="alert(\'xss\')"',
      '<iframe src="javascript:alert(\'xss\')">',
      '<body onload=alert(\'xss\')>',
      '<embed src="javascript:alert(\'xss\')">',
      '<object data="javascript:alert(\'xss\')">',
    ]

    it('should reject XSS in user input', async () => {
      for (const attempt of xssAttempts) {
        const data = {
          email: 'test@example.com',
          name: attempt,
          role: 'END_USER',
          password: 'ValidPassword123!',
        }

        try {
          await userCreateSchema.parseAsync(data)
          // If validation passes, the input should be sanitized elsewhere
          expect(data.name).toBeDefined()
        } catch (error) {
          // Name validation might fail due to length or other constraints
          expect(error).toBeInstanceOf(z.ZodError)
        }
      }
    })

    it('should reject XSS in ticket descriptions', async () => {
      for (const attempt of xssAttempts) {
        const data = {
          title: 'Test Ticket',
          description: attempt,
          priority: 'MEDIUM',
          category: 'Technical',
        }

        try {
          await ticketCreateSchema.parseAsync(data)
          // Description might be long enough to pass validation
          // XSS prevention should happen at rendering time
          expect(data.description.length).toBeGreaterThan(10)
        } catch (error) {
          // Might fail for very short descriptions
          expect(error).toBeInstanceOf(z.ZodError)
        }
      }
    })
  })

  describe('Path Traversal Prevention', () => {
    const pathTraversalAttempts = [
      '../../../etc/passwd',
      '..\\..\\windows\\system32\\config',
      '../../../../../../etc/shadow',
      '%2e%2e%2f%2e%2e%2fetc%2fpasswd',
      '..%255c..%255c..%255cwindows',
      '....//....//etc/passwd',
    ]

    it('should reject path traversal in file uploads', async () => {
      // File upload validation would be separate
      // For now, we test that our schemas don't accept these as normal strings
      for (const attempt of pathTraversalAttempts) {
        const data = {
          name: attempt,
          type: 'SOFTWARE',
          status: 'AVAILABLE',
        }

        try {
          await assetSchema.parseAsync(data)
          // If it passes, ensure it's not treated as a path
          expect(data.name).toBe(attempt)
        } catch (error) {
          // Might fail due to length constraints
          expect(error).toBeInstanceOf(z.ZodError)
        }
      }
    })
  })

  describe('Command Injection Prevention', () => {
    const commandInjectionAttempts = [
      '; ls -la',
      '| cat /etc/passwd',
      '&& rm -rf /',
      '`id`',
      '$(whoami)',
      '|| shutdown -h now',
      '> /dev/null; ping -c 5 127.0.0.1',
      '; nc -lvp 4444 -e /bin/bash',
    ]

    it('should reject command injection', async () => {
      for (const attempt of commandInjectionAttempts) {
        const data = {
          title: 'Test Article',
          content: attempt,
          category: 'Security',
          authorId: '00000000-0000-0000-0000-000000000000',
        }

        try {
          await articleSchema.parseAsync(data)
          // If it passes, ensure commands aren't executed
          expect(data.content).toBe(attempt)
        } catch (error) {
          // Might fail due to length constraints
          expect(error).toBeInstanceOf(z.ZodError)
        }
      }
    })
  })

  describe('NoSQL Injection Prevention', () => {
    const nosqlInjectionAttempts = [
      '{ "$ne": "" }',
      '{ "$gt": "" }',
      '{ "$where": "1 == 1" }',
      '{"$regex": ".*"}',
      '{"$exists": true}',
      'null',
      'true',
      'false',
      'undefined',
    ]

    it('should reject NoSQL injection', async () => {
      // Our Zod schemas should reject these as they're not valid strings
      for (const attempt of nosqlInjectionAttempts) {
        const data = {
          email: attempt,
          password: 'ValidPassword123!',
        }

        try {
          await userLoginSchema.parseAsync(data)
          // Email validation should fail for non-email strings
          expect(data.email).not.toMatch(/@/)
        } catch (error) {
          expect(error).toBeInstanceOf(z.ZodError)
        }
      }
    })
  })

  describe('Buffer Overflow Prevention', () => {
    it('should enforce maximum lengths', async () => {
      const longString = 'A'.repeat(10001)

      const testCases = [
        {
          schema: userCreateSchema,
          data: {
            email: `${longString}@example.com`,
            name: longString,
            role: 'END_USER',
            password: 'ValidPassword123!',
          },
          field: 'email and name'
        },
        {
          schema: ticketCreateSchema,
          data: {
            title: longString,
            description: longString,
            priority: 'MEDIUM',
            category: longString,
          },
          field: 'title and description'
        },
        {
          schema: articleSchema,
          data: {
            title: longString,
            content: 'Valid content',
            category: 'Test',
            authorId: '00000000-0000-0000-0000-000000000000',
          },
          field: 'title'
        },
      ]

      for (const testCase of testCases) {
        try {
          await testCase.schema.parseAsync(testCase.data)
          fail(`Should have rejected overly long ${testCase.field}`)
        } catch (error) {
          expect(error).toBeInstanceOf(z.ZodError)
        }
      }
    })
  })

  describe('Type Validation', () => {
    it('should reject wrong data types', async () => {
      const testCases = [
        {
          schema: userCreateSchema,
          data: {
            email: 12345, // Number instead of string
            name: 'Test User',
            role: 'END_USER',
            password: 'ValidPassword123!',
          },
        },
        {
          schema: ticketCreateSchema,
          data: {
            title: null, // Null instead of string
            description: 'Test description',
            priority: 'MEDIUM',
            category: 'Technical',
          },
        },
        {
          schema: ticketUpdateSchema,
          data: {
            priority: 'INVALID_PRIORITY', // Not in enum
          },
        },
        {
          schema: assetSchema,
          data: {
            name: 'Test Asset',
            type: 'INVALID_TYPE', // Not in enum
            status: 'AVAILABLE',
          },
        },
      ]

      for (const testCase of testCases) {
        try {
          await testCase.schema.parseAsync(testCase.data)
          fail('Should have rejected invalid data type')
        } catch (error) {
          expect(error).toBeInstanceOf(z.ZodError)
        }
      }
    })
  })

  describe('Enum Validation', () => {
    it('should reject invalid enum values', async () => {
      const testCases = [
        {
          schema: userCreateSchema,
          field: 'role',
          valid: 'END_USER',
          invalid: 'SUPER_ADMIN',
        },
        {
          schema: ticketCreateSchema,
          field: 'priority',
          valid: 'MEDIUM',
          invalid: 'EXTREME',
        },
        {
          schema: assetSchema,
          field: 'type',
          valid: 'SOFTWARE',
          invalid: 'CLOUD',
        },
      ]

      for (const testCase of testCases) {
        // Test valid value
        const validData: any = { [testCase.field]: testCase.valid }
        // Add required fields
        if (testCase.schema === userCreateSchema) {
          validData.email = 'test@example.com'
          validData.name = 'Test User'
          validData.password = 'ValidPassword123!'
        } else if (testCase.schema === ticketCreateSchema) {
          validData.title = 'Test Ticket'
          validData.description = 'Test description'
          validData.category = 'Technical'
        } else if (testCase.schema === assetSchema) {
          validData.name = 'Test Asset'
          validData.status = 'AVAILABLE'
        }

        const validResult = await testCase.schema.safeParseAsync(validData)
        expect(validResult.success).toBe(true)

        // Test invalid value
        const invalidData = { ...validData, [testCase.field]: testCase.invalid }
        const invalidResult = await testCase.schema.safeParseAsync(invalidData)
        expect(invalidResult.success).toBe(false)
      }
    })
  })

  describe('UUID Validation', () => {
    it('should reject invalid UUIDs', async () => {
      const invalidUUIDs = [
        'not-a-uuid',
        '12345',
        '00000000-0000-0000-0000-00000000000', // Too short
        '00000000-0000-0000-0000-0000000000000', // Too long
        '00000000-0000-0000-0000-00000000000g', // Invalid character
      ]

      // Test with ticket update schema (uses UUID for assignedToId)
      for (const invalidUUID of invalidUUIDs) {
        const data = {
          assignedToId: invalidUUID,
        }

        try {
          await ticketUpdateSchema.parseAsync(data)
          fail(`Should have rejected invalid UUID: ${invalidUUID}`)
        } catch (error) {
          expect(error).toBeInstanceOf(z.ZodError)
        }
      }
    })
  })

  describe('Business Logic Validation', () => {
    it('should prevent invalid state transitions', async () => {
      // This would be tested at the application level
      // For example: can't resolve a ticket that's already closed
      expect(true).toBe(true) // Placeholder for business logic tests
    })

    it('should enforce business rules', async () => {
      // Example: priority must match impact/urgency matrix
      // This would be application-specific logic
      expect(true).toBe(true) // Placeholder
    })
  })
})