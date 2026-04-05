import { prisma } from "./prisma"
import { Notification } from "./generated/prisma/client"

export type NotificationType = 
  | 'ticket_created'
  | 'ticket_status_changed'
  | 'ticket_assigned'
  | 'report_generated'
  | 'system_alert'

export interface CreateNotificationInput {
  userId: string
  type: NotificationType
  title: string
  message: string
  metadata?: Record<string, any>
}

/**
 * Create a new notification for a user
 */
export async function createNotification(input: CreateNotificationInput): Promise<Notification> {
  return prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      metadata: input.metadata || {},
      read: false,
    },
  })
}

/**
 * Get unread notifications for a user
 */
export async function getUnreadNotifications(userId: string, limit?: number): Promise<Notification[]> {
  return prisma.notification.findMany({
    where: {
      userId,
      read: false,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: limit || 50,
  })
}

/**
 * Get all notifications for a user (read and unread)
 */
export async function getUserNotifications(userId: string, limit?: number): Promise<Notification[]> {
  return prisma.notification.findMany({
    where: {
      userId,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: limit || 50,
  })
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(notificationId: string): Promise<Notification> {
  return prisma.notification.update({
    where: { id: notificationId },
    data: { 
      read: true,
      readAt: new Date(),
    },
  })
}

/**
 * Mark all notifications for a user as read
 */
export async function markAllNotificationsAsRead(userId: string): Promise<{ count: number }> {
  const result = await prisma.notification.updateMany({
    where: { 
      userId,
      read: false,
    },
    data: { 
      read: true,
      readAt: new Date(),
    },
  })
  return { count: result.count }
}

/**
 * Create notifications for admins and support agents when a ticket is created
 */
export async function notifyTicketCreated(ticketId: string, ticketTitle: string, createdByUserId: string) {
  // Find all users with ADMIN or AGENT role
  const adminsAndAgents = await prisma.user.findMany({
    where: {
      role: {
        in: ['ADMIN', 'AGENT'],
      },
      // Exclude the user who created the ticket if they are also admin/agent
      id: { not: createdByUserId },
    },
    select: { id: true, name: true, email: true },
  })

  const notifications = adminsAndAgents.map(user => ({
    userId: user.id,
    type: 'ticket_created' as NotificationType,
    title: 'New Ticket Created',
    message: `Ticket "${ticketTitle}" has been created and requires attention.`,
    metadata: { ticketId, createdByUserId },
  }))

  // Create notifications in bulk
  for (const notif of notifications) {
    await createNotification(notif)
  }

  // Return count for logging
  return { notifiedCount: notifications.length }
}

/**
 * Notify the end user when their ticket status changes
 */
export async function notifyTicketStatusChanged(
  ticketId: string, 
  ticketTitle: string, 
  userId: string, 
  oldStatus: string, 
  newStatus: string
) {
  return createNotification({
    userId,
    type: 'ticket_status_changed',
    title: 'Ticket Status Updated',
    message: `Your ticket "${ticketTitle}" status has changed from ${oldStatus} to ${newStatus}.`,
    metadata: { ticketId, oldStatus, newStatus },
  })
}

/**
 * Notify assigned agent when a ticket is assigned to them
 */
export async function notifyTicketAssigned(
  ticketId: string,
  ticketTitle: string,
  assignedToUserId: string,
  assignedByUserId?: string
) {
  return createNotification({
    userId: assignedToUserId,
    type: 'ticket_assigned',
    title: 'Ticket Assigned to You',
    message: `Ticket "${ticketTitle}" has been assigned to you.`,
    metadata: { ticketId, assignedByUserId },
  })
}