import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Plus, Search, Filter } from "lucide-react"
import fs from 'fs/promises'
import path from 'path'

const ticketsFilePath = path.join(process.cwd(), 'tickets.json')

async function getTickets() {
  try {
    const data = await fs.readFile(ticketsFilePath, 'utf-8')
    const tickets = JSON.parse(data)
    // If file exists but is empty array, return empty array
    return tickets
  } catch (error: any) {
    // File doesn't exist, return null to indicate we should show demo data
    if (error.code === 'ENOENT') {
      return null
    }
    // Other error (e.g., invalid JSON), return empty array
    return []
  }
}

export default async function TicketsPage() {
  const tickets = await getTickets()

  // If tickets is null, file doesn't exist - show demo data
  // If tickets is empty array, file exists but no tickets yet
  const displayTickets = tickets === null ? [
    { id: "TKT-001", title: "Printer not working", priority: "High", status: "In Progress", customer: "John Doe", assignedTo: "Alex Johnson", createdAt: "2025-03-10", sla: "24h" },
    { id: "TKT-002", title: "Software license renewal", priority: "Medium", status: "Assigned", customer: "Jane Smith", assignedTo: "Sam Rivera", createdAt: "2025-03-09", sla: "48h" },
    { id: "TKT-003", title: "Email configuration", priority: "Low", status: "New", customer: "Robert Brown", assignedTo: "Unassigned", createdAt: "2025-03-09", sla: "72h" },
    { id: "TKT-004", title: "Server downtime", priority: "Critical", status: "Resolved", customer: "Alice Johnson", assignedTo: "Taylor Kim", createdAt: "2025-03-08", sla: "2h" },
    { id: "TKT-005", title: "VPN access issue", priority: "High", status: "In Progress", customer: "David Wilson", assignedTo: "Jordan Lee", createdAt: "2025-03-08", sla: "24h" },
    { id: "TKT-006", title: "Monitor replacement", priority: "Medium", status: "Closed", customer: "Emma Davis", assignedTo: "Casey White", createdAt: "2025-03-07", sla: "48h" },
  ] : tickets

  const priorityColor = (priority: string) => {
    switch (priority) {
      case "Critical": return "bg-red-100 text-red-800"
      case "High": return "bg-orange-100 text-orange-800"
      case "Medium": return "bg-yellow-100 text-yellow-800"
      case "Low": return "bg-green-100 text-green-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const statusColor = (status: string) => {
    switch (status) {
      case "New": return "bg-blue-100 text-blue-800"
      case "Assigned": return "bg-purple-100 text-purple-800"
      case "In Progress": return "bg-amber-100 text-amber-800"
      case "Resolved": return "bg-emerald-100 text-emerald-800"
      case "Closed": return "bg-gray-100 text-gray-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tickets</h1>
          <p className="text-muted-foreground">Manage and track all support tickets.</p>
        </div>
        <Button asChild>
          <a href="/tickets/new">
            <Plus className="mr-2 h-4 w-4" />
            New Ticket
          </a>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>All Tickets</CardTitle>
              <CardDescription>View, filter, and manage tickets.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search tickets..." className="w-[300px] pl-9" />
              </div>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>SLA</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayTickets.length > 0 ? (
                displayTickets.map((ticket: any) => (
                  <TableRow key={ticket.id}>
                    <TableCell className="font-medium">{ticket.id}</TableCell>
                    <TableCell>{ticket.title}</TableCell>
                    <TableCell>
                      <Badge className={priorityColor(ticket.priority)}>{ticket.priority}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColor(ticket.status)}>{ticket.status}</Badge>
                    </TableCell>
                    <TableCell>{ticket.customer}</TableCell>
                    <TableCell>{ticket.assignedTo}</TableCell>
                    <TableCell>{ticket.createdAt}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{ticket.sla}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem>View Details</DropdownMenuItem>
                          <DropdownMenuItem>Assign to Agent</DropdownMenuItem>
                          <DropdownMenuItem>Change Status</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    No tickets yet. <a href="/tickets/new" className="text-primary hover:underline">Create your first ticket</a>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}