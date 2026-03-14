"use client"

import React, { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Filter, Save, Users, Shield, Check, X, Loader2 } from "lucide-react"
import { getPermissionMatrix, bulkUpdatePermissions, PermissionMatrixData } from "../matrix/actions"

interface PermissionMatrixProps {
  initialData?: PermissionMatrixData
}

export function PermissionMatrix({ initialData }: PermissionMatrixProps) {
  const [data, setData] = useState<PermissionMatrixData | null>(initialData || null)
  const [loading, setLoading] = useState(!initialData)
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [pendingUpdates, setPendingUpdates] = useState<Map<string, boolean>>(new Map())
  const [message, setMessage] = useState<{ type: "success" | "error", text: string } | null>(null)

  // Load data if not provided
  useEffect(() => {
    if (!initialData) {
      loadData()
    }
  }, [initialData])

  const loadData = async () => {
    setLoading(true)
    try {
      const matrixData = await getPermissionMatrix()
      setData(matrixData)
    } catch (error) {
      console.error("Failed to load permission matrix:", error)
      setMessage({ type: "error", text: "Failed to load permission matrix" })
    } finally {
      setLoading(false)
    }
  }

  // Filter permissions based on search and category
  const filteredPermissions = useMemo(() => {
    if (!data) return []
    
    return data.permissions.filter(permission => {
      const matchesSearch = searchQuery === "" || 
        permission.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        permission.description?.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesCategory = !selectedCategory || permission.categoryId === selectedCategory
      
      return matchesSearch && matchesCategory
    })
  }, [data, searchQuery, selectedCategory])

  // Group permissions by category for display
  const permissionsByCategory = useMemo(() => {
    if (!data) return {}
    
    const grouped: Record<string, typeof filteredPermissions> = {}
    
    filteredPermissions.forEach(permission => {
      const categoryId = permission.categoryId || "uncategorized"
      if (!grouped[categoryId]) {
        grouped[categoryId] = []
      }
      grouped[categoryId].push(permission)
    })
    
    return grouped
  }, [data, filteredPermissions])

  // Get category name by ID
  const getCategoryName = (categoryId: string) => {
    if (!data) return "Uncategorized"
    const category = data.categories.find(c => c.id === categoryId)
    return category?.description || category?.name || "Uncategorized"
  }

  // Handle permission toggle
  const handlePermissionToggle = (roleId: string, permissionId: string, granted: boolean) => {
    if (!data) return
    
    // Update local state immediately for optimistic UI
    setData(prev => {
      if (!prev) return prev
      
      const newMatrix = { ...prev.matrix }
      if (!newMatrix[roleId]) newMatrix[roleId] = {}
      newMatrix[roleId][permissionId] = granted
      
      return {
        ...prev,
        matrix: newMatrix
      }
    })
    
    // Store update for batch save
    const key = `${roleId}:${permissionId}`
    setPendingUpdates(prev => new Map(prev.set(key, granted)))
  }

  // Save all pending updates
  const saveUpdates = async () => {
    if (pendingUpdates.size === 0 || !data) return
    
    setSaving(true)
    setMessage(null)
    
    try {
      const updates = Array.from(pendingUpdates.entries()).map(([key, granted]) => {
        const [roleId, permissionId] = key.split(":")
        return { roleId, permissionId, granted }
      })
      
      const result = await bulkUpdatePermissions(updates)
      
      if (result.success) {
        setMessage({ type: "success", text: `Updated ${updates.length} permission(s)` })
        setPendingUpdates(new Map())
      } else {
        setMessage({ type: "error", text: result.error || "Failed to save updates" })
        // Reload data to revert optimistic updates
        await loadData()
      }
    } catch (error) {
      console.error("Error saving updates:", error)
      setMessage({ type: "error", text: "Failed to save updates" })
      // Reload data to revert optimistic updates
      await loadData()
    } finally {
      setSaving(false)
    }
  }

  // Get role display name
  const getRoleDisplayName = (roleId: string) => {
    if (!data) return roleId
    
    const role = data.roles.find(r => r.id === roleId)
    if (!role) return roleId
    
    return role.name
  }

  // Get role type badge
  const getRoleTypeBadge = (roleId: string) => {
    if (['ADMIN', 'AGENT', 'END_USER'].includes(roleId)) {
      return <Badge variant="outline" className="ml-2">Standard</Badge>
    }
    return <Badge variant="secondary" className="ml-2">Custom</Badge>
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2">Loading permission matrix...</span>
      </div>
    )
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Failed to load permission matrix data.</p>
            <Button onClick={loadData} variant="outline" className="mt-4">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Permission Matrix</h2>
          <p className="text-muted-foreground">
            Manage role permissions across the entire system
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {pendingUpdates.size > 0 && (
            <Badge variant="outline" className="mr-2">
              {pendingUpdates.size} pending change(s)
            </Badge>
          )}
          <Button
            onClick={saveUpdates}
            disabled={saving || pendingUpdates.size === 0}
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </div>

      {/* Message alert */}
      {message && (
        <div className={`rounded-md p-4 ${message.type === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
          <div className="flex">
            <div className="flex-shrink-0">
              {message.type === "success" ? (
                <Check className="h-5 w-5" />
              ) : (
                <X className="h-5 w-5" />
              )}
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium">{message.text}</p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="search" className="sr-only">Search permissions</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search permissions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="w-full md:w-48">
              <Label htmlFor="category-filter" className="sr-only">Filter by category</Label>
              <select
                id="category-filter"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={selectedCategory || ""}
                onChange={(e) => setSelectedCategory(e.target.value || null)}
              >
                <option value="">All Categories</option>
                {data.categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.description || category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Matrix Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-4 font-medium">Permission</th>
                {data.roles.map(role => (
                  <th key={role.id} className="text-center p-4 font-medium min-w-[120px]">
                    <div className="flex flex-col items-center">
                      <span className="font-medium">{role.name}</span>
                      <div className="flex items-center gap-1 mt-1">
                        <Users className="h-3 w-3" />
                        <span className="text-xs text-muted-foreground">{role.userCount}</span>
                        {role.type === 'standard' ? (
                          <Badge variant="outline" className="text-xs">Standard</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">Custom</Badge>
                        )}
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(permissionsByCategory).map(([categoryId, categoryPermissions]) => (
                <React.Fragment key={categoryId}>
                  <tr className="bg-muted/30">
                    <td colSpan={data.roles.length + 1} className="p-3 font-semibold">
                      {getCategoryName(categoryId)}
                    </td>
                  </tr>
                  {categoryPermissions.map(permission => (
                    <tr key={permission.id} className="border-b hover:bg-muted/50">
                      <td className="p-4">
                        <div>
                          <div className="font-medium">{permission.description || permission.name}</div>
                          <div className="text-sm text-muted-foreground">{permission.name}</div>
                        </div>
                      </td>
                      {data.roles.map(role => {
                        const isGranted = data.matrix[role.id]?.[permission.id] || false
                        const updateKey = `${role.id}:${permission.id}`
                        const pendingValue = pendingUpdates.get(updateKey)
                        const displayValue = pendingValue !== undefined ? pendingValue : isGranted
                        
                        return (
                          <td key={role.id} className="text-center p-4">
                            <div className="flex justify-center">
                              <Switch
                                checked={displayValue}
                                onCheckedChange={(checked) => 
                                  handlePermissionToggle(role.id, permission.id, checked)
                                }
                                disabled={saving}
                              />
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded-full bg-green-100 border border-green-300" />
          <span>Permission granted</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded-full bg-red-100 border border-red-300" />
          <span>Permission denied</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded-full bg-blue-100 border border-blue-300" />
          <span>Pending change</span>
        </div>
      </div>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
          <CardDescription>
            Overview of permissions across roles
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="text-sm font-medium">Total Roles</div>
              <div className="text-2xl font-bold">{data.roles.length}</div>
              <div className="text-sm text-muted-foreground">
                {data.roles.filter(r => r.type === 'standard').length} standard,{" "}
                {data.roles.filter(r => r.type === 'custom').length} custom
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">Total Permissions</div>
              <div className="text-2xl font-bold">{data.permissions.length}</div>
              <div className="text-sm text-muted-foreground">
                Across {data.categories.length} categories
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">Pending Changes</div>
              <div className="text-2xl font-bold">{pendingUpdates.size}</div>
              <div className="text-sm text-muted-foreground">
                {pendingUpdates.size > 0 ? "Save to apply changes" : "All changes saved"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}