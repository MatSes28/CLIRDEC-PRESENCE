import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Clock } from 'lucide-react';

const IDLE_TIMEOUT = 10 * 60 * 1000; // 10 minutes in milliseconds
const WARNING_TIME = 30 * 1000; // 30 seconds warning before logout

export default function SessionTimeout() {
  const { logout, isAuthenticated } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [lastActivity, setLastActivity] = useState(Date.now());

  // Reset activity timer
  const resetTimer = useCallback(() => {
    setLastActivity(Date.now());
    setShowWarning(false);
    setCountdown(30);
  }, []);

  // Track user activity
  useEffect(() => {
    if (!isAuthenticated) return;

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.addEventListener(event, resetTimer);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, resetTimer);
      });
    };
  }, [isAuthenticated, resetTimer]);

  // Check for inactivity
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivity;
      
      // Show warning 30 seconds before auto-logout
      if (timeSinceLastActivity >= IDLE_TIMEOUT - WARNING_TIME && !showWarning) {
        setShowWarning(true);
      }
      
      // Auto logout after full timeout
      if (timeSinceLastActivity >= IDLE_TIMEOUT) {
        logout();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isAuthenticated, lastActivity, showWarning, logout]);

  // Countdown timer for warning dialog
  useEffect(() => {
    if (!showWarning) return;

    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [showWarning]);

  // Handle stay logged in
  const handleStayLoggedIn = () => {
    resetTimer();
  };

  if (!isAuthenticated) return null;

  return (
    <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
      <AlertDialogContent className="border-0 max-w-md bg-card shadow-xl">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-full bg-warning/10 flex items-center justify-center">
              <Clock className="h-6 w-6 text-warning" />
            </div>
            <AlertDialogTitle className="text-xl font-bold">
              Session Timeout Warning
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-muted-foreground leading-relaxed">
            You've been inactive for a while. For security purposes, you will be automatically logged out in{' '}
            <span className="font-bold text-warning">{countdown} seconds</span>.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction 
            onClick={handleStayLoggedIn}
            className="w-full sm:w-auto bg-primary hover:bg-primary/90"
          >
            Continue Session
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
