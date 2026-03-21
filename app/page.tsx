import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { RecentTicketsTable } from "@/components/recent-tickets-table"
import { authOptions } from "@/lib/auth"
import { hasPermission } from "@/lib/permission-utils"
import { AlertTriangle, ArrowDown, ArrowUp, BookOpen, CheckCircle, Clock, Cpu, HelpCircle, Plus, Settings, Ticket, Users } from "lucide-react"
import { getServerSession } from "next-auth"
import Link from "next/link"
import { redirect } from "next/navigation"
import { getDashboardData } from "./dashboard-actions"
import { getEndUserDashboardData } from "./enduser-dashboard-actions"

// Hilfsfunktion zum Berechnen der relativen Zeit
function timeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 60) {
    return `${diffMins}m ago`
  } else if (diffHours < 24) {
    return `${diffHours}h ago`
  } else {
    return `${diffDays}d ago`
  }
}

// Gleiche Farben wie Priority-Badges in tickets/page.tsx
function priorityColor(priority: string) {
  switch (priority.toLowerCase()) {
    case "critical": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
    case "high":     return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300"
    case "medium":   return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
    case "low":      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
    default:         return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
  }
}

// Border colors for priority indicators
function priorityBorderColor(priority: string) {
  switch (priority.toLowerCase()) {
    case "critical": return "border-l-red-400"
    case "high":     return "border-l-orange-400"
    case "medium":   return "border-l-yellow-400"
    case "low":      return "border-l-green-400"
    default:         return "border-l-gray-400"
  }
}

// Gleiche Farben wie Status-Badges in tickets/page.tsx
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

// SLA Balken-Farbe: passend zu Priority-Badge-Farben je Level
function getSlaBarColor(level: string) {
  switch (level) {
    case "Critical": return "bg-red-400"
    case "High":     return "bg-orange-400"
    case "Medium":   return "bg-yellow-400"
    case "Low":      return "bg-green-400"
    default:         return "bg-gray-400"
  }
}

// Spur-Hintergrund passend zum Level (helle Variante der Badge-Farbe)
function getSlaTrackColor(level: string) {
  switch (level) {
    case "Critical": return "bg-red-100"
    case "High":     return "bg-orange-100"
    case "Medium":   return "bg-yellow-100"
    case "Low":      return "bg-green-100"
    default:         return "bg-secondary"
  }
}

// Prozentzahl-Farbe passend zum Level
function getSlaTextColor(level: string) {
  switch (level) {
    case "Critical": return "text-red-800"
    case "High":     return "text-orange-800"
    case "Medium":   return "text-yellow-700"
    case "Low":      return "text-green-800"
    default:         return "text-gray-800"
  }
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  
  // Redirect to login if no session
  if (!session) {
    redirect('/login')
  }
  
  // Check if user has permission to view dashboard
  const canViewDashboard = hasPermission(session, "dashboard.view")
  if (!canViewDashboard) {
    redirect('/unauthorized')
  }
  
  // Check if user is an end user
  const isEndUser = session?.user?.role === "END_USER"
  
  if (isEndUser) {
    return <EndUserDashboard session={session} />
  } else {
    return <AdminAgentDashboard session={session} />
  }
}

// Dashboard for End Users
async function EndUserDashboard({ session }: { session: any }) {
  const userEmail = session?.user?.email || ""
  const sessionUserName = session?.user?.name || "User"
  
  // Load end user specific data
  const { 
    userName,
    userTickets,
    recentTickets,
    openTickets,
    resolvedThisMonth,
    topArticles,
    averageResponseTime,
    stats
  } = await getEndUserDashboardData(userEmail)
  
  // Use database username if available, otherwise session username
  const displayName = userName || sessionUserName
  
  // End User Stats Cards
  const endUserStats = [
    { 
      label: "Open Tickets", 
      value: openTickets.toString(), 
      change: openTickets > 0 ? `+${openTickets} active` : "No open tickets", 
      icon: Ticket, 
      color: "text-blue-600", 
      bgColor: "bg-blue-100" 
    },
    { 
      label: "Resolved Tickets", 
      value: resolvedThisMonth.toString(), 
      change: resolvedThisMonth > 0 ? `${resolvedThisMonth} resolved` : "None yet", 
      icon: CheckCircle, 
      color: "text-green-600", 
      bgColor: "bg-green-100" 
    },
    { 
      label: "Avg. Resolution Time", 
      value: stats.averageResponseTime, 
      change: stats.withinSLA ? "Within SLA" : "Needs attention", 
      icon: Clock, 
      color: "text-amber-600", 
      bgColor: "bg-amber-100" 
    },
  ]

  // Transform recentTickets to include original ticket for popup
  const transformedRecentTickets = recentTickets.map((ticket: any) => {
    const originalTicket = userTickets.find((t: any) => t.id === ticket.id)
    return {
      ...ticket,
      original: originalTicket || ticket
    }
  })

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Welcome back, {displayName}!</h1>
        <p className="text-muted-foreground text-sm sm:text-base">Here's your support dashboard</p>
      </div>
      
      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Button variant="outline" className="h-auto py-3 sm:py-4 flex-col" asChild>
          <Link href="/tickets/new">
            <Plus className="h-5 w-5 sm:h-6 sm:w-6 mb-1 sm:mb-2" />
            <span className="text-xs sm:text-sm">New Ticket</span>
          </Link>
        </Button>
        <Button variant="outline" className="h-auto py-3 sm:py-4 flex-col" asChild>
          <Link href="/knowledge">
            <BookOpen className="h-5 w-5 sm:h-6 sm:w-6 mb-1 sm:mb-2" />
            <span className="text-xs sm:text-sm">Knowledge Base</span>
          </Link>
        </Button>
        <Button variant="outline" className="h-auto py-3 sm:py-4 flex-col" asChild>
          <Link href="/settings">
            <Settings className="h-5 w-5 sm:h-6 sm:w-6 mb-1 sm:mb-2" />
            <span className="text-xs sm:text-sm">My Profile</span>
          </Link>
        </Button>
        <Button variant="outline" className="h-auto py-3 sm:py-4 flex-col" asChild>
          <Link href="/tickets">
            <HelpCircle className="h-5 w-5 sm:h-6 sm:w-6 mb-1 sm:mb-2" />
            <span className="text-xs sm:text-sm">My Tickets</span>
          </Link>
        </Button>
      </div>
      
      {/* Stats Grid */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {endUserStats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label} className="overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 sm:px-6">
                <CardTitle className="text-xs sm:text-sm font-medium">{stat.label}</CardTitle>
                <div className={`p-1.5 sm:p-2 rounded-full ${stat.bgColor}`}>
                  <Icon className={`h-3 w-3 sm:h-4 sm:w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
                <div className="text-xl sm:text-2xl font-bold">{stat.value}</div>
                <div className="flex items-center text-xs text-muted-foreground mt-1">
                  {stat.label === "Avg. Resolution Time" ? (
                    <Badge variant="outline" className={`text-xs ${stats.withinSLA ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}>
                      {stat.change}
                    </Badge>
                  ) : (
                    <span className="truncate">{stat.change}</span>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
      
      <div className="grid gap-4 md:gap-6 grid-cols-1 lg:grid-cols-3">
        {/* My Recent Tickets */}
        <Card className="lg:col-span-2">
          <CardHeader className="px-4 sm:px-6">
            <CardTitle className="text-lg sm:text-xl">My Recent Tickets</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Your most recent support requests.</CardDescription>
          </CardHeader>
          <CardContent className="px-0 sm:px-0">
            <RecentTicketsTable tickets={transformedRecentTickets} showAssignee={false} />
            <div className="mt-4 px-4">
              <Button variant="outline" className="w-full" asChild>
                <Link href="/tickets">View All My Tickets</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Knowledge Base */}
        <Card>
          <CardHeader className="px-4 sm:px-6">
            <CardTitle className="text-lg sm:text-xl">Knowledge Base</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Helpful articles you might need.</CardDescription>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <div className="space-y-3 sm:space-y-4">
              {topArticles.length > 0 ? (
                topArticles.map((article: any) => (
                  <div key={article.id} className="rounded-lg border p-3 sm:p-4 hover:bg-muted/40 transition-colors">
                    <div className="space-y-2">
                      <h3 className="font-medium text-sm">{article.title}</h3>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <Badge variant="outline" className="text-xs w-fit">
                          {article.category}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Recently added
                        </span>
                      </div>
                      <Button variant="ghost" size="sm" className="w-full mt-1" asChild>
                        <Link href="/knowledge">Read Article</Link>
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <p>No articles available.</p>
                </div>
              )}
            </div>
            <div className="mt-4">
              <Button variant="outline" className="w-full" asChild>
                <Link href="/knowledge">Browse Knowledge Base</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Dashboard for Admin/Agent Users (existing dashboard)
async function AdminAgentDashboard({ session }: { session: any }) {
  const canCreateReport = hasPermission(session, "reports.create")
  
  // Daten asynchron laden via Server-Aktion
  const { 
    tickets, 
    articles, 
    userCount, 
    openTickets, 
    managedAssets, 
    totalArticles,
    slaCompliance,
    averageResponseTime,
    isWithinSLA
  } = await getDashboardData()
  
  // Statistik berechnen
  const stats = [
    { 
      label: "Open Tickets", 
      value: openTickets.toString(), 
      change: openTickets > 0 ? "+12%" : "0%", 
      icon: Ticket, 
      color: "text-blue-600", 
      bgColor: "bg-blue-100" 
    },
    { 
      label: "Active Users", 
      value: userCount.toString(), 
      change: userCount > 1 ? "+5%" : "0%", 
      icon: Users, 
      color: "text-green-600", 
      bgColor: "bg-green-100" 
    },
    { 
      label: "Managed Assets", 
      value: managedAssets.toString(), 
      change: "0%", 
      icon: Cpu, 
      color: "text-purple-600", 
      bgColor: "bg-purple-100" 
    },
    { 
      label: "Knowledge Articles", 
      value: totalArticles.toString(), 
      change: totalArticles > 0 ? "+8%" : "0%", 
      icon: BookOpen, 
      color: "text-amber-600", 
      bgColor: "bg-amber-100" 
    },
  ]

  // 5 neueste Tickets
  const recentTickets = tickets.slice(0, 5).map((ticket: any) => ({
    id: ticket.id,
    title: ticket.title,
    priority: ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1).toLowerCase(),
    status: ticket.status,
    assignee: ticket.assignedTo,
    time: timeAgo(ticket.createdAt),
    original: ticket.original || ticket
  }))

  // Top 3 Artikel nach Views
  const topArticles = [...articles]
    .sort((a: any, b: any) => (b.views || 0) - (a.views || 0))
    .slice(0, 3)
    .map((article: any) => ({
      title: article.title,
      views: article.views || 0,
      category: article.category
    }))

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm sm:text-base">Welcome back! Here&apos;s what&apos;s happening with your IT service management.</p>
        </div>
        <div className="flex flex-row items-end gap-2 w-50 sm:w-auto">
          <Button asChild className="w-30 sm:w-25 px-2 sm:px-2 py-1.5 h-9 text-xs sm:text-xs whitespace-nowrap min-w-0">
            <Link href="/tickets/new">New Ticket</Link>
          </Button>
          {canCreateReport && (
            <Button variant="outline" asChild className="w-30 sm:w-30 px-2 sm:px-2 py-1.5 h-9 text-xs sm:text-xs whitespace-nowrap min-w-0">
              <Link href="/reports/new">Generate Report</Link>
            </Button>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label} className="overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 sm:px-6">
                <CardTitle className="text-xs sm:text-sm font-medium">{stat.label}</CardTitle>
                <div className={`p-1.5 sm:p-2 rounded-full ${stat.bgColor}`}>
                  <Icon className={`h-3 w-3 sm:h-4 sm:w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
                <div className="text-xl sm:text-2xl font-bold">{stat.value}</div>
                <div className="flex items-center text-xs text-muted-foreground mt-1">
                  {stat.change.startsWith('+') ? (
                    <ArrowUp className="mr-1 h-3 w-3 text-green-600" />
                  ) : stat.change.startsWith('-') ? (
                    <ArrowDown className="mr-1 h-3 w-3 text-red-600" />
                  ) : null}
                  <span className="truncate">{stat.change} from last month</span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-4 md:gap-6 grid-cols-1 lg:grid-cols-3">
        {/* Recent Tickets */}
        <Card className="lg:col-span-2">
          <CardHeader className="px-4 sm:px-6">
            <CardTitle className="text-lg sm:text-xl">Recent Tickets</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Latest tickets that need attention.</CardDescription>
          </CardHeader>
          <CardContent className="px-0 sm:px-0">
            <RecentTicketsTable tickets={recentTickets} showAssignee={true} />
            <div className="mt-4 px-4">
              <Button variant="outline" className="w-full" asChild>
                <Link href="/tickets">View All Tickets</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* SLA Compliance */}
        <Card>
          <CardHeader className="px-4 sm:px-6">
            <CardTitle className="text-lg sm:text-xl">SLA Compliance</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Service Level Agreement performance.</CardDescription>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <div className="space-y-3 sm:space-y-4">
              {slaCompliance.map((sla) => {
                const hasData = sla.actual !== null
                const isMissing = hasData && sla.actual < sla.target
                return (
                  <div key={sla.level} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs sm:text-sm font-medium">{sla.level}</span>
                        {hasData && isMissing && <AlertTriangle className="h-3 w-3 text-orange-500" />}
                      </div>
                      {/* Prozentzahl in Level-Farbe */}
                      <span className={`text-xs sm:text-sm font-medium ${getSlaTextColor(sla.level)}`}>
                        {hasData ? `${sla.actual}%` : "N/A"}{" "}
                        <span className="text-muted-foreground font-normal">/ {sla.target}%</span>
                      </span>
                    </div>
                    {/* Spur in heller Level-Farbe, Balken in kräftiger Level-Farbe */}
                    <div className={`relative h-2 w-full overflow-hidden rounded-full ${getSlaTrackColor(sla.level)}`}>
                      {hasData && (
                        <>
                          <div
                            className={`h-full rounded-full transition-all ${getSlaBarColor(sla.level)}`}
                            style={{ width: `${sla.actual}%` }}
                          />
                          {/* Ziel-Marker */}
                          <div
                            className="absolute top-0 h-full w-0.5 bg-foreground/40"
                            style={{ left: `${sla.target}%` }}
                          />
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="mt-4 sm:mt-6 rounded-lg bg-muted p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-xs sm:text-sm font-medium">Average Response Time</p>
                  <p className="text-xl sm:text-2xl font-bold">{averageResponseTime} min</p>
                </div>
                <Badge variant="outline" className={`text-xs sm:text-sm ${isWithinSLA ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}>
                  {isWithinSLA ? "Within SLA" : "Outside SLA"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Knowledge Base Highlights */}
      <Card>
        <CardHeader className="px-4 sm:px-6">
          <CardTitle className="text-lg sm:text-xl">Knowledge Base Highlights</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Most viewed articles this week.</CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {topArticles.length > 0 ? (
              topArticles.map((article) => (
                <Card key={article.title} className="bg-muted/50 overflow-hidden">
                  <CardHeader className="px-4 sm:px-6">
                    <CardTitle className="text-sm sm:text-base truncate">{article.title}</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">{article.category}</CardDescription>
                  </CardHeader>
                  <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
                    <div className="flex items-center justify-between">
                      <span className="text-xs sm:text-sm text-muted-foreground">{article.views || 0} views</span>
                      <Button variant="ghost" size="sm" className="text-xs sm:text-sm">Read</Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-1 sm:col-span-2 lg:col-span-3 text-center py-6 sm:py-8 text-muted-foreground">
                <p>No published articles yet.</p>
                <p className="text-xs sm:text-sm mt-1">
                  <Link href="/knowledge/new" className="text-primary hover:underline">
                    Create your first article
                  </Link>
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}