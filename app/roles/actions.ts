"use server"

import { prisma } from "@/lib/prisma"
import { Role } from "@prisma/client"

// Permission categories and actions for ITSM system
const DEFAULT_PERMISSIONS = [
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
]

// Permission categories with ordering
const PERMISSION_CATEGORIES = [
  { name: "tickets", description: "Ticket Management", order: 1 },
  { name: "users", description: "User Management", order: 2 },
  { name: "assets", description: "Asset Management", order: 3 },
  { name: "knowledge", description: "Knowledge Base", order: 4 },
  { name: "reports", description: "Reporting", order: 5 },
  { name: "settings", description: "System Settings", order: 6 },
  { name: "automation", description: "Automation Rules", order: 7 },
  { name: "analytics", description: "Analytics Dashboard", order: 8 },
  { name: "roles", description: "Roles & Permissions", order: 9 },
]

// Default role permissions mapping
const DEFAULT_ROLE_PERMISSIONS: Record<Exclude<Role, 'CUSTOM'>, string[]> = {
  ADMIN: [
    "tickets.view", "tickets.create", "tickets.update", "tickets.delete", "tickets.assign", "tickets.resolve", "tickets.close", "tickets.escalate",
    "users.view", "users.create", "users.update", "users.delete", "users.manage_roles",
    "assets.view", "assets.create", "assets.update", "assets.delete", "assets.assign",
    "knowledge.view", "knowledge.create", "knowledge.update", "knowledge.delete", "knowledge.publish",
    "reports.view", "reports.create", "reports.export",
    "settings.view", "settings.update", "settings.manage_integrations",
    "automation.view", "automation.create", "automation.update", "automation.delete", "automation.execute",
    "analytics.view",
    "roles.view", "roles.create", "roles.update", "roles.delete", "roles.assign"
  ],
  AGENT: [
    "tickets.view", "tickets.create", "tickets.update", "tickets.assign", "tickets.resolve", "tickets.close",
    "users.view",
    "assets.view", "assets.update", "assets.assign",
    "knowledge.view", "knowledge.create", "knowledge.update", "knowledge.publish",
    "reports.view", "reports.create",
    "automation.view",
    "analytics.view"
  ],
  END_USER: [
    "tickets.view", "tickets.create", "tickets.update",
    "knowledge.view",
    "assets.view"
  ]
}

export async function initializePermissions() {
  try {
    // Create permission categories first
    const categoryMap = new Map<string, string>()
    for (const categoryData of PERMISSION_CATEGORIES) {
      const category = await prisma.permissionCategory.upsert({
        where: { name: categoryData.name },
        update: { description: categoryData.description, order: categoryData.order },
        create: {
          name: categoryData.name,
          description: categoryData.description,
          order: categoryData.order
        }
      })
      categoryMap.set(category.name, category.id)
    }

    // Create default permissions if they don't exist
    for (const permData of DEFAULT_PERMISSIONS) {
      const categoryId = categoryMap.get(permData.category)
      await prisma.permission.upsert({
        where: { name: permData.name },
        update: { 
          ...permData,
          categoryId: categoryId || null
        },
        create: {
          ...permData,
          categoryId: categoryId || null
        },
      })
    }

    // Set up default role permissions
    const permissions = await prisma.permission.findMany()
    const permissionMap = new Map(permissions.map(p => [p.name, p]))

    for (const [role, permissionNames] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
      for (const permName of permissionNames) {
        const permission = permissionMap.get(permName)
        if (permission) {
          await prisma.rolePermission.upsert({
            where: {
              role_permissionId: {
                role: role as Role,
                permissionId: permission.id
              }
            },
            update: {},
            create: {
              role: role as Role,
              permissionId: permission.id
            }
          })
        }
      }
    }

    return { success: true, message: "Permissions initialized successfully" }
  } catch (error) {
    console.error("Error initializing permissions:", error)
    return { success: false, error: "Failed to initialize permissions" }
  }
}

export async function getRolesAndPermissions() {
  try {
    // Initialize permissions if not already done
    await initializePermissions()

    const [permissions, customRoles, rolePermissions, users] = await Promise.all([
      prisma.permission.findMany({
        orderBy: [{ category: 'asc' }, { name: 'asc' }]
      }),
      prisma.customRole.findMany({
        include: {
          permissions: {
            include: {
              permission: true
            }
          },
          users: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: { name: 'asc' }
      }),
      prisma.rolePermission.findMany({
        include: {
          permission: true
        }
      }),
      prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          customRole: {
            select: {
              id: true,
              name: true
            }
          }
        }
      })
    ])

    // Group permissions by category
    const permissionsByCategory = permissions.reduce((acc, permission) => {
      if (!acc[permission.category]) {
        acc[permission.category] = []
      }
      acc[permission.category].push(permission)
      return acc
    }, {} as Record<string, typeof permissions>)

    // Create role permission maps
    const standardRolePermissions: Record<Exclude<Role, 'CUSTOM'>, string[]> = {
      ADMIN: [],
      AGENT: [],
      END_USER: []
    }

    rolePermissions.forEach(rp => {
      if (rp.role) {
        standardRolePermissions[rp.role].push(rp.permission.name)
      }
    })

    return {
      permissions: permissionsByCategory,
      customRoles,
      standardRolePermissions,
      users,
      allPermissions: permissions
    }
  } catch (error) {
    console.error("Error fetching roles and permissions:", error)
    return {
      permissions: {},
      customRoles: [],
      standardRolePermissions: { ADMIN: [], AGENT: [], END_USER: [] },
      users: [],
      allPermissions: []
    }
  }
}

export async function updateStandardRolePermissions(role: Role, permissionNames: string[]) {
  try {
    // Get all permissions
    const allPermissions = await prisma.permission.findMany()
    const permissionMap = new Map(allPermissions.map(p => [p.name, p.id]))

    // Get current permissions for this role
    const currentPermissions = await prisma.rolePermission.findMany({
      where: { role }
    })

    const currentPermissionIds = new Set(currentPermissions.map(cp => cp.permissionId))
    const newPermissionIds = permissionNames
      .map(name => permissionMap.get(name))
      .filter((id): id is string => id !== undefined)

    // Permissions to add
    const toAdd = newPermissionIds.filter(id => !currentPermissionIds.has(id))
    // Permissions to remove
    const toRemove = Array.from(currentPermissionIds).filter(id => !newPermissionIds.includes(id))

    // Add new permissions
    for (const permissionId of toAdd) {
      await prisma.rolePermission.create({
        data: {
          role,
          permissionId
        }
      })
    }

    // Remove old permissions
    if (toRemove.length > 0) {
      await prisma.rolePermission.deleteMany({
        where: {
          role,
          permissionId: { in: toRemove }
        }
      })
    }

    return { success: true, message: "Role permissions updated successfully" }
  } catch (error) {
    console.error("Error updating role permissions:", error)
    return { success: false, error: "Failed to update role permissions" }
  }
}

export async function createCustomRole(data: {
  name: string
  description?: string
  permissionNames: string[]
}) {
  try {
    // Check if role name already exists
    const existingRole = await prisma.customRole.findUnique({
      where: { name: data.name }
    })

    if (existingRole) {
      return { success: false, error: "A custom role with this name already exists" }
    }

    // Get permission IDs
    const permissions = await prisma.permission.findMany({
      where: {
        name: { in: data.permissionNames }
      }
    })

    if (permissions.length !== data.permissionNames.length) {
      return { success: false, error: "Some permissions were not found" }
    }

    // Create custom role with permissions
    const customRole = await prisma.customRole.create({
      data: {
        name: data.name,
        description: data.description,
        permissions: {
          create: permissions.map(permission => ({
            permissionId: permission.id
          }))
        }
      },
      include: {
        permissions: {
          include: {
            permission: true
          }
        }
      }
    })

    return { success: true, role: customRole }
  } catch (error) {
    console.error("Error creating custom role:", error)
    return { success: false, error: "Failed to create custom role" }
  }
}

export async function updateCustomRole(roleId: string, data: {
  name?: string
  description?: string
  isActive?: boolean
  permissionNames?: string[]
}) {
  try {
    // Check if role exists
    const existingRole = await prisma.customRole.findUnique({
      where: { id: roleId },
      include: {
        permissions: {
          include: {
            permission: true
          }
        }
      }
    })

    if (!existingRole) {
      return { success: false, error: "Custom role not found" }
    }

    // Update basic role info
    const updateData: any = {}
    if (data.name !== undefined) updateData.name = data.name
    if (data.description !== undefined) updateData.description = data.description
    if (data.isActive !== undefined) updateData.isActive = data.isActive

    if (Object.keys(updateData).length > 0) {
      await prisma.customRole.update({
        where: { id: roleId },
        data: updateData
      })
    }

    // Update permissions if provided
    if (data.permissionNames !== undefined) {
      // Get all permissions
      const allPermissions = await prisma.permission.findMany()
      const permissionMap = new Map(allPermissions.map(p => [p.name, p.id]))

      // Get current permissions for this role
      const currentPermissions = existingRole.permissions
      const currentPermissionIds = new Set(currentPermissions.map(cp => cp.permissionId))
      const newPermissionIds = data.permissionNames
        .map(name => permissionMap.get(name))
        .filter((id): id is string => id !== undefined)

      // Permissions to add
      const toAdd = newPermissionIds.filter(id => !currentPermissionIds.has(id))
      // Permissions to remove
      const toRemove = Array.from(currentPermissionIds).filter(id => !newPermissionIds.includes(id))

      // Add new permissions
      for (const permissionId of toAdd) {
        await prisma.rolePermission.create({
          data: {
            customRoleId: roleId,
            permissionId
          }
        })
      }

      // Remove old permissions
      if (toRemove.length > 0) {
        await prisma.rolePermission.deleteMany({
          where: {
            customRoleId: roleId,
            permissionId: { in: toRemove }
          }
        })
      }
    }

    // Fetch updated role
    const updatedRole = await prisma.customRole.findUnique({
      where: { id: roleId },
      include: {
        permissions: {
          include: {
            permission: true
          }
        },
        users: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    return { success: true, role: updatedRole }
  } catch (error) {
    console.error("Error updating custom role:", error)
    return { success: false, error: "Failed to update custom role" }
  }
}

export async function deleteCustomRole(roleId: string) {
  try {
    // Check if role is assigned to any users
    const usersWithRole = await prisma.user.count({
      where: { customRoleId: roleId }
    })

    if (usersWithRole > 0) {
      return { 
        success: false, 
        error: "Cannot delete role that is assigned to users. Please reassign users first." 
      }
    }

    // Delete role permissions first
    await prisma.rolePermission.deleteMany({
      where: { customRoleId: roleId }
    })

    // Delete the role
    await prisma.customRole.delete({
      where: { id: roleId }
    })

    return { success: true, message: "Custom role deleted successfully" }
  } catch (error) {
    console.error("Error deleting custom role:", error)
    return { success: false, error: "Failed to delete custom role" }
  }
}

export async function assignRoleToUser(userId: string, roleType: "standard" | "custom", roleValue: Role | string) {
  try {
    const updateData: any = {}
    
    if (roleType === "standard") {
      updateData.role = roleValue as Role
      updateData.customRoleId = null
    } else {
      // Verify custom role exists
      const customRole = await prisma.customRole.findUnique({
        where: { id: roleValue as string }
      })

      if (!customRole) {
        return { success: false, error: "Custom role not found" }
      }

      updateData.role = "CUSTOM"
      updateData.customRoleId = roleValue as string
    }

    await prisma.user.update({
      where: { id: userId },
      data: updateData
    })

    return { success: true, message: "Role assigned successfully" }
  } catch (error) {
    console.error("Error assigning role to user:", error)
    return { success: false, error: "Failed to assign role" }
  }
}

export async function getUserPermissions(userId: string) {
  try {
    const userPermissions = await prisma.userPermission.findMany({
      where: { userId },
      include: { permission: true }
    })
    return { success: true, permissions: userPermissions }
  } catch (error) {
    console.error("Error fetching user permissions:", error)
    return { success: false, error: "Failed to fetch user permissions" }
  }
}

export async function assignPermissionToUser(userId: string, permissionName: string) {
  try {
    const permission = await prisma.permission.findUnique({
      where: { name: permissionName }
    })
    if (!permission) {
      return { success: false, error: "Permission not found" }
    }
    // Check if already assigned
    const existing = await prisma.userPermission.findUnique({
      where: { userId_permissionId: { userId, permissionId: permission.id } }
    })
    if (existing) {
      return { success: true, message: "Permission already assigned" }
    }
    await prisma.userPermission.create({
      data: { userId, permissionId: permission.id }
    })
    return { success: true, message: "Permission assigned successfully" }
  } catch (error) {
    console.error("Error assigning permission to user:", error)
    return { success: false, error: "Failed to assign permission" }
  }
}

export async function removePermissionFromUser(userId: string, permissionName: string) {
  try {
    const permission = await prisma.permission.findUnique({
      where: { name: permissionName }
    })
    if (!permission) {
      return { success: false, error: "Permission not found" }
    }
    await prisma.userPermission.delete({
      where: { userId_permissionId: { userId, permissionId: permission.id } }
    })
    return { success: true, message: "Permission removed successfully" }
  } catch (error) {
    console.error("Error removing permission from user:", error)
    return { success: false, error: "Failed to remove permission" }
  }
}

export async function updateUserPermissions(userId: string, permissionNames: string[]) {
  try {
    const allPermissions = await prisma.permission.findMany()
    const permissionMap = new Map(allPermissions.map(p => [p.name, p.id]))

    const currentPermissions = await prisma.userPermission.findMany({
      where: { userId }
    })
    const currentPermissionIds = new Set(currentPermissions.map(cp => cp.permissionId))
    const newPermissionIds = permissionNames
      .map(name => permissionMap.get(name))
      .filter((id): id is string => id !== undefined)

    const toAdd = newPermissionIds.filter(id => !currentPermissionIds.has(id))
    const toRemove = Array.from(currentPermissionIds).filter(id => !newPermissionIds.includes(id))

    for (const permissionId of toAdd) {
      await prisma.userPermission.create({
        data: { userId, permissionId }
      })
    }

    if (toRemove.length > 0) {
      await prisma.userPermission.deleteMany({
        where: {
          userId,
          permissionId: { in: toRemove }
        }
      })
    }

    return { success: true, message: "User permissions updated successfully" }
  } catch (error) {
    console.error("Error updating user permissions:", error)
    return { success: false, error: "Failed to update user permissions" }
  }
}