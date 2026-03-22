"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  Search, 
  Filter, 
  CheckCircle, 
  XCircle, 
  BarChart3,
  RefreshCw,
  Download,
  ChevronLeft,
  ChevronRight,
  Zap,
  Activity,
  AlertCircle
} from "lucide-react"
import { getAutomationExecutions } from "../actions"
import { getAutomationRules } from "../actions"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"
import Link from "next/link"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

interface ExecutionLog {
  id: string
  ruleId: string
  ruleName: string
  ruleTrigger: string
  ruleAction: string
  ruleActive: boolean
  ticketId: string | null
  success: boolean
  executedAt: string
  details?: string
}

interface AutomationRule {
  id: string
  name: string
  status: boolean
}

interface Statistics {
  total: number
  successCount: number
  failureCount: number
  successRate: number
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface ExecutionFilters {
  page?: number
  limit?: number
  search?: string
  ruleId?: string
  success?: boolean
  startDate?: string
  endDate?: string
  ticketId?: string
}

export default function AutomationMonitorPage() {
  const [executions, setExecutions] = useState<ExecutionLog[]>([])
  const [rules, setRules] = useState<AutomationRule[]>([])
  const [statistics, setStatistics] = useState<Statistics>({
    total: 0,
    successCount: 0,
    failureCount: 0,
    successRate: 0
  })
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0
  })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedExecution, setSelectedExecution] = useState<ExecutionLog | null>(null)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)

  // Filters
  const [search, setSearch] = useState("")
  const [selectedRule, setSelectedRule] = useState<string>("all")
  const [successFilter, setSuccessFilter] = useState<string>("all")
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: "",
    end: ""
  })
  const [timeRange, setTimeRange] = useState<string>("7d")

  // Load rules for filter dropdown
  useEffect(() => {
    async function loadRules() {
      try {
        const rulesData = await getAutomationRules()
        setRules(rulesData.map(rule => ({
          id: rule.id,
          name: rule.name,
          status: rule.status
        })))
      } catch (error) {
        console.error("Failed to load rules:", error)
      }
    }
    loadRules()
  }, [])

  // Load executions
  const loadExecutions = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const filters: ExecutionFilters = {
        page,
        limit: 50
      }

      if (search) {
        filters.search = search
      }

      if (selectedRule && selectedRule !== "all") {
        filters.ruleId = selectedRule
      }

      if (successFilter !== "all") {
        filters.success = successFilter === "success"
      }

      // Apply date range based on timeRange selection
      const now = new Date()
      const startDate = new Date()
      
      if (timeRange === "today") {
        startDate.setHours(0, 0, 0, 0)
      } else if (timeRange === "7d") {
        startDate.setDate(startDate.getDate() - 7)
      } else if (timeRange === "30d") {
        startDate.setDate(startDate.getDate() - 30)
      } else if (timeRange === "90d") {
        startDate.setDate(startDate.getDate() - 90)
      }

      if (timeRange !== "all" && timeRange !== "custom") {
        filters.startDate = startDate.toISOString()
        filters.endDate = now.toISOString()
      }

      // Custom date range
      if (timeRange === "custom") {
        if (dateRange.start) {
          filters.startDate = dateRange.start
        }
        if (dateRange.end) {
          filters.endDate = dateRange.end
        }
      }

      const result = await getAutomationExecutions(filters)
      setExecutions(result.executions)
      setStatistics(result.statistics)
      setPagination(result.pagination)
    } catch (error) {
      toast.error("Failed to load execution logs")
      console.error(error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [search, selectedRule, successFilter, timeRange, dateRange])

  // Initial load and reload when filters change
  useEffect(() => {
    loadExecutions(1)
  }, [loadExecutions])

  const handleRefresh = () => {
    setRefreshing(true)
    loadExecutions(pagination.page)
  }

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      loadExecutions(newPage)
    }
  }

  const handleExport = () => {
    toast.info("Export feature coming soon")
    // In a real implementation, this would generate and download a CSV/Excel file
  }

  const handleClearFilters = () => {
    setSearch("")
    setSelectedRule("all")
    setSuccessFilter("all")
    setTimeRange("7d")
    setDateRange({ start: "", end: "" })
  }

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  // Calculate time ago
  const getTimeAgo = (dateString: string) => {
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

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link href="/automation">
              <Button variant="outline" size="icon">
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Activity className="h-6 w-6 text-blue-500" />
              Automation Monitor
            </h1>
          </div>
          <p className="text-muted-foreground">
            Monitor execution logs, statistics, and performance of your automation rules
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Executions</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.total.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">All time executions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.successRate.toFixed(1)}%</div>
            <div className="mt-2">
              <Progress value={statistics.successRate} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Successful</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{statistics.successCount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Executions completed successfully</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{statistics.failureCount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Executions that encountered errors</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
          <CardDescription>
            Filter execution logs by rule, status, and time range
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Rule name or ticket ID..."
                  className="pl-8"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Rule filter */}
            <div className="space-y-2">
              <Label htmlFor="rule">Rule</Label>
              <Select value={selectedRule} onValueChange={setSelectedRule}>
                <SelectTrigger>
                  <SelectValue placeholder="All rules" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All rules</SelectItem>
                  {rules.map((rule) => (
                    <SelectItem key={rule.id} value={rule.id}>
                      {rule.name} {!rule.status && "(Inactive)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status filter */}
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={successFilter} onValueChange={setSuccessFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="success">Successful only</SelectItem>
                  <SelectItem value="failed">Failed only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Time range */}
            <div className="space-y-2">
              <Label htmlFor="timeRange">Time Range</Label>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                  <SelectItem value="custom">Custom range</SelectItem>
                  <SelectItem value="all">All time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Custom date range */}
          {timeRange === "custom" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <Button variant="outline" size="sm" onClick={handleClearFilters}>
              Clear filters
            </Button>
            <div className="text-sm text-muted-foreground">
              Showing {executions.length} of {statistics.total} executions
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for different views */}
      <Tabs defaultValue="logs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="logs">Execution Logs</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        {/* Execution Logs Tab */}
        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Execution Logs</CardTitle>
              <CardDescription>
                Detailed log of all automation rule executions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="flex flex-col items-center gap-4">
                    <RefreshCw className="h-8 w-8 animate-spin" />
                    <p className="text-muted-foreground">Loading execution logs...</p>
                  </div>
                </div>
              ) : executions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No execution logs found</h3>
                  <p className="text-muted-foreground mt-2">
                    {search || selectedRule !== "all" || successFilter !== "all" || timeRange !== "all"
                      ? "Try adjusting your filters to see more results"
                      : "Automation rules haven't been executed yet"}
                  </p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>Rule</TableHead>
                        <TableHead>Trigger</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Ticket ID</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {executions.map((execution) => (
                        <TableRow key={execution.id}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">{formatDate(execution.executedAt)}</span>
                              <span className="text-xs text-muted-foreground">
                                {getTimeAgo(execution.executedAt)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{execution.ruleName}</span>
                              <div className="flex items-center gap-1">
                                <Badge variant={execution.ruleActive ? "default" : "secondary"} className={execution.ruleActive ? "bg-emerald-500" : ""}>
                                  {execution.ruleActive ? 'Active' : 'Inactive'}
                                </Badge>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-[200px] truncate">
                              {execution.ruleTrigger}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-[200px] truncate">
                              {execution.ruleAction}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-mono">
                              {execution.ticketId}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {execution.success ? (
                                <>
                                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                                  <Badge className="bg-emerald-500">Success</Badge>
                                </>
                              ) : (
                                <>
                                  <XCircle className="h-4 w-4 text-red-500" />
                                  <Badge variant="destructive">Failed</Badge>
                                </>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" onClick={() => {
                              setSelectedExecution(execution)
                              setShowDetailsDialog(true)
                            }}>
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Pagination */}
              {!loading && executions.length > 0 && (
                <div className="flex items-center justify-between pt-4">
                  <div className="text-sm text-muted-foreground">
                    Page {pagination.page} of {pagination.totalPages} • {pagination.total} total executions
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page <= 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                        let pageNum = i + 1
                        if (pagination.totalPages > 5) {
                          if (pagination.page <= 3) {
                            pageNum = i + 1
                          } else if (pagination.page >= pagination.totalPages - 2) {
                            pageNum = pagination.totalPages - 4 + i
                          } else {
                            pageNum = pagination.page - 2 + i
                          }
                        }
                        return (
                          <Button
                            key={pageNum}
                            variant={pagination.page === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => handlePageChange(pageNum)}
                          >
                            {pageNum}
                          </Button>
                        )
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page >= pagination.totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Analytics
              </CardTitle>
              <CardDescription>
                Performance analytics and trends for automation rules
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center border rounded-lg">
                <div className="text-center space-y-2">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto" />
                  <p className="text-muted-foreground">Analytics dashboard coming soon</p>
                  <p className="text-sm text-muted-foreground">
                    Charts and graphs showing execution trends over time
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Insights Tab */}
        <TabsContent value="insights">
          <Card>
            <CardHeader>
              <CardTitle>Insights & Recommendations</CardTitle>
              <CardDescription>
                AI-powered insights and optimization suggestions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                    Performance Insights
                  </h4>
                  <p className="text-sm text-muted-foreground mt-2">
                    {statistics.successRate < 80 ? (
                      <>Your automation success rate is lower than optimal. Consider reviewing failed executions for patterns.</>
                    ) : (
                      <>Your automation rules are performing well with a {statistics.successRate.toFixed(1)}% success rate.</>
                    )}
                  </p>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium">Top Rules by Execution Count</h4>
                  <p className="text-sm text-muted-foreground mt-2">
                    View which rules are executed most frequently to identify optimization opportunities.
                  </p>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium">Common Failure Patterns</h4>
                  <p className="text-sm text-muted-foreground mt-2">
                    Analyze failure patterns to improve rule reliability and error handling.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Execution Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Execution Details</DialogTitle>
            <DialogDescription>
              Detailed information about this automation execution
            </DialogDescription>
          </DialogHeader>
          
          {selectedExecution && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Rule Name</Label>
                  <div className="p-2 border rounded-md bg-muted/50">
                    {selectedExecution.ruleName}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Status</Label>
                  <div className="p-2 border rounded-md">
                    <div className="flex items-center gap-2">
                      {selectedExecution.success ? (
                        <>
                          <CheckCircle className="h-4 w-4 text-emerald-500" />
                          <span className="text-emerald-600 font-medium">Success</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-4 w-4 text-red-500" />
                          <span className="text-red-600 font-medium">Failed</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Trigger</Label>
                  <div className="p-2 border rounded-md bg-muted/50">
                    {selectedExecution.ruleTrigger}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Action</Label>
                  <div className="p-2 border rounded-md bg-muted/50">
                    {selectedExecution.ruleAction}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Ticket ID</Label>
                  <div className="p-2 border rounded-md font-mono">
                    {selectedExecution.ticketId}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Execution Time</Label>
                  <div className="p-2 border rounded-md">
                    {formatDate(selectedExecution.executedAt)}
                    <div className="text-xs text-muted-foreground">
                      {getTimeAgo(selectedExecution.executedAt)}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Rule Status</Label>
                <div className="p-2 border rounded-md">
                  <Badge variant={selectedExecution.ruleActive ? "default" : "secondary"} className={selectedExecution.ruleActive ? "bg-emerald-500" : ""}>
                    {selectedExecution.ruleActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Details</Label>
                <div className="p-3 border rounded-md bg-muted/30 min-h-[100px] whitespace-pre-wrap">
                  {selectedExecution.details || "No additional details available for this execution."}
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}