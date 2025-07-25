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
    <div className="min-h-screen w-full flex items-center justify-center bg-white">
      <div className="w-full max-w-md">
        <Card className="shadow-lg border-0">
          <CardHeader className="text-center pb-6">
            <h1 className="text-3xl font-bold text-blue-800 mb-2">CLIRDEC PRESENCE</h1>
            <p className="text-blue-600">Attendance Monitoring System</p>
          </CardHeader>
          
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-blue-800">Login</h2>
              
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Username"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm({...loginForm, email: e.target.value})}
                    required
                    className="pl-10 bg-gray-200 border-0 rounded-full h-12 placeholder:text-gray-500"
                  />
                </div>
                
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Password"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                    required
                    className="pl-10 bg-gray-200 border-0 rounded-full h-12 placeholder:text-gray-500"
                  />
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full bg-green-500 hover:bg-green-600 text-white rounded-full h-12 text-lg font-semibold mt-6"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? "LOGGING IN..." : "LOGIN"}
                </Button>
              </form>
              
              <div className="text-center text-sm space-y-2">
                <a href="#" className="text-blue-600 hover:underline">Forgot password?</a>
                <div className="flex justify-between text-blue-600">
                  <a href="#" className="hover:underline">Log in using Applicant ID</a>
                </div>
              </div>
              
              <div className="text-center text-sm text-gray-600">
                <p>Not registered yet? <a href="#" className="text-blue-600 hover:underline">Create an account</a></p>
              </div>
              
              <div className="mt-4 p-3 bg-gray-100 rounded text-xs text-gray-600">
                <p className="font-semibold mb-1">Demo Accounts:</p>
                <p>Admin: admin@clsu.edu.ph / admin123</p>
                <p>Faculty: faculty@clsu.edu.ph / faculty123</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}