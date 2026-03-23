import { prisma } from '@/lib/prisma'
import logger from './logger'

export interface CreateAuditLogParams {
  action: string
  entityType: string
  entityId?: string
  userId?: string
  details?: any
  ipAddress?: string
  userAgent?: string
}

/**
 * Create an audit log entry in the database and log via logger
 */
export async function createAuditLog(params: CreateAuditLogParams) {
  const { action, entityType, entityId, userId, details, ipAddress, userAgent } = params

  try {
    // Create audit log in database
    const auditLog = await prisma.auditLog.create({
      data: {
        action,
        entityType,
        entityId,
        userId,
        details: details ? JSON.stringify(details) : null,
        ipAddress,
        userAgent,
      },
    })

    // Also log via structured logger for consistency
    logger.audit(`Audit log created: ${action}`, {
      auditLogId: auditLog.id,
      action,
      entityType,
      entityId,
      userId,
      details,
      ipAddress,
      userAgent,
    })

    return auditLog
  } catch (error) {
    // Fallback to just logging if database fails
    logger.error('Failed to create audit log', {
      action,
      entityType,
      entityId,
      userId,
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  }
}

/**
 * Helper to create audit log from request context (e.g., in API routes)
 */
export async function createAuditLogFromRequest(
  request: Request,
  params: Omit<CreateAuditLogParams, 'ipAddress' | 'userAgent'>
) {
  const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                    request.headers.get('cf-connecting-ip') ||
                    'unknown'
  const userAgent = request.headers.get('user-agent') || 'unknown'

  return createAuditLog({
    ...params,
    ipAddress,
    userAgent,
  })
}