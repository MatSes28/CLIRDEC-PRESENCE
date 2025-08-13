import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Bell, Wifi } from "lucide-react";
import NotificationPanel from "./NotificationPanel";

export default function TopBar() {
  const [location] = useLocation();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);

  const handleNotificationClick = () => {
    setNotificationPanelOpen(!notificationPanelOpen);
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  const getPageInfo = () => {
    switch (location) {
      case "/":
        return {
          title: "Dashboard",
          subtitle: "Monitor your classes and student attendance"
        };
      case "/attendance":
        return {
          title: "Live Attendance",
          subtitle: "Real-time attendance monitoring and RFID scanning"
        };
      case "/schedule":
        return {
          title: "Class Schedule",
          subtitle: "Manage your class schedules and automation settings"
        };
      case "/students":
        return {
          title: "Student Management",
          subtitle: "Manage student information and parent contacts"
        };
      case "/computers":
        return {
          title: "Lab Computers",
          subtitle: "Assign and monitor laboratory computer usage"
        };
      case "/reports":
        return {
          title: "Reports",
          subtitle: "Generate comprehensive attendance reports"
        };
      case "/settings":
        return {
          title: "Settings",
          subtitle: "Configure system parameters and notifications"
        };
      default:
        return {
          title: "CLIRDEC: PRESENCE",
          subtitle: "Attendance Monitoring System"
        };
    }
  };

  const pageInfo = getPageInfo();
  const timeString = currentTime.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  }) + ' - ' + currentTime.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });

  return (
    <>
    <div className="h-24 glass border-b border-border/20 px-8 flex items-center justify-between backdrop-blur-sm">
      <div className="flex-1">
        <h1 className="text-3xl font-bold text-gradient mb-1">{pageInfo.title}</h1>
        <p className="text-sm text-muted-foreground">{pageInfo.subtitle}</p>
      </div>
      
      <div className="flex items-center space-x-6">
        <div className="flex items-center space-x-3">
          <div className="status-indicator status-online">
            System Online
          </div>
          
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Wifi className="h-4 w-4" />
            <span className="mono font-medium">{timeString}</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <ThemeToggle />
          <Button 
            variant="ghost" 
            size="sm" 
            className="relative hover:bg-muted/50 rounded-xl"
            onClick={handleNotificationClick}
          >
            <Bell className="h-5 w-5" />
            <div className="absolute -top-1 -right-1 h-5 w-5 bg-destructive rounded-full flex items-center justify-center">
              <span className="text-xs text-destructive-foreground font-bold">3</span>
            </div>
          </Button>
        </div>
      </div>
    </div>
    
    <NotificationPanel 
      isOpen={notificationPanelOpen} 
      onClose={() => setNotificationPanelOpen(false)} 
    />
    </>
  );
}
