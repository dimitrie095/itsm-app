export const dynamic = 'force-dynamic'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield } from "lucide-react"
import RolesPermissionsClient from "./roles-permissions-client"
import { getRolesAndPermissions } from "./actions"
import { getPermissionMatrix } from "./matrix/actions"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { hasPermission } from "@/lib/permission-utils"
import { redirect } from "next/navigation"

export default async function RolesPermissionsPage() {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect("/login")
  }
  if (!hasPermission(session, "roles.view")) {
    redirect("/")
  }

  // Skip database queries during build
  const isBuild = process.env.IS_BUILD === 'true' || process.env.SKIP_DB_INIT === 'true';
  
  const [standardData, matrixData] = isBuild ? [
    {
      permissions: {},
      customRoles: [],
      standardRolePermissions: { ADMIN: [], AGENT: [], END_USER: [], CUSTOM: [] },
      users: [],
      allPermissions: []
    },
    {
      categories: [],
      permissions: [],
      roles: [],
      matrix: {}
    }
  ] : await Promise.all([
    getRolesAndPermissions(),
    getPermissionMatrix()
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Roles & Permissions</h1>
          <p className="text-muted-foreground">
            Manage user roles, permissions, and access control for the ITSM system.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Roles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{matrixData.roles.length}</div>
            <p className="text-xs text-muted-foreground">
              {matrixData.roles.filter(r => r.type === 'standard').length} standard,{" "}
              {matrixData.roles.filter(r => r.type === 'custom').length} custom
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Permissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{matrixData.permissions.length}</div>
            <p className="text-xs text-muted-foreground">
              Across {matrixData.categories.length} categories
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {matrixData.roles.reduce((sum, role) => sum + role.userCount, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              With role assignments
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Coverage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round((matrixData.permissions.length * matrixData.roles.length) / 100)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Permission matrix density
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Role Management
          </CardTitle>
          <CardDescription>
            Manage standard and custom roles with their permissions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RolesPermissionsClient initialData={standardData as any} />
        </CardContent>
      </Card>
    </div>
  )
}