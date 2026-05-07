"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ArrowLeft, Mail, Send, FileText, User } from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import {
  generateReportEmailContent,
  getReportById,
  getReportRecipientOptions,
  sendReportEmail,
} from "../../actions"

export default function SendReportPage() {
  const params = useParams<{ id: string }>()
  const reportId = params?.id
  const router = useRouter()
  const [isSending, setIsSending] = useState(false)
  const [isGeneratingAi, setIsGeneratingAi] = useState(false)
  const [isLoadingReport, setIsLoadingReport] = useState(true)
  const [report, setReport] = useState<any | null>(null)
  const [recipientOptions, setRecipientOptions] = useState<Array<{ email: string; label: string }>>([])
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([])
  const [recipientSearch, setRecipientSearch] = useState("")
  const [formData, setFormData] = useState({
    subject: '',
    message: '',
    includeAttachment: true
  })

  useEffect(() => {
    const loadReport = async () => {
      if (!reportId) return
      setIsLoadingReport(true)
      try {
        const data = await getReportById(reportId)
        if (!data) {
          toast.error("Report not found")
          router.push("/reports")
          return
        }
        setReport(data)
        const reportRecipients = Array.isArray(data?.metadata?.emailRecipients)
          ? data.metadata.emailRecipients.filter((email: string) => !!email)
          : []
        setSelectedRecipients(reportRecipients)
        setFormData((prev) => ({
          ...prev,
          subject: prev.subject || `ITSM Report: ${data.name}`,
        }))
      } catch (error) {
        toast.error("Failed to load report")
      } finally {
        setIsLoadingReport(false)
      }
    }
    loadReport()
  }, [reportId, router])

  useEffect(() => {
    const loadRecipientOptions = async () => {
      try {
        const response = await getReportRecipientOptions()
        if (response.success && response.options.length > 0) {
          setRecipientOptions(response.options)
          return
        }
      } catch (_error) {
        // Fallback below
      }

      try {
        const apiResponse = await fetch("/api/assignable-users", { cache: "no-store" })
        if (!apiResponse.ok) return
        const users: Array<{ email: string; name: string | null }> = await apiResponse.json()
        setRecipientOptions(
          users
            .filter((user) => !!user.email)
            .map((user) => ({
              email: user.email,
              label: user.name || user.email,
            }))
        )
      } catch (_error) {
        setRecipientOptions([])
      }
    }
    loadRecipientOptions()
  }, [])

  useEffect(() => {
    if (selectedRecipients.length === 0) return
    setRecipientOptions((prev) => {
      const existing = new Set(prev.map((option) => option.email))
      const missing = selectedRecipients
        .filter((email) => !existing.has(email))
        .map((email) => ({ email, label: email }))
      return missing.length > 0 ? [...prev, ...missing] : prev
    })
  }, [selectedRecipients])

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const toggleRecipient = (email: string) => {
    setSelectedRecipients((prev) =>
      prev.includes(email) ? prev.filter((item) => item !== email) : [...prev, email]
    )
  }

  const filteredRecipientOptions = recipientOptions.filter((option) => {
    const query = recipientSearch.trim().toLowerCase()
    if (!query) return true
    return option.label.toLowerCase().includes(query) || option.email.toLowerCase().includes(query)
  })

  const handleSendReport = async () => {
    if (!report) return
    setIsSending(true)

    try {
      const recipients = selectedRecipients
        .map((email) => email.trim())
        .filter((email) => email.length > 0)

      if (recipients.length === 0) {
        throw new Error('Please select at least one email recipient')
      }

      // Report senden
      const result = await sendReportEmail({
        id: report.id,
        recipients,
        subject: formData.subject,
        message: formData.message,
        includeAttachment: formData.includeAttachment,
      })

      toast.success('Report sent successfully', {
        description: `The report has been sent to ${recipients.length} recipient(s).`,
      })

      // Zur Report-Detailseite zurückkehren
      setTimeout(() => {
        router.push(`/reports/${report.id}`)
      }, 1500)

    } catch (error) {
      toast.error('Failed to send report', {
        description: error instanceof Error ? error.message : 'Please try again.',
      })
    } finally {
      setIsSending(false)
    }
  }

  const handleGenerateAiContent = async () => {
    if (!report) return
    setIsGeneratingAi(true)
    try {
      const generated = await generateReportEmailContent(report.id)
      if (!generated.success || !generated.subject || !generated.message) {
        throw new Error(generated.error || "AI generation failed")
      }
      setFormData((prev) => ({
        ...prev,
        subject: generated.subject!,
        message: generated.message!,
      }))
      toast.success("AI email content generated")
    } catch (error) {
      toast.error("Failed to generate AI content", {
        description: error instanceof Error ? error.message : "Please try again.",
      })
    } finally {
      setIsGeneratingAi(false)
    }
  }

  if (isLoadingReport || !report) {
    return (
      <div className="space-y-6">
        <div className="text-muted-foreground">Loading report...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href={`/reports/${report.id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Send Report</h1>
          <p className="text-muted-foreground">Email this report to recipients.</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Send Form */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Email Configuration</CardTitle>
            <CardDescription>Configure the email message and recipients.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="recipients">Recipients *</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="h-10 w-[240px] justify-between" disabled={isSending}>
                    <span>
                      {selectedRecipients.length > 0
                        ? `${selectedRecipients.length} selected`
                        : "Select recipients"}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[380px] max-h-80 overflow-auto" align="start">
                  <div className="p-2">
                    <Input
                      placeholder="Search recipients..."
                      value={recipientSearch}
                      onChange={(e) => setRecipientSearch(e.target.value)}
                      onKeyDown={(e) => e.stopPropagation()}
                    />
                  </div>
                  {recipientOptions.length === 0 ? (
                    <div className="px-2 py-2 text-sm text-muted-foreground">No users found</div>
                  ) : (
                    filteredRecipientOptions.map((option) => (
                      <button
                        key={option.email}
                        type="button"
                        className="flex w-full items-center justify-between px-2 py-2 text-left text-sm hover:bg-accent"
                        onClick={() => toggleRecipient(option.email)}
                      >
                        <span>{option.label}</span>
                        {selectedRecipients.includes(option.email) && (
                          <span className="text-xs text-primary">selected</span>
                        )}
                      </button>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              {selectedRecipients.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  Selected: {selectedRecipients.join(", ")}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                placeholder="e.g., Weekly Performance Report - March 2025"
                value={formData.subject}
                onChange={(e) => handleInputChange('subject', e.target.value)}
                disabled={isSending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                placeholder="Add a custom message to accompany the report..."
                value={formData.message}
                onChange={(e) => handleInputChange('message', e.target.value)}
                disabled={isSending}
                rows={6}
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="includeAttachment"
                checked={formData.includeAttachment}
                onChange={(e) => handleInputChange('includeAttachment', e.target.checked)}
                disabled={isSending}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="includeAttachment" className="text-sm">
                Include report as {report.format.toUpperCase()} attachment
              </Label>
            </div>

            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={handleGenerateAiContent}
                disabled={isSending || isGeneratingAi}
              >
                {isGeneratingAi ? "Generating..." : "Generate Content with AI"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Preview & Actions */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Report Preview</CardTitle>
              <CardDescription>Details of the report being sent</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-primary/10">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-medium">{report.name}</p>
                  <p className="text-sm text-muted-foreground capitalize">{report.type} Report</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Format:</span>
                  <span className="font-medium">{report.format.toUpperCase()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Recipients:</span>
                  <span className="font-medium">{selectedRecipients.length}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
              <CardDescription>Send or cancel</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Button 
                  onClick={handleSendReport}
                  disabled={isSending || selectedRecipients.length === 0}
                  className="w-full"
                >
                  {isSending ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Send Report
                    </>
                  )}
                </Button>

                <Button 
                  variant="outline" 
                  disabled={isSending}
                  className="w-full"
                  asChild
                >
                  <Link href={`/reports/${report.id}`}>
                    Cancel
                  </Link>
                </Button>
              </div>

              <div className="text-sm text-muted-foreground space-y-1">
                <p>• Report will be sent as an email attachment</p>
                <p>• Recipients will receive a download link</p>
                <p>• Email includes the configured message</p>
                <p>• Sending typically takes 5-15 seconds</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-2">
                <User className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <p className="text-sm">Include a clear subject line for easy identification</p>
              </div>
              <div className="flex items-start gap-2">
                <Mail className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <p className="text-sm">Verify email addresses before sending</p>
              </div>
              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <p className="text-sm">PDF format is recommended for printing</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}