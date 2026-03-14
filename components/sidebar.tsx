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

export function Sidebar() {
  const pathname = usePathname()

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
      className="border-r bg-gradient-to-b from-sidebar to-sidebar-accent/80 sidebar-container"
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
              {navItems.map((item) => {
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

        <Separator className="my-2 bg-sidebar-border" />

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/60">
            Quick Actions
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip="New Ticket"
                  className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                >
                  <Link href="/tickets/new">
                    <Ticket className="h-4 w-4 shrink-0" />
                    <span>New Ticket</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip="New Article"
                  className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                >
                  <Link href="/knowledge/new">
                    <BookOpen className="h-4 w-4 shrink-0" />
                    <span>New Article</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip="New Report"
                  className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                >
                  <Link href="/reports/new">
                    <FileText className="h-4 w-4 shrink-0" />
                    <span>New Report</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip="New Asset"
                  className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                >
                  <Link href="/assets/new">
                    <Cpu className="h-4 w-4 shrink-0" />
                    <span>New Asset</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        {/* 
          Minimal footer — just version info, hidden in collapsed mode.
          Functional buttons (Bell, Help, Settings) live in TopBar only.
        */}
        <p className="text-xs text-sidebar-foreground/40 group-data-[collapsible=icon]:hidden">
          v1.0.0
        </p>
      </SidebarFooter>
    </ShadcnSidebar>
  )
}
