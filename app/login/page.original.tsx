"use client";

import { useState, useEffect } from "react";
import { signIn, getProviders } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LogIn, Loader2, Shield, User } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [providers, setProviders] = useState<Record<string, any> | null>(null);
  useEffect(() => {
    const fetchProviders = async () => {
      const providers = await getProviders();
      setProviders(providers);
    };
    fetchProviders();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password. Try 'demo123' as password for any user.");
      } else {
        router.push("/");
        router.refresh();
      }
    } catch (_error) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Demo users for quick login
  // IMPORTANT: In production, remove hardcoded passwords and use environment variables
  // or a secure authentication service
  const demoUsers = [
    { email: "admin@example.com", name: "Admin User", role: "ADMIN", password: process.env.DEMO_ADMIN_PASSWORD || "demo123" },
    { email: "agent@example.com", name: "Support Agent", role: "AGENT", password: process.env.DEMO_AGENT_PASSWORD || "demo123" },
    { email: "user@example.com", name: "End User", role: "END_USER", password: process.env.DEMO_USER_PASSWORD || "demo123" },
  ];

  const handleDemoLogin = (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    // Auto-submit after a short delay
    setTimeout(() => {
      signIn("credentials", {
        email: demoEmail,
        password: demoPassword,
        redirect: false,
      }).then((result) => {
        if (result?.error) {
          setError("Demo login failed: " + result.error);
        } else {
          router.push("/");
          router.refresh();
        }
      });
    }, 100);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Shield className="h-10 w-10 text-primary" />
            <h1 className="text-3xl font-bold">ITSM Portal</h1>
          </div>
          <p className="text-muted-foreground">Sign in to access your IT service management dashboard</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LogIn className="h-5 w-5" />
              Sign In
            </CardTitle>
            <CardDescription>
              Enter your credentials to access the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link 
                    href="/forgot-password" 
                    className="text-sm text-primary hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">
                  Use <code className="text-primary">demo123</code> as password for demo accounts
                </p>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <LogIn className="mr-2 h-4 w-4" />
                    Sign In
                  </>
                )}
              </Button>
            </form>

            {providers && Object.values(providers).some((p: any) => p.id !== "credentials") && (
              <>
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Social Login</span>
                  </div>
                </div>

                <div className="space-y-2 mb-6">
                  {Object.values(providers).map((provider: any) => {
                    if (provider.id === "credentials") return null;
                    return (
                      <Button
                        key={provider.id}
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={() => signIn(provider.id)}
                        disabled={isLoading}
                      >
                        Sign in with {provider.name}
                      </Button>
                    );
                  })}
                </div>
              </>
            )}

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Quick Demo Login</span>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-center text-muted-foreground mb-3">
                Try these demo accounts (click to login):
              </p>
              {demoUsers.map((user) => (
                <Button
                  key={user.email}
                  type="button"
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleDemoLogin(user.email, user.password)}
                  disabled={isLoading}
                >
                  <User className="mr-2 h-4 w-4" />
                  <div className="text-left">
                    <div className="font-medium">{user.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {user.email} • Role: {user.role}
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <div className="text-center text-xs text-muted-foreground">
              By signing in, you agree to our{" "}
              <Link href="/terms" className="text-primary hover:underline">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="text-primary hover:underline">
                Privacy Policy
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}