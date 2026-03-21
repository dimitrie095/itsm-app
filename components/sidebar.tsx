"use client"

import {
  BarChart3,
  BookOpen,
  Cpu,
  FileText,
  Home,
  Settings,
  Ticket,
  Users,
  Wrench,
  Shield,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { Role } from "@/lib/generated/prisma/enums"

import { Separator } from "@/components/ui/separator"
import {
  Sidebar as ShadcnSidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const navItems = [
  { label: "Dashboard", href: "/", icon: Home },
  { label: "Tickets", href: "/tickets", icon: Ticket },
  { label: "Assets", href: "/assets", icon: Cpu },
  { label: "Knowledge Base", href: "/knowledge", icon: BookOpen },
  { label: "Users", href: "/users", icon: Users },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Reports", href: "/reports", icon: FileText },
  { label: "Automation", href: "/automation", icon: Wrench },
  { label: "Roles & Permissions", href: "/roles", icon: Shield },
  { label: "Settings", href: "/settings", icon: Settings },
]

// Route to permission mapping (database permission names)
// Sorted by path length descending to ensure most specific matches are found first
const routePermissions: { path: string; permissions: string[] }[] = [
  { path: "/tickets/new", permissions: ["tickets.create"] },
  { path: "/assets/new", permissions: ["assets.create"] },
  { path: "/knowledge/new", permissions: ["knowledge.create"] },
  { path: "/reports/new", permissions: ["reports.create"] },
  { path: "/tickets", permissions: ["tickets.view"] },
  { path: "/assets", permissions: ["assets.view"] },
  { path: "/knowledge", permissions: ["knowledge.view"] },
  { path: "/users", permissions: ["users.view"] },
  { path: "/analytics", permissions: ["analytics.view"] },
  { path: "/reports", permissions: ["reports.view"] },
  { path: "/automation", permissions: ["automation.view"] },
  { path: "/settings", permissions: ["settings.view"] },
  { path: "/roles", permissions: ["roles.view"] },
  { path: "/", permissions: ["dashboard.view"] },
]

// Quick action permissions
const quickActionPermissions: Record<string, string[]> = {
  "/tickets/new": ["tickets.create"],
  "/knowledge/new": ["knowledge.create"],
  "/reports/new": ["reports.create"],
  "/assets/new": ["assets.create"],
}

function canAccessRoute(href: string, userPermissions: string[] | undefined, userRole: Role | undefined): boolean {
  // First try permission-based check
  if (userPermissions) {
    const route = routePermissions.find(r => href.startsWith(r.path))
    if (route) {
      return route.permissions.some(permission => userPermissions.includes(permission))
    }
    // No route mapping -> deny by default (security first)
    return false
  }
  
  // Fallback to explicit role-based filtering
  if (userRole) {
    // END_USER: Only Dashboard, Tickets, Knowledge Base, Settings
    if (userRole === "END_USER") {
      const allowedPaths = ["/", "/tickets", "/knowledge", "/settings"]
      return allowedPaths.some(path => href.startsWith(path))
    }
    // AGENT: Most items except Roles
    if (userRole === "AGENT") {
      const disallowedPaths = ["/roles"]
      return !disallowedPaths.some(path => href.startsWith(path))
    }
    // ADMIN: All access
    if (userRole === "ADMIN") {
      return true
    }
    // CUSTOM: Use permission-based (already handled above)
  }
  
  return false
}

function canAccessQuickAction(href: string, userPermissions: string[] | undefined, userRole: Role | undefined): boolean {
  if (userPermissions) {
    const perms = quickActionPermissions[href]
    if (perms) {
      return perms.some(permission => userPermissions.includes(permission))
    }
    return false
  }
  
  // Fallback to role-based
  if (userRole) {
    // END_USER: Only New Ticket
    if (userRole === "END_USER") {
      return href === "/tickets/new"
    }
    // AGENT: All quick actions except New Report (AGENT doesn't have reports.create)
    if (userRole === "AGENT") {
      return href !== "/reports/new"
    }
    // ADMIN: All quick actions
    if (userRole === "ADMIN") {
      return true
    }
  }
  
  return false
}

export function Sidebar() {
  const pathname = usePathname()
  const { data: session, status } = useSession()
  const isLoading = status === "loading"

  const userPermissions = session?.user?.permissions
  const userRole = session?.user?.role

  // Filter navigation items based on permissions
  const filteredNavItems = navItems.filter(item => 
    canAccessRoute(item.href, userPermissions, userRole)
  )

  // Filter quick actions
  const quickActions = [
    { label: "New Ticket", href: "/tickets/new", icon: Ticket },
    { label: "New Article", href: "/knowledge/new", icon: BookOpen },
    { label: "New Report", href: "/reports/new", icon: FileText },
    { label: "New Asset", href: "/assets/new", icon: Cpu },
  ].filter(action => canAccessQuickAction(action.href, userPermissions, userRole))

  return (
    /*
      FIX 1: Removed manual toggleSidebar button from inside the sidebar.
      The SidebarTrigger in TopBar is the single source of truth for toggling.
      Having two toggle buttons caused de-sync issues.

      FIX 2: collapsible="icon" means the sidebar collapses to icon-only width,
      not fully hidden. This is the correct shadcn/ui behavior — the sidebar
      shrinks and only shows icons, labels are hidden via the SidebarMenuButton
      built-in behavior (it reads the sidebar state via context).

      FIX 3: Removed Bell/Help/Settings from SidebarFooter — these are already
      in the TopBar, duplicating them here clutters the collapsed state.
    */
    <ShadcnSidebar
      collapsible="icon"
      className="border-r bg-gradient-to-b from-sidebar to-sidebar-accent/80 sidebar-container shadow-sidebar"
      data-sidebar="true"
    >
      <SidebarHeader className="p-4">
        <div className="flex items-center mb-2">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              <Ticket className="h-5 w-5" />
            </div>
            <span className="text-lg font-semibold text-sidebar-foreground whitespace-nowrap group-data-[collapsible=icon]:hidden">
              ITSM Portal
            </span>
          </div>
        </div>
        <p className="text-xs text-sidebar-foreground/60 group-data-[collapsible=icon]:hidden">
          Service Management
        </p>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/60">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredNavItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <SidebarMenuItem key={item.href}>
                    {/*
                      SidebarMenuButton handles icon+label visibility automatically:
                      - expanded: shows icon + label
                      - collapsed (icon mode): shows only icon, with tooltip on hover
                    */}
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.label}
                      className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-primary/20 data-[active=true]:text-sidebar-primary"
                    >
                      <Link href={item.href}>
                        <Icon className="h-4 w-4 shrink-0" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {quickActions.length > 0 && (
          <>
            <Separator className="my-2 bg-sidebar-border" />

            <SidebarGroup>
              <SidebarGroupLabel className="text-sidebar-foreground/60">
                Quick Actions
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {quickActions.map((action) => {
                    const Icon = action.icon
                    return (
                      <SidebarMenuItem key={action.href}>
                        <SidebarMenuButton
                          asChild
                          tooltip={action.label}
                          className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        >
                          <Link href={action.href}>
                            <Icon className="h-4 w-4 shrink-0" />
                            <span>{action.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <Link href="/settings">
                <Settings className="h-4 w-4 shrink-0" />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </ShadcnSidebar>
  )
}