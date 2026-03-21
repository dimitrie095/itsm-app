"use client"

import { useState, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Clock } from "lucide-react"
import { TicketEditDialog } from "@/components/ticket-edit-dialog"
import { updateTicket } from "@/app/tickets/actions"

interface Ticket {
  id: string
  title: string
  priority: string
  status: string
  assignee: string
  time: string
  original: any
}

interface RecentTicketsTableProps {
  tickets: Ticket[]
  showAssignee?: boolean
  title?: string
  description?: string
}

type PopupTicket = {
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

function priorityColor(priority: string) {
  switch (priority.toLowerCase()) {
    case "critical": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
    case "high":     return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300"
    case "medium":   return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
    case "low":      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
    default:         return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
  }
}

function statusColor(status: string) {
  switch (status) {
    case "New":         return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
    case "Assigned":    return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300"
    case "In Progress": return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300"
    case "Resolved":    return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300"
    case "Closed":      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
    default:            return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
  }
}

export function RecentTicketsTable({ tickets, showAssignee = true }: RecentTicketsTableProps) {
  const [selectedTicket, setSelectedTicket] = useState<PopupTicket | null>(null)
  const [popupOpen, setPopupOpen] = useState(false)
  const [users, setUsers] = useState<Array<{id: string, name: string | null, email: string}>>([])

  // Fetch users for assignment dropdown
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

  const handleRowClick = (ticket: Ticket) => {
    // Transform ticket to match TicketEditDialog interface
    const original = ticket.original || ticket
    const assignedTo = original.assignedTo ? {
      id: original.assignedTo.id,
      name: original.assignedTo.name,
      email: original.assignedTo.email
    } : null
    
    // Always use original.status from database (should be in uppercase enum format)
    // If original is the same as ticket (no .original property), use ticket.status
    const status = original.status || ticket.status
    
    const popupTicket: PopupTicket = {
      id: ticket.id,
      title: ticket.title,
      status,
      assignedToId: original.assignedToId || null,
      assignedTo
    }
    setSelectedTicket(popupTicket)
    setPopupOpen(true)
  }

  const handlePopupOpenChange = (open: boolean) => {
    setPopupOpen(open)
    if (!open) {
      setSelectedTicket(null)
    }
  }

  const handleSave = async (ticketId: string, updates: { status?: string; assignedToId?: string | null }) => {
    try {
      await updateTicket(ticketId, updates)
      // No need to refresh tickets on dashboard - they are static
      // The popup will close automatically after successful save
    } catch (error) {
      // Error handling is done by TicketEditDialog's toast
      throw error
    }
  }

  return (
    <>
      <div className="overflow-x-auto">
        {tickets.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">ID</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  {showAssignee && <TableHead>Assigned To</TableHead>}
                  <TableHead>Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.map((ticket) => (
                  <TableRow 
                    key={ticket.id} 
                    className="hover:bg-muted/40 cursor-pointer"
                    onClick={() => handleRowClick(ticket)}
                  >
                    <TableCell className="font-medium pl-4">
                      <span className="font-mono text-xs">{ticket.id}</span>
                    </TableCell>
                    <TableCell className="max-w-[180px] truncate" title={ticket.title}>
                      {ticket.title}
                    </TableCell>
                    <TableCell>
                      <Badge className={priorityColor(ticket.priority)}>
                        {ticket.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColor(ticket.status)}>
                        {ticket.status}
                      </Badge>
                    </TableCell>
                    {showAssignee && (
                      <TableCell>
                        {ticket.assignee === "Unassigned" ? (
                          <span className="flex items-center gap-1 text-orange-600 text-xs font-medium">
                            <AlertTriangle className="h-3 w-3" />
                            Unassigned
                          </span>
                        ) : (
                          <span className="text-muted-foreground truncate">{ticket.assignee}</span>
                        )}
                      </TableCell>
                    )}
                    <TableCell>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {ticket.time}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-6 sm:py-8 text-muted-foreground">
            <p>No tickets yet.</p>
          </div>
        )}
      </div>

      <TicketEditDialog
        open={popupOpen}
        onOpenChange={handlePopupOpenChange}
        ticket={selectedTicket}
        onSave={handleSave}
        users={users}
      />
    </>
  )
}