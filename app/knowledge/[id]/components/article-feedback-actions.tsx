"use client"

import { useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Eye, MessageSquare, ThumbsUp } from "lucide-react"
import { toast } from "sonner"
import { addArticleComment, markArticleHelpful, reportArticleIssue } from "@/app/knowledge/actions"
import { Textarea } from "@/components/ui/textarea"
import { useState } from "react"

interface ArticleFeedbackActionsProps {
  articleId: string
  initialHelpfulMarked?: boolean
}

export default function ArticleFeedbackActions({ articleId, initialHelpfulMarked = false }: ArticleFeedbackActionsProps) {
  const [isPending, startTransition] = useTransition()
  const [issueText, setIssueText] = useState("")
  const [commentText, setCommentText] = useState("")
  const [issueDialogOpen, setIssueDialogOpen] = useState(false)
  const [isHelpfulMarked, setIsHelpfulMarked] = useState(initialHelpfulMarked)

  const onHelpful = () => {
    startTransition(async () => {
      const result = await markArticleHelpful(articleId)
      if (result.success) {
        setIsHelpfulMarked(Boolean(result.marked))
        if (result.marked) {
          toast.success("Thanks for your feedback")
        } else {
          toast.success("Helpful mark removed")
        }
        return
      }
      toast.error(result.message || "Action failed")
    })
  }

  const onReportIssue = () => {
    if (!issueText.trim()) {
      toast.error("Please describe the issue")
      return
    }
    startTransition(async () => {
      const result = await reportArticleIssue(articleId, issueText)
      if (result.success) {
        toast.success("Issue reported. Thank you")
        setIssueDialogOpen(false)
        setIssueText("")
        return
      }
      toast.error(result.message || "Action failed")
    })
  }

  const onAddComment = () => {
    if (!commentText.trim()) {
      toast.error("Please write a comment")
      return
    }
    startTransition(async () => {
      const result = await addArticleComment(articleId, commentText)
      if (result.success) {
        toast.success("Comment added")
        setCommentText("")
        return
      }
      toast.error(result.message || "Action failed")
    })
  }

  return (
    <>
      <Button
        variant="outline"
        className={`w-full justify-start ${
          isHelpfulMarked
            ? "border-[#0073d2] bg-[#0073d2]/10 text-[#0073d2] hover:bg-[#0073d2]/15"
            : ""
        }`}
        onClick={onHelpful}
        disabled={isPending}
      >
        <ThumbsUp className={`mr-2 h-4 w-4 ${isHelpfulMarked ? "fill-[#0073d2] text-[#0073d2]" : ""}`} />
        {isHelpfulMarked ? "Marked as Helpful" : "Mark as Helpful"}
      </Button>
      <Dialog open={issueDialogOpen} onOpenChange={setIssueDialogOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-start"
            disabled={isPending}
          >
            <Eye className="mr-2 h-4 w-4" />
            Report Issue
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report Knowledge Issue</DialogTitle>
            <DialogDescription>
              Describe the issue with this article. Agents and admins will be notified.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              placeholder="Describe the issue..."
              value={issueText}
              onChange={(e) => setIssueText(e.target.value)}
              className="min-h-[56px]"
            />
            <Button onClick={onReportIssue} disabled={isPending} className="w-full">
              Send Issue
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="space-y-2 pt-2">
        <Textarea
          placeholder="Write a comment about this article..."
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          className="min-h-[56px]"
          disabled={isPending}
        />
        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={onAddComment}
          disabled={isPending}
        >
          <MessageSquare className="mr-2 h-4 w-4" />
          Add Comment
        </Button>
      </div>
    </>
  )
}

