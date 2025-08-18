import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
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
  Zap,
  Shield,
  Activity,
  ArrowRight,
  Smartphone,
  TestTube
} from "lucide-react";

export default function Sidebar() {
  const [location] = useLocation();
  const { user, logout, isLoggingOut } = useAuth();

  const navigationItems = [
    { 
      path: "/", 
      icon: LayoutDashboard, 
      label: "Dashboard",
      description: "Overview & Analytics"
    },
    { 
      path: "/attendance", 
      icon: Activity, 
      label: "Live Attendance",
      description: "Real-time tracking"
    },
    { 
      path: "/schedule", 
      icon: Calendar, 
      label: "Schedule",
      description: "Class timetables"
    },
    { 
      path: "/students", 
      icon: GraduationCap, 
      label: "Students",
      description: "Student management"
    },
    { 
      path: "/computers", 
      icon: Monitor, 
      label: "Lab Computers",
      description: "Computer allocation"
    },
    { 
      path: "/monitoring", 
      icon: Shield, 
      label: "Monitor",
      description: "System oversight"
    },
    { 
      path: "/iot", 
      icon: Smartphone, 
      label: "IoT Devices",
      description: "ESP32 hardware"
    },
    { 
      path: "/health", 
      icon: Activity, 
      label: "System Health",
      description: "Performance monitor"
    },
    { 
      path: "/testing", 
      icon: TestTube, 
      label: "System Testing",
      description: "Test & simulate"
    },
    { 
      path: "/reports", 
      icon: BarChart3, 
      label: "Reports",
      description: "Data insights"
    },
    { 
      path: "/settings", 
      icon: Settings, 
      label: "Settings",
      description: "System configuration"
    },
  ];

  // Filter navigation items based on user role
  const filteredNavigationItems = user?.role === 'admin' 
    ? [
        ...navigationItems.slice(0, -1), // All items except settings
        { 
          path: "/users", 
          icon: Users, 
          label: "User Management",
          description: "Faculty & admin accounts"
        },
        navigationItems[navigationItems.length - 1] // Settings last
      ]
    : navigationItems.filter(item => 
        item.path !== "/monitoring" // Faculty can't access monitoring
      );

  const isActive = (path: string) => {
    if (path === "/") {
      return location === "/";
    }
    return location.startsWith(path);
  };

  return (
    <div className="fixed left-0 top-0 h-full w-80 glass border-r border-border/20 z-40 animate-slide-in-right">
      {/* Modern Header with Gradient */}
      <div className="relative p-8 gradient-primary overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-4 -right-4 w-32 h-32 bg-white/20 rounded-full blur-xl"></div>
          <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
        </div>
        <div className="relative z-10">
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg border border-white/30">
              <Zap className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-white text-xl tracking-tight">CLIRDEC</h1>
              <p className="text-white/80 text-sm font-medium">Presence System</p>
            </div>
          </div>
          <div className="text-white/60 text-xs font-mono uppercase tracking-wider">
            Advanced Attendance Management
          </div>
        </div>
      </div>
      
      {/* Modern Navigation */}
      <nav className="px-6 py-6 space-y-3">
        {filteredNavigationItems.map((item, index) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          
          return (
            <Link 
              key={item.path} 
              href={item.path}
              className={`group relative flex items-center p-4 rounded-2xl transition-all duration-300 ease-out animate-fade-in-up stagger-${index + 1} ${
                active 
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25 scale-[1.02]' 
                  : 'hover:bg-muted/50 hover:scale-[1.01] text-foreground/80 hover:text-foreground'
              }`}
            >
              <div className={`p-2 rounded-xl mr-4 transition-all duration-300 ${
                active 
                  ? 'bg-white/20' 
                  : 'bg-muted/50 group-hover:bg-muted'
              }`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-sm">{item.label}</div>
                <div className={`text-xs transition-colors duration-300 ${
                  active 
                    ? 'text-primary-foreground/70' 
                    : 'text-muted-foreground group-hover:text-foreground/70'
                }`}>
                  {item.description}
                </div>
              </div>
              {active && (
                <ArrowRight className="h-4 w-4 text-primary-foreground/70" />
              )}
              {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white/30 rounded-r-full"></div>
              )}
            </Link>
          );
        })}
      </nav>
      
      {/* Modern User Profile Section */}
      <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-border/20 glass">
        <div className="card-modern p-4 mb-4">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="w-12 h-12 gradient-accent rounded-2xl flex items-center justify-center font-bold text-white text-lg shadow-lg">
                {user?.firstName ? user.firstName.charAt(0) : 'U'}
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-success rounded-full border-2 border-card"></div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground truncate text-sm leading-tight">
                {user?.firstName && user?.lastName 
                  ? `${user.firstName} ${user.lastName}` 
                  : user?.email || 'User'}
              </p>
              <div className="flex items-center space-x-2 mt-1">
                <span className="status-indicator status-online">
                  {user?.role || 'Faculty'}
                </span>
                <span className="text-xs text-muted-foreground mono">
                  IT Dept
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button 
              variant="ghost" 
              disabled={isLoggingOut}
              className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-all duration-200 rounded-xl p-3 group"
            >
              <LogOut className="mr-3 h-4 w-4 transition-transform group-hover:scale-110" />
              <span className="font-medium">
                {isLoggingOut ? "Signing Out..." : "Sign Out"}
              </span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="card-elevated border-0">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-gradient text-xl font-bold">
                Confirm Sign Out
              </AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground leading-relaxed">
                Are you sure you want to sign out of CLIRDEC Presence? You'll need to authenticate again to access the attendance management system.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-3">
              <AlertDialogCancel className="btn-modern bg-muted hover:bg-muted/80">
                Stay Logged In
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={logout}
                className="btn-modern bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              >
                Yes, Sign Out
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}