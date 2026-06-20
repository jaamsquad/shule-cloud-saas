import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Home, Settings, LayoutTemplate, BookOpen, User, Briefcase,
  Wallet, Banknote, CreditCard, UserCheck, Calendar, Pencil,
  Eye, ShoppingCart, MessageCircle, MessageSquare, Mail, Video,
  Copy, ClipboardList, FileText, Lock, Award, Truck, BookMarked, GraduationCap, Building2,
  Zap, Shield, Monitor, Utensils, Trophy, MapPin, DoorOpen, ClipboardCheck, Landmark
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import api from "@/lib/api";

// Shown when a school clicks a module their plan doesn't include.
const PLAN_LOCK_MSG = "This module is not included in your plan, contact for more @ 0726151104";
import { usePermissions } from "@/contexts/PermissionsContext";
import { groupSlug } from "@/lib/groupSlug";

// Groups that already have a purpose-built dashboard child route — for those we
// link the parent to that page instead of the generic overview.
const NATIVE_GROUP_DASHBOARD: Record<string, string> = {
  Hostel: "/hostel/dashboard",
  Library: "/library/dashboard",
  "Live Class & LMS": "/lms",
  "Point of Sale": "/pos-admin/analytics",
  Reports: "/reports",
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
const CREATE_PATHS = new Set<string>([
  "/classes/new", "/subjects/new", "/students/new", "/parents/new",
  "/staff/new", "/accounts/income", "/accounts/expense", "/fees/generate-invoice",
  "/fees/generate-student-invoice", "/transport/zones/new", "/transport/buses/new",
  "/exams/create", "/certificates/generate", "/timetable/create",
  "/communications/announcements",
]);

export const navItems: NavItem[] = [
  { label: "Dashboard", icon: Home, path: "/dashboard", moduleKey: "dashboard" },
  { label: "General Settings", icon: Settings, moduleKey: "settings", children: [
      { label: "Institute Profile", path: "/settings/profile" },
      { label: "Learning Periods", path: "/academics/periods" },
      { label: "Academic Term Settings", path: "/settings/term-settings" },
      { label: "Fees Particulars", path: "/settings/fees-particulars" },
      { label: "Fees Structure", path: "/settings/fees-structure", locked: true },
      { label: "Discount Type", path: "/settings/discount-type", locked: true },
      { label: "Rules & Regulations", path: "/settings/rules" },
      { label: "Marks Grading", path: "/settings/grading" },
      { label: "Curriculum Settings", path: "/settings/curriculum" },
      { label: "Report Card Templates", path: "/settings/report-templates" },
      { label: "Theme & Language", path: "/settings/theme" },
      { label: "Account Settings", path: "/settings/account" },
      { label: "Log out", path: "/logout" },
  ] },
  {
    label: "Classes", icon: LayoutTemplate, moduleKey: "classes", children: [
      { label: "All Classes", path: "/classes" },
      { label: "New Class", path: "/classes/new" },
    ]
  },
  { label: "Subjects", icon: BookOpen, moduleKey: "subjects", children: [
      { label: "All Subjects", path: "/subjects/all" },
      { label: "New Subject", path: "/subjects/new" },
      { label: "Classes With Subjects", path: "/subjects" },
      { label: "Assign Subjects", path: "/subjects/assign" },
      { label: "Co-Curricular & Talents", path: "/subjects/activities" },
  ] },
  { label: "Students", icon: User, moduleKey: "students", children: [
      { label: "All Students", path: "/students", pagePerm: "students.all" },
      { label: "Student Wallets", path: "/wallet", pagePerm: "students.wallets" },
      { label: "Add New", path: "/students/new", pagePerm: "students.add" },
      { label: "Admissions", path: "/students/admissions", pagePerm: "students.admissions" },
      { label: "Manage Families", path: "/students/families", pagePerm: "students.families" },
      { label: "Promote Students", path: "/students/promote", pagePerm: "students.promote" },
      { label: "Transfer Management", path: "/students/transfer", pagePerm: "students.transfer" },
      { label: "Discipline Records", path: "/students/discipline", pagePerm: "students.discipline" },
      { label: "Medical Records", path: "/students/medical", pagePerm: "students.medical" },
      { label: "Student Documents", path: "/students/documents", pagePerm: "students.documents" },
      { label: "Student ID Cards", path: "/students/id-cards", pagePerm: "students.id_cards" },
      { label: "ID Card Studio (Navy)", path: "/students/id-studio", pagePerm: "students.id_studio" },
      { label: "Admission Letter", path: "/students/admission-letter", pagePerm: "students.admission_letter" },
      { label: "Manage Login", path: "/students/login", pagePerm: "students.manage_login" },
      { label: "Parent Login", path: "/students/parent-login", pagePerm: "students.parent_login" },
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
  { label: "Employees", icon: Briefcase, moduleKey: "employees", children: [
      { label: "All Employees", path: "/staff" },
      { label: "Teachers", path: "/staff/teachers" },
      { label: "Departments", path: "/departments" },
      { label: "Add New", path: "/staff/new" },
      { label: "Staff ID Cards", path: "/staff/id-cards", locked: true },
      { label: "Job Letter", path: "/staff/job-letter" },
      { label: "Manage Login", path: "/staff/login" },
      { label: "TSC Dashboard", path: "/tsc" },
      { label: "TSC Teachers", path: "/tsc/teachers" },
      { label: "TSC Records", path: "/tsc/records" },
      { label: "Teaching Workload", path: "/tsc/workload" },
      { label: "Qualifications", path: "/tsc/qualifications" },
      { label: "Deployment History", path: "/tsc/deployment" },
      { label: "Leave Management", path: "/tsc/leave" },
      { label: "Performance", path: "/tsc/performance" },
      { label: "TSC Reports", path: "/tsc/reports" },
      { label: "TSC Settings", path: "/tsc/settings" },
  ] },
  { label: "Accounts", icon: Wallet, moduleKey: "accounts", children: [
      { label: "Chart Of Account", path: "/accounts/chart" },
      { label: "Add Income", path: "/accounts/income" },
      { label: "Add Expense", path: "/accounts/expense" },
      { label: "Account Statement", path: "/accounts/statement" },
  ] },
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
  { label: "Fees", icon: Banknote, moduleKey: "fees", children: [ 
      { label: "Generate Fees Invoice", path: "/fees/generate-invoice" },
      { label: "Generate Per Student", path: "/fees/generate-student-invoice" },
      { label: "Generated Invoices", path: "/fees/invoices" },
      { label: "Collect Fees", path: "/fees/collect" },
      { label: "Student Ledger", path: "/fees/ledger" },
      { label: "Fees Paid Slip", path: "/fees/paid-slip" },
      { label: "Fees Defaulters", path: "/fees/defaulters" },
      { label: "Fees Report", path: "/fees/report", locked: true },
      { label: "Delete Fees", path: "/fees/delete", locked: true },
  ] },
  { label: "Salary", icon: CreditCard, moduleKey: "salary", children: [
      { label: "Pay Salary", path: "/salary/pay" },
      { label: "Salary Paid Slip", path: "/salary/paid-slip" },
      { label: "Salary Sheet", path: "/salary/sheet" },
      { label: "Salary Report", path: "/salary/report" },
      { label: "Salary Components", path: "/salary/components" },
  ] },
  { label: "Transport", icon: Truck, moduleKey: "transport", children: [
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
  { label: "Reports", icon: ClipboardList, moduleKey: "reports", children: [
      { label: "Reports Center", path: "/reports" },
      { label: "Students Report Card", path: "/reports/report-cards" },
      { label: "Students Info Report", path: "/reports/students-info" },
      { label: "Parents Info Report", path: "/reports/parents-info" },
      { label: "Students Monthly Attendance", path: "/reports/attendance/monthly-students" },
      { label: "Staff Monthly Attendance", path: "/reports/attendance/monthly-staff" },
      { label: "Fee Collection Report", path: "/reports/fee-collection" },
      { label: "Student Progress Report", path: "/reports/student-progress" },
      { label: "Accounts Report", path: "/reports/accounts" },
      { label: "Customised Reports", path: "/reports/custom" },
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
  { label: "Timetable", icon: Calendar, moduleKey: "timetable", children: [
      { label: "Weekdays", path: "/timetable/weekdays" },
      { label: "Time Periods", path: "/timetable/periods" },
      { label: "Class Rooms", path: "/timetable/rooms" },
      { label: "Create Timetable", path: "/timetable/create" },
      { label: "Generate For Class", path: "/timetable/class" },
      { label: "Generate For Teacher", path: "/timetable/teacher" },
  ] },
  { label: "Academic System", icon: BookMarked, moduleKey: "academic_system", children: [
      { label: "Academic Years & Terms", path: "/academic-system/years" },
      { label: "Classes & Streams", path: "/academic-system/classes" },
      { label: "Student Enrollments", path: "/academic-system/enrollments" },
      { label: "Promotion Wizard", path: "/academic-system/promote" },
      
  ] },
  { label: "Academic Content", icon: GraduationCap, moduleKey: "academics_content", children: [
      { label: "Lesson Plans", path: "/academics/lesson-plans" },
      { label: "Schemes of Work", path: "/academics/schemes-of-work" },
      { label: "Notes & Resources", path: "/academics/resources" },
      { label: "Assignments", path: "/academics/assignments" },
      { label: "Homework", path: "/homework" },
  ] },
  // { label: "Homework", icon: Pencil, path: "/homework", moduleKey: "homework" },
  { label: "Behaviour & Skills", icon: Eye, moduleKey: "behaviour", children: [
      { label: "Rate Behaviours", path: "/behaviour/rate" },
      { label: "Rate Skills", path: "/skills/rate" },
      { label: "Observation Diary", path: "/behaviour/observations" },
      { label: "Affective Report", path: "/behaviour/reports/affective" },
      { label: "Psychomotor Report", path: "/behaviour/reports/psychomotor" }
  ] },
  { label: "Certificates", icon: Award, moduleKey: "certificates", children: [
      { label: "Generate Certificate", path: "/certificates/generate" },
      { label: "Saved Certificates", path: "/certificates/saved" },
      { label: "Certificate Templates", path: "/certificates/templates" }
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
  { label: "Communications", icon: MessageSquare, moduleKey: "communications", children: [
      { label: "Announcements", path: "/communications/announcements" },
      { label: "Bulk SMS", path: "/communications/sms" },
      { label: "Email Broadcast", path: "/communications/email" },
      { label: "WhatsApp Broadcast", path: "/communications/whatsapp" },
      { label: "WhatsApp Integration", path: "/communications/whatsapp-integration" },
      { label: "Report Notifications", path: "/communications/notifications" },
      { label: "Communication Settings", path: "/communications/preferences" },
      { label: "Gateway Settings", path: "/communications/settings" },
  ] },
  { label: "Live Class & LMS", icon: Video, moduleKey: "live_class", children: [
      { label: "Live Classes (Jitsi)", path: "/live" },
      { label: "Courses", path: "/lms/courses" },
      { label: "Quizzes & Exams", path: "/lms/quizzes" },
      { label: "Learning Materials", path: "/lms/lessons" },
      { label: "LMS Dashboard", path: "/lms" },
  ] },
  { label: "Question Paper", icon: Copy, moduleKey: "question_paper", children: [
      { label: "AI Past Paper Importer", path: "/papers/import" },
      { label: "Subject Chapters", path: "/papers/chapters" },
      { label: "Question Bank", path: "/papers/questions" },
      { label: "Create Question Paper", path: "/papers/create" }
  ] },
  { label: "Exams", icon: ClipboardList, moduleKey: "exams", children: [
      { label: "Create New Exam", path: "/exams/create" },
      { label: "Add / Update Exam Marks", path: "/exams/marks" },
      { label: "Generate Report Cards", path: "/exams/generate-reports" },
      { label: "Result Card", path: "/exams/result-card" },
      { label: "Class Report Cards", path: "/exams/class-reports" },
      { label: "Result Sheet", path: "/exams/result-sheet" },
      { label: "Student Rankings", path: "/exams/rankings" },
      { label: "Exam Schedule", path: "/exams/schedule" },
      { label: "Date Sheet", path: "/exams/date-sheet" },
      { label: "Blank Award List", path: "/exams/blank-award-list" },
  ] },
  { label: "Class Tests", icon: FileText, moduleKey: "exams", children: [
      { label: "Manage Test Marks", path: "/tests/marks" },
      { label: "Test Result", path: "/tests/results" }
  ] },
  { label: "Settings", icon: Building2, moduleKey: "settings", children: [
      // Owner-gated via plan modules; Roles is always available (no planModule).
      { label: "Integrations", path: "/integrations", planModule: "integrations" },
      { label: "Custom Domain & Branding", path: "/settings/domains", planModule: "custom_domain" },
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

export default function AppSidebar() {
  const location = useLocation();
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const perms = usePermissions();

  // A module is "plan-locked" when the school's PLAN doesn't include it.
  // planModules === null means unrestricted (all modules allowed by the plan).
  const isPlanLocked = (moduleKey?: string): boolean => {
    if (!moduleKey) return false;
    const plan = perms.planModules;
    if (!plan) return false;                 // no plan restriction → nothing locked
    return !plan.includes(moduleKey);        // module not in the plan → locked
  };

  // Filter nav items by DB-fetched permissions for this role.
  // Every sidebar item MUST have a moduleKey to be shown to non-admins.
  // Dashboard is the only exception — always visible when authenticated.
  // Plan-locked modules are KEPT (shown with a lock) rather than hidden.
  const visibleNavItems = navItems.filter(item => {
    // Plan-locked modules stay visible (rendered locked) for everyone.
    if (isPlanLocked(item.moduleKey)) return true;

    // Admin → show everything else
    if (perms.isAdmin) return true;

    // Still fetching from DB → only show Dashboard to avoid incorrect flash
    if (!perms.loaded) return item.path === "/dashboard";

    const allowed = perms.modules;
    if (!allowed?.length) return false;
    if (allowed.includes("*")) return true;

    // Dashboard is always visible for authenticated users
    if (item.path === "/dashboard") return true;

    // Items without a moduleKey are hidden for non-admins
    if (!item.moduleKey) return false;

    return allowed.includes(item.moduleKey);
  });

  const { data: theme } = useQuery({
      queryKey: ["theme_settings"],
      queryFn: async () => {
          const r = await api.get("/theme_settings");
          return r.data?.[0];
      }
  });

  const isDark = theme?.sidebarBackground === "dark";
  const activeBg = theme?.activeItemBackground || "bg-[#5C67F2]";

  useEffect(() => {
    // Expand the group that matches the current route
    const group = navItems.find(item => 
      item.children?.some(child => location.pathname === child.path || location.pathname.startsWith(child.path))
    );
    if (group && !expandedGroups.includes(group.label)) {
      // Accordion: only the active route's group stays open.
      setExpandedGroups([group.label]);
    }
  }, [location.pathname]);

  const toggleGroup = (label: string) => {
    // Accordion: opening a group closes any other open group.
    setExpandedGroups(prev => (prev.includes(label) ? [] : [label]));
  };

  return (
    <div className={`flex h-full ${isDark ? 'bg-gray-900 text-gray-300' : 'bg-white text-[#4b5563]'} shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-20 transition-colors duration-300`}>
      <aside className={`w-64 flex flex-col border-r ${isDark ? 'border-gray-800' : 'border-gray-100'}`}>
        
        {/* Header / Logo */}
        <div className={`h-16 flex items-center px-6 border-b ${isDark ? 'border-gray-800' : 'border-gray-100'}`}>
           <span className={`font-bold text-xl ${isDark ? 'text-white' : 'text-gray-800'} tracking-tight`}>menu</span>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 py-4 overflow-y-auto custom-scrollbar">
          <ul className="space-y-1 px-3">
            {visibleNavItems.map(item => {
              const Icon = item.icon;
              const isExpanded = expandedGroups.includes(item.label);
              const planLocked = isPlanLocked(item.moduleKey);

              // Determine if active
              const isParentActive = item.children
                ? item.children.some(c => location.pathname === c.path || location.pathname.startsWith(c.path))
                : location.pathname === item.path;

              // ── Plan-locked module — visible but inert; click shows the message ──
              if (planLocked) {
                return (
                  <li key={item.label} className="relative">
                    <button
                      type="button"
                      onClick={() => toast.message(PLAN_LOCK_MSG, { duration: 6000 })}
                      title={PLAN_LOCK_MSG}
                      className={`w-full flex items-center justify-between px-3 py-3 rounded-lg transition-colors cursor-not-allowed ${isDark ? "hover:bg-gray-800/50 text-gray-600" : "hover:bg-gray-50 text-gray-400"}`}
                    >
                      <span className="flex items-center gap-4 flex-1 text-left">
                        <Icon className="w-[18px] h-[18px] opacity-50" strokeWidth={1.5} />
                        <span className="text-[13px] font-medium opacity-70">{item.label}</span>
                      </span>
                      <Lock className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                    </button>
                  </li>
                );
              }

              return (
                <li key={item.label} className="relative">
                  {/* Parent Item */}
                  <div
                    className={`flex items-center justify-between px-3 py-3 rounded-lg transition-colors ${
                      isParentActive
                        ? `${activeBg} text-white shadow-sm`
                        : isDark ? "hover:bg-gray-800 text-gray-400" : "hover:bg-gray-50 text-gray-600"
                    }`}
                  >
                    {/* Label → navigates to the group overview (or the page for leaf items) */}
                    <Link
                        to={item.children ? groupOverviewPath(item.label) : (item.path || "#")}
                        className="flex items-center gap-4 flex-1 cursor-pointer"
                    >
                      <Icon className={`w-[18px] h-[18px] ${isParentActive ? "text-white" : isDark ? "text-gray-400" : "text-gray-500"}`} strokeWidth={1.5} />
                      <span className={`text-[13px] ${isParentActive ? "font-bold" : "font-medium"}`}>
                        {item.label}
                      </span>
                    </Link>

                    {/* Right side icon — toggles inline expansion without navigating */}
                    {item.locked ? (
                       <Lock className={`w-3 h-3 ${isParentActive ? 'text-white/70' : 'text-red-400'}`} />
                    ) : item.children ? (
                       <button
                         type="button"
                         onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleGroup(item.label); }}
                         className={`px-2 -mr-1 ${isParentActive ? 'text-white/80' : isDark ? 'text-gray-500' : 'text-gray-400'} text-lg font-light leading-none cursor-pointer`}
                         aria-label={isExpanded ? "Collapse" : "Expand"}
                       >
                         {isExpanded ? "-" : "+"}
                       </button>
                    ) : null}
                  </div>

                  {/* Children Accordion */}
                  <AnimatePresence>
                    {item.children && isExpanded && (
                      <motion.ul
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className={`overflow-hidden border-l ${isDark ? 'border-gray-800' : 'border-gray-200'} ml-[23px] mt-1 space-y-1 mb-2`}
                      >
                        {item.children.filter(child => {
                          if (perms.isAdmin) return true;
                          const granted = perms.permissions || [];
                          const wildcard = granted.includes("*");

                          // ── Page-level permissions ──────────────────────────
                          // If the user holds ANY of this group's child page-perms,
                          // switch to fine-grained mode: only show pages explicitly
                          // granted. If they hold none, the module grant shows all
                          // children (backward compatible).
                          if (!wildcard) {
                            const groupPagePerms = (item.children || []).map(ch => ch.pagePerm).filter(Boolean) as string[];
                            const userHasSomePagePerm = groupPagePerms.some(p => granted.includes(p));
                            if (userHasSomePagePerm && child.pagePerm && !granted.includes(child.pagePerm)) return false;
                          }

                          // ── Create-page hiding ──────────────────────────────
                          if (!(child.create || CREATE_PATHS.has(child.path))) return true;
                          const mod = item.moduleKey;
                          if (!mod) return true;
                          const acts = (perms.crud && perms.crud[mod]) || [];
                          return acts.includes("create");
                        }).map((child, idx) => {
                          const isChildActive = location.pathname === child.path || (child.path.includes('#') && location.pathname === child.path.split('#')[0]);

                          return (
                            <li key={idx} className="relative">
                              {child.path.startsWith("http") ? (
                                <a
                                  href={child.path}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`flex items-center gap-3 px-4 py-2 text-[12px] transition-colors ${
                                    isDark ? "text-gray-500 hover:text-gray-300" : "text-gray-500 hover:text-gray-850"
                                  }`}
                                >
                                  <div className="w-1.5 h-1.5 rounded-full bg-transparent"></div>
                                  {child.label}
                                </a>
                              ) : child.path === "/logout" ? (
                                <button
                                  onClick={() => { window.location.href = "/logout"; }}
                                  className={`w-full flex items-center gap-3 px-4 py-2 text-[12px] transition-colors text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg`}
                                >
                                  <div className="w-1.5 h-1.5 rounded-full bg-rose-400"></div>
                                  {child.label}
                                </button>
                              ) : (
                                <Link
                                  to={child.path}
                                  className={`flex items-center gap-3 px-4 py-2 text-[12px] transition-colors ${
                                    isChildActive
                                      ? isDark ? "text-white font-bold" : "text-gray-900 font-bold"
                                      : isDark ? "text-gray-500 hover:text-gray-300" : "text-gray-500 hover:text-gray-800"
                                  }`}
                                >
                                  {/* Bullet indicator */}
                                  <div className={`w-1.5 h-1.5 rounded-full ${isChildActive ? activeBg : "bg-transparent"}`}></div>
                                  {child.label}
                                  {child.locked && <Lock className="w-3 h-3 text-red-300 ml-auto" />}
                                </Link>
                              )}
                            </li>
                          );
                        })}
                      </motion.ul>
                    )}
                  </AnimatePresence>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
    </div>
  );
}
