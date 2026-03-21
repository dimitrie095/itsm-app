import { expandShortcut, getPermissionsForResource, resourceCategories } from '@/lib/permission-shortcuts'

console.log('Testing permission shortcut mappings...\n')

// Test expandShortcut
console.log('1. Testing expandShortcut:')
console.log('  r ->', expandShortcut('r'))
console.log('  rc ->', expandShortcut('rc'))
console.log('  rcu ->', expandShortcut('rcu'))
console.log('  a ->', expandShortcut('a'))
console.log('  rcu (duplicate) ->', expandShortcut('rcu'))
console.log('')

// Test getPermissionsForResource for each category
console.log('2. Testing getPermissionsForResource for IT support specification:')
const itSupportSpec = [
  { resource: 'dashboard', shortcut: 'a' },
  { resource: 'tickets', shortcut: 'rcu' },
  { resource: 'assets', shortcut: 'rcu' },
  { resource: 'knowledge', shortcut: 'rcu' },
  { resource: 'users', shortcut: 'r' },
  { resource: 'analytics', shortcut: 'r' },
  { resource: 'reports', shortcut: 'r' },
  { resource: 'automation', shortcut: 'r' },
  { resource: 'settings', shortcut: 'rcu' },
]

for (const spec of itSupportSpec) {
  const perms = getPermissionsForResource(spec.resource as keyof typeof resourceCategories, spec.shortcut)
  console.log(`  ${spec.resource}.${spec.shortcut} ->`, perms)
}

console.log('\n3. Verifying all resources have valid categories:')
for (const [resource, category] of Object.entries(resourceCategories)) {
  console.log(`  ${resource} -> ${category}`)
}

console.log('\n✅ Permission shortcut middleware test completed.')