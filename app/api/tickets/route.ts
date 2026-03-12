import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const tickets = await prisma.ticket.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, email: true } },
        assignedTo: { select: { name: true } },
      },
    })
    return NextResponse.json(tickets)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to fetch tickets' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const ticket = await prisma.ticket.create({
      data: {
        title: body.title,
        description: body.description,
        userId: body.userId,
        priority: body.priority || 'MEDIUM',
        status: body.status || 'NEW',
        category: body.category,
        tags: JSON.stringify(body.tags || []),
        source: body.source || 'PORTAL',
        impact: body.impact || 'LOW',
        urgency: body.urgency || 'LOW',
      },
    })
    return NextResponse.json(ticket, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to create ticket' }, { status: 500 })
  }
}