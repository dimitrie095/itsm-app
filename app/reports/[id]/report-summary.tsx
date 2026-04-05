"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FormattedAISummary } from "@/components/ui/formatted-ai-summary"
import { Loader2, Sparkles } from "lucide-react"
import { useState } from "react"
import { generateReportSummary } from "../actions"
import { toast } from "sonner"

interface ReportSummaryProps {
  reportId: string
  initialSummary?: string
}

export function ReportSummary({ reportId, initialSummary }: ReportSummaryProps) {
  const [summary, setSummary] = useState(initialSummary)
  const [loading, setLoading] = useState(false)

  const handleGenerateSummary = async () => {
    setLoading(true)
    try {
      const result = await generateReportSummary(reportId)
      if (result.success && result.summary) {
        setSummary(result.summary)
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

  if (summary) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <CardTitle>AI Summary</CardTitle>
            </div>
            <Button variant="outline" size="sm" onClick={handleGenerateSummary} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Regenerate"}
            </Button>
          </div>
          <CardDescription>
            AI-generated summary of key insights and recommendations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <FormattedAISummary content={summary} />
          </div>
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
            <CardTitle>AI Summary</CardTitle>
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
        <Button onClick={handleGenerateSummary} disabled={loading}>
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
      </CardContent>
    </Card>
  )
}