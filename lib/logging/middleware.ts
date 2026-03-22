import { NextRequest, NextResponse } from 'next/server'
import { logger, createRequestLogger, LogContext } from './logger'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

/**
 * Next.js middleware for request logging
 */
export async function loggingMiddleware(request: NextRequest) {
  const startTime = Date.now()
  const requestId = logger.generateRequestId()
  
  // Get user session for context
  let userContext: LogContext = {}
  try {
    const session = await getServerSession(authOptions)
    if (session?.user) {
      userContext = {
        userId: session.user.id,
        userEmail: session.user.email,
        userRole: session.user.role,
      }
    }
  } catch (error) {
    // Silently fail - session might not be available in middleware
  }
  
  // Create request logger
  const requestLogger = createRequestLogger(requestId, {
    ...userContext,
    path: request.nextUrl.pathname,
    method: request.method,
    ip: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown',
  })
  
  // Log request start
  requestLogger.info('Request started', {
    category: 'http',
    event: 'request_start',
    url: request.url,
    query: Object.fromEntries(request.nextUrl.searchParams.entries()),
  })
  
  // Store logger in request headers for API routes
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-request-id', requestId)
  
  // Create modified request
  const modifiedRequest = new NextRequest(request, {
    headers: requestHeaders,
  })
  
  // Add logger to request (for API routes that might need it)
  ;(modifiedRequest as any).log = requestLogger
  
  try {
    // Process request
    const response = await processRequest(modifiedRequest)
    const duration = Date.now() - startTime
    
    // Log request completion
    requestLogger.info('Request completed', {
      category: 'http',
      event: 'request_complete',
      statusCode: response.status,
      duration,
      responseSize: response.headers.get('content-length') || 'unknown',
    })
    
    // Add request ID to response headers
    response.headers.set('x-request-id', requestId)
    
    return response
  } catch (error) {
    const duration = Date.now() - startTime
    
    // Log request error
    requestLogger.errorWithStack('Request failed', error as Error, {
      category: 'http',
      event: 'request_error',
      duration,
    })
    
    // Return error response
    return NextResponse.json(
      {
        success: false,
        error: 'Internal Server Error',
        requestId,
        timestamp: new Date().toISOString(),
      },
      { 
        status: 500,
        headers: { 'x-request-id': requestId }
      }
    )
  }
}

/**
 * Process request with error handling
 */
async function processRequest(request: NextRequest): Promise<NextResponse> {
  // This would normally call the actual request handler
  // For middleware, we just pass through
  return NextResponse.next()
}

/**
 * API route wrapper for consistent logging
 */
export function withLogging(handler: Function) {
  return async (request: NextRequest, ...args: any[]) => {
    const startTime = Date.now()
    const requestId = request.headers.get('x-request-id') || logger.generateRequestId()
    
    // Get request logger or create new one
    let requestLogger = (request as any).log
    if (!requestLogger) {
      requestLogger = createRequestLogger(requestId, {
        path: request.nextUrl.pathname,
        method: request.method,
      })
    }
    
    try {
      // Add logger to request context
      const requestWithLogger = Object.assign(request, { log: requestLogger })
      
      // Execute handler
      const response = await handler(requestWithLogger, ...args)
      const duration = Date.now() - startTime
      
      // Log successful execution
      requestLogger.info('API handler executed', {
        category: 'api',
        event: 'handler_executed',
        duration,
        statusCode: response?.status || 200,
      })
      
      return response
    } catch (error) {
      const duration = Date.now() - startTime
      
      // Log handler error
      requestLogger.errorWithStack('API handler failed', error as Error, {
        category: 'api',
        event: 'handler_error',
        duration,
      })
      
      // Return error response
      return NextResponse.json(
        {
          success: false,
          error: 'Internal Server Error',
          requestId,
          timestamp: new Date().toISOString(),
        },
        { 
          status: 500,
          headers: { 'x-request-id': requestId }
        }
      )
    }
  }
}

/**
 * Helper to get logger from request
 */
export function getRequestLogger(request: NextRequest) {
  return (request as any).log || logger
}

/**
 * Correlation ID middleware for API routes
 */
export function withCorrelationId(handler: Function) {
  return async (request: NextRequest, ...args: any[]) => {
    const requestId = request.headers.get('x-request-id') || logger.generateRequestId()
    
    // Create or get request logger
    let requestLogger = (request as any).log
    if (!requestLogger) {
      requestLogger = createRequestLogger(requestId)
    }
    
    // Add correlation ID to request
    const headers = new Headers(request.headers)
    headers.set('x-correlation-id', requestId)
    
    const modifiedRequest = new NextRequest(request, { headers })
    ;(modifiedRequest as any).log = requestLogger
    
    // Execute handler with correlation ID
    const response = await handler(modifiedRequest, ...args)
    
    // Add correlation ID to response
    response.headers.set('x-correlation-id', requestId)
    
    return response
  }
}

/**
 * Performance monitoring middleware
 */
export function withPerformanceMonitoring(handler: Function, operationName: string) {
  return async (request: NextRequest, ...args: any[]) => {
    const startTime = Date.now()
    const requestLogger = getRequestLogger(request)
    
    try {
      const response = await handler(request, ...args)
      const duration = Date.now() - startTime
      
      // Log performance
      requestLogger.performance(`${operationName} completed`, {
        operation: operationName,
        duration,
        category: 'performance',
      })
      
      // Add performance header
      response.headers.set('x-operation-duration', duration.toString())
      
      return response
    } catch (error) {
      const duration = Date.now() - startTime
      
      // Log performance error
      requestLogger.performance(`${operationName} failed`, {
        operation: operationName,
        duration,
        error: error instanceof Error ? error.message : String(error),
        category: 'performance',
      })
      
      throw error
    }
  }
}

/**
 * Audit logging for sensitive operations
 */
export function auditLog(operation: string, details: any, request?: NextRequest) {
  const requestLogger = request ? getRequestLogger(request) : logger
  
  requestLogger.audit(`Audit: ${operation}`, {
    operation,
    details,
    category: 'audit',
    event: 'audit_log',
    timestamp: new Date().toISOString(),
  })
}

/**
 * Security event logging
 */
export function securityLog(event: string, details: any, request?: NextRequest) {
  const requestLogger = request ? getRequestLogger(request) : logger
  
  requestLogger.security(`Security: ${event}`, {
    event,
    details,
    category: 'security',
    severity: 'medium',
    timestamp: new Date().toISOString(),
  })
}