import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { checkApiAuth } from "@/lib/api-auth"

export async function GET(request: NextRequest) {
  try {
    const authResult = await checkApiAuth(request, undefined, [])
    if (!authResult.isAuthorized) {
      return authResult.errorResponse!
    }
    const userId = authResult.user?.id
    if (!userId) {
      return NextResponse.json({ error: "User not found" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "50")
    const unreadOnly = searchParams.get("unreadOnly") === "true"

    const whereClause: any = { userId }
    if (unreadOnly) {
      whereClause.read = false
    }

    const notifications = await prisma.notification.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: Math.min(limit, 100),
    })

    return NextResponse.json({ notifications })
  } catch (error) {
    console.error("Error fetching notifications:", error)
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authResult = await checkApiAuth(request, undefined, [])
    if (!authResult.isAuthorized) {
      return authResult.errorResponse!
    }
    const userId = authResult.user?.id
    if (!userId) {
      return NextResponse.json({ error: "User not found" }, { status: 401 })
    }

    const body = await request.json()
    const { notificationId, markAllAsRead } = body

    if (markAllAsRead) {
      const result = await prisma.notification.updateMany({
        where: { userId, read: false },
        data: { read: true, readAt: new Date() },
      })
      return NextResponse.json({ updatedCount: result.count })
    }

    if (notificationId) {
      // Verify the notification belongs to the user
      const notification = await prisma.notification.findFirst({
        where: { id: notificationId, userId },
      })
      if (!notification) {
        return NextResponse.json({ error: "Notification not found" }, { status: 404 })
      }
      const updated = await prisma.notification.update({
        where: { id: notificationId },
        data: { read: true, readAt: new Date() },
      })
      return NextResponse.json(updated)
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  } catch (error) {
    console.error("Error updating notifications:", error)
    return NextResponse.json(
      { error: "Failed to update notifications" },
      { status: 500 }
    )
  }
}