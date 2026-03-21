import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Plus, 
  Search, 
  Zap, 
  Clock, 
  Mail, 
  Ticket,
  Calendar,
  MessageSquare,
  Activity,
  CheckCircle2,
  XCircle,
  Filter,
  Sparkles,
  FileText,
  PlayCircle,
} from "lucide-react"
import { redirect } from "next/navigation"
import Link from "next/link"
import { getAutomationRules, getAutomationStats, toggleRuleStatus } from "./actions"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { hasPermission } from "@/lib/permission-utils"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { RuleActionsDropdown } from "./rule-actions"
import { FilterControls } from "./filter-controls"
import { SearchInput } from "./search-input"

interface AutomationRule {
  id: string
  name: string
  description: string
  category: string
  trigger: string
  condition: string
  action: string
  status: boolean
  createdAt: string
  updatedAt: string
  lastExecution: string | null
  lastExecutionSuccess: boolean | null
}

// Trigger icon mapping with colors
const getTriggerIcon = (trigger: string) => {
  const iconClass = "h-4 w-4"
  
  if (trigger.includes("Ticket")) return <Ticket className={`${iconClass} text-blue-500`} />
  if (trigger.includes("SLA")) return <Clock className={`${iconClass} text-amber-500`} />
  if (trigger.includes("Email")) return <Mail className={`${iconClass} text-emerald-500`} />
  if (trigger.includes("Daily") || trigger.includes("Weekly") || trigger.includes("Monthly")) return <Calendar className={`${iconClass} text-purple-500`} />
  if (trigger.includes("Chat") || trigger.includes("Message")) return <MessageSquare className={`${iconClass} text-pink-500`} />
  
  return <Zap className={`${iconClass} text-amber-500`} />
}

// Get trigger badge color
const getTriggerBadgeVariant = (trigger: string): "default" | "secondary" | "destructive" | "outline" => {
  if (trigger.includes("Ticket")) return "default"
  if (trigger.includes("SLA")) return "destructive"
  if (trigger.includes("Email")) return "secondary"
  return "outline"
}

// Get rule category based on trigger
const getRuleCategory = (trigger: string): string => {
  const lower = trigger.toLowerCase()
  if (lower.includes("ticket")) return "Ticket"
  if (lower.includes("asset")) return "Asset"
  if (lower.includes("user")) return "User"
  if (lower.includes("knowledge") || lower.includes("article")) return "Knowledge Base"
  if (lower.includes("report") || lower.includes("analytics")) return "Reporting"
  if (lower.includes("role") || lower.includes("permission")) return "Role & Permission"
  if (lower.includes("sla")) return "SLA"
  if (lower.includes("email") || lower.includes("notification")) return "Notification"
  if (lower.includes("daily") || lower.includes("weekly") || lower.includes("monthly") || lower.includes("schedule")) return "Schedule"
  return "General"
}

// Format last execution time
const formatLastExecution = (dateString: string | null, success: boolean | null) => {
  if (!dateString) return <span className="text-xs text-muted-foreground italic">Never</span>
  
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  let timeAgo = ''
  if (diffMins < 60) {
    timeAgo = `${diffMins}m ago`
  } else if (diffHours < 24) {
    timeAgo = `${diffHours}h ago`
  } else {
    timeAgo = `${diffDays}d ago`
  }
  
  return (
    <div className="flex flex-col">
      <span className="text-xs">{timeAgo}</span>
      <span className={`text-xs ${success ? 'text-emerald-600' : 'text-red-600'}`}>
        {success ? 'Success' : 'Failed'}
      </span>
    </div>
  )
}

// Format action for display
const formatAction = (action: string) => {
  if (action.includes(":")) {
    const [mainAction, ...paramParts] = action.split(":")
    const param = paramParts.join(":").trim()
    
    // Map action types to colors
    const getActionColor = (action: string) => {
      const lower = action.toLowerCase()
      if (lower.includes("assign")) return "text-blue-600 bg-blue-50 border-blue-200"
      if (lower.includes("email") || lower.includes("notify")) return "text-emerald-600 bg-emerald-50 border-emerald-200"
      if (lower.includes("priority") || lower.includes("escalate")) return "text-amber-600 bg-amber-50 border-amber-200"
      if (lower.includes("tag")) return "text-purple-600 bg-purple-50 border-purple-200"
      if (lower.includes("close")) return "text-red-600 bg-red-50 border-red-200"
      return "text-slate-600 bg-slate-50 border-slate-200"
    }
    
    return (
      <div className="flex flex-col gap-1">
        <span className="font-medium text-sm">{mainAction.trim()}</span>
        {param && (
          <Badge variant="outline" className={`text-xs font-normal w-fit ${getActionColor(mainAction)}`}>
            {param}
          </Badge>
        )}
      </div>
    )
  }
  return <span className="font-medium text-sm">{action}</span>
}

// Human-readable condition summary
const formatCondition = (condition: string) => {
  if (!condition) return null
  
  // Replace operators with readable text
  const readable = condition
    .replace(/=/g, "equals")
    .replace(/>/g, "greater than")
    .replace(/</g, "less than")
    .replace(/>=/g, "at least")
    .replace(/<=/g, "at most")
    .replace(/AND/gi, "&")
    .replace(/OR/gi, "or")
  
  return (
    <span className="text-xs text-muted-foreground truncate max-w-[200px] block" title={condition}>
      When {readable}
    </span>
  )
}

// Client component for tabs
function AutomationTabs({ 
  filteredRules, 
  canCreateRule, 
  canToggleRule, 
  canUpdateRule, 
  canDeleteRule,
  searchQuery 
}: { 
  filteredRules: any[]
  canCreateRule: boolean
  canToggleRule: boolean
  canUpdateRule: boolean
  canDeleteRule: boolean
  searchQuery: string
}) {
  return (
    <Tabs defaultValue="triggers" className="space-y-6">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="triggers" className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          Triggers
        </TabsTrigger>
        <TabsTrigger value="conditions" className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Conditions
        </TabsTrigger>
        <TabsTrigger value="actions" className="flex items-center gap-2">
          <PlayCircle className="h-4 w-4" />
          Actions
        </TabsTrigger>
      </TabsList>

      <TabsContent value="triggers" className="space-y-4">
        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-muted/30">
            <CardTitle className="text-lg">Triggers Overview</CardTitle>
            <CardDescription>
              Automation rules grouped by trigger type
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {filteredRules.length === 0 ? (
              <div className="text-center py-16 px-4">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <Zap className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  {searchQuery ? 'No matching rules found' : 'No automation rules yet'}
                </h3>
                <p className="text-muted-foreground max-w-sm mx-auto mb-6">
                  {searchQuery 
                    ? 'Try adjusting your search terms to find what you\'re looking for.'
                    : 'Create your first automation rule to streamline repetitive tasks and improve efficiency.'
                  }
                </p>
                {!searchQuery && canCreateRule && (
                  <Link href="/automation/new">
                    <Button className="gap-2">
                      <Plus className="h-4 w-4" />
                      Create First Rule
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[50px]">Status</TableHead>
                    <TableHead className="w-[250px]">Rule</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Trigger</TableHead>
                    <TableHead>Condition</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead className="w-[150px]">Last Execution</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRules.map((rule) => (
                    <TableRow key={rule.id} className="group">
                      {/* Status Toggle */}
                      <TableCell>
                        {canToggleRule ? (
                          <form action={toggleRuleStatus}>
                            <input type="hidden" name="ruleId" value={rule.id} />
                            <input type="hidden" name="currentStatus" value={String(rule.status)} />
                            <Switch 
                              name="status"
                              defaultChecked={rule.status}
                              className="data-[state=checked]:bg-emerald-500"
                            />
                          </form>
                        ) : (
                          <div className="flex items-center">
                            <div className={`h-2 w-2 rounded-full ${rule.status ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                          </div>
                        )}
                      </TableCell>

                      {/* Rule Name & Description */}
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium">{rule.name}</p>
                          {rule.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {rule.description}
                            </p>
                          )}
                        </div>
                      </TableCell>

                      {/* Category */}
                      <TableCell>
                        <Badge variant="secondary">
                          {getRuleCategory(rule.trigger)}
                        </Badge>
                      </TableCell>

                      {/* Trigger with Icon */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getTriggerIcon(rule.trigger)}
                          <span className="text-sm">{rule.trigger}</span>
                        </div>
                      </TableCell>

                      {/* Condition */}
                      <TableCell>
                        {formatCondition(rule.condition)}
                      </TableCell>

                      {/* Action */}
                      <TableCell>
                        {formatAction(rule.action)}
                      </TableCell>

                      {/* Last Execution */}
                      <TableCell>
                        {formatLastExecution(rule.lastExecution, rule.lastExecutionSuccess)}
                      </TableCell>

                      {/* Actions Dropdown */}
                      <TableCell>
                        <RuleActionsDropdown 
                          rule={rule} 
                          canUpdateRule={canUpdateRule}
                          canDeleteRule={canDeleteRule}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="conditions" className="space-y-4">
        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-muted/30">
            <CardTitle className="text-lg">Conditions Overview</CardTitle>
            <CardDescription>
              Automation rules with their conditions
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {filteredRules.length === 0 ? (
              <div className="text-center py-16 px-4">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  {searchQuery ? 'No matching rules found' : 'No automation rules yet'}
                </h3>
                <p className="text-muted-foreground max-w-sm mx-auto mb-6">
                  {searchQuery 
                    ? 'Try adjusting your search terms to find what you\'re looking for.'
                    : 'Create your first automation rule to streamline repetitive tasks and improve efficiency.'
                  }
                </p>
                {!searchQuery && canCreateRule && (
                  <Link href="/automation/new">
                    <Button className="gap-2">
                      <Plus className="h-4 w-4" />
                      Create First Rule
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[50px]">Status</TableHead>
                    <TableHead className="w-[250px]">Rule</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Trigger</TableHead>
                    <TableHead>Condition</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead className="w-[150px]">Last Execution</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRules.map((rule) => (
                    <TableRow key={rule.id} className="group">
                      {/* Status Toggle */}
                      <TableCell>
                        {canToggleRule ? (
                          <form action={toggleRuleStatus}>
                            <input type="hidden" name="ruleId" value={rule.id} />
                            <input type="hidden" name="currentStatus" value={String(rule.status)} />
                            <Switch 
                              name="status"
                              defaultChecked={rule.status}
                              className="data-[state=checked]:bg-emerald-500"
                            />
                          </form>
                        ) : (
                          <div className="flex items-center">
                            <div className={`h-2 w-2 rounded-full ${rule.status ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                          </div>
                        )}
                      </TableCell>

                      {/* Rule Name & Description */}
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium">{rule.name}</p>
                          {rule.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {rule.description}
                            </p>
                          )}
                        </div>
                      </TableCell>

                      {/* Category */}
                      <TableCell>
                        <Badge variant="secondary">
                          {getRuleCategory(rule.trigger)}
                        </Badge>
                      </TableCell>

                      {/* Trigger with Icon */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getTriggerIcon(rule.trigger)}
                          <span className="text-sm">{rule.trigger}</span>
                        </div>
                      </TableCell>

                      {/* Condition */}
                      <TableCell>
                        {formatCondition(rule.condition)}
                      </TableCell>

                      {/* Action */}
                      <TableCell>
                        {formatAction(rule.action)}
                      </TableCell>

                      {/* Last Execution */}
                      <TableCell>
                        {formatLastExecution(rule.lastExecution, rule.lastExecutionSuccess)}
                      </TableCell>

                      {/* Actions Dropdown */}
                      <TableCell>
                        <RuleActionsDropdown 
                          rule={rule} 
                          canUpdateRule={canUpdateRule}
                          canDeleteRule={canDeleteRule}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="actions" className="space-y-4">
        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-muted/30">
            <CardTitle className="text-lg">Actions Overview</CardTitle>
            <CardDescription>
              Automation rules grouped by action type
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {filteredRules.length === 0 ? (
              <div className="text-center py-16 px-4">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <PlayCircle className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  {searchQuery ? 'No matching rules found' : 'No automation rules yet'}
                </h3>
                <p className="text-muted-foreground max-w-sm mx-auto mb-6">
                  {searchQuery 
                    ? 'Try adjusting your search terms to find what you\'re looking for.'
                    : 'Create your first automation rule to streamline repetitive tasks and improve efficiency.'
                  }
                </p>
                {!searchQuery && canCreateRule && (
                  <Link href="/automation/new">
                    <Button className="gap-2">
                      <Plus className="h-4 w-4" />
                      Create First Rule
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[50px]">Status</TableHead>
                    <TableHead className="w-[250px]">Rule</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Trigger</TableHead>
                    <TableHead>Condition</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead className="w-[150px]">Last Execution</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRules.map((rule) => (
                    <TableRow key={rule.id} className="group">
                      {/* Status Toggle */}
                      <TableCell>
                        {canToggleRule ? (
                          <form action={toggleRuleStatus}>
                            <input type="hidden" name="ruleId" value={rule.id} />
                            <input type="hidden" name="currentStatus" value={String(rule.status)} />
                            <Switch 
                              name="status"
                              defaultChecked={rule.status}
                              className="data-[state=checked]:bg-emerald-500"
                            />
                          </form>
                        ) : (
                          <div className="flex items-center">
                            <div className={`h-2 w-2 rounded-full ${rule.status ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                          </div>
                        )}
                      </TableCell>

                      {/* Rule Name & Description */}
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium">{rule.name}</p>
                          {rule.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {rule.description}
                            </p>
                          )}
                        </div>
                      </TableCell>

                      {/* Category */}
                      <TableCell>
                        <Badge variant="secondary">
                          {getRuleCategory(rule.trigger)}
                        </Badge>
                      </TableCell>

                      {/* Trigger with Icon */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getTriggerIcon(rule.trigger)}
                          <span className="text-sm">{rule.trigger}</span>
                        </div>
                      </TableCell>

                      {/* Condition */}
                      <TableCell>
                        {formatCondition(rule.condition)}
                      </TableCell>

                      {/* Action */}
                      <TableCell>
                        {formatAction(rule.action)}
                      </TableCell>

                      {/* Last Execution */}
                      <TableCell>
                        {formatLastExecution(rule.lastExecution, rule.lastExecutionSuccess)}
                      </TableCell>

                      {/* Actions Dropdown */}
                      <TableCell>
                        <RuleActionsDropdown 
                          rule={rule} 
                          canUpdateRule={canUpdateRule}
                          canDeleteRule={canDeleteRule}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}

export default async function AutomationPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const session = await getServerSession(authOptions)
  
  // Check if user has permission to view automation
  const canViewAutomation = hasPermission(session, "automation.view")
  if (!canViewAutomation) {
    redirect('/unauthorized')
  }
  
  const rules = await getAutomationRules()
  const stats = await getAutomationStats()
  
  const canCreateRule = hasPermission(session, "automation.create")
  const userPermissions = (session?.user as any)?.permissions as string[] || []
  const canUpdateRule = userPermissions.includes("automation.update")
  const canDeleteRule = userPermissions.includes("automation.delete")
  const canToggleRule = userPermissions.includes("automation.toggle")

  // Get search query from URL - searchParams is a Promise in Next.js 15
  const resolvedSearchParams = await searchParams
  const searchQuery = typeof resolvedSearchParams.search === 'string' ? resolvedSearchParams.search.toLowerCase() : ''
  const categoryFilter = typeof resolvedSearchParams.category === 'string' ? resolvedSearchParams.category : ''
  const statusFilter = typeof resolvedSearchParams.status === 'string' ? resolvedSearchParams.status : ''
  
  // Filter rules based on search and filters
  const filteredRules = rules.filter(rule => {
    // Search filter
    if (searchQuery && !(
      rule.name.toLowerCase().includes(searchQuery) ||
      rule.trigger.toLowerCase().includes(searchQuery) ||
      rule.action.toLowerCase().includes(searchQuery) ||
      (rule.description && rule.description.toLowerCase().includes(searchQuery))
    )) {
      return false
    }
    
    // Category filter
    if (categoryFilter && categoryFilter !== 'all' && getRuleCategory(rule.trigger) !== categoryFilter) {
      return false
    }
    
    // Status filter
    if (statusFilter === 'active' && !rule.status) {
      return false
    }
    if (statusFilter === 'inactive' && rule.status) {
      return false
    }
    
    return true
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Automation</h1>
          <p className="text-muted-foreground mt-1">
            Automate repetitive tasks and workflows with intelligent rules
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/automation/monitor">
            <Button variant="outline" className="gap-2">
              <Activity className="h-4 w-4" />
              Monitor
            </Button>
          </Link>
          {canCreateRule && (
            <Link href="/automation/new">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                New Rule
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="relative overflow-hidden">
          <div className="absolute right-0 top-0 p-4 opacity-10">
            <Activity className="h-16 w-16" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Rules</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-bold">{stats.activeRules}</div>
              <span className="text-sm text-muted-foreground">/ {stats.totalRules}</span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              {stats.activeRules > 0 ? (
                <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-600">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Running
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <XCircle className="h-3 w-3 mr-1" />
                  No active rules
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute right-0 top-0 p-4 opacity-10">
            <Zap className="h-16 w-16" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Executions Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.executionsToday}</div>
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                <span className="text-xs text-muted-foreground">{stats.successfulExecutions} success</span>
              </div>
              {stats.failedExecutions > 0 && (
                <div className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded-full bg-red-500"></div>
                  <span className="text-xs text-muted-foreground">{stats.failedExecutions} failed</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute right-0 top-0 p-4 opacity-10">
            <Clock className="h-16 w-16" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Time Saved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.timeSavedHours}h</div>
            <p className="text-xs text-muted-foreground mt-2">
              Estimated weekly savings
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute right-0 top-0 p-4 opacity-10">
            <AlertCircle className="h-16 w-16" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Errors & Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.failedExecutions}</div>
            <p className="text-xs text-muted-foreground mt-2">
              {stats.failedExecutions > 0 ? 'Failed executions today' : 'No errors today'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <SearchInput initialSearch={searchQuery} />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter className="h-4 w-4" />
            <span>{filteredRules.length} rule{filteredRules.length !== 1 ? 's' : ''} found</span>
          </div>
        </div>
        
        {/* Filter Controls */}
        <FilterControls 
          initialCategory={categoryFilter}
          initialStatus={statusFilter}
          initialSearch={searchQuery}
        />



            

            

      </div>

      {/* Rules Table */}
      <Card className="overflow-hidden">
        <CardHeader className="border-b bg-muted/30">
          <CardTitle className="text-lg">Automation Rules</CardTitle>
          <CardDescription>
            Manage your workflow automation rules
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {filteredRules.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Zap className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                {searchQuery ? 'No matching rules found' : 'No automation rules yet'}
              </h3>
              <p className="text-muted-foreground max-w-sm mx-auto mb-6">
                {searchQuery 
                  ? 'Try adjusting your search terms to find what you\'re looking for.'
                  : 'Create your first automation rule to streamline repetitive tasks and improve efficiency.'
                }
              </p>
              {!searchQuery && canCreateRule && (
                <Link href="/automation/new">
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Create First Rule
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[50px]">Status</TableHead>
                  <TableHead className="w-[250px]">Rule</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Trigger</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead className="w-[150px]">Last Execution</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRules.map((rule) => (
                  <TableRow key={rule.id} className="group">
                    {/* Status Toggle */}
                    <TableCell>
                      {canToggleRule ? (
                        <form action={toggleRuleStatus}>
                          <input type="hidden" name="ruleId" value={rule.id} />
                          <input type="hidden" name="currentStatus" value={String(rule.status)} />
                          <Switch 
                            name="status"
                            defaultChecked={rule.status}
                            className="data-[state=checked]:bg-emerald-500"
                          />
                        </form>
                      ) : (
                        <Badge variant={rule.status ? "default" : "secondary"} className={rule.status ? "bg-emerald-500" : ""}>
                          {rule.status ? 'On' : 'Off'}
                        </Badge>
                      )}
                    </TableCell>

                    {/* Rule Info */}
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{rule.name}</span>
                          {rule.status && (
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                          )}
                        </div>
                        {rule.description && (
                          <span className="text-xs text-muted-foreground line-clamp-1">
                            {rule.description}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* Category */}
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {getRuleCategory(rule.trigger)}
                      </Badge>
                    </TableCell>

                    {/* Trigger */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getTriggerIcon(rule.trigger)}
                        <div className="flex flex-col">
                          <Badge variant={getTriggerBadgeVariant(rule.trigger)} className="w-fit text-xs">
                            {rule.trigger}
                          </Badge>
                        </div>
                      </div>
                    </TableCell>

                    {/* Condition */}
                    <TableCell>
                      {rule.condition ? (
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-blue-400"></div>
                          {formatCondition(rule.condition)}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">No condition</span>
                      )}
                    </TableCell>

                    {/* Action */}
                    <TableCell>
                      {formatAction(rule.action)}
                    </TableCell>

                    {/* Last Execution */}
                    <TableCell>
                      {formatLastExecution(rule.lastExecution, rule.lastExecutionSuccess)}
                    </TableCell>

                    {/* Actions Menu */}
                    <TableCell>
                      <RuleActionsDropdown 
                        rule={rule}
                        canUpdateRule={canUpdateRule}
                        canCreateRule={canCreateRule}
                        canDeleteRule={canDeleteRule}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Info Alert */}
      <Alert className="bg-blue-50 border-blue-200 text-blue-900">
        <AlertCircle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-700">
          Automation rules run automatically when their trigger conditions are met. 
          Active rules are checked in real-time as tickets are created or updated.
        </AlertDescription>
      </Alert>
    </div>
  )
}
