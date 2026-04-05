/**
 * Events related to notifications for cross-component communication.
 */

export const NOTIFICATION_EVENTS = {
  /**
   * Dispatched when a new notification is received (particularly ticket_status_changed).
   * Detail: { type: NotificationType, notification?: any }
   */
  NOTIFICATION_RECEIVED: 'notification-received',
  /**
   * Dispatched when a notification is marked as read.
   */
  NOTIFICATION_READ: 'notification-read',
} as const

export type NotificationEventDetail = {
  type: string
  notification?: any
}

/**
 * Dispatch a custom event for notification received.
 */
export function dispatchNotificationReceived(type: string, notification?: any) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(NOTIFICATION_EVENTS.NOTIFICATION_RECEIVED, {
        detail: { type, notification },
      })
    )
  }
}

/**
 * Dispatch a custom event for notification read.
 */
export function dispatchNotificationRead(notificationId: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(NOTIFICATION_EVENTS.NOTIFICATION_READ, {
        detail: { notificationId },
      })
    )
  }
}