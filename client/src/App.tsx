import { lazy, Suspense } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { ThemeProvider } from "@/components/ThemeProvider";
import { WebSocketProvider } from "@/components/WebSocketProvider";
import TourProvider from "@/components/TourProvider";
import SessionTimeout from "@/components/SessionTimeout";

const AuthPage = lazy(() => import("@/pages/AuthPage"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const EnhancedDashboard = lazy(() => import("@/pages/EnhancedDashboard"));
const LiveAttendance = lazy(() => import("@/pages/LiveAttendance"));
const Schedule = lazy(() => import("@/pages/Schedule"));
const Students = lazy(() => import("@/pages/Students"));
const ClassRoster = lazy(() => import("@/pages/ClassRoster"));
const Computers = lazy(() => import("@/pages/Computers"));
const Reports = lazy(() => import("@/pages/Reports"));
const Settings = lazy(() => import("@/pages/Settings"));
const UserManagement = lazy(() => import("@/pages/UserManagement"));
const AttendanceMonitoring = lazy(() => import("@/pages/AttendanceMonitoring"));
const IoTDevicesPage = lazy(() => import("@/pages/IoTDevices"));
const SystemHealthPage = lazy(() => import("@/pages/SystemHealth"));
const SystemTestingPage = lazy(() => import("@/pages/SystemTesting"));
const DiscrepancyDashboard = lazy(() => import("@/pages/DiscrepancyDashboard"));
const Compliance = lazy(() => import("@/pages/Compliance"));
const HelpCenter = lazy(() => import("@/pages/HelpCenter"));
const NotFound = lazy(() => import("@/pages/not-found"));

const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="text-center">
      <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-primary/10 flex items-center justify-center animate-pulse">
        <div className="w-5 h-5 bg-primary/60 rounded-full"></div>
      </div>
      <div className="text-muted-foreground text-sm">Loading...</div>
    </div>
  </div>
);

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
      {/* Public routes - accessible without authentication */}
      <Route path="/reset-password">
        <Suspense fallback={<LoadingFallback />}>
          <ResetPassword />
        </Suspense>
      </Route>
      
      {!isAuthenticated ? (
        <Suspense fallback={<LoadingFallback />}>
          <Route path="/" component={AuthPage} />
          <Route path="/login" component={AuthPage} />
          <Route component={AuthPage} />
        </Suspense>
      ) : (
        <>
          {/* Session Timeout Monitor */}
          <SessionTimeout />
          
          {/* Desktop Layout */}
          <div className="hidden lg:flex min-h-screen">
            <Sidebar />
            <div className="flex-1 ml-80 flex flex-col min-h-screen">
              <TopBar />
              <main className="flex-1 overflow-auto p-8 space-y-8">
                <Suspense fallback={<LoadingFallback />}>
                  <Switch>
                    <Route path="/" component={EnhancedDashboard} />
                    <Route path="/attendance" component={LiveAttendance} />
                    <Route path="/schedule" component={Schedule} />
                    <Route path="/students" component={Students} />
                    <Route path="/roster" component={ClassRoster} />
                    <Route path="/computers" component={Computers} />
                    <Route path="/reports" component={Reports} />
                    <Route path="/users" component={UserManagement} />
                    <Route path="/monitoring" component={AttendanceMonitoring} />
                    <Route path="/iot" component={IoTDevicesPage} />
                    <Route path="/discrepancies" component={DiscrepancyDashboard} />
                    <Route path="/health" component={SystemHealthPage} />
                    <Route path="/testing" component={SystemTestingPage} />
                    <Route path="/compliance" component={Compliance} />
                    <Route path="/help" component={HelpCenter} />
                    <Route path="/settings" component={Settings} />
                    <Route component={NotFound} />
                  </Switch>
                </Suspense>
              </main>
            </div>
          </div>

          {/* Mobile Layout */}
          <div className="lg:hidden min-h-screen">
            <TopBar />
            <main className="p-4 sm:p-6 space-y-4 sm:space-y-6 pb-8">
              <Suspense fallback={<LoadingFallback />}>
                <Switch>
                  <Route path="/" component={EnhancedDashboard} />
                  <Route path="/attendance" component={LiveAttendance} />
                  <Route path="/schedule" component={Schedule} />
                  <Route path="/students" component={Students} />
                  <Route path="/roster" component={ClassRoster} />
                  <Route path="/computers" component={Computers} />
                  <Route path="/reports" component={Reports} />
                  <Route path="/users" component={UserManagement} />
                  <Route path="/monitoring" component={AttendanceMonitoring} />
                  <Route path="/iot" component={IoTDevicesPage} />
                  <Route path="/discrepancies" component={DiscrepancyDashboard} />
                  <Route path="/health" component={SystemHealthPage} />
                  <Route path="/testing" component={SystemTestingPage} />
                  <Route path="/compliance" component={Compliance} />
                  <Route path="/help" component={HelpCenter} />
                  <Route path="/settings" component={Settings} />
                  <Route component={NotFound} />
                </Switch>
              </Suspense>
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
            <TourProvider>
              <div className="min-h-screen bg-background text-foreground">
                <Router />
                <Toaster />
              </div>
            </TourProvider>
          </TooltipProvider>
        </WebSocketProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
