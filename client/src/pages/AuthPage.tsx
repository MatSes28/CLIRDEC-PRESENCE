import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle } from "lucide-react";
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
    <div className="min-h-screen w-full flex items-center justify-center bg-blue-50">
      <div className="w-full max-w-md">
        <Card className="shadow-lg">
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
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="email"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm({...loginForm, email: e.target.value})}
                    required
                    className="bg-blue-50"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="password"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                    required
                    className="bg-blue-50"
                  />
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? "Logging in..." : "Login"}
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