import 'dotenv/config'
import { PrismaClient } from './generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is not set')
}

function readIntEnv(name: string, fallback: number): number {
  const raw = process.env[name]
  if (!raw) return fallback
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function createPool(connectionString: string) {
  const isProduction = process.env.NODE_ENV === 'production'
  return new Pool({
    connectionString,
    max: readIntEnv('PG_POOL_MAX', isProduction ? 20 : 8),
    idleTimeoutMillis: readIntEnv('PG_POOL_IDLE_TIMEOUT_MS', isProduction ? 30_000 : 10_000),
    connectionTimeoutMillis: readIntEnv('PG_POOL_CONNECTION_TIMEOUT_MS', 10_000),
    maxLifetimeSeconds: readIntEnv('PG_POOL_MAX_LIFETIME_SECONDS', isProduction ? 300 : 120),
    allowExitOnIdle: !isProduction,
  })
}

// Prisma Client for PostgreSQL with explicit pool settings.
if (!globalForPrisma.prisma) {
  // Validate DATABASE_URL format for PostgreSQL
  const urlMatch = databaseUrl.match(/^postgresql:\/\//)
  if (!urlMatch) {
    throw new Error('Invalid DATABASE_URL format. Expected PostgreSQL URL (postgresql://...)')
  }
  
  const pool = createPool(databaseUrl)
  const adapter = new PrismaPg(pool)
  globalForPrisma.prisma = new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma as PrismaClient