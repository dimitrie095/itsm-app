"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { TicketEditDialog } from "@/components/ticket-edit-dialog"
import { updateTicket } from "@/app/tickets/actions"
import { Search, ChevronLeft, ChevronRight, Plus, Calendar, User, Tag, AlertCircle, MessageSquare, Clock, CheckCircle, XCircle, Ticket } from "lucide-react"
import { useSession } from "next-auth/react"
import { toast } from "sonner"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Role } from "@/lib/generated/prisma/enums"
import { usePermission } from "@/hooks/use-permission"

interface Ticket {
  id: string
  title: string
  description: string
  status: string
  priority: string
  category: string | null
  tags: string[]
  createdAt: string
  updatedAt: string
  closedAt: string | null
  userId: string
  assignedToId: string | null
  assetId: string | null
  slaId: string | null
  source: string
  impact: string
  urgency: string
  calculatedPriority: string | null
  user: {
    id: string
    name: string | null
    email: string
    department: string | null
  }
  assignedTo: {
    id: string
    name: string | null
    email: string
    department: string | null
  } | null
  asset: {
    id: string
    name: string
    type: string
    serialNumber: string | null
    status: string
  } | null
  sla: {
    id: string
    name: string
    responseTime: number
    resolutionTime: number
  } | null
}

interface TicketsResponse {
  tickets: Ticket[]
  userRole: string
  total: number
  pagination: {
    skip: number
    limit: number
    hasMore: boolean
  }
}

interface TicketListProps {
  initialTickets?: Ticket[]
  showFilters?: boolean
  showPagination?: boolean
  limit?: number
}

export function TicketList({ 
  initialTickets = [], 
  showFilters = true, 
  showPagination = true,
  limit = 20 
}: TicketListProps) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const permission = usePermission()
  const canCreateTicket = permission.hasPermission("tickets.create")
  const canAssignTickets = permission.hasPermission("tickets.assign")
  const canDeleteTickets = permission.hasPermission("tickets.delete")
  const canChangeStatus = permission.hasPermission("tickets.update") || permission.hasPermission("tickets.resolve") || permission.hasPermission("tickets.close")
  const canEscalateTickets = permission.hasPermission("tickets.escalate")
  
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [skip, setSkip] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [highlightedTicketId, setHighlightedTicketId] = useState<string | null>(null)
  
  // Filter states
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [priorityFilter, setPriorityFilter] = useState("all")
  const [assignedFilter, setAssignedFilter] = useState("all")
  
  // Ticket detail sheet
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [users, setUsers] = useState<Array<{ id: string; name: string | null; email: string }>>([])
  
  const priorityColor = (priority: string) => {
    switch (priority) {
      case "CRITICAL": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
      case "HIGH": return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300"
      case "MEDIUM": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
      case "LOW": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
    }
  }
  
  const statusColor = (status: string) => {
    switch (status) {
      case "NEW": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
      case "ASSIGNED": return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300"
      case "IN_PROGRESS": return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300"
      case "RESOLVED": return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300"
      case "CLOSED": return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
      case "CANCELLED": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
    }
  }
  
  const fetchTickets = useCallback(async (newSkip = skip) => {
    if (status === "loading") return
    
    try {
      setLoading(true)
      setError(null)
      
      // Build query parameters
      const params = new URLSearchParams()
      params.append("limit", limit.toString())
      params.append("skip", newSkip.toString())
      params.append("_", Date.now().toString()) // Cache busting
      
      if (search) params.append("search", search)
      if (statusFilter && statusFilter !== "all") params.append("status", statusFilter)
      if (priorityFilter && priorityFilter !== "all") params.append("priority", priorityFilter)
      if (assignedFilter && assignedFilter !== "all") params.append("assigned", assignedFilter)
      
      const response = await fetch(`/api/tickets?${params.toString()}`, {
        cache: 'no-store',
        credentials: 'same-origin',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        }
      })
      
      if (!response.ok) {
        throw new Error(`Failed to fetch tickets: ${response.status}`)
      }
      
      const data: TicketsResponse = await response.json()
      setTickets(data.tickets)
      setTotal(data.total)
      setHasMore(data.pagination.hasMore)
      setSkip(newSkip)
    } catch (err) {
      console.error("Error fetching tickets:", err)
      setError(err instanceof Error ? err.message : "Failed to load tickets")
      toast.error("Failed to load tickets")
    } finally {
      setLoading(false)
    }
  }, [status, skip, search, statusFilter, priorityFilter, assignedFilter, limit])
  
  useEffect(() => {
    fetchTickets(0)
  }, [fetchTickets])

  // Load assignable users (agents/admins) for assignment dropdown
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/assignable-users', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        })
        if (!response.ok) {
          throw new Error(`Failed to fetch users: ${response.status}`)
        }
        const data = await response.json()
        setUsers(data)
      } catch (error) {
        console.error('Error fetching users:', error)
        // Silently fail - assignment dropdown will be empty
      }
    }
    fetchUsers()
  }, [])

  // Check for successful ticket creation query parameter
  useEffect(() => {
    const created = searchParams.get('created')
    const highlightId = searchParams.get('highlight')
    
    if (created === 'true') {
      toast.success("Ticket created successfully", {
        description: "Your new ticket has been added to the list.",
      })
      // Refresh the ticket list to show the new ticket
      fetchTickets(0)
    }
    
    if (highlightId) {
      setHighlightedTicketId(highlightId)
      // Remove highlight after 5 seconds
      const timer = setTimeout(() => {
        setHighlightedTicketId(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
    
    // Remove query parameters without page reload
    if (created || highlightId) {
      const newParams = new URLSearchParams(searchParams.toString())
      newParams.delete('created')
      newParams.delete('highlight')
      router.replace(`/tickets?${newParams.toString()}`, { scroll: false })
    }
  }, [searchParams, router, fetchTickets])
  
  const handlePreviousPage = () => {
    if (skip >= limit) {
      fetchTickets(skip - limit)
    }
  }
  
  const handleNextPage = () => {
    if (hasMore) {
      fetchTickets(skip + limit)
    }
  }
  
  const handleResetFilters = () => {
    setSearch("")
    setStatusFilter("all")
    setPriorityFilter("all")
    setAssignedFilter("all")
  }

  const handleTicketClick = (ticket: Ticket) => {
    setSelectedTicket(ticket)
    setSheetOpen(true)
  }

  const handleSave = async (ticketId: string, updates: { status?: string; assignedToId?: string | null }) => {
    try {
      await updateTicket(ticketId, updates)
      // Refresh tickets after update
      fetchTickets(skip)
      toast.success("Ticket updated successfully")
    } catch (error) {
      console.error("Failed to update ticket:", error)
      toast.error("Failed to update ticket")
    }
  }

  const handleSheetClose = (open: boolean) => {
    setSheetOpen(open)
    if (!open) {
      // Reset selected ticket after a short delay to allow animation to complete
      setTimeout(() => setSelectedTicket(null), 300)
    }
  }

  // Keyboard navigation for ticket popup
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!sheetOpen || !selectedTicket || tickets.length === 0) return

      const currentIndex = tickets.findIndex(t => t.id === selectedTicket.id)
      
      switch (e.key) {
        case 'Escape':
          setSheetOpen(false)
          break
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault()
          if (currentIndex < tickets.length - 1) {
            setSelectedTicket(tickets[currentIndex + 1])
          }
          break
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault()
          if (currentIndex > 0) {
            setSelectedTicket(tickets[currentIndex - 1])
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [sheetOpen, selectedTicket, tickets])
  
  if (status === "loading") {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading tickets...</p>
          </div>
        </CardContent>
      </Card>
    )
  }
  
  if (status === "unauthenticated") {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Please sign in to view tickets.</p>
          <Button className="mt-4" asChild>
            <Link href="/login">Sign In</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }
  
  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>All Tickets</CardTitle>
              <CardDescription>
              {total} ticket{total !== 1 ? 's' : ''} total
              {loading && " (loading...)"}
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-2">
            {canCreateTicket && (
              <Button asChild size="sm">
                <Link href="/tickets/new">
                  <Plus className="mr-2 h-4 w-4" />
                  New Ticket
                </Link>
              </Button>
            )}
          </div>
        </div>
        
        {showFilters && (
          <div className="grid gap-4 pt-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search tickets..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              
              <div className="flex flex-wrap gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="NEW">New</SelectItem>
                    <SelectItem value="ASSIGNED">Assigned</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="RESOLVED">Resolved</SelectItem>
                    <SelectItem value="CLOSED">Closed</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priority</SelectItem>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="CRITICAL">Critical</SelectItem>
                  </SelectContent>
                </Select>
                
                {session?.user?.role !== Role.END_USER && (
                  <Select value={assignedFilter} onValueChange={setAssignedFilter}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Assigned" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="me">Assigned to Me</SelectItem>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      <SelectItem value="assigned">Assigned</SelectItem>
                    </SelectContent>
                  </Select>
                )}
                
                {(search || (statusFilter && statusFilter !== "all") || (priorityFilter && priorityFilter !== "all") || (assignedFilter && assignedFilter !== "all")) && (
                  <Button variant="ghost" size="sm" onClick={handleResetFilters}>
                    Clear Filters
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        {error ? (
          <div className="text-center py-12">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => fetchTickets()}>Retry</Button>
          </div>
        ) : loading && tickets.length === 0 ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading tickets...</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No tickets found.
            {canCreateTicket && (
              <p className="mt-2">
                <Link href="/tickets/new" className="text-primary hover:underline">
                  Create your first ticket
                </Link>
              </p>
            )}
          </div>
        ) : (
          <>
            <div className="rounded-md border">
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets.map((ticket) => (
                    <TableRow 
                      key={ticket.id}
                      className={`cursor-pointer hover:bg-muted/50 ${highlightedTicketId === ticket.id ? 'bg-primary/10 animate-pulse' : ''}`}
                      onClick={() => handleTicketClick(ticket)}
                    >
                      <TableCell className="font-medium">
                        <span className="font-mono text-xs">{ticket.id.substring(0, 8).toUpperCase()}</span>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate" title={ticket.title}>
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
                      <TableCell>
                        <div>
                          <div className="font-medium">{ticket.user.name || ticket.user.email}</div>
                          {ticket.user.department && (
                            <div className="text-xs text-muted-foreground">{ticket.user.department}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {ticket.assignedTo ? (
                          <div>
                            <div className="font-medium">{ticket.assignedTo.name || ticket.assignedTo.email}</div>
                            {ticket.assignedTo.department && (
                              <div className="text-xs text-muted-foreground">{ticket.assignedTo.department}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(ticket.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {ticket.sla ? (
                          <Badge variant="outline">
                            {ticket.sla.responseTime}h / {ticket.sla.resolutionTime}h
                          </Badge>
                        ) : (
                          <Badge variant="outline">No SLA</Badge>
                        )}
                      </TableCell>

                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            {showPagination && total > limit && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Showing {skip + 1} to {Math.min(skip + limit, total)} of {total} tickets
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePreviousPage}
                    disabled={skip === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextPage}
                    disabled={!hasMore}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>

    {/* <Sheet open={sheetOpen} onOpenChange={handleSheetClose}>
      <SheetContent className="sm:max-w-2xl overflow-y-auto ticket-popup-content">
        {selectedTicket && (
          <>
            <SheetHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Ticket className="h-5 w-5" />
                  <span className="truncate">{selectedTicket.title}</span>
                  <Badge className={priorityColor(selectedTicket.priority)}>
                    {selectedTicket.priority}
                  </Badge>
                  <Badge className={statusColor(selectedTicket.status)}>
                    {selectedTicket.status}
                  </Badge>
                </div>
                <div className="ticket-nav-controls flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation()
                      const currentIndex = tickets.findIndex(t => t.id === selectedTicket.id)
                      if (currentIndex > 0) {
                        setSelectedTicket(tickets[currentIndex - 1])
                      }
                    }}
                    disabled={tickets.findIndex(t => t.id === selectedTicket.id) === 0}
                    className="h-8 w-8"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {tickets.findIndex(t => t.id === selectedTicket.id) + 1} of {tickets.length}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation()
                      const currentIndex = tickets.findIndex(t => t.id === selectedTicket.id)
                      if (currentIndex < tickets.length - 1) {
                        setSelectedTicket(tickets[currentIndex + 1])
                      }
                    }}
                    disabled={tickets.findIndex(t => t.id === selectedTicket.id) === tickets.length - 1}
                    className="h-8 w-8"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <SheetDescription>
                Ticket ID: {selectedTicket.id} • Created: {new Date(selectedTicket.createdAt).toLocaleDateString()}
                <span className="block text-xs mt-1">
                  Use arrow keys or buttons to navigate • Press Esc to close
                </span>
              </SheetDescription>
            </SheetHeader>
            
            <div className="mt-6 space-y-6">

              <div className="ticket-info-grid">
                <div className="ticket-info-section p-4 space-y-2">
                  <h3 className="text-sm font-medium flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Customer
                  </h3>
                  <div className="text-sm">
                    <p className="font-medium">{selectedTicket.user.name || selectedTicket.user.email}</p>
                    {selectedTicket.user.department && (
                      <p className="text-muted-foreground">{selectedTicket.user.department}</p>
                    )}
                  </div>
                </div>
                
                <div className="ticket-info-section p-4 space-y-2">
                  <h3 className="text-sm font-medium flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Assigned To
                  </h3>
                  <div className="text-sm">
                    {selectedTicket.assignedTo ? (
                      <>
                        <p className="font-medium">{selectedTicket.assignedTo.name || selectedTicket.assignedTo.email}</p>
                        {selectedTicket.assignedTo.department && (
                          <p className="text-muted-foreground">{selectedTicket.assignedTo.department}</p>
                        )}
                      </>
                    ) : (
                      <p className="text-muted-foreground">Unassigned</p>
                    )}
                  </div>
                </div>
                
                <div className="ticket-info-section p-4 space-y-2">
                  <h3 className="text-sm font-medium flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    Category & Tags
                  </h3>
                  <div className="text-sm">
                    {selectedTicket.category ? (
                      <Badge variant="outline" className="mr-2">{selectedTicket.category}</Badge>
                    ) : null}
                    {selectedTicket.tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="mr-1 mb-1">{tag}</Badge>
                    ))}
                  </div>
                </div>
                
                <div className="ticket-info-section p-4 space-y-2">
                  <h3 className="text-sm font-medium flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Impact & Urgency
                  </h3>
                  <div className="text-sm">
                    <p>Impact: <span className="font-medium">{selectedTicket.impact}</span></p>
                    <p>Urgency: <span className="font-medium">{selectedTicket.urgency}</span></p>
                    {selectedTicket.calculatedPriority && (
                      <p>Calculated Priority: <span className="font-medium">{selectedTicket.calculatedPriority}</span></p>
                    )}
                  </div>
                </div>
              </div>
              

              <div className="ticket-info-section p-4 space-y-2">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Description
                </h3>
                <div className="text-sm p-3 ticket-description bg-muted/30 rounded-md">
                  {selectedTicket.description || "No description provided."}
                </div>
              </div>
              

              <div className="ticket-info-grid">
                <div className="ticket-info-section p-4 space-y-2">
                  <h3 className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Created
                  </h3>
                  <div className="text-sm">
                    {new Date(selectedTicket.createdAt).toLocaleString()}
                  </div>
                </div>
                
                <div className="ticket-info-section p-4 space-y-2">
                  <h3 className="text-sm font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Updated
                  </h3>
                  <div className="text-sm">
                    {new Date(selectedTicket.updatedAt).toLocaleString()}
                  </div>
                </div>
                
                <div className="ticket-info-section p-4 space-y-2">
                  <h3 className="text-sm font-medium flex items-center gap-2">
                    {selectedTicket.closedAt ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                    {selectedTicket.closedAt ? "Closed" : "Status"}
                  </h3>
                  <div className="text-sm">
                    {selectedTicket.closedAt ? (
                      new Date(selectedTicket.closedAt).toLocaleString()
                    ) : (
                      <span className="text-muted-foreground">Still open</span>
                    )}
                  </div>
                </div>
              </div>
              

              {selectedTicket.asset && (
                <div className="ticket-info-section p-4 space-y-2">
                  <h3 className="text-sm font-medium flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    Related Asset
                  </h3>
                  <div className="text-sm p-3 bg-muted/30 rounded-md">
                    <p><strong>Name:</strong> {selectedTicket.asset.name}</p>
                    <p><strong>Type:</strong> {selectedTicket.asset.type}</p>
                    <p><strong>Status:</strong> {selectedTicket.asset.status}</p>
                    {selectedTicket.asset.serialNumber && (
                      <p><strong>Serial:</strong> {selectedTicket.asset.serialNumber}</p>
                    )}
                  </div>
                </div>
              )}
              

              {selectedTicket.sla && (
                <div className="ticket-info-section p-4 space-y-2">
                  <h3 className="text-sm font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    SLA Details
                  </h3>
                  <div className="text-sm p-3 bg-muted/30 rounded-md">
                    <p><strong>Name:</strong> {selectedTicket.sla.name}</p>
                    <p><strong>Response Time:</strong> {selectedTicket.sla.responseTime} hours</p>
                    <p><strong>Resolution Time:</strong> {selectedTicket.sla.resolutionTime} hours</p>
                  </div>
                </div>
              )}
              

              <div className="ticket-actions-container flex justify-end gap-3 pt-6 px-4 py-4 mt-6">
                <Button variant="outline" onClick={() => setSheetOpen(false)} className="ticket-action-btn">
                  Close (Esc)
                </Button>
                {canChangeStatus && (
                  <Button className="ticket-action-btn">
                    Update Status
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
    */}
    <TicketEditDialog
      open={sheetOpen}
      onOpenChange={handleSheetClose}
      ticket={selectedTicket}
      onSave={handleSave}
      users={users}
    />
    </>
  )
}