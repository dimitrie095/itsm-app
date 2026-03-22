# Comprehensive Logging System

## Overview
A structured, production-ready logging system for the ITSM application using Pino. Provides consistent logging across all components with correlation IDs, performance monitoring, and security event tracking.

## Features

### Core Features
- ✅ Structured JSON logging
- ✅ Correlation IDs for request tracing
- ✅ Multiple log levels (fatal, error, warn, info, debug, trace)
- ✅ Category-based filtering (http, security, audit, performance, etc.)
- ✅ Sensitive data masking
- ✅ Request/response logging
- ✅ Performance monitoring

### Advanced Features
- ✅ Audit logging for compliance
- ✅ Security event logging
- ✅ Business event logging
- ✅ Database query logging
- ✅ Authentication/authorization logging
- ✅ Error tracking with stack traces
- ✅ Log rotation (production)

## Installation

Dependencies are already installed:
```bash
npm install pino pino-pretty
```

## Quick Start

### Basic Usage
```typescript
import { logger } from '@/lib/logging/logger'

// Simple logging
logger.info('Application started')
logger.error('Something went wrong', { userId: '123', action: 'login' })

// Specialized logging
logger.security('Failed login attempt', { ip: '192.168.1.1' })
logger.audit('User permission changed', { adminId: '456', targetUserId: '123' })
```

### Request Logging in API Routes
```typescript
import { withLogging, getRequestLogger } from '@/lib/logging/middleware'

export const GET = withLogging(async (request: NextRequest) => {
  const logger = getRequestLogger(request)
  
  logger.info('Processing request', { 
    category: 'api',
    userId: '123' 
  })
  
  // Your logic here
  
  return NextResponse.json({ success: true })
})
```

### Performance Monitoring
```typescript
import { withPerformanceMonitoring } from '@/lib/logging/middleware'

export const GET = withPerformanceMonitoring(
  async (request: NextRequest) => {
    // Your logic here
    return NextResponse.json({ data: [] })
  },
  'fetch_tickets' // Operation name for logging
)
```

## Configuration

### Environment Variables
```bash
# Log level (fatal, error, warn, info, debug, trace)
LOG_LEVEL=info

# Log destination (console, file, both)
LOG_DESTINATION=console

# Log file path
LOG_FILE_PATH=./logs/app.log

# Node environment
NODE_ENV=development
```

### Programmatic Configuration
```typescript
import { getConfig } from '@/lib/logging/config'

const config = getConfig()
console.log('Current log level:', config.level)
```

## Log Categories

### HTTP Logging
- Request/response details
- Performance metrics
- Error tracking

### Security Logging
- Authentication attempts
- Authorization failures
- Suspicious activities
- Security events

### Audit Logging
- User actions
- Permission changes
- Data modifications
- Compliance events

### Business Logging
- Ticket creation/updates
- User activities
- Asset assignments
- Knowledge base changes

### Performance Logging
- Slow requests
- Database query times
- External API calls
- Memory/CPU usage

### System Logging
- Application startup/shutdown
- Health checks
- Configuration changes
- Dependency status

## Correlation IDs

### Automatic Correlation
Each request gets a unique correlation ID:
- Added to request headers as `x-request-id`
- Included in all log entries for that request
- Returned in response headers
- Used for tracing across microservices

### Manual Correlation
```typescript
import { createRequestLogger } from '@/lib/logging/logger'

const requestLogger = createRequestLogger('custom-request-id', {
  userId: '123',
  operation: 'batch_process'
})

requestLogger.info('Starting batch process')
```

## Sensitive Data Masking

### Automatic Masking
The system automatically masks sensitive fields:
- Passwords, tokens, secrets
- API keys, authorization headers
- Personal identifiable information (PII)

### Configuration
```typescript
// In config.ts
maskSensitiveData: true

// Sensitive fields are defined in the config
sensitiveFields: [
  'password', 'token', 'secret', 'key',
  'authorization', 'cookie', 'creditCard',
  'ssn', 'phone', 'email'
]
```

## Error Handling

### Structured Error Logging
```typescript
try {
  // Risky operation
} catch (error) {
  logger.errorWithStack('Operation failed', error, {
    operation: 'process_payment',
    userId: '123'
  })
  
  // Error is logged with full stack trace and context
}
```

### Error Response Format
```json
{
  "success": false,
  "error": "Internal Server Error",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## Performance Monitoring

### Slow Request Detection
```typescript
// Configurable threshold (default: 1000ms)
slowRequestThreshold: 1000

// Automatic logging of slow requests
logger.performance('Slow request detected', {
  path: '/api/tickets',
  duration: 1500,
  threshold: 1000
})
```

### Custom Performance Metrics
```typescript
logger.performance('Database query slow', {
  query: 'SELECT * FROM tickets',
  duration: 250,
  threshold: 100
})
```

## Audit Trail

### Compliance Requirements
- GDPR, HIPAA, SOC2 compliance
- User action tracking
- Data access logging
- Change history

### Audit Events
```typescript
logger.audit('User permission modified', {
  adminId: '456',
  targetUserId: '123',
  oldPermissions: ['read'],
  newPermissions: ['read', 'write'],
  timestamp: new Date().toISOString()
})
```

## Integration

### Next.js Middleware
```typescript
// middleware.ts
import { loggingMiddleware } from '@/lib/logging/middleware'

export async function middleware(request: NextRequest) {
  return loggingMiddleware(request)
}
```

### API Routes
```typescript
// app/api/tickets/route.ts
import { withLogging } from '@/lib/logging/middleware'

export const GET = withLogging(async (request: NextRequest) => {
  // Your handler logic
})
```

### Server Components
```typescript
// app/page.tsx
import { logger } from '@/lib/logging/logger'

export default async function HomePage() {
  logger.info('Rendering home page', { 
    category: 'rendering',
    component: 'HomePage' 
  })
  
  // Component logic
}
```

## Production Considerations

### Log Rotation
- Automatic log rotation based on size or time
- Configurable retention period
- Compression of old logs
- Separate error logs

### Monitoring and Alerting
- Integration with monitoring tools (Datadog, New Relic)
- Alerting on error rates
- Performance anomaly detection
- Security event alerts

### Storage and Retention
- Centralized log aggregation
- Compliance retention periods
- Backup and archiving
- Access controls

## Testing

### Unit Testing
```typescript
import { logger } from '@/lib/logging/logger'

describe('Logging', () => {
  beforeEach(() => {
    // Mock logger or set test configuration
  })
  
  it('should log errors correctly', () => {
    const error = new Error('Test error')
    logger.errorWithStack('Test', error, { test: true })
    // Verify log output
  })
})
```

### Integration Testing
- Test correlation ID propagation
- Test sensitive data masking
- Test performance logging
- Test audit trail completeness

## Best Practices

### 1. Use Appropriate Log Levels
- `fatal`: Application cannot continue
- `error`: Operation failed but application continues
- `warn`: Unexpected but recoverable situation
- `info`: Normal operational events
- `debug`: Detailed information for debugging
- `trace`: Very detailed tracing

### 2. Include Context
```typescript
// Good
logger.info('User logged in', { 
  userId: '123', 
  method: 'oauth',
  ip: '192.168.1.1'
})

// Bad
logger.info('User logged in')
```

### 3. Don't Log Sensitive Data
- Use automatic masking
- Be careful with PII
- Review logs regularly
- Implement access controls

### 4. Use Correlation IDs
- Always include request ID
- Propagate across services
- Use for troubleshooting
- Include in error reports

### 5. Monitor Log Volume
- Avoid verbose logging in production
- Use sampling for high-volume operations
- Implement log level controls
- Monitor storage usage

## Troubleshooting

### Common Issues

1. **No logs appearing**
   - Check LOG_LEVEL environment variable
   - Verify logger configuration
   - Check NODE_ENV setting

2. **Missing correlation IDs**
   - Ensure middleware is configured
   - Check request header propagation
   - Verify response headers

3. **Performance issues**
   - Review log volume
   - Check destination (file vs console)
   - Consider async logging

4. **Sensitive data exposure**
   - Verify masking configuration
   - Review log output
   - Update sensitive fields list

### Debug Mode
```bash
# Set debug logging
LOG_LEVEL=debug
NODE_ENV=development

# Check configuration
console.log(getConfig())
```

## Support

For logging issues:
1. Check environment variables
2. Review configuration
3. Test with different log levels
4. Check file permissions (for file logging)
5. Review middleware setup

## Next Steps

1. **Implement log aggregation** (ELK stack, Datadog)
2. **Add alerting** for critical errors
3. **Create dashboards** for monitoring
4. **Implement log retention policies**
5. **Add log analysis** for business insights