import { Priority, TicketStatus } from "@/lib/generated/prisma/enums"

const MINUTE = 60 * 1000
const WARNING_THRESHOLD_RATIO = 0.8

type SlaState = "ok" | "warning" | "breached" | "met" | "not_started"

export interface SlaPolicy {
  responseTime: number // minutes
  resolutionTime: number // minutes
}

export interface SlaSnapshot {
  responseDueAt: string | null
  resolutionDueAt: string | null
  responseState: SlaState
  resolutionState: SlaState
  responseMinutesRemaining: number | null
  resolutionMinutesRemaining: number | null
}

const DEFAULT_SLA_BY_PRIORITY: Record<Priority, SlaPolicy> = {
  CRITICAL: { responseTime: 30, resolutionTime: 240 },
  HIGH: { responseTime: 60, resolutionTime: 480 },
  MEDIUM: { responseTime: 240, resolutionTime: 1440 },
  LOW: { responseTime: 480, resolutionTime: 2880 },
}

function getTerminalState(
  startedAt: Date,
  completedAt: Date | null,
  dueAt: Date
): SlaState {
  if (completedAt) {
    return completedAt.getTime() <= dueAt.getTime() ? "met" : "breached"
  }
  return getLiveState(startedAt, dueAt)
}

function getLiveState(startedAt: Date, dueAt: Date): SlaState {
  const totalMs = dueAt.getTime() - startedAt.getTime()
  const remainingMs = dueAt.getTime() - Date.now()
  if (remainingMs <= 0) return "breached"
  if (totalMs > 0 && remainingMs <= totalMs * (1 - WARNING_THRESHOLD_RATIO)) {
    return "warning"
  }
  return "ok"
}

function toRemainingMinutes(dueAt: Date): number {
  return Math.max(0, Math.ceil((dueAt.getTime() - Date.now()) / MINUTE))
}

export function getSlaPolicy(priority: Priority, policy?: SlaPolicy | null): SlaPolicy {
  if (policy && policy.responseTime > 0 && policy.resolutionTime > 0) {
    return policy
  }
  return DEFAULT_SLA_BY_PRIORITY[priority] ?? DEFAULT_SLA_BY_PRIORITY.MEDIUM
}

export function computeSlaSnapshot(input: {
  createdAt: Date
  firstResponseAt?: Date | null
  resolvedAt?: Date | null
  status: TicketStatus
  priority: Priority
  policy?: SlaPolicy | null
}): SlaSnapshot {
  const policy = getSlaPolicy(input.priority, input.policy)
  const responseDueAt = new Date(input.createdAt.getTime() + policy.responseTime * MINUTE)
  const resolutionDueAt = new Date(input.createdAt.getTime() + policy.resolutionTime * MINUTE)

  const responseStarted = input.createdAt
  const responseState =
    input.status === TicketStatus.NEW || input.status === TicketStatus.ASSIGNED || input.status === TicketStatus.IN_PROGRESS
      ? getTerminalState(responseStarted, input.firstResponseAt ?? null, responseDueAt)
      : getTerminalState(responseStarted, input.firstResponseAt ?? input.resolvedAt ?? null, responseDueAt)

  const resolutionState = getTerminalState(input.createdAt, input.resolvedAt ?? null, resolutionDueAt)

  return {
    responseDueAt: responseDueAt.toISOString(),
    resolutionDueAt: resolutionDueAt.toISOString(),
    responseState,
    resolutionState,
    responseMinutesRemaining: input.firstResponseAt ? 0 : toRemainingMinutes(responseDueAt),
    resolutionMinutesRemaining: input.resolvedAt ? 0 : toRemainingMinutes(resolutionDueAt),
  }
}

