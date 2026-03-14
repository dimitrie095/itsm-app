import { PrismaClient } from '@prisma/client';
console.log('Creating PrismaClient...');
try {
  const prisma = new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL,
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