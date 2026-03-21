"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Loader2, 
  Shield, 
  CheckCircle, 
  AlertCircle, 
  UserCog, 
  Users,
  Save,
  Plus,
  Trash2,
  Edit
} from "lucide-react"
import { 
  updateStandardRolePermissions, 
  createCustomRole, 
  updateCustomRole, 
  deleteCustomRole,
  assignRoleToUser 
} from "./actions"
import { Role } from "@/lib/generated/prisma/enums"
import type { PermissionModel as Permission, CustomRoleModel as CustomRole } from "@/lib/generated/prisma/models"

interface RolePermissionsData {
  permissions: Record<string, Permission[]>
  customRoles: (CustomRole & {
    permissions: {
      permission: Permission
    }[]
    users: {
      id: string
      name: string | null
      email: string
    }[]
  })[]
  standardRolePermissions: Record<Role, string[]>
  users: {
    id: string
    name: string | null
    email: string
    role: Role
    customRole: {
      id: string
      name: string
    } | null
  }[]
  allPermissions: Permission[]
}

interface RolesPermissionsClientProps {
  initialData: RolePermissionsData
}

export default function RolesPermissionsClient({ initialData }: RolesPermissionsClientProps) {
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [activeTab, setActiveTab] = useState("standard")
  const [message, setMessage] = useState<{ type: "success" | "error", text: string } | null>(null)
  
  // State for standard roles
  const [standardPermissions, setStandardPermissions] = useState<Record<Role, string[]>>(
    initialData.standardRolePermissions
  )
  
  // State for custom roles
  const [customRoles, setCustomRoles] = useState(initialData.customRoles)
  const [newRoleForm, setNewRoleForm] = useState({
    name: "",
    description: "",
    permissions: [] as string[]
  })
  const [editingRole, setEditingRole] = useState<string | null>(null)
  const [editRoleForm, setEditRoleForm] = useState({
    name: "",
    description: "",
    isActive: true,
    permissions: [] as string[]
  })
  
  // State for user assignments
  const [userAssignments, setUserAssignments] = useState(initialData.users)

  // Group permissions by category for display
  const permissionsByCategory = initialData.permissions

  const handleStandardPermissionChange = (role: Role, permissionName: string, checked: boolean) => {
    setStandardPermissions(prev => ({
      ...prev,
      [role]: checked 
        ? [...prev[role], permissionName]
        : prev[role].filter(p => p !== permissionName)
    }))
  }

  const saveStandardRolePermissions = async (role: Role) => {
    setSaving(prev => ({ ...prev, [role]: true }))
    try {
      const result = await updateStandardRolePermissions(role, standardPermissions[role])
      if (result.success) {
        setMessage({ type: "success", text: `${role} permissions updated successfully` })
      } else {
        setMessage({ type: "error", text: result.error || "Failed to update permissions" })
      }
    } finally {
      setSaving(prev => ({ ...prev, [role]: false }))
    }
  }

  const handleCreateCustomRole = async () => {
    if (!newRoleForm.name.trim()) {
      setMessage({ type: "error", text: "Role name is required" })
      return
    }

    setLoading({ ...loading, create: true })
    try {
      const result = await createCustomRole({
        name: newRoleForm.name,
        description: newRoleForm.description,
        permissionNames: newRoleForm.permissions
      })

      if (result.success && result.role) {
        setCustomRoles([...customRoles, result.role as any])
        setNewRoleForm({ name: "", description: "", permissions: [] })
        setMessage({ type: "success", text: "Custom role created successfully" })
      } else {
        setMessage({ type: "error", text: result.error || "Failed to create custom role" })
      }
    } finally {
      setLoading({ ...loading, create: false })
    }
  }

  const handleEditCustomRole = async (roleId: string) => {
    setLoading({ ...loading, [roleId]: true })
    try {
      const result = await updateCustomRole(roleId, {
        name: editRoleForm.name,
        description: editRoleForm.description,
        isActive: editRoleForm.isActive,
        permissionNames: editRoleForm.permissions
      })

      if (result.success && result.role) {
        setCustomRoles(customRoles.map(r => r.id === roleId ? result.role! : r))
        setEditingRole(null)
        setMessage({ type: "success", text: "Custom role updated successfully" })
      } else {
        setMessage({ type: "error", text: result.error || "Failed to update custom role" })
      }
    } finally {
      setLoading({ ...loading, [roleId]: false })
    }
  }

  const handleDeleteCustomRole = async (roleId: string) => {
    if (!confirm("Are you sure you want to delete this custom role?")) {
      return
    }

    setLoading({ ...loading, [roleId]: true })
    try {
      const result = await deleteCustomRole(roleId)
      if (result.success) {
        setCustomRoles(customRoles.filter(r => r.id !== roleId))
        setMessage({ type: "success", text: "Custom role deleted successfully" })
      } else {
        setMessage({ type: "error", text: result.error || "Failed to delete custom role" })
      }
    } finally {
      setLoading({ ...loading, [roleId]: false })
    }
  }

  const startEditingRole = (role: typeof customRoles[0]) => {
    setEditingRole(role.id)
    setEditRoleForm({
      name: role.name,
      description: role.description || "",
      isActive: role.isActive,
      permissions: role.permissions.map((p: { permission: { name: string } }) => p.permission.name)
    })
  }

  const handleAssignRoleToUser = async (userId: string, roleType: "standard" | "custom", roleValue: Role | string) => {
    setLoading({ ...loading, [userId]: true })
    try {
      const result = await assignRoleToUser(userId, roleType, roleValue)
      if (result.success) {
        // Update local state
        setUserAssignments(prev => prev.map(user => {
          if (user.id === userId) {
            return {
              ...user,
              role: roleType === "standard" ? (roleValue as Role) : "CUSTOM",
              customRole: roleType === "custom" 
                ? customRoles.find(r => r.id === roleValue) || null
                : null
            }
          }
          return user
        }))
        setMessage({ type: "success", text: "Role assigned successfully" })
      } else {
        setMessage({ type: "error", text: result.error || "Failed to assign role" })
      }
    } finally {
      setLoading({ ...loading, [userId]: false })
    }
  }

  const getRoleDisplayName = (role: Role, customRole: { id: string, name: string } | null) => {
    if (role === "CUSTOM" && customRole) {
      return `Custom: ${customRole.name}`
    }
    return role.replace("_", " ").toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
  }

  return (
    <div className="space-y-6">
      {message && (
        <Alert variant={message.type === "success" ? "default" : "destructive"}>
          {message.type === "success" ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="standard" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Standard Roles
          </TabsTrigger>
          <TabsTrigger value="custom" className="flex items-center gap-2">
            <UserCog className="h-4 w-4" />
            Custom Roles
          </TabsTrigger>
          <TabsTrigger value="assignments" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            User Assignments
          </TabsTrigger>
        </TabsList>

        {/* Standard Roles Tab */}
        <TabsContent value="standard" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            {(["ADMIN", "AGENT", "END_USER"] as Role[]).map((role) => (
              <Card key={role}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="capitalize">
                        {role === "END_USER" ? "End User" : role.toLowerCase()}
                      </CardTitle>
                      <CardDescription>
                        {role === "ADMIN" && "Full system access and administration"}
                        {role === "AGENT" && "Support ticket management and resolution"}
                        {role === "END_USER" && "Basic ticket creation and viewing"}
                      </CardDescription>
                    </div>
                    <Badge variant={role === "ADMIN" ? "destructive" : role === "AGENT" ? "default" : "secondary"}>
                      {standardPermissions[role].length} permissions
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    {Object.entries(permissionsByCategory).map(([category, perms]) => (
                      <div key={category}>
                        <Label className="text-sm font-medium capitalize mb-2 block">
                          {category}
                        </Label>
                        <div className="space-y-2 pl-2">
                          {perms.map((permission) => (
                            <div key={permission.id} className="flex items-center justify-between">
                              <div>
                                <Label htmlFor={`${role}-${permission.id}`} className="text-sm font-normal cursor-pointer">
                                  {permission.description}
                                </Label>
                              </div>
                              <Switch
                                id={`${role}-${permission.id}`}
                                checked={standardPermissions[role].includes(permission.name)}
                                onCheckedChange={(checked) => 
                                  handleStandardPermissionChange(role, permission.name, checked)
                                }
                              />
                            </div>
                          ))}
                        </div>
                        <Separator className="my-3" />
                      </div>
                    ))}
                  </div>
                  <Button
                    onClick={() => saveStandardRolePermissions(role)}
                    disabled={saving[role]}
                    className="w-full"
                  >
                    {saving[role] && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Save className="mr-2 h-4 w-4" />
                    Save {role === "END_USER" ? "End User" : role} Permissions
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Custom Roles Tab */}
        <TabsContent value="custom" className="space-y-6">
          {/* Create New Role Form */}
          <Card>
            <CardHeader>
              <CardTitle>Create New Custom Role</CardTitle>
              <CardDescription>
                Define a custom role with specific permissions for your ITSM system.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="role-name">Role Name *</Label>
                  <input
                    id="role-name"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={newRoleForm.name}
                    onChange={(e) => setNewRoleForm({ ...newRoleForm, name: e.target.value })}
                    placeholder="e.g., Senior Agent, Auditor, Read-Only"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role-description">Description</Label>
                  <input
                    id="role-description"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={newRoleForm.description}
                    onChange={(e) => setNewRoleForm({ ...newRoleForm, description: e.target.value })}
                    placeholder="e.g., Can view all tickets but cannot modify"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label>Select Permissions</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto p-2 border rounded-md">
                  {initialData.allPermissions.map((permission) => (
                    <div key={permission.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`new-${permission.id}`}
                        checked={newRoleForm.permissions.includes(permission.name)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewRoleForm({
                              ...newRoleForm,
                              permissions: [...newRoleForm.permissions, permission.name]
                            })
                          } else {
                            setNewRoleForm({
                              ...newRoleForm,
                              permissions: newRoleForm.permissions.filter(p => p !== permission.name)
                            })
                          }
                        }}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <Label htmlFor={`new-${permission.id}`} className="text-sm cursor-pointer">
                        {permission.description}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleCreateCustomRole}
                disabled={loading.create || !newRoleForm.name.trim()}
                className="w-full"
              >
                {loading.create && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Plus className="mr-2 h-4 w-4" />
                Create Custom Role
              </Button>
            </CardContent>
          </Card>

          {/* Existing Custom Roles List */}
          <Card>
            <CardHeader>
              <CardTitle>Existing Custom Roles</CardTitle>
              <CardDescription>
                Manage existing custom roles and their permissions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {customRoles.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <UserCog className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No custom roles yet. Create your first custom role above.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {customRoles.map((role) => (
                    <div key={role.id} className="border rounded-lg p-4">
                      {editingRole === role.id ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Role Name</Label>
                              <input
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={editRoleForm.name}
                                onChange={(e) => setEditRoleForm({ ...editRoleForm, name: e.target.value })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Description</Label>
                              <input
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={editRoleForm.description}
                                onChange={(e) => setEditRoleForm({ ...editRoleForm, description: e.target.value })}
                              />
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={editRoleForm.isActive}
                              onCheckedChange={(checked) => setEditRoleForm({ ...editRoleForm, isActive: checked })}
                            />
                            <Label>Role is active</Label>
                          </div>

                          <div className="space-y-2">
                            <Label>Permissions</Label>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-2 border rounded-md">
                              {initialData.allPermissions.map((permission) => (
                                <div key={permission.id} className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    checked={editRoleForm.permissions.includes(permission.name)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setEditRoleForm({
                                          ...editRoleForm,
                                          permissions: [...editRoleForm.permissions, permission.name]
                                        })
                                      } else {
                                        setEditRoleForm({
                                          ...editRoleForm,
                                          permissions: editRoleForm.permissions.filter(p => p !== permission.name)
                                        })
                                      }
                                    }}
                                    className="h-4 w-4"
                                  />
                                  <Label className="text-sm">{permission.description}</Label>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleEditCustomRole(role.id)}
                              disabled={loading[role.id]}
                              className="flex-1"
                            >
                              {loading[role.id] && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                              <Save className="mr-2 h-4 w-4" />
                              Save Changes
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => setEditingRole(null)}
                              disabled={loading[role.id]}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold">{role.name}</h3>
                                <Badge variant={role.isActive ? "default" : "outline"}>
                                  {role.isActive ? "Active" : "Inactive"}
                                </Badge>
                                <Badge variant="secondary">
                                  {role.permissions.length} permissions
                                </Badge>
                              </div>
                              {role.description && (
                                <p className="text-sm text-muted-foreground mt-1">{role.description}</p>
                              )}
                              <p className="text-xs text-muted-foreground mt-1">
                                Assigned to {role.users.length} user{role.users.length !== 1 ? 's' : ''}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => startEditingRole(role)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteCustomRole(role.id)}
                                disabled={loading[role.id] || role.users.length > 0}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          
                          <div className="text-sm">
                            <div className="font-medium mb-1">Permissions:</div>
                            <div className="flex flex-wrap gap-1">
                              {role.permissions.slice(0, 5).map((p: { permission: { id: string; description: string | null } }) => (
                                <Badge key={p.permission.id} variant="outline" className="text-xs">
                                  {p.permission.description}
                                </Badge>
                              ))}
                              {role.permissions.length > 5 && (
                                <Badge variant="outline" className="text-xs">
                                  +{role.permissions.length - 5} more
                                </Badge>
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Assignments Tab */}
        <TabsContent value="assignments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>User Role Assignments</CardTitle>
              <CardDescription>
                Assign roles to users and manage their access levels.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {userAssignments.map((user) => (
                  <div key={user.id} className="flex items-center justify-between border rounded-lg p-4">
                    <div>
                      <div className="font-medium">{user.name || user.email}</div>
                      <div className="text-sm text-muted-foreground">{user.email}</div>
                      <div className="text-xs mt-1">
                        Current role:{" "}
                        <Badge variant="outline">
                          {getRoleDisplayName(user.role, user.customRole)}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={user.role === "CUSTOM" && user.customRole ? `custom:${user.customRole.id}` : user.role}
                        onChange={(e) => {
                          const value = e.target.value
                          if (value.startsWith("custom:")) {
                            const customRoleId = value.replace("custom:", "")
                            handleAssignRoleToUser(user.id, "custom", customRoleId)
                          } else {
                            handleAssignRoleToUser(user.id, "standard", value as Role)
                          }
                        }}
                        disabled={loading[user.id]}
                      >
                        <option value="ADMIN">Administrator</option>
                        <option value="AGENT">Agent</option>
                        <option value="END_USER">End User</option>
                        {customRoles.filter(r => r.isActive).map(role => (
                          <option key={role.id} value={`custom:${role.id}`}>
                            Custom: {role.name}
                          </option>
                        ))}
                      </select>
                      {loading[user.id] && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}