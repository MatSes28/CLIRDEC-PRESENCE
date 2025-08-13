import { useState, useEffect } from 'react';
import { AlertTriangle, TrendingDown, Clock, Users, Mail, Phone, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

interface AttendanceBehavior {
  student: {
    id: string;
    studentId: string;
    firstName: string;
    lastName: string;
    email: string;
    parentEmail: string;
  };
  behaviorLevel: 'critical' | 'concerning' | 'average' | 'good' | 'excellent';
  attendanceRate: number;
  absences: number;
  lateArrivals: number;
  message: string;
  suggestions: string[];
  lastAttendance: string | null;
}

interface AttendanceBehaviorAlertsProps {
  className?: string;
  showCriticalOnly?: boolean;
}

export default function AttendanceBehaviorAlerts({ 
  className, 
  showCriticalOnly = false 
}: AttendanceBehaviorAlertsProps) {
  const [selectedAlert, setSelectedAlert] = useState<string | null>(null);

  const { data: behaviorData, isLoading, error } = useQuery({
    queryKey: ['/api/attendance/behavior-analysis'],
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
    retry: 2,
    staleTime: 2 * 60 * 1000, // Consider data stale after 2 minutes
  });

  const behaviorArray = Array.isArray(behaviorData) ? behaviorData : [];
  const criticalAlerts = behaviorArray.filter((item: AttendanceBehavior) => 
    item.behaviorLevel === 'critical' || item.behaviorLevel === 'concerning'
  );

  const displayAlerts = showCriticalOnly ? criticalAlerts : behaviorArray;

  const getAlertColor = (level: string) => {
    switch (level) {
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800';
      case 'concerning':
        return 'text-orange-600 bg-orange-50 border-orange-200 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-800';
      case 'average':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-400 dark:border-yellow-800';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200 dark:bg-gray-950 dark:text-gray-400 dark:border-gray-800';
    }
  };

  const getAlertIcon = (level: string) => {
    switch (level) {
      case 'critical':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'concerning':
        return <TrendingDown className="h-5 w-5 text-orange-500" />;
      case 'average':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      default:
        return <Users className="h-5 w-5 text-green-500" />;
    }
  };

  const getBadgeVariant = (level: string) => {
    switch (level) {
      case 'critical':
        return 'destructive' as const;
      case 'concerning':
        return 'secondary' as const;
      case 'average':
        return 'outline' as const;
      default:
        return 'default' as const;
    }
  };

  const sendNotificationEmail = async (studentId: string) => {
    try {
      // This would integrate with your email notification system
      console.log(`Sending notification email for student ${studentId}`);
      // Add API call here
    } catch (error) {
      console.error('Failed to send notification email:', error);
    }
  };

  const contactParent = async (parentEmail: string) => {
    try {
      // This would integrate with your parent contact system
      console.log(`Contacting parent at ${parentEmail}`);
      // Add API call here
    } catch (error) {
      console.error('Failed to contact parent:', error);
    }
  };

  if (isLoading) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-primary" />
            <span>Attendance Behavior Alerts</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            <span>Error Loading Alerts</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Unable to load attendance behavior data. Please try again later.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-primary" />
            <span>Attendance Behavior Alerts</span>
            {criticalAlerts.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {criticalAlerts.length} Critical
              </Badge>
            )}
          </div>
          <Badge variant="outline" className="text-xs">
            Updated {new Date().toLocaleTimeString()}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-0">
        <ScrollArea className="h-[500px]">
          {displayAlerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground p-6">
              <Users className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm text-center">
                {showCriticalOnly 
                  ? "No critical attendance issues detected" 
                  : "No attendance data available"
                }
              </p>
            </div>
          ) : (
            <div className="space-y-2 p-4">
              {displayAlerts.map((alert: AttendanceBehavior, index: number) => (
                <div key={alert.student.id}>
                  <div
                    className={cn(
                      "p-4 rounded-lg border transition-all duration-200 cursor-pointer hover:shadow-md",
                      getAlertColor(alert.behaviorLevel),
                      selectedAlert === alert.student.id && "ring-2 ring-primary/50"
                    )}
                    onClick={() => setSelectedAlert(
                      selectedAlert === alert.student.id ? null : alert.student.id
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <div className="mt-0.5">
                          {getAlertIcon(alert.behaviorLevel)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-2">
                            <h4 className="font-semibold text-foreground">
                              {alert.student.firstName} {alert.student.lastName}
                            </h4>
                            <Badge 
                              variant={getBadgeVariant(alert.behaviorLevel)}
                              className="text-xs"
                            >
                              {alert.behaviorLevel.toUpperCase()}
                            </Badge>
                          </div>
                          
                          <p className="text-sm font-medium mb-2">
                            {alert.message}
                          </p>
                          
                          <div className="grid grid-cols-3 gap-4 text-xs text-muted-foreground mb-2">
                            <div>
                              <span className="font-medium">Attendance:</span> {alert.attendanceRate}%
                            </div>
                            <div>
                              <span className="font-medium">Absences:</span> {alert.absences}
                            </div>
                            <div>
                              <span className="font-medium">Late:</span> {alert.lateArrivals}
                            </div>
                          </div>
                          
                          {alert.lastAttendance && (
                            <p className="text-xs text-muted-foreground">
                              Last attended: {new Date(alert.lastAttendance).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-1 ml-4">
                        {(alert.behaviorLevel === 'critical' || alert.behaviorLevel === 'concerning') && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                sendNotificationEmail(alert.student.id);
                              }}
                              className="h-7 px-2"
                            >
                              <Mail className="h-3 w-3 mr-1" />
                              Email
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                contactParent(alert.student.parentEmail);
                              }}
                              className="h-7 px-2"
                            >
                              <Phone className="h-3 w-3 mr-1" />
                              Parent
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    
                    {selectedAlert === alert.student.id && (
                      <>
                        <Separator className="my-3" />
                        <div className="space-y-2">
                          <h5 className="text-sm font-medium">Recommended Actions:</h5>
                          <ul className="text-xs text-muted-foreground space-y-1">
                            {alert.suggestions.map((suggestion, i) => (
                              <li key={i} className="flex items-start space-x-2">
                                <span className="text-primary font-bold">•</span>
                                <span>{suggestion}</span>
                              </li>
                            ))}
                          </ul>
                          
                          <div className="flex items-center space-x-2 pt-2">
                            <Badge variant="outline" className="text-xs">
                              ID: {alert.student.studentId}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              Email: {alert.student.email}
                            </Badge>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  
                  {index < displayAlerts.length - 1 && (
                    <Separator className="my-2 opacity-30" />
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}