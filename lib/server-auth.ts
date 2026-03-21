import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { prisma } from "./prisma";
import { Role } from "@/lib/generated/prisma/enums";
import { getPermissionsForResource, expandShortcut } from "./permission-shortcuts";

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
  requiredShortcut?: { resource: string; shortcut: string }
): Promise<ServerAuthResult> {
  try {
    // Get session
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return {
        session: null,
        user: null,
        isAuthorized: false,
        error: "Unauthorized"
      };
    }

    // Get full user data from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email || "" },
    });

    if (!user) {
      return {
        session,
        user: null,
        isAuthorized: false,
        error: "User not found"
      };
    }

    // Check role requirement
    if (requiredRole && user.role !== requiredRole) {
      return {
        session,
        user,
        isAuthorized: false,
        error: "Forbidden: Insufficient role"
      };
    }

    // Get user permissions from session
    const userPermissions = (session.user as any).permissions as string[] || [];

    // Check permission requirements from shortcut
    if (requiredShortcut) {
      const shortcutPermissions = getPermissionsForResource(
        requiredShortcut.resource as any,
        requiredShortcut.shortcut
      );
      
      const hasAllShortcutPermissions = shortcutPermissions.every(perm => 
        userPermissions.includes(perm)
      );
      
      if (!hasAllShortcutPermissions) {
        return {
          session,
          user,
          isAuthorized: false,
          error: `Forbidden: Insufficient permissions for ${requiredShortcut.resource} (${requiredShortcut.shortcut})`
        };
      }
    }

    // Check explicit permission requirements
    if (requiredPermissions && requiredPermissions.length > 0) {
      const hasAllRequired = requiredPermissions.every(perm => 
        userPermissions.includes(perm)
      );
      
      if (!hasAllRequired) {
        return {
          session,
          user,
          isAuthorized: false,
          error: "Forbidden: Insufficient permissions"
        };
      }
    }

    return {
      session,
      user,
      isAuthorized: true
    };
  } catch (error) {
    console.error("Server auth check error:", error);
    return {
      session: null,
      user: null,
      isAuthorized: false,
      error: "Internal server error"
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