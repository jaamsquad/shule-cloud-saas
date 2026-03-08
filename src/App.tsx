import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Public pages
import Landing from "./pages/Landing";
import Pricing from "./pages/Pricing";
import Features from "./pages/Features";
import Contact from "./pages/Contact";
import Status from "./pages/Status";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import TenantResolver from "./pages/TenantResolver";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import AcceptInvite from "./pages/AcceptInvite";

// Owner portal
import OwnerLogin from "./pages/OwnerLogin";
import OwnerDashboard from "./pages/OwnerDashboard";

// Onboarding
import OnboardingWizard from "./pages/OnboardingWizard";

// Layout
import DashboardLayout from "./components/DashboardLayout";

// Core dashboards
import Dashboard from "./pages/Dashboard";
import DeputyAcademicsDashboard from "./pages/dashboards/DeputyAcademicsDashboard";
import DeputyAdminDashboard from "./pages/dashboards/DeputyAdminDashboard";
import TeacherDashboard from "./pages/dashboards/TeacherDashboard";
import BursarDashboard from "./pages/dashboards/BursarDashboard";
import ParentDashboard from "./pages/dashboards/ParentDashboard";
import StudentDashboard from "./pages/dashboards/StudentDashboard";
import LibrarianDashboard from "./pages/dashboards/LibrarianDashboard";
import NurseDashboard from "./pages/dashboards/NurseDashboard";
import ExamsOfficerDashboard from "./pages/dashboards/ExamsOfficerDashboard";
import ICTAdminDashboard from "./pages/dashboards/ICTAdminDashboard";
import HODDashboard from "./pages/dashboards/HODDashboard";

// Module pages
import Students from "./pages/Students";
import StudentProfile from "./pages/StudentProfile";
import Staff from "./pages/Staff";
import Finance from "./pages/Finance";
import Timetable from "./pages/Timetable";
import Attendance from "./pages/Attendance";
import Academics from "./pages/Academics";
import Assessments from "./pages/Assessments";
import Roles from "./pages/Roles";
import Notifications from "./pages/Notifications";
import PlaceholderPage from "./pages/PlaceholderPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public Pages */}
          <Route path="/" element={<Landing />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/features" element={<Features />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/status" element={<Status />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/find-school" element={<TenantResolver />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/accept-invite" element={<AcceptInvite />} />

          {/* System Owner Portal */}
          <Route path="/owner" element={<OwnerLogin />} />
          <Route path="/owner/dashboard" element={<OwnerDashboard />} />

          {/* Onboarding */}
          <Route path="/onboarding" element={<OnboardingWizard />} />

          {/* Tenant App - Dashboard Layout */}
          <Route element={<DashboardLayout />}>
            {/* Role-Specific Dashboards */}
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/dashboard/deputy-academics" element={<DeputyAcademicsDashboard />} />
            <Route path="/dashboard/deputy-admin" element={<DeputyAdminDashboard />} />
            <Route path="/dashboard/teacher" element={<TeacherDashboard />} />
            <Route path="/dashboard/bursar" element={<BursarDashboard />} />
            <Route path="/dashboard/parent" element={<ParentDashboard />} />
            <Route path="/dashboard/student" element={<StudentDashboard />} />
            <Route path="/dashboard/librarian" element={<LibrarianDashboard />} />
            <Route path="/dashboard/nurse" element={<NurseDashboard />} />
            <Route path="/dashboard/exams-officer" element={<ExamsOfficerDashboard />} />
            <Route path="/dashboard/ict-admin" element={<ICTAdminDashboard />} />
            <Route path="/dashboard/hod" element={<HODDashboard />} />
            <Route path="/dashboard/security" element={<PlaceholderPage title="Security Dashboard" subtitle="Gate & visitor management" />} />

            {/* Students Module */}
            <Route path="/students" element={<Students />} />
            <Route path="/students/admissions" element={<PlaceholderPage title="Admissions" subtitle="New student enrollment" />} />
            <Route path="/students/guardians" element={<PlaceholderPage title="Guardians" subtitle="Parent & guardian management" />} />
            <Route path="/students/:id" element={<StudentProfile />} />
            <Route path="/students/promotions" element={<PlaceholderPage title="Promotions & Transfers" subtitle="Student class transitions" />} />
            <Route path="/students/id-cards" element={<PlaceholderPage title="ID Cards" subtitle="Generate & print student IDs" />} />
            <Route path="/students/houses" element={<PlaceholderPage title="Houses & Clubs" subtitle="Student house allocation" />} />

            {/* Parents/Guardians Module */}
            <Route path="/parents" element={<PlaceholderPage title="Parents" subtitle="Guardian portal management" />} />
            <Route path="/parents/invite" element={<PlaceholderPage title="Invite Guardian" subtitle="Send portal invitations" />} />
            <Route path="/parents/consent" element={<PlaceholderPage title="Consent Forms" subtitle="Trip & clinic consent management" />} />

            {/* Staff Module */}
            <Route path="/staff" element={<Staff />} />
            <Route path="/staff/add" element={<PlaceholderPage title="Add Staff" subtitle="New staff registration" />} />
            <Route path="/staff/workload" element={<PlaceholderPage title="Workload" subtitle="Teaching load distribution" />} />
            <Route path="/staff/leave" element={<PlaceholderPage title="Leave Management" subtitle="Leave requests & approvals" />} />
            <Route path="/staff/duty-roster" element={<PlaceholderPage title="Duty Rosters" subtitle="Gate & dorm duty scheduling" />} />
            <Route path="/staff/appraisals" element={<PlaceholderPage title="Appraisals" subtitle="Staff performance reviews" />} />
            <Route path="/staff/id-cards" element={<PlaceholderPage title="Staff ID Cards" subtitle="Generate & print staff IDs" />} />

            {/* Academics Module (CBC) */}
            <Route path="/academics/learning-areas" element={<Academics />} />
            <Route path="/academics/strands" element={<PlaceholderPage title="Strands" subtitle="Strand & sub-strand management" />} />
            <Route path="/academics/competencies" element={<PlaceholderPage title="Competencies & Rubrics" subtitle="CBC competency framework" />} />
            <Route path="/academics/schemes" element={<PlaceholderPage title="Schemes of Work" subtitle="Term-wise scheme planning" />} />
            <Route path="/academics/lessons" element={<PlaceholderPage title="Lesson Plans" subtitle="Daily lesson planning" />} />
            <Route path="/academics/portfolio" element={<PlaceholderPage title="Portfolio & Evidence" subtitle="Student evidence uploads" />} />
            <Route path="/academics/progress" element={<PlaceholderPage title="Competency Progress" subtitle="Student competency tracking" />} />
            <Route path="/academics/interventions" element={<PlaceholderPage title="Interventions" subtitle="Learner support flags" />} />

            {/* Assessments Module */}
            <Route path="/assessments/questions" element={<PlaceholderPage title="Question Bank" subtitle="Create & manage exam questions" />} />
            <Route path="/assessments/blueprints" element={<PlaceholderPage title="Blueprints" subtitle="Exam blueprint design" />} />
            <Route path="/assessments/create" element={<Assessments />} />
            <Route path="/assessments/auto-generate" element={<PlaceholderPage title="Auto-Generate" subtitle="AI-powered paper generation" />} />
            <Route path="/assessments/marks" element={<PlaceholderPage title="Mark Entry" subtitle="Enter & manage marks" />} />
            <Route path="/assessments/moderation" element={<PlaceholderPage title="Moderation" subtitle="Results moderation workflow" />} />
            <Route path="/assessments/results" element={<PlaceholderPage title="Results" subtitle="View & publish results" />} />
            <Route path="/assessments/report-cards" element={<PlaceholderPage title="Report Cards" subtitle="Generate report cards" />} />
            <Route path="/assessments/analytics" element={<PlaceholderPage title="Analytics" subtitle="Assessment performance analytics" />} />

            {/* Timetable Module */}
            <Route path="/timetable" element={<Timetable />} />
            <Route path="/timetable/teacher-availability" element={<PlaceholderPage title="Teacher Availability" subtitle="Set teacher schedules" />} />
            <Route path="/timetable/rooms" element={<PlaceholderPage title="Room Allocation" subtitle="Manage rooms & labs" />} />
            <Route path="/timetable/conflicts" element={<PlaceholderPage title="Conflict Report" subtitle="Timetable clash detection" />} />
            <Route path="/timetable/substitute" element={<PlaceholderPage title="Substitute Timetable" subtitle="Teacher replacement scheduling" />} />

            {/* Attendance Module */}
            <Route path="/attendance" element={<Attendance />} />
            <Route path="/attendance/lesson" element={<PlaceholderPage title="Lesson Attendance" subtitle="Per-lesson attendance tracking" />} />
            <Route path="/attendance/history" element={<PlaceholderPage title="Attendance History" subtitle="Session records" />} />
            <Route path="/attendance/reports" element={<PlaceholderPage title="Attendance Reports" subtitle="By class, learner, date range" />} />
            <Route path="/attendance/chronic" element={<PlaceholderPage title="Chronic Absentees" subtitle="Persistent absence tracking" />} />

            {/* Finance Module */}
            <Route path="/finance" element={<Finance />} />
            <Route path="/finance/fee-structures" element={<PlaceholderPage title="Fee Structures" subtitle="Define term fee items" />} />
            <Route path="/finance/invoices" element={<PlaceholderPage title="Invoices" subtitle="Generate & manage invoices" />} />
            <Route path="/finance/payments" element={<PlaceholderPage title="Payments" subtitle="Record & track payments" />} />
            <Route path="/finance/statements" element={<PlaceholderPage title="Statements" subtitle="Student fee statements" />} />
            <Route path="/finance/arrears" element={<PlaceholderPage title="Arrears" subtitle="Outstanding fee tracking" />} />
            <Route path="/finance/bursaries" element={<PlaceholderPage title="Bursaries & Scholarships" subtitle="Discount management" />} />
            <Route path="/finance/cashbook" element={<PlaceholderPage title="Cashbook" subtitle="Basic accounting report" />} />

            {/* Library Module */}
            <Route path="/library" element={<PlaceholderPage title="Library Catalog" subtitle="Book catalog & search" />} />
            <Route path="/library/issue" element={<PlaceholderPage title="Issue Book" subtitle="Book checkout" />} />
            <Route path="/library/return" element={<PlaceholderPage title="Return Book" subtitle="Book return & fines" />} />
            <Route path="/library/overdue" element={<PlaceholderPage title="Overdue Books" subtitle="Overdue tracking" />} />
            <Route path="/library/inventory" element={<PlaceholderPage title="Inventory" subtitle="Stock-take management" />} />

            {/* Clinic Module */}
            <Route path="/clinic" element={<PlaceholderPage title="School Clinic" subtitle="Student health management" />} />
            <Route path="/clinic/visits" element={<PlaceholderPage title="Visit Log" subtitle="Patient visit records" />} />
            <Route path="/clinic/medication" element={<PlaceholderPage title="Medication Log" subtitle="Dispensed medications" />} />
            <Route path="/clinic/referrals" element={<PlaceholderPage title="Referrals" subtitle="External referral tracking" />} />
            <Route path="/clinic/sickbay" element={<PlaceholderPage title="Sickbay" subtitle="Admitted students" />} />
            <Route path="/clinic/alerts" element={<PlaceholderPage title="Medical Alerts" subtitle="Allergies & chronic conditions" />} />

            {/* LMS Module */}
            <Route path="/lms" element={<PlaceholderPage title="Learning Management" subtitle="E-learning platform" />} />
            <Route path="/lms/courses" element={<PlaceholderPage title="Courses" subtitle="Course management" />} />
            <Route path="/lms/resources" element={<PlaceholderPage title="Resources" subtitle="Upload center" />} />
            <Route path="/lms/assignments" element={<PlaceholderPage title="Assignments" subtitle="Create & manage assignments" />} />
            <Route path="/lms/submissions" element={<PlaceholderPage title="Submissions" subtitle="Student submissions" />} />
            <Route path="/lms/quizzes" element={<PlaceholderPage title="Quizzes" subtitle="Online quizzes" />} />

            {/* Communications Module */}
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/communications/announcements" element={<PlaceholderPage title="Announcements" subtitle="School-wide broadcasts" />} />
            <Route path="/communications/messaging" element={<PlaceholderPage title="Messaging" subtitle="Targeted communications" />} />
            <Route path="/communications/templates" element={<PlaceholderPage title="Templates" subtitle="Message templates" />} />
            <Route path="/communications/emergency" element={<PlaceholderPage title="Emergency Broadcast" subtitle="Urgent alerts" />} />

            {/* Discipline Module */}
            <Route path="/discipline" element={<PlaceholderPage title="Discipline" subtitle="Incident & merit tracking" />} />
            <Route path="/discipline/incidents" element={<PlaceholderPage title="Incidents" subtitle="Incident reporting" />} />
            <Route path="/discipline/merits" element={<PlaceholderPage title="Merits & Demerits" subtitle="Behavior tracking" />} />
            <Route path="/discipline/counselling" element={<PlaceholderPage title="Counselling" subtitle="Counselling sessions" />} />

            {/* Assets & Inventory */}
            <Route path="/assets" element={<PlaceholderPage title="Assets & Inventory" subtitle="School assets management" />} />
            <Route path="/assets/catalog" element={<PlaceholderPage title="Items Catalog" subtitle="Inventory items" />} />
            <Route path="/assets/suppliers" element={<PlaceholderPage title="Suppliers" subtitle="Vendor management" />} />
            <Route path="/assets/maintenance" element={<PlaceholderPage title="Maintenance" subtitle="Maintenance tickets" />} />

            {/* Transport & Boarding */}
            <Route path="/transport" element={<PlaceholderPage title="Transport" subtitle="Bus routes & manifests" />} />
            <Route path="/transport/routes" element={<PlaceholderPage title="Routes" subtitle="Transport route management" />} />
            <Route path="/boarding" element={<PlaceholderPage title="Boarding" subtitle="Dormitory management" />} />
            <Route path="/boarding/dorms" element={<PlaceholderPage title="Dorms & Beds" subtitle="Bed allocation" />} />
            <Route path="/boarding/roll-call" element={<PlaceholderPage title="Roll Call" subtitle="Boarding roll calls" />} />

            {/* Reports */}
            <Route path="/reports" element={<PlaceholderPage title="Reports Center" subtitle="Analytics & reporting" />} />
            <Route path="/reports/academic" element={<PlaceholderPage title="Academic Reports" subtitle="Performance analytics" />} />
            <Route path="/reports/attendance" element={<PlaceholderPage title="Attendance Reports" subtitle="Attendance analytics" />} />
            <Route path="/reports/finance" element={<PlaceholderPage title="Finance Reports" subtitle="Financial analytics" />} />
            <Route path="/reports/library" element={<PlaceholderPage title="Library Reports" subtitle="Circulation analytics" />} />
            <Route path="/reports/clinic" element={<PlaceholderPage title="Clinic Reports" subtitle="Health analytics" />} />
            <Route path="/reports/hr" element={<PlaceholderPage title="HR Reports" subtitle="Staff analytics" />} />
            <Route path="/reports/export" element={<PlaceholderPage title="Export Center" subtitle="CSV/XLSX/PDF exports" />} />

            {/* Roles & Access */}
            <Route path="/roles" element={<Roles />} />
            <Route path="/roles/create" element={<PlaceholderPage title="Create Role" subtitle="Define new role" />} />
            <Route path="/roles/permissions" element={<PlaceholderPage title="Permission Matrix" subtitle="Manage permissions" />} />

            {/* Settings */}
            <Route path="/settings" element={<PlaceholderPage title="Settings" subtitle="School configuration" />} />
            <Route path="/settings/profile" element={<PlaceholderPage title="School Profile" subtitle="Basic information" />} />
            <Route path="/settings/campuses" element={<PlaceholderPage title="Campuses" subtitle="Multi-campus management" />} />
            <Route path="/settings/academic-years" element={<PlaceholderPage title="Academic Years" subtitle="Year & term management" />} />
            <Route path="/settings/classes" element={<PlaceholderPage title="Classes" subtitle="Class & stream management" />} />
            <Route path="/settings/rooms" element={<PlaceholderPage title="Rooms & Facilities" subtitle="Room management" />} />
            <Route path="/settings/users" element={<PlaceholderPage title="Users" subtitle="User management" />} />
            <Route path="/settings/integrations" element={<PlaceholderPage title="Integrations" subtitle="Email, SMS, M-Pesa, Storage" />} />
            <Route path="/settings/backup" element={<PlaceholderPage title="Backup & Export" subtitle="Data backup & export" />} />
            <Route path="/settings/subscription" element={<PlaceholderPage title="Subscription" subtitle="Current plan & usage" />} />
            <Route path="/settings/audit-logs" element={<PlaceholderPage title="Audit Logs" subtitle="System activity logs" />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
