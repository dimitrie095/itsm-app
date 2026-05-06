"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Save, User, Calendar, AlertCircle } from "lucide-react"
import { TicketStatus, Priority } from "@/lib/generated/prisma/enums"
import { updateTicket } from "@/app/tickets/actions"
import { addTicketComment } from "@/app/tickets/actions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"

interface TicketEditPageFormProps {
  ticket: {
    id: string
    title: string
    description: string
    status: string
    priority: string
    category: string | null
    assignedToId: string | null
    assignedTo: { id: string; name: string | null; email: string } | null
    user: { id: string; name: string | null; email: string; department: string | null }
    createdAt: string
    updatedAt: string
    asset: { id: string; name: string; type: string; status: string } | null
    sla: { id: string; name: string; responseTime: number; resolutionTime: number } | null
    comments: Array<{
      id: string
      content: string
      isInternal: boolean
      createdAt: string
      user: { id: string; name: string | null; email: string; role: string }
    }>
    additionalAssignees: Array<{ id: string; name: string | null; email: string; role: string }>
  }
  users: Array<{ id: string; name: string | null; email: string; role: string }>
}

export function TicketEditPageForm({ ticket, users }: TicketEditPageFormProps) {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)

  const [status, setStatus] = useState<string>(ticket.status)
  const [priority, setPriority] = useState<string>(ticket.priority)
  const [category, setCategory] = useState<string>(ticket.category || "")
  const [description, setDescription] = useState<string>(ticket.description || "")
  const [assignedToId, setAssignedToId] = useState<string>(ticket.assignedToId || "unassigned")
  const [agentComment, setAgentComment] = useState("")
  const [isCommentSaving, setIsCommentSaving] = useState(false)
  const [comments, setComments] = useState(ticket.comments)
  const [additionalAssigneeIds, setAdditionalAssigneeIds] = useState<string[]>(
    ticket.additionalAssignees.map((item) => item.id)
  )

  const formatEnumLabel = (value: string) => value.toLowerCase().replaceAll("_", " ")
  const statusBadgeClass = (value: string) => {
    switch (value) {
      case TicketStatus.NEW:
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
      case TicketStatus.ASSIGNED:
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300"
      case TicketStatus.IN_PROGRESS:
        return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300"
      case TicketStatus.RESOLVED:
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300"
      case TicketStatus.CLOSED:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
    }
  }
  const priorityBadgeClass = (value: string) => {
    switch (value) {
      case Priority.CRITICAL:
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
      case Priority.HIGH:
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300"
      case Priority.MEDIUM:
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
      case Priority.LOW:
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
    }
  }

  const hasChanges = useMemo(() => {
    return (
      status !== ticket.status ||
      priority !== ticket.priority ||
      category !== (ticket.category || "") ||
      description !== (ticket.description || "") ||
      assignedToId !== (ticket.assignedToId || "unassigned") ||
      JSON.stringify(additionalAssigneeIds.slice().sort()) !==
        JSON.stringify(ticket.additionalAssignees.map((item) => item.id).slice().sort())
    )
  }, [status, priority, category, description, assignedToId, additionalAssigneeIds, ticket])

  const handleSave = async () => {
    if (!hasChanges) {
      toast.info("No changes to save")
      return
    }

    if (!description.trim()) {
      toast.error("Description is required")
      return
    }

    setIsSaving(true)
    try {
      await updateTicket(ticket.id, {
        status,
        priority,
        category,
        description,
        assignedToId: assignedToId === "unassigned" ? null : assignedToId,
        additionalAssigneeIds,
      })

      toast.success("Ticket updated successfully")
      router.push("/tickets")
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update ticket")
    } finally {
      setIsSaving(false)
    }
  }

  const toggleAdditionalAssignee = (userId: string) => {
    setAdditionalAssigneeIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    )
  }

  const handleAddComment = async () => {
    const content = agentComment.trim()
    if (!content) {
      toast.info("Please enter a comment")
      return
    }

    setIsCommentSaving(true)
    try {
      const created = await addTicketComment(ticket.id, content, true)
      setComments((prev) => [
        {
          id: created.id,
          content: created.content,
          isInternal: created.isInternal,
          createdAt: new Date(created.createdAt).toISOString(),
          user: created.user,
        },
        ...prev,
      ])
      setAgentComment("")
      toast.success("Comment added")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add comment")
    } finally {
      setIsCommentSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg shadow-none" asChild>
            <Link href="/tickets">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Edit Ticket</h1>
            <p className="text-sm text-muted-foreground">Update lifecycle fields and assignment for this ticket.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && <Badge variant="secondary">Unsaved changes</Badge>}
          <Button variant="outline" size="sm" className="h-8 px-3 rounded-lg shadow-none" asChild>
            <Link href="/tickets">Cancel</Link>
          </Button>
          <Button size="sm" className="h-8 px-3 rounded-lg shadow-none" onClick={handleSave} disabled={isSaving || !hasChanges}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      <Card className="rounded-xl border-border/60 shadow-none">
        <CardHeader>
          <CardTitle>Ticket Context</CardTitle>
          <CardDescription>Requester and related metadata.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm md:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="mb-1 flex items-center gap-2 font-medium">
              <User className="h-4 w-4" />
              Requester
            </div>
            <p>{ticket.user.name || ticket.user.email}</p>
            <p className="text-muted-foreground">{ticket.user.email}</p>
            {ticket.user.department && <p className="text-muted-foreground">{ticket.user.department}</p>}
          </div>

          <div>
            <div className="mb-1 flex items-center gap-2 font-medium">
              <Calendar className="h-4 w-4" />
              Timeline
            </div>
            <p>Created: {new Date(ticket.createdAt).toLocaleString()}</p>
            <p>Updated: {new Date(ticket.updatedAt).toLocaleString()}</p>
          </div>

          {ticket.asset && (
            <div>
              <p className="mb-1 font-medium">Asset</p>
              <p>{ticket.asset.name}</p>
              <p className="text-muted-foreground">
                {ticket.asset.type} - {ticket.asset.status}
              </p>
            </div>
          )}

          {ticket.sla && (
            <div>
              <p className="mb-1 font-medium">SLA</p>
              <p>{ticket.sla.name}</p>
              <p className="text-muted-foreground">
                Response {ticket.sla.responseTime}h / Resolution {ticket.sla.resolutionTime}h
              </p>
            </div>
          )}
          <div>
            <p className="mb-1 font-medium">Additional Assignees</p>
            <p className="text-muted-foreground">
              {additionalAssigneeIds.length > 0 ? `${additionalAssigneeIds.length} selected` : "None"}
            </p>
          </div>
          <div>
            <p className="mb-1 font-medium">Current workflow</p>
            <div className="flex items-center gap-2">
              <Badge className={statusBadgeClass(status)}>{formatEnumLabel(status)}</Badge>
              <Badge className={priorityBadgeClass(priority)}>{formatEnumLabel(priority)}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-xl border-border/60 shadow-none">
          <CardHeader>
            <CardTitle>Ticket Details</CardTitle>
            <CardDescription>Core issue data and workflow fields.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Ticket ID</Label>
                <Input value={ticket.id} disabled />
              </div>
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={ticket.title} disabled />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className={`h-8 w-[165px] ${statusBadgeClass(status)}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(TicketStatus).map((value) => (
                      <SelectItem key={value} value={value}>
                        {formatEnumLabel(value)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger className={`h-8 w-[165px] ${priorityBadgeClass(priority)}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(Priority).map((value) => (
                      <SelectItem key={value} value={value}>
                        {formatEnumLabel(value)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Assigned To</Label>
                <Select value={assignedToId} onValueChange={setAssignedToId}>
                  <SelectTrigger className="h-8 w-[165px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name || user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Additional Assignees</Label>
              <div className="grid gap-2 md:grid-cols-2">
                {users.map((user) => {
                  const checked = additionalAssigneeIds.includes(user.id)
                  return (
                    <label
                      key={user.id}
                      className={`flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 text-sm ${
                        checked ? "border-primary bg-primary/10" : "border-border/70"
                      }`}
                    >
                      <span className="truncate">{user.name || user.email}</span>
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={checked}
                        onChange={() => toggleAdditionalAssignee(user.id)}
                      />
                    </label>
                  )
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. hardware, network" />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-[200px]" />
            </div>

            <div className="rounded-lg border border-primary/25 bg-primary/5 p-3 text-sm text-foreground">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-primary" />
                <span>All modified fields are persisted when you click Save.</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-border/60 shadow-none">
          <CardHeader>
            <CardTitle>Agent Comments</CardTitle>
            <CardDescription>Internal notes and handover context for support team.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="agent-comment">Add internal comment</Label>
              <Textarea
                id="agent-comment"
                value={agentComment}
                onChange={(e) => setAgentComment(e.target.value)}
                placeholder="Write context, troubleshooting steps, or handover notes..."
                className="min-h-[110px]"
              />
            </div>
            <div className="flex justify-end">
              <Button size="sm" className="h-8 px-3 rounded-lg shadow-none" onClick={handleAddComment} disabled={isCommentSaving || !agentComment.trim()}>
                {isCommentSaving ? "Adding..." : "Add Comment"}
              </Button>
            </div>

            <div className="space-y-3">
              {comments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No comments yet.</p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="rounded-lg border border-border/70 p-3 shadow-none">
                    <div className="mb-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                      <span>{comment.user.name || comment.user.email}</span>
                      <span>{new Date(comment.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="whitespace-pre-wrap text-sm">{comment.content}</p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}

