import { Priority, TicketStatus, TicketSource } from "@/lib/generated/prisma/enums"

export const SUPPORTED_AUTOMATION_CATEGORIES = ["Ticket", "Asset", "Knowledge Base"] as const
export const SUPPORTED_AUTOMATION_TRIGGERS = [
  "Ticket Created",
  "Ticket Updated",
  "Asset Created",
  "Asset Updated",
  "Article Created",
  "Article Updated",
] as const

export const SUPPORTED_CONDITIONS = [
  // Ticket
  "Priority = 'Low'",
  "Priority = 'Medium'",
  "Priority = 'High'",
  "Priority = 'Critical'",
  "Source = 'Portal'",
  "Source = 'Email'",
  "Category = 'Hardware'",
  "Category = 'Software'",
  "Category = 'Network'",
  "Category = 'Email'",
  "Category = 'Account'",
  "Category = 'Other'",
  "Status = 'New'",
  "Status = 'Assigned'",
  "Status = 'In Progress'",
  "Status = 'Resolved'",
  "Status = 'Closed'",
  // Asset
  "Asset Type = 'Laptop'",
  "Asset Type = 'Desktop'",
  "Asset Type = 'Monitor'",
  "Asset Type = 'Phone'",
  "Asset Type = 'Printer'",
  "Asset Type = 'Software'",
  "Asset Type = 'Server'",
  "Asset Type = 'Network'",
  "Asset Type = 'Other'",
  "Asset Status = 'Active'",
  "Asset Status = 'Inactive'",
  "Asset Status = 'Maintenance'",
  "Asset Status = 'Retired'",
  "Asset Status = 'Lost'",
  "Asset Location = 'Headquarters'",
  "Asset Location = 'Remote'",
  // Knowledge
  "Article Status = 'Published'",
  "Article Status = 'Draft'",
  "Article Category = 'How-to'",
  "Article Category = 'Troubleshooting'",
  "Article Category = 'Reference'",
  "Article Category = 'FAQ'",
] as const

export const SUPPORTED_ACTIONS = [
  { value: "Assign to Agent", hasParam: true, paramLabel: "Agent Email" },
  { value: "Change Priority", hasParam: true, paramLabel: "Priority" },
  { value: "Change Status", hasParam: true, paramLabel: "Status" },
  { value: "Add Tag", hasParam: true, paramLabel: "Tag" },
  { value: "Close Ticket", hasParam: false, paramLabel: "" },
  { value: "Assign Asset to User", hasParam: true, paramLabel: "User Email" },
  { value: "Update Asset Status", hasParam: true, paramLabel: "Asset Status" },
  { value: "Update Asset Location", hasParam: true, paramLabel: "Location" },
  { value: "Publish Article", hasParam: false, paramLabel: "" },
  { value: "Update Article Category", hasParam: true, paramLabel: "Category" },
] as const

export const SUPPORTED_PRIORITY_PARAMS = ["Low", "Medium", "High", "Critical"] as const
export const SUPPORTED_STATUS_PARAMS = ["New", "Assigned", "In Progress", "Resolved", "Closed"] as const
export const SUPPORTED_EMAIL_SOURCE_PARAMS = ["Portal", "Email"] as const
export const SUPPORTED_CATEGORY_PARAMS = ["Hardware", "Software", "Network", "Email", "Account", "Other"] as const
export const SUPPORTED_ASSET_STATUS_PARAMS = ["Active", "Inactive", "Maintenance", "Retired", "Lost"] as const
export const SUPPORTED_ARTICLE_CATEGORY_PARAMS = ["How-to", "Troubleshooting", "Reference", "FAQ"] as const

export type SupportedAutomationAction = (typeof SUPPORTED_ACTIONS)[number]["value"]

export function normalizeCondition(input: string): string {
  return input.trim()
}

export function buildStoredAction(action: string, actionParam?: string): string {
  const trimmedParam = (actionParam ?? "").trim()
  return trimmedParam ? `${action}: ${trimmedParam}` : action
}

export function splitStoredAction(action: string): { actionName: string; actionParam: string | null } {
  const idx = action.indexOf(":")
  if (idx === -1) {
    return { actionName: action.trim(), actionParam: null }
  }
  return {
    actionName: action.slice(0, idx).trim(),
    actionParam: action.slice(idx + 1).trim() || null,
  }
}

export function parseCondition(condition: string): { field: string; value: string } | null {
  const normalized = normalizeCondition(condition)
  if (!normalized) return null
  const match = normalized.match(/^([A-Za-z ]+)\s*=\s*'([^']+)'$/)
  if (!match) return null
  return {
    field: match[1].trim(),
    value: match[2].trim(),
  }
}

export function statusParamToEnum(status: string): TicketStatus | null {
  const lower = status.trim().toLowerCase()
  if (lower === "new") return TicketStatus.NEW
  if (lower === "assigned") return TicketStatus.ASSIGNED
  if (lower === "in progress") return TicketStatus.IN_PROGRESS
  if (lower === "resolved") return TicketStatus.RESOLVED
  if (lower === "closed") return TicketStatus.CLOSED
  return null
}

export function priorityParamToEnum(priority: string): Priority | null {
  const lower = priority.trim().toLowerCase()
  if (lower === "low") return Priority.LOW
  if (lower === "medium") return Priority.MEDIUM
  if (lower === "high") return Priority.HIGH
  if (lower === "critical") return Priority.CRITICAL
  return null
}

export function sourceParamToEnum(source: string): TicketSource | null {
  const lower = source.trim().toLowerCase()
  if (lower === "portal") return TicketSource.PORTAL
  if (lower === "email") return TicketSource.EMAIL
  return null
}

export function assetStatusParamToEnum(input: string): string | null {
  const matched = SUPPORTED_ASSET_STATUS_PARAMS.find((status) => status.toLowerCase() === input.trim().toLowerCase())
  return matched ?? null
}

