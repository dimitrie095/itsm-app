export const dynamic = 'force-dynamic'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowDown, ArrowUp, Plus } from "lucide-react"
import { redirect } from "next/navigation"
import Link from "next/link"
import { getAssetStats } from "./actions"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { hasPermission } from "@/lib/permission-utils"
import { AssetList } from "@/components/asset-list"

export default async function AssetsPage() {
  const session = await getServerSession(authOptions)
  
  // Check if user has permission to view assets
  const canViewAssets = hasPermission(session, "assets.view")
  if (!canViewAssets) {
    redirect('/unauthorized')
  }
  
  const stats = await getAssetStats()
  
  const canCreateAsset = hasPermission(session, "assets.create")
  const monthlyDeltaPrefix = stats.monthlyAssetDelta > 0 ? "+" : ""
  const monthlyDeltaLabel =
    stats.monthlyAssetDelta === 0
      ? "No change from last month"
      : `${monthlyDeltaPrefix}${stats.monthlyAssetDelta} from last month`
  const isMonthlyDeltaPositive = stats.monthlyAssetDelta > 0
  const isMonthlyDeltaNegative = stats.monthlyAssetDelta < 0



  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Assets</h1>
          <p className="text-muted-foreground">Manage IT assets, inventory, and warranties.</p>
        </div>
        {canCreateAsset && (
          <Button asChild>
            <Link href="/assets/new">
              <Plus className="mr-2 h-4 w-4" />
              New Asset
            </Link>
          </Button>
        )}
      </div>

      <div className="grid gap-5 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">{stats.totalAssets}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {isMonthlyDeltaPositive ? (
                <ArrowUp className="mr-1 h-3 w-3 text-green-600" />
              ) : isMonthlyDeltaNegative ? (
                <ArrowDown className="mr-1 h-3 w-3 text-red-600" />
              ) : null}
              <span>{monthlyDeltaLabel}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">{stats.activeAssets}</div>
            <p className="text-xs text-muted-foreground">{stats.totalAssets > 0 ? Math.round((stats.activeAssets / stats.totalAssets) * 100) : 0}% of total</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Under Warranty</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700">{stats.underWarranty}</div>
            <p className="text-xs text-muted-foreground">Expiring soon: {stats.expiringSoon}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Maintenance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700">{stats.maintenanceAssets}</div>
            <p className="text-xs text-muted-foreground">{stats.maintenanceAssets > 0 ? "Needs attention" : "All good"}</p>
          </CardContent>
        </Card>
      </div>

      <AssetList />
    </div>
  )
}