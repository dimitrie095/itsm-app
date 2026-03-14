import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const runtime = 'nodejs'

export async function GET() {
  try {
    // Test Prisma connection
    const userCount = await prisma.user.count()
    const ticketCount = await prisma.ticket.count()
    return NextResponse.json({
      message: "API is working",
      userCount,
      ticketCount,
    })
  } catch (error) {
    console.error("Prisma error:", error)
    return NextResponse.json({
      error: "Prisma connection failed",
      details: String(error),
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // Determine or create user
    let userId = body.userId
    if (!userId && body.userEmail) {
      // Find or create user by email
      const user = await prisma.user.upsert({
        where: { email: body.userEmail },
        update: {}, // no updates if exists
        create: {
          email: body.userEmail,
          name: body.userName || body.userEmail.split('@')[0],
          role: 'END_USER',
          department: body.department || null,
        },
      })
      userId = user.id
    }
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Either userId or userEmail must be provided' },
        { status: 400 }
      )
    }
    
    // Convert priority to uppercase enum value
    const priority = body.priority ? body.priority.toUpperCase() : 'MEDIUM'
    if (!['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(priority)) {
      return NextResponse.json(
        { error: 'Invalid priority value' },
        { status: 400 }
      )
    }
    
    const ticket = await prisma.ticket.create({
      data: {
        title: body.title,
        description: body.description,
        userId,
        priority,
        status: body.status || 'NEW',
        category: body.category || null,
        tags: JSON.stringify(body.tags || []),
        source: body.source || 'PORTAL',
        impact: body.impact || 'LOW',
        urgency: body.urgency || 'LOW',
      },
    })
    
    return NextResponse.json(ticket, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to create ticket', details: String(error) }, { status: 500 })
  }
}