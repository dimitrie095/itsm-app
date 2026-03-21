"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogOverlay, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { TicketStatus } from "@/lib/generated/prisma/enums"
import { updateTicket } from "@/app/tickets/actions"
import { toast } from "sonner"

interface Ticket {
  id: string
  title: string
  status: string
  assignedToId: string | null
  assignedTo: {
    id: string
    name: string | null
    email: string
  } | null
}

interface TicketPopupProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  ticket: Ticket | null
}

export function TicketPopup({ open, onOpenChange, ticket }: TicketPopupProps) {
  const [status, setStatus] = useState<string>(TicketStatus.NEW)
  const [assignedToId, setAssignedToId] = useState<string | null>(null)
  const [users, setUsers] = useState<Array<{id: string, name: string | null, email: string}>>([])
  const [isSaving, setIsSaving] = useState(false)

  // Status options
  const statusOptions = [
    { value: TicketStatus.NEW, label: "New" },
    { value: TicketStatus.ASSIGNED, label: "Assigned" },
    { value: TicketStatus.IN_PROGRESS, label: "In Progress" },
    { value: TicketStatus.RESOLVED, label: "Resolved" },
    { value: TicketStatus.CLOSED, label: "Closed" },
  ]

  // Fetch users for assignment
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/users')
        if (response.ok) {
          const data = await response.json()
          setUsers(data)
        } else {
          console.error('Failed to fetch users:', response.status)
        }
      } catch (error) {
        console.error('Error fetching users:', error)
        // Silently fail - assignment dropdown will be empty
      }
    }
    fetchUsers()
  }, [])

  // Reset form when ticket changes
  useEffect(() => {
    if (ticket) {
      setStatus(ticket.status)
      setAssignedToId(ticket.assignedToId)
    } else {
      setStatus(TicketStatus.NEW)
      setAssignedToId(null)
    }
  }, [ticket])

  const userOptions = [
    { value: "unassigned", label: "Unassigned" },
    ...users.map(user => ({
      value: user.id,
      label: user.name || user.email
    }))
  ]

  const hasChanges = ticket && (status !== ticket.status || assignedToId !== ticket.assignedToId)

  const handleSave = async () => {
    if (!ticket) return
    if (status === ticket.status && assignedToId === ticket.assignedToId) {
      toast.info("No changes to save", {
        description: "Make changes before saving."
      })
      return
    }

    setIsSaving(true)
    const toastId = toast.loading("Updating ticket...")

    try {
      const updates: { status?: string; assignedToId?: string | null } = {}
      if (status !== ticket.status) {
        updates.status = status
      }
      if (assignedToId !== ticket.assignedToId) {
        updates.assignedToId = assignedToId
      }
      await updateTicket(ticket.id, updates)
      // Get status label
      const statusLabel = statusOptions.find(opt => opt.value === status)?.label || status
      // Get assignment label
      let assignmentLabel = "Unassigned"
      if (assignedToId) {
        const assignedUser = users.find(u => u.id === assignedToId)
        assignmentLabel = assignedUser?.name || assignedUser?.email || "Assigned"
      }
      toast.success("Ticket updated successfully", {
        description: `Status: ${statusLabel}, Assignment: ${assignmentLabel}.`,
        id: toastId
      })
      // Close popup after successful save
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to update ticket:", error)
      toast.error("Failed to update ticket", {
        description: error instanceof Error ? error.message : "Unknown error",
        id: toastId
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogOverlay className="ticket-popup-overlay" />
      <DialogContent className="sm:max-w-md md:max-w-lg ticket-popup-content">
        <DialogHeader>
          <DialogTitle>
            {ticket ? `Ticket: ${ticket.title}` : 'Ticket Details'}
          </DialogTitle>
          <DialogDescription>
            {ticket ? `ID: ${ticket.id}` : 'Select a ticket to view details'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Status Section */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Status</h3>
            <div className="p-3 border rounded-md">
              <div className="space-y-2">
                <Label htmlFor="status-select">Change Status</Label>
                <Select
                  value={status}
                  onValueChange={setStatus}
                  disabled={isSaving || !ticket}
                >
                  <SelectTrigger id="status-select">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Current status: <span className="font-medium">{ticket?.status || "None"}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Assignment Section */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Assignment</h3>
            <div className="p-3 border rounded-md">
              <div className="space-y-2">
                <Label htmlFor="assignment-select">Assign to</Label>
                <Select
                  value={assignedToId || "unassigned"}
                  onValueChange={(value) => setAssignedToId(value === "unassigned" ? null : value)}
                  disabled={isSaving || !ticket}
                >
                  <SelectTrigger id="assignment-select">
                    <SelectValue placeholder="Select agent" />
                  </SelectTrigger>
                  <SelectContent>
                    {userOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Current assignment: <span className="font-medium">{ticket?.assignedTo ? ticket.assignedTo.name || ticket.assignedTo.email : 'Unassigned'}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Ticket Info */}
          {ticket && (
            <div className="space-y-2 text-sm">
              <h3 className="font-medium">Ticket Information</h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="text-muted-foreground">Status:</div>
                <div>{ticket.status}</div>
                <div className="text-muted-foreground">Assigned to:</div>
                <div>{ticket.assignedTo ? ticket.assignedTo.name || ticket.assignedTo.email : 'Unassigned'}</div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Close
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}