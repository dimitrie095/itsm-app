import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const runtime = 'nodejs'

export async function GET() {
  try {
    const userCount = await prisma.user.count()
    return NextResponse.json({
      DATABASE_URL: process.env.DATABASE_URL?.replace(/file:.*/, 'file:***'),
      userCount,
      prisma: prisma ? 'constructed' : 'failed',
    })
  } catch (error) {
    return NextResponse.json({
      error: String(error),
      stack: error instanceof Error ? error.stack : undefined,
      env: process.env.DATABASE_URL,
    }, { status: 500 })
  }
}