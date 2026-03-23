"use client"

import { AuditLog } from "../actions"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { User } from "lucide-react"

interface AuditLogsTableProps {
  logs: AuditLog[]
}

export function AuditLogsTable({ logs }: AuditLogsTableProps) {
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
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
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
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}