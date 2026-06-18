import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import {
    User, Briefcase, DollarSign, ChevronLeft, ChevronRight,
    Calendar as CalendarIcon, CheckCircle2, AlertCircle, ArrowRight,
    BookOpen, TrendingUp
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { usePermissions } from "@/contexts/PermissionsContext";

export default function Dashboard() {
    const navigate = useNavigate();

    // Permission-aware dashboard: non-admins only see the cards/panels for the
    // modules they're allowed to access. Each section is gated below, and its
    // underlying query is disabled when not permitted (so no 403 noise).
    const perms = usePermissions();
    const can = (mod: string) => perms.isAdmin || (perms.modules || []).includes("*") || (perms.modules || []).includes(mod);
    const canStudents = can("students");
    const canStaff = can("employees");
    const canFinance = can("fees") || can("accounts");
    const canClasses = can("classes") || canStudents;
    const canAttendance = can("attendance");

    const today = useMemo(() => new Date().toLocaleDateString("en-CA"), []);

    const currentMonthStr = useMemo(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    }, []);

    // ── Real data fetches ──────────────────────────────────────────────────────
    const { data: students = [], isLoading: loadingStudents } = useQuery<any[]>({
        queryKey: ["dashboard_students"],
        enabled: canStudents || canClasses || canFinance,
        queryFn: async () => { try { return (await api.get("/students")).data || []; } catch { return []; } },
    });

    const { data: staff = [], isLoading: loadingStaff } = useQuery<any[]>({
        queryKey: ["dashboard_staff"],
        enabled: canStaff,
        queryFn: async () => { try { return (await api.get("/staff")).data || []; } catch { return []; } },
    });

    const { data: income = [] } = useQuery<any[]>({
        queryKey: ["dashboard_income"],
        enabled: canFinance,
        queryFn: async () => { try { return (await api.get("/income")).data || []; } catch { return []; } },
    });

    const { data: expenses = [] } = useQuery<any[]>({
        queryKey: ["dashboard_expenses"],
        enabled: canFinance,
        queryFn: async () => { try { return (await api.get("/expenses")).data || []; } catch { return []; } },
    });

    const { data: classes = [] } = useQuery<any[]>({
        queryKey: ["dashboard_classes"],
        enabled: canClasses,
        queryFn: async () => { try { return (await api.get("/classes")).data || []; } catch { return []; } },
    });

    const { data: feeStructures = [] } = useQuery<any[]>({
        queryKey: ["dashboard_fee_structures"],
        enabled: canFinance,
        queryFn: async () => { try { return (await api.get("/fee_structures")).data || []; } catch { return []; } },
    });

    const { data: invoices = [] } = useQuery<any[]>({
        queryKey: ["dashboard_invoices"],
        enabled: canFinance,
        queryFn: async () => { try { return (await api.get("/invoices")).data || []; } catch { return []; } },
    });

    const { data: attendanceDashboard } = useQuery<any>({
        queryKey: ["dashboard_attendance_summary", today],
        enabled: canAttendance,
        queryFn: async () => {
            try { const r = await api.get("/schools/default/attendance/dashboard"); return r.data?.data || null; } catch { return null; }
        },
    });

    const { data: absentStudents = [] } = useQuery<any[]>({
        queryKey: ["dashboard_absent_students", today],
        enabled: canAttendance,
        queryFn: async () => {
            try {
                const r = await api.get("/schools/default/attendance/reports/students/low-attendance", {
                    params: { threshold: 50, from: today, to: today },
                });
                return r.data?.data || [];
            } catch { return []; }
        },
    });

    const { data: employeeAttendance = [] } = useQuery<any[]>({
        queryKey: ["dashboard_employee_attendance", today],
        enabled: canAttendance && canStaff,
        queryFn: async () => {
            try { const r = await api.get("/schools/default/attendance/employees", { params: { date: today } }); return r.data?.data || []; } catch { return []; }
        },
    });

    // ── Metrics ───────────────────────────────────────────────────────────────

    const studentsThisMonth = useMemo(() =>
        students.filter((s: any) => s.createdAt?.startsWith(currentMonthStr)).length,
        [students, currentMonthStr]
    );

    const staffThisMonth = useMemo(() =>
        staff.filter((s: any) => s.createdAt?.startsWith(currentMonthStr)).length,
        [staff, currentMonthStr]
    );

    const finances = useMemo(() => {
        const thisMonthIncome = income.filter((i: any) => i.date?.startsWith(currentMonthStr));
        const thisMonthExpenses = expenses.filter((e: any) => e.date?.startsWith(currentMonthStr));

        // Also count fee invoices paid this month
        const thisMonthPaidInvoices = invoices.filter((inv: any) =>
            (inv.status === "PAID" || inv.status === "PARTIAL") &&
            inv.createdAt?.startsWith(currentMonthStr)
        );
        const invoiceRevenue = thisMonthPaidInvoices.reduce((acc: number, inv: any) =>
            acc + (parseFloat(inv.paid_amount || inv.amount_paid || 0)), 0
        );

        const revenue = thisMonthIncome.reduce((acc, i) => acc + (parseFloat(i.amount) || 0), 0) + invoiceRevenue;
        const expenseTotal = thisMonthExpenses.reduce((acc, e) => acc + (parseFloat(e.amount) || 0), 0);
        const profit = revenue - expenseTotal;

        const last6Months = Array.from({ length: 6 }).map((_, idx) => {
            const d = new Date();
            d.setMonth(d.getMonth() - (5 - idx));
            return {
                key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
                name: d.toLocaleString("default", { month: "short" }),
            };
        });

        const chart1Data = last6Months.map((mon) => {
            const monIncome = income
                .filter((i: any) => i.date?.startsWith(mon.key))
                .reduce((acc, i) => acc + (parseFloat(i.amount) || 0), 0);
            const monPaidInv = invoices
                .filter((inv: any) => inv.createdAt?.startsWith(mon.key) &&
                    (inv.status === "PAID" || inv.status === "PARTIAL"))
                .reduce((acc: number, inv: any) => acc + (parseFloat(inv.paid_amount || inv.amount_paid || 0)), 0);
            const monExpenses = expenses
                .filter((e: any) => e.date?.startsWith(mon.key))
                .reduce((acc, e) => acc + (parseFloat(e.amount) || 0), 0);
            return { monthName: mon.name, income: monIncome + monPaidInv, expenses: monExpenses };
        });

        return { revenue, expenseTotal, profit, chart1Data };
    }, [income, expenses, invoices, currentMonthStr]);

    const classChartData = useMemo(() => {
        if (classes.length === 0) return [];
        return classes
            .map((cls: any) => {
                const name = cls.levelName
                    ? `${cls.levelName}${cls.streamName && cls.streamName !== "General" ? " " + cls.streamName : ""}`.trim()
                    : (cls.name || "Class");
                const count = students.filter((s: any) => {
                    const sc = s.studentClass || s.currentClass;
                    return sc === name || s.classId === cls._id?.toString();
                }).length;
                return { className: name, count };
            })
            .filter((c: any) => c.count > 0)
            .slice(0, 6);
    }, [classes, students]);

    const feeEstimation = useMemo(() => {
        const totalEstimated = students.reduce((sum: number, student: any) => {
            const sc = student.studentClass || student.currentClass;
            const struct = feeStructures.find((fs: any) => fs.className === sc);
            if (struct?.amounts) {
                return sum + Object.values(struct.amounts).reduce((s: number, v: any) => s + (parseFloat(v) || 0), 0);
            }
            return sum;
        }, 0);

        const collected = finances.revenue;
        const percent = totalEstimated > 0 ? Math.min(100, Math.round((collected / totalEstimated) * 100)) : 0;
        return { totalEstimated, collected, percent };
    }, [students, feeStructures, finances.revenue]);

    const latestAdmission = useMemo(() => {
        if (students.length === 0) return null;
        const sorted = [...students].sort((a, b) =>
            new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        );
        const s = sorted[0];
        return {
            registrationNo: s.registrationNo || s.studentId || "N/A",
            studentName: s.studentName || `${s.firstName || ""} ${s.lastName || ""}`.trim() || "Student",
            studentClass: s.studentClass || s.currentClass || "General",
            avatar: s.avatar || null,
        };
    }, [students]);

    const presentEmployees = useMemo(() =>
        employeeAttendance.filter((emp: any) =>
            emp.attendance?.status === "PRESENT" || emp.attendance?.status === "LATE"
        ),
        [employeeAttendance]
    );

    const attendancePercentages = useMemo(() => {
        const stTotal = attendanceDashboard?.students?.total || 0;
        const stPresent = (attendanceDashboard?.students?.present || 0) + (attendanceDashboard?.students?.late || 0);
        const empTotal = attendanceDashboard?.employees?.total || 0;
        const empPresent = attendanceDashboard?.employees?.present || 0;
        return {
            studentPercent: stTotal > 0 ? Math.min(100, Math.round((stPresent / stTotal) * 100)) : 0,
            employeePercent: empTotal > 0 ? Math.min(100, Math.round((empPresent / empTotal) * 100)) : 0,
        };
    }, [attendanceDashboard]);

    const userProfile = useMemo(() => {
        try { return JSON.parse(localStorage.getItem("user") || "null"); } catch { return null; }
    }, []);

    // ── Chart helpers ─────────────────────────────────────────────────────────

    const maxFinValue = useMemo(() =>
        Math.max(...finances.chart1Data.map(d => Math.max(d.income, d.expenses)), 1),
        [finances.chart1Data]
    );
    const getScaledY = (val: number) => 130 - (val / maxFinValue) * 100;
    const getScaledX = (idx: number) => 50 + idx * 80;

    const incomeLinePath = finances.chart1Data
        .map((d, i) => `${i === 0 ? "M" : "L"} ${getScaledX(i)} ${getScaledY(d.income)}`).join(" ");
    const expensesLinePath = finances.chart1Data
        .map((d, i) => `${i === 0 ? "M" : "L"} ${getScaledX(i)} ${getScaledY(d.expenses)}`).join(" ");
    const incomeAreaPath = finances.chart1Data.length > 0
        ? `M ${getScaledX(0)} 130 L ${finances.chart1Data.map((d, i) => `${getScaledX(i)} ${getScaledY(d.income)}`).join(" L ")} L ${getScaledX(finances.chart1Data.length - 1)} 130 Z`
        : "";
    const expensesAreaPath = finances.chart1Data.length > 0
        ? `M ${getScaledX(0)} 130 L ${finances.chart1Data.map((d, i) => `${getScaledX(i)} ${getScaledY(d.expenses)}`).join(" L ")} L ${getScaledX(finances.chart1Data.length - 1)} 130 Z`
        : "";

    const maxBarValue = useMemo(() => Math.max(...classChartData.map((d: any) => d.count), 1), [classChartData]);
    const getBarY = (v: number) => 130 - (v / maxBarValue) * 100;
    const getBarHeight = (v: number) => (v / maxBarValue) * 100;

    const fmt = (n: number) => `KSh ${n.toLocaleString()}`;

    return (
        <div className="flex-1 bg-[#f4f7f6] min-h-screen p-6">

            {/* ── Top 4 Metric Cards ───────────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">

                {/* Students */}
                {canStudents && (
                <div onClick={() => navigate("/students")}
                    className="bg-[#4e4bb2] rounded-3xl p-6 text-white shadow-sm flex flex-col justify-between h-36 cursor-pointer hover:shadow-lg hover:scale-[1.01] transition-all">
                    <h3 className="font-bold text-sm tracking-wide">Total Students</h3>
                    <div className="flex justify-between items-end">
                        <div className="flex flex-col gap-3">
                            <User className="w-8 h-8 opacity-80" strokeWidth={1.5} />
                            <span className="text-xs opacity-80 font-bold uppercase tracking-wider">
                                This Month (+{studentsThisMonth})
                            </span>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                            {loadingStudents
                                ? <span className="text-4xl font-bold tracking-tight opacity-60">…</span>
                                : <span className="text-4xl font-bold tracking-tight">{students.length}</span>
                            }
                            <span className="text-xs font-semibold opacity-90">Live registry</span>
                        </div>
                    </div>
                </div>
                )}

                {/* Employees */}
                {canStaff && (
                <div onClick={() => navigate("/staff")}
                    className="bg-[#8b91db] rounded-3xl p-6 text-white shadow-sm flex flex-col justify-between h-36 cursor-pointer hover:shadow-lg hover:scale-[1.01] transition-all">
                    <h3 className="font-bold text-sm tracking-wide">Total Employees</h3>
                    <div className="flex justify-between items-end">
                        <div className="flex flex-col gap-3">
                            <Briefcase className="w-8 h-8 opacity-80" strokeWidth={1.5} />
                            <span className="text-xs opacity-80 font-bold uppercase tracking-wider">
                                This Month (+{staffThisMonth})
                            </span>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                            {loadingStaff
                                ? <span className="text-4xl font-bold tracking-tight opacity-60">…</span>
                                : <span className="text-4xl font-bold tracking-tight">{staff.length}</span>
                            }
                            <span className="text-xs font-semibold opacity-90">Active staff</span>
                        </div>
                    </div>
                </div>
                )}

                {/* Revenue */}
                {canFinance && (
                <div onClick={() => navigate("/accounts/statement")}
                    className="bg-[#ff808b] rounded-3xl p-6 text-white shadow-sm flex flex-col justify-between h-36 cursor-pointer hover:shadow-lg hover:scale-[1.01] transition-all">
                    <h3 className="font-bold text-sm tracking-wide">Revenue</h3>
                    <div className="flex justify-between items-end">
                        <div className="flex flex-col gap-3">
                            <DollarSign className="w-8 h-8 opacity-80" strokeWidth={1.5} />
                            <span className="text-xs opacity-80 font-bold uppercase tracking-wider">This Month Collections</span>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                            <span className="text-3xl font-black tracking-tight">
                                {finances.revenue > 0 ? fmt(Math.round(finances.revenue)) : "KSh 0"}
                            </span>
                            <span className="text-xs font-semibold opacity-90">Fee transactions</span>
                        </div>
                    </div>
                </div>
                )}

                {/* Net Profit */}
                {canFinance && (
                <div onClick={() => navigate("/accounts/statement")}
                    className="bg-[#6b8cff] rounded-3xl p-6 text-white shadow-sm flex flex-col justify-between h-36 cursor-pointer hover:shadow-lg hover:scale-[1.01] transition-all">
                    <h3 className="font-bold text-sm tracking-wide">Net Surplus / Profit</h3>
                    <div className="flex justify-between items-end">
                        <div className="flex flex-col gap-3">
                            <TrendingUp className="w-8 h-8 opacity-80" strokeWidth={1.5} />
                            <span className="text-xs opacity-80 font-bold uppercase tracking-wider">Net Monthly Surplus</span>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                            <span className={`text-3xl font-black tracking-tight ${finances.profit < 0 ? "text-rose-200" : ""}`}>
                                {finances.profit < 0 ? "-" : ""}{fmt(Math.abs(Math.round(finances.profit)))}
                            </span>
                            <span className="text-xs font-semibold opacity-90">Income vs expenses</span>
                        </div>
                    </div>
                </div>
                )}

                {/* When a user has none of the above, show a friendly tile so the grid isn't empty. */}
                {!canStudents && !canStaff && !canFinance && (
                    <div className="md:col-span-2 lg:col-span-4 bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-[#5C67F2]/10 text-[#5C67F2] flex items-center justify-center"><CheckCircle2 className="w-6 h-6" /></div>
                        <div>
                            <h3 className="font-black text-slate-800">Welcome, {userProfile?.name || "there"}</h3>
                            <p className="text-sm text-slate-500">Use the menu to access the areas you've been given permission for.</p>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Welcome Banner ─────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                <div className={`${canAttendance ? "lg:col-span-2" : "lg:col-span-3"} bg-[#ffe7e9] rounded-2xl p-6 flex justify-between items-center shadow-sm relative overflow-hidden`}>
                    <div className="z-10 relative">
                        <h3 className="text-[#ff5e6c] font-bold text-lg mb-1">
                            Welcome back, {userProfile?.name || "Administrator"}
                        </h3>
                        <p className="text-gray-600 text-sm font-medium leading-relaxed">
                            {canStudents && students.length > 0
                                ? `${students.length} students${canStaff ? ` and ${staff.length} staff members` : ""} registered. Your registers are live.`
                                : "Welcome to your dashboard. Use the menu to access your assigned areas."}
                        </p>
                    </div>
                    <div className="w-32 h-32 absolute right-8 -bottom-4 bg-white/40 rounded-full flex items-center justify-center pointer-events-none">
                        <CheckCircle2 className="w-16 h-16 text-[#ff5e6c] opacity-50" />
                    </div>
                </div>

                {/* Quick attendance summary */}
                {canAttendance && (
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between">
                    <h3 className="text-[#3a3f9e] font-bold text-sm uppercase tracking-wider mb-4">Today's Attendance</h3>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Students</span>
                            <span className="text-sm font-black text-[#6b8cff]">
                                {attendanceDashboard
                                    ? `${attendanceDashboard.students?.present || 0} / ${attendanceDashboard.students?.total || 0}`
                                    : "—"}
                            </span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-[#6b8cff] rounded-full transition-all"
                                style={{ width: `${attendancePercentages.studentPercent}%` }} />
                        </div>
                        <div className="flex justify-between items-center mt-2">
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Staff</span>
                            <span className="text-sm font-black text-[#ff5e6c]">
                                {attendanceDashboard
                                    ? `${attendanceDashboard.employees?.present || 0} / ${attendanceDashboard.employees?.total || 0}`
                                    : "—"}
                            </span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-[#ff5e6c] rounded-full transition-all"
                                style={{ width: `${attendancePercentages.employeePercent}%` }} />
                        </div>
                    </div>
                </div>
                )}
            </div>

            {/* ── Main Layout ───────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Column */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Financial Line Chart + Class chart card */}
                    {(canFinance || canClasses) && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        {canFinance && (
                        <div className="mb-8">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-[#8b91db] font-black text-sm uppercase tracking-wider">
                                    Financial Statement (Last 6 Months)
                                </h3>
                                <div className="flex items-center gap-4 text-[10px] font-black text-gray-500 uppercase">
                                    <div className="flex items-center gap-1.5"><div className="w-6 h-2.5 bg-[#6b8cff] rounded-sm" /> Income</div>
                                    <div className="flex items-center gap-1.5"><div className="w-6 h-2.5 bg-[#ff808b] rounded-sm" /> Expenses</div>
                                </div>
                            </div>

                            {finances.chart1Data.every(d => d.income === 0 && d.expenses === 0) ? (
                                <div className="flex flex-col items-center justify-center h-44 bg-slate-50 rounded-2xl border border-slate-100">
                                    <DollarSign className="w-8 h-8 text-slate-300 mb-2" />
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">No financial records yet</p>
                                    <p className="text-[10px] text-slate-400 mt-0.5">Add income or expenses to see the chart</p>
                                </div>
                            ) : (
                                <div className="w-full h-44 relative bg-slate-50/50 rounded-2xl border border-slate-100 p-2 overflow-hidden">
                                    <svg className="w-full h-full" viewBox="0 0 500 160" preserveAspectRatio="none">
                                        <defs>
                                            <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#6b8cff" stopOpacity="0.4" />
                                                <stop offset="100%" stopColor="#6b8cff" stopOpacity="0.0" />
                                            </linearGradient>
                                            <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#ff808b" stopOpacity="0.4" />
                                                <stop offset="100%" stopColor="#ff808b" stopOpacity="0.0" />
                                            </linearGradient>
                                        </defs>
                                        <line x1="40" y1="30" x2="480" y2="30" stroke="#e2e8f0" strokeDasharray="3" />
                                        <line x1="40" y1="80" x2="480" y2="80" stroke="#e2e8f0" strokeDasharray="3" />
                                        <line x1="40" y1="130" x2="480" y2="130" stroke="#cbd5e1" strokeWidth="1.5" />
                                        <path d={incomeAreaPath} fill="url(#incomeGrad)" />
                                        <path d={expensesAreaPath} fill="url(#expenseGrad)" />
                                        <path d={incomeLinePath} fill="none" stroke="#6b8cff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                                        <path d={expensesLinePath} fill="none" stroke="#ff808b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                                        {finances.chart1Data.map((d, idx) => (
                                            <g key={idx}>
                                                <circle cx={getScaledX(idx)} cy={getScaledY(d.income)} r="4.5" fill="#6b8cff" stroke="#fff" strokeWidth="1.5" />
                                                <circle cx={getScaledX(idx)} cy={getScaledY(d.expenses)} r="4.5" fill="#ff808b" stroke="#fff" strokeWidth="1.5" />
                                                <text x={getScaledX(idx)} y="148" textAnchor="middle" fontSize="9" fill="#94a3b8" fontWeight="bold">{d.monthName}</text>
                                            </g>
                                        ))}
                                    </svg>
                                </div>
                            )}
                        </div>
                        )}

                        {/* Class Enrolment Bar Chart */}
                        {canClasses && (
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-[#6b8cff] font-black text-sm uppercase tracking-wider">Class Enrolment Sizes</h3>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Per class</span>
                            </div>

                            {classChartData.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-44 bg-slate-50 rounded-2xl border border-slate-100">
                                    <BookOpen className="w-8 h-8 text-slate-300 mb-2" />
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">No classes with students yet</p>
                                    <p className="text-[10px] text-slate-400 mt-0.5">Add classes and enrol students to see this chart</p>
                                </div>
                            ) : (
                                <div className="w-full h-44 relative bg-slate-50/50 rounded-2xl border border-slate-100 p-2 overflow-hidden">
                                    <svg className="w-full h-full" viewBox="0 0 500 160" preserveAspectRatio="none">
                                        <defs>
                                            <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#8b91db" stopOpacity="0.95" />
                                                <stop offset="100%" stopColor="#6b8cff" stopOpacity="0.8" />
                                            </linearGradient>
                                        </defs>
                                        <line x1="40" y1="30" x2="480" y2="30" stroke="#e2e8f0" strokeDasharray="3" />
                                        <line x1="40" y1="80" x2="480" y2="80" stroke="#e2e8f0" strokeDasharray="3" />
                                        <line x1="40" y1="130" x2="480" y2="130" stroke="#cbd5e1" strokeWidth="1.5" />
                                        {classChartData.map((d: any, idx: number) => {
                                            const w = 32;
                                            const x = 50 + idx * 80 - w / 2;
                                            return (
                                                <g key={idx}>
                                                    <rect x={x} y={getBarY(d.count)} width={w} height={getBarHeight(d.count)} rx="6" fill="url(#barGrad)" />
                                                    <text x={x + w / 2} y={getBarY(d.count) - 6} textAnchor="middle" fontSize="10" fill="#475569" fontWeight="bold">{d.count}</text>
                                                    <text x={x + w / 2} y="148" textAnchor="middle" fontSize="8" fill="#94a3b8" fontWeight="bold">{d.className.slice(0, 8)}</text>
                                                </g>
                                            );
                                        })}
                                    </svg>
                                </div>
                            )}
                        </div>
                        )}
                    </div>
                    )}

                    {/* Absent Students Today */}
                    {canAttendance && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-[#ff5e6c] font-black text-sm uppercase tracking-wider">Today Absent Students</h3>
                            <button onClick={() => navigate("/attendance/students")}
                                className="text-xs font-black text-[#5C67F2] hover:underline uppercase tracking-wider flex items-center gap-1">
                                Open Register <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                        </div>
                        {absentStudents.length > 0 ? (
                            <div className="max-h-60 overflow-y-auto divide-y divide-gray-50 pr-2">
                                {absentStudents.map((s: any, i: number) => (
                                    <div key={s.student_id || i} className="py-3 flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center font-bold text-xs text-rose-500 uppercase border border-red-100">
                                                {s.student_name?.substring(0, 2)}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-800">{s.student_name}</p>
                                                <p className="text-[10px] text-gray-500 font-semibold">{s.class_name || "—"}</p>
                                            </div>
                                        </div>
                                        <span className="bg-red-50 border border-red-200 text-rose-600 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">Absent</span>
                                    </div>
                                ))}
                            </div>
                        ) : attendanceDashboard?.students?.present > 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 text-emerald-600 bg-emerald-50/30 border border-emerald-100 rounded-2xl">
                                <CheckCircle2 className="w-8 h-8 mb-2" />
                                <p className="font-black text-sm uppercase tracking-wide">Full attendance today!</p>
                                <p className="text-xs text-emerald-600/80 mt-0.5">All registered students are present.</p>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-8 text-amber-500 bg-amber-50/40 border border-amber-100 rounded-2xl">
                                <AlertCircle className="w-8 h-8 mb-2" strokeWidth={1.5} />
                                <p className="font-black text-sm uppercase tracking-wide">Roll Call Not Marked Yet</p>
                                <p className="text-xs text-amber-600/80 mt-0.5">Record today's attendance in the module.</p>
                            </div>
                        )}
                    </div>
                    )}

                    {/* Present Staff Today */}
                    {canAttendance && canStaff && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-[#6b8cff] font-black text-sm uppercase tracking-wider">Today Present Staff</h3>
                            <button onClick={() => navigate("/attendance/employees")}
                                className="text-xs font-black text-[#5C67F2] hover:underline uppercase tracking-wider flex items-center gap-1">
                                Open Register <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                        </div>
                        {presentEmployees.length > 0 ? (
                            <div className="max-h-60 overflow-y-auto divide-y divide-gray-50 pr-2">
                                {presentEmployees.map((emp: any, i: number) => (
                                    <div key={emp.employee_id || i} className="py-3 flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center font-bold text-xs text-[#5C67F2] uppercase border border-indigo-100">
                                                {emp.employee_name?.substring(0, 2)}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-800">{emp.employee_name}</p>
                                                <p className="text-[10px] text-gray-500 font-semibold">{emp.role || emp.department || "Staff"}</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="bg-emerald-50 border border-emerald-200 text-emerald-600 text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">Present</span>
                                            {emp.attendance?.check_in && (
                                                <span className="text-[9px] font-mono font-bold text-slate-400 mt-1">In: {emp.attendance.check_in}</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : attendanceDashboard?.employees?.present > 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 text-emerald-600 bg-emerald-50/30 border border-emerald-100 rounded-2xl">
                                <CheckCircle2 className="w-8 h-8 mb-2" />
                                <p className="font-black text-sm uppercase tracking-wide">All staff marked present today!</p>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-8 text-amber-500 bg-amber-50/40 border border-amber-100 rounded-2xl">
                                <AlertCircle className="w-8 h-8 mb-2" strokeWidth={1.5} />
                                <p className="font-black text-sm uppercase tracking-wide">No Staff Roll Call Recorded</p>
                                <p className="text-xs text-amber-600/80 mt-0.5">Record employee attendance in the module.</p>
                            </div>
                        )}
                    </div>
                    )}

                    {/* Latest Admission */}
                    {canStudents && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-[#8b91db] font-black text-sm uppercase tracking-wider">Latest Student Admission</h3>
                            <button onClick={() => navigate("/students/new")}
                                className="text-xs font-black text-[#5C67F2] hover:underline uppercase tracking-wider flex items-center gap-1">
                                Admit Student <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                        </div>
                        {latestAdmission ? (
                            <div className="flex flex-col items-center py-4 text-center bg-slate-50/30 rounded-2xl border border-slate-100 max-w-sm mx-auto">
                                <div className="w-16 h-16 bg-indigo-50 rounded-full border-4 border-[#8b91db]/20 flex items-center justify-center mb-3 overflow-hidden shadow-inner">
                                    {latestAdmission.avatar
                                        ? <img src={latestAdmission.avatar} alt="" className="w-full h-full object-cover" />
                                        : <div className="text-xl font-black text-[#5C67F2] uppercase">{latestAdmission.studentName.substring(0, 2)}</div>
                                    }
                                </div>
                                <p className="text-[10px] font-mono font-bold text-indigo-400 mb-0.5">{latestAdmission.registrationNo}</p>
                                <p className="text-base font-black text-slate-800">{latestAdmission.studentName}</p>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{latestAdmission.studentClass}</p>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-8 bg-slate-50 rounded-2xl border border-slate-100">
                                <User className="w-8 h-8 text-slate-300 mb-2" />
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">No students admitted yet</p>
                                <button onClick={() => navigate("/students/new")}
                                    className="mt-3 text-[10px] font-black text-[#5C67F2] hover:underline uppercase tracking-wider">
                                    + Admit First Student
                                </button>
                            </div>
                        )}
                    </div>
                    )}
                </div>

                {/* Right Column */}
                <div className="space-y-6">

                    {/* Fee Collection Ring */}
                    {canFinance && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
                        <h3 className="text-slate-800 font-black text-sm uppercase tracking-wider mb-4">Fee Collection This Month</h3>
                        <div className="relative w-36 h-36 mx-auto mb-6 flex items-center justify-center">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle cx="72" cy="72" r="54" stroke="#f1f5f9" strokeWidth="12" fill="transparent" />
                                <circle cx="72" cy="72" r="54" stroke="#ff5e6c" strokeWidth="12" fill="transparent"
                                    strokeDasharray={2 * Math.PI * 54}
                                    strokeDashoffset={2 * Math.PI * 54 * (1 - feeEstimation.percent / 100)}
                                    strokeLinecap="round" />
                            </svg>
                            <div className="absolute flex flex-col items-center justify-center">
                                <span className="text-2xl font-black text-slate-800 tracking-tighter">{feeEstimation.percent}%</span>
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Collected</span>
                            </div>
                        </div>
                        <div className="flex justify-between border-t border-gray-100 pt-4">
                            <div className="text-left">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Collected</p>
                                <p className="font-black text-lg text-emerald-600">{fmt(Math.round(feeEstimation.collected))}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Expected</p>
                                <p className="font-black text-lg text-slate-800">
                                    {feeEstimation.totalEstimated > 0 ? fmt(Math.round(feeEstimation.totalEstimated)) : "—"}
                                </p>
                            </div>
                        </div>
                        {feeEstimation.totalEstimated === 0 && (
                            <p className="text-[10px] text-slate-400 mt-3">Set up fee structures to see expected collection.</p>
                        )}
                    </div>
                    )}

                    {/* Quick Stats — each row gated by its module */}
                    {(canAttendance || canFinance || canClasses) && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-100">
                        {canAttendance && (
                        <div className="p-4 flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-500">Today Present Students</span>
                            <span className="text-sm font-bold text-[#6b8cff]">
                                {attendanceDashboard ? `${attendancePercentages.studentPercent}%` : "—"}
                            </span>
                        </div>
                        )}
                        {canAttendance && canStaff && (
                        <div className="p-4 flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-500">Today Present Employees</span>
                            <span className="text-sm font-bold text-[#ff5e6c]">
                                {attendanceDashboard ? `${attendancePercentages.employeePercent}%` : "—"}
                            </span>
                        </div>
                        )}
                        {canFinance && (
                        <div className="p-4 flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-500">Fee Collection Rate</span>
                            <span className="text-sm font-bold text-[#5C67F2]">
                                {feeEstimation.totalEstimated > 0 ? `${feeEstimation.percent}%` : "—"}
                            </span>
                        </div>
                        )}
                        {canClasses && (
                        <div className="p-4 flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-500">Total Classes</span>
                            <span className="text-sm font-bold text-slate-700">{classes.length}</span>
                        </div>
                        )}
                    </div>
                    )}

                    {/* Calendar */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <div className="flex justify-between items-center mb-4">
                            <CalendarIcon className="w-4 h-4 text-[#5C67F2]" />
                            <div className="text-center">
                                <h3 className="text-[#ff5e6c] font-bold text-sm uppercase">
                                    {new Date().toLocaleString("default", { month: "long", year: "numeric" })}
                                </h3>
                                <p className="text-[10px] font-bold text-[#ff5e6c]/70">{new Date().toDateString()}</p>
                            </div>
                            <div className="w-4" />
                        </div>
                        <div className="grid grid-cols-7 gap-1 text-center mb-2">
                            {["SUN","MON","TUE","WED","THU","FRI","SAT"].map(d => (
                                <div key={d} className={`text-[9px] font-bold ${d === "SUN" || d === "SAT" ? "text-[#ff5e6c]" : "text-[#8b91db]"}`}>{d}</div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold">
                            {(() => {
                                const now = new Date();
                                const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).getDay();
                                const totalDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
                                const cells = [];
                                for (let i = 0; i < firstDay; i++) cells.push(<div key={`p${i}`} />);
                                for (let day = 1; day <= totalDays; day++) {
                                    const isToday = day === now.getDate();
                                    const isWeekend = (firstDay + day - 1) % 7 === 0 || (firstDay + day - 1) % 7 === 6;
                                    cells.push(
                                        <div key={day} className={`py-1 rounded-lg ${isToday ? "border border-[#ff5e6c] text-[#ff5e6c] bg-[#ff5e6c]/5 font-bold" : isWeekend ? "text-[#ff5e6c]/70" : "text-[#8b91db]"}`}>
                                            {day}
                                        </div>
                                    );
                                }
                                return cells;
                            })()}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
