# Input Validation System

## Overview
This validation system uses Zod schemas to validate all incoming data in the ITSM application. It provides type-safe validation, automatic error handling, and consistent API responses.

## Installation
Zod is already installed as a dependency. The validation system is set up in:
- `lib/validation/schemas.ts` - Zod schemas for all data types
- `lib/validation/middleware.ts` - Validation middleware and utilities
- `lib/validation/README.md` - This documentation

## Available Schemas

### User Schemas
- `userSchema` - Basic user validation
- `userCreateSchema` - User creation with password
- `userUpdateSchema` - Partial user updates
- `userLoginSchema` - Login credentials

### Ticket Schemas
- `ticketSchema` - Complete ticket validation
- `ticketCreateSchema` - Ticket creation (status optional)
- `ticketUpdateSchema` - Partial ticket updates
- `ticketCommentSchema` - Ticket comments

### Other Schemas
- `assetSchema` - Asset management
- `articleSchema` - Knowledge base articles
- `reportSchema` - Report generation
- `automationRuleSchema` - Automation rules
- `slaSchema` - Service Level Agreements
- `searchSchema` - Search and filtering

## Usage Examples

### Basic Validation in API Routes

```typescript
import { validateRequest, validationErrorHandler } from '@/lib/validation/middleware'
import { ticketCreateSchema } from '@/lib/validation/schemas'

export async function POST(request: Request) {
  try {
    // Validate request body
    const validator = validateRequest(ticketCreateSchema)
    const validatedData = await validator(request)
    
    // Use validated data
    const ticket = await prisma.ticket.create({
      data: validatedData
    })
    
    return NextResponse.json(ticket)
  } catch (error) {
    return validationErrorHandler(error)
  }
}
```

### Query Parameter Validation

```typescript
import { validateQueryParams } from '@/lib/validation/middleware'
import { searchSchema } from '@/lib/validation/schemas'

export async function GET(request: Request) {
  try {
    const validatedParams = validateQueryParams(searchSchema)(request)
    
    // Use validated parameters
    const { page, limit, query } = validatedParams
    
    return NextResponse.json({ data: [] })
  } catch (error) {
    return validationErrorHandler(error)
  }
}
```

### Combined Validation

```typescript
import { withValidation } from '@/lib/validation/middleware'
import { ticketCreateSchema } from '@/lib/validation/schemas'

export async function POST(request: Request) {
  const validationResult = await withValidation(ticketCreateSchema, {
    validateBody: true,
    validateQuery: false,
  })(request)
  
  if (validationResult instanceof NextResponse) {
    return validationResult // Error response
  }
  
  const { body } = validationResult
  // Use validated body data
}
```

## Error Handling

### Validation Errors
When validation fails, the system returns a consistent error response:

```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "path": "email",
      "message": "Invalid email address"
    },
    {
      "path": "password",
      "message": "Password must be at least 8 characters"
    }
  ],
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### Custom Error Class
The `ValidationError` class provides structured error information:

```typescript
import { ValidationError } from '@/lib/validation/schemas'

try {
  // Validation logic
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Validation errors:', error.errors)
  }
}
```

## Best Practices

### 1. Always Validate Input
- Validate ALL incoming data
- Use schemas for both body and query parameters
- Don't trust client-side validation

### 2. Use Specific Schemas
- Create specific schemas for each operation
- Use `.extend()` to create variations
- Use `.partial()` for update operations

### 3. Provide Clear Error Messages
- Use descriptive error messages in schemas
- Include path information for nested errors
- Maintain consistent error format

### 4. Type Safety
- Use `z.infer<typeof schema>` for TypeScript types
- Export types from schemas for reuse
- Keep schemas and types in sync

### 5. Security Considerations
- Sanitize input where appropriate
- Set reasonable limits on string lengths
- Validate enum values against allowed values
- Use UUID validation for IDs

## Schema Design Guidelines

### 1. Start Strict
```typescript
// Good: Strict validation
const userSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

// Bad: Too permissive
const userSchema = z.object({
  email: z.string(),
  password: z.string(),
})
```

### 2. Use Appropriate Constraints
```typescript
const ticketSchema = z.object({
  title: z.string().min(5).max(200), // Reasonable limits
  description: z.string().min(10).max(5000),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  status: z.enum(['NEW', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']),
})
```

### 3. Handle Optional Fields
```typescript
const updateSchema = baseSchema.partial() // All fields optional
const createSchema = baseSchema.required() // All fields required
```

### 4. Add Transformations When Needed
```typescript
const emailSchema = z.string()
  .email()
  .transform(email => email.toLowerCase().trim())
```

## Testing Validation

### Unit Test Example
```typescript
import { ticketCreateSchema } from '@/lib/validation/schemas'

describe('Ticket Validation', () => {
  it('should validate correct ticket data', async () => {
    const validData = {
      title: 'Test Ticket',
      description: 'This is a test ticket',
      priority: 'MEDIUM',
      category: 'Technical',
    }
    
    const result = await ticketCreateSchema.safeParseAsync(validData)
    expect(result.success).toBe(true)
  })
  
  it('should reject invalid ticket data', async () => {
    const invalidData = {
      title: 'A', // Too short
      description: 'Short', // Too short
      priority: 'INVALID', // Not in enum
    }
    
    const result = await ticketCreateSchema.safeParseAsync(invalidData)
    expect(result.success).toBe(false)
  })
})
```

## Integration with Existing Code

### Migrating Existing Routes
1. Identify current validation logic
2. Replace with Zod schemas
3. Update error handling
4. Test thoroughly

### Example Migration
```typescript
// Before: Manual validation
if (!body.title || body.title.trim() === '') {
  return NextResponse.json({ error: 'Title required' }, { status: 400 })
}

// After: Zod validation
const validatedData = await ticketCreateSchema.parseAsync(body)
// Validation errors handled automatically
```

## Performance Considerations

- Zod is fast for most use cases
- Complex schemas with many validations may impact performance
- Consider caching compiled schemas for frequently used validations
- Use `.strip()` to remove unknown fields

## Security Notes

- Always validate before processing
- Never use validated data directly in database queries without additional sanitization
- Consider SQL injection protection at the ORM level
- Validate file uploads separately

## Next Steps

1. Implement validation for all API routes
2. Add validation to form submissions
3. Create comprehensive test suite
4. Monitor validation errors in production
5. Regularly update schemas as requirements change