import { NextRequest, NextResponse } from "next/server"
import { withAuth, authenticateRequest } from "@/lib/auth/middleware"
import { Role } from "@/lib/generated/prisma/enums"

/**
 * DEPRECATED: Use `withAuth` from '@/lib/auth/middleware' instead
 * This file is kept for backward compatibility during migration
 */

/**
 * Check API authentication (legacy function - use authenticateRequest instead)
 */
export async function checkApiAuth(request: Request | NextRequest) {
  console.warn('DEPRECATED: Use authenticateRequest from @/lib/auth/middleware instead')
  
  const nextRequest = request instanceof Request ? new NextRequest(request.url, request) : request
  const result = await authenticateRequest(nextRequest)
  
  if (!result.isAuthenticated) {
    return {
      isAuthorized: false,
      errorResponse: result.error,
      user: null,
      session: null,
    }
  }
  
  return {
    isAuthorized: true,
    errorResponse: null,
    user: result.user,
    session: result.session,
  }
}

/**
 * Check ticket access (legacy function - use checkResourceOwnership instead)
 */
export async function checkTicketAccess(userId: string, ticketId: string): Promise<boolean> {
  console.warn('DEPRECATED: Use checkResourceOwnership middleware instead')
  
  if (!userId || !ticketId) return false
  
  const { prisma } = await import('@/lib/prisma')
  
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: { userId: true }
  })
  
  if (!ticket) return false
  
  // User can access ticket if they created it OR if they're admin/agent
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true }
  })
  
  if (!user) return false
  
  return ticket.userId === userId || user.role === Role.ADMIN || user.role === Role.AGENT
}

/**
 * Legacy middleware wrapper - use withAuth instead
 */
export function withApiAuth(
  handler: (request: NextRequest, user: any, session: any) => Promise<NextResponse>,
  options: {
    requiredRoles?: Role[]
    requiredPermissions?: string[]
    requiredShortcut?: { resource: string; shortcut: string }
  } = {}
) {
  console.warn('DEPRECATED: Use withAuth from @/lib/auth/middleware instead')
  
  return async (request: NextRequest) => {
    const authOptions: any = {}
    
    if (options.requiredRoles) {
      authOptions.roles = options.requiredRoles
    }
    
    if (options.requiredPermissions) {
      authOptions.permissions = options.requiredPermissions
    }
    
    const authResult = await withAuth(authOptions)(request)
    
    if (authResult instanceof NextResponse) {
      return authResult
    }
    
    const { user, session } = authResult
    
    // Legacy shortcut check (if provided)
    if (options.requiredShortcut) {
      const { checkShortcut } = await import('@/lib/access')
      const hasShortcut = await checkShortcut(
        user!.id,
        options.requiredShortcut.resource,
        options.requiredShortcut.shortcut
      )
      
      if (!hasShortcut) {
        return NextResponse.json(
          {
            success: false,
            error: "Forbidden",
            message: `Required shortcut: ${options.requiredShortcut.resource}.${options.requiredShortcut.shortcut}`,
            timestamp: new Date().toISOString(),
          },
          { status: 403 }
        )
      }
    }
    
    return handler(request, user, session)
  }
}

/**
 * Legacy shortcut wrapper - use withAuth instead
 */
export function withShortcutAuth(
  handler: (request: NextRequest, user: any, session: any) => Promise<NextResponse>,
  resource: string,
  shortcut: string
) {
  console.warn('DEPRECATED: Use withAuth from @/lib/auth/middleware instead')
  return withApiAuth(handler, { requiredShortcut: { resource, shortcut } })
}

/**
 * Migration guide for updating API routes:
 * 
 * OLD:
 * ```typescript
 * import { checkApiAuth } from '@/lib/api-auth'
 * 
 * export async function GET(request: Request) {
 *   const authResult = await checkApiAuth(request)
 *   if (!authResult.isAuthorized) {
 *     return authResult.errorResponse!
 *   }
 *   // ... rest of function
 * }
 * ```
 * 
 * NEW:
 * ```typescript
 * import { withAuth } from '@/lib/auth/middleware'
 * 
 * export async function GET(request: NextRequest) {
 *   const authResult = await withAuth()(request)
 *   if (authResult instanceof NextResponse) {
 *     return authResult // Error response
 *   }
 *   const { user, session } = authResult
 *   // ... rest of function
 * }
 * ```
 * 
 * For role-based access:
 * ```typescript
 * const authResult = await withAuth({ roles: [Role.ADMIN, Role.AGENT] })(request)
 * ```
 * 
 * For permission-based access:
 * ```typescript
 * const authResult = await withAuth({ permissions: ['tickets.read'] })(request)
 * ```
 */