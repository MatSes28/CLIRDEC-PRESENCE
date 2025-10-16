import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Lock, UserCheck, Database, FileText, Download, CheckCircle2, AlertTriangle, Clock, Eye } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";

export default function Compliance() {
  const { data: retentionPolicies = [] } = useQuery<any[]>({
    queryKey: ['/api/retention-policies'],
  });

  const { data: auditLogs = [] } = useQuery<any[]>({
    queryKey: ['/api/audit-logs'],
  });

  const complianceFeatures = [
    {
      title: "Audit Logging System",
      description: "ISO 27001 Requirement - Comprehensive activity tracking",
      icon: Eye,
      status: "active",
      details: [
        "All user actions logged (login, logout, create, delete)",
        "IP address and user agent tracking",
        "Timestamp and status recording",
        "Dedicated audit_logs table"
      ]
    },
    {
      title: "Rate Limiting & Brute Force Protection",
      description: "ISO 27001 Security Control",
      icon: Shield,
      status: "active",
      details: [
        "5 failed login attempts per 15-minute window",
        "Automatic account lockout mechanism",
        "IP address monitoring via login_attempts table",
        "Real-time threat detection"
      ]
    },
    {
      title: "Password Security Policy",
      description: "ISO 27001 Access Control",
      icon: Lock,
      status: "active",
      details: [
        "Minimum 8 characters required",
        "Must include uppercase letter",
        "Must include lowercase letter",
        "Must include number and special character",
        "Enforced via Zod validation schema"
      ]
    },
    {
      title: "GDPR Hard Delete",
      description: "Right to be Forgotten Compliance",
      icon: UserCheck,
      status: "active",
      details: [
        "Permanent deletion endpoints for users/students",
        "Requires explicit confirmation token",
        "All deletions logged in audit trail",
        "Soft delete as default, hard delete on request"
      ]
    },
    {
      title: "Privacy Consent Management",
      description: "ISO 27701 Privacy Control",
      icon: FileText,
      status: "active",
      details: [
        "Privacy policy acceptance tracking",
        "Email notification consent logging",
        "Data processing agreements",
        "IP address and user agent recording",
        "Consent version tracking"
      ]
    },
    {
      title: "Data Retention Policies",
      description: "ISO 27701 Data Lifecycle Management",
      icon: Database,
      status: "active",
      details: [
        "Attendance: 5 years (Philippine academic law)",
        "Audit logs: 2 years (ISO 27001)",
        "Email notifications: 1 year",
        "Login attempts: 6 months",
        "Automated cleanup available"
      ]
    }
  ];

  const downloadComplianceReport = () => {
    const report = {
      generatedAt: new Date().toISOString(),
      institution: "Central Luzon State University",
      system: "CLIRDEC: PRESENCE - Attendance Monitoring System",
      complianceStandards: ["ISO 27001:2013", "ISO 27701:2019", "Philippine Data Privacy Act 2012"],
      features: complianceFeatures.map(f => ({
        name: f.title,
        status: f.status,
        details: f.details
      })),
      metrics: {
        totalAuditLogs: auditLogs?.length || 0,
        retentionPolicies: retentionPolicies?.length || 0,
        securityFeatures: complianceFeatures.length
      }
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compliance-report-${format(new Date(), 'yyyy-MM-dd')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Security & Compliance Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              ISO 27001/27701 Compliance • Philippine Data Privacy Act 2012
            </p>
          </div>
          <Button onClick={downloadComplianceReport} data-testid="button-download-report">
            <Download className="mr-2 h-4 w-4" />
            Download Report
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="audit-logs" data-testid="tab-audit-logs">Audit Logs</TabsTrigger>
          <TabsTrigger value="retention" data-testid="tab-retention">Data Retention</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Compliance Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {complianceFeatures.map((feature, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow" data-testid={`card-feature-${index}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <feature.icon className="h-8 w-8 text-[#2596be] mb-2" />
                    <Badge 
                      variant={feature.status === "active" ? "default" : "secondary"}
                      className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                    >
                      {feature.status === "active" ? (
                        <><CheckCircle2 className="mr-1 h-3 w-3" /> Active</>
                      ) : (
                        <><AlertTriangle className="mr-1 h-3 w-3" /> Inactive</>
                      )}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {feature.details.map((detail, idx) => (
                      <li key={idx} className="text-sm text-gray-600 dark:text-gray-400 flex items-start">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span>{detail}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card data-testid="card-audit-stats">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Total Audit Logs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-[#2596be]">{auditLogs?.length || 0}</div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Security events tracked</p>
              </CardContent>
            </Card>

            <Card data-testid="card-retention-stats">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Retention Policies</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-[#2596be]">{retentionPolicies?.length || 0}</div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Active data lifecycle rules</p>
              </CardContent>
            </Card>

            <Card data-testid="card-compliance-stats">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Compliance Features</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-[#2596be]">{complianceFeatures.length}</div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">ISO controls implemented</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="audit-logs">
          <Card>
            <CardHeader>
              <CardTitle>Recent Audit Logs</CardTitle>
              <CardDescription>Security events and user activity tracking</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                {auditLogs && auditLogs.length > 0 ? (
                  <div className="space-y-3">
                    {auditLogs.slice(0, 50).map((log: any) => (
                      <div 
                        key={log.id} 
                        className="flex items-start justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                        data-testid={`audit-log-${log.id}`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">
                              {log.action}
                            </Badge>
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {log.entityType}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            User: {log.userId} • IP: {log.ipAddress}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            {log.userAgent?.substring(0, 80)}...
                          </p>
                        </div>
                        <div className="text-right ml-4">
                          <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                            <Clock className="mr-1 h-3 w-3" />
                            {format(new Date(log.timestamp), 'MMM dd, HH:mm')}
                          </div>
                          <Badge 
                            variant={log.status === "success" ? "default" : "destructive"}
                            className="mt-1"
                          >
                            {log.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    No audit logs available
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="retention">
          <Card>
            <CardHeader>
              <CardTitle>Data Retention Policies</CardTitle>
              <CardDescription>Automated data lifecycle management (ISO 27701 compliance)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {retentionPolicies && retentionPolicies.length > 0 ? (
                  retentionPolicies.map((policy: any) => (
                    <div 
                      key={policy.id} 
                      className="flex items-start justify-between p-4 border rounded-lg"
                      data-testid={`retention-policy-${policy.id}`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {policy.entityType}
                          </h3>
                          <Badge variant={policy.autoDelete ? "default" : "secondary"}>
                            {policy.autoDelete ? "Auto-Delete ON" : "Manual Only"}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                          {policy.description}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Retention: {policy.retentionPeriodMonths} months
                          {policy.lastCleanupAt && ` • Last cleanup: ${format(new Date(policy.lastCleanupAt), 'MMM dd, yyyy')}`}
                        </p>
                      </div>
                      <div className="text-3xl font-bold text-[#2596be]">
                        {policy.retentionPeriodMonths}
                        <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-1">mo</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    No retention policies configured
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
