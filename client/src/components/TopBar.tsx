import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Wifi, Menu, LogOut } from "lucide-react";
import ProfessionalNotificationBell from "./ProfessionalNotificationBell";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  LayoutDashboard,
  Users,
  Calendar,
  GraduationCap,
  Monitor,
  BarChart3,
  Settings,
  Shield,
  Activity,
  Smartphone,
  TestTube,
  BookOpen
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function TopBar() {
  const [location, navigate] = useLocation();
  const { user, logout, isLoggingOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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

  const navigationItems = [
    { 
      path: "/", 
      icon: LayoutDashboard, 
      label: "Dashboard",
    },
    { 
      path: "/attendance", 
      icon: Activity, 
      label: "Live Attendance",
    },
    { 
      path: "/schedule", 
      icon: Calendar, 
      label: "Schedule",
    },
    { 
      path: "/students", 
      icon: GraduationCap, 
      label: "Students",
    },
    { 
      path: "/roster", 
      icon: BookOpen, 
      label: "Class Roster",
    },
    { 
      path: "/computers", 
      icon: Monitor, 
      label: "Lab Computers",
    },
    { 
      path: "/monitoring", 
      icon: Shield, 
      label: "Monitor",
    },
    { 
      path: "/iot", 
      icon: Smartphone, 
      label: "IoT Devices",
    },
    { 
      path: "/health", 
      icon: Activity, 
      label: "System Health",
    },
    { 
      path: "/testing", 
      icon: TestTube, 
      label: "System Testing",
    },
    { 
      path: "/reports", 
      icon: BarChart3, 
      label: "Reports",
    },
    { 
      path: "/settings", 
      icon: Settings, 
      label: "Settings",
    },
  ];

  const filteredNavigationItems = user?.role === 'admin' 
    ? [
        ...navigationItems.slice(0, -1),
        { 
          path: "/users", 
          icon: Users, 
          label: "User Management",
        },
        navigationItems[navigationItems.length - 1]
      ]
    : navigationItems.filter(item => 
        item.path !== "/monitoring"
      );

  const userInitials = user ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}` : 'U';

  return (
    <div className="h-16 lg:h-24 glass border-b border-border/20 px-4 lg:px-8 flex items-center justify-between backdrop-blur-sm">
      {/* Mobile Menu Button */}
      <div className="lg:hidden">
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" data-testid="button-mobile-menu">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 p-0">
            <div className="flex flex-col h-full">
              {/* Header */}
              <SheetHeader className="p-6 pb-4 border-b">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-10 w-10 bg-primary text-primary-foreground">
                    <AvatarFallback className="text-sm font-semibold">{userInitials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left">
                    <SheetTitle className="text-base">{user?.firstName} {user?.lastName}</SheetTitle>
                    <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
                  </div>
                </div>
              </SheetHeader>

              {/* Navigation */}
              <nav className="flex-1 overflow-y-auto p-4">
                <div className="space-y-1">
                  {filteredNavigationItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location === item.path;
                    
                    return (
                      <Link key={item.path} href={item.path}>
                        <a
                          onClick={() => setMobileMenuOpen(false)}
                          className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
                            isActive 
                              ? 'bg-primary text-primary-foreground shadow-sm' 
                              : 'hover:bg-muted'
                          }`}
                          data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                        >
                          <Icon className="h-5 w-5" />
                          <span className="font-medium">{item.label}</span>
                        </a>
                      </Link>
                    );
                  })}
                </div>
              </nav>

              {/* Footer */}
              <div className="p-4 border-t">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      disabled={isLoggingOut}
                      variant="outline" 
                      className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors"
                      data-testid="button-mobile-logout"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      {isLoggingOut ? "Signing Out..." : "Sign Out"}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="border-0 max-w-sm bg-card shadow-xl">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-xl font-bold">
                        Confirm Sign Out
                      </AlertDialogTitle>
                      <AlertDialogDescription className="text-muted-foreground leading-relaxed">
                        Are you sure you want to sign out? You'll need to authenticate again to access the attendance system.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-3 sm:gap-2">
                      <AlertDialogCancel>
                        Stay Logged In
                      </AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={logout}
                        className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                      >
                        Yes, Sign Out
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Page Title */}
      <div className="flex-1 lg:flex-initial">
        <h1 className="text-xl lg:text-3xl font-bold text-gradient mb-0 lg:mb-1">{pageInfo.title}</h1>
        <p className="text-xs lg:text-sm text-muted-foreground hidden sm:block">{pageInfo.subtitle}</p>
      </div>
      
      {/* Desktop Actions */}
      <div className="hidden lg:flex items-center space-x-6">
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
          <ProfessionalNotificationBell />
          <ThemeToggle />
        </div>
      </div>

      {/* Mobile Actions */}
      <div className="flex lg:hidden items-center space-x-2">
        <ProfessionalNotificationBell />
        <ThemeToggle />
      </div>
    </div>
  );
}
