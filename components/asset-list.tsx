"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Search, Filter, Cpu, Monitor, Printer, Server, Smartphone, HardDrive, Database } from "lucide-react"
import { useSession } from "next-auth/react"
import { toast } from "sonner"
import Link from "next/link"
import { usePermission } from "@/hooks/use-permission"
import { useSearchParams } from "next/navigation"
import { AssetEditDialog } from "@/components/asset-edit-dialog"

interface Asset {
  id: string
  name: string
  type: string
  status: string
  assignedToId?: string | null
  assignedTo: string
  location: string
  warranty: string
  serialNumber: string | null
  purchaseDate: string
  notes: string | null
  createdAt: string
  updatedAt: string
}

interface AssetsResponse {
  assets: Asset[]
  userRole: string
  total: number
  pagination: {
    skip: number
    limit: number
    hasMore: boolean
  }
}

type AssetStatusValue = "ACTIVE" | "INACTIVE" | "MAINTENANCE" | "RETIRED" | "LOST"

export function AssetList() {
  const { data: session, status } = useSession()
  const searchParams = useSearchParams()
  const permission = usePermission()
  const canCreateAsset = permission.hasPermission("assets.create")
  const canUpdateAsset = permission.hasPermission("assets.update")
  const canDeleteAsset = permission.hasPermission("assets.delete")
  const canAssignAsset = permission.hasPermission("assets.assign")

  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [skip, setSkip] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [search, setSearch] = useState(searchParams.get("search") || "")
  const [debouncedSearch, setDebouncedSearch] = useState(searchParams.get("search") || "")
  const [locationFilter, setLocationFilter] = useState("")
  const [debouncedLocationFilter, setDebouncedLocationFilter] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [users, setUsers] = useState<Array<{ id: string; name: string | null; email: string }>>([])
  const [usersLoading, setUsersLoading] = useState(false)

  const typeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "laptop": return <Cpu className="h-4 w-4" />
      case "desktop": return <HardDrive className="h-4 w-4" />
      case "monitor": return <Monitor className="h-4 w-4" />
      case "phone": return <Smartphone className="h-4 w-4" />
      case "printer": return <Printer className="h-4 w-4" />
      case "software": return <Smartphone className="h-4 w-4" />
      case "server": return <Server className="h-4 w-4" />
      case "network": return <Database className="h-4 w-4" />
      case "other": return <Cpu className="h-4 w-4" />
      default: return <Cpu className="h-4 w-4" />
    }
  }

  const statusColor = (status: string) => {
    switch (status) {
      case "Active": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      case "Inactive": return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
      case "Maintenance": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
      case "Retired": return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
      case "Lost": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
      case "Damaged": return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300"
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
    }
  }

  const formatEnumLabel = (value: string) => {
    const normalized = value.toLowerCase().replace(/_/g, " ")
    return normalized.charAt(0).toUpperCase() + normalized.slice(1)
  }

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

  const fetchAssets = useCallback(async (newSkip: number) => {
    if (status === "loading") return
    
    try {
      setLoading(true)
      setError(null)
      
      // Build query parameters
      const params = new URLSearchParams()
      const page = Math.floor(newSkip / 50) + 1
      params.append("limit", "50")
      params.append("page", page.toString())
      if (debouncedSearch) params.append("search", debouncedSearch)
      if (debouncedLocationFilter) params.append("location", debouncedLocationFilter)
      if (typeFilter !== "all") params.append("type", typeFilter)
      if (statusFilter !== "all") params.append("status", statusFilter)
      
      const response = await fetch(`/api/assets?${params.toString()}`, {
        cache: 'default',
        credentials: 'same-origin',
      })
      
      if (!response.ok) {
        throw new Error(`Failed to fetch assets: ${response.status}`)
      }
      
      const data: AssetsResponse = await response.json()
      setAssets(data.assets)
      setTotal(data.total)
      setHasMore(data.pagination.hasMore)
      setSkip(newSkip)
    } catch (err) {
      console.error("Error fetching assets:", err)
      setError(err instanceof Error ? err.message : "Failed to load assets")
      toast.error("Failed to load assets")
    } finally {
      setLoading(false)
    }
  }, [status, debouncedSearch, debouncedLocationFilter, typeFilter, statusFilter])

  const handleSearch = (value: string) => {
    setSearch(value)
  }

  useEffect(() => {
    setSearch(searchParams.get("search") || "")
    setDebouncedSearch(searchParams.get("search") || "")
  }, [searchParams])

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
    }, 350)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedLocationFilter(locationFilter)
    }, 350)
    return () => clearTimeout(timer)
  }, [locationFilter])

  useEffect(() => {
    fetchAssets(0)
  }, [fetchAssets])

  const fetchAssignableUsers = useCallback(async () => {
    if (usersLoading || users.length > 0) return
    try {
      setUsersLoading(true)
      const response = await fetch("/api/assignable-users?target=assets", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      })
      if (!response.ok) {
        throw new Error(`Failed to fetch users: ${response.status}`)
      }
      const data = await response.json()
      setUsers(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("Error fetching assignable users:", error)
    } finally {
      setUsersLoading(false)
    }
  }, [users.length, usersLoading])

  useEffect(() => {
    if (editDialogOpen && users.length === 0) {
      void fetchAssignableUsers()
    }
  }, [editDialogOpen, fetchAssignableUsers, users.length])

  const handleAssetClick = (asset: Asset) => {
    if (!canUpdateAsset) return
    if (users.length === 0) {
      void fetchAssignableUsers()
    }
    setSelectedAsset(asset)
    setEditDialogOpen(true)
  }

  const handleAssetSave = async (assetId: string, updates: { status?: AssetStatusValue; location?: string; userId?: string | null }) => {
    const response = await fetch(`/api/assets/${assetId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      const message = errorData?.message || errorData?.error || `Failed to update asset: ${response.status}`
      throw new Error(message)
    }

    await fetchAssets(skip)
  }

  const clearFilters = () => {
    setSearch("")
    setLocationFilter("")
    setTypeFilter("all")
    setStatusFilter("all")
  }



  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-destructive">
            <p>Failed to load assets: {error}</p>
            <Button variant="outline" onClick={() => fetchAssets(0)} className="mt-4">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle>Asset Inventory</CardTitle>
            <CardDescription>All hardware and software assets.</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input 
                placeholder="Search assets..." 
                className="w-[240px] pl-9"
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
            <Input
              placeholder="Filter location..."
              className="w-[180px]"
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
            />
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="LAPTOP">Laptop</SelectItem>
                <SelectItem value="DESKTOP">Desktop</SelectItem>
                <SelectItem value="MONITOR">Monitor</SelectItem>
                <SelectItem value="PHONE">Phone</SelectItem>
                <SelectItem value="PRINTER">Printer</SelectItem>
                <SelectItem value="SOFTWARE">Software</SelectItem>
                <SelectItem value="SERVER">Server</SelectItem>
                <SelectItem value="NETWORK">Network</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
                <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                <SelectItem value="RETIRED">Retired</SelectItem>
                <SelectItem value="LOST">Lost</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={clearFilters}>
              <Filter className="mr-2 h-4 w-4" />
              Clear
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading && assets.length === 0 ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading assets...</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
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
                    assets.map((asset) => (
                      <TableRow
                        key={asset.id}
                        className={canUpdateAsset ? "cursor-pointer hover:bg-muted/50" : undefined}
                        onClick={() => handleAssetClick(asset)}
                      >
                        <TableCell className="font-medium">
                          <span className="font-mono text-xs">{asset.id.substring(0, 8).toUpperCase()}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {typeIcon(asset.type)}
                            {asset.name}
                          </div>
                        </TableCell>
                        <TableCell>{asset.type}</TableCell>
                        <TableCell>
                          <Badge className={`${statusColor(asset.status)} !text-[12px]`}>
                            {formatEnumLabel(asset.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>{asset.assignedTo || "Unassigned"}</TableCell>
                        <TableCell>{asset.location}</TableCell>
                        <TableCell>
                          <Badge variant={isWarrantyExpired(asset.warranty) ? "destructive" : "outline"}>
                            {asset.warranty || "N/A"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right" onClick={(event) => event.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" onClick={(event) => event.stopPropagation()}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem asChild>
                                <Link href={`/assets/${asset.id}`}>View Details</Link>
                              </DropdownMenuItem>
                              {canUpdateAsset && (
                                <DropdownMenuItem asChild>
                                  <Link href={`/assets/${asset.id}/edit`}>Edit Asset</Link>
                                </DropdownMenuItem>
                              )}
                              {canAssignAsset && (
                                <DropdownMenuItem>Assign to User</DropdownMenuItem>
                              )}
                              {canUpdateAsset && (
                                <DropdownMenuItem>Update Status</DropdownMenuItem>
                              )}
                              {(canUpdateAsset || canAssignAsset) && (
                                <DropdownMenuSeparator />
                              )}
                              {canDeleteAsset && (
                                <DropdownMenuItem className="text-red-600" asChild>
                                  <Link href={`/assets/${asset.id}/delete`}>Delete Asset</Link>
                                </DropdownMenuItem>
                              )}
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
                            </Link>{" "}
                            to get started.
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            {!loading && assets.length > 0 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Showing {skip + 1} to {skip + assets.length} of {total} assets
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchAssets(Math.max(0, skip - 50))}
                    disabled={skip === 0}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchAssets(skip + 50)}
                    disabled={!hasMore}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
      <AssetEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        asset={selectedAsset}
        onSave={handleAssetSave}
        users={users}
      />
    </Card>
  )
}