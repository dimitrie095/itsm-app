import { PrismaClient } from './lib/generated/prisma/index.js';
console.log('Creating PrismaClient...');
try {
  const prisma = new PrismaClient({
    log: ['warn']
  });
  console.log('Client created');
  const users = await prisma.user.findMany();
  console.log('Users count:', users.length);
  await prisma.$disconnect();
  console.log('Success');
} catch (error) {
  console.error('Error:', error.message);
  console.error(error);
  process.exit(1);
}