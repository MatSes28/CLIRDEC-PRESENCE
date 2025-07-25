import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import AuthPage from "@/pages/AuthPage";
import Dashboard from "@/pages/Dashboard";
import EnhancedDashboard from "@/pages/EnhancedDashboard";
import LiveAttendance from "@/pages/LiveAttendance";
import Schedule from "@/pages/Schedule";
import Students from "@/pages/Students";
import Computers from "@/pages/Computers";
import Reports from "@/pages/Reports";
import Settings from "@/pages/Settings";
import AttendanceMonitoring from "@/pages/AttendanceMonitoring";
import NotFound from "@/pages/not-found";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { ThemeProvider } from "@/components/ThemeProvider";
import { WebSocketProvider } from "@/components/WebSocketProvider";
import RealTimeNotifications from "@/components/RealTimeNotifications";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-primary">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center animate-pulse">
            <div className="w-6 h-6 bg-white/80 rounded-full"></div>
          </div>
          <div className="text-white/80 font-medium">Loading CLIRDEC Presence...</div>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      {!isAuthenticated ? (
        <>
          <Route path="/" component={AuthPage} />
          <Route component={AuthPage} />
        </>
      ) : (
        <>
          {/* Desktop Layout */}
          <div className="hidden lg:flex min-h-screen">
            <Sidebar />
            <div className="flex-1 ml-80 flex flex-col min-h-screen">
              <TopBar />
              <main className="flex-1 overflow-auto p-8 space-y-8">
                <Switch>
                  <Route path="/" component={EnhancedDashboard} />
                  <Route path="/attendance" component={LiveAttendance} />
                  <Route path="/schedule" component={Schedule} />
                  <Route path="/students" component={Students} />
                  <Route path="/computers" component={Computers} />
                  <Route path="/reports" component={Reports} />
                  <Route path="/monitoring" component={AttendanceMonitoring} />
                  <Route path="/settings" component={Settings} />
                  <Route component={NotFound} />
                </Switch>
              </main>
            </div>
          </div>

          {/* Mobile Layout */}
          <div className="lg:hidden min-h-screen">
            <TopBar />
            <main className="p-4 space-y-4">
              <Switch>
                <Route path="/" component={EnhancedDashboard} />
                <Route path="/attendance" component={LiveAttendance} />
                <Route path="/schedule" component={Schedule} />
                <Route path="/students" component={Students} />
                <Route path="/computers" component={Computers} />
                <Route path="/reports" component={Reports} />
                <Route path="/monitoring" component={AttendanceMonitoring} />
                <Route path="/settings" component={Settings} />
                <Route component={NotFound} />
              </Switch>
            </main>
          </div>
        </>
      )}
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <WebSocketProvider>
          <TooltipProvider>
            <div className="min-h-screen bg-background text-foreground">
              <Router />
              <Toaster />
              <RealTimeNotifications />
            </div>
          </TooltipProvider>
        </WebSocketProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
