"use client";

import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "sonner";

interface LayoutContentProps {
  children: React.ReactNode;
}

export function LayoutContent({ children }: LayoutContentProps) {
  const pathname = usePathname();
  
  useLayoutEffect(() => {
    const authPages = ["/login", "/forgot-password"];
    const isAuthPage = authPages.includes(pathname || "");
    document.body.setAttribute("data-auth", isAuthPage ? "true" : "false");
  }, [pathname]);
  
  return (
    <SidebarProvider defaultOpen={true}>
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-200 ease-linear peer-data-[state=expanded]:md:pl-[var(--sidebar-width)] peer-data-[state=collapsed]:md:pl-[var(--sidebar-width-icon)]">
        <TopBar />
        <main className="flex-1 p-6 overflow-auto">{children}</main>
        <Toaster richColors position="top-right" />
      </div>
    </SidebarProvider>
  );
}