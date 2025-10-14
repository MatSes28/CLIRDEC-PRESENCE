import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";
import { TrendingUp, Users, Calendar, BarChart3, AlertTriangle, Shield, RotateCcw } from "lucide-react";

interface AttendanceData {
  date: string;
  present: number;
  absent: number;
  late: number;
  total: number;
  rate: number;
}

interface StudentPerformance {
  name: string;
  attendanceRate: number;
  totalClasses: number;
  present: number;
  absent: number;
  late: number;
}

const COLORS = {
  present: '#10b981',
  absent: '#ef4444',
  late: '#f59e0b',
  primary: '#2596be'
};

export default function AttendanceCharts() {
  // Get attendance trend data
  const { 
    data: trendData, 
    isLoading: trendLoading, 
    error: trendError,
    refetch: refetchTrend
  } = useQuery({
    queryKey: ['/api/reports/attendance-trend'],
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
    retry: 3,
    staleTime: 2 * 60 * 1000 // 2 minutes
  });

  // Get student performance data
  const { 
    data: studentData, 
    isLoading: studentLoading, 
    error: studentError,
    refetch: refetchStudent
  } = useQuery({
    queryKey: ['/api/reports/student-performance'],
    refetchInterval: 5 * 60 * 1000,
    retry: 3,
    staleTime: 2 * 60 * 1000 // 2 minutes
  });

  // Debug logging (development only)
  if (import.meta.env.DEV) {
    console.log('AttendanceCharts render:', {
      trendData,
      trendLoading,
      trendError: trendError?.message,
      studentData, 
      studentLoading,
      studentError: studentError?.message
    });
  }

  // Check for authentication errors with comprehensive error handling
  const isAuthError = (error: any): boolean => {
    try {
      if (!error || error === null || error === undefined) return false;
      
      // Check message content
      if (error.message && typeof error.message === 'string' && error.message.includes('Unauthorized')) {
        return true;
      }
      
      // Check response status
      if (error.response && typeof error.response === 'object' && error.response.status === 401) {
        return true;
      }
      
      // Check direct status
      if (typeof error === 'object' && error.status === 401) {
        return true;
      }
      
      return false;
    } catch (e) {
      console.error('Error checking auth status:', e);
      return false;
    }
  };

  const hasAuthError = React.useMemo(() => {
    try {
      return isAuthError(trendError) || isAuthError(studentError);
    } catch (e) {
      console.error('Error checking authentication errors:', e);
      return false;
    }
  }, [trendError, studentError]);

  // If there are authentication errors, show auth error component
  if (hasAuthError) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Authentication Required
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-50 flex items-center justify-center">
              <Shield className="h-8 w-8 text-red-500" />
            </div>
            <h3 className="font-medium mb-2">Unable to Access Analytics</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Your session may have expired or you don't have the required permissions to view analytics data.
            </p>
            <Button onClick={() => window.location.reload()} variant="outline">
              <RotateCcw className="h-4 w-4 mr-2" />
              Refresh Page
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Process data for charts with comprehensive NaN protection
  const processedTrendData = useMemo(() => {
    if (!trendData || !Array.isArray(trendData)) {
      console.log('AttendanceCharts: No trend data available');
      return [];
    }
    
    console.log('AttendanceCharts: Processing trend data:', trendData.length, 'items');
    
    const processed = trendData.map((item: any) => {
      const present = safeNumber(item.present, 0);
      const absent = safeNumber(item.absent, 0);
      const late = safeNumber(item.late, 0);
      const rate = safeNumber(item.attendanceRate, 0);
      
      // Ensure rate is within reasonable bounds
      const clampedRate = Math.min(Math.max(rate, 0), 100);
      
      return {
        date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        present: present,
        absent: absent,
        late: late,
        total: present + absent + late,
        rate: clampedRate
      };
    });
    
    console.log('AttendanceCharts: Processed trend data:', processed);
    return processed;
  }, [trendData]);

  const statusDistribution = useMemo(() => {
    if (!processedTrendData.length) {
      console.log('AttendanceCharts: No trend data for status distribution');
      return [];
    }
    
    const totals = processedTrendData.reduce((acc: any, curr: any) => ({
      present: safeNumber(acc.present, 0) + safeNumber(curr.present, 0),
      absent: safeNumber(acc.absent, 0) + safeNumber(curr.absent, 0),
      late: safeNumber(acc.late, 0) + safeNumber(curr.late, 0)
    }), { present: 0, absent: 0, late: 0 });

    const distribution = [
      { name: 'Present', value: safeNumber(totals.present, 0), color: COLORS.present },
      { name: 'Absent', value: safeNumber(totals.absent, 0), color: COLORS.absent },
      { name: 'Late', value: safeNumber(totals.late, 0), color: COLORS.late }
    ];

    console.log('AttendanceCharts: Status distribution:', distribution);
    return distribution;
  }, [processedTrendData]);

  // Helper function to safely convert to number and handle NaN
  const safeNumber = (value: any, defaultValue: number = 0): number => {
    const num = Number(value);
    return (isFinite(num) && !isNaN(num)) ? num : defaultValue;
  };

  const topPerformers = useMemo(() => {
    if (!studentData || !Array.isArray(studentData)) {
      console.log('AttendanceCharts: No student data available');
      return [];
    }
    
    console.log('AttendanceCharts: Processing student data:', studentData.length, 'students');
    
    const processed = studentData
      .map((student: any) => {
        const safeStudent = {
          name: (student.name || '').toString().trim(),
          attendanceRate: safeNumber(student.attendanceRate, 0),
          totalClasses: safeNumber(student.totalClasses, 0),
          present: safeNumber(student.present, 0),
          absent: safeNumber(student.absent, 0),
          late: safeNumber(student.late, 0)
        };
        
        // Additional validation - ensure attendance rate is reasonable
        if (safeStudent.attendanceRate < 0 || safeStudent.attendanceRate > 100) {
          safeStudent.attendanceRate = 0;
        }
        
        return safeStudent;
      })
      .filter((student: any) => student.name && student.name.length > 0)
      .sort((a: any, b: any) => b.attendanceRate - a.attendanceRate)
      .slice(0, 10);
    
    console.log('AttendanceCharts: Processed top performers:', processed);
    return processed;
  }, [studentData]);

  // Loading skeleton component
  const ChartSkeleton = ({ height = "h-80" }: { height?: string }) => (
    <div className={`${height} bg-muted/20 rounded-lg animate-pulse flex items-center justify-center`}>
      <div className="text-center">
        <div className="w-8 h-8 mx-auto mb-4 bg-muted/40 rounded-full animate-pulse"></div>
        <div className="text-sm text-muted-foreground">Loading chart data...</div>
      </div>
    </div>
  );

  // Error component
  const ChartError = ({ 
    title, 
    error, 
    onRetry, 
    testId 
  }: { 
    title: string; 
    error: any; 
    onRetry: () => void; 
    testId: string;
  }) => (
    <div className="h-80 flex items-center justify-center">
      <div className="text-center" data-testid={testId}>
        <div className="w-16 h-16 mx-auto mb-4 bg-destructive/10 rounded-full flex items-center justify-center">
          <BarChart3 className="h-8 w-8 text-destructive" />
        </div>
        <h3 className="font-semibold mb-2 text-destructive">Failed to Load {title}</h3>
        <p className="text-muted-foreground mb-4 text-sm">
          {error?.message || "Unable to fetch data. Please try again."}
        </p>
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm"
          data-testid={`button-retry-${testId}`}
        >
          Try Again
        </button>
      </div>
    </div>
  );

  // Empty state component
  const EmptyChart = ({ title, testId }: { title: string; testId: string }) => (
    <div className="h-80 flex items-center justify-center">
      <div className="text-center" data-testid={testId}>
        <div className="w-16 h-16 mx-auto mb-4 bg-muted/20 rounded-full flex items-center justify-center">
          <BarChart3 className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="font-semibold mb-2">No {title} Data</h3>
        <p className="text-muted-foreground text-sm">
          No data available for this period. Check back later.
        </p>
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" data-testid="analytics-charts-container">
      {/* Attendance Trend */}
      <Card className="lg:col-span-2" data-testid="card-attendance-trend">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Attendance Trends (Last 30 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {trendLoading ? (
            <ChartSkeleton />
          ) : trendError ? (
            <ChartError 
              title="Attendance Trends" 
              error={trendError} 
              onRetry={refetchTrend}
              testId="error-attendance-trend" 
            />
          ) : processedTrendData.length === 0 ? (
            <EmptyChart title="Attendance Trend" testId="empty-attendance-trend" />
          ) : (
            <div className="h-80" data-testid="chart-attendance-trend">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={processedTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  dataKey="date" 
                  stroke="#64748b"
                  fontSize={12}
                />
                <YAxis 
                  stroke="#64748b"
                  fontSize={12}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="present"
                  stackId="1"
                  stroke={COLORS.present}
                  fill={COLORS.present}
                  fillOpacity={0.6}
                  name="Present"
                />
                <Area
                  type="monotone"
                  dataKey="late"
                  stackId="1"
                  stroke={COLORS.late}
                  fill={COLORS.late}
                  fillOpacity={0.6}
                  name="Late"
                />
                <Area
                  type="monotone"
                  dataKey="absent"
                  stackId="1"
                  stroke={COLORS.absent}
                  fill={COLORS.absent}
                  fillOpacity={0.6}
                  name="Absent"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          )}
        </CardContent>
      </Card>

      {/* Attendance Rate Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Attendance Rate Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={processedTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  dataKey="date" 
                  stroke="#64748b"
                  fontSize={12}
                />
                <YAxis 
                  stroke="#64748b"
                  fontSize={12}
                  domain={[0, 100]}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                  formatter={(value: number) => [`${value.toFixed(1)}%`, 'Attendance Rate']}
                />
                <Line
                  type="monotone"
                  dataKey="rate"
                  stroke={COLORS.primary}
                  strokeWidth={3}
                  dot={{ fill: COLORS.primary, strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: COLORS.primary, strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Status Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Overall Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Top Performers */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Top Performing Students
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topPerformers} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  type="number" 
                  domain={[0, 100]}
                  stroke="#64748b"
                  fontSize={12}
                />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  width={100}
                  stroke="#64748b"
                  fontSize={12}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                  formatter={(value: number) => {
                    const safeValue = isFinite(value) && !isNaN(value) ? value : 0;
                    return [`${safeValue.toFixed(1)}%`, 'Attendance Rate'];
                  }}
                />
                <Bar 
                  dataKey="attendanceRate" 
                  fill={COLORS.primary}
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}