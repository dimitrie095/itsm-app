"use client"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Download } from "lucide-react"
import { AuditLog } from "../actions"

interface AuditExportButtonProps {
  logs: AuditLog[]
}

function escapeCsv(value: unknown): string {
  const str = String(value ?? "")
  return `"${str.replace(/"/g, '""')}"`
}

export function AuditExportButton({ logs }: AuditExportButtonProps) {
  const handleExportCsv = () => {
    if (logs.length === 0) return

    const header = [
      "timestamp",
      "action",
      "entityType",
      "entityId",
      "userName",
      "userEmail",
      "details",
      "ipAddress",
      "userAgent",
    ]

    const rows = logs.map((log) => [
      log.createdAt instanceof Date ? log.createdAt.toISOString() : new Date(log.createdAt).toISOString(),
      log.action,
      log.entityType,
      log.entityId || "",
      log.user?.name || "",
      log.user?.email || "",
      log.details || "",
      log.ipAddress || "",
      log.userAgent || "",
    ])

    const csv = [header, ...rows]
      .map((row) => row.map((cell) => escapeCsv(cell)).join(","))
      .join("\n")

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleExportJson = () => {
    if (logs.length === 0) return

    const jsonData = logs.map((log) => ({
      id: log.id,
      timestamp: log.createdAt instanceof Date ? log.createdAt.toISOString() : new Date(log.createdAt).toISOString(),
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      userId: log.userId,
      userName: log.user?.name || null,
      userEmail: log.user?.email || null,
      details: log.details,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
    }))

    const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: "application/json;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={logs.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleExportCsv}>Export as CSV</DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportJson}>Export as JSON</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
