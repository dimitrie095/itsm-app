import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/auth/middleware"
import { checkApiAuth } from "@/lib/api-auth-new"
import { Role, TicketStatus, Priority, TicketSource, ImpactLevel, UrgencyLevel } from "@/lib/generated/prisma/enums"
import { searchSchema } from "@/lib/validation/schemas"
import { getRequestLogger } from "@/lib/logging/middleware"
import { z, ZodError } from 'zod'

export const runtime = 'nodejs'

// Extended search schema for tickets
const ticketSearchSchema = searchSchema.extend({
  status: z.nativeEnum(TicketStatus).optional(),
  priority: z.nativeEnum(Priority).optional(),
  category: z.string().max(50).optional(),
  assigned: z.enum(['me', 'unassigned', 'assigned']).optional(),
  search: z.string().max(200).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  sort: z.string().optional(),
})

export async function GET(request: Request) {
  // Convert Request to NextRequest for middleware compatibility
  const nextRequest = new NextRequest(request.url, request)
  const logger = getRequestLogger(nextRequest)
  
  try {
    logger.info('Fetching tickets', {
      category: 'api',
      operation: 'tickets_list',
      query: Object.fromEntries(nextRequest.nextUrl.searchParams.entries()),
    })
    
    // Check authentication
    const authResult = await withAuth()(nextRequest)
    if (authResult instanceof NextResponse) {
      logger.warn('Authentication failed for tickets list', {
        category: 'auth',
        event: 'auth_failure',
      })
      return authResult
    }
    
    const { user } = authResult
    
    logger.debug('User authenticated for tickets list', {
      category: 'auth',
      userId: user!.id,
      userRole: user!.role,
    })
    
    // Validate query parameters
    const url = new URL(request.url)
    const validatedParams = ticketSearchSchema.parse({
      query: url.searchParams.get('search') || undefined,
      page: parseInt(url.searchParams.get('page') || '1'),
      limit: parseInt(url.searchParams.get('limit') || '50'),
      sortBy: url.searchParams.get('sort') || 'createdAt',
      sortOrder: url.searchParams.get('sortOrder') || 'desc',
      status: url.searchParams.get('status') as TicketStatus || undefined,
      priority: url.searchParams.get('priority') as Priority || undefined,
      category: url.searchParams.get('category') || undefined,
      assigned: url.searchParams.get('assigned') as any || undefined,
      startDate: url.searchParams.get('startDate') || undefined,
      endDate: url.searchParams.get('endDate') || undefined,
    })
    
    const { 
      limit, 
      page, 
      status, 
      priority, 
      category, 
      assigned, 
      search, 
      startDate, 
      endDate,
      sortBy,
      sortOrder
    } = validatedParams
    
    // Calculate skip for pagination
    const skip = (page - 1) * limit
    
    // Build where clause based on user role
    let whereClause: any = {}
    
    if (user!.role === Role.END_USER) {
      // END_USER can only see their own tickets
      whereClause.userId = user!.id
      // END_USER should not use assigned filters - they can only see tickets they created
      // So we ignore any assigned parameter for END_USER
    } else if (user!.role === Role.AGENT && assigned === 'me') {
      // AGENT can filter to tickets assigned to them
      whereClause.assignedToId = user!.id
    }
    
    // Add filters with validation
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
    if (user!.role !== Role.END_USER && assigned && assigned !== 'me') {
      if (assigned === 'unassigned') {
        whereClause.assignedToId = null
      } else if (assigned === 'assigned') {
        whereClause.assignedToId = { not: null }
      }
    }
    
    // Date range filter with validation
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
    const countStartTime = Date.now()
    const total = await prisma.ticket.count({ where: whereClause })
    const countDuration = Date.now() - countStartTime
    
    logger.debug('Ticket count query executed', {
      category: 'database',
      operation: 'ticket_count',
      duration: countDuration,
      whereClause,
    })
    
    // Build orderBy clause
    const orderBy: any = {}
    if (sortBy === 'createdAt' || sortBy === 'updatedAt' || sortBy === 'priority' || sortBy === 'status') {
      orderBy[sortBy] = sortOrder
    } else {
      orderBy.createdAt = 'desc' // Default sorting
    }
    
    // Fetch tickets with pagination and validation
    const findStartTime = Date.now()
    const tickets = await prisma.ticket.findMany({
      where: whereClause,
      skip: Math.max(0, skip),
      take: Math.min(Math.max(1, limit), 100), // Cap at 100, min 1
      orderBy,
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
    const findDuration = Date.now() - findStartTime
    
    logger.debug('Ticket findMany query executed', {
      category: 'database',
      operation: 'ticket_find_many',
      duration: findDuration,
      skip,
      take: limit,
      ticketsCount: tickets.length,
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
    
    const responseData = {
      tickets: ticketsWithParsedTags,
      userRole: user!.role,
      total,
      pagination: {
        skip,
        limit,
        hasMore: skip + limit < total
      }
    }
    
    logger.info('Tickets fetched successfully', {
      category: 'api',
      operation: 'tickets_list',
      userId: user!.id,
      userRole: user!.role,
      ticketsCount: tickets.length,
      totalCount: total,
      page,
      limit,
    })
    
    return NextResponse.json(responseData)
  } catch (error) {
    console.error("GET /api/tickets error:", error)
    
    // Handle validation errors
    if (error instanceof ZodError) {
      const issues = (error as ZodError).issues.map(err => ({
        path: err.path.join('.'),
        message: err.message,
      }))
      
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: issues,
        timestamp: new Date().toISOString(),
      }, { status: 400 })
    }
    
    // Handle other errors
    return NextResponse.json({
      success: false,
      error: "Failed to fetch tickets",
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
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
    
    // Validate request body
    const body = await request.json()
    const { ticketCreateSchema } = await import('@/lib/validation/schemas')
    
    // Create validation schema based on user role
    const createTicketSchema = ticketCreateSchema.extend({
      userEmail: z.string().email().optional(),
      userName: z.string().optional(),
      tags: z.array(z.string()).optional(),
      assetId: z.string().uuid().optional().nullable(),
      slaId: z.string().uuid().optional().nullable(),
    })
    
    // Validate the request body
    const validatedData = createTicketSchema.parse(body)
    
    // Check if user has permission to create tickets
    const userPermissions = ((session?.user as any)?.permissions as string[]) || []
    const canCreateTicket = userPermissions.includes('tickets.create')
    
    if (!canCreateTicket) {
      return NextResponse.json(
        { error: 'Forbidden: Cannot create tickets' },
        { status: 403 }
      )
    }
    
    // END_USER can only create tickets for themselves
    let userId = validatedData.userId
    if (user!.role === Role.END_USER) {
      if (userId && userId !== user!.id) {
        return NextResponse.json(
          { error: 'Forbidden: Cannot create tickets for other users' },
          { status: 403 }
        )
      }
      userId = user!.id
    } else if (!userId && validatedData.userEmail) {
      // Find or create user by email (only allowed for ADMIN/AGENT)
      const targetUser = await prisma.user.upsert({
        where: { email: validatedData.userEmail },
        update: {}, // no updates if exists
        create: {
          email: validatedData.userEmail,
          name: validatedData.userName || validatedData.userEmail.split('@')[0],
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
    
    // Use validated data (already validated by Zod)
    const priority = validatedData.priority ? validatedData.priority.toUpperCase() as Priority : Priority.MEDIUM
    const status = TicketStatus.NEW
    const source = TicketSource.PORTAL
    
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
        title: validatedData.title.trim(),
        description: validatedData.description.trim(),
        userId,
        assignedToId: validatedData.assignedToId || null,
        assetId: validatedData.assetId || null,
        slaId: validatedData.slaId || null,
        priority,
        status,
        category: validatedData.category?.trim() || null,
        tags: JSON.stringify(validatedData.tags || []),
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
    console.error('POST /api/tickets error:', error)
    
    // Handle validation errors
    if (error instanceof ZodError) {
      const issues = (error as ZodError).issues.map(err => ({
        path: err.path.join('.'),
        message: err.message,
      }))
      
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: issues,
        timestamp: new Date().toISOString(),
      }, { status: 400 })
    }
    
    // Handle other errors
    return NextResponse.json({ 
      success: false,
      error: 'Failed to create ticket', 
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    }, { status: 500 })
  }
}