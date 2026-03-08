import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Users, GraduationCap, BookOpen, ClipboardCheck,
  Calendar, UserCheck, Library, Heart, Bell, BarChart3, Settings,
  CreditCard, School, ChevronDown, ChevronRight, LogOut, Shield,
  MessageSquare, Package, Bus, Building2, AlertTriangle
} from "lucide-react";

interface NavItem {
  label: string;
  icon: React.ElementType;
  path?: string;
  children?: { label: string; path: string }[];
}

const navItems: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  {
    label: "Students", icon: Users, children: [
      { label: "All Students", path: "/students" },
      { label: "Admissions", path: "/students/admissions" },
      { label: "Guardians", path: "/students/guardians" },
      { label: "Promotions", path: "/students/promotions" },
    ]
  },
  {
    label: "Staff", icon: GraduationCap, children: [
      { label: "All Staff", path: "/staff" },
      { label: "Workload", path: "/staff/workload" },
      { label: "Leave Management", path: "/staff/leave" },
      { label: "Duty Rosters", path: "/staff/duty-rosters" },
    ]
  },
  {
    label: "Academics", icon: BookOpen, children: [
      { label: "Learning Areas", path: "/academics/learning-areas" },
      { label: "Schemes of Work", path: "/academics/schemes" },
      { label: "Lesson Plans", path: "/academics/lessons" },
      { label: "Competency Tracker", path: "/academics/competencies" },
    ]
  },
  {
    label: "Assessments", icon: ClipboardCheck, children: [
      { label: "Question Bank", path: "/assessments/questions" },
      { label: "Create Exam", path: "/assessments/create" },
      { label: "Mark Entry", path: "/assessments/marks" },
      { label: "Results", path: "/assessments/results" },
      { label: "Report Cards", path: "/assessments/report-cards" },
    ]
  },
  { label: "Timetable", icon: Calendar, path: "/timetable" },
  { label: "Attendance", icon: UserCheck, path: "/attendance" },
  { label: "Finance", icon: CreditCard, path: "/finance" },
  { label: "LMS", icon: School, path: "/lms" },
  { label: "Library", icon: Library, path: "/library" },
  { label: "Clinic", icon: Heart, path: "/clinic" },
  {
    label: "Discipline", icon: AlertTriangle, children: [
      { label: "Incidents", path: "/discipline/incidents" },
      { label: "Merit/Demerit", path: "/discipline/merits" },
      { label: "Detentions", path: "/discipline/detentions" },
      { label: "Counselling", path: "/discipline/counselling" },
    ]
  },
  {
    label: "Communications", icon: MessageSquare, children: [
      { label: "Announcements", path: "/communications/announcements" },
      { label: "Messages", path: "/communications/messages" },
      { label: "Templates", path: "/communications/templates" },
      { label: "Emergency Broadcast", path: "/communications/emergency" },
    ]
  },
  {
    label: "Assets & Stores", icon: Package, children: [
      { label: "Inventory", path: "/assets/inventory" },
      { label: "Suppliers", path: "/assets/suppliers" },
      { label: "Asset Register", path: "/assets/register" },
      { label: "Maintenance", path: "/assets/maintenance" },
    ]
  },
  {
    label: "Transport", icon: Bus, children: [
      { label: "Routes & Stops", path: "/transport/routes" },
      { label: "Bus Roster", path: "/transport/roster" },
      { label: "Trip Manifests", path: "/transport/manifests" },
      { label: "Fuel & Mileage", path: "/transport/fuel" },
    ]
  },
  {
    label: "Boarding", icon: Building2, children: [
      { label: "Dorms & Beds", path: "/boarding/dorms" },
      { label: "Allocation", path: "/boarding/allocation" },
      { label: "Roll Calls", path: "/boarding/roll-calls" },
      { label: "Incidents", path: "/boarding/incidents" },
    ]
  },
  { label: "Notifications", icon: Bell, path: "/notifications" },
  { label: "Reports", icon: BarChart3, path: "/reports" },
  { label: "Roles & Access", icon: Shield, path: "/roles" },
  { label: "Settings", icon: Settings, path: "/settings" },
];

export default function AppSidebar() {
  const location = useLocation();
  const [expanded, setExpanded] = useState<string[]>([]);

  const toggle = (label: string) => {
    setExpanded(prev =>
      prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]
    );
  };

  const isActive = (path?: string) => path && location.pathname.startsWith(path);

  return (
    <aside className="w-64 min-h-screen gradient-sidebar flex flex-col border-r border-sidebar-border">
      <div className="p-5 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg gradient-gold flex items-center justify-center">
            <School className="w-5 h-5 text-secondary-foreground" />
          </div>
          <div>
            <h1 className="font-heading text-lg font-bold text-sidebar-foreground tracking-tight">ShuleCloud</h1>
            <p className="text-xs text-sidebar-foreground/60">King's High School</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 py-3 px-3 space-y-0.5 overflow-y-auto">
        {navItems.map(item => {
          const Icon = item.icon;
          const active = isActive(item.path) || item.children?.some(c => isActive(c.path));
          const isExpanded = expanded.includes(item.label);

          if (item.children) {
            return (
              <div key={item.label}>
                <button
                  onClick={() => toggle(item.label)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                </button>
                {isExpanded && (
                  <div className="ml-7 mt-0.5 space-y-0.5 border-l border-sidebar-border pl-3">
                    {item.children.map(child => (
                      <Link
                        key={child.path}
                        to={child.path}
                        className={`block px-3 py-1.5 rounded-md text-xs transition-colors ${
                          location.pathname === child.path
                            ? "text-sidebar-primary font-medium"
                            : "text-sidebar-foreground/60 hover:text-sidebar-foreground"
                        }`}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          return (
            <Link
              key={item.label}
              to={item.path!}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-sidebar-border">
        <Link
          to="/"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </Link>
      </div>
    </aside>
  );
}
