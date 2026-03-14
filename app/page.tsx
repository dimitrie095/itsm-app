import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, ArrowDown, ArrowUp, BookOpen, Clock, Cpu, Ticket, Users } from "lucide-react"
import Link from "next/link"
import { getDashboardData } from "./dashboard-actions"

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
    case "critical": return "bg-red-100 text-red-800"
    case "high":     return "bg-orange-100 text-orange-800"
    case "medium":   return "bg-yellow-100 text-yellow-800"
    case "low":      return "bg-green-100 text-green-800"
    default:         return "bg-gray-100 text-gray-800"
  }
}

// Gleiche Farben wie Status-Badges in tickets/page.tsx
function statusColor(status: string) {
  switch (status) {
    case "New":         return "bg-blue-100 text-blue-800"
    case "Assigned":    return "bg-purple-100 text-purple-800"
    case "In Progress": return "bg-amber-100 text-amber-800"
    case "Resolved":    return "bg-emerald-100 text-emerald-800"
    case "Closed":      return "bg-gray-100 text-gray-800"
    default:            return "bg-gray-100 text-gray-800"
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
    original: ticket
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here&apos;s what&apos;s happening with your IT service management.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/tickets/new">New Ticket</Link>
          </Button>
          <Button variant="outline">Generate Report</Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
                <div className={`p-2 rounded-full ${stat.bgColor}`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="flex items-center text-xs text-muted-foreground">
                  {stat.change.startsWith('+') ? (
                    <ArrowUp className="mr-1 h-3 w-3 text-green-600" />
                  ) : stat.change.startsWith('-') ? (
                    <ArrowDown className="mr-1 h-3 w-3 text-red-600" />
                  ) : null}
                  <span>{stat.change} from last month</span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Tickets */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Tickets</CardTitle>
            <CardDescription>Latest tickets that need attention.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentTickets.length > 0 ? (
                recentTickets.map((ticket: any) => (
                  <div key={ticket.id} className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/40 transition-colors">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground font-mono">{ticket.id}</span>
                        <span className="font-medium text-sm">{ticket.title}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={priorityColor(ticket.priority)}>{ticket.priority}</Badge>
                        <Badge className={statusColor(ticket.status)}>{ticket.status}</Badge>
                        <span className="text-muted-foreground text-xs">•</span>
                        {ticket.assignee === "Unassigned" ? (
                          <span className="flex items-center gap-1 text-orange-600 text-xs font-medium">
                            <AlertTriangle className="h-3 w-3" />
                            Unassigned
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">{ticket.assignee}</span>
                        )}
                        <span className="text-muted-foreground text-xs">•</span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {ticket.time}
                        </span>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">View</Button>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No tickets yet.</p>
                  <p className="text-sm mt-1">
                    <Link href="/tickets/new" className="text-primary hover:underline">
                      Create your first ticket
                    </Link>
                  </p>
                </div>
              )}
            </div>
            <div className="mt-4">
              <Button variant="outline" className="w-full" asChild>
                <Link href="/tickets">View All Tickets</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* SLA Compliance */}
        <Card>
          <CardHeader>
            <CardTitle>SLA Compliance</CardTitle>
            <CardDescription>Service Level Agreement performance.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {slaCompliance.map((sla) => {
                const hasData = sla.actual !== null
                const isMissing = hasData && sla.actual < sla.target
                return (
                  <div key={sla.level} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium">{sla.level}</span>
                        {hasData && isMissing && <AlertTriangle className="h-3 w-3 text-orange-500" />}
                      </div>
                      {/* Prozentzahl in Level-Farbe */}
                      <span className={`text-sm font-medium ${getSlaTextColor(sla.level)}`}>
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
            <div className="mt-6 rounded-lg bg-muted p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Average Response Time</p>
                  <p className="text-2xl font-bold">{averageResponseTime} min</p>
                </div>
                <Badge variant="outline" className={isWithinSLA ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}>
                  {isWithinSLA ? "Within SLA" : "Outside SLA"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Knowledge Base Highlights */}
      <Card>
        <CardHeader>
          <CardTitle>Knowledge Base Highlights</CardTitle>
          <CardDescription>Most viewed articles this week.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {topArticles.length > 0 ? (
              topArticles.map((article) => (
                <Card key={article.title} className="bg-muted/50">
                  <CardHeader>
                    <CardTitle className="text-base">{article.title}</CardTitle>
                    <CardDescription>{article.category}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{article.views} views</span>
                      <Button variant="ghost" size="sm">Read</Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-3 text-center py-8 text-muted-foreground">
                <p>No published articles yet.</p>
                <p className="text-sm mt-1">
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