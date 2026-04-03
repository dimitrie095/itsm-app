import { PrismaClient } from './lib/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import dotenv from 'dotenv'

dotenv.config()

const databaseUrl = process.env.DATABASE_URL!
console.log('DATABASE_URL:', databaseUrl)

let adapter
if (databaseUrl.startsWith('postgresql://')) {
  console.log('Using PostgreSQL adapter')
  adapter = new PrismaPg({ connectionString: databaseUrl })
} else {
  throw new Error('Unsupported database URL')
}

const prisma = new PrismaClient({ adapter })

async function main() {
  try {
    const ruleCount = await prisma.automationRule.count()
    console.log('Automation rule count:', ruleCount)
    const rules = await prisma.automationRule.findMany({ take: 5 })
    console.log('Sample rules:', JSON.stringify(rules, null, 2))
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()