"use client"

import { useEffect, useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { AlertCircle, CheckCircle, Loader2, Users } from "lucide-react"
import { getTeamsConfig, saveTeamsConfig, testTeamsConnection } from "./actions"
import type { TeamsConfig } from "./actions"

export default function TeamsConfigComponent() {
  const [loadingConfig, setLoadingConfig] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message?: string } | null>(null)
  const [config, setConfig] = useState<TeamsConfig>({
    enabled: false,
    organizationName: "",
    channelName: "",
    webhookUrl: "",
  })

  useEffect(() => {
    const loadConfig = async () => {
      setLoadingConfig(true)
      try {
        const saved = await getTeamsConfig()
        setConfig(saved)
      } finally {
        setLoadingConfig(false)
      }
    }
    loadConfig()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setResult(null)
    try {
      const response = await saveTeamsConfig(config)
      setResult({
        success: response.success,
        message: response.success ? response.message : response.error,
      })
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    setTesting(true)
    setResult(null)
    try {
      const response = await testTeamsConnection(config)
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
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100">
              <Users className="h-5 w-5 text-indigo-700" />
            </div>
            <div>
              <CardTitle>Microsoft Teams Integration</CardTitle>
              <CardDescription>
                Send ticket updates to Teams channel using incoming webhook.
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
            <Label htmlFor="teams-organization">Organization Name *</Label>
            <Input
              id="teams-organization"
              value={config.organizationName}
              onChange={(e) => setConfig((prev) => ({ ...prev, organizationName: e.target.value }))}
              placeholder="Ponturo GmbH"
              disabled={!config.enabled || loadingConfig}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="teams-channel">Channel Name *</Label>
            <Input
              id="teams-channel"
              value={config.channelName}
              onChange={(e) => setConfig((prev) => ({ ...prev, channelName: e.target.value }))}
              placeholder="ITSM Alerts"
              disabled={!config.enabled || loadingConfig}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="teams-webhook">Incoming Webhook URL *</Label>
          <Input
            id="teams-webhook"
            value={config.webhookUrl}
            onChange={(e) => setConfig((prev) => ({ ...prev, webhookUrl: e.target.value }))}
            placeholder={config.webhookConfigured ? "Stored securely (enter new to rotate)" : "https://outlook.office.com/webhook/..."}
            disabled={!config.enabled || loadingConfig}
          />
          <p className="text-xs text-muted-foreground">
            Create an Incoming Webhook connector in Teams channel settings and paste the URL here.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Button
            variant="outline"
            onClick={handleTest}
            disabled={!config.enabled || testing || !config.organizationName || !config.channelName || (!config.webhookUrl && !config.webhookConfigured)}
          >
            {testing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Test Connection
          </Button>
          <Button
            onClick={handleSave}
            disabled={!config.enabled || saving || !config.organizationName || !config.channelName || (!config.webhookUrl && !config.webhookConfigured)}
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Teams Config
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
