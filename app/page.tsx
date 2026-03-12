import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Ticket, Users, Cpu, BookOpen, ArrowUp, ArrowDown, Clock } from "lucide-react"
import Link from "next/link"

export default function DashboardPage() {
  const stats = [
    { label: "Open Tickets", value: "42", change: "+12%", icon: Ticket, color: "text-blue-600", bgColor: "bg-blue-100" },
    { label: "Active Users", value: "156", change: "+5%", icon: Users, color: "text-green-600", bgColor: "bg-green-100" },
    { label: "Managed Assets", value: "289", change: "+3%", icon: Cpu, color: "text-purple-600", bgColor: "bg-purple-100" },
    { label: "Knowledge Articles", value: "78", change: "+8%", icon: BookOpen, color: "text-amber-600", bgColor: "bg-amber-100" },
  ]

  const recentTickets = [
    { id: "TKT-001", title: "Printer not working", priority: "High", status: "In Progress", assignee: "Alex Johnson", time: "2h ago" },
    { id: "TKT-002", title: "Software license renewal", priority: "Medium", status: "Assigned", assignee: "Sam Rivera", time: "4h ago" },
    { id: "TKT-003", title: "Email configuration", priority: "Low", status: "New", assignee: "Unassigned", time: "6h ago" },
    { id: "TKT-004", title: "Server downtime", priority: "Critical", status: "Resolved", assignee: "Taylor Kim", time: "1d ago" },
    { id: "TKT-005", title: "VPN access issue", priority: "High", status: "In Progress", assignee: "Jordan Lee", time: "1d ago" },
  ]

  const slaCompliance = [
    { level: "Critical", target: 99, actual: 98 },
    { level: "High", target: 95, actual: 92 },
    { level: "Medium", target: 90, actual: 88 },
    { level: "Low", target: 85, actual: 90 },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here's what's happening with your IT service management.</p>
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
                  ) : (
                    <ArrowDown className="mr-1 h-3 w-3 text-red-600" />
                  )}
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
            <div className="space-y-4">
              {recentTickets.map((ticket) => (
                <div key={ticket.id} className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{ticket.id}</span>
                      <span className="font-medium">{ticket.title}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <Badge variant={ticket.priority === 'Critical' ? 'destructive' : ticket.priority === 'High' ? 'default' : 'secondary'}>
                        {ticket.priority}
                      </Badge>
                      <span>{ticket.status}</span>
                      <span>•</span>
                      <span>{ticket.assignee}</span>
                      <span>•</span>
                      <Clock className="h-3 w-3" />
                      <span>{ticket.time}</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">View</Button>
                </div>
              ))}
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
              {slaCompliance.map((sla) => (
                <div key={sla.level} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{sla.level}</span>
                    <span className="text-sm">{sla.actual}% / {sla.target}%</span>
                  </div>
                  <Progress value={sla.actual} className="h-2" />
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-lg bg-muted p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Average Response Time</p>
                  <p className="text-2xl font-bold">24 min</p>
                </div>
                <Badge variant="outline" className="bg-green-50 text-green-700">Within SLA</Badge>
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
            {[
              { title: "How to reset your password", views: 245, category: "Security" },
              { title: "VPN setup guide for remote work", views: 189, category: "Networking" },
              { title: "Troubleshooting printer issues", views: 156, category: "Hardware" },
            ].map((article) => (
              <Card key={article.title} className="bg-muted/50">
                <CardHeader>
                  <CardTitle className="text-lg">{article.title}</CardTitle>
                  <CardDescription>{article.category}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{article.views} views</span>
                    <Button variant="ghost" size="sm">Read</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}