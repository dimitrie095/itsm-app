import { getAuditLogs } from "./actions"
import { AuditLogsTable } from "./components/AuditLogsTable"
import { AuditExportButton } from "./components/AuditExportButton"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata = {
  title: "Audit Logs",
  description: "View system audit logs for critical activities",
}

export const dynamic = 'force-dynamic'

export default async function AuditLogsPage() {
  const logs = await getAuditLogs()

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
          <p className="text-muted-foreground">
            Track all critical activities: user deletions, role changes, password resets, and more.
          </p>
        </div>
        <AuditExportButton logs={logs} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            All audit log entries are stored for compliance and security monitoring.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AuditLogsTable logs={logs} />
        </CardContent>
      </Card>
    </div>
  )
}