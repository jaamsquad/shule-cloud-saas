import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

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
import ManageFamilies from "./pages/tenant/modules/ManageFamilies";
import NewFamily from "./pages/tenant/modules/NewFamily";
import Classes from "./pages/tenant/modules/Classes";
import NewClass from "./pages/tenant/modules/NewClass";
import ClassDetail from "./pages/tenant/modules/ClassDetail";
import Promotions from "./pages/tenant/modules/Promotions";
import Staff from "./pages/tenant/modules/Staff";
import StaffProfile from "./pages/tenant/modules/StaffProfile";
import StaffIdCards from "./pages/tenant/modules/StaffIdCards";
import Departments from "./pages/tenant/modules/Departments";
import Subjects from "./pages/tenant/modules/Subjects";
import AllSubjects from "./pages/tenant/modules/AllSubjects";
import NewSubject from "./pages/tenant/modules/NewSubject";
import AssignSubjects from "./pages/tenant/modules/AssignSubjects";
import CoCurricularActivities from "./pages/tenant/modules/CoCurricularActivities";
import AddStudent from "./pages/tenant/modules/AddStudent";
import AdmissionLetter from "./pages/tenant/modules/AdmissionLetter";
import StudentIdCards from "./pages/tenant/modules/StudentIdCards";
import PrintBasicList from "./pages/tenant/modules/PrintBasicList";
import ManageLogin from "./pages/tenant/modules/ManageLogin";
import PromoteStudents from "./pages/tenant/modules/PromoteStudents";
import AllStudents from "./pages/tenant/modules/AllStudents";
import StudentReport from "./pages/tenant/modules/StudentReport";
import EditStudent from "./pages/tenant/modules/EditStudent";

import Employees from "./pages/tenant/modules/Employees";
import AllEmployees from "./pages/tenant/modules/AllEmployees";
import AddEmployee from "./pages/tenant/modules/AddEmployee";
import JobLetter from './pages/tenant/modules/JobLetter';
import Homework from './pages/tenant/modules/Homework';
import StaffManageLogin from "./pages/tenant/modules/StaffManageLogin";
import ChartOfAccount from "./pages/tenant/modules/ChartOfAccount";
import AddIncome from "./pages/tenant/modules/AddIncome";
import AddExpense from "./pages/tenant/modules/AddExpense";
import AccountStatement from "./pages/tenant/modules/AccountStatement";

import Finance from "./pages/tenant/modules/Finance";
import Timetable from "./pages/tenant/modules/Timetable";
import TimetableWrapper from "./pages/tenant/modules/TimetableWrapper";
import Attendance from "./pages/tenant/modules/Attendance";
import StudentsAttendance from "./pages/tenant/modules/attendance/StudentsAttendance";
import EmployeesAttendance from "./pages/tenant/modules/attendance/EmployeesAttendance";
import ClassWiseReport from "./pages/tenant/modules/attendance/ClassWiseReport";
import StudentsAttendanceReport from "./pages/tenant/modules/attendance/StudentsAttendanceReport";
import EmployeesAttendanceReport from "./pages/tenant/modules/attendance/EmployeesAttendanceReport";
import StudentsReportCard from "./pages/tenant/modules/reports/StudentsReportCard";
import StudentsInfoReport from "./pages/tenant/modules/reports/StudentsInfoReport";
import ParentsInfoReport from "./pages/tenant/modules/reports/ParentsInfoReport";
import StudentsMonthlyAttendanceReport from "./pages/tenant/modules/reports/StudentsMonthlyAttendanceReport";
import StaffMonthlyAttendanceReport from "./pages/tenant/modules/reports/StaffMonthlyAttendanceReport";
import FeeCollectionReport from "./pages/tenant/modules/reports/FeeCollectionReport";
import StudentProgressReport from "./pages/tenant/modules/reports/StudentProgressReport";
import AccountsReport from "./pages/tenant/modules/reports/AccountsReport";
import CustomisedReports from "./pages/tenant/modules/reports/CustomisedReports";
import Academics from "./pages/tenant/modules/Academics";
import Schemes from "./pages/tenant/modules/Schemes";
import LessonPlans from "./pages/tenant/modules/LessonPlans";
import Assessments from "./pages/tenant/modules/Assessments";
import QuestionBank from "./pages/tenant/modules/QuestionBank";
import Exams from "./pages/tenant/modules/Exams";
import MarkEntry from "./pages/tenant/modules/MarkEntry";
import Results from "./pages/tenant/modules/Results";
import CreateExam from "./pages/tenant/modules/academics/exams/CreateExam";
import ExamMarks from "./pages/tenant/modules/academics/exams/ExamMarks";
import ResultCard from "./pages/tenant/modules/academics/exams/ResultCard";
import ResultSheet from "./pages/tenant/modules/academics/exams/ResultSheet";
import ExamSchedule from "./pages/tenant/modules/academics/exams/ExamSchedule";
import DateSheet from "./pages/tenant/modules/academics/exams/DateSheet";
import BlankAwardList from "./pages/tenant/modules/academics/exams/BlankAwardList";
import Strands from "./pages/tenant/modules/Strands";
import GradingPresets from "./pages/tenant/modules/academics/GradingPresets";
import GradingCriteria from "./pages/tenant/modules/academics/GradingCriteria";
import ExamTypes from "./pages/tenant/modules/academics/ExamTypes";
import SubjectGroups from "./pages/tenant/modules/academics/SubjectGroups";
import Curricula from "./pages/tenant/modules/academics/Curricula";
import Grades from "./pages/tenant/modules/academics/Grades";
import AcademicsExams from "./pages/tenant/modules/academics/Exams";
import Periods from "./pages/tenant/modules/Periods";
import GenerateFeesInvoice from "./pages/tenant/modules/GenerateFeesInvoice";
import FeesPaidSlip from "./pages/tenant/modules/FeesPaidSlip";
import FeesDefaulters from "./pages/tenant/modules/FeesDefaulters";
import CollectFees from "./pages/tenant/modules/CollectFees";
import InvoiceDetail from "./pages/tenant/modules/InvoiceDetail";

import InstituteProfile from "./pages/tenant/modules/InstituteProfile";
import AccountsForFees from "./pages/tenant/modules/AccountsForFees";
import RulesRegulations from "./pages/tenant/modules/RulesRegulations";
import MarksGrading from "./pages/tenant/modules/MarksGrading";
import ReportCardTemplates from "./pages/tenant/modules/ReportCardTemplates";
import ThemeLanguage from "./pages/tenant/modules/ThemeLanguage";
import AccountSettings from "./pages/tenant/modules/AccountSettings";
import FeeParticulars from "./pages/tenant/modules/FeeParticulars";
import FeeStructure from "./pages/tenant/modules/FeeStructure";
import DiscountTypes from "./pages/tenant/modules/DiscountTypes";

import Roles from "./pages/tenant/modules/Roles";
import Notifications from "./pages/tenant/modules/Notifications";
import Settings from "./pages/tenant/modules/Settings";
import Archives from "./pages/tenant/modules/Archives";
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
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            {/* 1. PUBLIC WEBSITE */}
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

            {/* 2. SYSTEM OWNER PORTAL */}
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

            <Route element={<DashboardLayout />}>
              {/* Role Dashboards */}
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

              {/* Students */}
              <Route path="/students" element={<AllStudents />} />
              <Route path="/students/new" element={<AddStudent />} />
              <Route path="/students/report/:id" element={<StudentReport />} />
              <Route path="/students/edit/:id" element={<EditStudent />} />
              <Route path="/students/admission-letter" element={<AdmissionLetter />} />
              <Route path="/students/id-cards" element={<StudentIdCards />} />
              <Route path="/students/print" element={<PrintBasicList />} />
              <Route path="/students/login" element={<ManageLogin />} />
              <Route path="/students/promote" element={<PromoteStudents />} />
               <Route path="/students/admissions" element={<Admissions />} />
              <Route path="/students/guardians" element={<Guardians />} />
              <Route path="/students/families" element={<ManageFamilies />} />
               <Route path="/students/families/new" element={<NewFamily />} />
              <Route path="/students/:id" element={<PlaceholderPage title="Student Profile" subtitle="Comprehensive student view" />} />

              {/* Employees */}
              <Route path="/staff" element={<AllEmployees />} />
              <Route path="/staff/profile/:id" element={<StaffProfile />} />
              <Route path="/staff/new" element={<AddEmployee />} />
              <Route path="/staff/id-cards" element={<StaffIdCards />} />
              <Route path="/staff/job-letter" element={<JobLetter />} />
              <Route path="/staff/login" element={<StaffManageLogin />} />
              <Route path="/staff/attendance" element={<PlaceholderPage title="Staff Attendance" subtitle="Manage and view employee attendance records" />} />

              {/* Classes */}
              <Route path="/classes" element={<Classes />} />
              <Route path="/classes/new" element={<NewClass />} />
              <Route path="/classes/:id" element={<ClassDetail />} />
              <Route path="/classes/streams" element={<Classes />} />
              <Route path="/classes/strands" element={<Strands />} />

              {/* Subjects */}
              <Route path="/subjects" element={<Subjects />} />
              <Route path="/subjects/all" element={<AllSubjects />} />
              <Route path="/subjects/new" element={<NewSubject />} />
              <Route path="/subjects/assign" element={<AssignSubjects />} />
              <Route path="/subjects/activities" element={<CoCurricularActivities />} />
              <Route path="/subjects/categories" element={<PlaceholderPage title="Subject Categories" subtitle="Organize subjects by department" />} />

              {/* Staff HR */}
              <Route path="/staff/departments" element={<Departments />} />
              <Route path="/staff/import" element={<PlaceholderPage title="Import Staff" subtitle="Bulk staff onboarding" />} />
              <Route path="/staff/photos" element={<PlaceholderPage title="Staff Photos" subtitle="Manage personnel identifiers" />} />
              <Route path="/staff/leave" element={<PlaceholderPage title="Leave Management" subtitle="Leave requests & approvals" />} />
              <Route path="/staff/payroll" element={<PlaceholderPage title="Payroll" subtitle="Staff payroll management" />} />

              {/* Academics & Framework */}
              <Route path="/academics/exams" element={<AcademicsExams />} />
              <Route path="/academics/periods" element={<Periods />} />
              <Route path="/academics/subjects" element={<Subjects />} />
              <Route path="/academics/learning-areas" element={<Academics />} />
              <Route path="/academics/schemes" element={<Schemes />} />
              <Route path="/academics/lessons" element={<LessonPlans />} />
              <Route path="/academics/grading-presets" element={<GradingPresets />} />
              <Route path="/academics/grading-criteria" element={<GradingCriteria />} />
              <Route path="/academics/grades" element={<Grades />} />
              <Route path="/academics/exam-types" element={<ExamTypes />} />
              <Route path="/academics/subject-groups" element={<SubjectGroups />} />
              <Route path="/academics/curricula" element={<Curricula />} />
              <Route path="/academics/audit-trails" element={<PlaceholderPage title="Audit Trails" subtitle="Track all academic changes" />} />

              {/* Assessments (legacy) */}
              <Route path="/assessments" element={<Assessments />} />
              <Route path="/assessments/questions" element={<QuestionBank />} />
              <Route path="/assessments/create" element={<Exams />} />
              <Route path="/assessments/marks" element={<MarkEntry />} />
              <Route path="/assessments/results" element={<Results />} />

              {/* Exams Management Module */}
              <Route path="/exams/create" element={<CreateExam />} />
              <Route path="/exams/marks" element={<ExamMarks />} />
              <Route path="/exams/result-card" element={<ResultCard />} />
              <Route path="/exams/result-sheet" element={<ResultSheet />} />
              <Route path="/exams/schedule" element={<ExamSchedule />} />
              <Route path="/exams/date-sheet" element={<DateSheet />} />
              <Route path="/exams/blank-award-list" element={<BlankAwardList />} />

              {/* Finance */}
              <Route path="/fees/generate-invoice" element={<GenerateFeesInvoice />} />
              <Route path="/fees/invoice/:id" element={<InvoiceDetail />} />
              <Route path="/fees/collect" element={<CollectFees />} />
              <Route path="/fees/paid-slip" element={<FeesPaidSlip />} />
              <Route path="/fees/defaulters" element={<FeesDefaulters />} />
              
              <Route path="/finance" element={<Finance />} />
              <Route path="/finance/invoices" element={<PlaceholderPage title="Invoice List" subtitle="Student fee invoices" />} />
              <Route path="/finance/payments" element={<PlaceholderPage title="Record Payment" subtitle="Receive & track payments" />} />
              
              {/* Accounts */}
              <Route path="/accounts/chart" element={<ChartOfAccount />} />
              <Route path="/accounts/income" element={<AddIncome />} />
              <Route path="/accounts/expense" element={<AddExpense />} />
              <Route path="/accounts/statement" element={<AccountStatement />} />

              {/* Timetable */}
              <Route path="/timetable" element={<TimetableWrapper />} />
              <Route path="/timetable/*" element={<TimetableWrapper />} />

              {/* Homework */}
              <Route path="/homework" element={<Homework />} />

              {/* Attendance */}
              <Route path="/attendance" element={<StudentsAttendance />} />
              <Route path="/attendance/students" element={<StudentsAttendance />} />
              <Route path="/attendance/employees" element={<EmployeesAttendance />} />
              <Route path="/attendance/reports/class-wise" element={<ClassWiseReport />} />
              <Route path="/attendance/reports/students" element={<StudentsAttendanceReport />} />
              <Route path="/attendance/reports/employees" element={<EmployeesAttendanceReport />} />

              {/* Reports Module */}
              <Route path="/reports/report-cards" element={<StudentsReportCard />} />
              <Route path="/reports/students-info" element={<StudentsInfoReport />} />
              <Route path="/reports/parents-info" element={<ParentsInfoReport />} />
              <Route path="/reports/attendance/monthly-students" element={<StudentsMonthlyAttendanceReport />} />
              <Route path="/reports/attendance/monthly-staff" element={<StaffMonthlyAttendanceReport />} />
              <Route path="/reports/fee-collection" element={<FeeCollectionReport />} />
              <Route path="/reports/student-progress" element={<StudentProgressReport />} />
              <Route path="/reports/accounts" element={<AccountsReport />} />
              <Route path="/reports/custom" element={<CustomisedReports />} />

              {/* Institutional Modules */}
              <Route path="/library" element={<PlaceholderPage title="Library" subtitle="Catalog & Circulation" />} />
              <Route path="/clinic" element={<PlaceholderPage title="Clinic" subtitle="Medical profiles" />} />
              <Route path="/lms" element={<PlaceholderPage title="LMS" subtitle="E-learning platform" />} />
              <Route path="/communications" element={<PlaceholderPage title="Communications" subtitle="Announcements & messaging" />} />
              <Route path="/inventory" element={<PlaceholderPage title="Inventory" subtitle="Stores & assets" />} />
              <Route path="/transport" element={<PlaceholderPage title="Transport" subtitle="Routes & manifests" />} />
              <Route path="/boarding" element={<PlaceholderPage title="Boarding" subtitle="Dormitories" />} />

              {/* Settings */}
              <Route path="/settings" element={<Settings />} />
              <Route path="/settings/profile" element={<InstituteProfile />} />
              <Route path="/settings/fees-particulars" element={<FeeParticulars />} />
              <Route path="/settings/fees-structure" element={<FeeStructure />} />
              <Route path="/settings/discount-type" element={<DiscountTypes />} />
              <Route path="/settings/accounts" element={<AccountsForFees />} />
              <Route path="/settings/rules" element={<RulesRegulations />} />
              <Route path="/settings/grading" element={<MarksGrading />} />
              <Route path="/settings/report-templates" element={<ReportCardTemplates />} />
              <Route path="/settings/theme" element={<ThemeLanguage />} />
              <Route path="/settings/account" element={<AccountSettings />} />
              <Route path="/settings/users" element={<PlaceholderPage title="Users & Access" subtitle="Manage school staff roles" />} />
              <Route path="/roles" element={<Roles />} />
              <Route path="/archives" element={<Archives />} />
              <Route path="/notifications" element={<Notifications />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
