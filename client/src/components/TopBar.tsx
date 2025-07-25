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
    <header className="bg-white border-b border-gray-200 px-8 py-6 shadow-sm" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)' }}>
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 mb-1">{pageInfo.title}</h1>
          <p className="text-sm text-gray-600">{pageInfo.subtitle}</p>
        </div>
        
        <div className="flex items-center space-x-6">
          <div className="text-sm text-gray-600 bg-white px-4 py-2 rounded-lg shadow-sm border">
            {timeString}
          </div>
          
          <div className="flex items-center space-x-3">
            <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 border-green-200">
              <Wifi className="h-3 w-3 mr-1" />
              Online
            </Badge>
            
            <Button variant="ghost" size="sm" className="p-2 hover:bg-white/50 rounded-xl">
              <Bell className="h-5 w-5 text-gray-600" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
