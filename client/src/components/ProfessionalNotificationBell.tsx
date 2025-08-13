import { useState, useEffect } from 'react';
import { Bell, AlertTriangle, Clock, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

interface NotificationAlert {
  id: string;
  type: 'critical' | 'concerning' | 'warning' | 'info';
  studentName: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  urgent: boolean;
}

interface ProfessionalNotificationBellProps {
  className?: string;
}

export default function ProfessionalNotificationBell({ className }: ProfessionalNotificationBellProps) {
  const [notifications, setNotifications] = useState<NotificationAlert[]>([]);
  const [showPanel, setShowPanel] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch behavior alerts data
  const { data: behaviorData } = useQuery({
    queryKey: ['/api/attendance/behavior-analysis'],
    refetchInterval: 2 * 60 * 1000, // Check every 2 minutes for new alerts
  });

  // Transform behavior data into notifications
  useEffect(() => {
    if (behaviorData && Array.isArray(behaviorData)) {
      const alerts: NotificationAlert[] = behaviorData
        .filter((item: any) => item.behaviorLevel === 'critical' || item.behaviorLevel === 'concerning')
        .map((item: any, index: number) => ({
          id: `behavior-${item.student.id}-${index}`,
          type: item.behaviorLevel as 'critical' | 'concerning',
          studentName: `${item.student.firstName} ${item.student.lastName}`,
          message: item.message,
          timestamp: new Date(Date.now() - (index * 30 * 60 * 1000)), // Simulate different times
          isRead: false,
          urgent: item.behaviorLevel === 'critical'
        }));

      setNotifications(alerts);
      setUnreadCount(alerts.filter(alert => !alert.isRead).length);
    }
  }, [behaviorData]);

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, isRead: true } : notif
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(notif => ({ ...notif, isRead: true })));
    setUnreadCount(0);
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'concerning':
        return <Clock className="h-4 w-4 text-orange-500" />;
      default:
        return <Bell className="h-4 w-4 text-blue-500" />;
    }
  };

  const formatTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className={cn("relative", className)}>
      <Button
        variant="ghost"
        size="sm"
        className="relative h-9 w-9 p-0 hover:bg-accent/50 transition-all duration-200"
        onClick={() => setShowPanel(!showPanel)}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs flex items-center justify-center animate-pulse"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </Button>

      {showPanel && (
        <div className="absolute right-0 top-full mt-2 z-50">
          <Card className="w-80 shadow-xl border-border/20 glass">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2 text-base">
                  <AlertTriangle className="h-4 w-4 text-primary" />
                  <span>Attendance Alerts</span>
                </CardTitle>
                <div className="flex items-center space-x-2">
                  {unreadCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={markAllAsRead}
                      className="text-xs h-6 px-2"
                    >
                      Mark all read
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPanel(false)}
                    className="h-6 w-6 p-0"
                  >
                    ×
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="p-0">
              <ScrollArea className="h-[300px]">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-24 text-muted-foreground p-4">
                    <Bell className="h-6 w-6 mb-1 opacity-50" />
                    <p className="text-xs">No alerts at this time</p>
                  </div>
                ) : (
                  <div className="space-y-1 p-3">
                    {notifications.map((notification, index) => (
                      <div key={notification.id}>
                        <div
                          className={cn(
                            "p-3 rounded-lg border transition-all duration-200 hover:shadow-sm cursor-pointer",
                            !notification.isRead 
                              ? "bg-primary/5 border-primary/20" 
                              : "bg-background/50 border-border/10"
                          )}
                          onClick={() => !notification.isRead && markAsRead(notification.id)}
                        >
                          <div className="flex items-start space-x-2">
                            <div className="mt-0.5">
                              {getAlertIcon(notification.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <p className="text-sm font-medium text-foreground truncate">
                                  {notification.studentName}
                                </p>
                                {notification.urgent && (
                                  <Badge variant="destructive" className="text-xs">
                                    URGENT
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {notification.message}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {formatTimeAgo(notification.timestamp)}
                              </p>
                            </div>
                            {!notification.isRead && (
                              <div className="w-2 h-2 bg-primary rounded-full mt-1"></div>
                            )}
                          </div>
                        </div>
                        
                        {index < notifications.length - 1 && (
                          <Separator className="my-1 opacity-30" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
              
              {notifications.length > 0 && (
                <>
                  <Separator />
                  <div className="p-3">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full text-xs"
                      onClick={() => setShowPanel(false)}
                    >
                      View All Alerts in Dashboard
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}