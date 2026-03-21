import { getAutomationRules, getAutomationStats } from "./actions"

export default async function AutomationPage() {
  const rules = await getAutomationRules()
  const stats = await getAutomationStats()

  return (
    <div>
      <h1>Automation Test</h1>
      <p>Rules: {rules.length}</p>
      <p>Active: {stats.activeRules}</p>
    </div>
  )
}

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Automation</h1>
          <p className="text-muted-foreground">Automate repetitive tasks and workflows with rules.</p>
        </div>
        <Button asChild>
          <a href="/automation/new">
            <Plus className="mr-2 h-4 w-4" />
            New Rule
          </a>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Rules</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeRules}</div>
            <p className="text-xs text-muted-foreground">{stats.inactiveRules} inactive</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Executions Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.executionsToday}</div>
            <p className="text-xs text-muted-foreground">No executions recorded</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Time Saved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.timeSavedHours}h</div>
            <p className="text-xs text-muted-foreground">This week</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Automation Rules</CardTitle>
          <CardDescription>Configure rules to automate ticket routing, notifications, and actions.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Trigger</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.length > 0 ? (
                rules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-amber-500" />
                        {rule.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {triggerIcon(rule.trigger)}
                        {rule.trigger}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">{rule.condition}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{rule.action}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch checked={rule.status} disabled />
                        <Badge variant={rule.status ? "default" : "outline"}>
                          {rule.status ? "Active" : "Inactive"}
                        </Badge>
                      </div>
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
                          <DropdownMenuItem>Edit Rule</DropdownMenuItem>
                          <DropdownMenuItem>Duplicate</DropdownMenuItem>
                          <DropdownMenuItem>Run Manually</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No automation rules yet. <a href="/automation/new" className="text-primary hover:underline">Create your first rule</a>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI-Powered Automation</CardTitle>
          <CardDescription>Leverage AI to suggest and create automation rules.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">AI Chatbot for First-Level Support</h3>
                <p className="text-sm text-muted-foreground">Enable AI to handle common user queries automatically.</p>
              </div>
              <Switch />
            </div>
            <div className="mt-4 flex items-center gap-4">
              <Badge variant="outline">Beta</Badge>
              <span className="text-sm">Currently learning from 1,245 conversations.</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}