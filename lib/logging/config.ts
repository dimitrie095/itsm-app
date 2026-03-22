import { LogLevel } from './logger'

export interface LoggingConfig {
  // General settings
  level: LogLevel
  enabled: boolean
  timestampFormat: 'iso' | 'epoch' | 'local'
  
  // Output settings
  destination: 'console' | 'file' | 'both'
  filePath: string
  maxFileSize: number // in bytes
  maxFiles: number
  
  // Filtering
  excludePaths: string[]
  includeCategories: string[]
  
  // Performance settings
  slowRequestThreshold: number // in milliseconds
  logSlowRequests: boolean
  
  // Security settings
  logAuthAttempts: boolean
  logSecurityEvents: boolean
  maskSensitiveData: boolean
  
  // Business logging
  logBusinessEvents: boolean
  businessEvents: string[]
  
  // Audit logging
  auditLogEnabled: boolean
  auditEvents: string[]
  
  // Correlation
  enableCorrelationIds: boolean
  correlationIdHeader: string
}

// Default configuration
export const defaultConfig: LoggingConfig = {
  // General settings
  level: (process.env.LOG_LEVEL as LogLevel) || 'info',
  enabled: process.env.NODE_ENV !== 'test',
  timestampFormat: 'iso',
  
  // Output settings
  destination: process.env.NODE_ENV === 'production' ? 'both' : 'console',
  filePath: process.env.LOG_FILE_PATH || './logs/app.log',
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxFiles: 10,
  
  // Filtering
  excludePaths: [
    '/_next/static',
    '/_next/image',
    '/favicon.ico',
    '/health',
    '/metrics',
  ],
  includeCategories: [
    'http',
    'error',
    'security',
    'audit',
    'performance',
    'business',
    'database',
    'auth',
  ],
  
  // Performance settings
  slowRequestThreshold: 1000, // 1 second
  logSlowRequests: true,
  
  // Security settings
  logAuthAttempts: true,
  logSecurityEvents: true,
  maskSensitiveData: true,
  
  // Business logging
  logBusinessEvents: true,
  businessEvents: [
    'ticket_created',
    'ticket_updated',
    'ticket_resolved',
    'user_created',
    'user_updated',
    'asset_assigned',
    'article_published',
  ],
  
  // Audit logging
  auditLogEnabled: true,
  auditEvents: [
    'user_login',
    'user_logout',
    'permission_change',
    'role_change',
    'data_export',
    'config_change',
  ],
  
  // Correlation
  enableCorrelationIds: true,
  correlationIdHeader: 'x-request-id',
}

// Environment-specific configurations
export const configByEnvironment: Record<string, Partial<LoggingConfig>> = {
  development: {
    level: 'debug',
    destination: 'console',
    logSlowRequests: true,
  },
  production: {
    level: 'info',
    destination: 'both',
    logSlowRequests: true,
    auditLogEnabled: true,
    maskSensitiveData: true,
  },
  test: {
    enabled: false,
    level: 'error',
  },
}

// Get current configuration
export function getConfig(): LoggingConfig {
  const env = process.env.NODE_ENV || 'development'
  const envConfig = configByEnvironment[env] || {}
  
  return {
    ...defaultConfig,
    ...envConfig,
  }
}

// Helper functions
export function shouldLogPath(path: string): boolean {
  const config = getConfig()
  return !config.excludePaths.some(excluded => path.startsWith(excluded))
}

export function shouldLogCategory(category: string): boolean {
  const config = getConfig()
  return config.includeCategories.includes(category)
}

export function isSlowRequest(duration: number): boolean {
  const config = getConfig()
  return duration > config.slowRequestThreshold
}

export function maskSensitiveData(data: any): any {
  const config = getConfig()
  if (!config.maskSensitiveData) {
    return data
  }
  
  const sensitiveFields = [
    'password',
    'token',
    'secret',
    'key',
    'authorization',
    'cookie',
    'creditCard',
    'ssn',
    'phone',
    'email', // Sometimes you might want to mask emails too
  ]
  
  const maskValue = (value: any): any => {
    if (typeof value === 'string' && value.length > 0) {
      return '***MASKED***'
    }
    return value
  }
  
  const maskObject = (obj: any): any => {
    if (!obj || typeof obj !== 'object') {
      return obj
    }
    
    if (Array.isArray(obj)) {
      return obj.map(maskObject)
    }
    
    const masked: any = {}
    for (const [key, value] of Object.entries(obj)) {
      if (sensitiveFields.some(field => 
        key.toLowerCase().includes(field.toLowerCase())
      )) {
        masked[key] = maskValue(value)
      } else if (typeof value === 'object' && value !== null) {
        masked[key] = maskObject(value)
      } else {
        masked[key] = value
      }
    }
    
    return masked
  }
  
  return maskObject(data)
}

// Log rotation configuration
export interface LogRotationConfig {
  enabled: boolean
  schedule: 'daily' | 'weekly' | 'monthly' | 'size'
  maxSize: number
  maxFiles: number
  compress: boolean
  datePattern: string
}

export const logRotationConfig: LogRotationConfig = {
  enabled: process.env.NODE_ENV === 'production',
  schedule: 'daily',
  maxSize: 10 * 1024 * 1024, // 10MB
  maxFiles: 30, // Keep 30 days of logs
  compress: true,
  datePattern: 'YYYY-MM-DD',
}

// Export configuration utilities
export default {
  getConfig,
  shouldLogPath,
  shouldLogCategory,
  isSlowRequest,
  maskSensitiveData,
  defaultConfig,
  configByEnvironment,
  logRotationConfig,
}