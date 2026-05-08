"use server"

import * as fs from 'fs/promises'
import * as path from 'path'
import { revalidatePath } from 'next/cache'
import { prisma } from "@/lib/prisma"
import { AssetType, AssetStatus } from "@/lib/generated/prisma/enums"
import { requireServerActionAuth } from "@/lib/auth/server-actions"

const assetsFilePath = path.join(process.cwd(), 'assets.json')

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

const mapDisplayTypeToAssetType = (type: string): AssetType => {
  const normalized = type.trim().toLowerCase()
  switch (normalized) {
    case "laptop":
      return AssetType.LAPTOP
    case "desktop":
      return AssetType.DESKTOP
    case "monitor":
      return AssetType.MONITOR
    case "phone":
    case "mobile":
      return AssetType.PHONE
    case "printer":
      return AssetType.PRINTER
    case "software":
      return AssetType.SOFTWARE
    case "server":
      return AssetType.SERVER
    case "network":
    case "network device":
      return AssetType.NETWORK
    default:
      return AssetType.OTHER
  }
}

const mapDisplayStatusToAssetStatus = (status: string): AssetStatus => {
  const normalized = status.trim().toLowerCase()
  switch (normalized) {
    case "active":
      return AssetStatus.ACTIVE
    case "inactive":
    case "in storage":
      return AssetStatus.INACTIVE
    case "maintenance":
      return AssetStatus.MAINTENANCE
    case "retired":
      return AssetStatus.RETIRED
    case "lost":
    case "damaged":
      return AssetStatus.LOST
    default:
      return AssetStatus.ACTIVE
  }
}

// Hilfsfunktionen
async function readAssets() {
  try {
    const data = await fs.readFile(assetsFilePath, 'utf-8')
    return JSON.parse(data)
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // Datei existiert nicht, leeres Array zurückgeben
      return []
    }
    console.error('Error reading assets:', error)
    return []
  }
}

async function writeAssets(assets: any[]) {
  await fs.writeFile(assetsFilePath, JSON.stringify(assets, null, 2), 'utf-8')
}

// Typdefinitionen
export interface AssetInput {
  name: string
  type: string
  status: string
  assignedTo?: string
  location: string
  warranty?: string
  serialNumber?: string
  purchaseDate?: string
  purchasePrice?: number
  department?: string
  notes?: string
}

// Asset-Funktionen
export async function getAssets() {
  await requireServerActionAuth({ permissions: ["assets.view"] })
  try {
    const assets = await prisma.asset.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
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

    return formattedAssets
  } catch (error) {
    console.error('Error fetching assets from database:', error)
    // Fallback to JSON file if database fails
    const assets = await readAssets()
    // Sortiere nach Datum (neueste zuerst)
    return assets.sort((a: any, b: any) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }
}

export async function getAssetById(id: string) {
  await requireServerActionAuth({ permissions: ["assets.view"] })
  try {
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
      },
    })

    if (!asset) return null

    let warranty = 'N/A'
    if (asset.warrantyEnd) {
      const today = new Date()
      const warrantyDate = new Date(asset.warrantyEnd)
      warranty = warrantyDate < today ? 'Expired' : warrantyDate.toISOString().split('T')[0]
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
      department: null,
      purchasePrice: null,
    }
  } catch (error) {
    console.error('Error fetching asset by id from database:', error)
    const assets = await readAssets()
    return assets.find((asset: any) => asset.id === id)
  }
}

export async function createAsset(data: AssetInput) {
  await requireServerActionAuth({ permissions: ["assets.create"] })
  // Validierung
  if (!data.name.trim()) {
    throw new Error("Asset name is required")
  }
  if (!data.type.trim()) {
    throw new Error("Asset type is required")
  }
  if (!data.status.trim()) {
    throw new Error("Asset status is required")
  }
  if (!data.location.trim()) {
    throw new Error("Asset location is required")
  }

  // ID generieren
  const { randomUUID } = await import('crypto')
  const id = `AST-${(await readAssets()).length + 1}`.padStart(7, '0')
  
  const now = new Date().toISOString()
  const asset = {
    id,
    ...data,
    createdAt: now,
    updatedAt: now
  }
  
  // Asset speichern
  const assets = await readAssets()
  assets.push(asset)
  await writeAssets(assets)
  
  // Cache revalidieren
  revalidatePath('/assets')
  
  return asset
}

export async function updateAsset(id: string, data: Partial<AssetInput>) {
  await requireServerActionAuth({ permissions: ["assets.update"] })
  try {
    const existing = await prisma.asset.findUnique({ where: { id } })
    if (!existing) {
      throw new Error('Asset not found')
    }

    const updated = await prisma.asset.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.type !== undefined ? { type: mapDisplayTypeToAssetType(data.type) } : {}),
        ...(data.status !== undefined ? { status: mapDisplayStatusToAssetStatus(data.status) } : {}),
        ...(data.location !== undefined ? { location: data.location } : {}),
        ...(data.serialNumber !== undefined ? { serialNumber: data.serialNumber } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
        ...(data.purchaseDate !== undefined
          ? { purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null }
          : {}),
        ...(data.warranty !== undefined
          ? { warrantyEnd: data.warranty ? new Date(data.warranty) : null }
          : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      },
    })

    revalidatePath('/assets')
    revalidatePath(`/assets/${id}`)

    return {
      id: updated.id,
      name: updated.name,
      type: mapAssetTypeToDisplay(updated.type),
      status: mapAssetStatusToDisplay(updated.status),
      assignedTo: updated.user?.name || updated.user?.email || 'Unassigned',
      location: updated.location || '',
      warranty: updated.warrantyEnd ? updated.warrantyEnd.toISOString().split('T')[0] : 'N/A',
      serialNumber: updated.serialNumber,
      purchaseDate: updated.purchaseDate ? updated.purchaseDate.toISOString().split('T')[0] : '',
      notes: updated.notes,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    }
  } catch (error) {
    console.error('Error updating asset in database:', error)
    const assets = await readAssets()
    const assetIndex = assets.findIndex((asset: any) => asset.id === id)

    if (assetIndex === -1) {
      throw new Error('Asset not found')
    }

    const updatedAsset = {
      ...assets[assetIndex],
      ...data,
      updatedAt: new Date().toISOString()
    }

    assets[assetIndex] = updatedAsset
    await writeAssets(assets)
    revalidatePath('/assets')
    return updatedAsset
  }
}

export async function deleteAsset(id: string) {
  await requireServerActionAuth({ permissions: ["assets.delete"] })
  try {
    await prisma.asset.delete({ where: { id } })
    revalidatePath('/assets')
    return true
  } catch (error) {
    console.error('Error deleting asset in database:', error)
    const assets = await readAssets()
    const filteredAssets = assets.filter((asset: any) => asset.id !== id)

    if (filteredAssets.length === assets.length) {
      throw new Error('Asset not found')
    }

    await writeAssets(filteredAssets)
    revalidatePath('/assets')
    return true
  }
}

// Statistik-Funktionen
export async function getAssetStats() {
  await requireServerActionAuth({ permissions: ["assets.view"] })
  try {
    const assets = await prisma.asset.findMany()
    const now = new Date()
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    
    const totalAssets = assets.length
    const createdThisMonth = assets.filter((asset) => asset.createdAt >= startOfCurrentMonth).length
    const createdLastMonth = assets.filter(
      (asset) => asset.createdAt >= startOfPreviousMonth && asset.createdAt < startOfCurrentMonth
    ).length
    const monthlyAssetDelta = createdThisMonth - createdLastMonth
    const activeAssets = assets.filter(asset => asset.status === AssetStatus.ACTIVE).length
    const underWarranty = assets.filter(asset => {
      if (!asset.warrantyEnd) return false
      const warrantyDate = new Date(asset.warrantyEnd)
      return warrantyDate > now
    }).length
    
    const maintenanceAssets = assets.filter(asset => 
      asset.status === AssetStatus.MAINTENANCE
    ).length
    
    // Berechne expiring soon (innerhalb der nächsten 30 Tage)
    const expiringSoon = assets.filter(asset => {
      if (!asset.warrantyEnd) return false
      try {
        const warrantyDate = new Date(asset.warrantyEnd)
        const today = new Date()
        const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
        return warrantyDate > today && warrantyDate <= thirtyDaysFromNow
      } catch {
        return false
      }
    }).length
    
    return {
      totalAssets,
      monthlyAssetDelta,
      activeAssets,
      underWarranty,
      maintenanceAssets,
      expiringSoon
    }
  } catch (error) {
    console.error('Error fetching asset stats from database:', error)
    // Fallback to JSON file if database fails
    const assets = await readAssets()
    const now = new Date()
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    
    const totalAssets = assets.length
    const createdThisMonth = assets.filter((asset: any) => {
      const createdAt = new Date(asset.createdAt)
      return !Number.isNaN(createdAt.getTime()) && createdAt >= startOfCurrentMonth
    }).length
    const createdLastMonth = assets.filter((asset: any) => {
      const createdAt = new Date(asset.createdAt)
      return !Number.isNaN(createdAt.getTime()) && createdAt >= startOfPreviousMonth && createdAt < startOfCurrentMonth
    }).length
    const monthlyAssetDelta = createdThisMonth - createdLastMonth
    const activeAssets = assets.filter((asset: any) => asset.status === 'Active').length
    const underWarranty = assets.filter((asset: any) => {
      if (asset.warranty === 'Expired') return false
      if (!asset.warranty || asset.warranty === 'N/A') return false
      const warrantyDate = new Date(asset.warranty)
      const today = new Date()
      return warrantyDate > today
    }).length
    
    const maintenanceAssets = assets.filter((asset: any) => 
      asset.status === 'Maintenance'
    ).length
    
    // Berechne expiring soon (innerhalb der nächsten 30 Tage)
    const expiringSoon = assets.filter((asset: any) => {
      if (!asset.warranty || asset.warranty === 'Expired' || asset.warranty === 'N/A') return false
      try {
        const warrantyDate = new Date(asset.warranty)
        const today = new Date()
        const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
        return warrantyDate > today && warrantyDate <= thirtyDaysFromNow
      } catch {
        return false
      }
    }).length
    
    return {
      totalAssets,
      monthlyAssetDelta,
      activeAssets,
      underWarranty,
      maintenanceAssets,
      expiringSoon
    }
  }
}