import { NextRequest, NextResponse } from "next/server";
import { Role } from "@/lib/generated/prisma/enums";
import { withAuth } from "@/lib/auth/middleware";
import { prisma } from "@/lib/prisma";

/**
 * API route protection utilities
 */

export interface ApiAuthResult {
  session: any;
  user: any;
  isAuthorized: boolean;
  errorResponse?: NextResponse;
}

/**
 * Check if a request is authenticated and authorized for API access
 * @param request The incoming request
 * @param requiredRole Optional role requirement
 * @param requiredPermissions Optional permission requirements
 * @param requiredShortcut Optional shortcut mapping (resource: shortcut)
 * @returns ApiAuthResult with session, user, and authorization status
 */
export async function checkApiAuth(
  request: Request,
  requiredRole?: Role,
  requiredPermissions?: string[],
  _requiredShortcut?: { resource: string; shortcut: string }
): Promise<ApiAuthResult> {
  try {
    const nextRequest = request instanceof NextRequest ? request : new NextRequest(request.url)
    const roleOptions = requiredRole ? [requiredRole] : undefined
    const authResult = await withAuth({
      roles: roleOptions,
      permissions: requiredPermissions,
    })(nextRequest)

    if (authResult instanceof NextResponse) {
      return {
        session: null,
        user: null,
        isAuthorized: false,
        errorResponse: authResult,
      };
    }
    
    return {
      session: authResult.session,
      user: authResult.user,
      isAuthorized: true
    };
  } catch (error) {
    console.error("API auth check error:", error);
    return {
      session: null,
      user: null,
      isAuthorized: false,
      errorResponse: NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      )
    };
  }
}

/**
 * Create a middleware wrapper for API handlers
 */
export function withApiAuth(
  handler: (request: Request, user: any, session: any) => Promise<NextResponse>,
  options?: {
    requiredRole?: Role;
    requiredPermissions?: string[];
    requiredShortcut?: { resource: string; shortcut: string };
  }
) {
  return async (request: Request): Promise<NextResponse> => {
    const authResult = await checkApiAuth(
      request,
      options?.requiredRole,
      options?.requiredPermissions,
      options?.requiredShortcut
    );
    
    if (!authResult.isAuthorized) {
      return authResult.errorResponse!;
    }
    
    return handler(request, authResult.user, authResult.session);
  };
}

/**
 * Create a middleware wrapper for API handlers using shortcut notation
 */
export function withShortcutAuth(
  handler: (request: Request, user: any, session: any) => Promise<NextResponse>,
  resource: string,
  shortcut: string
) {
  return withApiAuth(handler, { requiredShortcut: { resource, shortcut } });
}

/**
 * Check if user can access ticket data (END_USER can only access their own tickets)
 */
export async function checkTicketAccess(userId: string, ticketId: string): Promise<boolean> {
  if (!userId || !ticketId) return false;
  
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: { userId: true }
  });
  
  if (!ticket) return false;
  
  // User can access ticket if they created it OR if they're admin/agent
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true }
  });
  
  if (!user) return false;
  
  // Admins and agents can access all tickets
  if (user.role === Role.ADMIN || user.role === Role.AGENT) {
    return true;
  }
  
  // END_USER can only access their own tickets
  return ticket.userId === userId;
}

/**
 * Filter data based on user role (END_USER sees only their own data)
 */
export async function filterByUserRole<T extends { userId: string }>(
  userId: string,
  data: T[],
  userRole: Role
): Promise<T[]> {
  if (userRole === Role.ADMIN || userRole === Role.AGENT) {
    return data;
  }
  
  // END_USER sees only their own data
  return data.filter(item => item.userId === userId);
}