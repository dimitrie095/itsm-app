"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Trash2, AlertTriangle, Check, X } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { getAssetById, deleteAsset } from "../../actions"

export default function DeleteAssetPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)
  const [asset, setAsset] = useState<any>(null)

  // Asset-Daten laden
  useEffect(() => {
    const loadAsset = async () => {
      try {
        const { id } = await params
        const assetData = await getAssetById(id)
        
        if (!assetData) {
          toast.error("Asset not found")
          router.push("/assets")
          return
        }
        
        setAsset(assetData)
      } catch (error) {
        toast.error("Failed to load asset")
        console.error(error)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadAsset()
  }, [params, router])

  const handleDelete = async () => {
    setIsDeleting(true)
    
    try {
      const { id } = await params
      await deleteAsset(id)
      
      toast.success("Asset deleted successfully", {
        description: `"${asset?.name}" has been removed from the inventory.`,
      })
      
      // Zur Assets-Liste navigieren
      setTimeout(() => {
        router.push("/assets")
      }, 1500)
      
    } catch (error) {
      toast.error("Failed to delete asset", {
        description: error instanceof Error ? error.message : "Please try again.",
      })
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading asset...</p>
        </div>
      </div>
    )
  }

  if (!asset) {
    return null
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href={`/assets/${asset.id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Delete Asset</h1>
          <p className="text-muted-foreground">Permanently remove an asset from the inventory.</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Warning & Confirmation */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-destructive">Confirm Deletion</CardTitle>
            <CardDescription>This action cannot be undone.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
                <div>
                  <h4 className="font-semibold text-red-800">Warning</h4>
                  <p className="text-sm text-red-700 mt-1">
                    You are about to permanently delete this asset. All associated data will be removed and cannot be recovered.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Asset to be deleted:</h3>
              <div className="bg-muted/50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-medium text-lg">{asset.name}</p>
                    <p className="text-sm text-muted-foreground">Asset ID: {asset.id}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{asset.type}</p>
                    <p className="text-sm text-muted-foreground">{asset.status}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Serial Number</p>
                    <p className="font-medium">{asset.serialNumber || "Not specified"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Location</p>
                    <p className="font-medium">{asset.location}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Assigned To</p>
                    <p className="font-medium">{asset.assignedTo || "Unassigned"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Warranty</p>
                    <p className="font-medium">{asset.warranty || "N/A"}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-semibold">What will be deleted:</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <X className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                  <span>Asset record from inventory</span>
                </li>
                <li className="flex items-start gap-2">
                  <X className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                  <span>All associated metadata and history</span>
                </li>
                <li className="flex items-start gap-2">
                  <X className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                  <span>Warranty and purchase information</span>
                </li>
                <li className="flex items-start gap-2">
                  <X className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                  <span>Assignment and location tracking</span>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
              <CardDescription>Confirm or cancel deletion</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Button 
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="w-full"
                >
                  {isDeleting ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Asset Permanently
                    </>
                  )}
                </Button>

                <Button 
                  variant="outline" 
                  disabled={isDeleting}
                  className="w-full"
                  asChild
                >
                  <Link href={`/assets/${asset.id}`}>
                    Cancel
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Considerations</CardTitle>
              <CardDescription>Before deleting, consider:</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <p className="text-sm">Is this asset still in use or assigned to someone?</p>
              </div>
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <p className="text-sm">Should the status be changed to "Retired" instead?</p>
              </div>
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <p className="text-sm">Have all financial records been updated?</p>
              </div>
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <p className="text-sm">Is there a replacement asset in the system?</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Alternative Actions</CardTitle>
              <CardDescription>Consider these options instead:</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full justify-start"
                asChild
              >
                <Link href={`/assets/${asset.id}/edit`}>
                  <Check className="mr-2 h-4 w-4" />
                  Edit Asset Instead
                </Link>
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                asChild
              >
                <Link href={`/assets/${asset.id}/edit?status=retired`}>
                  <Check className="mr-2 h-4 w-4" />
                  Mark as Retired
                </Link>
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                asChild
              >
                <Link href={`/assets/${asset.id}/edit?status=in-storage`}>
                  <Check className="mr-2 h-4 w-4" />
                  Move to Storage
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}