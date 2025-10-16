import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { 
  HelpCircle, 
  Search, 
  BookOpen, 
  Users, 
  Calendar, 
  Smartphone,
  GraduationCap,
  BarChart3,
  Shield,
  Mail,
  Video,
  FileText
} from "lucide-react";
import { useTour } from "@/components/TourProvider";

export default function HelpCenter() {
  const [searchTerm, setSearchTerm] = useState("");
  const { startTour } = useTour();

  const faqCategories = [
    {
      category: "Getting Started",
      icon: BookOpen,
      questions: [
        {
          q: "How do I add my first student?",
          a: "Navigate to the 'Students' page from the sidebar, click the 'Add Student' button in the top-right corner, and fill in the student information including their name, student ID, year level, and parent contact details. You can also register their RFID card at this time."
        },
        {
          q: "What is an RFID card and why do I need it?",
          a: "An RFID card is a contactless smart card that students tap on the reader to mark their attendance automatically. Each student needs a unique RFID card registered in the system. This eliminates manual attendance taking and ensures accurate time tracking."
        },
        {
          q: "How do I start taking attendance for my class?",
          a: "Go to 'Live Attendance', select your subject and section, then click 'Start Session'. Students can now tap their RFID cards to mark their attendance. The system will automatically record who is present, late, or absent."
        },
        {
          q: "Can I see the system tour again?",
          a: "Yes! Click the blue help button (?) in the bottom-right corner of any page, then select 'System Overview' to replay the welcome tour. You can also start page-specific tours from the same menu."
        }
      ]
    },
    {
      category: "Student Management",
      icon: GraduationCap,
      questions: [
        {
          q: "How do I edit student information?",
          a: "Go to the 'Students' page, find the student in the list, and click the 'Edit' button (pencil icon) next to their name. You can update any information including parent contact details and RFID cards."
        },
        {
          q: "What should I do if a student loses their RFID card?",
          a: "Edit the student's profile and update the 'RFID Card ID' field with the new card number. You can use the RFID Registration Helper to scan the new card directly, or enter the ID manually."
        },
        {
          q: "How do I contact a student's parent or guardian?",
          a: "On the 'Students' page, click the envelope icon next to the student's name. This opens a contact form where you can send an email directly to the registered parent email address."
        },
        {
          q: "Can I import multiple students at once?",
          a: "Yes! Click the 'Import' button on the Students page. You can upload a CSV file with student information. Download the template first to see the required format."
        }
      ]
    },
    {
      category: "Attendance Tracking",
      icon: Calendar,
      questions: [
        {
          q: "What happens if a student arrives late?",
          a: "The system automatically marks students as 'Late' if they tap their RFID card after the class start time. You can configure the late threshold in Settings. Parents will be notified if configured."
        },
        {
          q: "How do I manually mark a student present if they forgot their RFID card?",
          a: "During an active class session on the 'Live Attendance' page, you can click the student's name and manually mark them as present. Always add a note explaining why (e.g., 'Forgot RFID card')."
        },
        {
          q: "Can I see attendance history for a specific student?",
          a: "Yes! Go to the 'Students' page, click the eye icon next to the student's name to view their profile, which includes their complete attendance history and statistics."
        },
        {
          q: "What are attendance reports and how do I generate them?",
          a: "Go to the 'Reports' page and select the date range, class, and report type you need. You can export attendance data as PDF or CSV files for record-keeping or analysis."
        }
      ]
    },
    {
      category: "RFID & IoT Devices",
      icon: Smartphone,
      questions: [
        {
          q: "How do I set up the ESP32 RFID reader?",
          a: "Go to 'IoT Devices' and follow the setup wizard. You'll need to connect your ESP32 to WiFi, configure it with the classroom information, and test the RFID reader. Full instructions with diagrams are provided."
        },
        {
          q: "What should I do if the RFID reader isn't working?",
          a: "Check the 'System Health' page to see if your device is connected. Common issues: 1) Device not powered on, 2) Wrong WiFi credentials, 3) RFID reader not properly connected. Try restarting the device first."
        },
        {
          q: "Can I have multiple RFID readers in one classroom?",
          a: "Yes! You can register multiple ESP32 devices for the same classroom. This is useful for large classes where students need multiple entry points. Each tap is recorded only once per session."
        },
        {
          q: "How do I register RFID cards during student enrollment?",
          a: "When adding a student, use the 'RFID Registration Helper' section. Connect your ESP32 via USB in Registration Mode, run the provided Python script, then tap the student's card. The ID will automatically fill in."
        }
      ]
    },
    {
      category: "Email Notifications",
      icon: Mail,
      questions: [
        {
          q: "When do parents receive email notifications?",
          a: "Parents automatically receive emails when: 1) Their child is absent, 2) Their child arrives late, 3) Their child has multiple consecutive absences. You can configure these settings in the 'Settings' page."
        },
        {
          q: "How do I send a manual message to a parent?",
          a: "Go to the 'Students' page, find the student, and click the envelope icon. Write your message and click 'Send'. The parent will receive it at their registered email address."
        },
        {
          q: "Can I see which emails have been sent?",
          a: "Yes! The 'Monitoring' page (Admin only) shows all email notifications that have been queued and sent, including delivery status and timestamps."
        },
        {
          q: "What if a parent's email address is wrong?",
          a: "Edit the student's profile and update the 'Parent/Guardian Email' field with the correct address. Future notifications will be sent to the new email."
        }
      ]
    },
    {
      category: "Reports & Analytics",
      icon: BarChart3,
      questions: [
        {
          q: "What types of reports can I generate?",
          a: "You can generate: 1) Daily attendance summaries, 2) Student attendance rates, 3) Class performance reports, 4) Tardiness reports, 5) Absence trends. All reports can be exported as PDF or CSV."
        },
        {
          q: "How do I export attendance data?",
          a: "Go to 'Reports', select your filters (date range, class, section), choose the format (PDF or CSV), and click 'Export'. The file will download immediately to your computer."
        },
        {
          q: "Can I see real-time statistics on the dashboard?",
          a: "Yes! Your dashboard shows today's active classes, current attendance rates, recent activities, and system alerts. It updates automatically when students tap their cards."
        },
        {
          q: "How far back can I view attendance records?",
          a: "Attendance records are stored for 5 years according to Philippine academic regulations. You can generate reports for any date range within this period."
        }
      ]
    },
    {
      category: "System Settings",
      icon: Shield,
      questions: [
        {
          q: "How do I change my password?",
          a: "Click your name in the top-right corner, select 'Settings', and navigate to the 'Account' tab. Click 'Change Password' and follow the prompts. Your new password must meet security requirements."
        },
        {
          q: "Can I add other faculty members to the system?",
          a: "If you're an administrator, go to 'User Management' and click 'Add User'. Enter their information and assign the appropriate role (Faculty or Admin). They'll receive login credentials via email."
        },
        {
          q: "What's the difference between Faculty and Admin roles?",
          a: "Faculty can manage their own classes, students, and attendance. Admins have full system access including user management, system settings, compliance features, and IoT device configuration."
        },
        {
          q: "How do I configure the late arrival time?",
          a: "Go to 'Settings' → 'Attendance Policies' and set the 'Late Arrival Threshold' (e.g., 15 minutes after class start). Students tapping after this time will be marked as late."
        }
      ]
    },
    {
      category: "Troubleshooting",
      icon: HelpCircle,
      questions: [
        {
          q: "The system says I'm not authenticated. What should I do?",
          a: "Click 'Logout' from the user menu, close your browser, and log in again. If the problem persists, clear your browser cache and cookies, then try again."
        },
        {
          q: "Why can't I see some menu options?",
          a: "Some features are role-specific. Faculty members see class management features, while Admins have additional options like User Management, Compliance, and System Monitoring."
        },
        {
          q: "The page is loading slowly. What can I do?",
          a: "Slow loading can be caused by: 1) Poor internet connection, 2) Large amounts of data being loaded, 3) Multiple users accessing simultaneously. Try refreshing the page or accessing during off-peak hours."
        },
        {
          q: "I accidentally deleted something. Can I recover it?",
          a: "Contact your system administrator immediately. They can check the audit logs and potentially restore data from backups. Deleted items are not immediately removed from the database."
        },
        {
          q: "Who do I contact for technical support?",
          a: "For technical issues, contact the IT department at support@clsu.edu.ph or visit the IT office in the Administration Building. Include screenshots and error messages when reporting issues."
        }
      ]
    }
  ];

  const quickGuides = [
    {
      title: "Add Your First Student",
      description: "Step-by-step guide to registering a student with RFID",
      icon: Users,
      steps: [
        "Click 'Students' in the sidebar",
        "Click the 'Add Student' button",
        "Fill in student information",
        "Register their RFID card",
        "Add parent contact details",
        "Click 'Add Student'"
      ]
    },
    {
      title: "Start Taking Attendance",
      description: "Begin tracking attendance for your class",
      icon: Calendar,
      steps: [
        "Go to 'Live Attendance'",
        "Select your subject and section",
        "Click 'Start Session'",
        "Students tap their RFID cards",
        "Monitor attendance in real-time",
        "End session when class is over"
      ]
    },
    {
      title: "Generate Reports",
      description: "Export attendance data and analytics",
      icon: BarChart3,
      steps: [
        "Navigate to 'Reports' page",
        "Select date range",
        "Choose class/section",
        "Pick report type",
        "Click 'Export' (PDF or CSV)",
        "Download opens automatically"
      ]
    }
  ];

  const filteredFAQs = faqCategories.map(cat => ({
    ...cat,
    questions: cat.questions.filter(q => 
      q.q.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.a.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(cat => cat.questions.length > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <HelpCircle className="w-7 h-7 text-primary" />
            Help Center
          </h1>
          <p className="text-muted-foreground mt-1">
            Everything you need to know about using CLIRDEC: PRESENCE
          </p>
        </div>
        <Button onClick={() => startTour('firstTimeUser')} variant="outline">
          <Video className="w-4 h-4 mr-2" />
          Watch System Tour
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search for help... (e.g., 'how to add student')"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Quick Start Guides */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          Quick Start Guides
        </h2>
        <div className="grid md:grid-cols-3 gap-4">
          {quickGuides.map((guide, index) => (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                  <guide.icon className="w-5 h-5 text-primary" />
                </div>
                <CardTitle className="text-lg">{guide.title}</CardTitle>
                <CardDescription>{guide.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <ol className="space-y-2 text-sm">
                  {guide.steps.map((step, stepIndex) => (
                    <li key={stepIndex} className="flex items-start gap-2">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                        {stepIndex + 1}
                      </span>
                      <span className="text-muted-foreground">{step}</span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* FAQ Accordion */}
      <div>
        <h2 className="text-xl font-semibold mb-4">
          Frequently Asked Questions
        </h2>
        {filteredFAQs.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No questions found matching "{searchTerm}". Try different keywords.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredFAQs.map((category, catIndex) => (
              <Card key={catIndex}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <category.icon className="w-5 h-5 text-primary" />
                    {category.category}
                    <Badge variant="secondary" className="ml-auto">
                      {category.questions.length} Q&A
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    {category.questions.map((faq, faqIndex) => (
                      <AccordionItem key={faqIndex} value={`${catIndex}-${faqIndex}`}>
                        <AccordionTrigger className="text-left">
                          {faq.q}
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground">
                          {faq.a}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Contact Support */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Still Need Help?
          </CardTitle>
          <CardDescription>
            Can't find what you're looking for? Contact our support team
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Email Support</p>
                <p className="text-sm text-muted-foreground">support@clsu.edu.ph</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Documentation</p>
                <p className="text-sm text-muted-foreground">Visit IT Office - Administration Building</p>
              </div>
            </div>
            <Button className="w-full sm:w-auto mt-4" asChild>
              <a href="mailto:support@clsu.edu.ph">
                Contact IT Support
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
