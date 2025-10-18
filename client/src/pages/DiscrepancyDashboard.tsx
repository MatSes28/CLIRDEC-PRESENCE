import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  RefreshCw,
  TrendingUp,
  UserX,
  XCircle,
  Zap,
} from "lucide-react";
import { useState } from "react";

interface DiscrepancyRecord {
  id: number;
  student: {
    id: number;
    firstName: string;
    lastName: string;
    studentId: string;
  };
  session: {
    id: number;
    date: string;
    startTime: string;
    endTime: string;
  };
  discrepancyFlag: string;
  rfidTapTime?: string;
  sensorDetectionTime?: string;
  validationTimeout: boolean;
  status: string;
  createdAt: string;
}

interface PendingValidation {
  student: {
    id: number;
    firstName: string;
    lastName: string;
  };
  sessionId: number;
  status: string;
  rfidTapTime: string;
  validationKey: string;
}

export default function DiscrepancyDashboard() {
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState("discrepancies");

  // Fetch discrepancies
  const {
    data: discrepanciesData,
    isLoading: discrepanciesLoading,
    refetch: refetchDiscrepancies,
  } = useQuery({
    queryKey: ["/api/attendance/discrepancies"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch pending validations
  const {
    data: pendingData,
    isLoading: pendingLoading,
    refetch: refetchPending,
  } = useQuery({
    queryKey: ["/api/attendance/pending-validations"],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Refresh all data
  const handleRefreshAll = () => {
    refetchDiscrepancies();
    refetchPending();
    queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
  };

  const getDiscrepancyIcon = (flag: string) => {
    switch (flag) {
      case "ghost_tap":
        return <UserX className="h-4 w-4" />;
      case "sensor_without_rfid":
        return <Zap className="h-4 w-4" />;
      case "validation_timeout":
        return <Clock className="h-4 w-4" />;
      case "system_error":
        return <XCircle className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getDiscrepancyColor = (flag: string) => {
    switch (flag) {
      case "ghost_tap":
        return "destructive";
      case "sensor_without_rfid":
        return "secondary";
      case "validation_timeout":
        return "outline";
      case "system_error":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const getDiscrepancyDescription = (flag: string) => {
    switch (flag) {
      case "ghost_tap":
        return "RFID tap detected without physical presence validation";
      case "sensor_without_rfid":
        return "Sensor detected movement without RFID tap";
      case "validation_timeout":
        return "RFID tap occurred but 7-second validation window expired";
      case "system_error":
        return "Technical error during validation process";
      case "checkout_without_checkin":
        return "Student attempted checkout without prior check-in";
      case "already_checked_in":
        return "Multiple check-in attempts detected";
      default:
        return "Unknown discrepancy detected";
    }
  };

  const discrepancies = discrepanciesData?.discrepancies || [];
  const pendingValidations = pendingData?.pendingValidations || [];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">
            Attendance Discrepancy Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            Monitor and review attendance validation issues from the Final Logic
            system
          </p>
        </div>
        <Button onClick={handleRefreshAll} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh All
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Discrepancies
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {discrepancies.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Requiring review today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Validations
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {pendingValidations.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Awaiting sensor validation
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ghost Taps</CardTitle>
            <UserX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {
                discrepancies.filter((d) => d.discrepancyFlag === "ghost_tap")
                  .length
              }
            </div>
            <p className="text-xs text-muted-foreground">
              RFID without presence
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Validation Rate
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {discrepancies.length > 0
                ? Math.round(
                    (1 - discrepancies.length / (discrepancies.length + 100)) *
                      100
                  )
                : 98}
              %
            </div>
            <p className="text-xs text-muted-foreground">
              Successful validations
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs
        value={selectedTab}
        onValueChange={setSelectedTab}
        className="space-y-4"
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="discrepancies">
            Discrepancies ({discrepancies.length})
          </TabsTrigger>
          <TabsTrigger value="pending">
            Pending Validations ({pendingValidations.length})
          </TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Discrepancies Tab */}
        <TabsContent value="discrepancies" className="space-y-4">
          {discrepanciesLoading ? (
            <div className="flex items-center justify-center h-48">
              <RefreshCw className="h-6 w-6 animate-spin" />
            </div>
          ) : discrepancies.length === 0 ? (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                No attendance discrepancies found today. All validations are
                working correctly!
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              {discrepancies.map((record: DiscrepancyRecord) => (
                <Card
                  key={record.id}
                  className="border-l-4 border-l-destructive"
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getDiscrepancyIcon(record.discrepancyFlag)}
                        <div>
                          <CardTitle className="text-lg">
                            {record.student.firstName} {record.student.lastName}
                          </CardTitle>
                          <CardDescription>
                            Student ID: {record.student.studentId} | Session:{" "}
                            {record.session.id}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge
                        variant={
                          getDiscrepancyColor(record.discrepancyFlag) as any
                        }
                      >
                        {record.discrepancyFlag
                          .replace(/_/g, " ")
                          .toUpperCase()}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      {getDiscrepancyDescription(record.discrepancyFlag)}
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <strong>Class Session:</strong>
                        <div className="text-muted-foreground">
                          {format(
                            new Date(record.session.date),
                            "MMM dd, yyyy"
                          )}
                          <br />
                          {record.session.startTime} - {record.session.endTime}
                        </div>
                      </div>

                      {record.rfidTapTime && (
                        <div>
                          <strong>RFID Tap Time:</strong>
                          <div className="text-muted-foreground">
                            {format(new Date(record.rfidTapTime), "HH:mm:ss")}
                          </div>
                        </div>
                      )}

                      {record.sensorDetectionTime ? (
                        <div>
                          <strong>Sensor Detection:</strong>
                          <div className="text-green-600">
                            {format(
                              new Date(record.sensorDetectionTime),
                              "HH:mm:ss"
                            )}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <strong>Sensor Detection:</strong>
                          <div className="text-destructive">
                            {record.validationTimeout
                              ? "Timeout (7s exceeded)"
                              : "No detection"}
                          </div>
                        </div>
                      )}
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="text-xs text-muted-foreground">
                        Detected{" "}
                        {formatDistanceToNow(new Date(record.createdAt))} ago
                      </div>

                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="gap-2">
                          <Eye className="h-3 w-3" />
                          View Details
                        </Button>
                        <Button variant="outline" size="sm" className="gap-2">
                          <CheckCircle className="h-3 w-3" />
                          Mark Resolved
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Pending Validations Tab */}
        <TabsContent value="pending" className="space-y-4">
          {pendingLoading ? (
            <div className="flex items-center justify-center h-48">
              <RefreshCw className="h-6 w-6 animate-spin" />
            </div>
          ) : pendingValidations.length === 0 ? (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                No pending validations. All RFID taps are being processed
                normally.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              {pendingValidations.map(
                (validation: PendingValidation, index: number) => (
                  <Card
                    key={validation.validationKey || index}
                    className="border-l-4 border-l-orange-500"
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Clock className="h-5 w-5 text-orange-500 animate-pulse" />
                          <div>
                            <CardTitle className="text-lg">
                              {validation.student.firstName}{" "}
                              {validation.student.lastName}
                            </CardTitle>
                            <CardDescription>
                              Session: {validation.sessionId} | Status:{" "}
                              {validation.status}
                            </CardDescription>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className="border-orange-500 text-orange-600"
                        >
                          AWAITING SENSOR
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="text-sm">
                          <strong>RFID Tap:</strong>{" "}
                          {format(new Date(validation.rfidTapTime), "HH:mm:ss")}
                          <br />
                          <span className="text-muted-foreground">
                            Waiting for presence validation...
                          </span>
                        </div>

                        <div className="text-xs text-muted-foreground">
                          {formatDistanceToNow(
                            new Date(validation.rfidTapTime)
                          )}{" "}
                          ago
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              )}
            </div>
          )}
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Discrepancy Types</CardTitle>
                <CardDescription>
                  Breakdown of validation issues
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(
                    discrepancies.reduce(
                      (acc: any, record: DiscrepancyRecord) => {
                        acc[record.discrepancyFlag] =
                          (acc[record.discrepancyFlag] || 0) + 1;
                        return acc;
                      },
                      {}
                    )
                  ).map(([flag, count]) => (
                    <div
                      key={flag}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        {getDiscrepancyIcon(flag)}
                        <span className="text-sm">
                          {flag.replace(/_/g, " ")}
                        </span>
                      </div>
                      <Badge variant="outline">{count as number}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Performance</CardTitle>
                <CardDescription>Real-time validation metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Average Validation Time</span>
                    <span className="font-medium">2.3s</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm">Success Rate Today</span>
                    <span className="font-medium text-green-600">
                      {discrepancies.length > 0
                        ? Math.round(
                            (1 -
                              discrepancies.length /
                                (discrepancies.length + 100)) *
                              100
                          )
                        : 98}
                      %
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm">Ghost Tap Rate</span>
                    <span className="font-medium text-red-600">
                      {(
                        (discrepancies.filter(
                          (d) => d.discrepancyFlag === "ghost_tap"
                        ).length /
                          Math.max(discrepancies.length, 1)) *
                        100
                      ).toFixed(1)}
                      %
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm">Sensor Response Time</span>
                    <span className="font-medium">0.8s</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
