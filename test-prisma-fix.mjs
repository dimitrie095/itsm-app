import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

console.log('DATABASE_URL:', process.env.DATABASE_URL);

try {
  const prisma = new PrismaClient({
    log: ['warn']
  });
  console.log('PrismaClient created successfully');
  const users = await prisma.user.findMany();
  console.log('Users count:', users.length);
  await prisma.$disconnect();
  console.log('Success');
} catch (error) {
  console.error('Error creating PrismaClient:', error.message);
  console.error(error);
  process.exit(1);
}