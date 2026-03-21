import 'dotenv/config'
import { prisma } from '@/lib/prisma'
import { getUserPermissionNames } from '@/lib/access'

async function main() {
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

  console.log('IT_SUPPORT role permissions:')
  customRole.permissions.forEach(rp => {
    console.log(`  - ${rp.permission.name} (${rp.permission.category}.${rp.permission.action})`)
  })

  console.log(`\nTotal permissions: ${customRole.permissions.length}`)

  // Find a user with this role
  const user = await prisma.user.findFirst({
    where: { customRoleId: customRole.id }
  })

  if (user) {
    console.log(`\nFound user with IT_SUPPORT role: ${user.name} (${user.email})`)
    
    // Get user permissions via access library
    const permissionNames = await getUserPermissionNames(user.id)
    console.log(`\nUser permissions via getUserPermissionNames:`)
    permissionNames.forEach(name => console.log(`  - ${name}`))
    console.log(`Total: ${permissionNames.length}`)

    // Verify expected permissions
    const expectedPermissions = [
      'dashboard.view',
      'tickets.view', 'tickets.create', 'tickets.update', 'tickets.assign',
      'assets.view', 'assets.create', 'assets.update', 'assets.assign',
      'knowledge.view', 'knowledge.create', 'knowledge.update', 'knowledge.publish',
      'users.view',
      'analytics.view',
      'reports.view',
      'automation.view',
      'settings.view', 'settings.update',
    ]

    const missing = expectedPermissions.filter(p => !permissionNames.includes(p))
    const extra = permissionNames.filter(p => !expectedPermissions.includes(p))

    if (missing.length === 0 && extra.length === 0) {
      console.log('\n✅ All expected permissions are correctly assigned!')
    } else {
      if (missing.length > 0) {
        console.log('\n❌ Missing permissions:', missing)
      }
      if (extra.length > 0) {
        console.log('❌ Extra permissions:', extra)
      }
    }
  } else {
    console.log('No user found with IT_SUPPORT role')
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