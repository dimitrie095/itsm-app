import { Role } from "@/lib/generated/prisma/enums";
import { requireServerActionAuth } from "@/lib/auth/server-actions";

export interface ServerAuthResult {
  session: any;
  user: any;
  isAuthorized: boolean;
  error?: string;
}

/**
 * Check if a server action is authenticated and authorized
 * @param requiredRole Optional role requirement
 * @param requiredPermissions Optional permission requirements (array of permission names)
 * @param requiredShortcut Optional shortcut mapping (resource: shortcut)
 * @returns ServerAuthResult with session, user, and authorization status
 */
export async function checkServerAuth(
  requiredRole?: Role,
  requiredPermissions?: string[],
  _requiredShortcut?: { resource: string; shortcut: string }
): Promise<ServerAuthResult> {
  try {
    const roles = requiredRole ? [requiredRole] : undefined
    const user = await requireServerActionAuth({
      roles,
      permissions: requiredPermissions,
    })

    return {
      user,
      session: { user },
      isAuthorized: true
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    return {
      session: null,
      user: null,
      isAuthorized: false,
      error: message
    };
  }
}

/**
 * Create a middleware wrapper for server actions
 */
export function withServerAuth<T extends any[]>(
  handler: (user: any, session: any, ...args: T) => Promise<any>,
  options?: {
    requiredRole?: Role;
    requiredPermissions?: string[];
    requiredShortcut?: { resource: string; shortcut: string };
  }
) {
  return async (...args: T): Promise<any> => {
    const authResult = await checkServerAuth(
      options?.requiredRole,
      options?.requiredPermissions,
      options?.requiredShortcut
    );
    
    if (!authResult.isAuthorized) {
      throw new Error(authResult.error || "Unauthorized");
    }
    
    return handler(authResult.user, authResult.session, ...args);
  };
}

/**
 * Check if user has specific permission
 */
export function hasServerPermission(permissionName: string, userPermissions: string[]): boolean {
  return userPermissions.includes(permissionName);
}

/**
 * Check if user has any of the specified permissions
 */
export function hasAnyServerPermission(permissionNames: string[], userPermissions: string[]): boolean {
  return permissionNames.some(perm => userPermissions.includes(perm));
}

/**
 * Check if user has all of the specified permissions
 */
export function hasAllServerPermissions(permissionNames: string[], userPermissions: string[]): boolean {
  return permissionNames.every(perm => userPermissions.includes(perm));
}