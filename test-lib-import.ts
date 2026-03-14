import { prisma } from './lib/prisma';

async function main() {
  console.log('Testing prisma connection...');
  try {
    const users = await prisma.user.findMany();
    console.log('Users count:', users.length);
    console.log('Success');
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

main();