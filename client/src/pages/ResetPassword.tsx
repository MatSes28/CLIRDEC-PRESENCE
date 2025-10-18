import { PasswordInput } from "@/components/PasswordInput";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle, KeyRound, Loader2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const [token, setToken] = useState<string>("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Password match validation
  const passwordsMatch =
    confirmPassword.length > 0 && newPassword === confirmPassword;
  const passwordsDontMatch =
    confirmPassword.length > 0 && newPassword !== confirmPassword;

  useEffect(() => {
    // Get token from URL
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get("token");
    if (tokenParam) {
      setToken(tokenParam);
    } else {
      setError("Invalid reset link. Please request a new password reset.");
    }
  }, []);

  const resetPasswordMutation = useMutation({
    mutationFn: async (data: { token: string; newPassword: string }) => {
      const res = await apiRequest("POST", "/api/reset-password", data);
      return await res.json();
    },
    onSuccess: () => {
      setSuccess(true);
      setTimeout(() => {
        setLocation("/");
      }, 3000);
    },
    onError: (error: any) => {
      // Handle specific error cases
      const errorMessage =
        error.message || "Failed to reset password. Please try again.";

      if (errorMessage.includes("expired")) {
        setError(
          "This reset link has expired. Please request a new password reset."
        );
      } else if (errorMessage.includes("Invalid or expired")) {
        setError(
          "Invalid or expired reset link. Please request a new password reset."
        );
      } else {
        setError(errorMessage);
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!token) {
      setError("Invalid reset token");
      return;
    }

    resetPasswordMutation.mutate({ token, newPassword });
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <CheckCircle className="h-16 w-16 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold text-green-700">
                Password Reset Successful!
              </h2>
              <p className="text-muted-foreground">
                Your password has been updated successfully. Redirecting to
                login...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-primary/10 p-3 rounded-full">
              <KeyRound className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Reset Your Password</CardTitle>
          <CardDescription>Enter your new password below</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <PasswordInput
              id="newPassword"
              label="New Password"
              value={newPassword}
              onChange={setNewPassword}
              placeholder="Enter new password"
              showRequirements={true}
              testId="input-new-password"
              autoComplete="new-password"
            />

            <div className="space-y-2">
              <PasswordInput
                id="confirmPassword"
                label="Confirm Password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder="Confirm new password"
                showRequirements={false}
                testId="input-confirm-password"
                autoComplete="new-password"
              />

              {/* Password Match Indicator */}
              {confirmPassword.length > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  {passwordsMatch ? (
                    <div className="flex items-center gap-1 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      <span>Passwords match</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-red-600">
                      <XCircle className="h-4 w-4" />
                      <span>Passwords do not match</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={resetPasswordMutation.isPending || !token}
            >
              {resetPasswordMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resetting Password...
                </>
              ) : (
                "Reset Password"
              )}
            </Button>

            <div className="text-center">
              <Button
                type="button"
                variant="link"
                onClick={() => setLocation("/")}
                className="text-sm"
                data-testid="link-back-to-login"
              >
                Back to Login
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
