"use server"

import fs from 'fs/promises'
import path from 'path'
import { revalidatePath } from 'next/cache'

const assetsFilePath = path.join(process.cwd(), 'assets.json')

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
  const assets = await readAssets()
  // Sortiere nach Datum (neueste zuerst)
  return assets.sort((a: any, b: any) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

export async function getAssetById(id: string) {
  const assets = await readAssets()
  return assets.find((asset: any) => asset.id === id)
}

export async function createAsset(data: AssetInput) {
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
  const assets = await readAssets()
  const assetIndex = assets.findIndex((asset: any) => asset.id === id)
  
  if (assetIndex === -1) {
    throw new Error('Asset not found')
  }
  
  // Asset aktualisieren
  const updatedAsset = {
    ...assets[assetIndex],
    ...data,
    updatedAt: new Date().toISOString()
  }
  
  assets[assetIndex] = updatedAsset
  await writeAssets(assets)
  
  // Cache revalidieren
  revalidatePath('/assets')
  
  return updatedAsset
}

export async function deleteAsset(id: string) {
  const assets = await readAssets()
  const filteredAssets = assets.filter((asset: any) => asset.id !== id)
  
  if (filteredAssets.length === assets.length) {
    throw new Error('Asset not found')
  }
  
  await writeAssets(filteredAssets)
  revalidatePath('/assets')
  
  return true
}

// Statistik-Funktionen
export async function getAssetStats() {
  const assets = await readAssets()
  
  const totalAssets = assets.length
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
    activeAssets,
    underWarranty,
    maintenanceAssets,
    expiringSoon
  }
}