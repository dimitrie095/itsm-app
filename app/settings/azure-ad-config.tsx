"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, CheckCircle, AlertCircle, Globe, RefreshCw } from "lucide-react"
import { saveAzureADConfig, testAzureADConnection, getAzureADConfig, triggerUserSync, AzureADConfig } from "./actions"

export default function AzureADConfig() {
  const [loading, setLoading] = useState(false)
  const [testing, setTesting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [loadingConfig, setLoadingConfig] = useState(true)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [config, setConfig] = useState<AzureADConfig>({
    enabled: false,
    clientId: "",
    clientSecret: "",
    tenantId: "",
    syncUsers: true,
    syncGroups: false,
    defaultRole: "END_USER",
    syncInterval: "24",
  })

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    setLoadingConfig(true)
    try {
      const savedConfig = await getAzureADConfig()
      setConfig(savedConfig)
    } finally {
      setLoadingConfig(false)
    }
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      const result = await saveAzureADConfig(config)
      if (result.success) {
        setTestResult({ success: true, message: "Configuration saved successfully" })
        // Reload config to ensure we have the latest state
        await loadConfig()
      } else {
        setTestResult({ success: false, message: result.error || "Failed to save configuration" })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const result = await testAzureADConnection(config)
      setTestResult(result)
    } finally {
      setTesting(false)
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    try {
      const result = await triggerUserSync()
      setTestResult(result)
    } finally {
      setSyncing(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <Globe className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle>Azure Active Directory</CardTitle>
              <CardDescription>
                Configure Azure AD for Single Sign-On and user synchronization.
              </CardDescription>
            </div>
          </div>
          <Switch
            checked={config.enabled}
            onCheckedChange={(checked) => setConfig({ ...config, enabled: checked })}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {testResult && (
          <Alert variant={testResult.success ? "default" : "destructive"}>
            {testResult.success ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertDescription>{testResult.message}</AlertDescription>
          </Alert>
        )}

        {config.enabled && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              After saving configuration, you may need to restart the application for changes to take effect.
              Azure AD Single Sign-On will be available at <code className="bg-muted px-1 py-0.5 rounded text-xs">/api/auth/signin</code>
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tenantId">Tenant ID *</Label>
              <Input
                id="tenantId"
                value={config.tenantId}
                onChange={(e) => setConfig({ ...config, tenantId: e.target.value })}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                disabled={!config.enabled}
              />
              <p className="text-xs text-muted-foreground">
                Your Azure AD tenant ID (Directory ID)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="clientId">Client ID *</Label>
              <Input
                id="clientId"
                value={config.clientId}
                onChange={(e) => setConfig({ ...config, clientId: e.target.value })}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                disabled={!config.enabled}
              />
              <p className="text-xs text-muted-foreground">
                Application (client) ID from Azure Portal
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="clientSecret">Client Secret *</Label>
            <Input
              id="clientSecret"
              type="password"
              value={config.clientSecret}
              onChange={(e) => setConfig({ ...config, clientSecret: e.target.value })}
              placeholder="Enter your client secret"
              disabled={!config.enabled}
            />
            <p className="text-xs text-muted-foreground">
              Client secret from Azure Portal (certificates & secrets)
            </p>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="font-medium">User Synchronization</h3>
            
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="syncUsers">Sync Users from Azure AD</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically create/update users from Azure AD
                </p>
              </div>
              <Switch
                id="syncUsers"
                checked={config.syncUsers}
                onCheckedChange={(checked) => setConfig({ ...config, syncUsers: checked })}
                disabled={!config.enabled}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="syncGroups">Sync Groups</Label>
                <p className="text-sm text-muted-foreground">
                  Import Azure AD groups and map to ITSM roles
                </p>
              </div>
              <Switch
                id="syncGroups"
                checked={config.syncGroups}
                onCheckedChange={(checked) => setConfig({ ...config, syncGroups: checked })}
                disabled={!config.enabled || !config.syncUsers}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="defaultRole">Default Role for New Users</Label>
              <select
                id="defaultRole"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={config.defaultRole}
                onChange={(e) => setConfig({ ...config, defaultRole: e.target.value as any })}
                disabled={!config.enabled}
              >
                <option value="END_USER">End User</option>
                <option value="AGENT">Agent</option>
                <option value="ADMIN">Administrator</option>
              </select>
              <p className="text-xs text-muted-foreground">
                Default role assigned to users synced from Azure AD
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="syncInterval">Sync Interval (hours)</Label>
              <Input
                id="syncInterval"
                type="number"
                min="1"
                max="168"
                value={config.syncInterval}
                onChange={(e) => setConfig({ ...config, syncInterval: e.target.value })}
                disabled={!config.enabled || !config.syncUsers}
              />
              <p className="text-xs text-muted-foreground">
                How often to sync users from Azure AD (1-168 hours)
              </p>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Button
              onClick={handleTest}
              disabled={!config.enabled || testing || !config.tenantId || !config.clientId || !config.clientSecret}
              variant="outline"
              className="w-full"
            >
              {testing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Test Connection
            </Button>

            <Button
              onClick={handleSync}
              disabled={syncing || !config.enabled || !config.syncUsers || !config.tenantId || !config.clientId || !config.clientSecret}
              variant="outline"
              className="w-full"
            >
              {syncing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Sync Users Now
            </Button>
            
            <Button
              onClick={handleSave}
              disabled={loading || !config.enabled || !config.tenantId || !config.clientId || !config.clientSecret}
              className="w-full"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Configuration
            </Button>
          </div>

          <div className="rounded-lg border p-4 bg-muted/30">
            <h4 className="font-medium mb-2">Azure AD Setup Instructions</h4>
            <ol className="text-sm space-y-2 list-decimal pl-4">
              <li>Go to <a href="https://portal.azure.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Azure Portal</a></li>
              <li>Navigate to Azure Active Directory → App registrations → New registration</li>
              <li>Set redirect URI to: <code className="bg-muted px-1 py-0.5 rounded text-xs">http://localhost:3000/api/auth/callback/azure-ad</code></li>
              <li>Enable implicit grant flow (access tokens)</li>
              <li>Add API permissions: User.Read, GroupMember.Read.All, Directory.Read.All</li>
              <li>Create a client secret in Certificates & secrets</li>
              <li>Copy Tenant ID, Client ID, and Client Secret to fields above</li>
            </ol>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}