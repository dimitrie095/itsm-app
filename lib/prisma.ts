import 'dotenv/config'
import path from 'path'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { PrismaClient } from './generated/prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

// Determine database URL
let databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  databaseUrl = 'file:./itsm.db'
}

// Resolve relative file paths to absolute
if (databaseUrl.startsWith('file:')) {
  const [pathPart, queryPart] = databaseUrl.replace(/^file:/, '').split('?')
  const absolutePath = path.resolve(process.cwd(), pathPart)
  // Replace backslashes with forward slashes for SQLite URL
  const normalizedPath = absolutePath.replace(/\\/g, '/')
  databaseUrl = 'file:' + normalizedPath
  // Note: query parameters like ?connection_limit=1 are not supported by better-sqlite3 adapter
}

if (process.env.NODE_ENV !== 'production') {
  console.log('DATABASE_URL:', databaseUrl)
}

const adapter = new PrismaBetterSqlite3({ url: databaseUrl })
export const prisma = globalForPrisma.prisma || new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma