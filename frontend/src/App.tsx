import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SeoManager } from "@/seo/seo";
import { PermissionsProvider } from "@/contexts/PermissionsContext";
import { resolvePortal } from "@/lib/portal";

// Subdomain portals (students. / staff. / parent.<tenant>)
import StudentApp from "@/portals/student/StudentApp";
import StaffApp from "@/portals/staff/StaffApp";
import ParentApp from "@/portals/parent/ParentApp";

// Student Portal
import StudentPortalLogin from "./pages/student-portal/StudentPortalLogin";
import StudentPortalDashboard from "./pages/student-portal/StudentPortalDashboard";

// Parent Portal
import ParentPortalLogin from "./pages/parent-portal/ParentPortalLogin";
import ParentPortalDashboard from "./pages/parent-portal/ParentPortalDashboard";

// Staff Portal
import StaffPortalLogin from "./pages/staff-portal/StaffPortalLogin";

// Public pages
import Landing from "./pages/public/Landing";
import Features from "./pages/public/Features";
import About from "./pages/public/About";
import FAQ from "./pages/public/FAQ";
import BlogList from "./pages/public/BlogList";
import BlogPost from "./pages/public/BlogPost";
import Contact from "./pages/public/Contact";
import Status from "./pages/public/Status";
import Terms from "./pages/public/Terms";
import Privacy from "./pages/public/Privacy";
import TenantResolver from "./pages/public/TenantResolver";
import Register from "./pages/public/Register";
import Activate from "./pages/public/Activate";
import StudentHistory from "./pages/tenant/modules/students/StudentHistory";
import TillTransactions from "./pages/tenant/modules/TillTransactions";
import PaymentInbox from "./pages/tenant/modules/PaymentInbox";

// Tenant Auth
import Login from "./pages/tenant/auth/Login";
import Logout from "./pages/tenant/auth/Logout";
import AccessDenied from "./pages/tenant/auth/AccessDenied";
import HelpPage from "./pages/tenant/apps/HelpPage";
import ForgotPassword from "./pages/tenant/auth/ForgotPassword";
import ResetPassword from "./pages/tenant/auth/ResetPassword";
import AcceptInvite from "./pages/tenant/auth/AcceptInvite";

// Owner Portal
import OwnerLogin from "./pages/owner/Login";
import OwnerChangePassword from "./pages/owner/ChangePassword";
import OwnerDashboard from "./pages/owner/Dashboard";
import OwnerTenants from "./pages/owner/Tenants";
import OwnerOrganizations from "./pages/owner/Organizations";
import OwnerCommunications from "./pages/owner/OwnerCommunications";
import OwnerPlans from "./pages/owner/Plans";
import OwnerAudit from "./pages/owner/Audit";
import OwnerAnnouncements from "./pages/owner/Announcements";
import OwnerSettings from "./pages/owner/Settings";
import OwnerBilling from "./pages/owner/Billing";
import OwnerGuard from "./pages/owner/OwnerGuard";
import PublicDoc from "./pages/public/PublicDoc";
import VerifyDoc from "./pages/public/VerifyDoc";
import ResultOnline from "./pages/public/ResultOnline";
import SkillReports from "./pages/tenant/modules/skills/SkillReports";
import FeesDashboard from "./pages/tenant/modules/FeesDashboard";
import Scholarships from "./pages/tenant/modules/fees/Scholarships";
import Sponsors from "./pages/tenant/modules/fees/Sponsors";
import FeeCredits from "./pages/tenant/modules/fees/FeeCredits";
import FeeAuditLog from "./pages/tenant/modules/fees/FeeAuditLog";
import ClassRoster from "./pages/tenant/modules/ClassRoster";
import InstallPrompt from "./components/InstallPrompt";
import ManageSchool from "./pages/owner/ManageSchool";

// Onboarding
import OnboardingWizard from "./pages/OnboardingWizard";

// Layout
import DashboardLayout from "./components/DashboardLayout";

// Core dashboards
import Dashboard from "./pages/tenant/modules/Dashboard";
import RoleDashboard from "./pages/tenant/dashboards/RoleDashboard";
import ManageParentLogin from "./pages/tenant/modules/ManageParentLogin";
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
import SubjectsOffered from "./pages/tenant/modules/subjects/SubjectsOffered";
import SubjectPathways from "./pages/tenant/modules/subjects/Pathways";
import AssignSubjects from "./pages/tenant/modules/AssignSubjects";
import CoCurricularActivities from "./pages/tenant/modules/CoCurricularActivities";
import AddStudent from "./pages/tenant/modules/AddStudent";
import AdmissionLetter from "./pages/tenant/modules/AdmissionLetter";
import StudentIdCards from "./pages/tenant/modules/StudentIdCards";
import IdCardStudio from "./pages/tenant/modules/IdCardStudio";
import GroupDashboard from "./pages/tenant/modules/GroupDashboard";
// Sports module
import SportsDashboard from "./pages/tenant/modules/sports/SportsDashboard";
import SportsSetup from "./pages/tenant/modules/sports/SportsSetup";
import SportsParticipants from "./pages/tenant/modules/sports/SportsParticipants";
import SportsAttendance from "./pages/tenant/modules/sports/SportsAttendance";
import SportsPerformance from "./pages/tenant/modules/sports/SportsPerformance";
import SportsReports from "./pages/tenant/modules/sports/SportsReports";
// Trips module
import TripsDashboard from "./pages/tenant/modules/trips/TripsDashboard";
import TripsManage from "./pages/tenant/modules/trips/TripsManage";
import TripParticipants from "./pages/tenant/modules/trips/TripParticipants";
import TripDocuments from "./pages/tenant/modules/trips/TripDocuments";
import TripAttendance from "./pages/tenant/modules/trips/TripAttendance";
import TripReports from "./pages/tenant/modules/trips/TripReports";
// Front Desk module
import FrontDeskDashboard from "./pages/tenant/modules/frontdesk/FrontDeskDashboard";
import Visitors from "./pages/tenant/modules/frontdesk/Visitors";
import StudentSignOut from "./pages/tenant/modules/frontdesk/StudentSignOut";
import Deliveries from "./pages/tenant/modules/frontdesk/Deliveries";
import Appointments from "./pages/tenant/modules/frontdesk/Appointments";
import FrontDeskReports from "./pages/tenant/modules/frontdesk/FrontDeskReports";
// Secretary module
import SecretaryDashboard from "./pages/tenant/modules/secretary/SecretaryDashboard";
import SecretaryMeetings from "./pages/tenant/modules/secretary/SecretaryMeetings";
import SecretaryReports from "./pages/tenant/modules/secretary/SecretaryReports";
import PrintBasicList from "./pages/tenant/modules/PrintBasicList";
import ManageLogin from "./pages/tenant/modules/ManageLogin";
import PromoteStudents from "./pages/tenant/modules/PromoteStudents";
import AutoPromotion from "./pages/tenant/modules/AutoPromotion";
import AllStudents from "./pages/tenant/modules/AllStudents";
import StudentReport from "./pages/tenant/modules/StudentReport";
import FindStudent from "./pages/tenant/modules/FindStudent";
import AdmissionView from "./pages/tenant/modules/AdmissionView";
import StudentPerformance from "./pages/tenant/modules/students/StudentPerformance";
import EditStudent from "./pages/tenant/modules/EditStudent";

import Employees from "./pages/tenant/modules/Employees";
import AllEmployees from "./pages/tenant/modules/AllEmployees";
import AddEmployee from "./pages/tenant/modules/AddEmployee";
import Teachers from "./pages/tenant/modules/Teachers";
import JobLetter from './pages/tenant/modules/JobLetter';
import Homework from './pages/tenant/modules/Homework';
import StaffManageLogin from "./pages/tenant/modules/StaffManageLogin";
import PaySalary from "./pages/tenant/modules/salary/PaySalary";
import SalaryPaidSlip from "./pages/tenant/modules/salary/SalaryPaidSlip";
import SalarySheet from "./pages/tenant/modules/salary/SalarySheet";
import SalaryReport from "./pages/tenant/modules/salary/SalaryReport";
import SalaryComponents from "./pages/tenant/modules/salary/SalaryComponents";
import LiveClass from "./pages/tenant/modules/LiveClass";
import LiveRoom from "./pages/tenant/modules/LiveRoom";
import LiveClasses from "./pages/tenant/modules/liveclass/LiveClasses";
import LiveClassSettings from "./pages/tenant/modules/liveclass/LiveClassSettings";
import MeetingRoom from "./pages/tenant/modules/liveclass/MeetingRoom";
import Announcements from "./pages/tenant/modules/communications/Announcements";
import BulkSMS from "./pages/tenant/modules/communications/BulkSMS";
import ParentMessaging from "./pages/tenant/modules/communications/ParentMessaging";
import ChannelComposer from "./pages/tenant/modules/communications/ChannelComposer";
import Meetings from "./pages/tenant/modules/communications/Meetings";
import MessageTemplates from "./pages/tenant/modules/communications/MessageTemplates";
import WhatsAppIntegration from "./pages/tenant/modules/communications/WhatsAppIntegration";
import ReportNotificationSettings from "./pages/tenant/modules/communications/ReportNotificationSettings";
import CommunicationPreferences from "./pages/tenant/modules/communications/CommunicationPreferences";
import IntegrationsPage from "./pages/tenant/modules/integrations/IntegrationsPage";
import OrgLogin from "./pages/org/OrgLogin";
import OrgDashboard from "./pages/org/OrgDashboard";
import OrgBranches from "./pages/org/OrgBranches";
import OrgTransfers from "./pages/org/OrgTransfers";
import OrgAudit from "./pages/org/OrgAudit";
import OrgReports from "./pages/org/OrgReports";
import OrgUsers from "./pages/org/OrgUsers";
import OrgSettings from "./pages/org/OrgSettings";
import OrgExpenses from "./pages/org/OrgExpenses";
import OrgLayout from "./pages/org/OrgLayout";
import AccountSwitcher from "./pages/org/AccountSwitcher";
import OrgCommunications from "./pages/org/OrgCommunications";
import IntegrationDetail from "./pages/tenant/modules/integrations/IntegrationDetail";
import RolesPermissions from "./pages/tenant/modules/RolesPermissions";
import LMSDashboard from "./pages/tenant/modules/lms/LMSDashboard";
import LMSCourses from "./pages/tenant/modules/lms/LMSCourses";
import LMSQuizzes from "./pages/tenant/modules/lms/LMSQuizzes";
import HostelDashboard from "./pages/tenant/modules/hostel/HostelDashboard";
import HostelRooms from "./pages/tenant/modules/hostel/HostelRooms";
import BedManagement from "./pages/tenant/modules/hostel/BedManagement";
import RoomAllocation from "./pages/tenant/modules/hostel/RoomAllocation";
import HostelAttendance from "./pages/tenant/modules/hostel/HostelAttendance";
import HostelFees from "./pages/tenant/modules/hostel/HostelFees";
import HostelSettings from "./pages/tenant/modules/hostel/HostelSettings";
import StudentTransfer from "./pages/tenant/modules/students/StudentTransfer";
import StudentDiscipline from "./pages/tenant/modules/students/StudentDiscipline";
import StudentMedical from "./pages/tenant/modules/students/StudentMedical";
import StudentDocuments from "./pages/tenant/modules/students/StudentDocuments";
// Academic System V2
import AcademicYearsPage from "./pages/tenant/modules/academics-v2/AcademicYearsPage";
import StudentHistoryPage from "./pages/tenant/modules/academics-v2/StudentHistoryPage";
import ClassesStreamsPage from "./pages/tenant/modules/academics-v2/ClassesStreamsPage";
import TeacherSubjectsPage from "./pages/tenant/modules/academics-v2/TeacherSubjectsPage";
import V2MarksEntry from "./pages/tenant/modules/academics-v2/V2MarksEntry";
import V2ReportCard from "./pages/tenant/modules/academics-v2/V2ReportCard";
import CurriculumFramework from "./pages/tenant/modules/academics2/CurriculumFramework";
import LessonPlanning from "./pages/tenant/modules/academics2/LessonPlanning";
import LessonPlanForm from "./pages/tenant/modules/academics2/LessonPlanForm";
import SchemesOfWork from "./pages/tenant/modules/academics2/SchemesOfWork";
import SchemeForm from "./pages/tenant/modules/academics2/SchemeForm";
import NotesResources from "./pages/tenant/modules/academics2/NotesResources";
import ResourceForm from "./pages/tenant/modules/academics2/ResourceForm";
import AssignmentsManagement from "./pages/tenant/modules/academics2/AssignmentsManagement";
import AssignmentForm from "./pages/tenant/modules/academics2/AssignmentForm";
import LibraryDashboard from "./pages/tenant/modules/library/LibraryDashboard";
import LibraryBooks from "./pages/tenant/modules/library/LibraryBooks";
import LibraryCategories from "./pages/tenant/modules/library/LibraryCategories";
import IssueBook from "./pages/tenant/modules/library/IssueBook";
import ReturnBook from "./pages/tenant/modules/library/ReturnBook";
import OverdueFines from "./pages/tenant/modules/library/OverdueFines";
import LibraryMembers from "./pages/tenant/modules/library/LibraryMembers";
import LibraryReports from "./pages/tenant/modules/library/LibraryReports";
import POSAdminAnalytics from "./pages/tenant/modules/pos/StoreAnalytics";
import POSAdminCategories from "./pages/tenant/modules/pos/ProductCategories";
import POSAdminTax from "./pages/tenant/modules/pos/ProductTax";
import POSAdminProducts from "./pages/tenant/modules/pos/StoreProducts";
import POSAdminNewOrder from "./pages/tenant/modules/pos/NewOrder";
import POSAdminAllOrders from "./pages/tenant/modules/pos/AllOrders";
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
import ReportsCenter from "./pages/tenant/modules/reports/ReportsCenter";
import ComputedReport from "./pages/tenant/modules/reports/ComputedReport";
import ExpenseLayout from "./pages/tenant/modules/expense/ExpenseLayout";
import ExpenseDashboard from "./pages/tenant/modules/expense/ExpenseDashboard";
import { ExpensesPage, CategoriesPage, SuppliersPage, RequestsPage, OrdersPage, PaymentsPage, RecurringPage, BudgetsPage, ApprovalsPage, ReportsPage as ExpReportsPage, SettingsPage as ExpSettingsPage } from "./pages/tenant/modules/expense/ExpensePages";
import AcctLayout from "./pages/tenant/modules/accounting/AcctLayout";
import { AcctDashboard, CoaPage, JournalsPage, LedgerPage, TrialBalancePage, IncomeStatementPage, BalanceSheetPage, CashFlowPage, ReceivablesPage, PayablesPage, BudgetingPage, ReconciliationPage, PeriodsPage, SettingsPage as AcctSettings } from "./pages/tenant/modules/accounting/AcctPages";
import ProcLayout from "./pages/tenant/modules/procurement/ProcLayout";
import { ProcDashboard, RequestsPage as ProcRequests, OrdersPage as ProcOrders, SuppliersPage as ProcSuppliers, QuotationsPage, GrnPage, MatchingPage, ContractsPage, TendersPage, ReportsPage as ProcReports, SettingsPage as ProcSettings } from "./pages/tenant/modules/procurement/ProcPages";
import CbcLayout from "./pages/tenant/modules/cbc/CbcLayout";
import { CbcDashboard, LearningAreasPage, CompetenciesPage, StrandsPage, ActivitiesPage, CommentsPage, RecordPage, ProgressPage, ReportCardsPage, AnalyticsPage, ReportsPage as CbcReportsPage, SettingsPage as CbcSettingsPage } from "./pages/tenant/modules/cbc/CbcPages";
import TscLayout from "./pages/tenant/modules/tsc/TscLayout";
import TscDashboard from "./pages/tenant/modules/tsc/TscDashboard";
import TscTeachers from "./pages/tenant/modules/tsc/TscTeachers";
import TscTeacherProfile from "./pages/tenant/modules/tsc/TscTeacherProfile";
import TscRecords from "./pages/tenant/modules/tsc/TscRecords";
import TscWorkload from "./pages/tenant/modules/tsc/TscWorkload";
import TscReports from "./pages/tenant/modules/tsc/TscReports";
import TscSettings from "./pages/tenant/modules/tsc/TscSettings";
import NemisLayout from "./pages/tenant/modules/nemis/NemisLayout";
import NemisDashboard from "./pages/tenant/modules/nemis/NemisDashboard";
import NemisValidation from "./pages/tenant/modules/nemis/NemisValidation";
import NemisMissing from "./pages/tenant/modules/nemis/NemisMissing";
import NemisExport from "./pages/tenant/modules/nemis/NemisExport";
import NemisImport from "./pages/tenant/modules/nemis/NemisImport";
import NemisTransfers from "./pages/tenant/modules/nemis/NemisTransfers";
import NemisDataEntry from "./pages/tenant/modules/nemis/NemisDataEntry";
import NemisHistory from "./pages/tenant/modules/nemis/NemisHistory";
import NemisSettings from "./pages/tenant/modules/nemis/NemisSettings";
import GenericReport from "./pages/tenant/modules/reports/GenericReport";
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
import SubjectChapters from "./pages/tenant/modules/SubjectChapters";
import CreateQuestionPaper from "./pages/tenant/modules/CreateQuestionPaper";
import QuestionPaperForm from "./pages/tenant/modules/QuestionPaperForm";
import AIQuestionImporter from "./pages/tenant/modules/AIQuestionImporter";
import PaperImport from "./pages/tenant/modules/papers/PaperImport";
import AfeyPage from "./pages/tenant/afey/AfeyPage";
import QuestionBankPage from "./pages/tenant/modules/papers/QuestionBankPage";
import PaperBuilder from "./pages/tenant/modules/papers/PaperBuilder";
import Exams from "./pages/tenant/modules/Exams";
import MarkEntry from "./pages/tenant/modules/MarkEntry";
import Results from "./pages/tenant/modules/Results";
import CreateExam from "./pages/tenant/modules/academics/exams/CreateExam";
import ExamMarks from "./pages/tenant/modules/academics/exams/ExamMarks";
import ResultCard from "./pages/tenant/modules/academics/exams/ResultCard";
import ClassReportCards from "./pages/tenant/modules/academics/exams/ClassReportCards";
import NewExamPage from "./pages/tenant/modules/academics/exams/NewExamPage";
import GenerateReportCards from "./pages/tenant/modules/academics/exams/GenerateReportCards";
import ViewGeneratedReportCards from "./pages/tenant/modules/academics/exams/ViewGeneratedReportCards";
import ReportCardSettings from "./pages/tenant/modules/academics/exams/ReportCardSettings";
import ScholarSheetPage from "./pages/tenant/modules/academics/exams/ScholarSheetPage";
import OnlineExamBuilder from "./pages/tenant/modules/academics/exams/OnlineExamBuilder";
import ManageExams from "./pages/tenant/modules/academics/exams/ManageExams";
import ExamPrintouts from "./pages/tenant/modules/academics/exams/printouts/Printouts";
import ExamAnalytics from "./pages/tenant/modules/academics/exams/Analytics";
import ExamDetail from "./pages/tenant/modules/academics/exams/ExamDetail";
import ExamRankings from "./pages/tenant/modules/academics/exams/ExamRankings";
import ExamSettings from "./pages/tenant/modules/academics/exams/ExamSettings";
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
import GeneratedInvoices from "./pages/tenant/modules/GeneratedInvoices";
import GenerateStudentInvoice from "./pages/tenant/modules/GenerateStudentInvoice";
import FeesPaidSlip from "./pages/tenant/modules/FeesPaidSlip";
import FeesDefaulters from "./pages/tenant/modules/FeesDefaulters";
import CollectFees from "./pages/tenant/modules/CollectFees";
import StudentFeesLedger from "./pages/tenant/modules/StudentFeesLedger";
import InvoiceDetail from "./pages/tenant/modules/InvoiceDetail";
import FeesReport from "./pages/tenant/modules/FeesReport";
import DeleteFees from "./pages/tenant/modules/DeleteFees";
import TransportManagement from "./pages/tenant/modules/TransportManagement";
import CalendarPage from "./pages/tenant/modules/CalendarPage";
import BusPickup from "./pages/tenant/modules/transport/BusPickup";
import TransportSettings from "./pages/tenant/modules/transport/TransportSettings";
import LiveTracking from "./pages/tenant/modules/transport/LiveTracking";

import InstituteProfile from "./pages/tenant/modules/InstituteProfile";
import AccountsForFees from "./pages/tenant/modules/AccountsForFees";
import RulesRegulations from "./pages/tenant/modules/RulesRegulations";
import NumberingSettings from "./pages/tenant/modules/NumberingSettings";
import { MarksApprovalList, MarksApprovalReview } from "./pages/tenant/modules/MarksApprovals";
import GradingTemplates from "./pages/tenant/modules/settings/GradingTemplates";
import CurriculumSettings from "./pages/tenant/modules/CurriculumSettings";
import ReportCardTemplates from "./pages/tenant/modules/ReportCardTemplates";
import ThemeLanguage from "./pages/tenant/modules/ThemeLanguage";
import AccountSettings from "./pages/tenant/modules/AccountSettings";
import FeeParticulars from "./pages/tenant/modules/FeeParticulars";
import FeeStructure from "./pages/tenant/modules/FeeStructure";
import ClassTuition from "./pages/tenant/modules/ClassTuition";
import FeesSettings from "./pages/tenant/modules/FeesSettings";
import DiscountTypes from "./pages/tenant/modules/DiscountTypes";

import Roles from "./pages/tenant/modules/Roles";
import Notifications from "./pages/tenant/modules/Notifications";
import Settings from "./pages/tenant/modules/Settings";
import Archives from "./pages/tenant/modules/Archives";
import GenerateCertificate from "./pages/tenant/modules/GenerateCertificate";
import SavedCertificates from "./pages/tenant/modules/SavedCertificates";
import CertificateTemplates from "./pages/tenant/modules/CertificateTemplates";
import ManageTestMarks from "./pages/tenant/modules/classTests/ManageTestMarks";
import TestResult from "./pages/tenant/modules/classTests/TestResult";
import RateBehaviours from "./pages/tenant/modules/behaviour/RateBehaviours";
import RateSkills from "./pages/tenant/modules/behaviour/RateSkills";
import Observations from "./pages/tenant/modules/behaviour/Observations";
import AffectiveReport from "./pages/tenant/modules/behaviour/AffectiveReport";
import PsychomotorReport from "./pages/tenant/modules/behaviour/PsychomotorReport";
import PlaceholderPage from "./pages/PlaceholderPage";
import NotFound, { NotFoundContent } from "./pages/NotFound";

// Portal request management (admin views of student-portal submissions)
import AdminRequisitions from "./pages/tenant/modules/portal/AdminRequisitions";
import AdminClearance from "./pages/tenant/modules/portal/AdminClearance";

// Parents module
import Parents from "./pages/tenant/modules/parents/Parents";
import ParentForm from "./pages/tenant/modules/parents/ParentForm";

// Wallet module
import AdminWallets from "./pages/tenant/modules/wallet/AdminWallets";

// Custom domain + branding
import DomainSettings from "./pages/tenant/modules/settings/DomainSettings";
import OrganizationSetup from "./pages/tenant/modules/settings/OrganizationSetup";
import AcademicTermSettings from "./pages/tenant/modules/settings/AcademicTermSettings";
import DepartmentManagement from "./pages/tenant/modules/departments/Departments";
import CurriculumSettings from "./pages/tenant/modules/academics-v2/CurriculumSettings";
import BlankForms from "./pages/tenant/modules/forms/BlankForms";
import CreateRequest from "./pages/tenant/modules/requests/CreateRequest";
import RequestDetail from "./pages/tenant/modules/requests/RequestDetail";
import { RequestsDashboard, MyRequests, InboxNew, PendingApprovals, ApprovedRequests, RejectedRequests, CompletedRequests, AllRequests, PendingRequests, PurchaseRequestsInbox, ExpenseRequestsInbox, RequestsSettings } from "./pages/tenant/modules/requests/RequestsPages";
import StaffRoles from "./pages/tenant/modules/roles/StaffRoles";
import AttendanceScanner from "./pages/tenant/modules/AttendanceScanner";
import PublicApplication from "./pages/public/PublicApplication";
import MealService from "./pages/tenant/modules/cafeteria/MealService";
import MealHistory from "./pages/tenant/modules/cafeteria/MealHistory";
import MissedMeals from "./pages/tenant/modules/cafeteria/MissedMeals";
import QuickSale from "./pages/tenant/modules/cafeteria/QuickSale";
import CanteenSettings from "./pages/tenant/modules/cafeteria/CanteenSettings";
import MealMenu from "./pages/tenant/modules/cafeteria/MealMenu";
import CanteenTransactions from "./pages/tenant/modules/cafeteria/CanteenTransactions";

// ── School POS Module ─────────────────────────────────────────────────────────
import POSLogin from "./modules/pos/pages/POSLogin";
import POSAdminLayout from "./modules/pos/layouts/POSAdminLayout";
import POSTerminalLayout from "./modules/pos/layouts/POSTerminalLayout";
import POSDashboard from "./modules/pos/pages/admin/POSDashboard";
import POSProducts from "./modules/pos/pages/admin/POSProducts";
import POSInventory from "./modules/pos/pages/admin/POSInventory";
import POSOrders from "./modules/pos/pages/admin/POSOrders";
import POSReports from "./modules/pos/pages/admin/POSReports";
import POSAccounts from "./modules/pos/pages/admin/POSAccounts";
import POSTerminalPage from "./modules/pos/pages/POSTerminalPage";

// ── Store Front / Online Store ────────────────────────────────────────────────
import StoreLayout from "./modules/pos/layouts/StoreLayout";
import StoreFront from "./modules/pos/pages/store/StoreFront";
import StoreProducts from "./modules/pos/pages/store/StoreProducts";
import StoreProductDetail from "./modules/pos/pages/store/StoreProductDetail";
import StoreCart from "./modules/pos/pages/store/StoreCart";
import StoreCheckout from "./modules/pos/pages/store/StoreCheckout";
import StoreOrderConfirmation from "./modules/pos/pages/store/StoreOrderConfirmation";

const queryClient = new QueryClient();

const App = () => {
  const { portal } = resolvePortal();
  const active = localStorage.getItem("active_portal");

  // Single-subdomain model: every school is one subdomain (egerton.manwellstore.com).
  // Everyone logs in there; the role token chosen at login decides which portal
  // renders — all within the same subdomain. (Legacy students./staff./parent.
  // prefixes are still honoured so local dev keeps working.)
  const portalApp =
    portal === "student" ? <StudentApp /> :
    portal === "staff" ? <StaffApp /> :
    portal === "parent" ? <ParentApp /> :
    (portal === "tenant" && active === "student" && localStorage.getItem("student_token")) ? <StudentApp /> :
    (portal === "tenant" && active === "parent" && localStorage.getItem("parent_token")) ? <ParentApp /> :
    (portal === "tenant" && (active === "staff" || active === "teacher") && localStorage.getItem("staff_token")) ? <StaffApp /> :
    null;

  if (portalApp) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <InstallPrompt />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <SeoManager />
            {portalApp}
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <PermissionsProvider>
        <Toaster />
        <Sonner />
        <InstallPrompt />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <SeoManager />
          <Routes>
            {/* 1. PUBLIC WEBSITE */}
            <Route path="/" element={<Landing />} />
            <Route path="/application" element={<PublicApplication />} />
            <Route path="/features" element={<Features />} />
            <Route path="/about" element={<About />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/blogs" element={<BlogList />} />
            <Route path="/blogs/:slug" element={<BlogPost />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/status" element={<Status />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/find-school" element={<TenantResolver />} />
            <Route path="/lnk/doc/:type/:publicId" element={<PublicDoc />} />
            {/* what a certificate / report-card QR code opens */}
            <Route path="/:school/certificate/verify/online/:certId" element={<VerifyDoc kind="certificate" />} />
            <Route path="/:school/report/verify/online/:token" element={<VerifyDoc kind="report" />} />
            <Route path="/:school/result/:examCode/:resultId/:studentId" element={<ResultOnline />} />   {/* shareable invoice / quotation / contract */}
            <Route path="/register" element={<Register />} />
            <Route path="/activate" element={<Activate />} />
            <Route path="/onboarding" element={<OnboardingWizard />} />

            {/* 2. SYSTEM OWNER PORTAL */}
            <Route path="/owner" element={<OwnerLogin />} />
            <Route path="/owner/login" element={<OwnerLogin />} />

            {/* Owner pages render their own header — guard by owner_token, NOT the
                tenant DashboardLayout (which would bounce owners to /login). */}
            <Route element={<OwnerGuard />}>
              <Route path="/owner/change-password" element={<OwnerChangePassword />} />
              <Route path="/owner/dashboard" element={<OwnerDashboard />} />
              <Route path="/owner/schools/:id" element={<ManageSchool />} />
              <Route path="/owner/tenants" element={<OwnerTenants />} />
              <Route path="/owner/organizations" element={<OwnerOrganizations />} />
              <Route path="/owner/communications" element={<OwnerCommunications />} />
              <Route path="/owner/plans" element={<OwnerPlans />} />
              <Route path="/owner/audit" element={<OwnerAudit />} />
              <Route path="/owner/announcements" element={<OwnerAnnouncements />} />
              <Route path="/owner/settings" element={<OwnerSettings />} />
              <Route path="/owner/billing" element={<OwnerBilling />} />
            </Route>

            {/* Student Portal — standalone */}
            <Route path="/student-portal" element={<StudentPortalLogin />} />
            <Route path="/student-portal/login" element={<StudentPortalLogin />} />
            <Route path="/student-portal/dashboard" element={<StudentPortalDashboard />} />

            {/* Staff Portal — standalone login, redirects to main dashboard */}
            <Route path="/staff-portal" element={<StaffPortalLogin />} />
            <Route path="/staff-portal/login" element={<StaffPortalLogin />} />

            {/* Parent Portal — standalone */}
            <Route path="/parent-portal" element={<ParentPortalLogin />} />
            <Route path="/parent-portal/login" element={<ParentPortalLogin />} />
            <Route path="/parent-portal/dashboard" element={<ParentPortalDashboard />} />

            {/* ORGANIZATION (multi-branch) — branded portal, guarded by org_token */}
            <Route path="/org" element={<OrgLogin />} />
            <Route path="/org/login" element={<OrgLogin />} />
            <Route path="/org/switch" element={<AccountSwitcher />} />
            <Route element={<OrgLayout />}>
              <Route path="/org/dashboard" element={<OrgDashboard />} />
              <Route path="/org/branches" element={<OrgBranches />} />
              <Route path="/org/transfers" element={<OrgTransfers />} />
              <Route path="/org/reports" element={<OrgReports />} />
              <Route path="/org/users" element={<OrgUsers />} />
              <Route path="/org/settings" element={<OrgSettings />} />
              <Route path="/org/expenses" element={<OrgExpenses />} />
              <Route path="/org/communications" element={<OrgCommunications />} />
              <Route path="/org/audit" element={<OrgAudit />} />
            </Route>

            {/* 3. TENANT APP (School Portal) */}
            <Route path="/login" element={<Login />} />
            <Route path="/logout" element={<Logout />} />
            <Route path="/access-denied" element={<AccessDenied />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/accept-invite" element={<AcceptInvite />} />

            <Route element={<DashboardLayout />}>
              {/* Role Dashboards */}
              <Route path="/dashboard" element={<RoleDashboard />} />
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
              <Route path="/students/find" element={<FindStudent />} />
              <Route path="/students/new" element={<AddStudent />} />
              <Route path="/students/report/:id" element={<StudentReport />} />
              <Route path="/students/history/:id" element={<StudentHistory />} />
              <Route path="/students/performance/:id" element={<StudentPerformance />} />
              <Route path="/students/edit/:id" element={<EditStudent />} />
              <Route path="/students/admission-letter" element={<AdmissionLetter />} />
              <Route path="/students/id-cards" element={<StudentIdCards />} />
              <Route path="/students/id-studio" element={<IdCardStudio />} />
              <Route path="/g/:groupKey" element={<GroupDashboard />} />
              {/* Sports module */}
              <Route path="/sports" element={<SportsDashboard />} />
              <Route path="/sports/setup" element={<SportsSetup />} />
              <Route path="/sports/participants" element={<SportsParticipants />} />
              <Route path="/sports/attendance" element={<SportsAttendance />} />
              <Route path="/sports/performance" element={<SportsPerformance />} />
              <Route path="/sports/reports" element={<SportsReports />} />
              {/* Trips & Excursions module */}
              <Route path="/trips" element={<TripsDashboard />} />
              <Route path="/trips/manage" element={<TripsManage />} />
              <Route path="/trips/participants" element={<TripParticipants />} />
              <Route path="/trips/documents" element={<TripDocuments />} />
              <Route path="/trips/attendance" element={<TripAttendance />} />
              <Route path="/trips/reports" element={<TripReports />} />
              {/* Front Desk module */}
              <Route path="/frontdesk" element={<FrontDeskDashboard />} />
              <Route path="/frontdesk/visitors" element={<Visitors />} />
              <Route path="/frontdesk/signout" element={<StudentSignOut />} />
              <Route path="/frontdesk/deliveries" element={<Deliveries />} />
              <Route path="/frontdesk/appointments" element={<Appointments />} />
              <Route path="/frontdesk/reports" element={<FrontDeskReports />} />
              {/* Secretary module */}
              <Route path="/secretary" element={<SecretaryDashboard />} />
              <Route path="/secretary/meetings" element={<SecretaryMeetings />} />
              <Route path="/secretary/reports" element={<SecretaryReports />} />
              <Route path="/students/print" element={<PrintBasicList />} />
              <Route path="/students/login" element={<ManageLogin />} />
              <Route path="/students/parent-login" element={<ManageParentLogin />} />

              {/* Portal request management */}
              <Route path="/admin/requisitions" element={<AdminRequisitions />} />
              <Route path="/admin/clearance" element={<AdminClearance />} />

              {/* Parents module */}
              <Route path="/parents" element={<Parents />} />
              <Route path="/parents/new" element={<ParentForm />} />
              <Route path="/parents/edit/:id" element={<ParentForm />} />

              {/* Wallet */}
              <Route path="/wallet" element={<AdminWallets />} />

              {/* M-PESA integration */}
              {/* M-PESA config is consolidated on the Integrations → Daraja page. */}
              <Route path="/settings/mpesa" element={<Navigate to="/integrations/daraja" replace />} />
              {/* The sidebar is the way around; old Home/Apps links land on the dashboard. */}
              <Route path="/home" element={<Navigate to="/dashboard" replace />} />
              <Route path="/apps" element={<Navigate to="/dashboard" replace />} />
              <Route path="/apps/:key" element={<Navigate to="/dashboard" replace />} />
              <Route path="/help" element={<HelpPage />} />
              <Route path="/students/promote" element={<PromoteStudents />} />
              <Route path="/students/promote/auto" element={<AutoPromotion />} />
               <Route path="/students/admissions" element={<Admissions />} />
              <Route path="/students/admissions/:id" element={<AdmissionView />} />
              <Route path="/students/guardians" element={<Guardians />} />
              <Route path="/students/families" element={<ManageFamilies />} />
               <Route path="/students/families/new" element={<NewFamily />} />
              {/* Specific student sub-pages must come BEFORE /:id to avoid route collision */}
              <Route path="/students/transfer" element={<StudentTransfer />} />
              <Route path="/students/discipline" element={<StudentDiscipline />} />
              <Route path="/students/medical" element={<StudentMedical />} />
              <Route path="/students/documents" element={<StudentDocuments />} />
              {/* Generic student profile — must be last */}
              <Route path="/students/:id" element={<StudentReport />} />

              {/* Employees */}
              <Route path="/staff" element={<AllEmployees />} />
              <Route path="/staff/teachers" element={<Teachers />} />
              <Route path="/staff/profile/:id" element={<StaffProfile />} />
              <Route path="/staff/new" element={<AddEmployee />} />
              <Route path="/staff/edit/:id" element={<AddEmployee />} />
              <Route path="/staff/id-cards" element={<StaffIdCards />} />
              <Route path="/staff/job-letter" element={<JobLetter />} />
              <Route path="/staff/login" element={<StaffManageLogin />} />
              <Route path="/staff/attendance" element={<PlaceholderPage title="Staff Attendance" subtitle="Manage and view employee attendance records" />} />

              {/* Classes */}
              <Route path="/classes" element={<Classes />} />
              <Route path="/classes/new" element={<NewClass />} />
              <Route path="/classes/room/:streamId" element={<ClassRoster />} />
              <Route path="/classes/:id" element={<ClassDetail />} />
              <Route path="/classes/streams" element={<Classes />} />
              <Route path="/classes/strands" element={<Strands />} />

              {/* Subjects */}
              <Route path="/subjects" element={<Subjects />} />
              <Route path="/subjects/all" element={<AllSubjects />} />
              <Route path="/subjects/new" element={<Navigate to="/subjects/offered" replace />} />
              <Route path="/subjects/offered" element={<SubjectsOffered />} />
              <Route path="/subjects/pathways" element={<SubjectPathways />} />
              <Route path="/subjects/assign" element={<AssignSubjects />} />
              <Route path="/subjects/activities" element={<CoCurricularActivities />} />
              <Route path="/subjects/categories" element={<PlaceholderPage title="Subject Categories" subtitle="Organize subjects by department" />} />
              <Route path="/subjects/curriculum" element={<CurriculumFramework />} />

              {/* Academic System V2 — Enrollment-Based Architecture */}
              {/* /academic-system/years uses the same unified Periods page as /academics/periods */}
              <Route path="/academic-system/years" element={<Periods />} />
              <Route path="/settings/term-settings" element={<AcademicTermSettings />} />
              <Route path="/settings/term-settings/:termId" element={<AcademicTermSettings />} />
              <Route path="/settings/curriculum" element={<CurriculumSettings />} />
              <Route path="/departments" element={<DepartmentManagement />} />
              <Route path="/blank-forms" element={<BlankForms />} />
              {/* Request Management & Approval Workflow */}
              <Route path="/requests" element={<RequestsDashboard />} />
              <Route path="/requests/new" element={<CreateRequest />} />
              <Route path="/requests/mine" element={<MyRequests />} />
              <Route path="/requests/inbox" element={<InboxNew />} />
              <Route path="/requests/pending" element={<PendingApprovals />} />
              <Route path="/requests/approved" element={<ApprovedRequests />} />
              <Route path="/requests/rejected" element={<RejectedRequests />} />
              <Route path="/requests/completed" element={<CompletedRequests />} />
              <Route path="/requests/all" element={<AllRequests />} />
              <Route path="/requests/admin-pending" element={<PendingRequests />} />
              <Route path="/requests/purchases" element={<PurchaseRequestsInbox />} />
              <Route path="/requests/expenses" element={<ExpenseRequestsInbox />} />
              <Route path="/requests/settings" element={<RequestsSettings />} />
              <Route path="/requests/:id" element={<RequestDetail />} />
              <Route path="/staff-roles" element={<StaffRoles />} />
              <Route path="/attendance-scanner" element={<AttendanceScanner />} />
              <Route path="/cafeteria/meal-service" element={<MealService />} />
              <Route path="/cafeteria/meal-history" element={<MealHistory />} />
              <Route path="/cafeteria/missed-meals" element={<MissedMeals />} />
              <Route path="/canteen/quick-sale" element={<QuickSale />} />
              <Route path="/canteen/settings" element={<CanteenSettings />} />
              <Route path="/cafeteria/menu" element={<MealMenu />} />
              <Route path="/canteen/transactions" element={<CanteenTransactions />} />
              <Route path="/academic-system/classes" element={<ClassesStreamsPage />} />
              <Route path="/academic-system/teacher-subjects" element={<TeacherSubjectsPage />} />
              {/* Enrollment feature removed — class/stream is set directly on the student. */}
              <Route path="/academic-system/enrollments" element={<Navigate to="/students" replace />} />
              <Route path="/academic-system/enroll" element={<Navigate to="/students" replace />} />
              <Route path="/academic-system/marks" element={<V2MarksEntry />} />
              <Route path="/academic-system/report-cards" element={<V2ReportCard />} />
              <Route path="/academic-system/student-history/:id" element={<StudentHistoryPage />} />

              {/* Academic Content Management */}
              <Route path="/academics/lesson-plans" element={<LessonPlanning />} />
              <Route path="/academics/lesson-plans/new" element={<LessonPlanForm />} />
              <Route path="/academics/lesson-plans/:id/edit" element={<LessonPlanForm />} />
              <Route path="/academics/schemes-of-work" element={<SchemesOfWork />} />
              <Route path="/academics/schemes-of-work/new" element={<SchemeForm />} />
              <Route path="/academics/schemes-of-work/:id/edit" element={<SchemeForm />} />
              <Route path="/academics/resources" element={<NotesResources />} />
              <Route path="/academics/resources/new" element={<ResourceForm />} />
              <Route path="/academics/resources/:id/edit" element={<ResourceForm />} />
              <Route path="/academics/assignments" element={<AssignmentsManagement />} />
              <Route path="/academics/assignments/new" element={<AssignmentForm />} />
              <Route path="/academics/assignments/:id/edit" element={<AssignmentForm />} />

              {/* Staff HR */}
              <Route path="/staff/departments" element={<Departments />} />
              <Route path="/staff/import" element={<PlaceholderPage title="Import Staff" subtitle="Bulk staff onboarding" />} />
              <Route path="/staff/photos" element={<PlaceholderPage title="Staff Photos" subtitle="Manage personnel identifiers" />} />
              <Route path="/staff/leave" element={<PlaceholderPage title="Leave Management" subtitle="Leave requests & approvals" />} />
              <Route path="/salary/pay" element={<PaySalary />} />
              <Route path="/salary/paid-slip" element={<SalaryPaidSlip />} />
              <Route path="/salary/sheet" element={<SalarySheet />} />
              <Route path="/salary/report" element={<SalaryReport />} />
              <Route path="/salary/components" element={<SalaryComponents />} />
              <Route path="/live" element={<LiveClass />} />
              <Route path="/live-classes" element={<LiveClasses />} />
              <Route path="/live-classes/settings" element={<LiveClassSettings />} />

              {/* Online Store & POS Admin */}
              <Route path="/pos-admin/analytics" element={<POSAdminAnalytics />} />
              <Route path="/pos-admin/categories" element={<POSAdminCategories />} />
              <Route path="/pos-admin/tax" element={<POSAdminTax />} />
              <Route path="/pos-admin/products" element={<POSAdminProducts />} />
              <Route path="/pos-admin/new-order" element={<POSAdminNewOrder />} />
              <Route path="/pos-admin/orders" element={<POSAdminAllOrders />} />

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

              {/* Question Paper Management Module */}
              <Route path="/afey" element={<AfeyPage />} />
              <Route path="/papers/import" element={<PaperImport />} />
              <Route path="/papers/import/ai" element={<AIQuestionImporter />} />
              <Route path="/papers/chapters" element={<SubjectChapters />} />
              <Route path="/papers/questions" element={<QuestionBankPage />} />
              <Route path="/papers/create" element={<PaperBuilder />} />
              <Route path="/papers/older" element={<CreateQuestionPaper />} />
              <Route path="/papers/create/new" element={<QuestionPaperForm />} />
              <Route path="/papers/create/new/:id" element={<QuestionPaperForm />} />

              {/* Exams Management Module */}
              <Route path="/exams" element={<Exams />} />
              <Route path="/exams/create" element={<CreateExam />} />
              <Route path="/exams/manage" element={<ManageExams />} />
              <Route path="/exams/printouts" element={<ExamPrintouts />} />
              <Route path="/exams/skills" element={<SkillReports />} />
              <Route path="/exams/marks" element={<ExamMarks />} />
              <Route path="/exams/new" element={<NewExamPage />} />
              <Route path="/exams/generate-reports" element={<GenerateReportCards />} />
              <Route path="/exams/generated-reports" element={<ViewGeneratedReportCards />} />
              <Route path="/exams/report-card-settings" element={<ReportCardSettings />} />
              <Route path="/exams/edit/:id" element={<NewExamPage />} />
              <Route path="/exams/:id/rankings" element={<ExamRankings />} />
              <Route path="/exams/:id/settings" element={<ExamSettings />} />
              <Route path="/exams/:id" element={<ExamDetail />} />
              <Route path="/exams/result-card" element={<Navigate to="/exams/scholar-sheet" replace />} />
              <Route path="/exams/scholar-sheet" element={<ScholarSheetPage />} />
              <Route path="/exams/online" element={<OnlineExamBuilder />} />
              <Route path="/exams/analytics" element={<ExamAnalytics />} />
              <Route path="/exams/class-reports" element={<ClassReportCards />} />
              <Route path="/exams/result-sheet" element={<ResultSheet />} />
              <Route path="/exams/schedule" element={<ExamSchedule />} />
              <Route path="/exams/date-sheet" element={<DateSheet />} />
              <Route path="/exams/blank-award-list" element={<BlankAwardList />} />

              {/* Communications */}
              <Route path="/communications" element={<Announcements />} />
              <Route path="/communications/announcements" element={<Announcements />} />
              <Route path="/communications/meetings" element={<Meetings />} />
              <Route path="/communications/templates" element={<MessageTemplates />} />
              <Route path="/communications/sms" element={<BulkSMS />} />
              <Route path="/communications/parent-messages" element={<ParentMessaging />} />
              <Route path="/communications/email" element={<ChannelComposer channel="email" />} />
              <Route path="/communications/whatsapp" element={<ChannelComposer channel="whatsapp" />} />
              <Route path="/communications/notifications" element={<ReportNotificationSettings />} />
              <Route path="/communications/preferences" element={<CommunicationPreferences />} />
              <Route path="/communications/settings" element={<Navigate to="/integrations" replace />} />
              <Route path="/communications/whatsapp-integration" element={<WhatsAppIntegration />} />

              {/* Integrations */}
              <Route path="/integrations" element={<IntegrationsPage />} />
              <Route path="/integrations/:key" element={<IntegrationDetail />} />

              {/* Roles & Permissions */}
              <Route path="/roles" element={<StaffRoles />} />
              <Route path="/roles/matrix" element={<RolesPermissions />} />

              {/* LMS / E-Learning */}
              <Route path="/lms" element={<LMSDashboard />} />
              <Route path="/lms/courses" element={<LMSCourses />} />
              <Route path="/lms/courses/new" element={<LMSCourses />} />
              <Route path="/lms/quizzes" element={<LMSQuizzes />} />
              <Route path="/lms/quizzes/new" element={<LMSQuizzes />} />
              <Route path="/lms/lessons" element={<NotesResources />} />

              {/* Hostel Management */}
              <Route path="/hostel" element={<HostelDashboard />} />
              <Route path="/hostel/dashboard" element={<HostelDashboard />} />
              <Route path="/hostel/rooms" element={<HostelRooms />} />
              <Route path="/hostel/beds" element={<BedManagement />} />
              <Route path="/hostel/allocation" element={<RoomAllocation />} />
              <Route path="/hostel/attendance" element={<HostelAttendance />} />
              <Route path="/hostel/fees" element={<HostelFees />} />
              <Route path="/hostel/settings" element={<HostelSettings />} />

              {/* Certificates Module */}
              <Route path="/certificates/generate" element={<GenerateCertificate />} />
              <Route path="/certificates/saved" element={<SavedCertificates />} />
              <Route path="/certificates/templates" element={<CertificateTemplates />} />

              {/* Class Tests Module */}
              <Route path="/tests/marks" element={<ManageTestMarks />} />
              <Route path="/tests/results" element={<TestResult />} />

              {/* Behaviour & Skills Module */}
              <Route path="/behaviour/rate" element={<RateBehaviours />} />
              <Route path="/skills/rate" element={<RateSkills />} />
              <Route path="/behaviour/observations" element={<Observations />} />
              <Route path="/behaviour/reports/affective" element={<AffectiveReport />} />
              <Route path="/behaviour/reports/psychomotor" element={<PsychomotorReport />} />

              {/* Finance */}
              <Route path="/fees/till-transactions" element={<TillTransactions />} />
              <Route path="/fees/payment-inbox" element={<PaymentInbox />} />
              <Route path="/fees/dashboard" element={<FeesDashboard />} />
              <Route path="/fees/generate-invoice" element={<GenerateFeesInvoice />} />
              <Route path="/fees/invoices" element={<GeneratedInvoices />} />
              <Route path="/fees/generate-student-invoice" element={<GenerateStudentInvoice />} />
              <Route path="/fees/invoice/:id" element={<InvoiceDetail />} />
              <Route path="/fees/collect" element={<CollectFees />} />
              <Route path="/fees/ledger" element={<StudentFeesLedger />} />
              <Route path="/fees/paid-slip" element={<FeesPaidSlip />} />
              <Route path="/fees/defaulters" element={<FeesDefaulters />} />
              <Route path="/fees/report" element={<FeesReport />} />
              <Route path="/fees/delete" element={<DeleteFees />} />
              <Route path="/fees/scholarships" element={<Scholarships />} />
              <Route path="/fees/sponsors" element={<Sponsors />} />
              <Route path="/fees/credits" element={<FeeCredits />} />
              <Route path="/fees/audit-log" element={<FeeAuditLog />} />
              
              {/* Transport Module */}
              <Route path="/transport/zones" element={<TransportManagement tab="zones" />} />
              <Route path="/transport/zones/new" element={<TransportManagement tab="new" />} />
              <Route path="/transport/zones/edit/:id" element={<TransportManagement tab="edit" />} />
              <Route path="/transport/buses" element={<TransportManagement tab="buses" />} />
              <Route path="/transport/buses/new" element={<TransportManagement tab="new-bus" />} />
              <Route path="/transport/buses/edit/:id" element={<TransportManagement tab="edit-bus" />} />
              <Route path="/transport/assign" element={<TransportManagement tab="assign" />} />
              <Route path="/transport/pickup" element={<BusPickup />} />
              <Route path="/transport/live" element={<LiveTracking />} />
              <Route path="/transport/settings" element={<TransportSettings />} />
              <Route path="/transport/report" element={<TransportManagement tab="report" />} />
              
              <Route path="/finance" element={<Finance />} />
              <Route path="/finance/invoices" element={<PlaceholderPage title="Invoice List" subtitle="Student fee invoices" />} />
              <Route path="/finance/payments" element={<PlaceholderPage title="Record Payment" subtitle="Receive & track payments" />} />
              
              {/* Accounts */}
              <Route path="/accounts/chart" element={<ChartOfAccount />} />
              <Route path="/accounts/income" element={<AddIncome />} />
              <Route path="/accounts/expense" element={<AddExpense />} />
              <Route path="/accounts/statement" element={<AccountStatement />} />

              {/* Calendar */}
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/calendar/events" element={<CalendarPage />} />
              <Route path="/calendar/upcoming" element={<CalendarPage />} />

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
              <Route path="/reports" element={<ReportsCenter />} />

              {/* Expense Management */}
              <Route path="/expense" element={<ExpenseLayout />}>
                <Route index element={<ExpenseDashboard />} />
                <Route path="list" element={<ExpensesPage />} />
                <Route path="categories" element={<CategoriesPage />} />
                <Route path="budgets" element={<BudgetsPage />} />
                <Route path="requests" element={<RequestsPage />} />
                <Route path="orders" element={<OrdersPage />} />
                <Route path="suppliers" element={<SuppliersPage />} />
                <Route path="payments" element={<PaymentsPage />} />
                <Route path="recurring" element={<RecurringPage />} />
                <Route path="approvals" element={<ApprovalsPage />} />
                <Route path="reports" element={<ExpReportsPage />} />
                <Route path="settings" element={<ExpSettingsPage />} />
              </Route>

              {/* Accounting / General Ledger */}
              <Route path="/accounting" element={<AcctLayout />}>
                <Route index element={<AcctDashboard />} />
                <Route path="coa" element={<CoaPage />} />
                <Route path="journals" element={<JournalsPage />} />
                <Route path="ledger" element={<LedgerPage />} />
                <Route path="trial-balance" element={<TrialBalancePage />} />
                <Route path="income-statement" element={<IncomeStatementPage />} />
                <Route path="balance-sheet" element={<BalanceSheetPage />} />
                <Route path="cash-flow" element={<CashFlowPage />} />
                <Route path="receivables" element={<ReceivablesPage />} />
                <Route path="payables" element={<PayablesPage />} />
                <Route path="budgeting" element={<BudgetingPage />} />
                <Route path="reconciliation" element={<ReconciliationPage />} />
                <Route path="periods" element={<PeriodsPage />} />
                <Route path="settings" element={<AcctSettings />} />
              </Route>

              {/* Procurement */}
              <Route path="/procurement" element={<ProcLayout />}>
                <Route index element={<ProcDashboard />} />
                <Route path="requests" element={<ProcRequests />} />
                <Route path="orders" element={<ProcOrders />} />
                <Route path="suppliers" element={<ProcSuppliers />} />
                <Route path="quotations" element={<QuotationsPage />} />
                <Route path="grn" element={<GrnPage />} />
                <Route path="matching" element={<MatchingPage />} />
                <Route path="contracts" element={<ContractsPage />} />
                <Route path="tenders" element={<TendersPage />} />
                <Route path="reports" element={<ProcReports />} />
                <Route path="settings" element={<ProcSettings />} />
              </Route>

              {/* CBC Assessment */}
              <Route path="/cbc" element={<CbcLayout />}>
                <Route index element={<CbcDashboard />} />
                <Route path="learning-areas" element={<LearningAreasPage />} />
                <Route path="competencies" element={<CompetenciesPage />} />
                <Route path="strands" element={<StrandsPage />} />
                <Route path="activities" element={<ActivitiesPage />} />
                <Route path="record" element={<RecordPage />} />
                <Route path="progress" element={<ProgressPage />} />
                <Route path="report-cards" element={<ReportCardsPage />} />
                <Route path="comments" element={<CommentsPage />} />
                <Route path="analytics" element={<AnalyticsPage />} />
                <Route path="reports" element={<CbcReportsPage />} />
                <Route path="settings" element={<CbcSettingsPage />} />
              </Route>

              {/* Teacher Service Commission */}
              <Route path="/tsc/teachers/:id" element={<TscTeacherProfile />} />
              <Route path="/tsc" element={<TscLayout />}>
                <Route index element={<TscDashboard />} />
                <Route path="teachers" element={<TscTeachers />} />
                <Route path="records" element={<TscRecords />} />
                <Route path="workload" element={<TscWorkload />} />
                <Route path="qualifications" element={<TscRecords tab="qualifications" />} />
                <Route path="deployment" element={<TscRecords tab="deployment" />} />
                <Route path="leave" element={<TscRecords tab="leave" />} />
                <Route path="performance" element={<TscRecords tab="performance" />} />
                <Route path="reports" element={<TscReports />} />
                <Route path="settings" element={<TscSettings />} />
              </Route>

              {/* NEMIS Assistant */}
              <Route path="/nemis" element={<NemisLayout />}>
                <Route index element={<NemisDashboard />} />
                <Route path="validation" element={<NemisValidation />} />
                <Route path="missing" element={<NemisMissing />} />
                <Route path="export" element={<NemisExport />} />
                <Route path="import" element={<NemisImport />} />
                <Route path="transfers" element={<NemisTransfers />} />
                <Route path="data-entry" element={<NemisDataEntry />} />
                <Route path="history" element={<NemisHistory />} />
                <Route path="settings" element={<NemisSettings />} />
              </Route>
              <Route path="/reports/view/:key" element={<GenericReport />} />
              <Route path="/reports/computed/:key" element={<ComputedReport />} />
              {/* <Route path="/reports/report-cards" element={<StudentsReportCard />} /> */}
              <Route path="/reports/students-info" element={<StudentsInfoReport />} />
              <Route path="/reports/parents-info" element={<ParentsInfoReport />} />
              <Route path="/reports/attendance/monthly-students" element={<StudentsMonthlyAttendanceReport />} />
              <Route path="/reports/attendance/monthly-staff" element={<StaffMonthlyAttendanceReport />} />
              <Route path="/reports/fee-collection" element={<FeeCollectionReport />} />
              <Route path="/reports/student-progress" element={<StudentProgressReport />} />
              <Route path="/reports/accounts" element={<AccountsReport />} />
              <Route path="/reports/custom" element={<CustomisedReports />} />

              {/* Institutional Modules */}
              {/* Library Module */}
              <Route path="/library" element={<LibraryDashboard />} />
              <Route path="/library/dashboard" element={<LibraryDashboard />} />
              <Route path="/library/books" element={<LibraryBooks />} />
              <Route path="/library/categories" element={<LibraryCategories />} />
              <Route path="/library/issue" element={<IssueBook />} />
              <Route path="/library/return" element={<ReturnBook />} />
              <Route path="/library/overdue" element={<OverdueFines />} />
              <Route path="/library/members" element={<LibraryMembers />} />
              <Route path="/library/reports" element={<LibraryReports />} />
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
              <Route path="/settings/class-tuition" element={<ClassTuition />} />
              <Route path="/fees/settings" element={<FeesSettings />} />
              <Route path="/settings/discount-type" element={<DiscountTypes />} />
              <Route path="/settings/accounts" element={<AccountsForFees />} />
              <Route path="/settings/rules" element={<RulesRegulations />} />
              <Route path="/settings/numbering" element={<NumberingSettings />} />
              <Route path="/marks-approval" element={<MarksApprovalList />} />
              <Route path="/marks-approval/:id" element={<MarksApprovalReview />} />
              <Route path="/settings/grading" element={<Navigate to="/settings/grading-templates" replace />} />
              <Route path="/settings/grading-templates" element={<GradingTemplates />} />
              <Route path="/settings/curriculum" element={<CurriculumSettings />} />
              <Route path="/settings/report-templates" element={<ReportCardTemplates />} />
              <Route path="/settings/domains" element={<DomainSettings />} />
              <Route path="/settings/theme" element={<ThemeLanguage />} />
              <Route path="/settings/account" element={<AccountSettings />} />
              <Route path="/settings/organization" element={<OrganizationSetup />} />
              <Route path="/settings/users" element={<PlaceholderPage title="Users & Access" subtitle="Manage school staff roles" />} />
              <Route path="/roles" element={<Roles />} />
              <Route path="/archives" element={<Archives />} />
              <Route path="/notifications" element={<Notifications />} />
              {/* In-layout 404 — unknown app routes render inside the sidebar/top bar */}
              <Route path="*" element={<NotFoundContent />} />
            </Route>

            {/* ── School POS Module ─────────────────────────────── */}
            <Route path="/pos/login" element={<POSLogin />} />

            {/* POS Terminal — full screen */}
            <Route path="/pos" element={<POSTerminalLayout />}>
              <Route path="terminal" element={<POSTerminalPage />} />
            </Route>

            {/* POS Admin — sidebar layout */}
            <Route path="/pos/admin" element={<POSAdminLayout />}>
              <Route index element={<POSDashboard />} />
              <Route path="products" element={<POSProducts />} />
              <Route path="inventory" element={<POSInventory />} />
              <Route path="orders" element={<POSOrders />} />
              <Route path="reports" element={<POSReports />} />
              <Route path="accounts" element={<POSAccounts />} />
            </Route>

            {/* ── Online Storefront ─────────────────────────────────────── */}
            <Route path="/store" element={<StoreLayout />}>
              <Route index element={<StoreFront />} />
              <Route path="products" element={<StoreProducts />} />
              <Route path="products/:id" element={<StoreProductDetail />} />
              <Route path="cart" element={<StoreCart />} />
              <Route path="checkout" element={<StoreCheckout />} />
              <Route path="orders/:orderNumber" element={<StoreOrderConfirmation />} />
            </Route>

            {/* Live Class Room — full-screen, outside dashboard layout */}
            <Route path="/live/room/:meetingId" element={<LiveRoom />} />
            <Route path="/live-classes/room/:id" element={<MeetingRoom />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </PermissionsProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
