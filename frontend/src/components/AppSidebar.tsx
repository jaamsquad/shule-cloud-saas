import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Home, Settings, LayoutTemplate, BookOpen, User, Briefcase,
  Wallet, Banknote, CreditCard, UserCheck, Calendar, Pencil,
  Eye, ShoppingCart, MessageCircle, MessageSquare, Mail, Video,
  Copy, ClipboardList, FileText, Lock, Award, Truck, BookMarked, GraduationCap, Building2,
  Zap, Shield, Monitor, Utensils
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { usePermissions } from "@/contexts/PermissionsContext";

interface NavItem {
  label: string;
  icon: React.ElementType;
  path?: string;
  locked?: boolean;
  moduleKey?: string; // maps to permission module key
  children?: { label: string; path: string; locked?: boolean }[];
}

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
      { label: "Curriculum Framework", path: "/subjects/curriculum" },
      { label: "Classes With Subjects", path: "/subjects" },
      { label: "Assign Subjects", path: "/subjects/assign" },
      { label: "Co-Curricular & Talents", path: "/subjects/activities" },
  ] },
  { label: "Students", icon: User, moduleKey: "students", children: [
      { label: "All Students", path: "/students" },
      { label: "Student Wallets", path: "/wallet" },
      { label: "Add New", path: "/students/new" },
      { label: "Admissions", path: "/students/admissions" },
      { label: "Manage Families", path: "/students/families" },
      { label: "Promote Students", path: "/students/promote" },
      { label: "Transfer Management", path: "/students/transfer" },
      { label: "Discipline Records", path: "/students/discipline" },
      { label: "Medical Records", path: "/students/medical" },
      { label: "Student Documents", path: "/students/documents" },
      { label: "Student ID Cards", path: "/students/id-cards" },
      { label: "ID Card Studio (Navy)", path: "/students/id-studio" },
      { label: "Admission Letter", path: "/students/admission-letter" },
      { label: "Manage Login", path: "/students/login" },
      { label: "Parent Login", path: "/students/parent-login" },
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
  ] },
  { label: "Accounts", icon: Wallet, moduleKey: "accounts", children: [
      { label: "Chart Of Account", path: "/accounts/chart" },
      { label: "Add Income", path: "/accounts/income" },
      { label: "Add Expense", path: "/accounts/expense" },
      { label: "Account Statement", path: "/accounts/statement" },
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
      { label: "Report", path: "/transport/report" }
  ] },
  { label: "Attendance", icon: UserCheck, moduleKey: "attendance", children: [
      { label: "Card Scanner", path: "/attendance-scanner" },
      { label: "Students Attendance", path: "/attendance/students" },
      { label: "Employees Attendance", path: "/attendance/employees" },
      { label: "Class wise Report", path: "/attendance/reports/class-wise" },
      { label: "Students Attendance Report", path: "/attendance/reports/students" },
      { label: "Employees Attendance Report", path: "/attendance/reports/employees" },
  ] },
  { label: "Cafeteria", icon: Utensils, moduleKey: "students", children: [
      { label: "Meal Service (Kitchen)", path: "/cafeteria/meal-service" },
      { label: "Weekly Meal Menu", path: "/cafeteria/menu" },
      { label: "Meal History", path: "/cafeteria/meal-history" },
      { label: "Quick Sale (Canteen)", path: "/canteen/quick-sale" },
      { label: "Canteen Transactions", path: "/canteen/transactions" },
      { label: "Canteen Settings", path: "/canteen/settings" },
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
  { label: "Timetable", icon: Calendar, moduleKey: "timetable", children: [ 
      { label: "Weekdays", path: "/timetable/weekdays" },
      { label: "Time Periods", path: "/timetable/periods" },
      { label: "Class Rooms", path: "/timetable/rooms" },
      { label: "Create Timetable", path: "/timetable/create" },
      { label: "Generate For Class", path: "/timetable/class" },
      { label: "Generate For Teacher", path: "/timetable/teacher" },
  ] },
  { label: "Academic System", icon: BookMarked, moduleKey: "exams", children: [
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
      { label: "Integrations", path: "/integrations" },
      { label: "Custom Domain & Branding", path: "/settings/domains" },
      { label: "Roles & Permissions", path: "/roles" },
  ] },
];

export default function AppSidebar() {
  const location = useLocation();
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const perms = usePermissions();

  // Filter nav items by DB-fetched permissions for this role.
  // Every sidebar item MUST have a moduleKey to be shown to non-admins.
  // Dashboard is the only exception — always visible when authenticated.
  const visibleNavItems = navItems.filter(item => {
    // Admin → show everything
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
              
              // Determine if active
              const isParentActive = item.children 
                ? item.children.some(c => location.pathname === c.path || location.pathname.startsWith(c.path))
                : location.pathname === item.path;

              return (
                <li key={item.label} className="relative">
                  {/* Parent Item */}
                  <div
                    onClick={() => item.children ? toggleGroup(item.label) : null}
                    className={`flex items-center justify-between px-3 py-3 rounded-lg cursor-pointer transition-colors ${
                      isParentActive 
                        ? `${activeBg} text-white shadow-sm` 
                        : isDark ? "hover:bg-gray-800 text-gray-400" : "hover:bg-gray-50 text-gray-600"
                    }`}
                  >
                    <Link 
                        to={item.path || (item.children ? "#" : "#")} 
                        className="flex items-center gap-4 flex-1"
                        onClick={(e) => {
                            if(item.children) e.preventDefault();
                        }}
                    >
                      <Icon className={`w-[18px] h-[18px] ${isParentActive ? "text-white" : isDark ? "text-gray-400" : "text-gray-500"}`} strokeWidth={1.5} />
                      <span className={`text-[13px] ${isParentActive ? "font-bold" : "font-medium"}`}>
                        {item.label}
                      </span>
                    </Link>

                    {/* Right side icon */}
                    {item.locked ? (
                       <Lock className={`w-3 h-3 ${isParentActive ? 'text-white/70' : 'text-red-400'}`} />
                    ) : item.children ? (
                       <span className={`${isParentActive ? 'text-white/80' : isDark ? 'text-gray-500' : 'text-gray-400'} text-lg font-light leading-none`}>
                         {isExpanded ? "-" : "+"}
                       </span>
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
                        {item.children.map((child, idx) => {
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
