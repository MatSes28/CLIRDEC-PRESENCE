import { Link, useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { 
  LayoutDashboard,
  Users,
  Calendar,
  GraduationCap,
  Monitor,
  BarChart3,
  Settings,
  LogOut,
  University
} from "lucide-react";

export default function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuth();

  const navigationItems = [
    { path: "/", icon: LayoutDashboard, label: "Dashboard" },
    { path: "/attendance", icon: Users, label: "Live Attendance" },
    { path: "/schedule", icon: Calendar, label: "Schedule" },
    { path: "/students", icon: GraduationCap, label: "Students" },
    { path: "/computers", icon: Monitor, label: "Lab Computers" },
    { path: "/reports", icon: BarChart3, label: "Reports" },
    { path: "/settings", icon: Settings, label: "Settings" },
  ];

  const isActive = (path: string) => {
    if (path === "/") {
      return location === "/";
    }
    return location.startsWith(path);
  };

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  return (
    <div className="fixed left-0 top-0 h-full w-64 bg-sidebar border-r border-sidebar-border shadow-lg z-40">
      {/* Header */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <University className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-sidebar-foreground">PRESENCE</h2>
            <p className="text-sm text-sidebar-foreground/70">CLIRDEC System</p>
          </div>
        </div>
      </div>
      
      {/* Navigation */}
      <nav className="mt-6 px-3">
        <div className="space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            
            return (
              <Link 
                key={item.path} 
                href={item.path}
                className={`flex items-center px-3 py-3 rounded-lg transition-colors duration-200 ${
                  active 
                    ? 'text-primary bg-primary/10 border-r-2 border-primary font-medium' 
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                }`}
              >
                <Icon className="mr-3 h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
      
      {/* User Profile & Logout */}
      <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-sidebar-border bg-sidebar">
        <div className="flex items-center space-x-3 mb-4">
          <img 
            src={user?.profileImageUrl || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face"} 
            alt="Professor profile" 
            className="w-10 h-10 rounded-full object-cover"
          />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sidebar-foreground truncate">
              {user?.firstName && user?.lastName 
                ? `${user.firstName} ${user.lastName}` 
                : user?.email || 'Professor'}
            </p>
            <p className="text-sm text-sidebar-foreground/70">IT Department</p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          onClick={handleLogout}
          className="w-full justify-start text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
