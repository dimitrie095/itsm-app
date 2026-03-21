import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart3, TrendingUp, TrendingDown, Download, AlertTriangle, CheckCircle, Clock, Users } from "lucide-react"
import Link from "next/link"
import { getAnalyticsData } from "./actions"
import { Badge } from "@/components/ui/badge"
import { TicketStatus, Priority, TicketSource } from "@prisma/client"

function getStatusColor(status: TicketStatus) {
  switch (status) {
    case TicketStatus.NEW: return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
    case TicketStatus.ASSIGNED: return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300"
    case TicketStatus.IN_PROGRESS: return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
    case TicketStatus.RESOLVED: return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
    case TicketStatus.CLOSED: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
    default: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
  }
}

function getPriorityColor(priority: Priority) {
  switch (priority) {
    case Priority.CRITICAL: return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
    case Priority.HIGH: return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300"
    case Priority.MEDIUM: return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
    case Priority.LOW: return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
    default: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
  }
}

function getSourceColor(source: TicketSource) {
  switch (source) {
    case TicketSource.PORTAL: return "bg-blue-100 text-blue-800"
    case TicketSource.EMAIL: return "bg-purple-100 text-purple-800"
    case TicketSource.PHONE: return "bg-green-100 text-green-800"
    case TicketSource.CHAT: return "bg-pink-100 text-pink-800"
    default: return "bg-gray-100 text-gray-800"
  }
}

export default async function AnalyticsPage() {
  const analytics = await getAnalyticsData()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">Data-driven insights into your IT service performance.</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/reports/new">
            <Download className="mr-2 h-4 w-4" />
            Generate Report
          </Link>
        </Button>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tickets">Tickets</TabsTrigger>
          <TabsTrigger value="sla">SLA</TabsTrigger>
          <TabsTrigger value="agents">Agents</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.totalTickets}</div>
                <div className="flex items-center text-xs text-green-600">
                  <TrendingUp className="mr-1 h-3 w-3" />
                  {analytics.openTickets} currently open
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Avg. Resolution Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.avgResolutionTime.formatted}</div>
                <div className="flex items-center text-xs text-muted-foreground">
                  <Clock className="mr-1 h-3 w-3" />
                  Based on {analytics.totalResolvedTickets} resolved tickets
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Customer Satisfaction</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.customerSatisfaction}%</div>
                <div className="flex items-center text-xs text-green-600">
                  <TrendingUp className="mr-1 h-3 w-3" />
                  +3% from last month
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">First Contact Resolution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.firstContactResolution}%</div>
                <div className="flex items-center text-xs text-green-600">
                  <TrendingUp className="mr-1 h-3 w-3" />
                  +5% from last month
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Ticket Trends</CardTitle>
                <CardDescription>Monthly ticket volume and resolution rate.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.monthlyTrends.length > 0 ? (
                    analytics.monthlyTrends.map((trend) => (
                      <div key={trend.month} className="flex items-center justify-between">
                        <div className="font-medium">{trend.month}</div>
                        <div className="flex items-center gap-4">
                          <div className="text-sm">
                            <span className="font-semibold">{trend.tickets}</span> tickets
                          </div>
                          <div className="text-sm">
                            <span className="font-semibold">{trend.resolutionRate}%</span> resolved
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <BarChart3 className="h-12 w-12 mx-auto mb-2" />
                      <p>No ticket data available for the last 6 months.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Ticket Status Distribution</CardTitle>
                <CardDescription>Current breakdown of ticket statuses.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(analytics.ticketsByStatus).length > 0 ? (
                    Object.entries(analytics.ticketsByStatus).map(([status, count]) => (
                      <div key={status} className="flex items-center justify-between">
                        <Badge className={getStatusColor(status as TicketStatus)}>
                          {status}
                        </Badge>
                        <div className="font-semibold">{count}</div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <AlertTriangle className="h-12 w-12 mx-auto mb-2" />
                      <p>No ticket status data available.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tickets" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>By Priority</CardTitle>
                <CardDescription>Ticket distribution by priority level.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(analytics.ticketsByPriority).length > 0 ? (
                    Object.entries(analytics.ticketsByPriority).map(([priority, count]) => (
                      <div key={priority} className="flex items-center justify-between">
                        <Badge className={getPriorityColor(priority as Priority)}>
                          {priority}
                        </Badge>
                        <div className="font-semibold">{count}</div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                      <p className="text-sm">No priority data available.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>By Source</CardTitle>
                <CardDescription>Where tickets are coming from.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(analytics.ticketsBySource).length > 0 ? (
                    Object.entries(analytics.ticketsBySource).map(([source, count]) => (
                      <div key={source} className="flex items-center justify-between">
                        <Badge className={getSourceColor(source as TicketSource)}>
                          {source}
                        </Badge>
                        <div className="font-semibold">{count}</div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                      <p className="text-sm">No source data available.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resolution Metrics</CardTitle>
                <CardDescription>Key performance indicators.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Total Resolved:</span>
                    <span className="font-semibold">{analytics.totalResolvedTickets}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Currently Open:</span>
                    <span className="font-semibold">{analytics.openTickets}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Avg. Resolution:</span>
                    <span className="font-semibold">{analytics.avgResolutionTime.formatted}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sla" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>SLA Performance</CardTitle>
              <CardDescription>Service Level Agreement compliance across priority levels.</CardDescription>
            </CardHeader>
            <CardContent>
              {analytics.slaPerformance.length > 0 ? (
                <div className="space-y-4">
                  {analytics.slaPerformance.map((sla) => (
                    <div key={sla.priority} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Badge className={getPriorityColor(sla.priority as Priority)}>
                            {sla.priority}
                          </Badge>
                          <span className="text-sm font-medium">
                            Response: {sla.responseTime}h, Resolution: {sla.resolutionTime}h
                          </span>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-sm font-semibold ${sla.complianceRate >= 90 ? 'bg-green-100 text-green-800' : sla.complianceRate >= 80 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                          {sla.complianceRate}% compliance
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span>{sla.compliantTickets} of {sla.totalTickets} tickets met SLA</span>
                        <span className="text-muted-foreground">
                          Target: {sla.priority === 'CRITICAL' ? '99%' : sla.priority === 'HIGH' ? '95%' : '90%'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-2" />
                  <p>No SLA performance data available.</p>
                  <p className="text-sm">Configure SLAs in the system to track compliance.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Agent Performance</CardTitle>
              <CardDescription>Top performers and productivity metrics.</CardDescription>
            </CardHeader>
            <CardContent>
              {analytics.agentPerformance.length > 0 ? (
                <div className="space-y-4">
                  {analytics.agentPerformance.map((agent) => (
                    <div key={agent.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <div className="font-medium">{agent.name}</div>
                          <div className="text-sm text-muted-foreground">{agent.email}</div>
                        </div>
                        <div className="text-2xl font-bold text-primary">
                          {agent.resolvedTickets}
                          <span className="text-sm font-normal text-muted-foreground ml-1">tickets resolved</span>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Performance metrics would include average resolution time and customer satisfaction ratings.
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-2" />
                  <p>No agent performance data available.</p>
                  <p className="text-sm">Agents need to be assigned and resolve tickets to generate metrics.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}