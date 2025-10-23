import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Lock,
  Mail,
  Monitor,
  Shield,
  Target,
  User,
  Users,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

interface LoginData {
  email: string;
  password: string;
}

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { user, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [error, setError] = useState<string>("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

  const [loginForm, setLoginForm] = useState<LoginData>({
    email: "",
    password: "",
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

  const forgotPasswordMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await apiRequest("POST", "/api/forgot-password", { email });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Check Your Email",
        description:
          "If an account exists with this email, you will receive a password reset link shortly. Please check your inbox.",
      });
      setShowForgotPassword(false);
      setResetEmail("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description:
          error.message || "Failed to send reset email. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    loginMutation.mutate(loginForm);
  };

  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      toast({
        title: "Email Required",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }
    forgotPasswordMutation.mutate(resetEmail);
  };

  const features = [
    {
      icon: Activity,
      title: "Real-time Monitoring",
      description:
        "Track student attendance with live RFID and proximity sensor validation",
    },
    {
      icon: Users,
      title: "Ghost Attendance Prevention",
      description:
        "Dual validation system prevents false attendance through physical presence verification",
    },
    {
      icon: Target,
      title: "Laboratory Management",
      description:
        "Monitor computer usage and student engagement in laboratory classes",
    },
    {
      icon: Shield,
      title: "Automated Reports",
      description:
        "Generate downloadable attendance reports with timestamps and entry/exit logs",
    },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-primary">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center animate-pulse">
            <div className="w-6 h-6 bg-white/80 rounded-full"></div>
          </div>
          <div className="text-white/80 font-medium">
            Loading CLIRDEC Presence...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page fixed inset-0 w-full h-full flex flex-col md:flex-row overflow-hidden">
      {/* Left side - Modern Branding & Features (Hidden on mobile) */}
      <div className="hidden md:flex md:w-1/2 relative overflow-hidden gradient-primary">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-20 -right-20 w-96 h-96 bg-white/20 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-white/10 rounded-full blur-2xl"></div>
          <div className="absolute top-1/2 left-1/4 w-32 h-32 bg-white/5 rounded-full blur-xl"></div>
        </div>

        <div className="relative z-10 h-full flex flex-col justify-center px-6 lg:px-12 py-8 overflow-auto">
          <div className="mb-6 lg:mb-8">
            <div className="flex items-center space-x-3 lg:space-x-4 mb-4 lg:mb-6">
              <div className="w-12 h-12 lg:w-14 lg:h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <Zap className="h-6 w-6 lg:h-8 lg:w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl lg:text-4xl font-bold text-white tracking-tight">
                  CLIRDEC
                </h1>
                <p className="text-base lg:text-lg text-white/80 font-medium">
                  Presence System
                </p>
              </div>
            </div>
            <p className="text-white/70 text-xs lg:text-sm leading-relaxed max-w-lg mb-2 lg:mb-3">
              <span className="font-semibold text-white/90">
                PROXIMITY AND RFID-ENABLED SMART ENTRY FOR NOTATION OF CLASSROOM
                ENGAGEMENT
              </span>
            </p>
            <p className="text-white/70 text-sm lg:text-base leading-relaxed max-w-lg">
              IoT-based attendance monitoring system for Central Luzon State
              University's Information Technology department. Seamlessly track,
              monitor, and analyze student attendance with cutting-edge RFID and
              proximity sensor technology.
            </p>
          </div>

          <div className="space-y-3 lg:space-y-4">
            <h3 className="text-lg lg:text-xl font-bold text-white mb-3 lg:mb-4">
              Key Features
            </h3>
            <div className="grid grid-cols-1 gap-3 lg:gap-4">
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
                      <h4 className="font-semibold text-white text-sm">
                        {feature.title}
                      </h4>
                      <p className="text-white/70 text-xs leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Modern Login Form */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6 sm:p-8 md:p-8 bg-background overflow-auto">
        <div className="w-full max-w-sm mx-auto">
          {/* Mobile branding header */}
          <div className="md:hidden mb-8">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center">
                <Zap className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-primary">
                  CLIRDEC PRESENCE
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Attendance Management System
                </p>
              </div>
            </div>
          </div>

          <div className="text-center mb-6 sm:mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-gradient mb-2">
              Welcome Back
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              Sign in to access the attendance management system
            </p>
          </div>

          {error && (
            <Alert
              variant="destructive"
              className="mb-4 sm:mb-6 border-destructive/50 bg-destructive/5"
            >
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">{error}</AlertDescription>
            </Alert>
          )}

          <div className="card-elevated p-4 sm:p-6 md:p-8">
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="text-sm font-semibold text-foreground"
                >
                  Email Address
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={loginForm.email}
                    onChange={(e) =>
                      setLoginForm({ ...loginForm, email: e.target.value })
                    }
                    required
                    placeholder="Enter your email"
                    className="pl-10 h-12 rounded-xl border-border/50 focus:border-primary transition-all duration-200"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="password"
                  className="text-sm font-semibold text-foreground"
                >
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    value={loginForm.password}
                    onChange={(e) =>
                      setLoginForm({ ...loginForm, password: e.target.value })
                    }
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
              <Dialog
                open={showForgotPassword}
                onOpenChange={setShowForgotPassword}
              >
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    className="text-sm text-muted-foreground hover:text-foreground"
                    data-testid="button-forgot-password"
                  >
                    Forgot your password?
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Reset Password</DialogTitle>
                    <DialogDescription>
                      Enter your email address and we'll send you instructions
                      to reset your password.
                    </DialogDescription>
                  </DialogHeader>
                  <form
                    onSubmit={handleForgotPassword}
                    className="space-y-4 mt-4"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="reset-email">Email Address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="reset-email"
                          type="email"
                          placeholder="Enter your email"
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                          className="pl-10"
                          data-testid="input-reset-email"
                          required
                        />
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          setShowForgotPassword(false);
                          setResetEmail("");
                        }}
                        data-testid="button-cancel-reset"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        className="flex-1"
                        disabled={forgotPasswordMutation.isPending}
                        data-testid="button-send-reset"
                      >
                        {forgotPasswordMutation.isPending
                          ? "Sending..."
                          : "Send Reset Link"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="mt-8 pt-6 border-t border-border/50">
              <div className="text-center text-sm text-muted-foreground">
                Need help? Contact IT Support
              </div>
              <div className="text-center mt-2">
                <a
                  href="mailto:support@clsu.edu.ph"
                  className="text-sm text-primary hover:text-primary/80 hover:underline transition-colors inline-flex items-center gap-1"
                  data-testid="link-contact-support"
                >
                  <Mail className="h-3 w-3" />
                  support@clsu.edu.ph
                </a>
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
