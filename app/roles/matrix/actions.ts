"use server"

import { prisma } from "@/lib/prisma"
import { Role } from "@prisma/client"
import { initializePermissions } from "../actions"

export interface PermissionMatrixData {
  categories: Array<{
    id: string
    name: string
    description: string | null
    order: number
  }>
  permissions: Array<{
    id: string
    name: string
    description: string | null
    category: string
    action: string
    categoryId: string | null
  }>
  roles: Array<{
    id: string
    name: string
    type: 'standard' | 'custom'
    description: string | null
    isActive?: boolean
    userCount: number
  }>
  matrix: Record<string, Record<string, boolean>> // roleId -> permissionId -> granted
}

export async function getPermissionMatrix(): Promise<PermissionMatrixData> {
  try {
    // Initialize permissions if needed
    await initializePermissions()

    const [categories, permissions, customRoles, rolePermissions] = await Promise.all([
      prisma.permissionCategory.findMany({
        orderBy: { order: 'asc' }
      }),
      prisma.permission.findMany({
        include: {
          permissionCategory: true
        },
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
              id: true
            }
          }
        },
        where: {
          isActive: true
        },
        orderBy: { name: 'asc' }
      }),
      prisma.rolePermission.findMany({
        include: {
          permission: true
        }
      })
    ])

    // Build standard roles data
    const standardRoles = [
      { id: 'ADMIN', name: 'Administrator', type: 'standard' as const, description: 'Full system access', userCount: 0 },
      { id: 'AGENT', name: 'Agent', type: 'standard' as const, description: 'Can manage tickets and assets', userCount: 0 },
      { id: 'END_USER', name: 'End User', type: 'standard' as const, description: 'Basic user access', userCount: 0 },
    ]

    // Get user counts for standard roles
    const userCounts = await prisma.user.groupBy({
      by: ['role'],
      where: {
        role: { in: ['ADMIN', 'AGENT', 'END_USER'] }
      },
      _count: {
        id: true
      }
    })

    // Update user counts
    standardRoles.forEach(role => {
      const count = userCounts.find(uc => uc.role === role.id)?._count?.id || 0
      role.userCount = count
    })

    // Build custom roles data
    const customRolesData = customRoles.map(role => ({
      id: role.id,
      name: role.name,
      type: 'custom' as const,
      description: role.description,
      isActive: role.isActive,
      userCount: role.users.length
    }))

    // Combine all roles
    const allRoles = [...standardRoles, ...customRolesData]

    // Build permission matrix
    const matrix: Record<string, Record<string, boolean>> = {}

    // Initialize matrix with false
    allRoles.forEach(role => {
      matrix[role.id] = {}
      permissions.forEach(permission => {
        matrix[role.id][permission.id] = false
      })
    })

    // Fill matrix with actual permissions
    rolePermissions.forEach(rp => {
      const roleId = rp.role || (rp.customRoleId ? rp.customRoleId : null)
      if (roleId && rp.permission) {
        if (matrix[roleId]) {
          matrix[roleId][rp.permission.id] = true
        }
      }
    })

    return {
      categories: categories.map(cat => ({
        id: cat.id,
        name: cat.name,
        description: cat.description,
        order: cat.order
      })),
      permissions: permissions.map(perm => ({
        id: perm.id,
        name: perm.name,
        description: perm.description,
        category: perm.category,
        action: perm.action,
        categoryId: perm.categoryId
      })),
      roles: allRoles,
      matrix
    }
  } catch (error) {
    console.error("Error fetching permission matrix:", error)
    throw new Error("Failed to load permission matrix")
  }
}

export async function bulkUpdatePermissions(
  updates: Array<{
    roleId: string
    permissionId: string
    granted: boolean
  }>
) {
  try {
    // Separate updates by role type (standard vs custom)
    const standardUpdates = updates.filter(update => 
      ['ADMIN', 'AGENT', 'END_USER'].includes(update.roleId)
    )
    const customUpdates = updates.filter(update => 
      !['ADMIN', 'AGENT', 'END_USER'].includes(update.roleId)
    )

    // Process standard role updates
    for (const update of standardUpdates) {
      if (update.granted) {
        await prisma.rolePermission.upsert({
          where: {
            role_permissionId: {
              role: update.roleId as Role,
              permissionId: update.permissionId
            }
          },
          update: {},
          create: {
            role: update.roleId as Role,
            permissionId: update.permissionId
          }
        })
      } else {
        await prisma.rolePermission.deleteMany({
          where: {
            role: update.roleId as Role,
            permissionId: update.permissionId
          }
        })
      }
    }

    // Process custom role updates
    for (const update of customUpdates) {
      if (update.granted) {
        await prisma.rolePermission.upsert({
          where: {
            customRoleId_permissionId: {
              customRoleId: update.roleId,
              permissionId: update.permissionId
            }
          },
          update: {},
          create: {
            customRoleId: update.roleId,
            permissionId: update.permissionId
          }
        })
      } else {
        await prisma.rolePermission.deleteMany({
          where: {
            customRoleId: update.roleId,
            permissionId: update.permissionId
          }
        })
      }
    }

    return { success: true, message: "Permissions updated successfully" }
  } catch (error) {
    console.error("Error bulk updating permissions:", error)
    return { success: false, error: "Failed to update permissions" }
  }
}