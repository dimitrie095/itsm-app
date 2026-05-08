"use client"

import { useState } from "react"
import { AuditLog } from "../actions"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { User, Eye } from "lucide-react"

interface AuditLogsTableProps {
  logs: AuditLog[]
}

export function AuditLogsTable({ logs }: AuditLogsTableProps) {
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)

  const getActionColor = (action: string) => {
    if (action.includes("DELETE")) return "destructive"
    if (action.includes("CREATE")) return "default"
    if (action.includes("UPDATE") || action.includes("CHANGE")) return "secondary"
    if (action.includes("ASSIGN") || action.includes("PERMISSION")) return "outline"
    return "secondary"
  }

  const formatDetails = (details: string | null) => {
    if (!details) return "-"
    try {
      const parsed = JSON.parse(details)
      return Object.entries(parsed)
        .map(([key, value]) => `${key}: ${typeof value === "object" ? JSON.stringify(value) : value}`)
        .join(", ")
    } catch {
      return details
    }
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date & Time</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Entity</TableHead>
            <TableHead>User</TableHead>
            <TableHead>Details</TableHead>
            <TableHead>IP Address</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                No audit logs found.
              </TableCell>
            </TableRow>
          ) : (
            logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="whitespace-nowrap">
                  {new Date(log.createdAt).toLocaleString()}
                </TableCell>
                <TableCell>
                  <Badge variant={getActionColor(log.action) as any}>
                    {log.action}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="font-medium">{log.entityType}</div>
                  {log.entityId && (
                    <div className="text-xs text-muted-foreground">{log.entityId.substring(0, 8)}...</div>
                  )}
                </TableCell>
                <TableCell>
                  {log.user ? (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{log.user.name || log.user.email}</div>
                        <div className="text-xs text-muted-foreground">{log.user.email}</div>
                      </div>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">System</span>
                  )}
                </TableCell>
                <TableCell className="max-w-xs truncate" title={formatDetails(log.details)}>
                  {formatDetails(log.details)}
                </TableCell>
                <TableCell className="text-sm font-mono">{log.ipAddress || "-"}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => setSelectedLog(log)}>
                    <Eye className="mr-2 h-4 w-4" />
                    Open Log
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <Dialog open={selectedLog !== null} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Audit Log Details</DialogTitle>
            <DialogDescription>
              Full details for action <span className="font-medium">{selectedLog?.action}</span>.
            </DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-3 text-sm">
              <div><span className="font-medium">Timestamp:</span> {new Date(selectedLog.createdAt).toLocaleString()}</div>
              <div><span className="font-medium">Action:</span> {selectedLog.action}</div>
              <div><span className="font-medium">Entity:</span> {selectedLog.entityType}</div>
              <div><span className="font-medium">Entity ID:</span> {selectedLog.entityId || "-"}</div>
              <div><span className="font-medium">User:</span> {selectedLog.user?.name || selectedLog.user?.email || "System"}</div>
              <div><span className="font-medium">User Email:</span> {selectedLog.user?.email || "-"}</div>
              <div><span className="font-medium">IP Address:</span> {selectedLog.ipAddress || "-"}</div>
              <div><span className="font-medium">User Agent:</span> {selectedLog.userAgent || "-"}</div>
              <div>
                <span className="font-medium">Details:</span>
                <pre className="mt-2 max-h-56 overflow-auto rounded-md border bg-muted/40 p-3 text-xs">
                  {selectedLog.details
                    ? (() => {
                        try {
                          return JSON.stringify(JSON.parse(selectedLog.details), null, 2)
                        } catch {
                          return selectedLog.details
                        }
                      })()
                    : "-"}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}