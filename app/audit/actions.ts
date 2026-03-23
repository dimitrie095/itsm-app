"use server"

import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { Role } from "@/lib/generated/prisma/enums"

export type AuditLog = {
  id: string
  action: string
  entityType: string
  entityId: string | null
  userId: string | null
  details: string | null
  ipAddress: string | null
  userAgent: string | null
  createdAt: Date
  user?: {
    id: string
    email: string
    name: string | null
  } | null
}

export async function getAuditLogs(
  page: number = 1,
  pageSize: number = 50,
  filters?: {
    action?: string
    entityType?: string
    userId?: string
    startDate?: Date
    endDate?: Date
  }
): Promise<AuditLog[]> {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    throw new Error("Unauthorized")
  }

  // Only ADMIN and users with audit.view permission can view logs
  const hasPermission = session.user.role === Role.ADMIN || 
    session.user.permissions.includes("audit.view")
  if (!hasPermission) {
    throw new Error("Forbidden")
  }

  const skip = (page - 1) * pageSize

  const logs = await prisma.auditLog.findMany({
    skip,
    take: pageSize,
    where: {
      ...(filters?.action && { action: { contains: filters.action, mode: "insensitive" } }),
      ...(filters?.entityType && { entityType: { contains: filters.entityType, mode: "insensitive" } }),
      ...(filters?.userId && { userId: filters.userId }),
      ...(filters?.startDate && { createdAt: { gte: filters.startDate } }),
      ...(filters?.endDate && { createdAt: { lte: filters.endDate } }),
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  })

  return logs
}

export async function getAuditLogStats() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    throw new Error("Unauthorized")
  }

  const hasPermission = session.user.role === Role.ADMIN || 
    session.user.permissions.includes("audit.view")
  if (!hasPermission) {
    throw new Error("Forbidden")
  }

  const totalLogs = await prisma.auditLog.count()
  const distinctActions = await prisma.auditLog.groupBy({
    by: ["action"],
    _count: true,
  })
  const todayLogs = await prisma.auditLog.count({
    where: {
      createdAt: {
        gte: new Date(new Date().setHours(0, 0, 0, 0)),
      },
    },
  })

  return {
    totalLogs,
    distinctActions: distinctActions.length,
    todayLogs,
  }
}