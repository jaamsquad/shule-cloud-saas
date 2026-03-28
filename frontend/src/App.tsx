import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Suspense } from "react";
import { elearningRoutes } from "./modules/elearning/elearningRoutes";
// Public pages
import Landing from "./pages/public/Landing";
import Pricing from "./pages/public/Pricing";
import Features from "./pages/public/Features";
import Contact from "./pages/public/Contact";
import Status from "./pages/public/Status";
import Terms from "./pages/public/Terms";
import Privacy from "./pages/public/Privacy";
import TenantResolver from "./pages/public/TenantResolver";
import Register from "./pages/public/Register";

// Tenant Auth
import Login from "./pages/tenant/auth/Login";
import ForgotPassword from "./pages/tenant/auth/ForgotPassword";
import ResetPassword from "./pages/tenant/auth/ResetPassword";
import AcceptInvite from "./pages/tenant/auth/AcceptInvite";

// Owner Portal
import OwnerLogin from "./pages/owner/Login";
import OwnerDashboard from "./pages/owner/Dashboard";
import OwnerTenants from "./pages/owner/Tenants";
import OwnerPlans from "./pages/owner/Plans";
import OwnerAudit from "./pages/owner/Audit";
import OwnerAnnouncements from "./pages/owner/Announcements";
import OwnerSettings from "./pages/owner/Settings";
import OwnerRegister from "./pages/owner/Register";
import OwnerBilling from "./pages/owner/Billing";

// Onboarding
import OnboardingWizard from "./pages/OnboardingWizard";

// Layout
import DashboardLayout from "./components/DashboardLayout";

// Core dashboards
import Dashboard from "./pages/tenant/modules/Dashboard";
import DeputyAcademicsDashboard from "./pages/tenant/dashboards/DeputyAcademicsDashboard";
import DeputyAdminDashboard from "./pages/tenant/dashboards/DeputyAdminDashboard";
import TeacherDashboard from "./pages/tenant/dashboards/TeacherDashboard";
import BursarDashboard from "./pages/tenant/dashboards/BursarDashboard";
import ParentDashboard from "./pages/tenant/dashboards/ParentDashboard";
import StudentDashboard from "./pages/tenant/dashboards/StudentDashboard";
import LibrarianDashboard from "./pages/tenant/dashboards/LibrarianDashboard";
import NurseDashboard from "./pages/tenant/dashboards/NurseDashboard";
import ExamsOfficerDashboard from "./pages/tenant/dashboards/ExamsOfficerDashboard";
import ICTAdminDashboard from "./pages/tenant/dashboards/ICTAdminDashboard";
import HODDashboard from "./pages/tenant/dashboards/HODDashboard";

// Module pages
import Students from "./pages/tenant/modules/Students";
import Admissions from "./pages/tenant/modules/Admissions";
import Guardians from "./pages/tenant/modules/Guardians";
import Classes from "./pages/tenant/modules/Classes";
import Promotions from "./pages/tenant/modules/Promotions";
import Staff from "./pages/tenant/modules/Staff";
import Departments from "./pages/tenant/modules/Departments";
import Subjects from "./pages/tenant/modules/Subjects";
import Finance from "./pages/tenant/modules/Finance";
import Timetable from "./pages/tenant/modules/Timetable";
import Attendance from "./pages/tenant/modules/Attendance";
import Academics from "./pages/tenant/modules/Academics";
import Schemes from "./pages/tenant/modules/Schemes";
import LessonPlans from "./pages/tenant/modules/LessonPlans";
import Assessments from "./pages/tenant/modules/Assessments";
import QuestionBank from "./pages/tenant/modules/QuestionBank";
import Exams from "./pages/tenant/modules/Exams";
import MarkEntry from "./pages/tenant/modules/MarkEntry";
import Results from "./pages/tenant/modules/Results";
import Strands from "./pages/tenant/modules/Strands";
import Roles from "./pages/tenant/modules/Roles";
import Notifications from "./pages/tenant/modules/Notifications";
import Settings from "./pages/tenant/modules/Settings";
import PlaceholderPage from "./pages/PlaceholderPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const getPortal = () => {
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') return 'public';
  if (host.startsWith('owner.')) return 'owner';
  const parts = host.split('.');
  if (parts.length > 2) return 'tenant'; // school.shulecloud.co.ke
  return 'public';
};

const App = () => {
  const portal = getPortal();

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* 1. PUBLIC WEBSITE - Marketing & Discovery */}
            <Route path="/" element={<Landing />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/features" element={<Features />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/status" element={<Status />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/find-school" element={<TenantResolver />} />
            <Route path="/register" element={<Register />} />
            <Route path="/onboarding" element={<OnboardingWizard />} />

            {/* 2. SYSTEM OWNER PORTAL (owner.shulecloud.co.ke) */}
            <Route path="/owner" element={<OwnerLogin />} />
            <Route path="/owner/register" element={<OwnerRegister />} />

            <Route element={<DashboardLayout />}>
              <Route path="/owner/dashboard" element={<OwnerDashboard />} />
              <Route path="/owner/tenants" element={<OwnerTenants />} />
              <Route path="/owner/plans" element={<OwnerPlans />} />
              <Route path="/owner/audit" element={<OwnerAudit />} />
              <Route path="/owner/announcements" element={<OwnerAnnouncements />} />
              <Route path="/owner/settings" element={<OwnerSettings />} />
              <Route path="/owner/billing" element={<OwnerBilling />} />
            </Route>

            {/* 3. TENANT APP (School Portal) */}
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/accept-invite" element={<AcceptInvite />} />

            {/* Tenant App - Protected Modules */}
            <Route element={<DashboardLayout />}>
              {/* Role-Based Dashboards */}
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

              {/* Students Module */}
              <Route path="/students" element={<Students />} />
              <Route path="/students/admissions" element={<Admissions />} />
              <Route path="/students/guardians" element={<Guardians />} />
              <Route path="/students/:id" element={<PlaceholderPage title="Student Profile" subtitle="Comprehensive student view" />} />
              <Route path="/students/promotions" element={<PlaceholderPage title="Promotions & Transfers" subtitle="Student class transitions" />} />
              <Route path="/students/id-cards" element={<PlaceholderPage title="ID Cards" subtitle="Generate & print student IDs" />} />

              {/* Classes Module */}
              <Route path="/classes" element={<Classes />} />
              <Route path="/classes/streams" element={<Classes />} />
              <Route path="/classes/strands" element={<Strands />} />

              {/* Subjects Module */}
              <Route path="/subjects" element={<Subjects />} />
              <Route path="/subjects/categories" element={<PlaceholderPage title="Subject Categories" subtitle="Organize subjects by department" />} />


              {/* Staff & HR */}
              <Route path="/staff" element={<Staff />} />
              <Route path="/staff/departments" element={<Departments />} />

              <Route path="/staff/leave" element={<PlaceholderPage title="Leave Management" subtitle="Leave requests & approvals" />} />
              <Route path="/staff/payroll" element={<PlaceholderPage title="Payroll" subtitle="Staff payroll management" />} />

              {/* CBC Academics */}
              <Route path="/academics/learning-areas" element={<Academics />} />
              <Route path="/academics/schemes" element={<Schemes />} />
              <Route path="/academics/lessons" element={<LessonPlans />} />

              {/* Assessments */}
              <Route path="/assessments" element={<Assessments />} />
              <Route path="/assessments/questions" element={<QuestionBank />} />
              <Route path="/assessments/create" element={<Exams />} />
              <Route path="/assessments/marks" element={<MarkEntry />} />
              <Route path="/assessments/results" element={<Results />} />

              {/* Finance */}
              <Route path="/finance" element={<Finance />} />
              <Route path="/finance/invoices" element={<PlaceholderPage title="Invoice List" subtitle="Student fee invoices" />} />
              <Route path="/finance/payments" element={<PlaceholderPage title="Record Payment" subtitle="Receive & track payments" />} />

              {/* Attendance */}
              <Route path="/attendance" element={<Attendance />} />
              <Route path="/attendance/reports" element={<PlaceholderPage title="Attendance Reports" subtitle="Historical records" />} />

              {/* More Modules */}
              <Route path="/timetable" element={<Timetable />} />
              <Route path="/library" element={<PlaceholderPage title="Library" subtitle="Catalog & Circulation" />} />
              <Route path="/clinic" element={<PlaceholderPage title="Clinic" subtitle="Medical profiles" />} />
              {elearningRoutes.map(route => {
                const Element = route.element;
                return (
                  <Route 
                    key={route.path} 
                    path={route.path} 
                    element={<Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading module...</div>}><Element /></Suspense>} 
                  />
                );
              })}
              <Route path="/communications" element={<PlaceholderPage title="Communications" subtitle="Announcements & messaging" />} />
              <Route path="/inventory" element={<PlaceholderPage title="Inventory" subtitle="Stores & assets" />} />
              <Route path="/transport" element={<PlaceholderPage title="Transport" subtitle="Routes & manifests" />} />
              <Route path="/boarding" element={<PlaceholderPage title="Boarding" subtitle="Dormitories" />} />

              {/* Settings */}
              <Route path="/settings" element={<Settings />} />
              <Route path="/settings/users" element={<PlaceholderPage title="Users & Access" subtitle="Manage school staff roles" />} />
              <Route path="/roles" element={<Roles />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
