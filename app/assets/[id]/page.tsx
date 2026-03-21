import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Edit, Trash2, Calendar, User, MapPin, Tag, DollarSign, Building, FileText } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { getAssetById } from "../actions"

// Asset-Icons
function getAssetIcon(type: string) {
  switch (type.toLowerCase()) {
    case "laptop": return <FileText className="h-5 w-5" />
    case "desktop": return <FileText className="h-5 w-5" />
    case "monitor": return <FileText className="h-5 w-5" />
    case "printer": return <FileText className="h-5 w-5" />
    case "server": return <FileText className="h-5 w-5" />
    case "network": return <FileText className="h-5 w-5" />
    case "software": return <FileText className="h-5 w-5" />
    case "mobile": return <FileText className="h-5 w-5" />
    default: return <FileText className="h-5 w-5" />
  }
}

// Status-Farben
function getStatusColor(status: string) {
  switch (status) {
    case "Active": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
    case "Maintenance": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
    case "Retired": return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
    case "Lost": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
    case "Damaged": return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300"
    case "In Storage": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
    default: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
  }
}

// Überprüfe Garantie
function isWarrantyValid(warranty?: string) {
  if (!warranty || warranty === "Expired" || warranty === "N/A") return false
  try {
    const warrantyDate = new Date(warranty)
    const today = new Date()
    return warrantyDate > today
  } catch {
    return false
  }
}

// Berechne Garantie-Status
function getWarrantyStatus(warranty?: string) {
  if (!warranty || warranty === "Expired" || warranty === "N/A") {
    return { text: "No Warranty", color: "bg-gray-100 text-gray-800" }
  }
  
  try {
    const warrantyDate = new Date(warranty)
    const today = new Date()
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
    
    if (warrantyDate < today) {
      return { text: "Expired", color: "bg-red-100 text-red-800" }
    } else if (warrantyDate <= thirtyDaysFromNow) {
      return { text: "Expiring Soon", color: "bg-orange-100 text-orange-800" }
    } else {
      return { text: "Active", color: "bg-green-100 text-green-800" }
    }
  } catch {
    return { text: "Invalid Date", color: "bg-gray-100 text-gray-800" }
  }
}

// Format-Datum
function formatDate(dateString?: string) {
  if (!dateString) return "N/A"
  try {
    return new Date(dateString).toLocaleDateString()
  } catch {
    return dateString
  }
}

export default async function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const asset = await getAssetById(id)

  if (!asset) {
    notFound()
  }

  const warrantyStatus = getWarrantyStatus(asset.warranty)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/assets">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                {getAssetIcon(asset.type)}
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">{asset.name}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline">{asset.type}</Badge>
                  <Badge className={getStatusColor(asset.status)}>{asset.status}</Badge>
                  <Badge className={warrantyStatus.color}>{warrantyStatus.text}</Badge>
                </div>
              </div>
            </div>
            <p className="text-muted-foreground mt-2">Asset ID: {asset.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href={`/assets/${asset.id}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </Button>
          <Button variant="destructive" asChild>
            <Link href={`/assets/${asset.id}/delete`}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Asset Details */}
          <Card>
            <CardHeader>
              <CardTitle>Asset Details</CardTitle>
              <CardDescription>Complete information about this asset</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Serial Number</p>
                      <p className="text-sm">{asset.serialNumber || "Not specified"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Assigned To</p>
                      <p className="text-sm">{asset.assignedTo || "Unassigned"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Location</p>
                      <p className="text-sm">{asset.location}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Department</p>
                      <p className="text-sm">{asset.department || "Not specified"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Purchase Date</p>
                      <p className="text-sm">{formatDate(asset.purchaseDate)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Purchase Price</p>
                      <p className="text-sm">
                        {asset.purchasePrice ? `$${asset.purchasePrice.toFixed(2)}` : "Not specified"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Warranty Information */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Warranty Information</h3>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Warranty End Date</p>
                      <p className="text-sm text-muted-foreground">
                        {asset.warranty ? formatDate(asset.warranty) : "No warranty"}
                      </p>
                    </div>
                    <Badge className={warrantyStatus.color}>
                      {warrantyStatus.text}
                    </Badge>
                  </div>
                  {asset.warranty && isWarrantyValid(asset.warranty) && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Warranty expires in {Math.ceil((new Date(asset.warranty).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days
                    </p>
                  )}
                </div>
              </div>

              {/* Notes */}
              {asset.notes && (
                <>
                  <Separator />
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Notes</h3>
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <p className="text-sm whitespace-pre-line">{asset.notes}</p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Timeline / History */}
          <Card>
            <CardHeader>
              <CardTitle>Asset History</CardTitle>
              <CardDescription>Recent activity and changes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="mt-1 h-2 w-2 rounded-full bg-primary" />
                  <div className="flex-1">
                    <p className="font-medium">Asset Created</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(asset.createdAt).toLocaleDateString()} at {new Date(asset.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                {asset.updatedAt !== asset.createdAt && (
                  <div className="flex items-start gap-3">
                    <div className="mt-1 h-2 w-2 rounded-full bg-blue-500" />
                    <div className="flex-1">
                      <p className="font-medium">Last Updated</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(asset.updatedAt).toLocaleDateString()} at {new Date(asset.updatedAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Manage this asset</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full" asChild>
                <Link href={`/assets/${asset.id}/edit`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Asset
                </Link>
              </Button>
              <Button variant="outline" className="w-full">
                Assign to User
              </Button>
              <Button variant="outline" className="w-full">
                Update Status
              </Button>
              <Button variant="destructive" className="w-full" asChild>
                <Link href={`/assets/${asset.id}/delete`}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Asset
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle>Metadata</CardTitle>
              <CardDescription>Technical information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Asset ID:</span>
                <span className="font-mono text-sm">{asset.id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Created:</span>
                <span className="text-sm">{new Date(asset.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Last Updated:</span>
                <span className="text-sm">{new Date(asset.updatedAt).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status Duration:</span>
                <span className="text-sm">
                  {Math.ceil((new Date().getTime() - new Date(asset.updatedAt).getTime()) / (1000 * 60 * 60 * 24))} days
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Related Assets */}
          <Card>
            <CardHeader>
              <CardTitle>Related</CardTitle>
              <CardDescription>Similar assets</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-2 rounded hover:bg-muted">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Assets in {asset.department || "same department"}</span>
                  </div>
                  <Badge variant="outline">12</Badge>
                </div>
                <div className="flex items-center justify-between p-2 rounded hover:bg-muted">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Same location</span>
                  </div>
                  <Badge variant="outline">8</Badge>
                </div>
                <div className="flex items-center justify-between p-2 rounded hover:bg-muted">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Same type</span>
                  </div>
                  <Badge variant="outline">24</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}