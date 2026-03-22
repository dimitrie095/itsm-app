import pino from 'pino'
import { randomUUID } from 'crypto'

// Log levels
export type LogLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace'

// Log context interface
export interface LogContext {
  requestId?: string
  userId?: string
  userEmail?: string
  userRole?: string
  path?: string
  method?: string
  ip?: string
  userAgent?: string
  duration?: number
  [key: string]: any
}

// Application logger class
class ApplicationLogger {
  private logger: pino.Logger
  private requestId: string = ''

  constructor() {
    this.logger = pino({
      level: process.env.LOG_LEVEL || 'info',
      timestamp: pino.stdTimeFunctions.isoTime,
      formatters: {
        level: (label) => ({ level: label }),
        bindings: (bindings) => ({ pid: bindings.pid, hostname: bindings.hostname }),
      },
      serializers: {
        error: pino.stdSerializers.err,
        req: pino.stdSerializers.req,
        res: pino.stdSerializers.res,
      },
      transport: process.env.NODE_ENV === 'development' ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        }
      } : undefined,
    })
  }

  // Set request ID for correlation
  setRequestId(requestId: string) {
    this.requestId = requestId
  }

  // Generate new request ID
  generateRequestId(): string {
    return randomUUID()
  }

  // Base log method
  private log(level: LogLevel, message: string, context: LogContext = {}) {
    const logData: any = {
      msg: message,
      ...context,
    }

    // Add request ID if available
    if (this.requestId) {
      logData.requestId = this.requestId
    }

    // Add timestamp if not already present
    if (!logData.timestamp) {
      logData.timestamp = new Date().toISOString()
    }

    this.logger[level](logData)
  }

  // Public logging methods
  fatal(message: string, context: LogContext = {}) {
    this.log('fatal', message, context)
  }

  error(message: string, context: LogContext = {}) {
    this.log('error', message, context)
  }

  warn(message: string, context: LogContext = {}) {
    this.log('warn', message, context)
  }

  info(message: string, context: LogContext = {}) {
    this.log('info', message, context)
  }

  debug(message: string, context: LogContext = {}) {
    this.log('debug', message, context)
  }

  trace(message: string, context: LogContext = {}) {
    this.log('trace', message, context)
  }

  // Specialized logging methods
  security(message: string, context: LogContext = {}) {
    this.log('warn', message, { ...context, category: 'security' })
  }

  audit(message: string, context: LogContext = {}) {
    this.log('info', message, { ...context, category: 'audit' })
  }

  performance(message: string, context: LogContext = {}) {
    this.log('info', message, { ...context, category: 'performance' })
  }

  business(message: string, context: LogContext = {}) {
    this.log('info', message, { ...context, category: 'business' })
  }

  // HTTP request logging
  httpRequest(request: any, response: any, duration: number, context: LogContext = {}) {
    this.log('info', 'HTTP request completed', {
      ...context,
      category: 'http',
      method: request.method,
      path: request.url,
      statusCode: response.statusCode,
      duration,
      userAgent: request.headers['user-agent'],
      ip: request.ip || request.headers['x-forwarded-for'] || request.connection.remoteAddress,
    })
  }

  // Error logging with stack trace
  errorWithStack(message: string, error: Error, context: LogContext = {}) {
    this.log('error', message, {
      ...context,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
    })
  }

  // Database query logging
  dbQuery(query: string, duration: number, context: LogContext = {}) {
    this.log('debug', 'Database query executed', {
      ...context,
      category: 'database',
      query,
      duration,
    })
  }

  // Authentication logging
  authSuccess(userId: string, method: string, context: LogContext = {}) {
    this.log('info', 'Authentication successful', {
      ...context,
      category: 'auth',
      userId,
      method,
      event: 'auth_success',
    })
  }

  authFailure(userId: string, method: string, reason: string, context: LogContext = {}) {
    this.log('warn', 'Authentication failed', {
      ...context,
      category: 'auth',
      userId,
      method,
      reason,
      event: 'auth_failure',
    })
  }

  // Authorization logging
  authorizationSuccess(userId: string, resource: string, action: string, context: LogContext = {}) {
    this.log('debug', 'Authorization successful', {
      ...context,
      category: 'auth',
      userId,
      resource,
      action,
      event: 'authz_success',
    })
  }

  authorizationFailure(userId: string, resource: string, action: string, context: LogContext = {}) {
    this.log('warn', 'Authorization failed', {
      ...context,
      category: 'auth',
      userId,
      resource,
      action,
      event: 'authz_failure',
    })
  }

  // Business event logging
  ticketCreated(ticketId: string, userId: string, context: LogContext = {}) {
    this.log('info', 'Ticket created', {
      ...context,
      category: 'business',
      ticketId,
      userId,
      event: 'ticket_created',
    })
  }

  ticketUpdated(ticketId: string, userId: string, changes: any, context: LogContext = {}) {
    this.log('info', 'Ticket updated', {
      ...context,
      category: 'business',
      ticketId,
      userId,
      changes,
      event: 'ticket_updated',
    })
  }

  // System health logging
  systemHealth(metric: string, value: any, context: LogContext = {}) {
    this.log('info', 'System health metric', {
      ...context,
      category: 'system',
      metric,
      value,
      event: 'system_health',
    })
  }

  // Create child logger with additional context
  child(context: LogContext): ApplicationLogger {
    const childLogger = new ApplicationLogger()
    childLogger.logger = this.logger.child(context)
    childLogger.requestId = this.requestId
    return childLogger
  }

  // Flush logs (for pino destinations that need flushing)
  async flush(): Promise<void> {
    if (this.logger.flush) {
      await this.logger.flush()
    }
  }
}

// Singleton instance
export const logger = new ApplicationLogger()

// Helper function to create request-aware logger
export function createRequestLogger(requestId: string, baseContext: LogContext = {}) {
  const requestLogger = logger.child({ requestId, ...baseContext })
  requestLogger.setRequestId(requestId)
  return requestLogger
}

// Middleware for Express/Next.js
export function loggingMiddleware(req: any, res: any, next: Function) {
  const requestId = randomUUID()
  const startTime = Date.now()

  // Create request-specific logger
  const requestLogger = createRequestLogger(requestId, {
    path: req.url,
    method: req.method,
    ip: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
    userAgent: req.headers['user-agent'],
  })

  // Attach logger to request
  req.log = requestLogger
  req.requestId = requestId

  // Log request start
  requestLogger.info('HTTP request started', {
    category: 'http',
    event: 'request_start',
  })

  // Hook into response finish to log completion
  const originalEnd = res.end
  res.end = function(chunk: any, encoding: any) {
    const duration = Date.now() - startTime
    
    requestLogger.httpRequest(req, res, duration, {
      event: 'request_complete',
    })

    res.end = originalEnd
    res.end(chunk, encoding)
  }

  next()
}

// Export types
export type { ApplicationLogger }
export default logger