"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Zap, Clock, Mail, Tag, Loader2, Edit } from "lucide-react"
import { toggleRuleStatus, deleteRule } from "./actions"

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

interface AutomationTableProps {
  initialRules: AutomationRule[]
  onRuleChange?: () => void
  onEditRule?: (rule: AutomationRule) => void
}

export default function AutomationTable({ initialRules, onRuleChange, onEditRule }: AutomationTableProps) {
  const [rules, setRules] = useState<AutomationRule[]>(initialRules)
  const [loadingRuleId, setLoadingRuleId] = useState<string | null>(null)
  const [deletingRuleId, setDeletingRuleId] = useState<string | null>(null)

  const triggerIcon = (trigger: string) => {
    if (trigger.includes("Ticket")) return <Tag className="h-4 w-4" />
    if (trigger.includes("SLA")) return <Clock className="h-4 w-4" />
    if (trigger.includes("Email")) return <Mail className="h-4 w-4" />
    return <Zap className="h-4 w-4" />
  }

  const formatAction = (action: string) => {
    if (action.includes(":")) {
      const [mainAction, ...paramParts] = action.split(":")
      const param = paramParts.join(":").trim()
      return (
        <div className="flex flex-col">
          <span className="font-medium">{mainAction.trim()}</span>
          {param && <span className="text-xs text-muted-foreground">{param}</span>}
        </div>
      )
    }
    return action
  }

  const handleToggleStatus = async (ruleId: string, currentStatus: boolean) => {
    setLoadingRuleId(ruleId)
    try {
      const result = await toggleRuleStatus(ruleId, currentStatus)
      if (result.success) {
        // Update local state
        setRules(rules.map(rule => 
          rule.fullId === ruleId 
            ? { ...rule, status: !currentStatus }
            : rule
        ))
        onRuleChange?.()
      }
    } finally {
      setLoadingRuleId(null)
    }
  }

  const handleDelete = async (ruleId: string) => {
    if (!confirm("Are you sure you want to delete this automation rule?")) {
      return
    }
    
    setDeletingRuleId(ruleId)
    try {
      const result = await deleteRule(ruleId)
      if (result.success) {
        // Remove from local state
        setRules(rules.filter(r => r.fullId !== ruleId))
        onRuleChange?.()
      }
    } finally {
      setDeletingRuleId(null)
    }
  }

  const handleEdit = (rule: AutomationRule) => {
    if (onEditRule) {
      onEditRule(rule)
    }
  }

  return (
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
              <TableCell className="max-w-[200px]">
                {rule.condition ? (
                  <div className="text-sm font-mono bg-muted px-2 py-1 rounded">
                    {rule.condition}
                  </div>
                ) : (
                  <span className="text-muted-foreground italic">Always</span>
                )}
              </TableCell>
              <TableCell className="max-w-[200px]">{formatAction(rule.action)}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Switch 
                    checked={rule.status} 
                    onCheckedChange={() => handleToggleStatus(rule.fullId, rule.status)}
                    disabled={loadingRuleId === rule.fullId}
                  />
                  <Badge variant={rule.status ? "default" : "outline"}>
                    {rule.status ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" disabled={loadingRuleId === rule.fullId || deletingRuleId === rule.fullId}>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => handleEdit(rule)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit Rule
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled>Duplicate</DropdownMenuItem>
                    <DropdownMenuItem disabled>Run Manually</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      className="text-red-600"
                      onClick={() => handleDelete(rule.fullId)}
                      disabled={deletingRuleId === rule.fullId}
                    >
                      {deletingRuleId === rule.fullId ? (
                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      ) : null}
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
              No automation rules yet.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  )
}