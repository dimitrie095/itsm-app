import { Role } from "@/lib/generated/prisma/enums";

export type Permission = 
  | "view_dashboard"
  | "create_ticket"
  | "update_ticket"
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
  | "view_settings"
  | "manage_settings";

export const rolePermissions: Record<Exclude<Role, "CUSTOM">, Permission[]> = {
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
    "update_ticket",
    "view_knowledge",
    "view_settings",
  ],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  if (role === "CUSTOM") {
    // CUSTOM roles have permissions stored in database, not in static mapping
    return false;
  }
  return rolePermissions[role as Exclude<Role, "CUSTOM">]?.includes(permission) ?? false;
}

export function getPermissionsForRole(role: Role): Permission[] {
  if (role === "CUSTOM") {
    // CUSTOM roles have permissions stored in database
    return [];
  }
  return rolePermissions[role as Exclude<Role, "CUSTOM">] ?? [];
}