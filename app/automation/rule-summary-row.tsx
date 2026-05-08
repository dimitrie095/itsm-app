"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { TableCell, TableRow } from "@/components/ui/table"
import { Switch } from "@/components/ui/switch"
import { RuleActionsDropdown } from "./rule-actions"
import { Calendar, Clock, Mail, MessageSquare, Ticket, Zap } from "lucide-react"

interface AutomationRuleRow {
  id: string
  name: string
  description: string
  trigger: string
  condition: string
  action: string
  status: boolean
  lastExecution: string | null
  lastExecutionSuccess: boolean | null
}

interface RuleSummaryRowProps {
  rule: AutomationRuleRow
  canToggleRule: boolean
  canUpdateRule: boolean
  canCreateRule: boolean
  canDeleteRule: boolean
  toggleRuleStatus: (formData: FormData) => void | Promise<void>
}

export function RuleSummaryRow({
  rule,
  canToggleRule,
  canUpdateRule,
  canCreateRule,
  canDeleteRule,
  toggleRuleStatus,
}: RuleSummaryRowProps) {
  const [open, setOpen] = useState(false)

  const getTriggerIcon = (trigger: string) => {
    const iconClass = "h-4 w-4"
    if (trigger.includes("Ticket")) return <Ticket className={`${iconClass} text-blue-500`} />
    if (trigger.includes("SLA")) return <Clock className={`${iconClass} text-amber-500`} />
    if (trigger.includes("Email")) return <Mail className={`${iconClass} text-emerald-500`} />
    if (trigger.includes("Daily") || trigger.includes("Weekly") || trigger.includes("Monthly")) return <Calendar className={`${iconClass} text-purple-500`} />
    if (trigger.includes("Chat") || trigger.includes("Message")) return <MessageSquare className={`${iconClass} text-pink-500`} />
    return <Zap className={`${iconClass} text-amber-500`} />
  }

  const getTriggerBadgeVariant = (trigger: string): "default" | "secondary" | "destructive" | "outline" => {
    if (trigger.includes("Ticket")) return "default"
    if (trigger.includes("SLA")) return "destructive"
    if (trigger.includes("Email")) return "secondary"
    return "outline"
  }

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

  const formatCondition = (condition: string) => {
    if (!condition) return null
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

  const formatAction = (action: string) => {
    if (action.includes(":")) {
      const [mainAction, ...paramParts] = action.split(":")
      const param = paramParts.join(":").trim()
      const getActionColor = (actionLabel: string) => {
        const lower = actionLabel.toLowerCase()
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

  const formatLastExecution = (dateString: string | null, success: boolean | null) => {
    if (!dateString) return <span className="text-xs text-muted-foreground italic">Never</span>
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    let timeAgo = ""
    if (diffMins < 60) timeAgo = `${diffMins}m ago`
    else if (diffHours < 24) timeAgo = `${diffHours}h ago`
    else timeAgo = `${diffDays}d ago`
    return (
      <div className="flex flex-col">
        <span className="text-xs">{timeAgo}</span>
        <span className={`text-xs ${success ? "text-emerald-600" : "text-red-600"}`}>
          {success ? "Success" : "Failed"}
        </span>
      </div>
    )
  }

  return (
    <>
      <TableRow className="group cursor-pointer" onClick={() => setOpen(true)}>
        <TableCell onClick={(event) => event.stopPropagation()}>
          {canToggleRule ? (
            <form action={toggleRuleStatus} onClick={(event) => event.stopPropagation()}>
              <input type="hidden" name="ruleId" value={rule.id} />
              <input type="hidden" name="currentStatus" value={String(rule.status)} />
              <Switch
                name="status"
                defaultChecked={rule.status}
                className="data-[state=checked]:bg-emerald-500"
                aria-label={`Toggle status for ${rule.name}`}
              />
            </form>
          ) : (
            <Badge variant={rule.status ? "default" : "secondary"} className={rule.status ? "bg-emerald-500" : ""}>
              {rule.status ? "On" : "Off"}
            </Badge>
          )}
        </TableCell>

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
            {rule.description && <span className="text-xs text-muted-foreground line-clamp-1">{rule.description}</span>}
          </div>
        </TableCell>

        <TableCell>
          <Badge variant="outline" className="text-xs">
            {getRuleCategory(rule.trigger)}
          </Badge>
        </TableCell>

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

        <TableCell>{formatAction(rule.action)}</TableCell>

        <TableCell>{formatLastExecution(rule.lastExecution, rule.lastExecutionSuccess)}</TableCell>

        <TableCell onClick={(event) => event.stopPropagation()}>
          <RuleActionsDropdown
            rule={rule}
            canUpdateRule={canUpdateRule}
            canCreateRule={canCreateRule}
            canDeleteRule={canDeleteRule}
          />
        </TableCell>
      </TableRow>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rule Summary</DialogTitle>
            <DialogDescription>{rule.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div>
              <span className="text-muted-foreground">Status:</span>{" "}
              <Badge variant={rule.status ? "default" : "secondary"} className={rule.status ? "bg-emerald-500" : ""}>
                {rule.status ? "Active" : "Inactive"}
              </Badge>
            </div>
            <div>
              <span className="text-muted-foreground">Category:</span> {getRuleCategory(rule.trigger)}
            </div>
            <div>
              <span className="text-muted-foreground">Trigger:</span> {rule.trigger}
            </div>
            <div>
              <span className="text-muted-foreground">Condition:</span> {rule.condition || "No condition"}
            </div>
            <div>
              <span className="text-muted-foreground">Action:</span> {rule.action}
            </div>
            <div>
              <span className="text-muted-foreground">Last execution:</span>{" "}
              {rule.lastExecution ? new Date(rule.lastExecution).toLocaleString() : "Never"}
            </div>
            {rule.description && (
              <div>
                <span className="text-muted-foreground">Description:</span> {rule.description}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

