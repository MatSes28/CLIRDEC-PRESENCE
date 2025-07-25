import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Bell, Users, UserCheck, UserX, Activity } from "lucide-react";

interface NotificationData {
  type: 'attendance' | 'session' | 'alert' | 'system';
  title: string;
  message: string;
  studentName?: string;
  timestamp: Date;
}

export default function RealTimeNotifications() {
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // WebSocket connection for real-time notifications
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    let ws: WebSocket;
    
    const connect = () => {
      ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        setIsConnected(true);
        console.log("Connected to notification websocket");
      };
      
      ws.onmessage = (event) => {
        try {
          const notification: NotificationData = JSON.parse(event.data);
          showNotification(notification);
        } catch (error) {
          console.error("Failed to parse notification:", error);
        }
      };
      
      ws.onclose = () => {
        setIsConnected(false);
        console.log("Disconnected from notification websocket");
        // Reconnect after 3 seconds
        setTimeout(connect, 3000);
      };
      
      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        setIsConnected(false);
      };
    };

    connect();

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, []);

  const showNotification = (notification: NotificationData) => {
    const iconMap = {
      attendance: UserCheck,
      session: Activity,
      alert: Bell,
      system: Users
    };

    const Icon = iconMap[notification.type];

    toast({
      title: (
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4" />
          {notification.title}
        </div>
      ) as any,
      description: notification.message,
      duration: 5000,
    });

    // Play a subtle notification sound
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        badge: '/favicon.ico'
      });
    }
  };

  // Request notification permission on component mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  return null; // This component doesn't render anything visible
}

// Hook for sending notifications from other components
export function useRealTimeNotifications() {
  const sendNotification = (data: Omit<NotificationData, 'timestamp'>) => {
    // In a real implementation, this would send via WebSocket
    // For now, we'll just show locally
    const notification: NotificationData = {
      ...data,
      timestamp: new Date()
    };
    
    // Trigger local notification
    window.dispatchEvent(new CustomEvent('localNotification', { detail: notification }));
  };

  return { sendNotification };
}