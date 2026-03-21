import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { checkApiAuth, checkTicketAccess } from "@/lib/api-auth"
import { Role, TicketStatus, Priority, TicketSource, ImpactLevel, UrgencyLevel } from "@/lib/generated/prisma/enums"

export const runtime = 'nodejs'

export async function GET(request: Request) {
  try {
    // Check authentication
    const authResult = await checkApiAuth(request)
    if (!authResult.isAuthorized) {
      return authResult.errorResponse!
    }
    
    const { user } = authResult
    
    // Get query parameters
    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get('limit') || '50')
    const skip = parseInt(url.searchParams.get('skip') || '0')
    const status = url.searchParams.get('status')
    const priority = url.searchParams.get('priority')
    const category = url.searchParams.get('category')
    const assigned = url.searchParams.get('assigned')
    const search = url.searchParams.get('search')
    const startDate = url.searchParams.get('startDate')
    const endDate = url.searchParams.get('endDate')
    const sort = url.searchParams.get('sort')
    
    // Build where clause based on user role
    let whereClause: any = {}
    
    if (user.role === Role.END_USER) {
      // END_USER can only see their own tickets
      whereClause.userId = user.id
      // END_USER should not use assigned filters - they can only see tickets they created
      // So we ignore any assigned parameter for END_USER
    } else if (user.role === Role.AGENT && assigned === 'me') {
      // AGENT can filter to tickets assigned to them
      whereClause.assignedToId = user.id
    }
    
    // Add filters
    if (status) {
      whereClause.status = status
    }
    if (priority) {
      whereClause.priority = priority
    }
    if (category) {
      whereClause.category = { contains: category, mode: 'insensitive' }
    }
    // Skip assigned filters for END_USER (they can only see tickets they created)
    if (user.role !== Role.END_USER && assigned && assigned !== 'me') {
      if (assigned === 'unassigned') {
        whereClause.assignedToId = null
      } else if (assigned === 'assigned') {
        whereClause.assignedToId = { not: null }
      }
    }
    
    // Date range filter
    if (startDate || endDate) {
      whereClause.createdAt = {}
      if (startDate) {
        whereClause.createdAt.gte = new Date(startDate)
      }
      if (endDate) {
        whereClause.createdAt.lte = new Date(endDate)
      }
    }
    
    // Search filter (title or description)
    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }
    
    // Get total count for pagination
    const total = await prisma.ticket.count({ where: whereClause })
    
    // Fetch tickets with pagination
    const tickets = await prisma.ticket.findMany({
      where: whereClause,
      skip: Math.max(0, skip),
      take: Math.min(Math.max(1, limit), 100), // Cap at 100, min 1
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
          }
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
          }
        },
        asset: {
          select: {
            id: true,
            name: true,
            type: true,
            serialNumber: true,
            status: true,
          }
        },
        sla: {
          select: {
            id: true,
            name: true,
            responseTime: true,
            resolutionTime: true,
          }
        }
      }
    })
    
    // Parse tags from JSON string to array with error handling
    const ticketsWithParsedTags = tickets.map(ticket => {
      let parsedTags = []
      if (ticket.tags) {
        try {
          parsedTags = JSON.parse(ticket.tags)
          if (!Array.isArray(parsedTags)) {
            parsedTags = []
          }
        } catch {
          parsedTags = []
        }
      }
      return {
        ...ticket,
        tags: parsedTags,
      }
    })
    
    return NextResponse.json({
      tickets: ticketsWithParsedTags,
      userRole: user.role,
      total,
      pagination: {
        skip,
        limit,
        hasMore: skip + limit < total
      }
    })
  } catch (error) {
    console.error("GET /api/tickets error:", error)
    return NextResponse.json({
      error: "Failed to fetch tickets",
      details: String(error)
    }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    // Check authentication - anyone can create tickets if authenticated
    const authResult = await checkApiAuth(request)
    if (!authResult.isAuthorized) {
      return authResult.errorResponse!
    }
    
    const { user, session } = authResult
    const body = await request.json()
    
    // Check if user has permission to create tickets
    const userPermissions = (session.user as any).permissions as string[] || []
    const canCreateTicket = userPermissions.includes('tickets.create')
    
    if (!canCreateTicket) {
      return NextResponse.json(
        { error: 'Forbidden: Cannot create tickets' },
        { status: 403 }
      )
    }
    
    // END_USER can only create tickets for themselves
    let userId = body.userId
    if (user.role === Role.END_USER) {
      if (userId && userId !== user.id) {
        return NextResponse.json(
          { error: 'Forbidden: Cannot create tickets for other users' },
          { status: 403 }
        )
      }
      userId = user.id
    } else if (!userId && body.userEmail) {
      // Find or create user by email (only allowed for ADMIN/AGENT)
      const targetUser = await prisma.user.upsert({
        where: { email: body.userEmail },
        update: {}, // no updates if exists
        create: {
          email: body.userEmail,
          name: body.userName || body.userEmail.split('@')[0],
          role: 'END_USER',
          department: body.department || null,
        },
      })
      userId = targetUser.id
    }
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Either userId or userEmail must be provided' },
        { status: 400 }
      )
    }
    
    // Validate required fields
    if (!body.title || typeof body.title !== 'string' || body.title.trim() === '') {
      return NextResponse.json(
        { error: 'Title is required and must be a non-empty string' },
        { status: 400 }
      )
    }
    if (!body.description || typeof body.description !== 'string' || body.description.trim() === '') {
      return NextResponse.json(
        { error: 'Description is required and must be a non-empty string' },
        { status: 400 }
      )
    }
    
    // Convert priority to uppercase enum value
    const priority = body.priority ? body.priority.toUpperCase() : Priority.MEDIUM
    if (!Object.values(Priority).includes(priority as Priority)) {
      return NextResponse.json(
        { error: 'Invalid priority value' },
        { status: 400 }
      )
    }
    
    // Validate status
    const status = body.status ? body.status.toUpperCase() : TicketStatus.NEW
    if (!Object.values(TicketStatus).includes(status as TicketStatus)) {
      return NextResponse.json(
        { error: 'Invalid status value' },
        { status: 400 }
      )
    }
    
    // Validate source
    const source = body.source ? body.source.toUpperCase() : TicketSource.PORTAL
    if (!Object.values(TicketSource).includes(source as TicketSource)) {
      return NextResponse.json(
        { error: 'Invalid source value' },
        { status: 400 }
      )
    }
    
    // Validate impact
    const impact = body.impact ? body.impact.toUpperCase() : ImpactLevel.LOW
    if (!Object.values(ImpactLevel).includes(impact as ImpactLevel)) {
      return NextResponse.json(
        { error: 'Invalid impact value' },
        { status: 400 }
      )
    }
    
    // Validate urgency
    const urgency = body.urgency ? body.urgency.toUpperCase() : UrgencyLevel.LOW
    if (!Object.values(UrgencyLevel).includes(urgency as UrgencyLevel)) {
      return NextResponse.json(
        { error: 'Invalid urgency value' },
        { status: 400 }
      )
    }
    
    // Validate tags is an array (if provided)
    let tags = []
    if (body.tags) {
      if (!Array.isArray(body.tags)) {
        return NextResponse.json(
          { error: 'Tags must be an array' },
          { status: 400 }
        )
      }
      tags = body.tags
    }
    
    const ticket = await prisma.ticket.create({
      data: {
        title: body.title.trim(),
        description: body.description.trim(),
        userId,
        priority,
        status,
        category: body.category?.trim() || null,
        tags: JSON.stringify(tags),
        source,
        impact,
        urgency,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    })
    
    return NextResponse.json(ticket, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to create ticket', details: String(error) }, { status: 500 })
  }
}