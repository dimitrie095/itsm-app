import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Save, Bell, Lock, Database, Users, Globe } from "lucide-react"

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Manage system configuration and preferences.</p>
        </div>
        <Button>
          <Save className="mr-2 h-4 w-4" />
          Save Changes
        </Button>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>Basic system configuration.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="company-name">Company Name</Label>
                <Input id="company-name" defaultValue="Acme Corporation" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select defaultValue="utc">
                  <SelectTrigger>
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="utc">UTC</SelectItem>
                    <SelectItem value="est">Eastern Time</SelectItem>
                    <SelectItem value="cet">Central European Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="date-format">Date Format</Label>
                <Select defaultValue="yyyy-mm-dd">
                  <SelectTrigger>
                    <SelectValue placeholder="Select format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yyyy-mm-dd">YYYY-MM-DD</SelectItem>
                    <SelectItem value="mm/dd/yyyy">MM/DD/YYYY</SelectItem>
                    <SelectItem value="dd/mm/yyyy">DD/MM/YYYY</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="maintenance-mode">Maintenance Mode</Label>
                  <p className="text-sm text-muted-foreground">Disable user access during maintenance.</p>
                </div>
                <Switch id="maintenance-mode" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>SLA Settings</CardTitle>
              <CardDescription>Configure default Service Level Agreements.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="sla-critical">Critical Priority Response Time (minutes)</Label>
                <Input id="sla-critical" type="number" defaultValue="30" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sla-high">High Priority Response Time (minutes)</Label>
                <Input id="sla-high" type="number" defaultValue="60" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sla-medium">Medium Priority Response Time (hours)</Label>
                <Input id="sla-medium" type="number" defaultValue="4" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sla-low">Low Priority Response Time (hours)</Label>
                <Input id="sla-low" type="number" defaultValue="24" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Authentication</CardTitle>
              <CardDescription>Configure login and SSO settings.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="sso">Single Sign-On (SSO)</Label>
                  <p className="text-sm text-muted-foreground">Enable Azure AD / Okta integration.</p>
                </div>
                <Switch id="sso" />
              </div>
              <Separator />
              <div className="grid gap-2">
                <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
                <Input id="session-timeout" type="number" defaultValue="60" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="mfa">Multi-Factor Authentication</Label>
                  <p className="text-sm text-muted-foreground">Require MFA for all users.</p>
                </div>
                <Switch id="mfa" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Data Protection</CardTitle>
              <CardDescription>GDPR and data retention settings.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="anonymize">Anonymize Closed Tickets</Label>
                  <p className="text-sm text-muted-foreground">Automatically anonymize user data after 90 days.</p>
                </div>
                <Switch id="anonymize" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="retention">Data Retention Period (months)</Label>
                <Input id="retention" type="number" defaultValue="36" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Email Notifications</CardTitle>
              <CardDescription>Configure when and how users are notified.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="notify-new">New Ticket Assignments</Label>
                  <p className="text-sm text-muted-foreground">Notify agents when assigned a new ticket.</p>
                </div>
                <Switch id="notify-new" defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="notify-sla">SLA Breach Alerts</Label>
                  <p className="text-sm text-muted-foreground">Send alerts when SLA is about to be breached.</p>
                </div>
                <Switch id="notify-sla" defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="notify-status">Status Changes</Label>
                  <p className="text-sm text-muted-foreground">Notify users when ticket status changes.</p>
                </div>
                <Switch id="notify-status" defaultChecked />
              </div>
              <Separator />
              <div className="grid gap-2">
                <Label htmlFor="sender-email">Sender Email Address</Label>
                <Input id="sender-email" type="email" defaultValue="support@company.com" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Third-Party Integrations</CardTitle>
              <CardDescription>Connect with other tools and services.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                    <Globe className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <Label>Azure Active Directory</Label>
                    <p className="text-sm text-muted-foreground">User synchronization and SSO.</p>
                  </div>
                </div>
                <Switch />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                    <Database className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <Label>Monitoring Tools</Label>
                    <p className="text-sm text-muted-foreground">Connect with Nagios, Zabbix, etc.</p>
                  </div>
                </div>
                <Switch />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
                    <Users className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <Label>Chat Platforms</Label>
                    <p className="text-sm text-muted-foreground">Slack, Microsoft Teams integration.</p>
                  </div>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}