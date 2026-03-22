# Standardized Authentication System

## Overview
This system provides a consistent, secure authentication approach using NextAuth.js throughout the ITSM application. It replaces mixed authentication strategies with a single, standardized middleware.

## Architecture

### Core Components
1. **NextAuth Configuration** (`lib/auth.ts`) - Main NextAuth setup
2. **Authentication Middleware** (`lib/auth/middleware.ts`) - Standardized auth utilities
3. **Migration Layer** (`lib/api-auth-new.ts`) - Backward compatibility

### Key Features
- Role-based access control (RBAC)
- Permission-based access control
- Resource ownership validation
- Consistent error responses
- Type-safe authentication

## Quick Start

### Basic Authentication
```typescript
import { withAuth } from '@/lib/auth/middleware'

export async function GET(request: NextRequest) {
  const authResult = await withAuth()(request)
  
  if (authResult instanceof NextResponse) {
    return authResult // Error response
  }
  
  const { user, session } = authResult
  // User is authenticated
}
```

### Role-Based Access
```typescript
import { withAuth } from '@/lib/auth/middleware'
import { Role } from '@/lib/generated/prisma/enums'

const authResult = await withAuth({ 
  roles: [Role.ADMIN, Role.AGENT] 
})(request)
```

### Permission-Based Access
```typescript
const authResult = await withAuth({ 
  permissions: ['tickets.create', 'tickets.edit'] 
})(request)
```

### Resource Ownership
```typescript
const authResult = await withAuth({ 
  resourceType: 'ticket' 
})(request)
// END_USER can only access their own tickets
```

## Migration Guide

### From Legacy `checkApiAuth`

**OLD:**
```typescript
import { checkApiAuth } from '@/lib/api-auth'

export async function GET(request: Request) {
  const authResult = await checkApiAuth(request)
  if (!authResult.isAuthorized) {
    return authResult.errorResponse!
  }
  const { user } = authResult
  // ... rest of function
}
```

**NEW:**
```typescript
import { withAuth } from '@/lib/auth/middleware'

export async function GET(request: NextRequest) {
  const authResult = await withAuth()(request)
  if (authResult instanceof NextResponse) {
    return authResult
  }
  const { user, session } = authResult
  // ... rest of function
}
```

### From Legacy `withApiAuth`

**OLD:**
```typescript
import { withApiAuth } from '@/lib/api-auth'

const handler = withApiAuth(
  async (request, user, session) => {
    // Handler logic
  },
  { requiredRoles: [Role.ADMIN] }
)
```

**NEW:**
```typescript
import { withAuth } from '@/lib/auth/middleware'

export async function GET(request: NextRequest) {
  const authResult = await withAuth({ roles: [Role.ADMIN] })(request)
  if (authResult instanceof NextResponse) {
    return authResult
  }
  const { user, session } = authResult
  // Handler logic
}
```

## API Reference

### `authenticateRequest(request: NextRequest)`
Basic authentication check. Returns:
- `isAuthenticated`: boolean
- `error`: NextResponse or null
- `user`: Authenticated user or null
- `session`: Full session or null

### `withAuth(options)`
Combined middleware with options:
- `roles?: Role[]` - Required user roles
- `permissions?: string[]` - Required permissions
- `resourceType?: 'ticket' | 'asset' | 'article' | 'user'` - Resource ownership check

### `requireRole(roles: Role[])`
Middleware that requires specific roles.

### `requirePermission(permission: string)`
Middleware that requires specific permission.

### `checkResourceOwnership(resourceType, resourceIdParam?)`
Middleware that checks if END_USER owns the resource.

### `getAuthenticatedUser()`
Server component helper to get current user.

### `checkUserPermission(userId, permission)`
Server component helper to check permissions.

## Error Responses

All authentication errors return consistent JSON responses:

### 401 Unauthorized
```json
{
  "success": false,
  "error": "Unauthorized",
  "message": "Authentication required",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### 403 Forbidden (Role)
```json
{
  "success": false,
  "error": "Forbidden",
  "message": "Insufficient permissions. Required roles: ADMIN, AGENT",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### 403 Forbidden (Permission)
```json
{
  "success": false,
  "error": "Forbidden",
  "message": "Required permission: tickets.create",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### 403 Forbidden (Ownership)
```json
{
  "success": false,
  "error": "Forbidden",
  "message": "You can only access your own resources",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## User Session Structure

Authenticated sessions include:
```typescript
interface AuthSession {
  user: {
    id: string
    email: string
    name?: string | null
    role: Role
    department?: string | null
    permissions: string[] // All user permissions
  }
}
```

## Permission System Integration

The authentication system integrates with the existing permission system:
- Permissions are loaded from the database during authentication
- Cached in the JWT token for performance
- Automatically included in all authenticated requests

## Best Practices

### 1. Always Use `withAuth`
- Use `withAuth` for all API routes
- Specify required roles/permissions explicitly
- Don't rely on client-side checks

### 2. Principle of Least Privilege
- Grant minimum required permissions
- Use role-based checks for broad access
- Use permission-based checks for specific actions

### 3. Resource Ownership
- Always check ownership for user-modifiable resources
- Use `resourceType` option for common patterns
- Implement custom checks for complex scenarios

### 4. Error Handling
- Let middleware handle authentication errors
- Provide clear error messages
- Log authentication failures for security monitoring

### 5. Performance
- JWT tokens include permissions to reduce database queries
- Session strategy is JWT-based for scalability
- Consider caching for frequent permission checks

## Security Considerations

### 1. Token Security
- JWT tokens are HTTP-only and secure
- Session timeout is configured in NextAuth
- Token rotation is handled automatically

### 2. Permission Validation
- Permissions are validated server-side only
- Never trust client-side permission claims
- Regular permission audits recommended

### 3. Rate Limiting
- Implement rate limiting on authentication endpoints
- Monitor failed authentication attempts
- Consider IP-based blocking for brute force attacks

### 4. Logging and Monitoring
- Log all authentication attempts (success/failure)
- Monitor for unusual authentication patterns
- Alert on multiple failed attempts

## Testing

### Unit Tests
```typescript
import { withAuth } from '@/lib/auth/middleware'
import { Role } from '@/lib/generated/prisma/enums'

describe('Authentication Middleware', () => {
  it('should allow authenticated users', async () => {
    // Mock authenticated request
    const request = createMockRequest({ user: mockUser })
    const result = await withAuth()(request)
    expect(result).not.toBeInstanceOf(NextResponse)
  })
  
  it('should reject unauthenticated users', async () => {
    // Mock unauthenticated request
    const request = createMockRequest()
    const result = await withAuth()(request)
    expect(result).toBeInstanceOf(NextResponse)
    expect(result.status).toBe(401)
  })
})
```

### Integration Tests
- Test role-based access control
- Test permission-based access control
- Test resource ownership checks
- Test error responses

## Migration Status

### Completed
- ✅ Authentication middleware created
- ✅ Role-based access control
- ✅ Permission-based access control
- ✅ Resource ownership checks
- ✅ Error response standardization
- ✅ Backward compatibility layer

### In Progress
- ⏳ Update all API routes to use new system
- ⏳ Update server components
- ⏳ Remove legacy authentication code

### Pending
- 🔲 Comprehensive testing
- 🔲 Performance optimization
- 🔲 Security audit

## Support

For issues or questions:
1. Check the error logs for authentication failures
2. Verify user permissions in the database
3. Review NextAuth configuration
4. Contact security team for access issues