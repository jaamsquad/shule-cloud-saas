import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Home, Settings, LayoutTemplate, BookOpen, User, Briefcase, 
  Wallet, Banknote, CreditCard, UserCheck, Calendar, Pencil, 
  Eye, ShoppingCart, MessageCircle, MessageSquare, Mail, Video, 
  Copy, ClipboardList, FileText, Lock
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

interface NavItem {
  label: string;
  icon: React.ElementType;
  path?: string;
  locked?: boolean;
  children?: { label: string; path: string; locked?: boolean }[];
}

const navItems: NavItem[] = [
  { label: "Dashboard", icon: Home, path: "/dashboard" },
  { label: "General Settings", icon: Settings, children: [
      { label: "Institute Profile", path: "/settings/profile" },
      { label: "Learning Periods", path: "/academics/periods" },
      { label: "Fees Particulars", path: "/settings/fees-particulars" },
      { label: "Fees Structure", path: "/settings/fees-structure", locked: true },
      { label: "Discount Type", path: "/settings/discount-type", locked: true },
      { label: "Accounts For Fees Invoice", path: "/settings/accounts" },
      { label: "Rules & Regulations", path: "/settings/rules" },
      { label: "Marks Grading", path: "/settings/grading" },
      { label: "Report Card Templates", path: "/settings/report-templates" },
      { label: "Theme & Language", path: "/settings/theme" },
      { label: "Account Settings", path: "/settings/account" },
      { label: "Log out", path: "/logout" },
  ] },
  {
    label: "Classes", icon: LayoutTemplate, children: [
      { label: "All Classes", path: "/classes" },
      { label: "New Class", path: "/classes/new" },
    ]
  },
  { label: "Subjects", icon: BookOpen, children: [ 
      { label: "All Subjects", path: "/subjects/all" },
      { label: "New Subject", path: "/subjects/new" },
      { label: "Co-Curricular & Talents", path: "/subjects/activities" },
      { label: "Classes With Subjects", path: "/subjects" },
      { label: "Assign Subjects", path: "/subjects/assign" },
  ] },
  { label: "Students", icon: User, children: [ 
      { label: "All Students", path: "/students" },
      { label: "Add New", path: "/students/new" },
      { label: "Manage Families", path: "/students/families", locked: false },
      { label: "Active / Inactive", path: "/students/status", locked: false },
      { label: "Admission Letter", path: "/students/admission-letter" },
      { label: "Student ID Cards", path: "/students/id-cards" },
      { label: "Print Basic List", path: "/students/print" },
      { label: "Manage Login", path: "/students/login" },
      { label: "Promote Students", path: "/students/promote" },
  ] },
  { label: "Employees", icon: Briefcase, children: [
      { label: "All Employees", path: "/staff" },
      { label: "Add New", path: "/staff/new" },
      { label: "Staff ID Cards", path: "/staff/id-cards", locked: true },
      { label: "Job Letter", path: "/staff/job-letter" },
      { label: "Manage Login", path: "/staff/login" },
  ] },
  { label: "Accounts", icon: Wallet, children: [
      { label: "Chart Of Account", path: "/accounts/chart" },
      { label: "Add Income", path: "/accounts/income" },
      { label: "Add Expense", path: "/accounts/expense" },
      { label: "Account Statement", path: "/accounts/statement" },
  ] },
  { label: "Fees", icon: Banknote, children: [ 
      { label: "Generate Fees Invoice", path: "/fees/generate-invoice" },
      { label: "Collect Fees", path: "/fees/collect" },
      { label: "Fees Paid Slip", path: "/fees/paid-slip" },
      { label: "Fees Defaulters", path: "/fees/defaulters" },
      { label: "Fees Report", path: "/fees/report", locked: true },
      { label: "Delete Fees", path: "/fees/delete", locked: true },
  ] },
  { label: "Salary", icon: CreditCard, children: [ { label: "Payroll", path: "/staff/payroll" } ] },
  { label: "Attendance", icon: UserCheck, children: [ 
      { label: "Students Attendance", path: "/attendance/students" },
      { label: "Employees Attendance", path: "/attendance/employees" },
      { label: "Class wise Report", path: "/attendance/reports/class-wise" },
      { label: "Students Attendance Report", path: "/attendance/reports/students" },
      { label: "Employees Attendance Report", path: "/attendance/reports/employees" },
  ] },
  { label: "Reports", icon: ClipboardList, children: [
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
  { label: "Timetable", icon: Calendar, children: [ 
      { label: "Weekdays", path: "/timetable/weekdays" },
      { label: "Time Periods", path: "/timetable/periods" },
      { label: "Class Rooms", path: "/timetable/rooms" },
      { label: "Create Timetable", path: "/timetable/create" },
      { label: "Generate For Class", path: "/timetable/class" },
      { label: "Generate For Teacher", path: "/timetable/teacher" },
  ] },
  { label: "Homework", icon: Pencil, path: "/homework" },
  { label: "Behaviour & Skills", icon: Eye, children: [ { label: "Skills", path: "/skills" } ] },
  { label: "Online Store & POS", icon: ShoppingCart, children: [ { label: "Store", path: "/store" } ] },
  { label: "WhatsApp", icon: MessageCircle, path: "/whatsapp", locked: true },
  { label: "Messaging", icon: MessageSquare, path: "/communications" },
  { label: "SMS Services", icon: Mail, children: [ { label: "SMS", path: "/communications/sms" } ] },
  { label: "Live Class", icon: Video, path: "/live" },
  { label: "Question Paper", icon: Copy, children: [ { label: "Papers", path: "/papers" } ] },
  { label: "Exams", icon: ClipboardList, children: [
      { label: "Create New Exam", path: "/exams/create" },
      { label: "Add / Update Exam Marks", path: "/exams/marks" },
      { label: "Result Card", path: "/exams/result-card" },
      { label: "Result Sheet", path: "/exams/result-sheet" },
      { label: "Exam Schedule", path: "/exams/schedule" },
      { label: "Date Sheet", path: "/exams/date-sheet" },
      { label: "Blank Award List", path: "/exams/blank-award-list" },
  ] },
  { label: "Class Tests", icon: FileText, children: [ { label: "Tests", path: "/tests" } ] },
];

export default function AppSidebar() {
  const location = useLocation();
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

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
      setExpandedGroups(prev => [...prev, group.label]);
    }
  }, [location.pathname]);

  const toggleGroup = (label: string) => {
    setExpandedGroups(prev => 
      prev.includes(label) ? prev.filter(g => g !== label) : [...prev, label]
    );
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
            {navItems.map(item => {
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
