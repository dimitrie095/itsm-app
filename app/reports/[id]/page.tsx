import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Download, Mail, Eye, Calendar, FileText, BarChart, User, Clock, CheckCircle, AlertCircle } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { getReportById } from "../actions"

// Komponente für Metrik-Karten
function MetricCard({ title, value, description, icon: Icon }: any) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  )
}

export default async function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const report = await getReportById(id)

  if (!report) {
    notFound()
  }

  // Status-Icon und Farbe
  const statusConfig = {
    generated: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100' },
    pending: { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-100' },
    failed: { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-100' }
  }

  const StatusIcon = statusConfig[report.status as keyof typeof statusConfig]?.icon || AlertCircle
  const statusColor = statusConfig[report.status as keyof typeof statusConfig]?.color || 'text-gray-600'
  const statusBg = statusConfig[report.status as keyof typeof statusConfig]?.bg || 'bg-gray-100'

  // Type-Icon
  const typeIcons = {
    weekly: Calendar,
    monthly: Calendar,
    sla: BarChart,
    ticket: FileText,
    agent: User
  }
  const TypeIcon = typeIcons[report.type as keyof typeof typeIcons] || FileText

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/reports">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{report.name}</h1>
            <p className="text-muted-foreground">{report.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href={`/api/reports/${report.id}/download`}>
              <Download className="mr-2 h-4 w-4" />
              Download
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/reports/${report.id}/send`}>
              <Mail className="mr-2 h-4 w-4" />
              Send Report
            </Link>
          </Button>
        </div>
      </div>

      {/* Report Info */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Report Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-md bg-primary/10">
                <TypeIcon className="h-4 w-4" />
              </div>
              <span className="font-medium capitalize">{report.type} Report</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-md ${statusBg}`}>
                <StatusIcon className={`h-4 w-4 ${statusColor}`} />
              </div>
              <Badge className={statusBg + " " + statusColor}>
                {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
              </Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Format</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="outline" className="text-sm">
              {report.format.toUpperCase()}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Generated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              {new Date(report.createdAt).toLocaleDateString()}
            </div>
            <div className="text-xs text-muted-foreground">
              {new Date(report.createdAt).toLocaleTimeString()}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Report Summary</CardTitle>
            <CardDescription>Key metrics and findings from the report.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Executive Summary */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Executive Summary</h3>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                  title="Total Tickets"
                  value={report.data.totalTickets}
                  description="All tickets in the system"
                  icon={FileText}
                />
                <MetricCard
                  title="Open Tickets"
                  value={report.data.openTickets}
                  description="Currently pending resolution"
                  icon={AlertCircle}
                />
                <MetricCard
                  title="Resolution Rate"
                  value={`${report.data.resolutionRate}%`}
                  description="Tickets successfully resolved"
                  icon={CheckCircle}
                />
                <MetricCard
                  title="Knowledge Articles"
                  value={report.data.totalArticles}
                  description="Published articles"
                  icon={FileText}
                />
              </div>
            </div>

            <Separator />

            {/* Category Distribution */}
            {report.data.topCategories && report.data.topCategories.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Top Categories</h3>
                <div className="space-y-3">
                  {report.data.topCategories.map((cat: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                      <span className="font-medium">{cat.category}</span>
                      <Badge variant="outline">{cat.count} tickets</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Recent Activity */}
            {report.data.recentTickets && report.data.recentTickets.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Recent Ticket Activity</h3>
                <div className="space-y-3">
                  {report.data.recentTickets.slice(0, 5).map((ticket: any) => (
                    <div key={ticket.id} className="flex items-center justify-between p-3 rounded-lg border">
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
                          <span>{ticket.category || 'Uncategorized'}</span>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
              <CardDescription>Manage this report</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full" asChild>
                <Link href={`/api/reports/${report.id}/download`}>
                  <Download className="mr-2 h-4 w-4" />
                  Download {report.format.toUpperCase()}
                </Link>
              </Button>
              <Button variant="outline" className="w-full" asChild>
                <Link href={`/reports/${report.id}/send`}>
                  <Mail className="mr-2 h-4 w-4" />
                  Send via Email
                </Link>
              </Button>
              <Button variant="ghost" className="w-full" asChild>
                <Link href="/reports">
                  Back to Reports
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Report Metadata */}
          <Card>
            <CardHeader>
              <CardTitle>Report Information</CardTitle>
              <CardDescription>Metadata and details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Report ID:</span>
                  <span className="font-mono text-sm">{report.id.substring(0, 8)}...</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Generated By:</span>
                  <span className="font-medium">{report.metadata.generatedBy}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Date Range:</span>
                  <span className="font-medium text-right">
                    {new Date(report.metadata.dateRange.start).toLocaleDateString()} - {new Date(report.metadata.dateRange.end).toLocaleDateString()}
                  </span>
                </div>
                {report.metadata.emailRecipients && report.metadata.emailRecipients.length > 0 && (
                  <div>
                    <span className="text-sm text-muted-foreground block mb-1">Email Recipients:</span>
                    <div className="space-y-1">
                      {report.metadata.emailRecipients.map((email: string, index: number) => (
                        <div key={index} className="text-sm font-medium truncate">{email}</div>
                      ))}
                    </div>
                  </div>
                )}
                {report.metadata.sentAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Sent At:</span>
                    <span className="font-medium">
                      {new Date(report.metadata.sentAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Data Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Data Preview</CardTitle>
              <CardDescription>Sample of report data</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-sm">
                  <span className="text-muted-foreground">Total Data Points: </span>
                  <span className="font-medium">
                    {report.data.totalTickets + report.data.totalArticles}
                  </span>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Time Period: </span>
                  <span className="font-medium">
                    {Math.round((new Date(report.metadata.dateRange.end).getTime() - new Date(report.metadata.dateRange.start).getTime()) / (1000 * 60 * 60 * 24))} days
                  </span>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Categories Tracked: </span>
                  <span className="font-medium">
                    {Object.keys(report.data.categoryDistribution).length}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}