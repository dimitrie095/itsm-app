"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

type AssetStatusValue = "ACTIVE" | "INACTIVE" | "MAINTENANCE" | "RETIRED" | "LOST"

interface Asset {
  id: string
  name: string
  status: string
  location: string
  assignedToId?: string | null
}

interface AssetEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  asset: Asset | null
  onSave: (assetId: string, updates: { status?: AssetStatusValue; location?: string; userId?: string | null }) => Promise<void>
  users?: Array<{
    id: string
    name: string | null
    email: string
  }>
}

const STATUS_OPTIONS: Array<{ value: AssetStatusValue; label: string }> = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "MAINTENANCE", label: "Maintenance" },
  { value: "RETIRED", label: "Retired" },
  { value: "LOST", label: "Lost" },
]

function normalizeStatus(status?: string): AssetStatusValue {
  const value = (status || "").toUpperCase().replace(/\s+/g, "_")
  if (value === "ACTIVE" || value === "INACTIVE" || value === "MAINTENANCE" || value === "RETIRED" || value === "LOST") {
    return value
  }
  return "ACTIVE"
}

export function AssetEditDialog({ open, onOpenChange, asset, onSave, users = [] }: AssetEditDialogProps) {
  const [status, setStatus] = useState<AssetStatusValue>("ACTIVE")
  const [location, setLocation] = useState("")
  const [assignedToId, setAssignedToId] = useState<string | null>(null)
  const [assigneeSearch, setAssigneeSearch] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const statusSelectRef = useRef<HTMLButtonElement>(null)

  const initialStatus = useMemo(() => normalizeStatus(asset?.status), [asset?.status])
  const initialLocation = useMemo(() => asset?.location ?? "", [asset?.location])
  const initialAssignedToId = useMemo(() => asset?.assignedToId ?? null, [asset?.assignedToId])
  const userOptions = useMemo(
    () => [
      { value: "unassigned", label: "Unassigned" },
      ...users.map((user) => ({ value: user.id, label: user.name || user.email })),
    ],
    [users]
  )
  const filteredUserOptions = useMemo(() => {
    const query = assigneeSearch.trim().toLowerCase()
    if (!query) {
      const topUsers = userOptions.filter((option) => option.value !== "unassigned").slice(0, 6)
      const selectedOption =
        assignedToId && !topUsers.some((option) => option.value === assignedToId)
          ? userOptions.find((option) => option.value === assignedToId) ?? null
          : null
      return [
        userOptions[0], // unassigned
        ...topUsers,
        ...(selectedOption ? [selectedOption] : []),
      ]
    }
    return userOptions.filter((option) => option.value === "unassigned" || option.label.toLowerCase().includes(query))
  }, [assigneeSearch, userOptions, assignedToId])

  useEffect(() => {
    setStatus(initialStatus)
    setLocation(initialLocation)
    setAssignedToId(initialAssignedToId)
  }, [initialAssignedToId, initialStatus, initialLocation])

  useEffect(() => {
    if (!open) return
    const timer = setTimeout(() => statusSelectRef.current?.focus(), 100)
    return () => clearTimeout(timer)
  }, [open])

  const handleSave = useCallback(async () => {
    if (!asset) return

    const updates: { status?: AssetStatusValue; location?: string; userId?: string | null } = {}
    if (status !== initialStatus) updates.status = status
    if (location.trim() !== initialLocation.trim()) updates.location = location.trim()
    if (assignedToId !== initialAssignedToId) updates.userId = assignedToId

    if (Object.keys(updates).length === 0) {
      toast.info("No changes to save")
      return
    }

    setIsSaving(true)
    const toastId = toast.loading("Updating asset...")

    try {
      await onSave(asset.id, updates)
      toast.success("Asset updated successfully", { id: toastId })
      onOpenChange(false)
    } catch (error) {
      toast.error("Failed to update asset", {
        id: toastId,
        description: error instanceof Error ? error.message : "Please try again.",
      })
    } finally {
      setIsSaving(false)
    }
  }, [asset, assignedToId, initialAssignedToId, initialLocation, initialStatus, location, onOpenChange, onSave, status])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!open || isSaving) return
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault()
        void handleSave()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleSave, isSaving, open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Asset</DialogTitle>
          <DialogDescription>
            Update asset status and location. Press{" "}
            <kbd className="px-1 py-0.5 text-xs bg-muted rounded border">Ctrl/Cmd + Enter</kbd>{" "}
            to save quickly.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(event) => {
            event.preventDefault()
            void handleSave()
          }}
          className="space-y-4"
        >
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Name</Label>
              <div className="col-span-3 text-sm text-muted-foreground p-2 bg-muted/30 rounded">
                {asset?.name || "N/A"}
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Asset ID</Label>
              <div className="col-span-3 font-mono text-xs text-muted-foreground p-2 bg-muted/30 rounded">
                {asset?.id || "N/A"}
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="asset-status" className="text-right">
                Status
              </Label>
              <Select value={status} onValueChange={(value) => setStatus(value as AssetStatusValue)}>
                <SelectTrigger ref={statusSelectRef} id="asset-status" className="col-span-3">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="asset-location" className="text-right">
                Location
              </Label>
              <Input
                id="asset-location"
                className="col-span-3"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="Asset location"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="asset-assigned" className="text-right">
                Assign to
              </Label>
              <Select
                value={assignedToId ? assignedToId : "unassigned"}
                onValueChange={(value) => setAssignedToId(value === "unassigned" ? null : value)}
              >
                <SelectTrigger id="asset-assigned" className="col-span-3" aria-label="Assign asset to user">
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  <div className="p-2">
                    <Input
                      placeholder="Search user..."
                      value={assigneeSearch}
                      onChange={(event) => setAssigneeSearch(event.target.value)}
                      onKeyDown={(event) => event.stopPropagation()}
                    />
                  </div>
                  {filteredUserOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save changes"
              )}
            </Button>
          </DialogFooter>
        </form>

        {asset && (
          <div className="text-xs text-muted-foreground mt-2 pt-4 border-t">
            <Button variant="link" size="sm" asChild className="h-auto p-0 text-xs">
              <Link href={`/assets/${asset.id}/edit`}>Open full edit page</Link>
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
