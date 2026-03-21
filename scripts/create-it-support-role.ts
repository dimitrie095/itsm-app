import 'dotenv/config'
import { prisma } from '@/lib/prisma'

async function main() {
  console.log('Creating IT_SUPPORT custom role...')

  // Check if role already exists
  const existingRole = await prisma.customRole.findUnique({
    where: { name: 'IT_SUPPORT' }
  })

  if (existingRole) {
    console.log('IT_SUPPORT role already exists, updating permissions...')
    // Delete existing permissions
    await prisma.rolePermission.deleteMany({
      where: { customRoleId: existingRole.id }
    })
  }

  // Define permissions for IT_SUPPORT role based on specification:
  // Dashboard - a (all) → dashboard.view only
  // Tickets - rcu → tickets.view, tickets.create, tickets.update, tickets.assign
  // Assets - rcu → assets.view, assets.create, assets.update, assets.assign
  // Knowledge Base - rcu → knowledge.view, knowledge.create, knowledge.update, knowledge.publish
  // Users - r → users.view
  // Analytics - r → analytics.view
  // Reports - r → reports.view
  // Automation - r → automation.view
  // Settings - rcu → settings.view, settings.update

  const permissionNames = [
    // Dashboard
    'dashboard.view',
    
    // Tickets - rcu + assign
    'tickets.view',
    'tickets.create',
    'tickets.update',
    'tickets.assign',
    
    // Assets - rcu + assign
    'assets.view',
    'assets.create',
    'assets.update',
    'assets.assign',
    
    // Knowledge Base - rcu + publish
    'knowledge.view',
    'knowledge.create',
    'knowledge.update',
    'knowledge.publish',
    
    // Users - r
    'users.view',
    
    // Analytics - r
    'analytics.view',
    
    // Reports - r
    'reports.view',
    
    // Automation - r
    'automation.view',
    
    // Settings - rcu
    'settings.view',
    'settings.update',
  ]

  // Get permission IDs
  const permissions = await prisma.permission.findMany({
    where: {
      name: { in: permissionNames }
    }
  })

  console.log(`Found ${permissions.length} permissions out of ${permissionNames.length}`)

  // Check for missing permissions
  const foundNames = permissions.map(p => p.name)
  const missing = permissionNames.filter(name => !foundNames.includes(name))
  if (missing.length > 0) {
    console.error('Missing permissions:', missing)
    throw new Error(`Missing permissions: ${missing.join(', ')}`)
  }

  // Create or update custom role
  const customRole = await prisma.customRole.upsert({
    where: { name: 'IT_SUPPORT' },
    update: {
      description: 'IT Support role with permissions for dashboard, tickets, assets, knowledge base, users (read), analytics, reports, automation, and settings.',
      isActive: true,
    },
    create: {
      name: 'IT_SUPPORT',
      description: 'IT Support role with permissions for dashboard, tickets, assets, knowledge base, users (read), analytics, reports, automation, and settings.',
      isActive: true,
    }
  })

  // Create role permissions
  for (const permission of permissions) {
    await prisma.rolePermission.upsert({
      where: {
        customRoleId_permissionId: {
          customRoleId: customRole.id,
          permissionId: permission.id
        }
      },
      update: {},
      create: {
        customRoleId: customRole.id,
        permissionId: permission.id
      }
    })
  }

  console.log(`✅ IT_SUPPORT role created/updated with ${permissions.length} permissions`)
  console.log('Role ID:', customRole.id)
}

main()
  .catch(e => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })