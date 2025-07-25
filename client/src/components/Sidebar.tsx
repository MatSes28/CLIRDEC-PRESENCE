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
  University,
  Shield
} from "lucide-react";

export default function Sidebar() {
  const [location] = useLocation();
  const { user, logout, isLoggingOut } = useAuth();

  const navigationItems = [
    { path: "/", icon: LayoutDashboard, label: "Dashboard" },
    { path: "/attendance", icon: Users, label: "Live Attendance" },
    { path: "/schedule", icon: Calendar, label: "Schedule" },
    { path: "/students", icon: GraduationCap, label: "Students" },
    { path: "/computers", icon: Monitor, label: "Lab Computers" },
    { path: "/monitoring", icon: Shield, label: "Attendance Monitor" },
    { path: "/reports", icon: BarChart3, label: "Reports" },
    { path: "/settings", icon: Settings, label: "Settings" },
  ];

  const isActive = (path: string) => {
    if (path === "/") {
      return location === "/";
    }
    return location.startsWith(path);
  };

  return (
    <div className="fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 shadow-xl z-40">
      {/* Header */}
      <div className="p-6 border-b border-gray-200" style={{ backgroundColor: '#2596be' }}>
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg">
            <University className="h-7 w-7" style={{ color: '#2596be' }} />
          </div>
          <div>
            <h2 className="font-bold text-white text-lg">PRESENCE</h2>
            <p className="text-sm text-white/90">Attendance System</p>
          </div>
        </div>
      </div>
      
      {/* Navigation */}
      <nav className="mt-8 px-4">
        <div className="space-y-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            
            return (
              <Link 
                key={item.path} 
                href={item.path}
                className={`flex items-center px-4 py-3 rounded-xl transition-all duration-200 group ${
                  active 
                    ? 'text-white font-semibold shadow-lg transform scale-105' 
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }`}
                style={active ? { backgroundColor: '#2596be' } : {}}
              >
                <Icon className="mr-3 h-5 w-5 transition-transform group-hover:scale-110" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
      
      {/* User Profile & Logout */}
      <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-gray-200 bg-white">
        <div className="flex items-center space-x-3 mb-4 p-3 bg-gray-50 rounded-xl">
          <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-white text-lg" style={{ backgroundColor: '#2596be' }}>
            {user?.firstName ? user.firstName.charAt(0) : 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-800 truncate text-sm">
              {user?.firstName && user?.lastName 
                ? `${user.firstName} ${user.lastName}` 
                : user?.email || 'User'}
            </p>
            <p className="text-xs text-gray-500 capitalize">{user?.role || 'Faculty'} • IT Department</p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          onClick={logout}
          disabled={isLoggingOut}
          className="w-full justify-start text-gray-700 hover:text-red-600 hover:bg-red-50 transition-colors duration-200"
        >
          <LogOut className="mr-2 h-4 w-4" />
          {isLoggingOut ? "Signing Out..." : "Sign Out"}
        </Button>
      </div>
    </div>
  );
}