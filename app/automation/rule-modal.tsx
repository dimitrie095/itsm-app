"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Loader2, Sparkles, ChevronDown, ChevronUp } from "lucide-react"
import { createRule, updateRule } from "./actions"
import { useRouter } from "next/navigation"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"

interface AutomationRule {
  id: string
  name: string
  description: string
  trigger: string
  condition: string
  action: string
  status: boolean
}

interface RuleModalProps {
  triggerButton: React.ReactNode
  editingRule?: AutomationRule
}

// Extended trigger options for ITSM
const TRIGGER_OPTIONS = [
  { value: "Ticket Created", label: "Ticket Created", description: "When a new ticket is created", category: "Ticket" },
  { value: "Ticket Updated", label: "Ticket Updated", description: "When any ticket field is updated", category: "Ticket" },
  { value: "Ticket Resolved", label: "Ticket Resolved", description: "When ticket status changes to Resolved", category: "Ticket" },
  { value: "Ticket Closed", label: "Ticket Closed", description: "When ticket status changes to Closed", category: "Ticket" },
  { value: "Ticket Assigned", label: "Ticket Assigned", description: "When ticket is assigned to an agent", category: "Ticket" },
  { value: "Ticket Reopened", label: "Ticket Reopened", description: "When a closed/resolved ticket is reopened", category: "Ticket" },
  { value: "Ticket Escalated", label: "Ticket Escalated", description: "When ticket escalation level increases", category: "Ticket" },
  { value: "Priority Changed", label: "Priority Changed", description: "When ticket priority is updated", category: "Ticket" },
  { value: "Category Changed", label: "Category Changed", description: "When ticket category is changed", category: "Ticket" },
  { value: "Comment Added", label: "Comment Added", description: "When a comment is added to a ticket", category: "Ticket" },
  { value: "SLA Breach", label: "SLA Breach", description: "When SLA response or resolution time is breached", category: "SLA" },
  { value: "Daily", label: "Daily", description: "Runs once per day at scheduled time", category: "Schedule" },
  { value: "Weekly", label: "Weekly", description: "Runs once per week at scheduled time", category: "Schedule" },
  { value: "Monthly", label: "Monthly", description: "Runs once per month at scheduled time", category: "Schedule" },
  { value: "Email Received", label: "Email Received", description: "When an email is received for a ticket", category: "Communication" },
  { value: "Chat Message", label: "Chat Message", description: "When a chat message is received", category: "Communication" },
]

// Action options with parameters
const ACTION_OPTIONS = [
  { value: "Assign to Team", label: "Assign to Team", description: "Assign ticket to a specific team", hasParam: true, paramLabel: "Team Name", category: "Assignment" },
  { value: "Assign to Agent", label: "Assign to Agent", description: "Assign ticket to a specific agent", hasParam: true, paramLabel: "Agent Name or Email", category: "Assignment" },
  { value: "Change Priority", label: "Change Priority", description: "Change ticket priority level", hasParam: true, paramLabel: "Priority (Low/Medium/High/Critical)", category: "Ticket" },
  { value: "Change Status", label: "Change Status", description: "Update ticket status", hasParam: true, paramLabel: "Status (New/Assigned/In Progress/Resolved/Closed)", category: "Ticket" },
  { value: "Add Tag", label: "Add Tag", description: "Add a tag to the ticket", hasParam: true, paramLabel: "Tag Name", category: "Ticket" },
  { value: "Remove Tag", label: "Remove Tag", description: "Remove a tag from the ticket", hasParam: true, paramLabel: "Tag Name", category: "Ticket" },
  { value: "Send Email", label: "Send Email", description: "Send email notification", hasParam: true, paramLabel: "Email address or 'Requester'/'Assignee'", category: "Notification" },
  { value: "Send SMS", label: "Send SMS", description: "Send SMS notification", hasParam: true, paramLabel: "Phone number", category: "Notification" },
  { value: "Create Task", label: "Create Task", description: "Create a follow-up task", hasParam: true, paramLabel: "Task description", category: "Action" },
  { value: "Escalate Level", label: "Escalate Level", description: "Escalate ticket to next level", hasParam: false, category: "Ticket" },
  { value: "Close Ticket", label: "Close Ticket", description: "Close the ticket automatically", hasParam: false, category: "Ticket" },
  { value: "Update SLA", label: "Update SLA", description: "Update SLA timers or targets", hasParam: true, paramLabel: "SLA Policy Name", category: "SLA" },
  { value: "Notify Manager", label: "Notify Manager", description: "Send notification to manager", hasParam: false, category: "Notification" },
  { value: "Create KB Article", label: "Create KB Article", description: "Create knowledge base article from ticket", hasParam: false, category: "Knowledge" },
  { value: "Run Script", label: "Run Script", description: "Execute custom script or webhook", hasParam: true, paramLabel: "Script name or webhook URL", category: "Advanced" },
]

// Condition options grouped by category
const CONDITION_CATEGORIES = {
  "Ticket Properties": [
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
  ],
  "Source & Impact": [
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
  ],
  "Department & Assignment": [
    "Department = 'IT'",
    "Department = 'Sales'",
    "Department = 'Marketing'",
    "Department = 'Finance'",
    "Department = 'HR'",
    "AssignedTo IS NULL",
    "AssignedTo IS NOT NULL",
  ],
  "Time & SLA": [
    "Age > 24",
    "Age > 48",
    "Age > 72",
    "SLA Breached = true",
    "Escalation Level >= 2",
  ],
  "Tags & Attachments": [
    "Has Attachment = true",
    "Tag INCLUDES 'VIP'",
    "Tag INCLUDES 'Critical'",
    "Tag INCLUDES 'Urgent'",
  ],
  "Complex Conditions": [
    "Category = 'Hardware' AND Priority = 'High'",
    "Priority = 'High' OR Priority = 'Critical'",
    "Status = 'New' AND Age > 24",
    "Source = 'Email' AND Priority = 'High'",
  ],
}

// Flatten condition options for backward compatibility
const CONDITION_OPTIONS = Object.values(CONDITION_CATEGORIES).flat()

export default function RuleModal({ triggerButton, editingRule }: RuleModalProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [triggerOpen, setTriggerOpen] = useState(true)
  const [conditionOpen, setConditionOpen] = useState(true)
  const [actionOpen, setActionOpen] = useState(true)
  
  const isEditing = !!editingRule

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    trigger: "Ticket Created",
    condition: "",
    conditionMode: "simple" as "simple" | "custom",
    action: "Assign to Team",
    actionParam: "",
    isActive: true,
  })

  // Parse action and parameter when editing
  useEffect(() => {
    if (editingRule && open) {
      let actionName = editingRule.action
      let actionParam = ""
      
      if (editingRule.action.includes(":")) {
        const [name, ...paramParts] = editingRule.action.split(":")
        actionName = name.trim()
        actionParam = paramParts.join(":").trim()
      }

      setFormData({
        name: editingRule.name,
        description: editingRule.description,
        trigger: editingRule.trigger,
        condition: editingRule.condition,
        conditionMode: CONDITION_OPTIONS.includes(editingRule.condition) ? "simple" : "custom",
        action: actionName,
        actionParam: actionParam,
        isActive: editingRule.status,
      })
    }
  }, [editingRule, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Build full action string with parameter
      const selectedAction = ACTION_OPTIONS.find(a => a.label === formData.action)
      const fullAction = selectedAction?.hasParam && formData.actionParam
        ? `${formData.action}: ${formData.actionParam}`
        : formData.action
      const category = TRIGGER_OPTIONS.find(t => t.value === formData.trigger)?.category || 'General'

      const ruleData = {
        name: formData.name,
        description: formData.description,
        category,
        trigger: formData.trigger,
        condition: formData.condition,
        action: fullAction,
        actionParam: formData.actionParam || undefined,
        isActive: formData.isActive,
      }

      let result
      if (isEditing && editingRule) {
        result = await updateRule(editingRule.id, ruleData)
      } else {
        result = await createRule(ruleData)
      }

      if (result.success) {
        toast.success(isEditing ? "Rule updated successfully" : "Rule created successfully")
        setOpen(false)
        router.refresh()
      } else {
        toast.error(result.error || "Failed to save rule")
      }
    } catch (error) {
      toast.error("An unexpected error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedAction = ACTION_OPTIONS.find(a => a.label === formData.action)
  const selectedTrigger = TRIGGER_OPTIONS.find(t => t.value === formData.trigger)

  // Group triggers by category
  const triggerCategories = TRIGGER_OPTIONS.reduce((acc, trigger) => {
    if (!acc[trigger.category]) acc[trigger.category] = []
    acc[trigger.category].push(trigger)
    return acc
  }, {} as Record<string, typeof TRIGGER_OPTIONS>)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerButton}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] min-h-[50vh] flex flex-col">
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              {isEditing ? "Edit Automation Rule" : "Create Automation Rule"}
            </DialogTitle>
            <DialogDescription>
              {isEditing 
                ? "Update your automation rule configuration." 
                : "Create a new rule to automate your workflows."}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 min-h-0 px-2">
            <div className="space-y-6 py-4 pr-3">
              {/* Basic Info Section */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Rule Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Auto-assign Hardware Tickets"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
          
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe what this automation rule does..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                  />
                </div>
              </div>
          
              <Separator />
          
              {/* Tabs for Triggers, Conditions, Actions */}
              <Tabs defaultValue="triggers" className="space-y-4">
                <TabsList className="grid grid-cols-3">
                  <TabsTrigger value="triggers">Triggers</TabsTrigger>
                  <TabsTrigger value="conditions">Conditions</TabsTrigger>
                  <TabsTrigger value="actions">Actions</TabsTrigger>
                </TabsList>
          
                {/* Triggers Tab */}
                <TabsContent value="triggers" className="space-y-3">
                  <Collapsible open={triggerOpen} onOpenChange={setTriggerOpen}>
                    <div className="flex items-center justify-between">
                      <Label>When this happens (Trigger) *</Label>
                      <CollapsibleTrigger asChild>
                        <button type="button" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                          {triggerOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                      </CollapsibleTrigger>
                    </div>
                    <CollapsibleContent>
                      <div className="grid grid-cols-1 gap-3 pt-3">
                        {Object.entries(triggerCategories).map(([category, triggers]) => (
                          <div key={category} className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{category}</p>
                            <div className="grid grid-cols-2 gap-3">
                              {triggers.map((trigger) => (
                                <button
                                  key={trigger.value}
                                  type="button"
                                  onClick={() => setFormData({ ...formData, trigger: trigger.value })}
                                  className={`text-left p-3 rounded-lg border transition-all ${
                                    formData.trigger === trigger.value
                                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                                      : "border-border hover:border-primary/50 hover:bg-muted/50"
                                  }`}
                                >
                                  <p className="font-medium text-sm">{trigger.label}</p>
                                  <p className="text-xs text-muted-foreground">{trigger.description}</p>
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                      {selectedTrigger && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 pt-3">
                          Selected: <Badge variant="secondary">{selectedTrigger.label}</Badge>
                        </p>
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                </TabsContent>
          
                {/* Conditions Tab */}
                <TabsContent value="conditions" className="space-y-3">
                  <Collapsible open={conditionOpen} onOpenChange={setConditionOpen}>
                    <div className="flex items-center justify-between">
                      <Label>If these conditions are met</Label>
                      <CollapsibleTrigger asChild>
                        <button type="button" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                          {conditionOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                      </CollapsibleTrigger>
                    </div>
                    <CollapsibleContent>
                      <div className="space-y-3 pt-3">
                        <div className="flex items-center justify-between">
                          <div></div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setFormData({ ...formData, conditionMode: "simple", condition: "" })}
                              className={`text-xs px-2 py-1 rounded ${formData.conditionMode === "simple" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                            >
                              Preset
                            </button>
                            <button
                              type="button"
                              onClick={() => setFormData({ ...formData, conditionMode: "custom" })}
                              className={`text-xs px-2 py-1 rounded ${formData.conditionMode === "custom" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                            >
                              Custom
                            </button>
                          </div>
                        </div>
          
                        {formData.conditionMode === "simple" ? (
                          <div className="space-y-3">
                            <p className="text-xs text-muted-foreground">Select a preset condition or leave empty to always execute:</p>
                            <div className="flex flex-wrap gap-1">
                              <button
                                type="button"
                                onClick={() => setFormData({ ...formData, condition: "" })}
                                className={`text-xs px-2 py-1 rounded-full border ${
                                  formData.condition === "" ? "border-primary bg-primary/10" : "border-border hover:bg-muted"
                                }`}
                              >
                                Always
                              </button>
                              {CONDITION_OPTIONS.map((condition) => (
                                <button
                                  key={condition}
                                  type="button"
                                  onClick={() => setFormData({ ...formData, condition })}
                                  className={`text-xs px-2 py-1 rounded-full border ${
                                    formData.condition === condition ? "border-primary bg-primary/10" : "border-border hover:bg-muted"
                                  }`}
                                >
                                  {condition}
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <Input
                              placeholder="e.g., Category = 'Hardware' AND Priority = 'High'"
                              value={formData.condition}
                              onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                            />
                            <p className="text-xs text-muted-foreground">
                              Use simple expressions like: Category = 'Hardware', Priority = 'High', Age &gt; 24
                            </p>
                          </div>
                        )}
          
                        {formData.condition && (
                          <div className="flex items-center gap-2 p-2 bg-muted rounded">
                            <span className="text-xs text-muted-foreground">Current condition:</span>
                            <code className="text-xs bg-background px-2 py-0.5 rounded">{formData.condition}</code>
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </TabsContent>
          
                {/* Actions Tab */}
                <TabsContent value="actions" className="space-y-3">
                  <Collapsible open={actionOpen} onOpenChange={setActionOpen}>
                    <div className="flex items-center justify-between">
                      <Label>Then do this (Action) *</Label>
                      <CollapsibleTrigger asChild>
                        <button type="button" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                          {actionOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                      </CollapsibleTrigger>
                    </div>
                    <CollapsibleContent>
                      <div className="space-y-3 pt-3">
                        <div className="grid grid-cols-2 gap-3">
                          {ACTION_OPTIONS.map((action) => (
                            <button
                              key={action.value}
                              type="button"
                              onClick={() => setFormData({ ...formData, action: action.label, actionParam: "" })}
                              className={`text-left p-3 rounded-lg border transition-all ${
                                formData.action === action.label
                                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                                  : "border-border hover:border-primary/50 hover:bg-muted/50"
                              }`}
                            >
                              <p className="font-medium text-sm">{action.label}</p>
                              <p className="text-xs text-muted-foreground">{action.description}</p>
                            </button>
                          ))}
                        </div>
          
                        {selectedAction?.hasParam && (
                          <div className="space-y-2 pt-2">
                            <Label htmlFor="actionParam">{selectedAction.paramLabel ?? "parameter"} *</Label>
                            <Input
                              id="actionParam"
                              placeholder={`Enter ${selectedAction.paramLabel?.toLowerCase() ?? "parameter"}...`}
                              value={formData.actionParam}
                              onChange={(e) => setFormData({ ...formData, actionParam: e.target.value })}
                              required
                            />
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </TabsContent>
              </Tabs>
          
              <Separator />
          
              {/* Advanced Options */}
              <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
                <CollapsibleTrigger asChild>
                  <button type="button" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    Advanced Options
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-4 space-y-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="space-y-0.5">
                      <Label htmlFor="isActive" className="cursor-pointer">Active Rule</Label>
                      <p className="text-xs text-muted-foreground">
                        Enable or disable this automation rule
                      </p>
                    </div>
                    <Switch
                      id="isActive"
                      checked={formData.isActive}
                      onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </ScrollArea>

          <DialogFooter className="gap-2 shrink-0">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !formData.name}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>{isEditing ? "Update Rule" : "Create Rule"}</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
