import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, User, Lock, Zap, Activity, Users, Target, ArrowRight, CheckCircle, Shield, Monitor } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLocation } from "wouter";

interface LoginData {
  email: string;
  password: string;
}

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { user, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string>("");
  
  const [loginForm, setLoginForm] = useState<LoginData>({
    email: "",
    password: ""
  });

  // Redirect if already authenticated
  if (!isLoading && user) {
    setLocation("/");
    return null;
  }

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      setLocation("/");
    },
    onError: (error: Error) => {
      setError(error.message || "Login failed. Please check your credentials.");
    },
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    loginMutation.mutate(loginForm);
  };

  const features = [
    {
      icon: Activity,
      title: "Real-time Monitoring",
      description: "Track student attendance as it happens with live RFID scanning"
    },
    {
      icon: Users,
      title: "Student Management", 
      description: "Comprehensive student database with automated parent notifications"
    },
    {
      icon: Target,
      title: "Analytics & Reports",
      description: "Detailed attendance analytics and exportable comprehensive reports"
    },
    {
      icon: Shield,
      title: "Secure & Reliable",
      description: "Enterprise-grade security with 99.9% uptime guarantee"
    }
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-primary">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center animate-pulse">
            <div className="w-6 h-6 bg-white/80 rounded-full"></div>
          </div>
          <div className="text-white/80 font-medium">Loading CLIRDEC Presence...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 w-full h-full flex overflow-hidden">
      {/* Left side - Modern Branding & Features */}
      <div className="w-1/2 relative overflow-hidden gradient-primary">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-20 -right-20 w-96 h-96 bg-white/20 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-white/10 rounded-full blur-2xl"></div>
          <div className="absolute top-1/2 left-1/4 w-32 h-32 bg-white/5 rounded-full blur-xl"></div>
        </div>
        
        <div className="relative z-10 h-full flex flex-col justify-center px-12 py-8 overflow-hidden">
          <div className="mb-8">
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <Zap className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-white tracking-tight">CLIRDEC</h1>
                <p className="text-lg text-white/80 font-medium">Presence System</p>
              </div>
            </div>
            <p className="text-white/70 text-base leading-relaxed max-w-lg">
              Advanced attendance management system for Central Luzon State University's 
              Information Technology department. Seamlessly track, monitor, and analyze 
              student attendance with cutting-edge RFID technology.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-bold text-white mb-4">Key Features</h3>
            <div className="grid grid-cols-1 gap-4">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div 
                    key={feature.title} 
                    className="flex items-start space-x-3"
                  >
                    <div className="p-2 rounded-lg bg-white/10 backdrop-blur-sm">
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-white text-sm">{feature.title}</h4>
                      <p className="text-white/70 text-xs leading-relaxed">{feature.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-8 p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
            <div className="flex items-center space-x-2 mb-3">
              <CheckCircle className="h-4 w-4 text-white" />
              <span className="text-white font-semibold text-sm">System Status</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className="text-white/60">Uptime</div>
                <div className="text-white font-mono">99.9%</div>
              </div>
              <div>
                <div className="text-white/60">Active Users</div>
                <div className="text-white font-mono">1,247</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Modern Login Form */}
      <div className="w-1/2 flex items-center justify-center p-8 bg-background overflow-hidden">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gradient mb-2">Welcome Back</h2>
            <p className="text-muted-foreground">Sign in to access the attendance management system</p>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6 border-destructive/50 bg-destructive/5">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="card-elevated p-8">
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold text-foreground">
                  Email Address
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm({...loginForm, email: e.target.value})}
                    required
                    placeholder="Enter your email"
                    className="pl-10 h-12 rounded-xl border-border/50 focus:border-primary transition-all duration-200"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-semibold text-foreground">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                    required
                    placeholder="Enter your password"
                    className="pl-10 h-12 rounded-xl border-border/50 focus:border-primary transition-all duration-200"
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                disabled={loginMutation.isPending}
                className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold transition-all duration-200 hover:scale-[1.02] group"
              >
                {loginMutation.isPending ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin"></div>
                    <span>Signing In...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span>Sign In</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Button variant="ghost" className="text-sm text-muted-foreground hover:text-foreground">
                Forgot your password?
              </Button>
            </div>

            <div className="mt-8 pt-6 border-t border-border/50">
              <div className="text-center text-sm text-muted-foreground">
                Need help? Contact IT Support
              </div>
              <div className="text-center text-xs text-muted-foreground mt-2 mono">
                support@clsu.edu.ph
              </div>
            </div>
          </div>

          <div className="mt-6 text-center">
            <div className="flex items-center justify-center space-x-2 text-xs text-muted-foreground">
              <Monitor className="h-3 w-3" />
              <span>Developed for Central Luzon State University</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Information Technology Department
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}