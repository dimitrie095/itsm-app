import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/auth/middleware"
import { apiError, apiSuccess } from "@/lib/api-response"

export async function GET(request: NextRequest) {
  try {
    const authResult = await withAuth()(request)
    if (authResult instanceof NextResponse) {
      return authResult
    }
    const userId = authResult.user?.id
    if (!userId) {
      return apiError("User not found", 401)
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "50")
    const unreadOnly = searchParams.get("unreadOnly") === "true"
    const summary = searchParams.get("summary") === "true"

    const whereClause: { userId: string; read?: boolean } = { userId }
    if (unreadOnly) {
      whereClause.read = false
    }

    const notifications = await (prisma as any).notification.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: Math.min(limit, 100),
      select: summary
        ? {
            id: true,
            title: true,
            message: true,
            type: true,
            read: true,
            createdAt: true,
            metadata: true,
          }
        : undefined,
    })

    const unreadCount = await (prisma as any).notification.count({
      where: { userId, read: false },
    })

    return apiSuccess({ notifications, unreadCount })
  } catch (error) {
    console.error("Error fetching notifications:", error)
    return apiError("Failed to fetch notifications", 500)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authResult = await withAuth()(request)
    if (authResult instanceof NextResponse) {
      return authResult
    }
    const userId = authResult.user?.id
    if (!userId) {
      return apiError("User not found", 401)
    }

    const body = await request.json()
    const { notificationId, markAllAsRead } = body

    if (markAllAsRead) {
      const result = await (prisma as any).notification.updateMany({
        where: { userId, read: false },
        data: { read: true, readAt: new Date() },
      })
      return apiSuccess({ updatedCount: result.count })
    }

    if (notificationId) {
      // Verify the notification belongs to the user
      const notification = await (prisma as any).notification.findFirst({
        where: { id: notificationId, userId },
      })
      if (!notification) {
        return apiError("Notification not found", 404)
      }
      const updated = await (prisma as any).notification.update({
        where: { id: notificationId },
        data: { read: true, readAt: new Date() },
      })
      return apiSuccess(updated)
    }

    return apiError("Invalid request", 400)
  } catch (error) {
    console.error("Error updating notifications:", error)
    return apiError("Failed to update notifications", 500)
  }
}