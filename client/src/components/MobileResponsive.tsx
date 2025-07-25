import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, X } from "lucide-react";
import Sidebar from "@/components/Sidebar";

interface MobileResponsiveProps {
  children: React.ReactNode;
}

export default function MobileResponsive({ children }: MobileResponsiveProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (!isMobile) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen">
      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="fixed top-4 left-4 z-50 lg:hidden"
          >
            <Menu className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-80">
          <Sidebar />
        </SheetContent>
      </Sheet>

      {/* Main Content - adjusted for mobile */}
      <div className="flex-1 lg:ml-80">
        {children}
      </div>
    </div>
  );
}