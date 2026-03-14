require('dotenv/config');
const { execSync } = require('child_process');

console.log('DATABASE_URL:', process.env.DATABASE_URL);

try {
  execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
  console.log('Migration successful');
} catch (error) {
  console.error('Migration failed:', error);
  process.exit(1);
}