import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/auth/middleware"
import { AssetType, AssetStatus, Role } from "@/lib/generated/prisma/enums"
import { searchSchema } from "@/lib/validation/schemas"
import { getRequestLogger } from "@/lib/logging/middleware"
import { z, ZodError } from 'zod'

export const runtime = 'nodejs'

// Extended search schema for assets
const assetSearchSchema = searchSchema.extend({
  type: z.nativeEnum(AssetType).optional(),
  status: z.nativeEnum(AssetStatus).optional(),
  location: z.string().max(100).optional(),
  assignedTo: z.string().uuid('Invalid user ID').optional(),
  search: z.string().max(200).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  sort: z.string().optional(),
})

// Schema for creating/updating assets
const assetCreateSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  type: z.nativeEnum(AssetType),
  status: z.nativeEnum(AssetStatus).default(AssetStatus.ACTIVE),
  serialNumber: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  purchaseDate: z.string().datetime().optional().nullable(),
  warrantyEnd: z.string().datetime().optional().nullable(),
  licenseKey: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  userId: z.string().uuid('Invalid user ID').optional().nullable(),
})

// Mapping functions for display values
const mapAssetTypeToDisplay = (type: AssetType): string => {
  const mapping: Record<AssetType, string> = {
    [AssetType.LAPTOP]: 'Laptop',
    [AssetType.DESKTOP]: 'Desktop',
    [AssetType.MONITOR]: 'Monitor',
    [AssetType.PHONE]: 'Phone',
    [AssetType.PRINTER]: 'Printer',
    [AssetType.SOFTWARE]: 'Software',
    [AssetType.SERVER]: 'Server',
    [AssetType.NETWORK]: 'Network',
    [AssetType.OTHER]: 'Other',
  }
  return mapping[type] || type
}

const mapAssetStatusToDisplay = (status: AssetStatus): string => {
  const mapping: Record<AssetStatus, string> = {
    [AssetStatus.ACTIVE]: 'Active',
    [AssetStatus.INACTIVE]: 'Inactive',
    [AssetStatus.MAINTENANCE]: 'Maintenance',
    [AssetStatus.RETIRED]: 'Retired',
    [AssetStatus.LOST]: 'Lost',
  }
  return mapping[status] || status
}

export async function GET(request: Request) {
  // Convert Request to NextRequest for middleware compatibility
  const nextRequest = new NextRequest(request.url, request)
  const logger = getRequestLogger(nextRequest)
  
  try {
    console.log('GET /api/assets called', new Date().toISOString())
    logger.info('Fetching assets', {
      category: 'api',
      operation: 'assets_list',
      query: Object.fromEntries(nextRequest.nextUrl.searchParams.entries()),
    })
    
    // Check authentication and authorization
    const authResult = await withAuth({ 
      permissions: ['assets.view']
    })(nextRequest)
    if (authResult instanceof NextResponse) {
      logger.warn('Authentication/authorization failed for assets list', {
        category: 'auth',
        event: 'auth_failure',
      })
      return authResult
    }
    
    const { user } = authResult
    
    logger.debug('User authenticated for assets list', {
      category: 'auth',
      userId: user!.id,
      userRole: user!.role,
    })
    
    // Validate query parameters
    const url = new URL(request.url)
    const validatedParams = assetSearchSchema.parse({
      query: url.searchParams.get('search') || undefined,
      page: parseInt(url.searchParams.get('page') || '1'),
      limit: parseInt(url.searchParams.get('limit') || '50'),
      sortBy: url.searchParams.get('sort') || 'createdAt',
      sortOrder: url.searchParams.get('sortOrder') || 'desc',
      type: url.searchParams.get('type') as AssetType || undefined,
      status: url.searchParams.get('status') as AssetStatus || undefined,
      location: url.searchParams.get('location') || undefined,
      assignedTo: url.searchParams.get('assignedTo') || undefined,
      startDate: url.searchParams.get('startDate') || undefined,
      endDate: url.searchParams.get('endDate') || undefined,
    })
    
    const { 
      limit, 
      page, 
      type, 
      status, 
      location, 
      assignedTo, 
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
      // END_USER can only see assets assigned to them
      whereClause.userId = user!.id
      // END_USER should not use assignedTo filter - they can only see their own assets
      // So we ignore any assignedTo parameter for END_USER
    } else if (assignedTo) {
      // For AGENT/ADMIN, filter by assigned user
      whereClause.userId = assignedTo
    }
    
    // Add filters with validation
    if (type) {
      whereClause.type = type
    }
    if (status) {
      whereClause.status = status
    }
    if (location) {
      whereClause.location = { contains: location, mode: 'insensitive' }
    }
    
    // Date range filter with validation (on createdAt)
    if (startDate || endDate) {
      whereClause.createdAt = {}
      if (startDate) {
        whereClause.createdAt.gte = new Date(startDate)
      }
      if (endDate) {
        whereClause.createdAt.lte = new Date(endDate)
      }
    }
    
    // Search filter (name or serialNumber)
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { serialNumber: { contains: search, mode: 'insensitive' } },
      ]
    }
    
    // Get total count for pagination
    const countStartTime = Date.now()
    const total = await prisma.asset.count({ where: whereClause })
    const countDuration = Date.now() - countStartTime
    
    logger.debug('Asset count query executed', {
      category: 'database',
      operation: 'asset_count',
      duration: countDuration,
      whereClause,
    })
    
    // Build orderBy clause
    const orderBy: any = {}
    const allowedSortFields = ['name', 'type', 'status', 'createdAt', 'updatedAt', 'purchaseDate', 'warrantyEnd']
    if (allowedSortFields.includes(sortBy)) {
      orderBy[sortBy] = sortOrder
    } else {
      orderBy.createdAt = 'desc' // Default sorting
    }
    
    // Fetch assets with pagination and validation
    const findStartTime = Date.now()
    const assets = await prisma.asset.findMany({
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
          }
        }
      }
    })
    const findDuration = Date.now() - findStartTime
    
    logger.debug('Asset findMany query executed', {
      category: 'database',
      operation: 'asset_find_many',
      duration: findDuration,
      skip,
      take: limit,
      assetsCount: assets.length,
    })
    
    // Format assets for frontend
    const formattedAssets = assets.map(asset => {
      let warranty = 'N/A'
      if (asset.warrantyEnd) {
        const today = new Date()
        const warrantyDate = new Date(asset.warrantyEnd)
        if (warrantyDate < today) {
          warranty = 'Expired'
        } else {
          warranty = warrantyDate.toISOString().split('T')[0] // YYYY-MM-DD
        }
      }
      
      return {
        id: asset.id,
        name: asset.name,
        type: mapAssetTypeToDisplay(asset.type),
        status: mapAssetStatusToDisplay(asset.status),
        assignedTo: asset.user?.name || asset.user?.email || 'Unassigned',
        location: asset.location || '',
        warranty,
        serialNumber: asset.serialNumber,
        purchaseDate: asset.purchaseDate ? asset.purchaseDate.toISOString().split('T')[0] : '',
        notes: asset.notes,
        createdAt: asset.createdAt,
        updatedAt: asset.updatedAt,
      }
    })
    
    const responseData = {
      assets: formattedAssets,
      userRole: user!.role,
      total,
      pagination: {
        skip,
        limit,
        hasMore: skip + limit < total
      }
    }
    
    logger.info('Assets fetched successfully', {
      category: 'api',
      operation: 'assets_list',
      userId: user!.id,
      userRole: user!.role,
      assetsCount: assets.length,
      totalCount: total,
      page,
      limit,
    })
    
    return NextResponse.json(responseData)
  } catch (error) {
    console.error("GET /api/assets error:", error)
    
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
      error: "Failed to fetch assets",
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    }, { status: 500 })
  }
}

export async function POST(request: Request) {
  // Convert Request to NextRequest for middleware compatibility
  const nextRequest = new NextRequest(request.url, request)
  const logger = getRequestLogger(nextRequest)
  
  try {
    logger.info('Creating asset', {
      category: 'api',
      operation: 'asset_create',
    })
    
    // Check authentication and authorization
    const authResult = await withAuth({ 
      permissions: ['assets.create']
    })(nextRequest)
    if (authResult instanceof NextResponse) {
      logger.warn('Authentication/authorization failed for asset creation', {
        category: 'auth',
        event: 'auth_failure',
      })
      return authResult
    }
    
    const { user } = authResult
    
    logger.debug('User authenticated for asset creation', {
      category: 'auth',
      userId: user!.id,
      userRole: user!.role,
    })
    
    // Parse and validate request body
    const body = await request.json()
    const validatedData = assetCreateSchema.parse(body)
    
    // Prepare data for Prisma
    const createData: any = {
      name: validatedData.name,
      type: validatedData.type,
      status: validatedData.status,
      serialNumber: validatedData.serialNumber,
      location: validatedData.location,
      purchaseDate: validatedData.purchaseDate ? new Date(validatedData.purchaseDate) : null,
      warrantyEnd: validatedData.warrantyEnd ? new Date(validatedData.warrantyEnd) : null,
      licenseKey: validatedData.licenseKey,
      notes: validatedData.notes,
    }
    
    // Only set userId if provided (assign asset to user)
    if (validatedData.userId) {
      // Verify user exists
      const assignedUser = await prisma.user.findUnique({
        where: { id: validatedData.userId },
      })
      if (!assignedUser) {
        return NextResponse.json({
          success: false,
          error: "Invalid user ID",
          message: "The specified user does not exist",
          timestamp: new Date().toISOString(),
        }, { status: 404 })
      }
      createData.userId = validatedData.userId
    }
    
    // Create asset
    const createStartTime = Date.now()
    const asset = await prisma.asset.create({
      data: createData,
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
    const createDuration = Date.now() - createStartTime
    
    logger.debug('Asset created in database', {
      category: 'database',
      operation: 'asset_create',
      duration: createDuration,
      assetId: asset.id,
    })
    
    // Format asset for frontend
    let warranty = 'N/A'
    if (asset.warrantyEnd) {
      const today = new Date()
      const warrantyDate = new Date(asset.warrantyEnd)
      warranty = warrantyDate < today ? 'Expired' : warrantyDate.toISOString().split('T')[0]
    }
    
    const formattedAsset = {
      id: asset.id,
      name: asset.name,
      type: mapAssetTypeToDisplay(asset.type),
      status: mapAssetStatusToDisplay(asset.status),
      assignedTo: asset.user?.name || asset.user?.email || 'Unassigned',
      location: asset.location || '',
      warranty,
      serialNumber: asset.serialNumber,
      purchaseDate: asset.purchaseDate ? asset.purchaseDate.toISOString().split('T')[0] : '',
      notes: asset.notes,
      createdAt: asset.createdAt,
      updatedAt: asset.updatedAt,
    }
    
    logger.info('Asset created successfully', {
      category: 'api',
      operation: 'asset_create',
      assetId: asset.id,
      userId: user!.id,
    })
    
    return NextResponse.json(formattedAsset, { status: 201 })
  } catch (error) {
    console.error("POST /api/assets error:", error)
    
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
    
    // Handle unique constraint violation (e.g., duplicate serialNumber)
    if (error instanceof Error && error.message.includes('Unique constraint failed')) {
      return NextResponse.json({
        success: false,
        error: 'Duplicate entry',
        message: 'An asset with this serial number already exists',
        timestamp: new Date().toISOString(),
      }, { status: 409 })
    }
    
    // Handle other errors
    return NextResponse.json({
      success: false,
      error: "Failed to create asset",
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    }, { status: 500 })
  }
}