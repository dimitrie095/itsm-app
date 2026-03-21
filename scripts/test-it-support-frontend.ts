import 'dotenv/config'
import { prisma } from '@/lib/prisma'
import { getPermissionsForResource } from '@/lib/permission-shortcuts'

async function main() {
  console.log('Testing IT_SUPPORT role permissions for frontend...\n')

  // Get IT_SUPPORT custom role
  const customRole = await prisma.customRole.findUnique({
    where: { name: 'IT_SUPPORT' },
    include: {
      permissions: {
        include: { permission: true }
      }
    }
  })

  if (!customRole) {
    console.error('IT_SUPPORT role not found')
    return
  }

  const rolePermissions = customRole.permissions.map(rp => rp.permission.name)
  console.log('IT_SUPPORT role has permissions:', rolePermissions)
  console.log(`Total: ${rolePermissions.length}\n`)

  // Expected permissions based on specification
  const expectedResources = [
    { resource: 'dashboard', shortcut: 'a' }, // Actually just read
    { resource: 'tickets', shortcut: 'rcu' },
    { resource: 'assets', shortcut: 'rcu' },
    { resource: 'knowledge', shortcut: 'rcu' },
    { resource: 'users', shortcut: 'r' },
    { resource: 'analytics', shortcut: 'r' },
    { resource: 'reports', shortcut: 'r' },
    { resource: 'automation', shortcut: 'r' },
    { resource: 'settings', shortcut: 'rcu' },
  ]

  console.log('Expected permissions based on specification:')
  const expectedPermissions: string[] = []
  for (const { resource, shortcut } of expectedResources) {
    const perms = getPermissionsForResource(resource as any, shortcut)
    expectedPermissions.push(...perms)
    console.log(`  ${resource}.${shortcut} ->`, perms)
  }

  console.log('\nChecking for missing permissions:')
  const missing = expectedPermissions.filter(p => !rolePermissions.includes(p))
  if (missing.length === 0) {
    console.log('✅ All expected permissions are present!')
  } else {
    console.log('❌ Missing permissions:', missing)
  }

  console.log('\nChecking for extra permissions:')
  const extra = rolePermissions.filter(p => !expectedPermissions.includes(p))
  if (extra.length === 0) {
    console.log('✅ No extra permissions (good!)')
  } else {
    console.log('⚠️  Extra permissions (might be okay):', extra)
  }

  // Test frontend route permissions
  console.log('\nTesting frontend route access:')
  const testRoutes = [
    { path: '/', permission: 'dashboard.view' },
    { path: '/dashboard', permission: 'dashboard.view' },
    { path: '/tickets', permission: 'tickets.view' },
    { path: '/tickets/new', permission: 'tickets.create' },
    { path: '/assets', permission: 'assets.view' },
    { path: '/assets/new', permission: 'assets.create' },
    { path: '/knowledge', permission: 'knowledge.view' },
    { path: '/knowledge/new', permission: 'knowledge.create' },
    { path: '/users', permission: 'users.view' },
    { path: '/analytics', permission: 'analytics.view' },
    { path: '/reports', permission: 'reports.view' },
    { path: '/reports/new', permission: 'reports.create' },
    { path: '/automation', permission: 'automation.view' },
    { path: '/settings', permission: 'settings.view' },
  ]

  for (const route of testRoutes) {
    const hasAccess = rolePermissions.includes(route.permission)
    console.log(`${hasAccess ? '✅' : '❌'} ${route.path} (requires ${route.permission}): ${hasAccess ? 'ACCESS' : 'DENIED'}`)
  }
}

main()
  .catch(e => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })