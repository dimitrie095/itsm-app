import { prisma } from "./prisma";
import { Role } from "@/lib/generated/prisma/enums";
import { getPermissionsForResource } from "./permission-shortcuts";

const standardRolePermissionCache = new Map<Role, string[]>();

async function getStandardRolePermissionNames(role: Role): Promise<string[]> {
  const cached = standardRolePermissionCache.get(role);
  if (cached) return cached;

  const rolePermissions = await prisma.rolePermission.findMany({
    where: { role },
    select: { permission: { select: { name: true } } },
  });
  const names = rolePermissions.map((rp) => rp.permission.name);
  standardRolePermissionCache.set(role, names);
  return names;
}

/**
 * Get all permission names for a user, combining:
 * - Standard role permissions (if user.role is ADMIN/AGENT/END_USER)
 * - Custom role permissions (if user.role is CUSTOM)
 * - User-specific permissions (UserPermission entries)
 */
export async function getUserPermissionNames(userId: string): Promise<string[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      customRoleId: true,
      userPermissions: {
        select: { permission: { select: { name: true } } },
      },
    },
  });

  if (!user) {
    return [];
  }

  const permissionNames = new Set<string>();

  // Add user-specific permissions
  user.userPermissions.forEach(up => {
    permissionNames.add(up.permission.name);
  });

  // Add role-based permissions
  if ((user.role as string) === "CUSTOM" && user.customRoleId) {
    const customRole = await prisma.customRole.findUnique({
      where: { id: user.customRoleId },
      select: {
        permissions: {
          select: { permission: { select: { name: true } } },
        },
      },
    });
    customRole?.permissions.forEach((rp) => {
      permissionNames.add(rp.permission.name);
    });
  } else {
    const rolePermissionNames = await getStandardRolePermissionNames(user.role as Role);
    rolePermissionNames.forEach((name) => {
      permissionNames.add(name);
    });
  }

  return Array.from(permissionNames);
}

/**
 * Check if a user has a specific permission
 */
export async function hasPermission(userId: string, permissionName: string): Promise<boolean> {
  const permissions = await getUserPermissionNames(userId);
  return permissions.includes(permissionName);
}

/**
 * Check if user has any of the given permissions
 */
export async function hasAnyPermission(userId: string, permissionNames: string[]): Promise<boolean> {
  const permissions = await getUserPermissionNames(userId);
  return permissionNames.some(name => permissions.includes(name));
}

/**
 * Check if user has all of the given permissions
 */
export async function hasAllPermissions(userId: string, permissionNames: string[]): Promise<boolean> {
  const permissions = await getUserPermissionNames(userId);
  return permissionNames.every(name => permissions.includes(name));
}

/**
 * Get permissions for a specific role (standard or custom)
 * Useful for UI that needs to know what permissions a role has
 */
export async function getPermissionsForRole(role: Role, customRoleId?: string): Promise<string[]> {
  const permissionNames = new Set<string>();
  
  if ((role as string) === "CUSTOM" && customRoleId) {
    const customRole = await prisma.customRole.findUnique({
      where: { id: customRoleId },
      include: {
        permissions: {
          include: { permission: true }
        }
      }
    });
    customRole?.permissions.forEach(rp => {
      permissionNames.add(rp.permission.name);
    });
  } else {
    const rolePermissions = await prisma.rolePermission.findMany({
      where: { role },
      include: { permission: true }
    });
    rolePermissions.forEach(rp => {
      permissionNames.add(rp.permission.name);
    });
  }
  
  return Array.from(permissionNames);
}

export async function checkShortcut(userId: string, resource: string, shortcut: string): Promise<boolean> {
  const userPermissions = await getUserPermissionNames(userId);
  const requiredPermissions = getPermissionsForResource(resource as any, shortcut);
  return requiredPermissions.every(perm => userPermissions.includes(perm));
}