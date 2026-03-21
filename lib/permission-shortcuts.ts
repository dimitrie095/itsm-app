/**
 * Permission shortcut mappings
 * r - read
 * c - create
 * d - delete
 * u - update
 * a - all (read, create, update, delete)
 */

export const shortcutToActions: Record<string, string[]> = {
  r: ['read'],
  c: ['create'],
  d: ['delete'],
  u: ['update'],
  a: ['read', 'create', 'update', 'delete'],
};

/**
 * Expand a shortcut string (e.g., "rcu") into an array of actions
 */
export function expandShortcut(shortcut: string): string[] {
  const actions = new Set<string>();
  for (const ch of shortcut.toLowerCase()) {
    if (shortcutToActions[ch]) {
      for (const action of shortcutToActions[ch]) {
        actions.add(action);
      }
    }
  }
  return Array.from(actions);
}

/**
 * Generate permission names for a resource and shortcut string
 * Example: resourcePermissions('tickets', 'rcu') => ['tickets.view', 'tickets.create', 'tickets.update']
 */
export function resourcePermissions(resource: string, shortcut: string): string[] {
  const actions = expandShortcut(shortcut);
  return actions.map(action => `${resource}.${action}`);
}

/**
 * Map of resource names used in the system to permission categories
 */
export const resourceCategories = {
  dashboard: 'dashboard',
  tickets: 'tickets',
  assets: 'assets',
  knowledge: 'knowledge',
  users: 'users',
  analytics: 'analytics',
  reports: 'reports',
  automation: 'automation',
  settings: 'settings',
  roles: 'roles',
} as const;

/**
 * Allowed CRUD actions per resource category based on existing permissions
 */
const allowedCategoryActions: Record<string, string[]> = {
  dashboard: ['read'],
  tickets: ['read', 'create', 'update', 'delete', 'assign', 'resolve', 'close', 'escalate'],
  assets: ['read', 'create', 'update', 'delete', 'assign'],
  knowledge: ['read', 'create', 'update', 'delete', 'publish'],
  users: ['read', 'create', 'update', 'delete', 'manage'],
  analytics: ['read'],
  reports: ['read', 'create', 'export'],
  automation: ['read', 'create', 'update', 'delete', 'execute'],
  settings: ['read', 'update', 'manage'],
  roles: ['read', 'create', 'update', 'delete', 'assign'],
};

/**
 * Map action to permission name suffix
 * Based on the permission naming convention in DEFAULT_PERMISSIONS
 */
function actionToSuffix(action: string): string {
  // In the permission system, 'read' action corresponds to 'view' suffix
  // All other actions use the same name as the action
  return action === 'read' ? 'view' : action;
}

/**
 * Get all permission names for a resource category and shortcut string
 * Handles special cases where permission naming differs (e.g., dashboard uses view_dashboard)
 * Filters out actions that are not allowed for the category
 */
export function getPermissionsForResource(resource: keyof typeof resourceCategories, shortcut: string): string[] {
  const category = resourceCategories[resource];
  const actions = expandShortcut(shortcut);
  
  // Special handling for dashboard
  if (resource === 'dashboard') {
    // Dashboard uses 'dashboard.view' permission in database
    if (actions.includes('read')) {
      return ['dashboard.view'];
    }
    // For other actions, we might need to generate dashboard.* permissions if they exist
    // For now, return empty array for non-read actions
    return [];
  }
  
  // Get allowed actions for this category
  const allowedActions = allowedCategoryActions[category] || [];
  
  // Filter actions to only those allowed for this category
  const filteredActions = actions.filter(action => allowedActions.includes(action));
  
  // Generate permission names following naming convention
  // Action 'read' maps to 'view', other actions keep their name
  return filteredActions.map(action => {
    const suffix = actionToSuffix(action);
    return `${category}.${suffix}`;
  });
}