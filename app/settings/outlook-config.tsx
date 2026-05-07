"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, AlertCircle, Loader2, Mail } from "lucide-react"
import { getOutlookConfig, saveOutlookConfig, testOutlookConnection } from "./actions"
import type { OutlookConfig } from "./actions"

export default function OutlookConfigComponent() {
  const [config, setConfig] = useState<OutlookConfig>({
    enabled: false,
    organizationName: "",
    employeeDomains: "",
    smtpHost: "smtp.office365.com",
    smtpPort: "587",
    smtpUser: "",
    smtpPass: "",
    fromEmail: "",
  })
  const [loadingConfig, setLoadingConfig] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message?: string } | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoadingConfig(true)
      try {
        const saved = await getOutlookConfig()
        setConfig(saved)
      } finally {
        setLoadingConfig(false)
      }
    }
    load()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setResult(null)
    try {
      const response = await saveOutlookConfig(config)
      setResult({
        success: response.success,
        message: response.success ? "Outlook configuration saved." : response.error,
      })
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    setTesting(true)
    setResult(null)
    try {
      const response = await testOutlookConnection(config)
      setResult(response)
    } finally {
      setTesting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <Mail className="h-5 w-5 text-blue-700" />
            </div>
            <div>
              <CardTitle>Outlook Email Integration</CardTitle>
              <CardDescription>
                Configure organization email for ticket notifications and test SMTP connectivity.
              </CardDescription>
            </div>
          </div>
          <Switch
            checked={config.enabled}
            onCheckedChange={(checked) => setConfig((prev) => ({ ...prev, enabled: checked }))}
            disabled={loadingConfig}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {result && (
          <Alert
            variant={result.success ? "default" : "destructive"}
            className={result.success ? "border-green-200 bg-green-50 text-green-800" : ""}
          >
            {result.success ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            <AlertDescription>{result.message}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="organizationName">Organization Name *</Label>
            <Input
              id="organizationName"
              value={config.organizationName}
              onChange={(e) => setConfig((prev) => ({ ...prev, organizationName: e.target.value }))}
              placeholder="e.g. Ponturo GmbH"
              disabled={!config.enabled || loadingConfig}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="employeeDomains">Employee Email Domains</Label>
            <Input
              id="employeeDomains"
              value={config.employeeDomains}
              onChange={(e) => setConfig((prev) => ({ ...prev, employeeDomains: e.target.value }))}
              placeholder="company.com,sub.company.com"
              disabled={!config.enabled || loadingConfig}
            />
            <p className="text-xs text-muted-foreground">
              Comma-separated domains used by company employees.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="smtpHost">SMTP Host *</Label>
            <Input
              id="smtpHost"
              value={config.smtpHost}
              onChange={(e) => setConfig((prev) => ({ ...prev, smtpHost: e.target.value }))}
              placeholder="smtp.office365.com"
              disabled={!config.enabled || loadingConfig}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="smtpPort">SMTP Port *</Label>
            <Input
              id="smtpPort"
              value={config.smtpPort}
              onChange={(e) => setConfig((prev) => ({ ...prev, smtpPort: e.target.value }))}
              placeholder="587"
              disabled={!config.enabled || loadingConfig}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="smtpUser">SMTP Username *</Label>
            <Input
              id="smtpUser"
              value={config.smtpUser}
              onChange={(e) => setConfig((prev) => ({ ...prev, smtpUser: e.target.value }))}
              placeholder="helpdesk@company.com"
              disabled={!config.enabled || loadingConfig}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="smtpPass">SMTP Password *</Label>
            <Input
              id="smtpPass"
              type="password"
              value={config.smtpPass}
              onChange={(e) => setConfig((prev) => ({ ...prev, smtpPass: e.target.value }))}
              placeholder="App password"
              disabled={!config.enabled || loadingConfig}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="fromEmail">From Email *</Label>
          <Input
            id="fromEmail"
            value={config.fromEmail}
            onChange={(e) => setConfig((prev) => ({ ...prev, fromEmail: e.target.value }))}
            placeholder="helpdesk@company.com"
            disabled={!config.enabled || loadingConfig}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Button
            variant="outline"
            onClick={handleTest}
            disabled={
              !config.enabled ||
              testing ||
              !config.organizationName ||
              !config.smtpHost ||
              !config.smtpPort ||
              !config.smtpUser ||
              !config.smtpPass ||
              !config.fromEmail
            }
          >
            {testing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Test Connection
          </Button>
          <Button
            onClick={handleSave}
            disabled={
              !config.enabled ||
              saving ||
              !config.organizationName ||
              !config.smtpHost ||
              !config.smtpPort ||
              !config.smtpUser ||
              !config.smtpPass ||
              !config.fromEmail
            }
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Outlook Config
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
