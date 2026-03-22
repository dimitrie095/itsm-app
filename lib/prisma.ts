import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from './generated/prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

// DATABASE_URL should be set in .env file
// For PostgreSQL: postgresql://user:password@localhost:5432/database?schema=public
const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is not set')
}

if (process.env.NODE_ENV !== 'production') {
  console.log('DATABASE_URL:', databaseUrl)
}

// Create PostgreSQL adapter
const adapter = new PrismaPg({ connectionString: databaseUrl })

// Prisma Client with PostgreSQL adapter
export const prisma = globalForPrisma.prisma || new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma