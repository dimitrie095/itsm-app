import 'dotenv/config'
import { PrismaClient } from './generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is not set')
}

// Prisma Client for PostgreSQL with adapter
let prismaClient: PrismaClient
if (!globalForPrisma.prisma) {
  // Validate DATABASE_URL format for PostgreSQL
  const urlMatch = databaseUrl.match(/^postgresql:\/\//)
  if (!urlMatch) {
    throw new Error('Invalid DATABASE_URL format. Expected PostgreSQL URL (postgresql://...)')
  }
  
  const pool = new Pool({ connectionString: databaseUrl })
  const adapter = new PrismaPg(pool)
  prismaClient = new PrismaClient({ adapter })
} else {
  prismaClient = globalForPrisma.prisma
}

export const prisma = prismaClient

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma