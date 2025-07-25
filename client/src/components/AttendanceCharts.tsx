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
  const { data: trendData } = useQuery({
    queryKey: ['/api/reports/attendance-trend'],
    refetchInterval: 5 * 60 * 1000 // Refresh every 5 minutes
  });

  // Get student performance data
  const { data: studentData } = useQuery({
    queryKey: ['/api/reports/student-performance'],
    refetchInterval: 5 * 60 * 1000
  });

  // Process data for charts
  const processedTrendData = useMemo(() => {
    if (!trendData || !Array.isArray(trendData)) return [];
    
    return trendData.map((item: any) => ({
      date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      present: item.present || 0,
      absent: item.absent || 0,
      late: item.late || 0,
      total: (item.present || 0) + (item.absent || 0) + (item.late || 0),
      rate: item.attendanceRate || 0
    }));
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
      .sort((a: StudentPerformance, b: StudentPerformance) => b.attendanceRate - a.attendanceRate)
      .slice(0, 10);
  }, [studentData]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Attendance Trend */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Attendance Trends (Last 30 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
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
                  formatter={(value: number) => [`${value.toFixed(1)}%`, 'Attendance Rate']}
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