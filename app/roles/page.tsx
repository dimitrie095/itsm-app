import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import RolesPermissionsClient from "./roles-permissions-client"
import { getRolesAndPermissions } from "./actions"

export default async function RolesPermissionsPage() {
  const data = await getRolesAndPermissions()

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

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Standard Roles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">Admin, Agent, End User</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Custom Roles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.customRoles.length}</div>
            <p className="text-xs text-muted-foreground">
              {data.customRoles.filter(r => r.isActive).length} active
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Permissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.allPermissions.length}</div>
            <p className="text-xs text-muted-foreground">Across {Object.keys(data.permissions).length} categories</p>
          </CardContent>
        </Card>
      </div>

      <RolesPermissionsClient 
        initialData={data}
      />
    </div>
  )
}