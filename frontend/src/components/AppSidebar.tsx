import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Users, GraduationCap, BookOpen, ClipboardCheck,
  Calendar, UserCheck, Library, Heart, Bell, BarChart3, Settings,
  CreditCard, School, ChevronDown, ChevronRight, LogOut, Shield,
  PlusCircle, ListChecks, UserPlus, Info, Briefcase, Layers
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface NavItem {
  label: string;
  icon: React.ElementType;
  path?: string;
  children?: { label: string; path: string; icon?: React.ElementType }[];
}

const navItems: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  {
    label: "Students", icon: Users, children: [
      { label: "Student List", path: "/students", icon: ListChecks },
      { label: "New Student", path: "/students/admissions", icon: UserPlus },
      { label: "Guardians", path: "/students/guardians" },
      { label: "Move Students", path: "/students/promotions" },
    ]
  },
  {
    label: "Staff & HR", icon: GraduationCap, children: [
      { label: "Staff List", path: "/staff" },
      { label: "Departments", path: "/staff/departments" },
      { label: "Staff Leave", path: "/staff/leave" },
      { label: "Payroll", path: "/staff/payroll" },
    ]
  },
  {
    label: "Classes", icon: School, children: [
      { label: "Class List", path: "/classes" },
      { label: "Class Streams", path: "/classes/streams" },
      { label: "Learning Strands", path: "/classes/strands" },
    ]
  },
  {
    label: "Subjects", icon: BookOpen, children: [
      { label: "Subject List", path: "/subjects" },
      { label: "Subject Types", path: "/subjects/categories" },
      { label: "Subjects by Dept", path: "/placeholder" },
    ]
  },
  {
    label: "CBC Lessons", icon: Layers, children: [
      { label: "Learning Areas", path: "/academics/learning-areas" },
      { label: "Schemes of Work", path: "/academics/schemes" },
      { label: "Lesson Plans", path: "/academics/lessons" },
      { label: "Skills List", path: "/placeholder" },
    ]
  },
  {
    label: "Exams", icon: ClipboardCheck, children: [
      { label: "Questions", path: "/assessments/questions" },
      { label: "Create Exams", path: "/assessments/create" },
      { label: "Add Marks", path: "/assessments/marks" },
      { label: "Exam Results", path: "/assessments/results" },
    ]
  },
  {
    label: "Timetable", icon: Calendar, children: [
      { label: "Dashboard", path: "/timetable" },
      { label: "Class Timetable", path: "/timetable/class" },
      { label: "Teacher Timetable", path: "/timetable/teacher" },
      { label: "Room Timetable", path: "/timetable/room" },
      { label: "Exam Schedule", path: "/timetable/exam" },
      { label: "Timetable Builder", path: "/timetable/builder" },
      { label: "Conflicts", path: "/timetable/conflicts" },
      { label: "Substitutions", path: "/timetable/substitution" },
      { label: "Print View", path: "/timetable/print" },
      { label: "Settings", path: "/timetable/settings" },
    ]
  },
  { label: "Attendance", icon: UserCheck, path: "/attendance" },
  { label: "Fees & Money", icon: CreditCard, path: "/finance" },
  { label: "Library", icon: Library, path: "/library" },
  { label: "Clinic", icon: Heart, path: "/clinic" },
  { label: "Online Learning", icon: School, path: "/lms" },
  { label: "Settings", icon: Settings, path: "/settings" },
];

const ownerNavItems: NavItem[] = [
  { label: "Overview", icon: LayoutDashboard, path: "/owner/dashboard" },
  { label: "Schools", icon: Users, path: "/owner/tenants" },
  { label: "Plans & Pricing", icon: CreditCard, path: "/owner/plans" },
  { label: "Billing", icon: BarChart3, path: "/owner/billing" },
  { label: "Announcements", icon: Bell, path: "/owner/announcements" },
  { label: "Audit Log", icon: Shield, path: "/owner/audit" },
  { label: "Settings", icon: Settings, path: "/owner/settings" },
];

export default function AppSidebar() {
  const location = useLocation();
  const [expanded, setExpanded] = useState<string[]>([]);

  const isOwnerPortal = location.pathname.startsWith('/owner');
  const items = isOwnerPortal ? ownerNavItems : navItems;

  // Auto-expand active group
  useEffect(() => {
    const activeGroup = items.find(item =>
      item.children?.some(child => location.pathname === child.path)
    );
    if (activeGroup && !expanded.includes(activeGroup.label)) {
      setExpanded(prev => [...new Set([...prev, activeGroup.label])]);
    }
  }, [location.pathname, items]);

  const toggle = (label: string) => {
    setExpanded(prev =>
      prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]
    );
  };

  const isActive = (path?: string) => path && location.pathname.startsWith(path);

  return (
    <aside className="w-72 min-h-screen gradient-sidebar flex flex-col border-r border-sidebar-border shadow-2xl relative z-50">
      <div className="p-6 border-b border-sidebar-border/30">
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-[0.9rem] ${isOwnerPortal ? 'bg-primary shadow-lg shadow-primary/20' : 'gradient-gold shadow-lg shadow-amber-500/10'} flex items-center justify-center transform hover:rotate-6 transition-transform`}>
            <School className={`w-6 h-6 ${isOwnerPortal ? 'text-primary-foreground' : 'text-secondary-foreground'}`} />
          </div>
          <div>
            <h1 className="font-heading text-xl font-black text-sidebar-foreground tracking-tighter">
              {isOwnerPortal ? 'SC OWNER' : 'SHULECLOUD'}
            </h1>
            <div className="flex items-center gap-1.5 opacity-60">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-[10px] uppercase font-black tracking-widest text-sidebar-foreground">
                {isOwnerPortal ? 'Cloud Control' : "School Portal"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 py-6 px-4 space-y-1.5 overflow-y-auto custom-scrollbar">
        {items.map(item => {
          const Icon = item.icon;
          const active = isActive(item.path) || item.children?.some(c => isActive(c.path));
          const isExpanded = expanded.includes(item.label);

          if (item.children) {
            return (
              <div key={item.label} className="space-y-1">
                <button
                  onClick={() => toggle(item.label)}
                  className={`group w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-[13px] font-bold transition-all ${active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                    : "text-sidebar-foreground/60 hover:bg-sidebar-accent/30 hover:text-sidebar-foreground"
                    }`}
                >
                  <Icon className={`w-4.5 h-4.5 transition-transform group-hover:scale-110 ${active ? 'text-sidebar-primary' : ''}`} />
                  <span className="flex-1 text-left tracking-tight">{item.label}</span>
                  {isExpanded ? <ChevronDown className="w-3.5 h-3.5 opacity-50" /> : <ChevronRight className="w-3.5 h-3.5 opacity-50" />}
                </button>
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="ml-6 mt-1 space-y-1 border-l border-sidebar-border/30 pl-4 overflow-hidden"
                    >
                      {item.children.map(child => (
                        <Link
                          key={child.path}
                          to={child.path}
                          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[12px] font-semibold transition-all ${location.pathname === child.path
                            ? "text-sidebar-primary bg-sidebar-primary/5 shadow-sm translate-x-1"
                            : "text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent/20"
                            }`}
                        >
                          <div className={`w-1 h-1 rounded-full ${location.pathname === child.path ? 'bg-sidebar-primary scale-150' : 'bg-sidebar-foreground/20'}`} />
                          {child.label}
                        </Link>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          }

          return (
            <Link
              key={item.label}
              to={item.path!}
              className={`group flex items-center gap-3.5 px-4 py-3 rounded-2xl text-[13px] font-bold transition-all ${active
                ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm shadow-black/5"
                : "text-sidebar-foreground/60 hover:bg-sidebar-accent/30 hover:text-sidebar-foreground"
                }`}
            >
              <Icon className={`w-4.5 h-4.5 group-hover:scale-110 transition-transform ${active ? 'text-sidebar-primary' : ''}`} />
              <span className="tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 bg-sidebar-accent/5 mt-auto">
        <div className="p-4 rounded-3xl bg-background/50 border border-sidebar-border/20 mb-4 group cursor-pointer hover:bg-background/80 transition-all">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 font-black shadow-sm group-hover:scale-110 transition-all">
              AD
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-black text-sidebar-foreground truncate uppercase">Admin User</p>
              <p className="text-[9px] font-bold text-sidebar-foreground/40 truncate">School Admin</p>
            </div>
            <Settings className="w-4 h-4 text-sidebar-foreground/30 group-hover:rotate-45 transition-transform" />
          </div>
        </div>
        <button
          className="w-full flex items-center justify-between px-5 py-3.5 rounded-2xl text-[12px] font-black text-rose-500/70 hover:text-rose-500 hover:bg-rose-500/5 transition-all uppercase tracking-widest border border-transparent hover:border-rose-500/10"
        >
          <span className="flex items-center gap-3">
            <LogOut className="w-4 h-4" />
            Sign Out
          </span>
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    </aside>
  );
}
