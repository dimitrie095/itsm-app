const { PrismaClient } = require('./lib/generated/prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:D090799t@localhost:5432/itsm?schema=public';
console.log('Using DATABASE_URL:', databaseUrl);

const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

async function main() {
  try {
    const count = await prisma.asset.count();
    console.log('Asset count in PostgreSQL:', count);
    const assets = await prisma.asset.findMany({ take: 3 });
    console.log('Sample assets:', JSON.stringify(assets, null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();