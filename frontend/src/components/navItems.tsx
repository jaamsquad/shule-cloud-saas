// The admin sidebar's groups and pages (moved out of AppSidebar so lib/apps can use it).
import type React from "react";
import {
  Home, Settings, LayoutTemplate, BookOpen, User, Briefcase,
  Wallet, Banknote, CreditCard, UserCheck, Calendar, Pencil,
  Eye, ShoppingCart, MessageCircle, MessageSquare, Mail, Video,
  Copy, ClipboardList, FileText, Lock, Award, Truck, BookMarked, GraduationCap, Building2,
  Zap, Shield, Monitor, Utensils, Trophy, MapPin, DoorOpen, ClipboardCheck, Landmark
} from "lucide-react";
import { groupSlug } from "@/lib/groupSlug";

// Groups that already have a purpose-built dashboard child route — for those we
// link the parent to that page instead of the generic overview.
const NATIVE_GROUP_DASHBOARD: Record<string, string> = {
  Hostel: "/hostel/dashboard",
  Library: "/library/dashboard",
  "Live Class & LMS": "/lms",
  "Point of Sale": "/pos-admin/analytics",
  Reports: "/reports",
  Calendar: "/calendar",
};

// Resolve where a group's parent label should navigate (its overview page).
export const groupOverviewPath = (label: string) => NATIVE_GROUP_DASHBOARD[label] || `/g/${groupSlug(label)}`;

export interface NavChild { label: string; path: string; locked?: boolean; create?: boolean; pagePerm?: string; planModule?: string }
export interface NavItem {
  label: string;
  icon: React.ElementType;
  path?: string;
  locked?: boolean;
  moduleKey?: string; // maps to permission module key
  children?: NavChild[];
}

// Child links that are "create/add" pages — hidden unless the user has the
// parent module's create permission. Matched by path.
export const CREATE_PATHS = new Set<string>([
  "/classes/new", "/subjects/new", "/students/new", "/parents/new",
  "/staff/new", "/accounts/income", "/accounts/expense", "/fees/generate-invoice",
  "/fees/generate-student-invoice", "/transport/zones/new", "/transport/buses/new",
  "/exams/create", "/certificates/generate", "/timetable/create",
  "/communications/announcements",
]);

export const navItems: NavItem[] = [
  { label: "Dashboard", icon: Home, path: "/dashboard", moduleKey: "dashboard" },
  
  {
    label: "Classes", icon: LayoutTemplate, moduleKey: "classes", children: [
      { label: "All Classes", path: "/classes" },
      { label: "New Class", path: "/classes/new" },
      { label: "Classes & Streams", path: "/academic-system/classes" },
      { label: "Curriculum Settings", path: "/settings/curriculum" },
    ]
  },
  { label: "Subjects", icon: BookOpen, moduleKey: "subjects", children: [
      { label: "Subjects We Offer", path: "/subjects/offered" },
      { label: "All Subjects", path: "/subjects/all" },
      { label: "Classes With Subjects", path: "/subjects" },
      { label: "Assign Subjects", path: "/subjects/assign" },
      { label: "Co-Curricular & Talents", path: "/subjects/activities" },
      { label: "Teacher ↔ Subjects", path: "/academic-system/teacher-subjects" },
      { label: "Pathways (CBE)", path: "/subjects/pathways" },
  ] },
  { label: "Students", icon: User, moduleKey: "students", children: [
      { label: "All Students", path: "/students", pagePerm: "students.all" },
      { label: "Find Student", path: "/students/find", pagePerm: "students.all" },
      { label: "Student Wallets", path: "/wallet", pagePerm: "students.wallets" },
      { label: "Add New", path: "/students/new", pagePerm: "students.add" },
      { label: "Admissions", path: "/students/admissions", pagePerm: "students.admissions" },
      { label: "Manage Families", path: "/students/families", pagePerm: "students.families" },
      { label: "Promote Students", path: "/students/promote", pagePerm: "students.promote" },
      { label: "Auto Promotion", path: "/students/promote/auto", pagePerm: "students.promote" },
      { label: "Transfer Management", path: "/students/transfer", pagePerm: "students.transfer" },
      { label: "Discipline Records", path: "/students/discipline", pagePerm: "students.discipline" },
      { label: "Medical Records", path: "/students/medical", pagePerm: "students.medical" },
      { label: "Student Documents", path: "/students/documents", pagePerm: "students.documents" },
      { label: "Student ID Cards", path: "/students/id-cards", pagePerm: "students.id_cards" },
      { label: "ID Card Studio (Navy)", path: "/students/id-studio", pagePerm: "students.id_studio" },
      { label: "Admission Letter", path: "/students/admission-letter", pagePerm: "students.admission_letter" },
      { label: "Manage Login", path: "/students/login", pagePerm: "students.manage_login" },
      // { label: "Parent Login", path: "/students/parent-login", pagePerm: "students.parent_login" },
  ] },
  { label: "Parents", icon: UserCheck, moduleKey: "students", children: [
      { label: "All Parents", path: "/parents" },
      { label: "Add New Parent", path: "/parents/new" },
      { label: "Parent Login", path: "/students/parent-login" },
  ] },
  { label: "Portal Requests", icon: ClipboardList, moduleKey: "students", children: [
      { label: "Academic Requisitions", path: "/admin/requisitions" },
      { label: "Clearance Requests", path: "/admin/clearance" },
  ] },
  { label: "Departments", icon: Building2, moduleKey: "employees", children: [
      { label: "Department Management", path: "/departments" },
      { label: "HOD Dashboard", path: "/dashboard/hod" },
      { label: "Overview", path: "/departments?tab=overview" },
      { label: "Members", path: "/departments?tab=members" },
      { label: "Marks Approval", path: "/departments?tab=marks" },
      { label: "Analysis", path: "/departments?tab=analysis" },
      { label: "Supervision", path: "/departments?tab=supervision" },
      { label: "Exams", path: "/departments?tab=exams" },
      { label: "CBC", path: "/departments?tab=cbc" },
      { label: "Timetable", path: "/departments?tab=timetable" },
      { label: "Resources", path: "/departments?tab=resources" },
      { label: "Notices", path: "/departments?tab=notices" },
      { label: "Reports", path: "/departments?tab=reports" },
      { label: "Assets", path: "/departments?tab=assets" },
      { label: "Meetings", path: "/departments?tab=meetings" },
      { label: "Audit", path: "/departments?tab=audit" },
  ] },
  { label: "Employees", icon: Briefcase, moduleKey: "employees", children: [
      { label: "All Employees", path: "/staff" },
      { label: "Teachers", path: "/staff/teachers" },
      { label: "Add New", path: "/staff/new" },
      { label: "Staff ID Cards", path: "/staff/id-cards" },
      { label: "Job Letter", path: "/staff/job-letter" },
      { label: "Manage Login", path: "/staff/login" },
      { label: "TA Dashboard", path: "/tsc" },
      { label: "TA Teachers", path: "/tsc/teachers" },
      { label: "TA Records", path: "/tsc/records" },
      { label: "Teaching Workload", path: "/tsc/workload" },
      { label: "Qualifications", path: "/tsc/qualifications" },
      { label: "Deployment History", path: "/tsc/deployment" },
      { label: "Leave Management", path: "/tsc/leave" },
      { label: "Performance", path: "/tsc/performance" },
      { label: "TA Reports", path: "/tsc/reports" },
      { label: "TA Settings", path: "/tsc/settings" },
  ] },
  { label: "Requests", icon: ClipboardList, moduleKey: "employees", children: [
      { label: "Dashboard", path: "/requests" },
      { label: "Create Request", path: "/requests/new" },
      { label: "My Requests", path: "/requests/mine" },
      { label: "New Requests", path: "/requests/inbox" },
      { label: "Pending Approvals", path: "/requests/pending" },
      { label: "Approved", path: "/requests/approved" },
      { label: "Rejected", path: "/requests/rejected" },
      { label: "Purchase Requests", path: "/requests/purchases" },
      { label: "Expense Requests", path: "/requests/expenses" },
      { label: "All Requests", path: "/requests/all" },
      { label: "Completed", path: "/requests/completed" },
      { label: "Request Settings", path: "/requests/settings" },
  ] },
  // { label: "Accounts", icon: Wallet, moduleKey: "accounts", children: [
  //     { label: "Chart Of Account", path: "/accounts/chart" },
  //     { label: "Add Income", path: "/accounts/income" },
  //     { label: "Add Expense", path: "/accounts/expense" },
  //     { label: "Account Statement", path: "/accounts/statement" },
  // ] },
  { label: "Expense Management", icon: Wallet, moduleKey: "expenses", children: [
      { label: "Dashboard", path: "/expense" },
      { label: "Expenses", path: "/expense/list" },
      { label: "Categories", path: "/expense/categories" },
      { label: "Budget Control", path: "/expense/budgets" },
      { label: "Purchase Requests", path: "/expense/requests" },
      { label: "Purchase Orders", path: "/expense/orders" },
      { label: "Suppliers", path: "/expense/suppliers" },
      { label: "Payments", path: "/expense/payments" },
      { label: "Recurring Expenses", path: "/expense/recurring" },
      { label: "Approvals", path: "/expense/approvals" },
      { label: "Reports", path: "/expense/reports" },
      { label: "Settings", path: "/expense/settings" },
  ] },
  { label: "Procurement", icon: ShoppingCart, moduleKey: "procurement", children: [
      { label: "Dashboard", path: "/procurement" },
      { label: "Purchase Requests", path: "/procurement/requests" },
      { label: "Purchase Orders", path: "/procurement/orders" },
      { label: "Suppliers", path: "/procurement/suppliers" },
      { label: "Quotations", path: "/procurement/quotations" },
      { label: "Goods Received", path: "/procurement/grn" },
      { label: "Invoice Matching", path: "/procurement/matching" },
      { label: "Contracts", path: "/procurement/contracts" },
      { label: "Tender Management", path: "/procurement/tenders" },
      { label: "Reports", path: "/procurement/reports" },
      { label: "Settings", path: "/procurement/settings" },
  ] },
  { label: "Accounting", icon: Wallet, moduleKey: "accounting", children: [
      { label: "Dashboard", path: "/accounting" },
      { label: "Chart of Accounts", path: "/accounting/coa" },
      { label: "Journal Entries", path: "/accounting/journals" },
      { label: "General Ledger", path: "/accounting/ledger" },
      { label: "Trial Balance", path: "/accounting/trial-balance" },
      { label: "Income Statement", path: "/accounting/income-statement" },
      { label: "Balance Sheet", path: "/accounting/balance-sheet" },
      { label: "Cash Flow", path: "/accounting/cash-flow" },
      { label: "Accounts Receivable", path: "/accounting/receivables" },
      { label: "Accounts Payable", path: "/accounting/payables" },
      { label: "Budgeting", path: "/accounting/budgeting" },
      { label: "Reconciliation", path: "/accounting/reconciliation" },
      { label: "Fiscal Periods", path: "/accounting/periods" },
      { label: "Settings", path: "/accounting/settings" },
  ] },
  { label: "Fees", icon: Banknote, moduleKey: "fees", children: [ 
      { label: "Fees Dashboard", path: "/fees/dashboard" },
      { label: "Generate Fees Invoice", path: "/fees/generate-invoice" },
      { label: "Generate Per Student", path: "/fees/generate-student-invoice" },
      { label: "Generated Invoices", path: "/fees/invoices" },
      { label: "Collect Fees", path: "/fees/collect" },
      // { label: "Till / Paybill Transactions", path: "/fees/till-transactions" },
      // { label: "C2B Payment Inbox", path: "/fees/payment-inbox" },
      { label: "Student Ledger", path: "/fees/ledger" },
      { label: "Fees Paid Slip", path: "/fees/paid-slip" },
      { label: "Fees Defaulters", path: "/fees/defaulters" },
      { label: "Scholarships & Bursaries", path: "/fees/scholarships" },
      { label: "Sponsors", path: "/fees/sponsors" },
      { label: "Credits & Overpayments", path: "/fees/credits" },
      { label: "Fees Report", path: "/fees/report", },
      { label: "Fee Audit Log", path: "/fees/audit-log" },
      { label: "Delete Fees", path: "/fees/delete", },
      { label: "Fees Settings", path: "/fees/settings" },
  ] },
  { label: "Salary", icon: CreditCard, moduleKey: "salary", children: [
      { label: "Pay Salary", path: "/salary/pay" },
      { label: "Salary Paid Slip", path: "/salary/paid-slip" },
      { label: "Salary Sheet", path: "/salary/sheet" },
      { label: "Salary Report", path: "/salary/report" },
      { label: "Salary Components", path: "/salary/components" },
  ] },
  { label: "Transport", icon: Truck, moduleKey: "transport", children: [
      { label: "Live Tracking", path: "/transport/live" },
      { label: "Zones", path: "/transport/zones" },
      { label: "New Zone", path: "/transport/zones/new" },
      { label: "Buses", path: "/transport/buses" },
      { label: "New Bus", path: "/transport/buses/new" },
      { label: "Assign Student", path: "/transport/assign" },
      { label: "Bus Pickup & Drop", path: "/transport/pickup" },
      { label: "Report", path: "/transport/report" },
      { label: "Settings", path: "/transport/settings" }
  ] },
  { label: "Attendance", icon: UserCheck, moduleKey: "attendance", children: [
      { label: "Card Scanner", path: "/attendance-scanner" },
      { label: "Students Attendance", path: "/attendance/students" },
      { label: "Employees Attendance", path: "/attendance/employees" },
      { label: "Class wise Report", path: "/attendance/reports/class-wise" },
      { label: "Students Attendance Report", path: "/attendance/reports/students" },
      { label: "Employees Attendance Report", path: "/attendance/reports/employees" },
  ] },
  { label: "Cafeteria", icon: Utensils, moduleKey: "cafeteria", children: [
      { label: "Meal Service (Kitchen)", path: "/cafeteria/meal-service" },
      { label: "Weekly Meal Menu", path: "/cafeteria/menu" },
      { label: "Meal History", path: "/cafeteria/meal-history" },
      { label: "Missed Meals", path: "/cafeteria/missed-meals" },
      { label: "Quick Sale (Canteen)", path: "/canteen/quick-sale" },
      { label: "Canteen Transactions", path: "/canteen/transactions" },
      { label: "Canteen Settings", path: "/canteen/settings" },
  ] },
  { label: "Sports", icon: Trophy, moduleKey: "sports", children: [
      { label: "Sports Dashboard", path: "/sports" },
      { label: "Sports Setup", path: "/sports/setup" },
      { label: "Participants", path: "/sports/participants" },
      { label: "Sports Attendance", path: "/sports/attendance" },
      { label: "Performance & Awards", path: "/sports/performance" },
      { label: "Sports Reports", path: "/sports/reports" },
  ] },
  { label: "Trips & Excursions", icon: MapPin, moduleKey: "trips", children: [
      { label: "Trips Dashboard", path: "/trips" },
      { label: "Create / Manage Trips", path: "/trips/manage" },
      { label: "Participants", path: "/trips/participants" },
      { label: "Trip Documents", path: "/trips/documents" },
      { label: "Trip Attendance", path: "/trips/attendance" },
      { label: "Trip Reports", path: "/trips/reports" },
  ] },
  { label: "Front Desk", icon: DoorOpen, moduleKey: "frontdesk", children: [
      { label: "Front Desk Dashboard", path: "/frontdesk" },
      { label: "Visitor Management", path: "/frontdesk/visitors" },
      { label: "Student Sign Out", path: "/frontdesk/signout" },
      { label: "Delivery Register", path: "/frontdesk/deliveries" },
      { label: "Appointments", path: "/frontdesk/appointments" },
      { label: "Reception Reports", path: "/frontdesk/reports" },
  ] },
  { label: "Secretary", icon: ClipboardCheck, moduleKey: "secretary", children: [
      { label: "Secretary Dashboard", path: "/secretary" },
      { label: "Student Records", path: "/students" },
      { label: "Communication Center", path: "/communications/announcements" },
      { label: "Meeting Management", path: "/secretary/meetings" },
      { label: "Secretary Reports", path: "/secretary/reports" },
  ] },
  
  { label: "NEMIS Assistant", icon: Landmark, moduleKey: "nemis", children: [
      { label: "Dashboard", path: "/nemis" },
      { label: "Student Validation", path: "/nemis/validation" },
      { label: "Missing Information", path: "/nemis/missing" },
      { label: "Export Data", path: "/nemis/export" },
      { label: "Import Updates", path: "/nemis/import" },
      { label: "Transfer Management", path: "/nemis/transfers" },
      { label: "Data Entry Assistant", path: "/nemis/data-entry" },
      { label: "Sync History", path: "/nemis/history" },
      { label: "Settings", path: "/nemis/settings" },
  ] },
  { label: "Calendar", icon: Calendar, moduleKey: "calendar", children: [
      { label: "School Calendar", path: "/calendar" },
      { label: "Calendar Events", path: "/calendar/events" },
      { label: "Upcoming Events", path: "/calendar/upcoming" },
  ] },
  { label: "Timetable", icon: Calendar, moduleKey: "timetable", children: [
      { label: "Weekdays", path: "/timetable/weekdays" },
      { label: "Time Periods", path: "/timetable/periods" },
      { label: "Class Rooms", path: "/timetable/rooms" },
      { label: "Create Timetable", path: "/timetable/create" },
      { label: "Generate For Class", path: "/timetable/class" },
      { label: "Generate For Teacher", path: "/timetable/teacher" },
  ] },
  { label: "Academic Content", icon: GraduationCap, moduleKey: "academics_content", children: [
      { label: "Lesson Plans", path: "/academics/lesson-plans" },
      { label: "Schemes of Work", path: "/academics/schemes-of-work" },
      { label: "Notes & Resources", path: "/academics/resources" },
      { label: "Assignments", path: "/academics/assignments" },
      { label: "Homework", path: "/homework" },
  ] },
  { label: "CBC Assessment", icon: BookOpen, moduleKey: "cbc", children: [
      { label: "Dashboard", path: "/cbc" },
      { label: "Learning Areas", path: "/cbc/learning-areas" },
      { label: "Competencies", path: "/cbc/competencies" },
      { label: "Strands & Sub-Strands", path: "/cbc/strands" },
      { label: "Assessment Activities", path: "/cbc/activities" },
      { label: "Record Assessments", path: "/cbc/record" },
      { label: "Learner Progress", path: "/cbc/progress" },
      { label: "Report Cards", path: "/cbc/report-cards" },
      { label: "Teacher Comments", path: "/cbc/comments" },
      { label: "Analytics", path: "/cbc/analytics" },
      { label: "Reports", path: "/cbc/reports" },
      { label: "Settings", path: "/cbc/settings" },
  ] },
  // { label: "Homework", icon: Pencil, path: "/homework", moduleKey: "homework" },
  { label: "Behaviour & Skills", icon: Eye, moduleKey: "behaviour", children: [
      { label: "Rate Behaviours", path: "/behaviour/rate" },
      { label: "Rate Skills", path: "/skills/rate" },
      { label: "Observation Diary", path: "/behaviour/observations" },
      { label: "Affective Report", path: "/behaviour/reports/affective" },
      { label: "Psychomotor Report", path: "/behaviour/reports/psychomotor" }
  ] },
  
  { label: "Hostel", icon: Building2, moduleKey: "hostel", children: [
      { label: "Dashboard", path: "/hostel/dashboard" },
      { label: "Rooms & Blocks", path: "/hostel/rooms" },
      { label: "Bed Management", path: "/hostel/beds" },
      { label: "Room Allocation", path: "/hostel/allocation" },
      { label: "Hostel Attendance", path: "/hostel/attendance" },
      { label: "Hostel Fees", path: "/hostel/fees" },
      { label: "Settings", path: "/hostel/settings" },
  ] },
  { label: "Library", icon: BookOpen, moduleKey: "library", children: [
      { label: "Dashboard", path: "/library/dashboard" },
      { label: "Books Catalog", path: "/library/books" },
      { label: "Book Categories", path: "/library/categories" },
      { label: "Issue Book", path: "/library/issue" },
      { label: "Return Book", path: "/library/return" },
      { label: "Overdue & Fines", path: "/library/overdue" },
      { label: "Members", path: "/library/members" },
      { label: "Reports", path: "/library/reports" },
  ] },
  { label: "Point of Sale", icon: ShoppingCart, moduleKey: "pos", children: [
      { label: "Store Analytics", path: "/pos-admin/analytics" },
      { label: "Product Categories", path: "/pos-admin/categories" },
      { label: "Product Tax", path: "/pos-admin/tax" },
      { label: "Products", path: "/pos-admin/products" },
      { label: "New Order", path: "/pos-admin/new-order" },
      { label: "All Orders", path: "/pos-admin/orders" },
  ] },
  
  { label: "Live Class & LMS", icon: Video, moduleKey: "live_class", children: [
      { label: "Live Classes", path: "/live-classes" },
      { label: "Live Class Settings", path: "/live-classes/settings" },
      { label: "Quick Meet (Jitsi)", path: "/live" },
      { label: "Courses", path: "/lms/courses" },
      { label: "Quizzes & Exams", path: "/lms/quizzes" },
      { label: "Learning Materials", path: "/lms/lessons" },
      { label: "LMS Dashboard", path: "/lms" },
  ] },
  { label: "Question Paper", icon: Copy, moduleKey: "question_paper", children: [
      { label: "Import Past Paper", path: "/papers/import" },
      { label: "Subject Chapters", path: "/papers/chapters" },
      { label: "Question Bank", path: "/papers/questions" },
      { label: "Create Question Paper", path: "/papers/create" }
  ] },
  { label: "Exams", icon: ClipboardList, moduleKey: "exams", children: [
      { label: "Create New Exam", path: "/exams/create" },
      { label: "Manage Exams", path: "/exams/manage" },
      { label: "Online Examinations", path: "/exams/online" },
      { label: "Add / Update Exam Marks", path: "/exams/marks" },
      { label: "Skill-Based Reports", path: "/exams/skills" },
      { label: "Analytics", path: "/exams/analytics" },
      { label: "Printouts", path: "/exams/printouts" },
      { label: "Result Card", path: "/exams/scholar-sheet" },
      { label: "Report Card Settings", path: "/exams/report-card-settings" },
      // { label: "Class Report Cards", path: "/exams/class-reports" },
      // { label: "Result Sheet", path: "/exams/result-sheet" },
      // { label: "Student Rankings", path: "/exams/rankings" },
      // { label: "Exam Schedule", path: "/exams/schedule" },
      // { label: "Date Sheet", path: "/exams/date-sheet" },
      { label: "Blank Award List", path: "/exams/blank-award-list" },
      // { label: "Manage Test Marks", path: "/tests/marks" },
      // { label: "Test Result", path: "/tests/results" }
  ] },
  { label: "Reports", icon: ClipboardList, moduleKey: "reports", children: [
      { label: "Reports Center", path: "/reports" },
      // { label: "Students Info Report", path: "/reports/students-info" },
      // { label: "Parents Info Report", path: "/reports/parents-info" },
      // { label: "Students Monthly Attendance", path: "/reports/attendance/monthly-students" },
      // { label: "Staff Monthly Attendance", path: "/reports/attendance/monthly-staff" },
      // { label: "Fee Collection Report", path: "/reports/fee-collection" },
      // { label: "Student Progress Report", path: "/reports/student-progress" },
      // { label: "Accounts Report", path: "/reports/accounts" },
      { label: "Customised Reports", path: "/reports/custom" },
      { label: "Blank Forms", path: "/blank-forms" },
  ] },
  { label: "Communications", icon: MessageSquare, moduleKey: "communications", children: [
      { label: "Portal Announcements", path: "/communications/announcements" },
      { label: "Meetings Calendar", path: "/communications/meetings" },
      { label: "SMS & Email Templates", path: "/communications/templates" },
      { label: "Message Parents", path: "/communications/parent-messages" },
      { label: "Bulk SMS", path: "/communications/sms" },
      { label: "SMS Credits", path: "/communications/sms-credits" },
      { label: "Email Broadcast", path: "/communications/email" },
      { label: "WhatsApp Broadcast", path: "/communications/whatsapp" },
      { label: "WhatsApp Integration", path: "/communications/whatsapp-integration" },
      // { label: "Report Notifications", path: "/communications/notifications" },
      // { label: "Communication Settings", path: "/communications/preferences" },
      // { label: "Gateway Settings", path: "/integrations" },
  ] },
  { label: "Certificates", icon: Award, moduleKey: "certificates", children: [
      { label: "Generate Certificate", path: "/certificates/generate" },
      { label: "Saved Certificates", path: "/certificates/saved" },
      { label: "Certificate Templates", path: "/certificates/templates" }
  ] },
  { label: "General Settings", icon: Settings, moduleKey: "settings", children: [
      { label: "Institute Profile", path: "/settings/profile" },
      { label: "Learning Periods", path: "/academics/periods" },
      { label: "Fees Particulars", path: "/settings/fees-particulars" },
      { label: "Class Tuition Fees", path: "/settings/class-tuition" },
      { label: "Fees Structure", path: "/settings/fees-structure", locked: true },
      { label: "Discount Type", path: "/settings/discount-type" },
      { label: "Rules & Regulations", path: "/settings/rules" },
      { label: "Registration Numbers", path: "/settings/numbering" },
      { label: "Grading Templates", path: "/settings/grading-templates" },
      { label: "Subject Paper Ratios", path: "/academics/subject-papers" },
      { label: "Curriculum Settings", path: "/settings/curriculum" },
      { label: "Report Card Templates", path: "/settings/report-templates" },
      { label: "Theme & Language", path: "/settings/theme" },
      { label: "Account Settings", path: "/settings/account" },
      // { label: "Organization (Branches)", path: "/settings/organization" },
      // { label: "Log out", path: "/logout" },
  ] },
  { label: "Settings", icon: Building2, moduleKey: "settings", children: [
      // Owner-gated via plan modules; Roles is always available (no planModule).
      { label: "Integrations", path: "/integrations", planModule: "integrations" },
      // { label: "Custom Domain & Branding", path: "/settings/domains", planModule: "custom_domain" },
      { label: "Roles & Permissions", path: "/roles" },
  ] },
];

// ── Auto-assign a page-level permission code to every group child ─────────────
// pagePerm = "<moduleKey>.<page-slug>". This makes EVERY page in EVERY group
// individually grantable in the Roles editor — no per-page hand-editing needed.
// An explicit pagePerm on a child (e.g. Students) is preserved.
const pageSlug = (label: string, path: string) => {
  const base = (label || path).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/(^_|_$)/g, "");
  return base || path.replace(/[^a-z0-9]+/gi, "_").toLowerCase();
};
navItems.forEach((group) => {
  if (!group.children || !group.moduleKey) return;
  group.children.forEach((child) => {
    if (child.pagePerm) return;                    // keep explicit ones
    if (child.path === "/logout" || child.path.startsWith("http")) return;
    child.pagePerm = `${group.moduleKey}.${pageSlug(child.label, child.path)}`;
  });
});

// All page-perms grouped by their sidebar group — drives the Roles editor's
// fine-grained "Pages" section and the backend module mapping.
export const PAGE_PERMISSIONS: { group: string; moduleKey: string; perms: { code: string; name: string }[] }[] =
  navItems
    .filter((n) => n.children && n.moduleKey && n.label !== "Dashboard")
    .map((n) => ({
      group: n.label,
      moduleKey: n.moduleKey as string,
      perms: (n.children || [])
        .filter((c) => c.pagePerm && c.path !== "/logout" && !c.path.startsWith("http"))
        .map((c) => ({ code: c.pagePerm as string, name: c.label })),
    }))
    .filter((g) => g.perms.length > 0);

// Flat code → moduleKey map (used by the frontend; backend has its own copy).
export const PAGE_PERM_TO_MODULE: Record<string, string> = Object.fromEntries(
  PAGE_PERMISSIONS.flatMap((g) => g.perms.map((p) => [p.code, g.moduleKey]))
);

// Every group's overview dashboard, as { label, path } — used by the staff form's
// "Default Landing Page" picker so a user can be landed on any group dashboard.
export const groupDashboardOptions = (): { label: string; path: string }[] =>
  navItems
    .filter((n) => n.children && n.label !== "Dashboard")
    .map((n) => ({ label: `${n.label} Dashboard`, path: groupOverviewPath(n.label) }));

