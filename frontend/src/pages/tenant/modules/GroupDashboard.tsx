import { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Home, LayoutGrid, Loader2 } from "lucide-react";
import api from "@/lib/api";
import { navItems } from "@/components/AppSidebar";
import { groupSlug } from "@/lib/groupSlug";
import { usePermissions } from "@/contexts/PermissionsContext";

// Short blurb per group (keyed by sidebar label) shown under the title.
const GROUP_BLURB: Record<string, string> = {
    Classes: "Manage classes, streams and their configuration.",
    Subjects: "Subjects, curriculum framework and subject assignment.",
    Students: "Enrolment, records, wallets, IDs and student logins.",
    Parents: "Parent records and portal access.",
    "Portal Requests": "Academic requisitions and clearance requests.",
    Employees: "Staff, teachers, departments and staff logins.",
    Accounts: "Chart of accounts, income, expenses and statements.",
    Fees: "Invoicing, collections, ledgers, slips and defaulters.",
    Salary: "Payroll runs, slips, sheets and components.",
    Transport: "Zones, buses, student assignment and reports.",
    Attendance: "Daily registers, card scanning and attendance reports.",
    Cafeteria: "Meal service, weekly menu, canteen sales and settings.",
    Reports: "Centralised reporting across every module.",
    Timetable: "Periods, rooms and class/teacher timetable generation.",
    "Academic System": "Academic years, classes, enrolments and promotion.",
    "Academic Content": "Lesson plans, schemes, resources and assignments.",
    "Behaviour & Skills": "Behaviour/skills rating and affective reports.",
    Certificates: "Generate, save and template certificates.",
    Hostel: "Rooms, beds, allocation, attendance and hostel fees.",
    Library: "Catalog, issue/return, members and fines.",
    "Point of Sale": "Products, orders and store analytics.",
    Communications: "Announcements, SMS, email, WhatsApp and gateways.",
    "Live Class & LMS": "Live classes, courses, quizzes and materials.",
    "Question Paper": "Question bank, chapters and paper builder.",
    Exams: "Exams, marks, report cards, rankings and schedules.",
    "Class Tests": "Continuous assessment test marks and results.",
    Settings: "Integrations, custom domains and roles.",
};

// KPI builders per group — each returns small stat tiles from cheap API calls.
// Only groups listed here show KPIs; others just show the launcher grid.
type Stat = { label: string; value: string | number };

function useGroupStats(label: string): { stats: Stat[]; loading: boolean } {
    const enabled = (k: string) => label === k;
    // List endpoints → array. Falls back to [] on any error so a missing route never crashes the page.
    const q = (key: string, url: string, on: boolean) =>
        useQuery<any[]>({ queryKey: ["gd", key], enabled: on, retry: false, queryFn: async () => { try { const r = await api.get(url); return Array.isArray(r.data) ? r.data : (r.data?.data || []); } catch { return []; } } });
    // Object/summary endpoints → object.
    const qObj = (key: string, url: string, on: boolean) =>
        useQuery<any>({ queryKey: ["gd", key], enabled: on, retry: false, queryFn: async () => { try { const r = await api.get(url); return r.data?.data ?? r.data ?? {}; } catch { return {}; } } });

    const students = q("students", "/students", enabled("Students") || enabled("Fees") || enabled("Attendance"));
    const staff = q("staff", "/staff", enabled("Employees") || enabled("Attendance"));
    const classes = q("classes", "/classes", enabled("Classes") || enabled("Academic System"));
    const subjects = q("subjects", "/subjects/all", enabled("Subjects"));
    const invoices = q("invoices", "/invoices", enabled("Fees"));
    const income = q("income", "/income", enabled("Accounts"));
    const expenses = q("expenses", "/expenses", enabled("Accounts"));
    const parents = q("parents", "/parents", enabled("Parents"));
    const zones = q("zones", "/transport_zones", enabled("Transport"));
    const buses = q("buses", "/buses", enabled("Transport"));
    const payruns = q("payruns", "/salary/payroll-runs", enabled("Salary"));
    const salComps = q("salComps", "/salary/components", enabled("Salary"));
    const mealsToday = q("mealsToday", "/cafeteria/meals/today", enabled("Cafeteria"));
    const canteenToday = qObj("canteenToday", "/canteen/sales/today", enabled("Cafeteria"));
    const emailLogs = q("emailLogs", "/communications/email/logs", enabled("Communications"));
    const waLogs = q("waLogs", "/communications/whatsapp/logs", enabled("Communications"));
    const libStats = qObj("libStats", "/library/stats", enabled("Library"));
    const hostelStats = qObj("hostelStats", "/hostel/stats", enabled("Hostel"));
    const posProducts = q("posProducts", "/pos/products", enabled("Point of Sale"));
    const posOrders = q("posOrders", "/pos/orders", enabled("Point of Sale"));
    const exams = q("exams", "/exams", enabled("Exams") || enabled("Class Tests"));
    const certs = q("certs", "/certificates", enabled("Certificates"));
    const lessonPlans = q("lessonPlans", "/lesson_plans", enabled("Academic Content"));
    const schemes = q("schemes", "/schemes_of_work", enabled("Academic Content"));

    const sum = (rows: any[], f: (r: any) => number) => (rows || []).reduce((a, r) => a + (f(r) || 0), 0);
    const ksh = (n: number) => `KSh ${Math.round(n).toLocaleString()}`;
    const len = (r: { data?: any[] }) => r.data?.length ?? 0;

    return useMemo(() => {
        switch (label) {
            case "Students":
                return { stats: [{ label: "Total Students", value: len(students) }], loading: students.isLoading };
            case "Employees":
                return { stats: [{ label: "Total Staff", value: len(staff) }, { label: "Teachers", value: (staff.data || []).filter((s: any) => /teacher/i.test(s.role || s.designation || "")).length }], loading: staff.isLoading };
            case "Classes":
                return { stats: [{ label: "Classes", value: len(classes) }], loading: classes.isLoading };
            case "Subjects":
                return { stats: [{ label: "Subjects", value: len(subjects) }], loading: subjects.isLoading };
            case "Parents":
                return { stats: [{ label: "Parents", value: len(parents) }], loading: parents.isLoading };
            case "Academic System":
                return { stats: [{ label: "Classes", value: len(classes) }], loading: classes.isLoading };
            case "Fees": {
                const inv = invoices.data || [];
                const billed = sum(inv, (i) => Number(i.amount ?? i.total ?? 0));
                const paid = sum(inv, (i) => Number(i.paidAmount ?? i.amountPaid ?? 0));
                return { stats: [{ label: "Invoices", value: inv.length }, { label: "Billed", value: ksh(billed) }, { label: "Collected", value: ksh(paid) }, { label: "Outstanding", value: ksh(Math.max(0, billed - paid)) }], loading: invoices.isLoading };
            }
            case "Accounts": {
                const inc = sum(income.data || [], (i) => Number(i.amount ?? 0));
                const exp = sum(expenses.data || [], (i) => Number(i.amount ?? 0));
                return { stats: [{ label: "Income", value: ksh(inc) }, { label: "Expenses", value: ksh(exp) }, { label: "Net", value: ksh(inc - exp) }], loading: income.isLoading || expenses.isLoading };
            }
            case "Attendance":
                return { stats: [{ label: "Students", value: len(students) }, { label: "Staff", value: len(staff) }], loading: students.isLoading || staff.isLoading };
            case "Transport":
                return { stats: [{ label: "Zones", value: len(zones) }, { label: "Buses", value: len(buses) }], loading: zones.isLoading || buses.isLoading };
            case "Salary":
                return { stats: [{ label: "Payroll Runs", value: len(payruns) }, { label: "Components", value: len(salComps) }], loading: payruns.isLoading || salComps.isLoading };
            case "Cafeteria": {
                const sales = canteenToday.data || {};
                const total = Number(sales.total ?? sales.amount ?? sum(sales.sales || [], (s: any) => Number(s.amount ?? 0)));
                return { stats: [{ label: "Meals Today", value: len(mealsToday) }, { label: "Canteen Sales Today", value: ksh(total) }], loading: mealsToday.isLoading || canteenToday.isLoading };
            }
            case "Communications":
                return { stats: [{ label: "Emails Sent", value: len(emailLogs) }, { label: "WhatsApp Sent", value: len(waLogs) }], loading: emailLogs.isLoading || waLogs.isLoading };
            case "Library": {
                const s = libStats.data || {};
                return { stats: [{ label: "Books", value: s.totalBooks ?? s.books ?? 0 }, { label: "Issued", value: s.issued ?? s.booksIssued ?? 0 }, { label: "Overdue", value: s.overdue ?? 0 }, { label: "Members", value: s.members ?? 0 }], loading: libStats.isLoading };
            }
            case "Hostel": {
                const s = hostelStats.data || {};
                return { stats: [{ label: "Rooms", value: s.totalRooms ?? s.rooms ?? 0 }, { label: "Beds", value: s.totalBeds ?? s.beds ?? 0 }, { label: "Occupied", value: s.occupiedBeds ?? s.occupied ?? 0 }, { label: "Vacant", value: s.vacantBeds ?? s.vacant ?? 0 }], loading: hostelStats.isLoading };
            }
            case "Point of Sale": {
                const orders = posOrders.data || [];
                const revenue = sum(orders, (o) => Number(o.total ?? o.amount ?? 0));
                return { stats: [{ label: "Products", value: len(posProducts) }, { label: "Orders", value: orders.length }, { label: "Revenue", value: ksh(revenue) }], loading: posProducts.isLoading || posOrders.isLoading };
            }
            case "Exams":
            case "Class Tests":
                return { stats: [{ label: "Exams", value: len(exams) }], loading: exams.isLoading };
            case "Certificates":
                return { stats: [{ label: "Certificates", value: len(certs) }], loading: certs.isLoading };
            case "Academic Content":
                return { stats: [{ label: "Lesson Plans", value: len(lessonPlans) }, { label: "Schemes of Work", value: len(schemes) }], loading: lessonPlans.isLoading || schemes.isLoading };
            default:
                return { stats: [], loading: false };
        }
    }, [label, students.data, staff.data, classes.data, subjects.data, invoices.data, income.data, expenses.data, parents.data, zones.data, buses.data, payruns.data, salComps.data, mealsToday.data, canteenToday.data, emailLogs.data, waLogs.data, libStats.data, hostelStats.data, posProducts.data, posOrders.data, exams.data, certs.data, lessonPlans.data, schemes.data,
        students.isLoading, staff.isLoading, classes.isLoading, subjects.isLoading, invoices.isLoading, income.isLoading, expenses.isLoading, parents.isLoading, zones.isLoading, buses.isLoading, payruns.isLoading, salComps.isLoading, mealsToday.isLoading, canteenToday.isLoading, emailLogs.isLoading, waLogs.isLoading, libStats.isLoading, hostelStats.isLoading, posProducts.isLoading, posOrders.isLoading, exams.isLoading, certs.isLoading, lessonPlans.isLoading, schemes.isLoading]);
}

export default function GroupDashboard() {
    const { groupKey } = useParams();
    const perms = usePermissions();
    const group = useMemo(() => navItems.find((n) => n.children && groupSlug(n.label) === groupKey), [groupKey]);
    const { stats, loading } = useGroupStats(group?.label || "");

    if (!group) {
        return (
            <div className="flex-1 bg-[#f4f7f6] min-h-screen flex flex-col items-center justify-center gap-3 text-center p-6">
                <LayoutGrid className="w-12 h-12 text-slate-300" />
                <p className="text-slate-500 font-bold">This section has no overview page.</p>
                <Link to="/dashboard" className="text-[#5C67F2] font-bold text-sm">Back to Dashboard</Link>
            </div>
        );
    }

    const Icon = group.icon;
    // Same page-permission rule as the sidebar: if the user holds any of this
    // group's child page-perms, only show the granted pages; otherwise (module
    // grant or admin) show all.
    const granted = perms.permissions || [];
    const wildcard = perms.isAdmin || granted.includes("*");
    const groupPagePerms = (group.children || []).map((ch: any) => ch.pagePerm).filter(Boolean) as string[];
    const userHasSomePagePerm = !wildcard && groupPagePerms.some((p) => granted.includes(p));
    const children = (group.children || []).filter((c: any) => {
        if (c.path === "/logout" || c.path.startsWith("http")) return false;
        if (userHasSomePagePerm && c.pagePerm && !granted.includes(c.pagePerm)) return false;
        return true;
    });

    return (
        <div className="flex-1 bg-[#f4f7f6] min-h-screen p-6">
            <div className="max-w-6xl mx-auto">
                {/* Breadcrumb */}
                <div className="flex items-center gap-2 text-[12px] text-slate-400 font-bold mb-4">
                    <Link to="/dashboard" className="flex items-center gap-1 hover:text-slate-600"><Home className="w-3.5 h-3.5" /> Dashboard</Link>
                    <span>/</span>
                    <span className="text-slate-600">{group.label}</span>
                </div>

                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-[#5C67F2] flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                        <Icon className="w-7 h-7" strokeWidth={1.5} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-800">{group.label}</h1>
                        <p className="text-sm text-slate-500">{GROUP_BLURB[group.label] || `Overview of the ${group.label} module.`}</p>
                    </div>
                </div>

                {/* KPI tiles (only for data-backed groups) */}
                {stats.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        {stats.map((s) => (
                            <div key={s.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">{s.label}</div>
                                <div className="text-2xl font-black text-slate-800 mt-1">{loading ? <Loader2 className="w-5 h-5 animate-spin text-slate-300" /> : s.value}</div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Launcher grid — every child page in the group */}
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">Sections</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {children.map((c) => (
                        <Link key={c.path} to={c.path}
                            className="group bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center justify-between hover:border-[#5C67F2] hover:shadow-md transition-all">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-[#5C67F2]/10 text-[#5C67F2] flex items-center justify-center">
                                    <Icon className="w-5 h-5" strokeWidth={1.6} />
                                </div>
                                <span className="font-bold text-slate-700 text-sm">{c.label}</span>
                            </div>
                            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-[#5C67F2] group-hover:translate-x-0.5 transition-all" />
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
