"use client";

import { useState, useEffect } from "react";
import { signIn, getProviders } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  LogIn, 
  Loader2, 
  Shield, 
  Crown, 
  Headphones, 
  Monitor,
  ChevronRight,
  Sparkles,
  Key,
  Lock,
  Mail,
  CheckCircle,
  Users,
  Settings
} from "lucide-react";
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
  const demoUsers = [
    { 
      email: "admin@example.com", 
      name: "Admin User", 
      role: "ADMIN", 
      password: process.env.DEMO_ADMIN_PASSWORD || "demo123",
      icon: Crown,
      color: "bg-gradient-to-br from-purple-500 to-pink-500",
      description: "Full system access and management"
    },
    { 
      email: "agent@example.com", 
      name: "Support Agent", 
      role: "AGENT", 
      password: process.env.DEMO_AGENT_PASSWORD || "demo123",
      icon: Headphones,
      color: "bg-gradient-to-br from-blue-500 to-cyan-500",
      description: "Ticket management and customer support"
    },
    { 
      email: "user@example.com", 
      name: "End User", 
      role: "END_USER", 
      password: process.env.DEMO_USER_PASSWORD || "demo123",
      icon: Monitor,
      color: "bg-gradient-to-br from-emerald-500 to-green-500",
      description: "Submit and track tickets"
    },
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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Subtle grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:24px_24px]" />
      
      <div className="relative min-h-screen flex flex-col lg:flex-row">
        {/* Left panel - Branding and info */}
        <div className="lg:w-1/2 p-6 lg:p-12 flex flex-col justify-between bg-gradient-to-br from-slate-900/90 to-slate-950/90 backdrop-blur-sm border-r border-slate-800">
          <div className="flex flex-col space-y-8">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-white">ITSM Portal</h1>
                <p className="text-sm text-slate-400">Modern IT Service Management Platform</p>
              </div>
            </div>

            <div className="space-y-8">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 mt-1 flex-shrink-0">
                  <Sparkles className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">Streamlined Service Management</h3>
                  <p className="text-slate-400 text-sm">Manage tickets, assets, and knowledge base in one unified platform with real-time collaboration.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 mt-1 flex-shrink-0">
                  <Users className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">Role-Based Access Control</h3>
                  <p className="text-slate-400 text-sm">Granular permissions for administrators, support agents, and end users with custom role definitions.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 mt-1 flex-shrink-0">
                  <Settings className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">Automation & Analytics</h3>
                  <p className="text-slate-400 text-sm">Automate routine tasks and gain insights with comprehensive reporting and analytics dashboards.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="hidden lg:block mt-12">
            <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Key className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-slate-300">
                    <span className="font-medium text-white">Demo Access:</span> All demo accounts use password{' '}
                    <code className="px-2 py-0.5 rounded bg-slate-800 text-primary font-mono text-sm">demo123</code>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right panel - Login form */}
        <div className="lg:w-1/2 p-4 sm:p-6 lg:p-12 flex flex-col justify-center">
          <div className="w-full max-w-md mx-auto">
            {/* Mobile header */}
            <div className="text-center mb-8 lg:hidden">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
                  <Shield className="h-8 w-8 text-primary" />
                </div>
                <div className="text-left">
                  <h1 className="text-2xl font-bold text-white">ITSM Portal</h1>
                  <p className="text-sm text-slate-400">Modern IT Service Management</p>
                </div>
              </div>
            </div>

            <Card className="border-slate-800 bg-slate-900/70 backdrop-blur-sm shadow-2xl overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary/50 to-transparent" />
              
              <CardHeader className="pb-4 pt-6">
                <CardTitle className="flex items-center gap-2 text-xl text-white">
                  <LogIn className="h-5 w-5 text-primary" />
                  Sign In to Dashboard
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Enter your credentials or try a demo account below
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-3">
                    <Label htmlFor="email" className="text-slate-300">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="john@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={isLoading}
                        className="pl-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-primary focus:ring-primary"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="text-slate-300">Password</Label>
                      <Link 
                        href="/forgot-password" 
                        className="text-sm text-primary hover:text-primary/80 hover:underline transition-colors"
                      >
                        Forgot password?
                      </Link>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={isLoading}
                        className="pl-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-primary focus:ring-primary"
                      />
                    </div>
                    <p className="text-xs text-slate-500">
                      Demo accounts use password: <code className="px-1.5 py-0.5 rounded bg-slate-800 text-primary font-mono">demo123</code>
                    </p>
                  </div>

                  {error && (
                    <Alert variant="destructive" className="bg-red-950/50 border-red-800">
                      <AlertDescription className="text-red-200">{error}</AlertDescription>
                    </Alert>
                  )}

                  <Button 
                    type="submit" 
                    className="w-full h-11 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white font-medium transition-all duration-200 shadow-lg hover:shadow-primary/20"
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

                {/* Social login providers */}
                {providers && Object.values(providers).some((p: any) => p.id !== "credentials") && (
                  <>
                    <div className="relative my-6">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-800" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-slate-900 px-3 py-1 rounded-full text-slate-500 border border-slate-800">Or continue with</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                      {Object.values(providers).map((provider: any) => {
                        if (provider.id === "credentials") return null;
                        return (
                          <Button
                            key={provider.id}
                            type="button"
                            variant="outline"
                            className="bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white hover:border-slate-600"
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

                {/* Quick demo login */}
                <div className="space-y-4">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-800" />
                    </div>
                    <div className="relative flex justify-center">
                      <span className="bg-slate-900 px-4 py-1 rounded-full border border-slate-800 text-sm text-slate-400">
                        Quick Demo Access
                      </span>
                    </div>
                  </div>

                  <p className="text-sm text-center text-slate-400 mb-2">
                    Try these demo accounts with different roles:
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {demoUsers.map((user) => {
                      const Icon = user.icon;
                      return (
                        <button
                          key={user.email}
                          type="button"
                          onClick={() => handleDemoLogin(user.email, user.password)}
                          disabled={isLoading}
                          className="group p-4 rounded-xl bg-slate-800/30 border border-slate-700 hover:border-slate-600 hover:bg-slate-800/50 transition-all duration-200 text-left focus:outline-none focus:ring-2 focus:ring-primary/50"
                        >
                          <div className="flex items-start gap-3">
                            <div className={`p-2.5 rounded-lg ${user.color} shadow-lg`}>
                              <Icon className="h-5 w-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <h4 className="font-medium text-white group-hover:text-primary transition-colors truncate">
                                  {user.name}
                                </h4>
                                <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-primary transition-colors flex-shrink-0 ml-1" />
                              </div>
                              <p className="text-xs text-slate-400 mt-1">{user.description}</p>
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                <span className="px-2 py-0.5 text-xs rounded-full bg-slate-900/50 text-slate-300 border border-slate-700 whitespace-nowrap">
                                  {user.role.replace('_', ' ')}
                                </span>
                                <span className="text-xs text-slate-500 truncate">{user.email}</span>
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
              
              <CardFooter className="flex flex-col space-y-4 pt-6 border-t border-slate-800">
                <div className="text-center text-sm text-slate-500">
                  By signing in, you agree to our{" "}
                  <Link href="/terms" className="text-primary hover:underline">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" className="text-primary hover:underline">
                    Privacy Policy
                  </Link>
                </div>
                
                <div className="lg:hidden p-3 rounded-lg bg-slate-900/30 border border-slate-800">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-emerald-400" />
                    <p className="text-xs text-slate-300">
                      <span className="font-medium">Demo tip:</span> Use <code className="px-1.5 py-0.5 rounded bg-slate-800 text-primary font-mono">demo123</code> as password
                    </p>
                  </div>
                </div>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}