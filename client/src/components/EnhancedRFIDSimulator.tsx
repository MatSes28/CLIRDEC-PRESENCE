import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  CheckCircle,
  CreditCard,
  Radar,
  Wifi,
  WifiOff,
  XCircle,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";

interface RFIDTapResult {
  success: boolean;
  message: string;
  studentName?: string;
  status?: "present" | "late" | "duplicate";
}

export default function EnhancedRFIDSimulator() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [readerStatus, setReaderStatus] = useState<
    "online" | "offline" | "scanning"
  >("online");
  const [proximityEnabled, setProximityEnabled] = useState(true);
  const [autoScanMode, setAutoScanMode] = useState(false);
  const [tapAnimation, setTapAnimation] = useState(false);
  const [lastTap, setLastTap] = useState<RFIDTapResult | null>(null);
  const [cardId, setCardId] = useState("");

  // Simulate RFID tap
  const rfidTapMutation = useMutation({
    mutationFn: async (rfidCard: string) => {
      const response = (await apiRequest("POST", "/api/rfid/simulate", {
        rfidCardId: rfidCard,
        sessionId: 16, // Use active session ID
      })) as unknown as RFIDTapResult;
      return response;
    },
    onSuccess: (data: RFIDTapResult) => {
      setLastTap(data);
      setTapAnimation(true);

      // Show success/error toast
      toast({
        title: data.success ? "RFID Tap Successful" : "RFID Tap Failed",
        description: `${data.studentName || "Unknown"}: ${data.message}`,
        variant: data.success ? "default" : "destructive",
        duration: 3000,
      });

      // Refresh attendance data
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });

      // Reset animation
      setTimeout(() => setTapAnimation(false), 2000);
    },
    onError: (error: any) => {
      toast({
        title: "RFID Error",
        description: error.message || "Failed to process RFID tap",
        variant: "destructive",
      });
    },
  });

  // Auto-scan simulation
  useEffect(() => {
    if (!autoScanMode) return;

    const interval = setInterval(() => {
      const sampleCards = [
        "RFID001",
        "RFID002",
        "RFID003",
        "RFID004",
        "RFID005",
      ];
      const randomCard =
        sampleCards[Math.floor(Math.random() * sampleCards.length)];

      setReaderStatus("scanning");
      setTimeout(() => {
        rfidTapMutation.mutate(randomCard);
        setReaderStatus("online");
      }, 1000);
    }, 5000);

    return () => clearInterval(interval);
  }, [autoScanMode]);

  const handleManualTap = () => {
    if (!cardId.trim()) {
      toast({
        title: "Invalid Card",
        description: "Please enter a valid RFID card ID",
        variant: "destructive",
      });
      return;
    }

    setReaderStatus("scanning");
    setTimeout(() => {
      rfidTapMutation.mutate(cardId);
      setReaderStatus("online");
    }, 800);
  };

  const getStatusColor = () => {
    switch (readerStatus) {
      case "online":
        return "bg-green-500";
      case "scanning":
        return "bg-blue-500 animate-pulse";
      case "offline":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusIcon = () => {
    switch (readerStatus) {
      case "online":
        return <Wifi className="h-4 w-4" />;
      case "scanning":
        return <Radar className="h-4 w-4 animate-spin" />;
      case "offline":
        return <WifiOff className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  return (
    <Card className="relative overflow-hidden">
      {/* Tap animation overlay */}
      {tapAnimation && (
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-green-500/20 animate-pulse z-10 rounded-lg" />
      )}

      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            RFID Attendance Scanner
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
            <Badge variant="outline" className="text-xs">
              {getStatusIcon()}
              {readerStatus.toUpperCase()}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Scanner Visual */}
        <div className="relative">
          <div
            className={`
            w-full h-32 rounded-xl border-2 border-dashed 
            ${
              readerStatus === "scanning"
                ? "border-blue-500 bg-blue-50"
                : "border-gray-300 bg-gray-50"
            }
            flex flex-col items-center justify-center transition-all duration-300
            ${tapAnimation ? "scale-105 shadow-lg" : ""}
          `}
          >
            <div
              className={`
              w-16 h-16 rounded-full border-4 mb-2
              ${
                readerStatus === "scanning"
                  ? "border-blue-500 animate-pulse"
                  : "border-gray-400"
              }
              flex items-center justify-center
            `}
            >
              {readerStatus === "scanning" ? (
                <Zap className="h-8 w-8 text-blue-500 animate-bounce" />
              ) : (
                <CreditCard className="h-8 w-8 text-gray-400" />
              )}
            </div>
            <p className="text-sm text-gray-600 font-medium">
              {readerStatus === "scanning"
                ? "Scanning..."
                : "Tap RFID Card Here"}
            </p>
          </div>

          {/* Scanning lines animation */}
          {readerStatus === "scanning" && (
            <div className="absolute inset-0 overflow-hidden rounded-xl">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent animate-pulse" />
              <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent animate-pulse" />
            </div>
          )}
        </div>

        {/* Last Tap Result */}
        {lastTap && (
          <div
            className={`
            p-4 rounded-lg border-l-4
            ${
              lastTap.success
                ? "bg-green-50 border-green-500 text-green-800"
                : "bg-red-50 border-red-500 text-red-800"
            }
          `}
          >
            <div className="flex items-center gap-2 mb-1">
              {lastTap.success ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              <span className="font-medium">
                {lastTap.success ? "Attendance Recorded" : "Tap Failed"}
              </span>
            </div>
            <p className="text-sm">
              {lastTap.studentName && `${lastTap.studentName}: `}
              {lastTap.message}
            </p>
            {lastTap.status && (
              <Badge variant="secondary" className="mt-2">
                {lastTap.status.charAt(0).toUpperCase() +
                  lastTap.status.slice(1)}
              </Badge>
            )}
          </div>
        )}

        {/* Manual Controls */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cardId">Manual RFID Input</Label>
            <div className="flex gap-2">
              <Input
                id="cardId"
                placeholder="Enter RFID card ID (e.g., RFID001)"
                value={cardId}
                onChange={(e) => setCardId(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleManualTap()}
              />
              <Button
                onClick={handleManualTap}
                disabled={
                  rfidTapMutation.isPending || readerStatus === "scanning"
                }
                size="sm"
              >
                <Zap className="h-4 w-4 mr-1" />
                Tap
              </Button>
            </div>
          </div>

          {/* Settings */}
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">
                  Proximity Validation
                </Label>
                <p className="text-xs text-muted-foreground">
                  Require physical proximity sensor validation
                </p>
              </div>
              <Switch
                checked={proximityEnabled}
                onCheckedChange={setProximityEnabled}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Auto-Scan Mode</Label>
                <p className="text-xs text-muted-foreground">
                  Simulate random student taps every 5 seconds
                </p>
              </div>
              <Switch
                checked={autoScanMode}
                onCheckedChange={setAutoScanMode}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Reader Status</Label>
                <p className="text-xs text-muted-foreground">
                  Simulate reader online/offline
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setReaderStatus(
                    readerStatus === "online" ? "offline" : "online"
                  )
                }
              >
                Toggle Status
              </Button>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => rfidTapMutation.mutate("RFID001")}
              disabled={rfidTapMutation.isPending}
            >
              Test Card 1
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => rfidTapMutation.mutate("RFID002")}
              disabled={rfidTapMutation.isPending}
            >
              Test Card 2
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
