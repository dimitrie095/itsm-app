import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/auth/middleware"
import { Role } from "@/lib/generated/prisma/enums"

export const runtime = 'nodejs'

export async function GET(request: Request) {
  try {
    const nextRequest = new NextRequest(request.url, request)
    const authResult = await withAuth({ roles: [Role.ADMIN] })(nextRequest)
    if (authResult instanceof NextResponse) {
      return authResult
    }
    
    const userCount = await prisma.user.count()
    return NextResponse.json({
      userCount,
      prisma: prisma ? 'constructed' : 'failed',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("GET /api/debug error:", error)
    return NextResponse.json({
      error: "Failed to process debug request",
    }, { status: 500 })
  }
}