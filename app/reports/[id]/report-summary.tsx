"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FormattedAISummary } from "@/components/ui/formatted-ai-summary"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Sparkles } from "lucide-react"
import { useState } from "react"
import { generateReportSummary, updateReportSummary } from "../actions"
import { toast } from "sonner"

interface ReportSummaryProps {
  reportId: string
  initialSummary?: string
}

export function ReportSummary({ reportId, initialSummary }: ReportSummaryProps) {
  const [summary, setSummary] = useState(initialSummary)
  const [loading, setLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(initialSummary || "")
  const [saving, setSaving] = useState(false)

  const handleGenerateSummary = async () => {
    setLoading(true)
    try {
      const result = await generateReportSummary(reportId)
      if (result.success && result.summary) {
        setSummary(result.summary)
        setDraft(result.summary)
        setIsEditing(false)
        toast.success("AI summary generated successfully")
      } else {
        toast.error(result.error || "Failed to generate summary")
      }
    } catch (error) {
      toast.error("An unexpected error occurred")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveEdit = async () => {
    setSaving(true)
    try {
      const result = await updateReportSummary(reportId, draft)
      if (result.success) {
        setSummary(result.summary)
        setDraft(result.summary || "")
        setIsEditing(false)
        toast.success("Summary updated")
      } else {
        toast.error(result.error || "Failed to update summary")
      }
    } catch (error) {
      toast.error("An unexpected error occurred")
      console.error(error)
    } finally {
      setSaving(false)
    }
  }

  if (summary) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <CardTitle>Report Summary</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsEditing((prev) => !prev)
                  setDraft(summary || "")
                }}
                disabled={loading || saving}
              >
                {isEditing ? "Cancel" : "Edit"}
              </Button>
              <Button variant="outline" size="sm" onClick={handleGenerateSummary} disabled={loading || saving || isEditing}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Regenerate"}
              </Button>
            </div>
          </div>
          <CardDescription>
            AI-generated summary of key insights and recommendations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="space-y-3">
              <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={8} />
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsEditing(false)
                    setDraft(summary || "")
                  }}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSaveEdit} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save"
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <FormattedAISummary content={summary} />
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle>Report Summary</CardTitle>
          </div>
        </div>
        <CardDescription>
          Generate an AI-powered summary of this report using configured LLM.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          No AI summary available yet. Click the button below to generate a concise summary highlighting key insights and recommendations.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleGenerateSummary} disabled={loading || saving || isEditing}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate AI Summary
            </>
          )}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setIsEditing(true)
              setDraft("")
            }}
            disabled={loading || saving}
          >
            Write manually
          </Button>
        </div>
        {isEditing && (
          <div className="space-y-3">
            <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={8} />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsEditing(false)
                  setDraft("")
                }}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={handleSaveEdit} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save"
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}