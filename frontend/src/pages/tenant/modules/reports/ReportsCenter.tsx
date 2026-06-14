import { useState } from "react";
import { Link } from "react-router-dom";
import {
  GraduationCap, Users, CalendarCheck, Wallet, Briefcase, Boxes, BookOpen,
  Building2, Bus, HeartPulse, ShieldAlert, MessageSquare, LayoutDashboard,
  Landmark, ScrollText, Search, FileBarChart, ArrowRight, Lock,
} from "lucide-react";

type Report = { label: string; path?: string };
type Category = { key: string; icon: any; color: string; reports: Report[] };

const CATEGORIES: Category[] = [
  { key: "Academic", icon: GraduationCap, color: "#2563EB", reports: [
    { label: "Students Report Cards", path: "/reports/report-cards" },
    { label: "Student Progress Report", path: "/reports/student-progress" },
    { label: "Exam Analysis", path: "/exams" },
    { label: "Subject Performance" }, { label: "Class Performance" },
    { label: "Grade Distribution" }, { label: "Mark Sheets" },
    { label: "CBC Competency Report" }, { label: "Mean Score Trends" },
  ]},
  { key: "Students", icon: Users, color: "#7C3AED", reports: [
    { label: "Students Info Report", path: "/reports/students-info" },
    { label: "Parents Info Report", path: "/reports/parents-info" },
    { label: "Enrollment Report", path: "/academic-system/enrollments" },
    { label: "Admissions Report", path: "/students/admissions" },
    { label: "Promotions Report", path: "/reports/view/promotions" }, { label: "Transfers Report", path: "/students/transfer" },
    { label: "Class Lists", path: "/reports/view/class-lists" }, { label: "Birthday List", path: "/reports/view/birthday-list" },
  ]},
  { key: "Attendance", icon: CalendarCheck, color: "#0EA5E9", reports: [
    { label: "Students Monthly Attendance", path: "/reports/attendance/monthly-students" },
    { label: "Staff Monthly Attendance", path: "/reports/attendance/monthly-staff" },
    { label: "Class-wise Attendance", path: "/attendance/reports/class-wise" },
    { label: "Daily Attendance Register" }, { label: "Absentee Report" },
    { label: "Attendance % Summary" },
  ]},
  { key: "Finance", icon: Wallet, color: "#10B981", reports: [
    { label: "Fee Collection Report", path: "/reports/fee-collection" },
    { label: "Accounts Report", path: "/reports/accounts" },
    { label: "Fees Defaulters", path: "/fees/defaulters" },
    { label: "Fees Report", path: "/fees/report" },
    { label: "Income & Expense" }, { label: "Balance Sheet" },
    { label: "Trial Balance" }, { label: "M-PESA Reconciliation" },
    { label: "Outstanding Balances", path: "/reports/view/outstanding-balances" },
  ]},
  { key: "HR & Payroll", icon: Briefcase, color: "#F59E0B", reports: [
    { label: "Staff Directory", path: "/reports/view/staff-directory" },
    { label: "Payroll Summary", path: "/salary" }, { label: "Salary Slips", path: "/reports/view/salary-slips" },
    { label: "Leave Report", path: "/reports/view/leave-report" }, { label: "Contracts Expiry", path: "/reports/view/contracts-expiry" }, { label: "Staff by Department", path: "/reports/view/staff-by-dept" },
  ]},
  { key: "Inventory & Assets", icon: Boxes, color: "#EC4899", reports: [
    { label: "POS Sales Report", path: "/pos-admin/store-analytics" },
    { label: "Stock Levels", path: "/reports/view/stock-levels" }, { label: "Asset Register", path: "/reports/view/asset-register" },
    { label: "Low-Stock Alerts", path: "/reports/view/low-stock" }, { label: "Purchase Report" },
  ]},
  { key: "Library", icon: BookOpen, color: "#8B5CF6", reports: [
    { label: "Book Catalog", path: "/reports/view/book-catalog" }, { label: "Issued Books", path: "/reports/view/issued-books" },
    { label: "Overdue Books", path: "/reports/view/overdue-books" }, { label: "Member Activity" },
  ]},
  { key: "Hostel", icon: Building2, color: "#14B8A6", reports: [
    { label: "Occupancy Report", path: "/hostel/dashboard" },
    { label: "Allocations", path: "/hostel/allocation" }, { label: "Hostel Fees", path: "/hostel/fees" },
    { label: "Hostel Attendance", path: "/hostel/attendance" },
  ]},
  { key: "Transport", icon: Bus, color: "#F97316", reports: [
    { label: "Route & Driver Report", path: "/transport/report" },
    { label: "Zone Assignments", path: "/transport/zones" }, { label: "Bus Roster", path: "/transport/buses" },
  ]},
  { key: "Health", icon: HeartPulse, color: "#EF4444", reports: [
    { label: "Medical Records", path: "/students/medical" },
    { label: "Clinic Visits", path: "/reports/view/clinic-visits" }, { label: "Immunization Report", path: "/reports/view/immunization" },
  ]},
  { key: "Discipline", icon: ShieldAlert, color: "#DC2626", reports: [
    { label: "Discipline Records", path: "/students/discipline" },
    { label: "Incident Log", path: "/reports/view/incident-log" }, { label: "Behaviour Trends", path: "/behaviour/rate" },
  ]},
  { key: "Communication", icon: MessageSquare, color: "#06B6D4", reports: [
    { label: "SMS Logs", path: "/reports/view/sms-logs" }, { label: "Email Logs", path: "/reports/view/email-logs" },
    { label: "Announcements", path: "/reports/view/announcements" }, { label: "Delivery Report" },
  ]},
  { key: "Management", icon: LayoutDashboard, color: "#2563EB", reports: [
    { label: "Customised Reports", path: "/reports/custom" },
    { label: "Executive Dashboard", path: "/dashboard" },
    { label: "Enrollment Trends" }, { label: "Revenue Overview" },
  ]},
  { key: "Compliance & Government", icon: Landmark, color: "#475569", reports: [
    { label: "NEMIS Export" }, { label: "KNEC Registration" },
    { label: "Statutory Returns" }, { label: "Ministry Data Submission" },
  ]},
  { key: "Audit & Security", icon: ScrollText, color: "#0F172A", reports: [
    { label: "Audit Trail", path: "/reports/view/audit-trail" }, { label: "Login History", path: "/reports/view/login-history" },
    { label: "Data Change Log" }, { label: "Permission Matrix", path: "/roles/matrix" },
  ]},
];

export default function ReportsCenter() {
  const [search, setSearch] = useState("");
  const q = search.toLowerCase();

  const cats = CATEGORIES.map(c => ({
    ...c,
    reports: c.reports.filter(r => !q || r.label.toLowerCase().includes(q) || c.key.toLowerCase().includes(q)),
  })).filter(c => c.reports.length);

  const total = CATEGORIES.reduce((n, c) => n + c.reports.length, 0);
  const live = CATEGORIES.reduce((n, c) => n + c.reports.filter(r => r.path).length, 0);

  return (
    <div className="flex-1 bg-[#F8FAFC] min-h-screen p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#2563EB] flex items-center justify-center text-white"><FileBarChart className="w-6 h-6" /></div>
            <div>
              <h1 className="text-2xl font-black text-slate-900">Reports Center</h1>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{total} reports · {live} live across 15 modules</p>
            </div>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search any report…"
              className="w-full h-11 pl-11 pr-4 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:border-[#2563EB] shadow-sm" />
          </div>
        </div>

        {/* Categories */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {cats.map(c => (
            <div key={c.key} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-50">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white" style={{ background: c.color }}><c.icon className="w-4.5 h-4.5" /></div>
                <h2 className="font-black text-slate-800 text-sm">{c.key}</h2>
                <span className="ml-auto text-[10px] font-black text-slate-300">{c.reports.length}</span>
              </div>
              <div className="divide-y divide-slate-50">
                {c.reports.map(r => r.path ? (
                  <Link key={r.label} to={r.path} className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-[#2563EB] transition-colors group">
                    {r.label}
                    <ArrowRight className="w-3.5 h-3.5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                ) : (
                  <div key={r.label} className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-slate-300 cursor-not-allowed">
                    {r.label}
                    <span className="ml-auto inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-widest text-slate-300"><Lock className="w-3 h-3" /> Soon</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        {cats.length === 0 && <p className="text-center text-slate-400 font-bold py-16">No reports match "{search}"</p>}
      </div>
    </div>
  );
}
