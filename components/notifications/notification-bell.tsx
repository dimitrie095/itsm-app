"use client"

import { useState, useEffect, useRef } from "react"
import { Bell, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { useSession } from "next-auth/react"
import { toast } from "sonner"
import { dispatchNotificationReceived } from "@/lib/notification-events"

interface Notification {
  id: string
  title: string
  message: string
  type: string
  read: boolean
  createdAt: string
  metadata?: any
}

export function NotificationBell() {
  const { data: session } = useSession()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const previousNotificationIds = useRef<Set<string>>(new Set())
  const lastFetchRef = useRef(0)
  const POLL_INTERVAL_MS = 60000
  const MIN_FETCH_GAP_MS = 10000

  const fetchNotifications = async () => {
    if (!session?.user?.id) return
    const now = Date.now()
    if (now - lastFetchRef.current < MIN_FETCH_GAP_MS) return
    lastFetchRef.current = now
    try {
      setLoading(true)
      const response = await fetch(`/api/notifications?unreadOnly=false&limit=20&summary=true`)
      if (!response.ok) throw new Error("Failed to fetch notifications")
      const data = await response.json()
      const newNotifications: Notification[] = data.notifications || []
      const nextUnreadCount =
        typeof data.unreadCount === "number"
          ? data.unreadCount
          : newNotifications.filter((n: Notification) => !n.read).length
      
      // Identify new notifications since last fetch
      const newIds = new Set(newNotifications.map(n => n.id))
      const previousIds = previousNotificationIds.current
      
      // Only trigger events if we have previous state (not initial fetch)
      if (previousIds.size > 0) {
        const addedIds = [...newIds].filter(id => !previousIds.has(id))
        // Dispatch events for new ticket status change notifications
        for (const id of addedIds) {
          const notification = newNotifications.find(n => n.id === id)
          if (notification && notification.type === 'ticket_status_changed') {
            dispatchNotificationReceived(notification.type, notification)
          }
        }
      }
      
      // Update previous IDs
      previousNotificationIds.current = newIds
      
      setNotifications(newNotifications)
      setUnreadCount(nextUnreadCount)
    } catch (error) {
      console.error("Error fetching notifications:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (session?.user?.id) {
      fetchNotifications()
      // Poll every 60 seconds for new notifications
      const interval = setInterval(fetchNotifications, POLL_INTERVAL_MS)
      const onVisibilityChange = () => {
        if (document.visibilityState === "visible") {
          fetchNotifications()
        }
      }
      document.addEventListener("visibilitychange", onVisibilityChange)
      return () => {
        clearInterval(interval)
        document.removeEventListener("visibilitychange", onVisibilityChange)
      }
    }
  }, [session?.user?.id, POLL_INTERVAL_MS])

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId }),
      })
      if (!response.ok) throw new Error("Failed to mark as read")
      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, read: true } : n))
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error("Error marking notification as read:", error)
      toast.error("Failed to mark notification as read")
    }
  }

  const markAllAsRead = async () => {
    try {
      const response = await fetch(`/api/notifications`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllAsRead: true }),
      })
      if (!response.ok) throw new Error("Failed to mark all as read")
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnreadCount(0)
      toast.success("All notifications marked as read")
    } catch (error) {
      console.error("Error marking all as read:", error)
      toast.error("Failed to mark all notifications as read")
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / (3600000 * 24))

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <DropdownMenuLabel className="flex items-center justify-between px-4 py-3">
          <span className="font-semibold">Notifications</span>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-auto px-2 py-1 text-xs"
                onClick={markAllAsRead}
              >
                <Check className="mr-1 h-3 w-3" />
                Mark all read
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setOpen(false)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </DropdownMenuLabel>
        <Separator />
        <ScrollArea className="h-[300px]">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Bell className="h-8 w-8 mb-2" />
              <p>No notifications yet</p>
            </div>
          ) : (
            notifications.map(notification => (
              <DropdownMenuItem
                key={notification.id}
                className={cn(
                  "flex flex-col items-start p-4 cursor-default rounded-none border-b last:border-b-0",
                  !notification.read && "bg-muted/50"
                )}
                onSelect={(e) => e.preventDefault()}
              >
                <div className="flex w-full justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{notification.title}</p>
                    <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-muted-foreground">
                        {formatTime(notification.createdAt)}
                      </span>
                      {!notification.read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 px-2 text-xs"
                          onClick={() => markAsRead(notification.id)}
                        >
                          Mark read
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </DropdownMenuItem>
            ))
          )}
        </ScrollArea>
        <Separator />
        <DropdownMenuItem className="justify-center py-2" asChild>
          <a href="/notifications" className="text-sm font-medium">
            View all notifications
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}