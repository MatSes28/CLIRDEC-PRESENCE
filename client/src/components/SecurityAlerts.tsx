import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Shield, Lock, Eye, Clock, UserX } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SecurityEvent {
  id: string;
  type: 'failed_login' | 'suspicious_rfid' | 'multiple_attempts' | 'session_timeout' | 'unauthorized_access';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  source: string;
  resolved: boolean;
}

export default function SecurityAlerts() {
  const { toast } = useToast();
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [sessionTimeout, setSessionTimeout] = useState(30); // minutes

  // Simulate security monitoring
  useEffect(() => {
    const checkSecurity = () => {
      // Simulate failed login attempts
      const failedAttempts = Math.floor(Math.random() * 3);
      if (failedAttempts > 0) {
        const newEvent: SecurityEvent = {
          id: `failed_${Date.now()}`,
          type: 'failed_login',
          severity: failedAttempts > 1 ? 'high' : 'medium',
          message: `${failedAttempts} failed login attempt${failedAttempts > 1 ? 's' : ''} detected`,
          timestamp: new Date(),
          source: `IP: 192.168.1.${Math.floor(Math.random() * 255)}`,
          resolved: false
        };
        
        setEvents(prev => [newEvent, ...prev].slice(0, 10));
        
        if (failedAttempts > 1) {
          toast({
            title: "Security Alert",
            description: newEvent.message,
            variant: "destructive"
          });
        }
      }
    };

    const interval = setInterval(checkSecurity, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [toast]);

  // Session timeout monitoring
  useEffect(() => {
    let inactivityTimer: NodeJS.Timeout;
    let warningTimer: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(inactivityTimer);
      clearTimeout(warningTimer);
      
      // Warning 5 minutes before timeout
      warningTimer = setTimeout(() => {
        toast({
          title: "Session Warning",
          description: `Your session will expire in 5 minutes due to inactivity.`,
          duration: 10000
        });
      }, (sessionTimeout - 5) * 60 * 1000);

      // Auto logout after timeout
      inactivityTimer = setTimeout(() => {
        toast({
          title: "Session Expired",
          description: "You have been logged out due to inactivity.",
          variant: "destructive"
        });
        // In a real app, this would trigger logout
        if (typeof window !== 'undefined') {
          window.location.reload();
        }
      }, sessionTimeout * 60 * 1000);
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, resetTimer, true);
    });

    resetTimer(); // Initial timer

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, resetTimer, true);
      });
      clearTimeout(inactivityTimer);
      clearTimeout(warningTimer);
    };
  }, [sessionTimeout, toast]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-black';
      case 'low': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'failed_login': return <Lock className="h-4 w-4" />;
      case 'suspicious_rfid': return <Eye className="h-4 w-4" />;
      case 'multiple_attempts': return <AlertTriangle className="h-4 w-4" />;
      case 'session_timeout': return <Clock className="h-4 w-4" />;
      case 'unauthorized_access': return <UserX className="h-4 w-4" />;
      default: return <Shield className="h-4 w-4" />;
    }
  };

  const resolveEvent = (id: string) => {
    setEvents(prev => prev.map(event => 
      event.id === id ? { ...event, resolved: true } : event
    ));
    toast({
      title: "Event Resolved",
      description: "Security event marked as resolved"
    });
  };

  const unresolvedEvents = events.filter(e => !e.resolved);
  const criticalEvents = unresolvedEvents.filter(e => e.severity === 'critical' || e.severity === 'high');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Monitoring
          </div>
          <div className="flex items-center gap-2">
            {criticalEvents.length > 0 && (
              <Badge variant="destructive" className="animate-pulse">
                {criticalEvents.length} Critical
              </Badge>
            )}
            <Badge variant="outline">
              {unresolvedEvents.length} Active
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Session Info */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Session Timeout: {sessionTimeout}min</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSessionTimeout(prev => prev === 30 ? 60 : 30)}
          >
            Adjust
          </Button>
        </div>

        {/* Security Events */}
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {events.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No security events detected
            </p>
          ) : (
            events.map((event) => (
              <div
                key={event.id}
                className={`p-3 rounded-lg border-l-4 ${
                  event.resolved 
                    ? 'bg-muted/30 border-muted opacity-60' 
                    : 'bg-background border-l-red-500'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-2">
                    {getEventIcon(event.type)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          className={getSeverityColor(event.severity)}
                        >
                          {event.severity.toUpperCase()}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {event.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm font-medium">{event.message}</p>
                      <p className="text-xs text-muted-foreground">{event.source}</p>
                    </div>
                  </div>
                  {!event.resolved && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => resolveEvent(event.id)}
                    >
                      Resolve
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Security Stats */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t">
          <div className="text-center">
            <p className="text-lg font-semibold text-green-600">
              {events.filter(e => e.resolved).length}
            </p>
            <p className="text-xs text-muted-foreground">Resolved</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-orange-600">
              {unresolvedEvents.length}
            </p>
            <p className="text-xs text-muted-foreground">Active</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-red-600">
              {criticalEvents.length}
            </p>
            <p className="text-xs text-muted-foreground">Critical</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}