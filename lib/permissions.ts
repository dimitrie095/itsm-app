import { Role } from "@prisma/client";

export type Permission = 
  | "view_dashboard"
  | "create_ticket"
  | "manage_tickets"
  | "assign_tickets"
  | "view_assets"
  | "manage_assets"
  | "view_knowledge"
  | "manage_knowledge"
  | "view_reports"
  | "manage_reports"
  | "manage_users"
  | "manage_automation"
  | "manage_settings";

export const rolePermissions: Record<Role, Permission[]> = {
  ADMIN: [
    "view_dashboard",
    "create_ticket",
    "manage_tickets",
    "assign_tickets",
    "view_assets",
    "manage_assets",
    "view_knowledge",
    "manage_knowledge",
    "view_reports",
    "manage_reports",
    "manage_users",
    "manage_automation",
    "manage_settings",
  ],
  AGENT: [
    "view_dashboard",
    "create_ticket",
    "manage_tickets",
    "assign_tickets",
    "view_assets",
    "manage_assets",
    "view_knowledge",
    "manage_knowledge",
    "view_reports",
    "manage_reports",
  ],
  END_USER: [
    "view_dashboard",
    "create_ticket",
    "view_knowledge",
  ],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return rolePermissions[role]?.includes(permission) ?? false;
}

export function getPermissionsForRole(role: Role): Permission[] {
  return rolePermissions[role] ?? [];
}