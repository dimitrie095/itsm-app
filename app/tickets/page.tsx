import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getTicketStats } from "./actions"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { TicketList } from "@/components/ticket-list"

export default async function TicketsPage() {
  const session = await getServerSession(authOptions)
  const stats = await getTicketStats(session?.user?.id, session?.user?.role)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tickets</h1>
          <p className="text-muted-foreground">Manage and track all support tickets.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTickets}</div>
            <div className="text-xs text-muted-foreground">All tickets in the system</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.openTickets}</div>
            <div className="text-xs text-muted-foreground">Requiring attention</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.resolvedTickets}</div>
            <div className="text-xs text-muted-foreground">Completed tickets</div>
          </CardContent>
        </Card>
      </div>

      <TicketList 
        showFilters={true}
        showPagination={true}
        limit={20}
      />
    </div>
  )
}