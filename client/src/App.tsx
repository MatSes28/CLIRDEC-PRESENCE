import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import AuthPage from "@/pages/AuthPage";
import Dashboard from "@/pages/Dashboard";
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

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Switch>
      {!isAuthenticated ? (
        <Route path="/" component={AuthPage} />
      ) : (
        <>
          <div className="flex min-h-screen">
            <Sidebar />
            <div className="flex-1 ml-64">
              <TopBar />
              <main className="flex-1">
                <Switch>
                  <Route path="/" component={Dashboard} />
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
        </>
      )}
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
