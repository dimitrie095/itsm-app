"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Calendar, FileText, Mail, Download, BarChart, User } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import { generateReport } from "../actions"

const reportTypes = [
  { id: 'weekly', label: 'Weekly Summary', description: 'Weekly ticket and performance summary', icon: Calendar },
  { id: 'monthly', label: 'Monthly Performance', description: 'Monthly performance and SLA report', icon: Calendar },
  { id: 'sla', label: 'SLA Compliance', description: 'Detailed SLA compliance analysis', icon: BarChart },
  { id: 'ticket', label: 'Ticket Analysis', description: 'Ticket trends and category breakdown', icon: FileText },
  { id: 'agent', label: 'Agent Performance', description: 'Agent productivity and metrics', icon: User },
]

const formats = [
  { id: 'pdf', label: 'PDF Document', description: 'Printable PDF document' },
  { id: 'html', label: 'HTML Report', description: 'Web-based HTML report' },
  { id: 'json', label: 'JSON Data', description: 'Raw JSON data for analysis' },
]

export default function NewReportPage() {
  const router = useRouter()
  const [isGenerating, setIsGenerating] = useState(false)
  const [formData, setFormData] = useState({
    type: 'weekly',
    name: '',
    format: 'pdf',
    emailRecipients: '',
    notes: '',
    dateRange: 'last30' // last30, last7, custom
  })

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleGenerateReport = async () => {
    setIsGenerating(true)

    try {
      // E-Mail-Empfänger parsen
      const emailRecipients = formData.emailRecipients
        .split(',')
        .map(email => email.trim())
        .filter(email => email.length > 0)

      // Datumsbereich berechnen
      let dateRange
      const now = new Date()
      switch (formData.dateRange) {
        case 'last7':
          dateRange = {
            start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            end: now.toISOString()
          }
          break
        case 'custom':
          // Für Custom bräuchte man Date-Picker, hier einfach last30
        default: // last30
          dateRange = {
            start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            end: now.toISOString()
          }
      }

      // Report generieren
      const report = await generateReport({
        type: formData.type as any,
        name: formData.name || undefined,
        format: formData.format as 'pdf' | 'html' | 'json',
        emailRecipients: emailRecipients.length > 0 ? emailRecipients : undefined,
        dateRange
      })

      toast.success('Report generated successfully', {
        description: `"${report.name}" has been created and is ready to view.`,
      })

      // Zur Report-Detailseite navigieren
      setTimeout(() => {
        router.push(`/reports/${report.id}`)
      }, 1500)

    } catch (error) {
      toast.error('Failed to generate report', {
        description: error instanceof Error ? error.message : 'Please try again.',
      })
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/reports">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Generate Report</h1>
          <p className="text-muted-foreground">Create a new analytical report.</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Report Type Selection */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Report Configuration</CardTitle>
            <CardDescription>Configure the type and scope of your report.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <Label>Report Type *</Label>
              <div className="grid gap-3 md:grid-cols-2">
                {reportTypes.map((type) => {
                  const Icon = type.icon
                  return (
                    <Button
                      key={type.id}
                      type="button"
                      variant={formData.type === type.id ? "default" : "outline"}
                      className="h-auto py-4 justify-start"
                      onClick={() => handleInputChange('type', type.id)}
                    >
                      <div className="flex items-center gap-3 text-left">
                        <div className={`p-2 rounded-md ${formData.type === type.id ? 'bg-white/20' : 'bg-primary/10'}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium">{type.label}</p>
                          <p className="text-xs text-muted-foreground">{type.description}</p>
                        </div>
                      </div>
                    </Button>
                  )
                })}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Report Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Weekly Performance Report - March 2025"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  disabled={isGenerating}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="format">Output Format *</Label>
                <Select 
                  value={formData.format} 
                  onValueChange={(value) => handleInputChange('format', value)}
                  disabled={isGenerating}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select format" />
                  </SelectTrigger>
                  <SelectContent>
                    {formats.map((format) => (
                      <SelectItem key={format.id} value={format.id}>
                        <div className="flex items-center gap-2">
                          <span>{format.label}</span>
                          <span className="text-xs text-muted-foreground">({format.description})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="emailRecipients">Email Recipients (Optional)</Label>
              <Input
                id="emailRecipients"
                placeholder="recipient1@example.com, recipient2@example.com"
                value={formData.emailRecipients}
                onChange={(e) => handleInputChange('emailRecipients', e.target.value)}
                disabled={isGenerating}
              />
              <p className="text-sm text-muted-foreground">
                Separate multiple email addresses with commas
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateRange">Date Range</Label>
              <Select 
                value={formData.dateRange} 
                onValueChange={(value) => handleInputChange('dateRange', value)}
                disabled={isGenerating}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select date range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last7">Last 7 days</SelectItem>
                  <SelectItem value="last30">Last 30 days</SelectItem>
                  <SelectItem value="custom">Custom range (coming soon)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any additional notes or comments about this report..."
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                disabled={isGenerating}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Preview & Actions */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
              <CardDescription>Report details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Type:</span>
                  <span className="font-medium">
                    {reportTypes.find(t => t.id === formData.type)?.label}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Format:</span>
                  <span className="font-medium">
                    {formats.find(f => f.id === formData.format)?.label}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Date Range:</span>
                  <span className="font-medium">
                    {formData.dateRange === 'last7' ? 'Last 7 days' : 'Last 30 days'}
                  </span>
                </div>
                {formData.emailRecipients && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Email to:</span>
                    <span className="font-medium text-sm text-right max-w-[150px] truncate">
                      {formData.emailRecipients.split(',').length} recipient(s)
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
              <CardDescription>Generate or download report</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Button 
                  onClick={handleGenerateReport}
                  disabled={isGenerating}
                  className="w-full"
                >
                  {isGenerating ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FileText className="mr-2 h-4 w-4" />
                      Generate Report
                    </>
                  )}
                </Button>
                
                {formData.emailRecipients && (
                  <Button 
                    variant="outline" 
                    disabled={isGenerating}
                    className="w-full"
                    onClick={handleGenerateReport}
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Generate & Email
                  </Button>
                )}

                <Button 
                  variant="ghost" 
                  disabled={isGenerating}
                  className="w-full"
                  asChild
                >
                  <Link href="/reports">
                    Cancel
                  </Link>
                </Button>
              </div>

              <div className="text-sm text-muted-foreground space-y-1">
                <p>• Report will include:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Ticket statistics and trends</li>
                  <li>SLA compliance metrics</li>
                  <li>Category and priority breakdown</li>
                  <li>Recent ticket activity</li>
                </ul>
                <p className="pt-2">• Generation takes 10-30 seconds</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}