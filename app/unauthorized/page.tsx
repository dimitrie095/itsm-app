"use client";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Home, Shield, LogIn } from "lucide-react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export default function UnauthorizedPage() {
  const { data: session } = useSession();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Shield className="h-10 w-10 text-primary" />
            <h1 className="text-3xl font-bold">ITSM Portal</h1>
          </div>
          <p className="text-muted-foreground">Access Control System</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Access Denied
            </CardTitle>
            <CardDescription>
              You don&apos;t have permission to access this page
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-lg bg-red-50 p-4 border border-red-200">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-red-800">Unauthorized Access Attempt</h4>
                  <p className="text-sm text-red-700 mt-1">
                    Your account does not have the required permissions to access this resource.
                  </p>
                </div>
              </div>
            </div>

            {session?.user && (
              <div className="space-y-3">
                <h3 className="font-semibold">Your Account Information</h3>
                <div className="bg-muted p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium">{session.user.name || "User"}</p>
                      <p className="text-sm text-muted-foreground">{session.user.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium capitalize">{session.user.role.toLowerCase().replace("_", " ")}</p>
                      <p className="text-sm text-muted-foreground">
                        {session.user.department || "No department"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <h3 className="font-semibold">Permission Levels</h3>
              <div className="grid gap-2">
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium">End User</p>
                    <p className="text-sm text-muted-foreground">Can create tickets and view knowledge base</p>
                  </div>
                  <div className="px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-medium">
                    Basic Access
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium">Support Agent</p>
                    <p className="text-sm text-muted-foreground">Can manage tickets, assets, and generate reports</p>
                  </div>
                  <div className="px-3 py-1 rounded-full bg-green-100 text-green-800 text-xs font-medium">
                    Standard Access
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium">Administrator</p>
                    <p className="text-sm text-muted-foreground">Full system access and configuration</p>
                  </div>
                  <div className="px-3 py-1 rounded-full bg-purple-100 text-purple-800 text-xs font-medium">
                    Full Access
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-3">
            <div className="grid grid-cols-2 gap-3 w-full">
              <Button asChild variant="outline">
                <Link href="/">
                  <Home className="mr-2 h-4 w-4" />
                  Dashboard
                </Link>
              </Button>
              {session ? (
                <Button onClick={() => signOut({ callbackUrl: "/login" })}>
                  <LogIn className="mr-2 h-4 w-4" />
                  Switch Account
                </Button>
              ) : (
                <Button asChild>
                  <Link href="/login">
                    <LogIn className="mr-2 h-4 w-4" />
                    Sign In
                  </Link>
                </Button>
              )}
            </div>
            <p className="text-center text-sm text-muted-foreground">
              Need elevated permissions? Contact your system administrator.
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}