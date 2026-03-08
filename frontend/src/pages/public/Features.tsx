import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { School, Users, BookOpen, ClipboardCheck, Calendar, CreditCard, Shield, BarChart3, Heart, Library, Bell, GraduationCap, Monitor, Truck, Home, MessageSquare } from "lucide-react";

const modules = [
  { icon: Users, title: "Student Management", desc: "Complete student lifecycle from admission to alumni. CBC-ready profiles, guardian linkage, ID card generation, promotions, transfers, houses & clubs allocation.", color: "bg-primary/10 text-primary" },
  { icon: GraduationCap, title: "Staff & HR", desc: "Staff profiles, workload tracking, leave management, duty rosters, appraisals, payroll integration, document management and ID card generation.", color: "bg-info/10 text-info" },
  { icon: BookOpen, title: "CBC Academics", desc: "Learning areas, strands, sub-strands, competencies & rubrics. Scheme of work, lesson plans, portfolio evidence, competency progress tracking.", color: "bg-success/10 text-success" },
  { icon: ClipboardCheck, title: "Assessments & Exams", desc: "Question bank with tagging, blueprints, auto-generate papers, mark entry, moderation workflow, results publishing, analytics & report cards.", color: "bg-secondary/20 text-secondary-foreground" },
  { icon: Calendar, title: "Smart Timetable", desc: "Teacher availability, room allocation, auto-generation with clash detection, substitute management, and multiple view modes.", color: "bg-warning/10 text-warning" },
  { icon: CreditCard, title: "Finance & Fees", desc: "Fee structures, billing cycles, bulk invoicing, M-Pesa payments, arrears tracking, bursaries, refunds, statements and cashbook reports.", color: "bg-primary/10 text-primary" },
  { icon: Shield, title: "RBAC & Security", desc: "Custom roles, granular permissions (MODULE:ACTION format), audit logs, tenant isolation with PostgreSQL RLS, and secure authentication.", color: "bg-destructive/10 text-destructive" },
  { icon: BarChart3, title: "Reports & Analytics", desc: "Academic performance, attendance summaries, financial reports, library stats, clinic data. Export to CSV, XLSX, and PDF.", color: "bg-info/10 text-info" },
  { icon: Heart, title: "School Clinic", desc: "Student medical profiles, visit logs, medication tracking, referrals, sickbay admissions, allergy/chronic condition alerts.", color: "bg-destructive/10 text-destructive" },
  { icon: Library, title: "Library System", desc: "Book catalog, issue/return, fine calculation, overdue tracking, borrowing history, inventory stock-take.", color: "bg-success/10 text-success" },
  { icon: Monitor, title: "LMS / E-Learning", desc: "Courses, resource uploads, assignments, submissions, grading, quizzes, discussion boards, student & teacher views.", color: "bg-primary/10 text-primary" },
  { icon: Bell, title: "Attendance", desc: "Daily and lesson-based attendance, session history, chronic absentee lists, late/early departure logs, parent visibility.", color: "bg-warning/10 text-warning" },
  { icon: MessageSquare, title: "Communications", desc: "Announcements, targeted messaging, notification templates, consent forms, emergency broadcasts, SMS & email integration.", color: "bg-info/10 text-info" },
  { icon: Truck, title: "Transport & Boarding", desc: "Routes, bus rosters, trip manifests, fuel logs. Dorm allocation, roll calls, duty rosters, boarding incidents.", color: "bg-success/10 text-success" },
  { icon: Home, title: "Assets & Inventory", desc: "Items catalog, stock management, suppliers, reorder alerts, asset register, maintenance tickets.", color: "bg-secondary/20 text-secondary-foreground" },
  { icon: Shield, title: "Discipline & Counselling", desc: "Incident reporting, merit/demerit system, detentions, counselling sessions, parent acknowledgement workflow.", color: "bg-destructive/10 text-destructive" },
];

export default function Features() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center">
              <School className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-heading text-xl font-bold text-foreground">ShuleCloud</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <Link to="/features" className="text-sm font-medium text-foreground">Features</Link>
            <Link to="/pricing" className="text-sm text-muted-foreground hover:text-foreground">Pricing</Link>
            <Link to="/contact" className="text-sm text-muted-foreground hover:text-foreground">Contact</Link>
          </div>
          <Button size="sm" asChild><Link to="/login">Sign In</Link></Button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h1 className="font-heading text-4xl md:text-5xl font-bold text-foreground">Powerful Features for Modern Schools</h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">16 integrated modules designed specifically for Kenya's CBC curriculum. Every feature your school needs, in one platform.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {modules.map(m => (
            <div key={m.title} className="bg-card border border-border rounded-xl p-6 hover:shadow-card-hover transition-all group">
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${m.color}`}>
                  <m.icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-heading font-semibold text-foreground text-lg mb-1">{m.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{m.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-16">
          <Button size="lg" asChild>
            <Link to="/contact">Get Started Today</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
