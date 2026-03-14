"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Save, Cpu, Monitor, Printer, Server, Smartphone, HardDrive, Database } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import { createAsset } from "../actions"

const assetTypes = [
  { value: "Laptop", label: "Laptop", icon: Cpu },
  { value: "Desktop", label: "Desktop", icon: HardDrive },
  { value: "Monitor", label: "Monitor", icon: Monitor },
  { value: "Printer", label: "Printer", icon: Printer },
  { value: "Server", label: "Server", icon: Server },
  { value: "Network", label: "Network Device", icon: Database },
  { value: "Software", label: "Software License", icon: Smartphone },
  { value: "Mobile", label: "Mobile Device", icon: Smartphone },
  { value: "Other", label: "Other", icon: Cpu },
]

const statusOptions = [
  { value: "Active", label: "Active" },
  { value: "Maintenance", label: "Maintenance" },
  { value: "Retired", label: "Retired" },
  { value: "Lost", label: "Lost" },
  { value: "Damaged", label: "Damaged" },
  { value: "In Storage", label: "In Storage" },
]

const departmentOptions = [
  "IT", "Finance", "Sales", "Marketing", "HR", "Engineering", "Operations", "Support", "Management"
]

export default function NewAssetPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    type: "",
    status: "Active",
    assignedTo: "",
    location: "",
    warranty: "",
    serialNumber: "",
    purchaseDate: "",
    purchasePrice: "",
    department: "",
    notes: "",
  })

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Formulardaten vorbereiten
      const data = {
        name: formData.name.trim(),
        type: formData.type,
        status: formData.status,
        assignedTo: formData.assignedTo.trim() || undefined,
        location: formData.location.trim(),
        warranty: formData.warranty.trim() || undefined,
        serialNumber: formData.serialNumber.trim() || undefined,
        purchaseDate: formData.purchaseDate.trim() || undefined,
        purchasePrice: formData.purchasePrice ? parseFloat(formData.purchasePrice) : undefined,
        department: formData.department.trim() || undefined,
        notes: formData.notes.trim() || undefined,
      }

      // Asset erstellen
      const asset = await createAsset(data)

      toast.success("Asset created successfully", {
        description: `"${asset.name}" has been added to the inventory.`,
      })

      // Zur Assets-Liste navigieren
      setTimeout(() => {
        router.push("/assets")
      }, 1500)

    } catch (error) {
      toast.error("Failed to create asset", {
        description: error instanceof Error ? error.message : "Please check your inputs and try again.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/assets">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create New Asset</h1>
          <p className="text-muted-foreground">Add a new IT asset to the inventory.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Form */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Asset Details</CardTitle>
              <CardDescription>Enter the basic information about the asset.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Asset Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Dell Latitude 5420, HP EliteDisplay"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="type">Asset Type *</Label>
                  <Select 
                    value={formData.type} 
                    onValueChange={(value) => handleInputChange('type', value)}
                    disabled={isSubmitting}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select asset type" />
                    </SelectTrigger>
                    <SelectContent>
                      {assetTypes.map((type) => {
                        const Icon = type.icon
                        return (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              <span>{type.label}</span>
                            </div>
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status *</Label>
                  <Select 
                    value={formData.status} 
                    onValueChange={(value) => handleInputChange('status', value)}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="serialNumber">Serial Number</Label>
                  <Input
                    id="serialNumber"
                    placeholder="e.g., SN-00123456"
                    value={formData.serialNumber}
                    onChange={(e) => handleInputChange('serialNumber', e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location *</Label>
                  <Input
                    id="location"
                    placeholder="e.g., Floor 3, Server Room, Storage"
                    value={formData.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    disabled={isSubmitting}
                    required
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="assignedTo">Assigned To</Label>
                  <Input
                    id="assignedTo"
                    placeholder="e.g., John Doe, IT Department"
                    value={formData.assignedTo}
                    onChange={(e) => handleInputChange('assignedTo', e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Select 
                    value={formData.department} 
                    onValueChange={(value) => handleInputChange('department', value)}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departmentOptions.map((dept) => (
                        <SelectItem key={dept} value={dept}>
                          {dept}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Purchase & Warranty */}
          <Card>
            <CardHeader>
              <CardTitle>Purchase & Warranty</CardTitle>
              <CardDescription>Financial and warranty information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="purchaseDate">Purchase Date</Label>
                <Input
                  id="purchaseDate"
                  type="date"
                  value={formData.purchaseDate}
                  onChange={(e) => handleInputChange('purchaseDate', e.target.value)}
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="purchasePrice">Purchase Price</Label>
                <Input
                  id="purchasePrice"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.purchasePrice}
                  onChange={(e) => handleInputChange('purchasePrice', e.target.value)}
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="warranty">Warranty End Date</Label>
                <Input
                  id="warranty"
                  type="date"
                  value={formData.warranty}
                  onChange={(e) => handleInputChange('warranty', e.target.value)}
                  disabled={isSubmitting}
                />
                <p className="text-sm text-muted-foreground">
                  Leave empty if no warranty or expired
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Notes & Actions */}
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Additional Notes</CardTitle>
              <CardDescription>Any additional information about the asset.</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Enter any notes, special configurations, or other relevant information..."
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                disabled={isSubmitting}
                rows={4}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
              <CardDescription>Save or cancel</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Button 
                  type="submit"
                  disabled={isSubmitting || !formData.name || !formData.type || !formData.location}
                  className="w-full"
                >
                  {isSubmitting ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Create Asset
                    </>
                  )}
                </Button>

                <Button 
                  variant="outline" 
                  type="button"
                  disabled={isSubmitting}
                  className="w-full"
                  asChild
                >
                  <Link href="/assets">
                    Cancel
                  </Link>
                </Button>
              </div>

              <div className="text-sm text-muted-foreground space-y-1">
                <p>• Fields marked with * are required</p>
                <p>• Asset will be assigned a unique ID automatically</p>
                <p>• You can edit asset details later</p>
                <p>• Warranty tracking helps with maintenance planning</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  )
}