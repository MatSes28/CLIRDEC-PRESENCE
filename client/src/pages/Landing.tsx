import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center" 
         style={{ 
           background: "linear-gradient(135deg, hsl(207, 90%, 54%) 0%, hsl(207, 90%, 40%) 100%)"
         }}>
      <Card className="w-full max-w-md mx-4 shadow-2xl">
        <CardContent className="pt-8 pb-8 px-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary rounded-full mx-auto mb-4 flex items-center justify-center">
              <GraduationCap className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">CLIRDEC: PRESENCE</h1>
            <p className="text-gray-600 text-sm">Central Luzon State University</p>
            <p className="text-gray-500 text-xs mt-1">Attendance Monitoring System</p>
          </div>
          
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-lg font-semibold text-gray-800 mb-2">Faculty Portal</h2>
              <p className="text-gray-600 text-sm mb-6">
                Access your attendance monitoring dashboard and manage your classes
              </p>
            </div>

            <Button 
              onClick={handleLogin}
              className="w-full bg-primary hover:bg-primary/90 text-white py-3 text-base font-medium"
            >
              Sign In with University Account
            </Button>
            
            <div className="text-center space-y-2">
              <p className="text-xs text-gray-500">
                Contact IT Support for account assistance
              </p>
              <div className="flex items-center justify-center space-x-4 text-xs text-gray-400">
                <span>Department of Information Technology</span>
                <span>•</span>
                <span>College of Engineering</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="absolute bottom-4 left-4 right-4 text-center">
        <p className="text-white/80 text-sm">
          Proximity and RFID-Enabled Smart Entry for Notation of Classroom Engagement
        </p>
      </div>
    </div>
  );
}
