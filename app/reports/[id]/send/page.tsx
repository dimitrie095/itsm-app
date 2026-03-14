"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Mail, Send, FileText, User } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import { sendReport } from "../../actions"

export default function SendReportPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [isSending, setIsSending] = useState(false)
  const [formData, setFormData] = useState({
    recipients: '',
    subject: '',
    message: '',
    includeAttachment: true
  })

  // In einer echten App würde man den Report hier laden
  // Für Demo verwenden wir Platzhalter-Daten
  const report = {
    id: (params as any).id,
    name: 'Sample Report',
    type: 'weekly',
    format: 'pdf'
  }

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSendReport = async () => {
    setIsSending(true)

    try {
      // E-Mail-Empfänger parsen
      const recipients = formData.recipients
        .split(',')
        .map(email => email.trim())
        .filter(email => email.length > 0)

      if (recipients.length === 0) {
        throw new Error('Please enter at least one email recipient')
      }

      // Report senden
      const result = await sendReport(report.id, recipients)

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
              <Input
                id="recipients"
                placeholder="recipient1@example.com, recipient2@example.com"
                value={formData.recipients}
                onChange={(e) => handleInputChange('recipients', e.target.value)}
                disabled={isSending}
              />
              <p className="text-sm text-muted-foreground">
                Separate multiple email addresses with commas
              </p>
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
                  <span className="font-medium">
                    {formData.recipients 
                      ? formData.recipients.split(',').filter(e => e.trim()).length 
                      : 0}
                  </span>
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
                  disabled={isSending || !formData.recipients.trim()}
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