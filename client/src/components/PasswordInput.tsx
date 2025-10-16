import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PasswordRequirement {
  label: string;
  regex: RegExp;
  met: boolean;
}

interface PasswordInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  showRequirements?: boolean;
  testId?: string;
  autoComplete?: string;
}

export function PasswordInput({
  id,
  label,
  value,
  onChange,
  placeholder = "Enter password",
  showRequirements = true,
  testId,
  autoComplete = "new-password"
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const requirements: PasswordRequirement[] = [
    { label: "At least 8 characters", regex: /.{8,}/, met: value.length >= 8 },
    { label: "One uppercase letter (A-Z)", regex: /[A-Z]/, met: /[A-Z]/.test(value) },
    { label: "One lowercase letter (a-z)", regex: /[a-z]/, met: /[a-z]/.test(value) },
    { label: "One number (0-9)", regex: /[0-9]/, met: /[0-9]/.test(value) },
    { label: "One special character (!@#$%^&*)", regex: /[^A-Za-z0-9]/, met: /[^A-Za-z0-9]/.test(value) },
  ];

  const allRequirementsMet = requirements.every(req => req.met);

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={showPassword ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          data-testid={testId}
          autoComplete={autoComplete}
          className={cn(
            "pr-10",
            value && !allRequirementsMet && "border-yellow-500 focus-visible:ring-yellow-500"
          )}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
          onClick={() => setShowPassword(!showPassword)}
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Eye className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
      </div>

      {showRequirements && (isFocused || value) && (
        <div className="glass rounded-lg p-3 space-y-2 border border-border/50">
          <p className="text-xs font-medium text-muted-foreground mb-2">
            Password must contain:
          </p>
          {requirements.map((req, index) => (
            <div key={index} className="flex items-center gap-2 text-xs">
              {req.met ? (
                <Check className="h-3 w-3 text-green-500 flex-shrink-0" />
              ) : (
                <X className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              )}
              <span className={cn(
                "transition-colors",
                req.met ? "text-green-600 dark:text-green-500 font-medium" : "text-muted-foreground"
              )}>
                {req.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface ConfirmPasswordInputProps {
  id: string;
  value: string;
  password: string;
  onChange: (value: string) => void;
  testId?: string;
}

export function ConfirmPasswordInput({
  id,
  value,
  password,
  onChange,
  testId
}: ConfirmPasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const passwordsMatch = value && password && value === password;
  const passwordsDontMatch = value && password && value !== password;

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Confirm Password</Label>
      <div className="relative">
        <Input
          id={id}
          type={showPassword ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Re-enter password"
          data-testid={testId}
          autoComplete="new-password"
          className={cn(
            "pr-10",
            passwordsMatch && "border-green-500 focus-visible:ring-green-500",
            passwordsDontMatch && "border-red-500 focus-visible:ring-red-500"
          )}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
          onClick={() => setShowPassword(!showPassword)}
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Eye className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
      </div>
      {passwordsMatch && (
        <p className="text-xs text-green-600 dark:text-green-500 flex items-center gap-1">
          <Check className="h-3 w-3" />
          Passwords match
        </p>
      )}
      {passwordsDontMatch && (
        <p className="text-xs text-red-600 dark:text-red-500 flex items-center gap-1">
          <X className="h-3 w-3" />
          Passwords do not match
        </p>
      )}
    </div>
  );
}
