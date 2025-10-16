import { Loader2 } from "lucide-react";

interface LoadingStateProps {
  message?: string;
  subMessage?: string;
}

export function LoadingState({ 
  message = "Loading...", 
  subMessage 
}: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
      <p className="text-base font-medium text-foreground mb-1">{message}</p>
      {subMessage && (
        <p className="text-sm text-muted-foreground">{subMessage}</p>
      )}
    </div>
  );
}
