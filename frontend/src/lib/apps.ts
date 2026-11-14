// ── Apps ───────────────────────────────────────────────────────────────────────
// The admin web app is organised into APPS (Exams, Academics, Fees, Front Desk…),
// each made of one or more sidebar groups (navItems in AppSidebar). Permissions are
// still granted per module/page; an app is visible when the user may use at least
// one of its groups. "app.<key>" is a permission code that grants a whole app.
import type React from "react";
import {
    GraduationCap, ClipboardList, BookOpen, Video, Users, DoorOpen, MessageSquare, UserCheck, BedDouble, Library as LibraryIcon,
    Bus, Trophy, Banknote, Scale, Wallet, ShoppingCart, Briefcase, BarChart3, Settings, LayoutDashboard, Boxes,
} from "lucide-react";
import { navItems, type NavItem } from "@/components/navItems";
import { CAPABILITIES } from "@/lib/permissions";

export type AppCategory = "Academics" | "Front Office" | "Student Life" | "Financial" | "Back Office";
export const APP_CATEGORIES: { key: AppCategory; hint: string }[] = [
    { key: "Academics", hint: "Teaching, learning and assessment" },
    { key: "Front Office", hint: "Learners, parents, visitors and messages" },
    { key: "Student Life", hint: "Attendance, boarding, library, transport and activities" },
    { key: "Financial", hint: "Fees, accounts, payroll and sales" },
    { key: "Back Office", hint: "Staff, reports and school setup" },
];

export interface AppDef {
    key: string;
    name: string;
    description: string;
    category: AppCategory;
    icon: React.ElementType;
    color: string;
    groups: string[];          // navItems labels that make up the app
    path?: string;             // apps with a single page (no groups)
    moduleKeys?: string[];     // for path-only apps
}

export const APPS: AppDef[] = [
    { key: "academics", name: "Academics", category: "Academics", icon: GraduationCap, color: "#5C67F2", description: "Classes, Subjects, Timetable, Lesson Plans, Calendar", groups: ["Classes", "Subjects", "Timetable", "Academic Content", "Calendar"] },
    { key: "exams", name: "Exams", category: "Academics", icon: ClipboardList, color: "#7C3AED", description: "Exams, Marks Entry, Report Cards, Question Papers, Certificates", groups: ["Exams", "Question Paper", "Certificates"] },
    { key: "cbc", name: "CBC Assessment", category: "Academics", icon: BookOpen, color: "#0EA5E9", description: "Strands, Assessments, Competency Reports", groups: ["CBC Assessment"] },
    { key: "elearning", name: "E-Learning", category: "Academics", icon: Video, color: "#14B8A6", description: "Live Classes, Courses, Quizzes", groups: ["Live Class & LMS"] },

    { key: "students", name: "Students", category: "Front Office", icon: Users, color: "#2563EB", description: "Learners, Admissions, Promotion, Parents, Portal Requests", groups: ["Students", "Parents", "Portal Requests"] },
    { key: "frontdesk", name: "Front Desk", category: "Front Office", icon: DoorOpen, color: "#F59E0B", description: "Visitors, Sign-outs, Appointments, Secretary", groups: ["Front Desk", "Secretary"] },
    { key: "communication", name: "Communication", category: "Front Office", icon: MessageSquare, color: "#EC4899", description: "Meetings, SMS, Email, WhatsApp, Templates", groups: ["Communications"] },

    { key: "attendance", name: "Attendance & Discipline", category: "Student Life", icon: UserCheck, color: "#10B981", description: "Daily Attendance, Behaviour, Skills", groups: ["Attendance", "Behaviour & Skills"] },
    { key: "boarding", name: "Boarding & Meals", category: "Student Life", icon: BedDouble, color: "#8B5CF6", description: "Hostels, Rooms, Cafeteria, Canteen", groups: ["Hostel", "Cafeteria"] },
    { key: "library", name: "Library", category: "Student Life", icon: LibraryIcon, color: "#0891B2", description: "Books, Members, Issues & Returns", groups: ["Library"] },
    { key: "transport", name: "Transport", category: "Student Life", icon: Bus, color: "#EA580C", description: "Routes, Zones, Buses, Drivers", groups: ["Transport"] },
    { key: "activities", name: "Co-curricular", category: "Student Life", icon: Trophy, color: "#CA8A04", description: "Sports, Clubs, Trips & Excursions", groups: ["Sports", "Trips & Excursions"] },

    { key: "fees", name: "Fees", category: "Financial", icon: Banknote, color: "#16A34A", description: "Invoices, Collections, Receipts, Scholarships, Sponsors", groups: ["Fees"] },
    { key: "accounting", name: "Accounting", category: "Financial", icon: Scale, color: "#0F766E", description: "Journal Entries, Accounts, Expenses, Procurement", groups: ["Accounting", "Expense Management", "Procurement"] },
    { key: "payroll", name: "Payroll", category: "Financial", icon: Wallet, color: "#9333EA", description: "Salaries, Payslips, Deductions", groups: ["Salary"] },
    { key: "pos", name: "Point of Sale", category: "Financial", icon: ShoppingCart, color: "#DB2777", description: "Shop, Products, Sales", groups: ["Point of Sale"] },

    { key: "overview", name: "School Overview", category: "Back Office", icon: LayoutDashboard, color: "#475569", description: "Key numbers across the school", groups: [], path: "/dashboard", moduleKeys: ["dashboard"] },
    { key: "hr", name: "Human Resources", category: "Back Office", icon: Briefcase, color: "#4F46E5", description: "Employees, Departments, Leave, Requests", groups: ["Departments", "Employees", "Requests"] },
    { key: "reports", name: "Reports", category: "Back Office", icon: BarChart3, color: "#0284C7", description: "Academic, Finance and Attendance Reports", groups: ["Reports"] },
    { key: "administration", name: "Administration", category: "Back Office", icon: Settings, color: "#334155", description: "School Setup, Users, Roles & Permissions, NEMIS", groups: ["General Settings", "Settings", "NEMIS Assistant"] },
];

// Any sidebar group not placed in an app above still gets a home ("More"), so nothing is lost.
const placed = new Set(APPS.flatMap(a => a.groups));
const orphans = navItems.filter(n => n.children && !placed.has(n.label)).map(n => n.label);
if (orphans.length) APPS.push({ key: "more", name: "More Tools", category: "Back Office", icon: Boxes, color: "#64748B", description: orphans.join(", "), groups: orphans });

export const appByKey = (key: string) => APPS.find(a => a.key === key);
export const appGroupItems = (app: AppDef): NavItem[] => app.groups.map(g => navItems.find(n => n.label === g)).filter(Boolean) as NavItem[];
export const appModuleKeys = (app: AppDef): string[] =>
    Array.from(new Set([...(app.moduleKeys || []), ...appGroupItems(app).map(g => g.moduleKey).filter(Boolean) as string[]]));
/** Where an app opens. */
export const appHomePath = (app: AppDef) => app.path || `/apps/${app.key}`;

const matches = (pathname: string, p: string) => {
    const base = p.split(/[?#]/)[0];
    return !!base && (pathname === base || pathname.startsWith(base + "/"));
};
/** The app the current page belongs to (longest matching page path wins). */
export function appForPath(pathname: string): AppDef | null {
    const m = pathname.match(/^\/apps\/([^/]+)/);
    if (m) return appByKey(m[1]) || null;
    let best: { app: AppDef; len: number } | null = null;
    for (const app of APPS) {
        if (app.path && matches(pathname, app.path) && (!best || app.path.length > best.len)) best = { app, len: app.path.length };
        for (const g of appGroupItems(app)) {
            for (const c of g.children || []) {
                const base = c.path.split(/[?#]/)[0];
                if (matches(pathname, c.path) && (!best || base.length > best.len)) best = { app, len: base.length };
            }
            const slug = `/g/`;
            if (pathname.startsWith(slug) && pathname.slice(slug.length) === g.label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")) best = { app, len: 999 };
        }
    }
    return best?.app || null;
}

// ── Recently used + starred apps (per browser, per user) ───────────────────────
const who = () => { try { const u = JSON.parse(localStorage.getItem("user") || "{}"); return u.id || u.email || "me"; } catch { return "me"; } };
const read = (k: string): string[] => { try { const v = JSON.parse(localStorage.getItem(`${k}:${who()}`) || "[]"); return Array.isArray(v) ? v : []; } catch { return []; } };
const write = (k: string, v: string[]) => { try { localStorage.setItem(`${k}:${who()}`, JSON.stringify(v)); } catch { /* private mode */ } window.dispatchEvent(new Event("sc-apps-changed")); };
export const recentApps = () => read("sc_recent_apps");
export const starredApps = () => read("sc_starred_apps");
export const touchApp = (key: string) => { const r = recentApps(); if (r[0] === key) return; write("sc_recent_apps", [key, ...r.filter(k => k !== key)].slice(0, 6)); };
export const toggleStar = (key: string) => { const s = starredApps(); write("sc_starred_apps", s.includes(key) ? s.filter(k => k !== key) : [...s, key]); };

// Which app a permission code belongs to: "app.<key>", a capability (lib/permissions
// CAPABILITIES) or a page permission "<moduleKey>.<page>".
export const appForCode = (code: string): string | null => {
    if (code.startsWith("app.")) return code.slice(4);
    const cap = CAPABILITIES.find(c => c.code === code);
    if (cap) return cap.app;
    const prefix = code.split(".")[0];
    const app = APPS.find(a => appModuleKeys(a).includes(prefix));
    return app ? app.key : null;
};

/** Apps every school keeps; the platform owner cannot switch these off. */
export const CORE_APPS = ["overview", "administration"];
