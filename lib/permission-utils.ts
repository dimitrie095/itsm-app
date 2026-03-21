import { Session } from "next-auth";

/**
 * Check if a session has a specific permission.
 * Uses session.user.permissions array.
 */
export function hasPermission(session: Session | null, permissionName: string): boolean {
  const user = session?.user as any;
  if (!user?.permissions) {
    return false;
  }
  return user.permissions.includes(permissionName);
}

/**
 * Check if session has any of the given permissions
 */
export function hasAnyPermission(session: Session | null, permissionNames: string[]): boolean {
  return permissionNames.some(name => hasPermission(session, name));
}

/**
 * Check if session has all of the given permissions
 */
export function hasAllPermissions(session: Session | null, permissionNames: string[]): boolean {
  return permissionNames.every(name => hasPermission(session, name));
}