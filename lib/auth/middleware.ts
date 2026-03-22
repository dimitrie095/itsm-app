import { getServerSession } from "next-auth"
import { NextRequest, NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { Role } from "@/lib/generated/prisma/enums"

// Extended session type
interface AuthSession {
  user: {
    id: string
    email: string
    name?: string | null
    role: Role
    department?: string | null
    permissions: string[]
  }
}

/**
 * Standardized authentication middleware for API routes
 * Replaces the mixed auth strategies with a single, consistent approach
 */
export async function authenticateRequest(request: NextRequest) {
  try {
    // Get session using NextAuth
    const session = await getServerSession(authOptions) as AuthSession | null
    
    if (!session || !session.user) {
      return {
        isAuthenticated: false,
        error: NextResponse.json(
          {
            success: false,
            error: "Unauthorized",
            message: "Authentication required",
            timestamp: new Date().toISOString(),
          },
          { status: 401 }
        ),
        user: null,
        session: null,
      }
    }
    
    return {
      isAuthenticated: true,
      error: null,
      user: session.user,
      session,
    }
  } catch (error) {
    console.error("Authentication error:", error)
    
    return {
      isAuthenticated: false,
      error: NextResponse.json(
        {
          success: false,
          error: "Authentication failed",
          message: error instanceof Error ? error.message : "Unknown authentication error",
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      ),
      user: null,
      session: null,
    }
  }
}

/**
 * Middleware for role-based access control
 */
export function requireRole(allowedRoles: Role[]) {
  return async (request: NextRequest) => {
    const authResult = await authenticateRequest(request)
    
    if (!authResult.isAuthenticated) {
      return authResult.error!
    }
    
    const { user } = authResult
    
    if (!allowedRoles.includes(user!.role)) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden",
          message: `Insufficient permissions. Required roles: ${allowedRoles.join(", ")}`,
          timestamp: new Date().toISOString(),
        },
        { status: 403 }
      )
    }
    
    return { user, session: authResult.session }
  }
}

/**
 * Middleware for permission-based access control
 */
export function requirePermission(requiredPermission: string) {
  return async (request: NextRequest) => {
    const authResult = await authenticateRequest(request)
    
    if (!authResult.isAuthenticated) {
      return authResult.error!
    }
    
    const { user } = authResult
    
    if (!user!.permissions.includes(requiredPermission)) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden",
          message: `Required permission: ${requiredPermission}`,
          timestamp: new Date().toISOString(),
        },
        { status: 403 }
      )
    }
    
    return { user, session: authResult.session }
  }
}

/**
 * Middleware for resource ownership checks
 * END_USER can only access their own resources
 */
export function checkResourceOwnership(
  resourceType: 'ticket' | 'asset' | 'article' | 'user',
  resourceIdParam: string = 'id'
) {
  return async (request: NextRequest) => {
    const authResult = await authenticateRequest(request)
    
    if (!authResult.isAuthenticated) {
      return authResult.error!
    }
    
    const { user } = authResult
    
    // Admin and Agent can access all resources
    if (user!.role === Role.ADMIN || user!.role === Role.AGENT) {
      return { user, session: authResult.session }
    }
    
    // END_USER needs ownership check
    if (user!.role === Role.END_USER) {
      try {
        // Extract resource ID from URL
        const url = new URL(request.url)
        const pathSegments = url.pathname.split('/')
        const resourceId = pathSegments[pathSegments.indexOf(resourceType + 's') + 1] || 
                          url.searchParams.get(resourceIdParam)
        
        if (!resourceId) {
          return NextResponse.json(
            {
              success: false,
              error: "Bad Request",
              message: "Resource ID is required",
              timestamp: new Date().toISOString(),
            },
            { status: 400 }
          )
        }
        
        // Check ownership based on resource type
        let isOwner = false
        
        switch (resourceType) {
          case 'ticket':
            const ticket = await prisma.ticket.findUnique({
              where: { id: resourceId },
              select: { userId: true }
            })
            isOwner = ticket?.userId === user!.id
            break
            
          case 'asset':
            const asset = await prisma.asset.findUnique({
              where: { id: resourceId },
              select: { userId: true }
            })
            isOwner = asset?.userId === user!.id
            break
            
          case 'article':
            const article = await prisma.knowledgeBaseArticle.findUnique({
              where: { id: resourceId },
              select: { authorId: true }
            })
            isOwner = article?.authorId === user!.id
            break
            
          case 'user':
            isOwner = resourceId === user!.id
            break
        }
        
        if (!isOwner) {
          return NextResponse.json(
            {
              success: false,
              error: "Forbidden",
              message: "You can only access your own resources",
              timestamp: new Date().toISOString(),
            },
            { status: 403 }
          )
        }
      } catch (error) {
        console.error("Resource ownership check error:", error)
        return NextResponse.json(
          {
            success: false,
            error: "Internal Server Error",
            message: "Failed to verify resource ownership",
            timestamp: new Date().toISOString(),
          },
          { status: 500 }
        )
      }
    }
    
    return { user, session: authResult.session }
  }
}

/**
 * Combined middleware for common patterns
 */
export function withAuth(
  options: {
    roles?: Role[]
    permissions?: string[]
    resourceType?: 'ticket' | 'asset' | 'article' | 'user'
  } = {}
) {
  return async (request: NextRequest) => {
    // First, authenticate
    const authResult = await authenticateRequest(request)
    if (!authResult.isAuthenticated) {
      return authResult.error!
    }
    
    const { user } = authResult
    
    // Check roles if specified
    if (options.roles && options.roles.length > 0) {
      if (!options.roles.includes(user.role)) {
        return NextResponse.json(
          {
            success: false,
            error: "Forbidden",
            message: `Required roles: ${options.roles.join(", ")}`,
            timestamp: new Date().toISOString(),
          },
          { status: 403 }
        )
      }
    }
    
    // Check permissions if specified
    if (options.permissions && options.permissions.length > 0) {
      const hasPermission = options.permissions.some(permission => 
        user.permissions.includes(permission)
      )
      
      if (!hasPermission) {
        return NextResponse.json(
          {
            success: false,
            error: "Forbidden",
            message: `Required permissions: ${options.permissions.join(", ")}`,
            timestamp: new Date().toISOString(),
          },
          { status: 403 }
        )
      }
    }
    
    // Check resource ownership if specified
    if (options.resourceType && user.role === Role.END_USER) {
      const ownershipCheck = await checkResourceOwnership(options.resourceType)(request)
      if (ownershipCheck instanceof NextResponse) {
        return ownershipCheck
      }
    }
    
    return { user, session: authResult.session }
  }
}

/**
 * Helper function to get authenticated user in server components
 */
export async function getAuthenticatedUser() {
  const session = await getServerSession(authOptions) as AuthSession | null
  
  if (!session || !session.user) {
    return null
  }
  
  return session.user
}

/**
 * Helper function to check permissions in server components
 */
export async function checkUserPermission(userId: string, permission: string) {
  try {
    const { getUserPermissionNames } = await import('@/lib/access')
    const permissions = await getUserPermissionNames(userId)
    return permissions.includes(permission)
  } catch (error) {
    console.error("Permission check error:", error)
    return false
  }
}

// Import Prisma for resource ownership checks
import { prisma } from "@/lib/prisma"