import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { checkApiAuth } from "@/lib/api-auth"
import { Role } from "@/lib/generated/prisma/enums"

export const runtime = 'nodejs'

export async function GET(request: Request) {
  try {
    // Only admins can access debug endpoints
    const authResult = await checkApiAuth(request, Role.ADMIN)
    if (!authResult.isAuthorized) {
      return authResult.errorResponse!
    }
    
    const userCount = await prisma.user.count()
    return NextResponse.json({
      DATABASE_URL: process.env.DATABASE_URL?.replace(/file:.*/, 'file:***'),
      userCount,
      prisma: prisma ? 'constructed' : 'failed',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json({
      error: String(error),
      stack: error instanceof Error ? error.stack : undefined,
      env: process.env.DATABASE_URL,
    }, { status: 500 })
  }
}