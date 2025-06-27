import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, Wifi } from "lucide-react";

export default function TopBar() {
  const [location] = useLocation();
  const [currentTime, setCurrentTime] = useState(new Date());

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
    <header className="bg-background border-b border-border px-6 py-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{pageInfo.title}</h1>
          <p className="text-muted-foreground">{pageInfo.subtitle}</p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* System Status Indicator */}
          <div className="flex items-center space-x-2 bg-secondary/10 px-3 py-2 rounded-lg">
            <div className="w-2 h-2 bg-secondary rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-secondary">System Online</span>
          </div>
          
          {/* Current Time */}
          <div className="text-sm text-muted-foreground font-mono">
            {timeString}
          </div>
          
          {/* Notifications */}
          <div className="relative">
            <Button variant="ghost" size="sm" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
                3
              </span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
