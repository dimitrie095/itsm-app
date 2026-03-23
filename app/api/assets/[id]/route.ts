import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/auth/middleware"
import { AssetType, AssetStatus, Role } from "@/lib/generated/prisma/enums"
import { getRequestLogger } from "@/lib/logging/middleware"
import { z, ZodError } from 'zod'

export const runtime = 'nodejs'

// Mapping functions for display values (same as parent route)
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

// Schema for updating assets (partial)
const assetUpdateSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100).optional(),
  type: z.nativeEnum(AssetType).optional(),
  status: z.nativeEnum(AssetStatus).optional(),
  serialNumber: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  purchaseDate: z.string().datetime().optional().nullable(),
  warrantyEnd: z.string().datetime().optional().nullable(),
  licenseKey: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  userId: z.string().uuid('Invalid user ID').optional().nullable(),
})

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  // Convert Request to NextRequest for middleware compatibility
  const nextRequest = new NextRequest(request.url, request)
  const logger = getRequestLogger(nextRequest)
  
  try {
    const id = params.id
    logger.info('Fetching asset', {
      category: 'api',
      operation: 'asset_get',
      assetId: id,
    })
    
    // Check authentication and authorization
    const authResult = await withAuth({ 
      permissions: ['assets.view']
    })(nextRequest)
    if (authResult instanceof NextResponse) {
      logger.warn('Authentication/authorization failed for asset fetch', {
        category: 'auth',
        event: 'auth_failure',
      })
      return authResult
    }
    
    const { user } = authResult
    
    logger.debug('User authenticated for asset fetch', {
      category: 'auth',
      userId: user!.id,
      userRole: user!.role,
    })
    
    // Fetch asset
    const asset = await prisma.asset.findUnique({
      where: { id },
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
    
    if (!asset) {
      logger.warn('Asset not found', {
        category: 'api',
        operation: 'asset_get',
        assetId: id,
      })
      return NextResponse.json({
        success: false,
        error: 'Not Found',
        message: 'Asset not found',
        timestamp: new Date().toISOString(),
      }, { status: 404 })
    }
    
    // Ownership check: END_USER can only view assets assigned to them
    if (user!.role === Role.END_USER && asset.userId !== user!.id) {
      logger.warn('END_USER attempted to access asset not assigned to them', {
        category: 'auth',
        userId: user!.id,
        assetId: id,
      })
      return NextResponse.json({
        success: false,
        error: 'Forbidden',
        message: 'You do not have permission to view this asset',
        timestamp: new Date().toISOString(),
      }, { status: 403 })
    }
    
    // Format asset for frontend
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
    
    logger.info('Asset fetched successfully', {
      category: 'api',
      operation: 'asset_get',
      assetId: id,
      userId: user!.id,
    })
    
    return NextResponse.json(formattedAsset)
  } catch (error) {
    console.error("GET /api/assets/[id] error:", error)
    
    // Handle other errors
    return NextResponse.json({
      success: false,
      error: "Failed to fetch asset",
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  // Convert Request to NextRequest for middleware compatibility
  const nextRequest = new NextRequest(request.url, request)
  const logger = getRequestLogger(nextRequest)
  
  try {
    const id = params.id
    logger.info('Updating asset', {
      category: 'api',
      operation: 'asset_update',
      assetId: id,
    })
    
    // Check authentication and authorization
    const authResult = await withAuth({ 
      permissions: ['assets.update']
    })(nextRequest)
    if (authResult instanceof NextResponse) {
      logger.warn('Authentication/authorization failed for asset update', {
        category: 'auth',
        event: 'auth_failure',
      })
      return authResult
    }
    
    const { user } = authResult
    
    logger.debug('User authenticated for asset update', {
      category: 'auth',
      userId: user!.id,
      userRole: user!.role,
    })
    
    // Parse and validate request body
    const body = await request.json()
    const validatedData = assetUpdateSchema.parse(body)
    
    // Check if asset exists and user has permission
    const existingAsset = await prisma.asset.findUnique({
      where: { id },
      select: { id: true, userId: true }
    })
    
    if (!existingAsset) {
      logger.warn('Asset not found for update', {
        category: 'api',
        operation: 'asset_update',
        assetId: id,
      })
      return NextResponse.json({
        success: false,
        error: 'Not Found',
        message: 'Asset not found',
        timestamp: new Date().toISOString(),
      }, { status: 404 })
    }
    
    // Ownership check: END_USER can only update assets assigned to them
    if (user!.role === Role.END_USER && existingAsset.userId !== user!.id) {
      logger.warn('END_USER attempted to update asset not assigned to them', {
        category: 'auth',
        userId: user!.id,
        assetId: id,
      })
      return NextResponse.json({
        success: false,
        error: 'Forbidden',
        message: 'You do not have permission to update this asset',
        timestamp: new Date().toISOString(),
      }, { status: 403 })
    }
    
    // Prepare update data
    const updateData: any = {}
    if (validatedData.name !== undefined) updateData.name = validatedData.name
    if (validatedData.type !== undefined) updateData.type = validatedData.type
    if (validatedData.status !== undefined) updateData.status = validatedData.status
    if (validatedData.serialNumber !== undefined) updateData.serialNumber = validatedData.serialNumber
    if (validatedData.location !== undefined) updateData.location = validatedData.location
    if (validatedData.purchaseDate !== undefined) {
      updateData.purchaseDate = validatedData.purchaseDate ? new Date(validatedData.purchaseDate) : null
    }
    if (validatedData.warrantyEnd !== undefined) {
      updateData.warrantyEnd = validatedData.warrantyEnd ? new Date(validatedData.warrantyEnd) : null
    }
    if (validatedData.licenseKey !== undefined) updateData.licenseKey = validatedData.licenseKey
    if (validatedData.notes !== undefined) updateData.notes = validatedData.notes
    if (validatedData.userId !== undefined) {
      if (validatedData.userId === null) {
        updateData.userId = null
      } else {
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
        updateData.userId = validatedData.userId
      }
    }
    
    // Update asset
    const updateStartTime = Date.now()
    const asset = await prisma.asset.update({
      where: { id },
      data: updateData,
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
    const updateDuration = Date.now() - updateStartTime
    
    logger.debug('Asset updated in database', {
      category: 'database',
      operation: 'asset_update',
      duration: updateDuration,
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
    
    logger.info('Asset updated successfully', {
      category: 'api',
      operation: 'asset_update',
      assetId: asset.id,
      userId: user!.id,
    })
    
    return NextResponse.json(formattedAsset)
  } catch (error) {
    console.error("PUT /api/assets/[id] error:", error)
    
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
      error: "Failed to update asset",
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  // Convert Request to NextRequest for middleware compatibility
  const nextRequest = new NextRequest(request.url, request)
  const logger = getRequestLogger(nextRequest)
  
  try {
    const id = params.id
    logger.info('Deleting asset', {
      category: 'api',
      operation: 'asset_delete',
      assetId: id,
    })
    
    // Check authentication and authorization
    const authResult = await withAuth({ 
      permissions: ['assets.delete']
    })(nextRequest)
    if (authResult instanceof NextResponse) {
      logger.warn('Authentication/authorization failed for asset deletion', {
        category: 'auth',
        event: 'auth_failure',
      })
      return authResult
    }
    
    const { user } = authResult
    
    logger.debug('User authenticated for asset deletion', {
      category: 'auth',
      userId: user!.id,
      userRole: user!.role,
    })
    
    // Check if asset exists and user has permission
    const existingAsset = await prisma.asset.findUnique({
      where: { id },
      select: { id: true, userId: true }
    })
    
    if (!existingAsset) {
      logger.warn('Asset not found for deletion', {
        category: 'api',
        operation: 'asset_delete',
        assetId: id,
      })
      return NextResponse.json({
        success: false,
        error: 'Not Found',
        message: 'Asset not found',
        timestamp: new Date().toISOString(),
      }, { status: 404 })
    }
    
    // Ownership check: END_USER can only delete assets assigned to them
    if (user!.role === Role.END_USER && existingAsset.userId !== user!.id) {
      logger.warn('END_USER attempted to delete asset not assigned to them', {
        category: 'auth',
        userId: user!.id,
        assetId: id,
      })
      return NextResponse.json({
        success: false,
        error: 'Forbidden',
        message: 'You do not have permission to delete this asset',
        timestamp: new Date().toISOString(),
      }, { status: 403 })
    }
    
    // Delete asset
    const deleteStartTime = Date.now()
    await prisma.asset.delete({
      where: { id },
    })
    const deleteDuration = Date.now() - deleteStartTime
    
    logger.debug('Asset deleted from database', {
      category: 'database',
      operation: 'asset_delete',
      duration: deleteDuration,
      assetId: id,
    })
    
    logger.info('Asset deleted successfully', {
      category: 'api',
      operation: 'asset_delete',
      assetId: id,
      userId: user!.id,
    })
    
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error("DELETE /api/assets/[id] error:", error)
    
    // Handle other errors
    return NextResponse.json({
      success: false,
      error: "Failed to delete asset",
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    }, { status: 500 })
  }
}