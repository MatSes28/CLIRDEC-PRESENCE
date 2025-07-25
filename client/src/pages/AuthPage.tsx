import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, User, Lock } from "lucide-react";
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-white px-4">
      <div className="w-full max-w-sm">
        <Card className="shadow-lg border-0">
          <CardHeader className="text-center px-8 pt-8 pb-4">
            <h1 className="text-2xl font-bold text-blue-800 mb-1">CLIRDEC PRESENCE</h1>
            <p className="text-blue-600 text-sm">Attendance Monitoring System</p>
          </CardHeader>
          
          <CardContent className="px-8 pb-8">
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-blue-800 text-center">Login</h2>
              
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="relative">
                  <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Username"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm({...loginForm, email: e.target.value})}
                    required
                    className="pl-12 pr-4 bg-gray-200 border-0 rounded-full h-12 placeholder:text-gray-500 text-sm"
                  />
                </div>
                
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Password"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                    required
                    className="pl-12 pr-4 bg-gray-200 border-0 rounded-full h-12 placeholder:text-gray-500 text-sm"
                  />
                </div>
                
                <div className="pt-2">
                  <Button 
                    type="submit" 
                    className="w-full bg-green-500 hover:bg-green-600 text-white rounded-full h-12 text-base font-semibold"
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? "LOGGING IN..." : "LOGIN"}
                  </Button>
                </div>
              </form>
              
              <div className="text-center space-y-3 pt-2">
                <div>
                  <a href="#" className="text-blue-600 hover:underline text-sm">Forgot password?</a>
                </div>
                <div>
                  <a href="#" className="text-blue-600 hover:underline text-sm">Log in using Applicant ID</a>
                </div>
              </div>
              
              <div className="text-center pt-1">
                <p className="text-sm text-gray-600">Not registered yet? <a href="#" className="text-blue-600 hover:underline">Create an account</a></p>
              </div>
              
              <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
                <p className="font-semibold mb-2 text-xs text-gray-700">Demo Accounts:</p>
                <p className="text-xs text-gray-600">Admin: admin@clsu.edu.ph / admin123</p>
                <p className="text-xs text-gray-600">Faculty: faculty@clsu.edu.ph / faculty123</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}