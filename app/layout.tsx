import { Sidebar } from "@/components/sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { TopBar } from "@/components/topbar";
import { SidebarProvider } from "@/components/ui/sidebar";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ITSM Portal - Modern IT Service Management",
  description: "A modern ITSM system with ticket management, assets, knowledge base, and automation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SidebarProvider defaultOpen={true}>
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0 transition-all duration-200 ease-linear peer-data-[state=expanded]:md:pl-[var(--sidebar-width)] peer-data-[state=collapsed]:md:pl-[var(--sidebar-width-icon)]">
              <TopBar />
              <main className="flex-1 p-6 overflow-auto">{children}</main>
            </div>
          </SidebarProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}