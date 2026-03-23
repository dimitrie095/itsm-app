"use server"

import { prisma } from "@/lib/prisma"
import { Role } from "@/lib/generated/prisma/enums"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { createAuditLog } from "@/lib/logging/audit"

// Import default permissions from shared module
import {
  PERMISSION_CATEGORIES,
  DEFAULT_PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS
} from "@/lib/default-permissions"

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
    const permissionMap = new Map<string, (typeof permissions)[0]>(permissions.map(p => [p.name, p]))

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
      if (rp.role && rp.role !== 'CUSTOM') {
        standardRolePermissions[rp.role as Exclude<Role, 'CUSTOM'>].push(rp.permission.name)
      }
    })

    // Add CUSTOM key to satisfy type (empty array)
    ;(standardRolePermissions as any).CUSTOM = []

    return {
      permissions: permissionsByCategory,
      customRoles,
      standardRolePermissions: { ...standardRolePermissions, CUSTOM: [] },
      users,
      allPermissions: permissions
    }
  } catch (error) {
    console.error("Error fetching roles and permissions:", error)
    return {
      permissions: {},
      customRoles: [],
      standardRolePermissions: { ADMIN: [], AGENT: [], END_USER: [], CUSTOM: [] },
      users: [],
      allPermissions: []
    }
  }
}

export async function updateStandardRolePermissions(role: Role, permissionNames: string[]) {
  try {
    // Get current user for audit log
    const session = await getServerSession(authOptions)
    const updatedByUserId = session?.user?.id

    // Get all permissions
    const allPermissions = await prisma.permission.findMany()
    const permissionMap = new Map<string, string>(allPermissions.map(p => [p.name, p.id]))

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

    // Get permission names for audit log
    const idToNameMap = new Map(Array.from(permissionMap.entries()).map(([name, id]) => [id, name]))
    const addedPermissionNames = toAdd.map(id => idToNameMap.get(id) || id)
    const removedPermissionNames = toRemove.map(id => idToNameMap.get(id) || id)

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

    // Audit log for standard role permission update
    await createAuditLog({
      action: "STANDARD_ROLE_PERMISSIONS_UPDATE",
      entityType: "Role",
      entityId: role,
      userId: updatedByUserId,
      details: {
        updatedBy: updatedByUserId,
        role,
        addedCount: toAdd.length,
        removedCount: toRemove.length,
        addedPermissionNames,
        removedPermissionNames,
        finalPermissionNames: permissionNames,
      },
    })

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
    // Get current user for audit log
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id

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

    // Audit log
    await createAuditLog({
      action: "CUSTOM_ROLE_CREATE",
      entityType: "CustomRole",
      entityId: customRole.id,
      userId,
      details: {
        name: customRole.name,
        description: customRole.description,
        permissionNames: data.permissionNames,
      },
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
    // Get current user for audit log
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id

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

    // Track changes for audit log
    const changes: any = {}
    if (data.name !== undefined && data.name !== existingRole.name) changes.name = data.name
    if (data.description !== undefined && data.description !== existingRole.description) changes.description = data.description
    if (data.isActive !== undefined && data.isActive !== existingRole.isActive) changes.isActive = data.isActive

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

    let permissionChanges: any = {}
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

      permissionChanges = {
        added: toAdd.length,
        removed: toRemove.length,
        addedPermissionIds: toAdd,
        removedPermissionIds: toRemove,
      }

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

    // Audit log
    await createAuditLog({
      action: "CUSTOM_ROLE_UPDATE",
      entityType: "CustomRole",
      entityId: roleId,
      userId,
      details: {
        changes,
        permissionChanges,
      },
    })

    return { success: true, role: updatedRole }
  } catch (error) {
    console.error("Error updating custom role:", error)
    return { success: false, error: "Failed to update custom role" }
  }
}

export async function deleteCustomRole(roleId: string) {
  try {
    // Get current user for audit log
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id

    // Fetch role details before deletion for audit log
    const role = await prisma.customRole.findUnique({
      where: { id: roleId },
      select: { id: true, name: true, description: true }
    })

    if (!role) {
      return { success: false, error: "Custom role not found" }
    }

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

    // Audit log
    await createAuditLog({
      action: "CUSTOM_ROLE_DELETE",
      entityType: "CustomRole",
      entityId: roleId,
      userId,
      details: {
        name: role.name,
        description: role.description,
      },
    })

    return { success: true, message: "Custom role deleted successfully" }
  } catch (error) {
    console.error("Error deleting custom role:", error)
    return { success: false, error: "Failed to delete custom role" }
  }
}

export async function assignRoleToUser(userId: string, roleType: "standard" | "custom", roleValue: Role | string) {
  try {
    // Get current user for audit log
    const session = await getServerSession(authOptions)
    const assignedByUserId = session?.user?.id

    // Fetch user's current role before update
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, customRoleId: true }
    })

    if (!user) {
      return { success: false, error: "User not found" }
    }

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

    // Audit log for role assignment
    await createAuditLog({
      action: "ROLE_ASSIGN",
      entityType: "User",
      entityId: userId,
      userId: assignedByUserId,
      details: {
        assignedBy: assignedByUserId,
        targetUserId: userId,
        previousRole: user.role,
        previousCustomRoleId: user.customRoleId,
        newRole: updateData.role,
        newCustomRoleId: updateData.customRoleId,
        roleType,
      },
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
    // Get current user for audit log
    const session = await getServerSession(authOptions)
    const assignedByUserId = session?.user?.id

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

    // Audit log for permission assignment
    await createAuditLog({
      action: "PERMISSION_ASSIGN",
      entityType: "User",
      entityId: userId,
      userId: assignedByUserId,
      details: {
        assignedBy: assignedByUserId,
        targetUserId: userId,
        permissionName: permission.name,
        permissionId: permission.id,
      },
    })

    return { success: true, message: "Permission assigned successfully" }
  } catch (error) {
    console.error("Error assigning permission to user:", error)
    return { success: false, error: "Failed to assign permission" }
  }
}

export async function removePermissionFromUser(userId: string, permissionName: string) {
  try {
    // Get current user for audit log
    const session = await getServerSession(authOptions)
    const removedByUserId = session?.user?.id

    const permission = await prisma.permission.findUnique({
      where: { name: permissionName }
    })
    if (!permission) {
      return { success: false, error: "Permission not found" }
    }
    await prisma.userPermission.delete({
      where: { userId_permissionId: { userId, permissionId: permission.id } }
    })

    // Audit log for permission removal
    await createAuditLog({
      action: "PERMISSION_REMOVE",
      entityType: "User",
      entityId: userId,
      userId: removedByUserId,
      details: {
        removedBy: removedByUserId,
        targetUserId: userId,
        permissionName: permission.name,
        permissionId: permission.id,
      },
    })

    return { success: true, message: "Permission removed successfully" }
  } catch (error) {
    console.error("Error removing permission from user:", error)
    return { success: false, error: "Failed to remove permission" }
  }
}

export async function updateUserPermissions(userId: string, permissionNames: string[]) {
  try {
    // Get current user for audit log
    const session = await getServerSession(authOptions)
    const updatedByUserId = session?.user?.id

    const allPermissions = await prisma.permission.findMany()
    const permissionMap = new Map<string, string>(allPermissions.map(p => [p.name, p.id]))

    const currentPermissions = await prisma.userPermission.findMany({
      where: { userId }
    })
    const currentPermissionIds = new Set(currentPermissions.map(cp => cp.permissionId))
    const newPermissionIds = permissionNames
      .map(name => permissionMap.get(name))
      .filter((id): id is string => id !== undefined)

    const toAdd = newPermissionIds.filter(id => !currentPermissionIds.has(id))
    const toRemove = Array.from(currentPermissionIds).filter(id => !newPermissionIds.includes(id))

    // Get permission names for audit log
    const idToNameMap = new Map(Array.from(permissionMap.entries()).map(([name, id]) => [id, name]))
    const addedPermissionNames = toAdd.map(id => idToNameMap.get(id) || id)
    const removedPermissionNames = toRemove.map(id => idToNameMap.get(id) || id)

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

    // Audit log for bulk permission update
    await createAuditLog({
      action: "USER_PERMISSIONS_UPDATE",
      entityType: "User",
      entityId: userId,
      userId: updatedByUserId,
      details: {
        updatedBy: updatedByUserId,
        targetUserId: userId,
        addedCount: toAdd.length,
        removedCount: toRemove.length,
        addedPermissionNames,
        removedPermissionNames,
        finalPermissionNames: permissionNames,
      },
    })

    return { success: true, message: "User permissions updated successfully" }
  } catch (error) {
    console.error("Error updating user permissions:", error)
    return { success: false, error: "Failed to update user permissions" }
  }
}