import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Plus, Search, Filter, Cpu, Monitor, Printer, Server, Smartphone, HardDrive, Database } from "lucide-react"
import Link from "next/link"
import { getAssets, getAssetStats } from "./actions"

export default async function AssetsPage() {
  const assets = await getAssets()
  const stats = await getAssetStats()

  const typeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "laptop": return <Cpu className="h-4 w-4" />
      case "monitor": return <Monitor className="h-4 w-4" />
      case "printer": return <Printer className="h-4 w-4" />
      case "server": return <Server className="h-4 w-4" />
      case "desktop": return <HardDrive className="h-4 w-4" />
      case "network": return <Database className="h-4 w-4" />
      case "software": return <Smartphone className="h-4 w-4" />
      default: return <Cpu className="h-4 w-4" />
    }
  }

  const statusColor = (status: string) => {
    switch (status) {
      case "Active": return "bg-green-100 text-green-800"
      case "Maintenance": return "bg-yellow-100 text-yellow-800"
      case "Retired": return "bg-gray-100 text-gray-800"
      case "Lost": return "bg-red-100 text-red-800"
      case "Damaged": return "bg-orange-100 text-orange-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  // Überprüfe ob Garantie abgelaufen ist
  const isWarrantyExpired = (warranty: string) => {
    if (warranty === "Expired" || warranty === "N/A" || !warranty) return true
    try {
      const warrantyDate = new Date(warranty)
      const today = new Date()
      return warrantyDate < today
    } catch {
      return true
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Assets</h1>
          <p className="text-muted-foreground">Manage IT assets, inventory, and warranties.</p>
        </div>
        <Button asChild>
          <Link href="/assets/new">
            <Plus className="mr-2 h-4 w-4" />
            New Asset
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAssets}</div>
            <p className="text-xs text-muted-foreground">+12 from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeAssets}</div>
            <p className="text-xs text-muted-foreground">{stats.totalAssets > 0 ? Math.round((stats.activeAssets / stats.totalAssets) * 100) : 0}% of total</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Under Warranty</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.underWarranty}</div>
            <p className="text-xs text-muted-foreground">Expiring soon: {stats.expiringSoon}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Maintenance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.maintenanceAssets}</div>
            <p className="text-xs text-muted-foreground">{stats.maintenanceAssets > 0 ? "Needs attention" : "All good"}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>Asset Inventory</CardTitle>
              <CardDescription>All hardware and software assets.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search assets..." className="w-[300px] pl-9" />
              </div>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Warranty</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assets.length > 0 ? (
                assets.map((asset: any) => (
                  <TableRow key={asset.id}>
                    <TableCell className="font-medium">{asset.id}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {typeIcon(asset.type)}
                        {asset.name}
                      </div>
                    </TableCell>
                    <TableCell>{asset.type}</TableCell>
                    <TableCell>
                      <Badge className={statusColor(asset.status)}>{asset.status}</Badge>
                    </TableCell>
                    <TableCell>{asset.assignedTo || "Unassigned"}</TableCell>
                    <TableCell>{asset.location}</TableCell>
                    <TableCell>
                      <Badge variant={isWarrantyExpired(asset.warranty) ? "destructive" : "outline"}>
                        {asset.warranty || "N/A"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem asChild>
                            <Link href={`/assets/${asset.id}`}>View Details</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/assets/${asset.id}/edit`}>Edit Asset</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem>Assign to User</DropdownMenuItem>
                          <DropdownMenuItem>Update Status</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600" asChild>
                            <Link href={`/assets/${asset.id}/delete`}>Delete Asset</Link>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <Cpu className="h-8 w-8" />
                      <p>No assets found.</p>
                      <p className="text-sm">
                        <Link href="/assets/new" className="text-primary hover:underline">
                          Create your first asset
                        </Link>
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}