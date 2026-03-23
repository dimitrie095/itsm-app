import { PrismaClient } from './lib/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaSQLite } from '@prisma/adapter-better-sqlite3'
import dotenv from 'dotenv'

dotenv.config()

const databaseUrl = process.env.DATABASE_URL!
console.log('DATABASE_URL:', databaseUrl)

let adapter
if (databaseUrl.startsWith('postgresql://')) {
  console.log('Using PostgreSQL adapter')
  adapter = new PrismaPg({ connectionString: databaseUrl })
} else if (databaseUrl.startsWith('file:')) {
  console.log('Using SQLite adapter')
  adapter = new PrismaSQLite({ connectionString: databaseUrl })
} else {
  throw new Error('Unsupported database URL')
}

const prisma = new PrismaClient({ adapter })

async function main() {
  try {
    const count = await prisma.asset.count()
    console.log('Asset count:', count)
    const assets = await prisma.asset.findMany({ take: 3 })
    console.log('Sample assets:', JSON.stringify(assets, null, 2))
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()