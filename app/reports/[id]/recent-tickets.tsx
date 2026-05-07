"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TicketEditDialog } from "@/components/ticket-edit-dialog"
import { updateTicket } from "@/app/tickets/actions"
import { Eye } from "lucide-react"
import { toast } from "sonner"

interface RecentTicket {
  id: string
  title: string
  priority: string
  status: string
  category?: string | null
}

interface ReportRecentTicketsProps {
  tickets: RecentTicket[]
  reportId: string
}

export function ReportRecentTickets({ tickets, reportId }: ReportRecentTicketsProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null)
  const [users, setUsers] = useState<Array<{ id: string; name: string | null; email: string }>>([])

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch("/api/assignable-users", { cache: "no-store" })
        if (!response.ok) return
        const data = await response.json()
        setUsers(
          data.map((u: any) => ({
            id: u.id,
            name: u.name,
            email: u.email,
          })),
        )
      } catch {
        // leise scheitern, Dialog funktioniert trotzdem (Unassigned-Auswahl möglich)
      }
    }
    fetchUsers()
  }, [])

  const handleOpenTicket = (ticket: RecentTicket) => {
    setSelectedTicket({
      id: ticket.id,
      title: ticket.title,
      status: ticket.status,
      assignedToId: null,
      assignedTo: null,
    })
    setDialogOpen(true)
  }

  const handleSave = async (ticketId: string, updates: { status?: string; assignedToId?: string | null }) => {
    const result = await updateTicket(ticketId, updates)
    if (result?.ticket) {
      toast.success("Ticket updated")
      setSelectedTicket((prev: any) =>
        prev && prev.id === ticketId ? { ...prev, status: result.ticket.status, assignedToId: result.ticket.assignedToId } : prev,
      )
    }
  }

  return (
    <>
      <div className="space-y-3">
        {tickets.slice(0, 5).map((ticket) => (
          <div key={ticket.id} className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono text-muted-foreground">{ticket.id}</span>
                <span className="font-medium">{ticket.title}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="outline">{ticket.priority}</Badge>
                <span>•</span>
                <span>{ticket.status}</span>
                <span>•</span>
                <span>{ticket.category || "Uncategorized"}</span>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => handleOpenTicket(ticket)}>
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <TicketEditDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        ticket={selectedTicket}
        onSave={handleSave}
        users={users}
        fullEditHref={(ticketId) =>
          `/tickets/${ticketId}/edit?returnTo=${encodeURIComponent(`/reports/${reportId}`)}`
        }
      />
    </>
  )
}

