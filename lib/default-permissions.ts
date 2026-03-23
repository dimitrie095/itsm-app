/**
 * Default permission categories for the ITSM system
 */
export const PERMISSION_CATEGORIES = [
  { name: "dashboard", description: "Dashboard", order: 0 },
  { name: "tickets", description: "Ticket Management", order: 1 },
  { name: "users", description: "User Management", order: 2 },
  { name: "assets", description: "Asset Management", order: 3 },
  { name: "knowledge", description: "Knowledge Base", order: 4 },
  { name: "reports", description: "Reporting", order: 5 },
  { name: "settings", description: "System Settings", order: 6 },
  { name: "automation", description: "Automation Rules", order: 7 },
  { name: "analytics", description: "Analytics Dashboard", order: 8 },
  { name: "roles", description: "Roles & Permissions", order: 9 },
] as const;

/**
 * Default permissions for the ITSM system
 */
export const DEFAULT_PERMISSIONS = [
  // Dashboard
  { name: "dashboard.view", description: "View dashboard", category: "dashboard", action: "read" },
  
  // Tickets
  { name: "tickets.view", description: "View tickets", category: "tickets", action: "read" },
  { name: "tickets.create", description: "Create new tickets", category: "tickets", action: "create" },
  { name: "tickets.update", description: "Update ticket details", category: "tickets", action: "update" },
  { name: "tickets.delete", description: "Delete tickets", category: "tickets", action: "delete" },
  { name: "tickets.assign", description: "Assign tickets to agents", category: "tickets", action: "assign" },
  { name: "tickets.resolve", description: "Resolve tickets", category: "tickets", action: "resolve" },
  { name: "tickets.close", description: "Close tickets", category: "tickets", action: "close" },
  { name: "tickets.escalate", description: "Escalate tickets", category: "tickets", action: "escalate" },
  
  // Users
  { name: "users.view", description: "View users", category: "users", action: "read" },
  { name: "users.create", description: "Create new users", category: "users", action: "create" },
  { name: "users.update", description: "Update user details", category: "users", action: "update" },
  { name: "users.delete", description: "Delete users", category: "users", action: "delete" },
  { name: "users.manage_roles", description: "Manage user roles and permissions", category: "users", action: "manage" },
  
  // Assets
  { name: "assets.view", description: "View assets", category: "assets", action: "read" },
  { name: "assets.create", description: "Create new assets", category: "assets", action: "create" },
  { name: "assets.update", description: "Update asset details", category: "assets", action: "update" },
  { name: "assets.delete", description: "Delete assets", category: "assets", action: "delete" },
  { name: "assets.assign", description: "Assign assets to users", category: "assets", action: "assign" },
  
  // Knowledge Base
  { name: "knowledge.view", description: "View knowledge base articles", category: "knowledge", action: "read" },
  { name: "knowledge.create", description: "Create knowledge base articles", category: "knowledge", action: "create" },
  { name: "knowledge.update", description: "Update knowledge base articles", category: "knowledge", action: "update" },
  { name: "knowledge.delete", description: "Delete knowledge base articles", category: "knowledge", action: "delete" },
  { name: "knowledge.publish", description: "Publish knowledge base articles", category: "knowledge", action: "publish" },
  
  // Reports
  { name: "reports.view", description: "View reports", category: "reports", action: "read" },
  { name: "reports.create", description: "Create reports", category: "reports", action: "create" },
  { name: "reports.export", description: "Export reports", category: "reports", action: "export" },
  
  // Settings
  { name: "settings.view", description: "View system settings", category: "settings", action: "read" },
  { name: "settings.update", description: "Update system settings", category: "settings", action: "update" },
  { name: "settings.manage_integrations", description: "Manage integrations", category: "settings", action: "manage" },
  { name: "audit.view", description: "View audit logs", category: "settings", action: "read" },
  
  // Automation
  { name: "automation.view", description: "View automation rules", category: "automation", action: "read" },
  { name: "automation.create", description: "Create automation rules", category: "automation", action: "create" },
  { name: "automation.update", description: "Update automation rules", category: "automation", action: "update" },
  { name: "automation.delete", description: "Delete automation rules", category: "automation", action: "delete" },
  { name: "automation.execute", description: "Execute automation rules", category: "automation", action: "execute" },
  
  // Analytics
  { name: "analytics.view", description: "View analytics dashboard", category: "analytics", action: "read" },
  
  // Roles & Permissions
  { name: "roles.view", description: "View roles and permissions", category: "roles", action: "read" },
  { name: "roles.create", description: "Create custom roles", category: "roles", action: "create" },
  { name: "roles.update", description: "Update roles and permissions", category: "roles", action: "update" },
  { name: "roles.delete", description: "Delete custom roles", category: "roles", action: "delete" },
  { name: "roles.assign", description: "Assign roles to users", category: "roles", action: "assign" },
] as const;

/**
 * Default role permissions mapping
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  ADMIN: [
    "dashboard.view",
    "tickets.view", "tickets.create", "tickets.update", "tickets.delete", "tickets.assign", "tickets.resolve", "tickets.close", "tickets.escalate",
    "users.view", "users.create", "users.update", "users.delete", "users.manage_roles",
    "assets.view", "assets.create", "assets.update", "assets.delete", "assets.assign",
    "knowledge.view", "knowledge.create", "knowledge.update", "knowledge.delete", "knowledge.publish",
    "reports.view", "reports.create", "reports.export",
    "settings.view", "settings.update", "settings.manage_integrations", "audit.view",
    "automation.view", "automation.create", "automation.update", "automation.delete", "automation.execute",
    "analytics.view",
    "roles.view", "roles.create", "roles.update", "roles.delete", "roles.assign"
  ],
  AGENT: [
    // Dashboard - r (read only)
    "dashboard.view",
    // Tickets - rcu (read, create, update)
    "tickets.view", "tickets.create", "tickets.update", "tickets.assign", "tickets.resolve", "tickets.close",
    // Users - r (read only)
    "users.view",
    // Assets - rcu (read, create, update)
    "assets.view", "assets.create", "assets.update", "assets.assign",
    // Knowledge Base - rcu (read, create, update)
    "knowledge.view", "knowledge.create", "knowledge.update", "knowledge.publish",
    // Reports - r (read only)
    "reports.view",
    // Settings - rcu (read, create, update)
    "settings.view", "settings.update",
    // Automation - rcu (read, create, update)
    "automation.view", "automation.create", "automation.update",
    // Analytics - r (read only)
    "analytics.view"
  ],
  END_USER: [
    // Dashboard - r (read only)
    "dashboard.view",
    // Tickets - own tickets only + create
    "tickets.view", "tickets.create", "tickets.update",
    // Knowledge Base - r (read only)
    "knowledge.view",
    // Settings - r (read only - for profile settings)
    "settings.view"
  ]
} as const;