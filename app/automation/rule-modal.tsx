"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Loader2 } from "lucide-react"
import { createRule, updateRule } from "./actions"

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

interface RuleModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onRuleSaved: () => void
  editingRule?: AutomationRule | null
}

// Extended trigger options for ITSM
const TRIGGER_OPTIONS = [
  { value: "Ticket Created", label: "Ticket Created", description: "When a new ticket is created" },
  { value: "Ticket Updated", label: "Ticket Updated", description: "When any ticket field is updated" },
  { value: "Ticket Resolved", label: "Ticket Resolved", description: "When ticket status changes to Resolved" },
  { value: "Ticket Closed", label: "Ticket Closed", description: "When ticket status changes to Closed" },
  { value: "Ticket Assigned", label: "Ticket Assigned", description: "When ticket is assigned to an agent" },
  { value: "Ticket Reopened", label: "Ticket Reopened", description: "When a closed/resolved ticket is reopened" },
  { value: "SLA Breach", label: "SLA Breach", description: "When SLA response or resolution time is breached" },
  { value: "Priority Changed", label: "Priority Changed", description: "When ticket priority is updated" },
  { value: "Category Changed", label: "Category Changed", description: "When ticket category is changed" },
  { value: "Comment Added", label: "Comment Added", description: "When a comment is added to a ticket" },
  { value: "Daily", label: "Daily", description: "Runs once per day at scheduled time" },
  { value: "Weekly", label: "Weekly", description: "Runs once per week at scheduled time" },
  { value: "Monthly", label: "Monthly", description: "Runs once per month at scheduled time" },
  { value: "Email Received", label: "Email Received", description: "When an email is received for a ticket" },
  { value: "Chat Message", label: "Chat Message", description: "When a chat message is received" },
]

// Action options with parameters
const ACTION_OPTIONS = [
  { value: "Assign to Team", label: "Assign to Team", description: "Assign ticket to a specific team" },
  { value: "Assign to Agent", label: "Assign to Agent", description: "Assign ticket to a specific agent" },
  { value: "Change Priority", label: "Change Priority", description: "Change ticket priority level" },
  { value: "Change Status", label: "Change Status", description: "Update ticket status" },
  { value: "Add Tag", label: "Add Tag", description: "Add a tag to the ticket" },
  { value: "Remove Tag", label: "Remove Tag", description: "Remove a tag from the ticket" },
  { value: "Send Email", label: "Send Email", description: "Send email notification" },
  { value: "Send SMS", label: "Send SMS", description: "Send SMS notification" },
  { value: "Create Task", label: "Create Task", description: "Create a follow-up task" },
  { value: "Escalate Level", label: "Escalate Level", description: "Escalate ticket to next level" },
  { value: "Close Ticket", label: "Close Ticket", description: "Close the ticket automatically" },
  { value: "Update SLA", label: "Update SLA", description: "Update SLA timers or targets" },
  { value: "Notify Manager", label: "Notify Manager", description: "Send notification to manager" },
  { value: "Create KB Article", label: "Create KB Article", description: "Create knowledge base article from ticket" },
  { value: "Run Script", label: "Run Script", description: "Execute custom script or webhook" },
]

// Condition options for selectable dropdown
const CONDITION_OPTIONS = [
  "Category = 'Hardware'",
  "Category = 'Software'",
  "Category = 'Network'",
  "Category = 'Access'",
  "Priority = 'Critical'",
  "Priority = 'High'",
  "Priority = 'Medium'",
  "Priority = 'Low'",
  "Status = 'New'",
  "Status = 'Assigned'",
  "Status = 'In Progress'",
  "Status = 'Resolved'",
  "Status = 'Closed'",
  "Source = 'Email'",
  "Source = 'Portal'",
  "Source = 'Phone'",
  "Source = 'Chat'",
  "Impact = 'Critical'",
  "Impact = 'High'",
  "Impact = 'Medium'",
  "Impact = 'Low'",
  "Urgency = 'High'",
  "Urgency = 'Medium'",
  "Urgency = 'Low'",
  "Department = 'IT'",
  "Department = 'Sales'",
  "Department = 'Marketing'",
  "Department = 'Finance'",
  "Department = 'HR'",
  "AssignedTo IS NULL",
  "Age > 24",
  "Age > 48",
  "SLA Breached = true",
  "Escalation Level >= 2",
  "Has Attachment = true",
  "Tag INCLUDES 'VIP'",
  "Tag INCLUDES 'Critical'",
  "Category = 'Hardware' AND Priority = 'High'",
  "Priority = 'High' OR Priority = 'Critical'",
  "Status = 'New' AND Age > 24",
  "Source = 'Email' AND Department = 'Sales'",
  "Impact = 'Critical' AND Urgency = 'High'",
]

// Action parameter options based on action type
const ACTION_PARAM_OPTIONS: Record<string, string[]> = {
  "Assign to Team": [
    "Hardware Team",
    "Software Team",
    "Network Team",
    "Access Management Team",
    "Level 1 Support",
    "Level 2 Support",
    "Management Team",
  ],
  "Assign to Agent": [
    "John Doe",
    "Jane Smith",
    "Robert Johnson",
    "Emily Davis",
    "Michael Wilson",
    "Sarah Brown",
  ],
  "Change Priority": ["Critical", "High", "Medium", "Low"],
  "Change Status": ["New", "Assigned", "In Progress", "Resolved", "Closed", "On Hold"],
  "Add Tag": ["Critical", "VIP", "Follow-up", "Escalated", "External", "Internal", "Bug", "Feature Request"],
  "Remove Tag": ["Critical", "VIP", "Follow-up", "Escalated", "External", "Internal", "Bug", "Feature Request"],
  "Send Email": ["Acknowledgment", "Escalation Notice", "Resolution Notification", "SLA Breach Alert", "Follow-up Request"],
  "Send SMS": ["Urgent Alert", "SLA Breach", "Ticket Update", "Resolution Notification"],
  "Create Task": ["Follow up in 24 hours", "Schedule maintenance", "Contact customer", "Update documentation", "Review with team"],
  "Escalate Level": ["Level 2", "Level 3", "Management", "Director", "VP"],
  "Close Ticket": ["Auto-closed", "Resolved", "Duplicate", "Not a problem"],
  "Update SLA": ["Reset timer", "Extend deadline", "Change priority", "Notify manager"],
  "Notify Manager": ["Department Manager", "Team Lead", "Project Manager", "IT Director"],
  "Create KB Article": ["Common solution", "How-to guide", "Troubleshooting steps", "Best practices"],
  "Run Script": ["/scripts/auto-close.sh", "/scripts/notify-team.sh", "https://webhook.company.com/automation"],
}

export default function RuleModal({ open, onOpenChange, onRuleSaved, editingRule }: RuleModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    trigger: "Ticket Created",
    action: "Assign to Team",
    isActive: true,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [actionParam, setActionParam] = useState("")
  const [condition, setCondition] = useState("")

  // Initialize form when editing rule
  useEffect(() => {
    if (editingRule && open) {
      // Parse action and parameter
      let action = editingRule.action
      let param = ""
      if (editingRule.action.includes(":")) {
        const [mainAction, ...paramParts] = editingRule.action.split(":")
        action = mainAction.trim()
        param = paramParts.join(":").trim()
      }
      
      setFormData({
        name: editingRule.name,
        description: editingRule.description,
        trigger: editingRule.trigger,
        action: action,
        isActive: editingRule.status,
      })
      
      setActionParam(param)
      setCondition(editingRule.condition)
    } else if (!editingRule && open) {
      // Reset form for new rule
      setFormData({
        name: "",
        description: "",
        trigger: "Ticket Created",
        action: "Assign to Team",
        isActive: true,
      })
      setActionParam("")
      setCondition("")
      setErrors({})
    }
  }, [editingRule, open])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.name.trim()) {
      newErrors.name = "Rule name is required"
    }
    
    if (!formData.trigger.trim()) {
      newErrors.trigger = "Trigger is required"
    }
    
    if (!formData.action.trim()) {
      newErrors.action = "Action is required"
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const getFullAction = () => {
    if (actionParam.trim()) {
      return `${formData.action}: ${actionParam}`
    }
    return formData.action
  }

  const getFullCondition = () => {
    return condition.trim()
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    setLoading(true)
    try {
      let result
      const fullAction = getFullAction()
      const fullCondition = getFullCondition()
      
      if (editingRule) {
        // Update existing rule
        result = await updateRule(editingRule.fullId, {
          name: formData.name,
          description: formData.description,
          trigger: formData.trigger,
          condition: fullCondition,
          action: fullAction,
          isActive: formData.isActive,
        })
      } else {
        // Create new rule
        result = await createRule({
          name: formData.name,
          description: formData.description,
          trigger: formData.trigger,
          condition: fullCondition,
          action: fullAction,
          isActive: formData.isActive,
        })
      }
      
      if (result.success) {
        // Reset form and close modal
        setFormData({
          name: "",
          description: "",
          trigger: "Ticket Created",
          action: "Assign to Team",
          isActive: true,
        })
        setActionParam("")
        setCondition("")
        setErrors({})
        onOpenChange(false)
        onRuleSaved()
      }
    } finally {
      setLoading(false)
    }
  }

  const handleActionChange = (action: string) => {
    setFormData({ ...formData, action })
    // Reset parameter when action changes
    setActionParam("")
  }

  const getActionPlaceholder = () => {
    const action = formData.action
    if (ACTION_PARAM_OPTIONS[action] && ACTION_PARAM_OPTIONS[action].length > 0) {
      return `Select from options or type custom value`
    }
    return "Enter parameter value"
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editingRule ? "Edit Automation Rule" : "Create New Automation Rule"}</DialogTitle>
          <DialogDescription>
            Define triggers, conditions, and actions to automate workflows.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Rule Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Auto-assign hardware tickets"
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description of what this rule does"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="trigger">Trigger *</Label>
                <select
                  id="trigger"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={formData.trigger}
                  onChange={(e) => setFormData({ ...formData, trigger: e.target.value })}
                >
                  {TRIGGER_OPTIONS.map((trigger) => (
                    <option key={trigger.value} value={trigger.value}>
                      {trigger.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  {TRIGGER_OPTIONS.find(t => t.value === formData.trigger)?.description}
                </p>
                {errors.trigger && (
                  <p className="text-sm text-red-500">{errors.trigger}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="action">Action *</Label>
                <select
                  id="action"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={formData.action}
                  onChange={(e) => handleActionChange(e.target.value)}
                >
                  {ACTION_OPTIONS.map((action) => (
                    <option key={action.value} value={action.value}>
                      {action.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  {ACTION_OPTIONS.find(a => a.value === formData.action)?.description}
                </p>
                {errors.action && (
                  <p className="text-sm text-red-500">{errors.action}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="action-param">Action Parameter</Label>
                <Input
                  id="action-param"
                  value={actionParam}
                  onChange={(e) => setActionParam(e.target.value)}
                  placeholder={getActionPlaceholder()}
                  list={`action-param-options-${formData.action.replace(/\s+/g, '-')}`}
                />
                <datalist id={`action-param-options-${formData.action.replace(/\s+/g, '-')}`}>
                  {ACTION_PARAM_OPTIONS[formData.action]?.map((option) => (
                    <option key={option} value={option} />
                  ))}
                </datalist>
                <p className="text-xs text-muted-foreground">
                  Select from options or type custom value
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="condition">Condition (Optional)</Label>
                <Input
                  id="condition"
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  placeholder="e.g., Category = 'Hardware'"
                  list="condition-options"
                />
                <datalist id="condition-options">
                  {CONDITION_OPTIONS.map((option) => (
                    <option key={option} value={option} />
                  ))}
                </datalist>
                <p className="text-xs text-muted-foreground">
                  Select from common conditions or type custom expression
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label htmlFor="isActive" className="cursor-pointer">
                Rule is active
              </Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {editingRule ? "Update Rule" : "Create Rule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}