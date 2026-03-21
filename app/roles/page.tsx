import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Shield, Grid, Users, Settings } from "lucide-react"
import RolesPermissionsClient from "./roles-permissions-client"
import { PermissionMatrix } from "./components/permission-matrix"
import { getRolesAndPermissions } from "./actions"
import { getPermissionMatrix } from "./matrix/actions"

export default async function RolesPermissionsPage() {
  const [standardData, matrixData] = await Promise.all([
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

      <Tabs defaultValue="matrix" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="matrix" className="flex items-center gap-2">
            <Grid className="h-4 w-4" />
            Matrix View
          </TabsTrigger>
          <TabsTrigger value="roles" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Role Management
          </TabsTrigger>
          <TabsTrigger value="assignments" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            User Assignments
          </TabsTrigger>
          <TabsTrigger value="advanced" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Advanced
          </TabsTrigger>
        </TabsList>

        <TabsContent value="matrix" className="space-y-6">
          <PermissionMatrix initialData={matrixData as any} />
        </TabsContent>

        <TabsContent value="roles" className="space-y-6">
          <RolesPermissionsClient initialData={standardData as any} />
        </TabsContent>

        <TabsContent value="assignments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>User Role Assignments</CardTitle>
              <CardDescription>
                Assign roles to users and manage their access levels.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>User assignment interface will be implemented here.</p>
                <p className="text-sm mt-2">Use the Role Management tab for basic assignments.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Advanced Role Management</CardTitle>
              <CardDescription>
                Role hierarchies, permission groups, and audit logs.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Advanced features coming soon.</p>
                <p className="text-sm mt-2">Role inheritance, permission bundles, and audit trails.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}