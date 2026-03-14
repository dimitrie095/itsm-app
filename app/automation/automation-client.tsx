"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import AutomationTable from "./automation-table"
import RuleModal from "./rule-modal"

interface AutomationRule {
  id: string
  fullId: string
  name: string
  description: string
  trigger: string
  condition: string
  action: string
  status: boolean
}

interface AutomationStats {
  totalRules: number
  activeRules: number
  inactiveRules: number
  executionsToday: number
  timeSavedHours: number
}

interface AutomationClientProps {
  initialRules: AutomationRule[]
  initialStats: AutomationStats
}

export default function AutomationClient({ initialRules, initialStats }: AutomationClientProps) {
  const [rules, setRules] = useState<AutomationRule[]>(initialRules)
  const [stats, setStats] = useState<AutomationStats>(initialStats)
  const [showRuleModal, setShowRuleModal] = useState(false)
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null)

  const handleRuleChange = () => {
    // This would ideally refetch data from server
    // For now, we'll update stats based on current rules
    const activeRules = rules.filter(r => r.status).length
    setStats({
      ...stats,
      totalRules: rules.length,
      activeRules,
      inactiveRules: rules.length - activeRules,
    })
  }

  const handleRuleSaved = () => {
    // Refresh the page to get updated data from server
    window.location.reload()
  }

  const handleNewRule = () => {
    setEditingRule(null)
    setShowRuleModal(true)
  }

  const handleEditRule = (rule: AutomationRule) => {
    setEditingRule(rule)
    setShowRuleModal(true)
  }

  const updateLocalRule = (updatedRule: AutomationRule) => {
    setRules(rules.map(r => r.fullId === updatedRule.fullId ? updatedRule : r))
    handleRuleChange()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Automation</h1>
          <p className="text-muted-foreground">Automate repetitive tasks and workflows with rules.</p>
        </div>
        <Button onClick={handleNewRule}>
          <Plus className="mr-2 h-4 w-4" />
          New Rule
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
          <AutomationTable 
            initialRules={rules} 
            onRuleChange={handleRuleChange}
            onEditRule={handleEditRule}
          />
        </CardContent>
      </Card>

      <RuleModal
        open={showRuleModal}
        onOpenChange={setShowRuleModal}
        onRuleSaved={handleRuleSaved}
        editingRule={editingRule}
      />
    </div>
  )
}