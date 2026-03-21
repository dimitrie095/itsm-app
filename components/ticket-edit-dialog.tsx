"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TicketStatus } from "@/lib/generated/prisma/enums"
import { Loader2, CheckCircle, XCircle } from "lucide-react"
import { toast } from "sonner"
import "./ticket-edit-dialog.css"

/**
 * TicketEditDialog - A modern popup for viewing and editing ticket status and assignment.
 * 
 * @example
 * ```tsx
 * // Example usage with server action
 * import { TicketEditDialog } from "@/components/ticket-edit-dialog"
 * import { updateTicket } from "@/app/tickets/actions"
 * 
 * function TicketList() {
 *   const [editDialogOpen, setEditDialogOpen] = useState(false)
 *   const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
 *   const [users, setUsers] = useState([]) // Load users from API
 * 
 *   const handleSave = async (ticketId: string, updates) => {
 *     await updateTicket(ticketId, updates)
 *     // Refresh ticket list
 *   }
 * 
 *   return (
 *     <>
 *       <Button onClick={() => {
 *         setSelectedTicket(ticket)
 *         setEditDialogOpen(true)
 *       }}>
 *         Edit Ticket
 *       </Button>
 *       <TicketEditDialog
 *         open={editDialogOpen}
 *         onOpenChange={setEditDialogOpen}
 *         ticket={selectedTicket}
 *         onSave={handleSave}
 *         users={users}
 *       />
 *     </>
 *   )
 * }
 * ```
 */

// Define a minimal Ticket interface for the popup
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

interface TicketEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  ticket: Ticket | null
  onSave: (ticketId: string, updates: { status?: string; assignedToId?: string | null }) => Promise<void>
  // Optional list of users for assignment
  users?: Array<{
    id: string
    name: string | null
    email: string
  }>
}

export function TicketEditDialog({
  open,
  onOpenChange,
  ticket,
  onSave,
  users = []
}: TicketEditDialogProps) {
  const [status, setStatus] = useState<string>(TicketStatus.NEW)
  const [assignedToId, setAssignedToId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const statusSelectRef = useRef<HTMLButtonElement>(null)

  // Memoized options
  const statusOptions = useMemo(() => [
    { value: TicketStatus.NEW, label: "New" },
    { value: TicketStatus.ASSIGNED, label: "Assigned" },
    { value: TicketStatus.IN_PROGRESS, label: "In Progress" },
    { value: TicketStatus.RESOLVED, label: "Resolved" },
    { value: TicketStatus.CLOSED, label: "Closed" },
  ], [])

  const userOptions = useMemo(() => [
    { value: "unassigned", label: "Unassigned" },
    ...users.map(user => ({
      value: user.id,
      label: user.name || user.email
    }))
  ], [users])

  // Helper function to normalize status to TicketStatus enum
  const normalizeStatus = useCallback((status: string): TicketStatus => {
    const upperStatus = status?.toUpperCase() || 'NEW'
    // Map common variations to enum values
    if (upperStatus === 'NEW') return TicketStatus.NEW
    if (upperStatus === 'ASSIGNED') return TicketStatus.ASSIGNED
    if (upperStatus === 'IN_PROGRESS' || upperStatus === 'IN PROGRESS') return TicketStatus.IN_PROGRESS
    if (upperStatus === 'RESOLVED') return TicketStatus.RESOLVED
    if (upperStatus === 'CLOSED') return TicketStatus.CLOSED
    // Default to NEW if unknown
    return TicketStatus.NEW
  }, [])

  // Reset form when ticket changes
  useEffect(() => {
    if (ticket) {
      setStatus(normalizeStatus(ticket.status))
      setAssignedToId(ticket.assignedToId)
    } else {
      setStatus(TicketStatus.NEW)
      setAssignedToId(null)
    }
  }, [ticket, normalizeStatus])

  // Auto-focus first field when dialog opens
  useEffect(() => {
    if (open && statusSelectRef.current) {
      setTimeout(() => {
        statusSelectRef.current?.focus()
      }, 100)
    }
  }, [open])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return
      
      // Escape to close
      if (e.key === 'Escape' && !isSaving) {
        e.preventDefault()
        onOpenChange(false)
      }
      
      // Ctrl+Enter or Cmd+Enter to save
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !isSaving && ticket) {
        e.preventDefault()
        handleSave()
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, isSaving, ticket, onOpenChange])

  const handleSave = useCallback(async () => {
    if (!ticket) return
    
    // Validate no changes
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
      
      await onSave(ticket.id, updates)
      
      // Get status label
      const statusLabel = statusOptions.find(opt => opt.value === status)?.label || status
      // Get assignment label
      let assignmentLabel = "Unassigned"
      if (assignedToId) {
        const assignedUser = users.find(u => u.id === assignedToId)
        assignmentLabel = assignedUser?.name || assignedUser?.email || "Assigned"
      }
      
      toast.success("Ticket updated successfully", {
        id: toastId,
        description: `Status: ${statusLabel}, Assignment: ${assignmentLabel}`,
        icon: <CheckCircle className="h-4 w-4 text-green-500" />
      })
      
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to save ticket updates:", error)
      toast.error("Failed to update ticket", {
        id: toastId,
        description: error instanceof Error ? error.message : "Please try again.",
        icon: <XCircle className="h-4 w-4 text-red-500" />
      })
    } finally {
      setIsSaving(false)
    }
  }, [ticket, status, assignedToId, onSave, onOpenChange, users, statusOptions])



  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] ticket-edit-dialog-content">
        <DialogHeader>
          <DialogTitle>Edit Ticket</DialogTitle>
          <DialogDescription>
            Update ticket status and assignment. Press{" "}
            <kbd className="px-1 py-0.5 text-xs bg-muted rounded border">Ctrl/Cmd + Enter</kbd>{" "}
            to save quickly.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSave()
          }}
          className="space-y-4"
        >
          <div className="grid gap-4 py-4 ticket-edit-grid">
            {/* Ticket Title (read-only) */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="ticket-title" className="text-right ticket-edit-label">
                Title
              </Label>
              <div 
                id="ticket-title"
                className="col-span-3 text-sm text-muted-foreground p-2 bg-muted/30 rounded"
                aria-live="polite"
              >
                {ticket?.title || "N/A"}
              </div>
            </div>

            {/* Ticket ID (read-only) */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="ticket-id" className="text-right ticket-edit-label">
                Ticket ID
              </Label>
              <div 
                id="ticket-id"
                className="col-span-3 font-mono text-xs text-muted-foreground p-2 bg-muted/30 rounded"
                aria-live="polite"
              >
                {ticket?.id || "N/A"}
              </div>
            </div>

            {/* Status Selection */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="ticket-status" className="text-right ticket-edit-label">
                Status
              </Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger 
                  ref={statusSelectRef}
                  id="ticket-status"
                  className="col-span-3 ticket-edit-input"
                  aria-label="Ticket status"
                >
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map(option => (
                    <SelectItem 
                      key={option.value} 
                      value={option.value} 
                      className="ticket-edit-select-item"
                      aria-label={`Set status to ${option.label}`}
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Assignment Selection */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="ticket-assigned" className="text-right ticket-edit-label">
                Assign to
              </Label>
              <Select value={assignedToId ? assignedToId : "unassigned"} onValueChange={(value) => setAssignedToId(value === "unassigned" ? null : value)}>
                <SelectTrigger 
                  id="ticket-assigned"
                  className="col-span-3 ticket-edit-input"
                  aria-label="Assign ticket to agent"
                >
                  <SelectValue placeholder="Select agent" />
                </SelectTrigger>
                <SelectContent>
                  {userOptions.map(option => (
                    <SelectItem 
                      key={option.value} 
                      value={option.value} 
                      className="ticket-edit-select-item"
                      aria-label={`Assign to ${option.label}`}
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="button"
              variant="outline" 
              onClick={() => onOpenChange(false)} 
              disabled={isSaving}
              aria-label="Cancel editing"
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={isSaving} 
              className={isSaving ? "ticket-edit-save-button" : ""}
              aria-label="Save ticket changes"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 ticket-edit-spinner" />
                  Saving...
                </>
              ) : (
                "Save changes"
              )}
            </Button>
          </DialogFooter>
        </form>
        <div className="text-xs text-muted-foreground mt-4 pt-4 border-t">
          <p>Tip: Use <kbd className="px-1 py-0.5 bg-muted rounded border">Tab</kbd> to navigate between fields.</p>
        </div>
      </DialogContent>
    </Dialog>
  )
}