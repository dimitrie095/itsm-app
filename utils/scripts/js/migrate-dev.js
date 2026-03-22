const { execSync } = require('child_process');
const path = require('path');

console.log('Running Prisma migrate dev...');
try {
  execSync('npx prisma migrate dev --name sqlite-to-postgresql-migration', { stdio: 'inherit', cwd: path.resolve(__dirname, '..') });
  console.log('Migration completed successfully.');
} catch (error) {
  console.error('Migration failed:', error.message);
  process.exit(1);
}