import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { TrendingUp, Users, Calendar, BarChart3 } from "lucide-react";

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
    refetchInterval: 5 * 60 * 1000 // Refresh every 5 minutes
  });

  // Get student performance data
  const { 
    data: studentData, 
    isLoading: studentLoading, 
    error: studentError,
    refetch: refetchStudent
  } = useQuery({
    queryKey: ['/api/reports/student-performance'],
    refetchInterval: 5 * 60 * 1000
  });

  // Process data for charts
  const processedTrendData = useMemo(() => {
    if (!trendData || !Array.isArray(trendData)) return [];
    
    return trendData.map((item: any) => {
      const present = Number(item.present) || 0;
      const absent = Number(item.absent) || 0;
      const late = Number(item.late) || 0;
      const rate = Number(item.attendanceRate) || 0;
      
      return {
        date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        present,
        absent,
        late,
        total: present + absent + late,
        rate: isFinite(rate) ? rate : 0
      };
    });
  }, [trendData]);

  const statusDistribution = useMemo(() => {
    if (!processedTrendData.length) return [];
    
    const totals = processedTrendData.reduce((acc: any, curr: any) => ({
      present: acc.present + curr.present,
      absent: acc.absent + curr.absent,
      late: acc.late + curr.late
    }), { present: 0, absent: 0, late: 0 });

    return [
      { name: 'Present', value: totals.present, color: COLORS.present },
      { name: 'Absent', value: totals.absent, color: COLORS.absent },
      { name: 'Late', value: totals.late, color: COLORS.late }
    ];
  }, [processedTrendData]);

  const topPerformers = useMemo(() => {
    if (!studentData || !Array.isArray(studentData)) return [];
    
    return studentData
      .map((student: any) => {
        const rate = Number(student.attendanceRate);
        return {
          ...student,
          attendanceRate: isFinite(rate) && !isNaN(rate) && rate >= 0 ? rate : 0,
          totalClasses: Number(student.totalClasses) || 0,
          presentClasses: Number(student.presentClasses) || 0
        };
      })
      .filter((student: StudentPerformance) => student.name && student.name.trim() !== '')
      .sort((a: StudentPerformance, b: StudentPerformance) => b.attendanceRate - a.attendanceRate)
      .slice(0, 10);
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