"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, CheckCircle, AlertCircle, Trash2, Edit, Brain, Globe } from "lucide-react"
import { saveLlmConfig, testLlmConnection, getLlmConfigs, deleteLlmConfig, setDefaultLlmConfig, LlmConfig } from "./llm-actions"

const providerOptions = [
  { value: "DEEPSEEK", label: "DeepSeek" },
  { value: "KIMI", label: "Kimi" },
  { value: "OPENAI", label: "OpenAI" },
  { value: "AZURE_OPENAI", label: "Azure OpenAI" },
  { value: "GEMINI", label: "Gemini" },
]

export default function LlmConfigComponent() {
  const [loading, setLoading] = useState(false)
  const [testing, setTesting] = useState(false)
  const [loadingConfigs, setLoadingConfigs] = useState(true)
  const [testResult, setTestResult] = useState<{ success: boolean; message?: string; error?: string } | null>(null)
  const [configs, setConfigs] = useState<LlmConfig[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [config, setConfig] = useState<LlmConfig>({
    provider: "OPENAI",
    name: "",
    apiKeyEncrypted: "",
    endpointUrl: "",
    deploymentName: "",
    version: "",
    isDefault: false,
    enabled: false,
  })

  useEffect(() => {
    loadConfigs()
  }, [])

  // Auto-dismiss test result after 5 seconds
  useEffect(() => {
    if (testResult) {
      const timer = setTimeout(() => {
        setTestResult(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [testResult])

  const loadConfigs = async () => {
    setLoadingConfigs(true)
    try {
      const savedConfigs = await getLlmConfigs()
      setConfigs(savedConfigs)
    } finally {
      setLoadingConfigs(false)
    }
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      const result = await saveLlmConfig({
        ...config,
        id: editingId || undefined,
      })
      if (result.success) {
        setTestResult({ success: true, message: "Configuration saved successfully" })
        setEditingId(null)
        setConfig({
          provider: "OPENAI",
          name: "",
          apiKeyEncrypted: "",
          endpointUrl: "",
          deploymentName: "",
          version: "",
          isDefault: false,
          enabled: false,
        })
        await loadConfigs()
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
      const result = await testLlmConnection(config)
      setTestResult(result)
    } finally {
      setTesting(false)
    }
  }

  const handleEdit = (config: LlmConfig) => {
    setEditingId(config.id || null)
    setConfig({
      provider: config.provider,
      name: config.name,
      apiKeyEncrypted: config.apiKeyEncrypted,
      endpointUrl: config.endpointUrl || "",
      deploymentName: config.deploymentName || "",
      version: config.version || "",
      isDefault: config.isDefault,
      enabled: config.enabled,
    })
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this LLM configuration?")) return
    const result = await deleteLlmConfig(id)
    if (result.success) {
      await loadConfigs()
      if (editingId === id) {
        setEditingId(null)
        setConfig({
          provider: "OPENAI",
          name: "",
          apiKeyEncrypted: "",
          endpointUrl: "",
          deploymentName: "",
          version: "",
          isDefault: false,
          enabled: false,
        })
      }
    } else {
      alert(result.error || "Failed to delete configuration")
    }
  }

  const handleSetDefault = async (id: string) => {
    const result = await setDefaultLlmConfig(id)
    if (result.success) {
      await loadConfigs()
    } else {
      alert(result.error || "Failed to set default configuration")
    }
  }

  const handleProviderChange = (value: LlmConfig["provider"]) => {
    setConfig({ ...config, provider: value })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
              <Brain className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <CardTitle>LLM Configuration</CardTitle>
              <CardDescription>
                Configure Large Language Models for article suggestions and other AI features.
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
        {config.enabled && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              LLM features will be available for article suggestions once configured.
              Make sure to test the connection before saving.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="provider">Provider *</Label>
              <Select value={config.provider} onValueChange={handleProviderChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  {providerOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Choose the LLM provider
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Configuration Name *</Label>
              <Input
                id="name"
                value={config.name}
                onChange={(e) => setConfig({ ...config, name: e.target.value })}
                placeholder="e.g., Production OpenAI"
                disabled={!config.enabled}
              />
              <p className="text-xs text-muted-foreground">
                A descriptive name for this configuration
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key *</Label>
            <Input
              id="apiKey"
              type="password"
              value={config.apiKeyEncrypted}
              onChange={(e) => setConfig({ ...config, apiKeyEncrypted: e.target.value })}
              placeholder="sk-..."
              disabled={!config.enabled}
            />
            <p className="text-xs text-muted-foreground">
              Your API key for the selected provider
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="endpointUrl">Endpoint URL {config.provider === "AZURE_OPENAI" ? "*" : "(optional)"}</Label>
              <Input
                id="endpointUrl"
                value={config.endpointUrl}
                onChange={(e) => setConfig({ ...config, endpointUrl: e.target.value })}
                placeholder={
                  config.provider === "AZURE_OPENAI" 
                    ? "https://your-resource.openai.azure.com"
                    : "https://api.openai.com/v1"
                }
                disabled={!config.enabled}
              />
              <p className="text-xs text-muted-foreground">
                {config.provider === "AZURE_OPENAI" 
                  ? "Azure OpenAI endpoint URL"
                  : "Custom endpoint URL (leave blank for default)"}
              </p>
            </div>

            {config.provider === "AZURE_OPENAI" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="deploymentName">Deployment Name *</Label>
                  <Input
                    id="deploymentName"
                    value={config.deploymentName}
                    onChange={(e) => setConfig({ ...config, deploymentName: e.target.value })}
                    placeholder="gpt-35-turbo"
                    disabled={!config.enabled}
                  />
                  <p className="text-xs text-muted-foreground">
                    Azure OpenAI deployment name
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="version">API Version (optional)</Label>
                  <Input
                    id="version"
                    value={config.version}
                    onChange={(e) => setConfig({ ...config, version: e.target.value })}
                    placeholder="2024-02-15-preview"
                    disabled={!config.enabled}
                  />
                  <p className="text-xs text-muted-foreground">
                    Azure OpenAI API version
                  </p>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Switch
                id="isDefault"
                checked={config.isDefault}
                onCheckedChange={(checked) => setConfig({ ...config, isDefault: checked })}
                disabled={!config.enabled}
              />
              <Label htmlFor="isDefault">Set as default configuration</Label>
            </div>
            <p className="text-xs text-muted-foreground">
              This configuration will be used by default for article suggestions
            </p>
          </div>
        </div>

        <Separator />

        <div className="flex flex-wrap gap-2">
          <Button onClick={handleTest} disabled={!config.enabled || testing}>
            {testing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Test Connection
          </Button>
          <Button onClick={handleSave} disabled={!config.enabled || loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {editingId ? "Update Configuration" : "Save Configuration"}
          </Button>
          {editingId && (
            <Button variant="outline" onClick={() => {
              setEditingId(null)
              setConfig({
                provider: "OPENAI",
                name: "",
                apiKeyEncrypted: "",
                endpointUrl: "",
                deploymentName: "",
                version: "",
                isDefault: false,
                enabled: false,
              })
            }}>
              Cancel Edit
            </Button>
          )}
        </div>

        <Separator />

        {/* Test Result Message - compact inline display */}
        {testResult && (
          <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-md ${
            testResult.success 
              ? "bg-green-50 text-green-700 border border-green-200" 
              : "bg-red-50 text-red-700 border border-red-200"
          }`}>
            {testResult.success ? (
              <CheckCircle className="h-4 w-4 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
            )}
            <span>{testResult.message}</span>
          </div>
        )}

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Existing Configurations</h3>
          {loadingConfigs ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : configs.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No LLM configurations found. Create your first configuration above.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              {configs.map((cfg) => (
                <div key={cfg.id} className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{cfg.name}</span>
                      {cfg.isDefault && (
                        <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                          Default
                        </span>
                      )}
                      {cfg.enabled ? (
                        <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
                          Enabled
                        </span>
                      ) : (
                        <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800">
                          Disabled
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Provider: {cfg.provider} • Endpoint: {cfg.endpointUrl || "default"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!cfg.isDefault && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetDefault(cfg.id!)}
                      >
                        Set Default
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(cfg)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(cfg.id!)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}