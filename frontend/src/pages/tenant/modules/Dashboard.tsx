import { useState, useMemo } from "react";
import { RevenueModal, useRevenue } from "@/components/finance/RevenueList";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api from "@/lib/api";
import {
    User, Briefcase, DollarSign, ChevronLeft, ChevronRight,
    Calendar as CalendarIcon, CheckCircle2, AlertCircle, ArrowRight,
    BookOpen, TrendingUp, Inbox, ClipboardCheck, CalendarDays, ClipboardList
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { usePermissions } from "@/contexts/PermissionsContext";
import { reqApi, statusStyle } from "@/lib/requestsApi";

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

    const [selectedDate, setSelectedDate] = useState(() => new Date().toLocaleDateString("en-CA"));
    const [calendarView, setCalendarView] = useState<"month" | "week" | "day">("month");
    const [eventModalOpen, setEventModalOpen] = useState(false);
    const [editEvent, setEditEvent] = useState<any | null>(null);
    const [eventDraft, setEventDraft] = useState({
        title: "",
        description: "",
        category: "academic",
        eventDate: new Date().toLocaleDateString("en-CA"),
        startTime: "",
        endTime: "",
        venue: "",
        organizer: "",
        status: "approved",
    });
    const qc = useQueryClient();

    const formatDateValue = (value: Date) => value.toISOString().slice(0, 10);
    const parseDateValue = (value: string) => new Date(`${value}T00:00:00`);

    const getVisibleRange = (view: "month" | "week" | "day", value: string) => {
        const base = parseDateValue(value);
        if (view === "day") return { start: base, end: base };
        if (view === "week") {
            const day = base.getDay();
            const diff = day === 0 ? -6 : 1 - day;
            const start = new Date(base);
            start.setDate(base.getDate() + diff);
            const end = new Date(start);
            end.setDate(start.getDate() + 6);
            return { start, end };
        }
        const start = new Date(base.getFullYear(), base.getMonth(), 1);
        const end = new Date(base.getFullYear(), base.getMonth() + 1, 0);
        return { start, end };
    };

    const visibleRange = useMemo(() => getVisibleRange(calendarView, selectedDate), [calendarView, selectedDate]);

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

    const { data: calendarEvents = [] } = useQuery<any[]>({
        queryKey: ["dashboard_calendar_events", selectedDate, calendarView],
        enabled: true,
        queryFn: async () => {
            try {
                const r = await api.get("/calendar/events", {
                    params: {
                        start: formatDateValue(visibleRange.start),
                        end: formatDateValue(visibleRange.end),
                    },
                });
                return Array.isArray(r.data) ? r.data : [];
            } catch {
                return [];
            }
        },
    });

    const calendarEventsByDate = useMemo(() => {
        return (calendarEvents || []).reduce((acc: Record<string, any[]>, event: any) => {
            if (!event?.eventDate) return acc;
            acc[event.eventDate] = [...(acc[event.eventDate] || []), event];
            return acc;
        }, {});
    }, [calendarEvents]);

    const selectedDateEvents = useMemo(() => {
        return (calendarEventsByDate[selectedDate] || []).slice().sort((a: any, b: any) => (a.startTime || "").localeCompare(b.startTime || ""));
    }, [calendarEventsByDate, selectedDate]);

    const updateEvent = useMutation({
        mutationFn: async (payload: any) => {
            const r = await api.patch(`/calendar/events/${payload._id}`, payload);
            return r.data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["dashboard_calendar_events"] });
            qc.invalidateQueries({ queryKey: ["calendar-events"] });
            setEventModalOpen(false);
            setEditEvent(null);
            toast.success("Event saved");
        },
        onError: (e: any) => toast.error(e.response?.data?.message || "Could not save event"),
    });

    const createEvent = useMutation({
        mutationFn: async (payload: any) => {
            const r = await api.post("/calendar/events", payload);
            return r.data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["dashboard_calendar_events"] });
            qc.invalidateQueries({ queryKey: ["calendar-events"] });
            setEventModalOpen(false);
            setEditEvent(null);
            toast.success("Event created");
        },
        onError: (e: any) => toast.error(e.response?.data?.message || "Could not create event"),
    });

    const deleteEvent = useMutation({
        mutationFn: async (id: string) => {
            const r = await api.delete(`/calendar/events/${id}`);
            return r.data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["dashboard_calendar_events"] });
            qc.invalidateQueries({ queryKey: ["calendar-events"] });
            setEventModalOpen(false);
            setEditEvent(null);
            toast.success("Event deleted");
        },
        onError: (e: any) => toast.error(e.response?.data?.message || "Could not delete event"),
    });

    const openEditEvent = (event: any) => {
        setEditEvent(event);
        setEventDraft({
            title: event.title || "",
            description: event.description || "",
            category: event.category || "academic",
            eventDate: event.eventDate || selectedDate,
            startTime: event.startTime || "",
            endTime: event.endTime || "",
            venue: event.venue || "",
            organizer: event.organizer || "",
            status: event.status || "approved",
        });
        setEventModalOpen(true);
    };

    const openCreateEvent = () => {
        setEditEvent(null);
        setEventDraft({
            title: "",
            description: "",
            category: "academic",
            eventDate: selectedDate,
            startTime: "",
            endTime: "",
            venue: "",
            organizer: "",
            status: "approved",
        });
        setEventModalOpen(true);
    };

    const saveEvent = () => {
        if (editEvent && editEvent._id) {
            updateEvent.mutate({ ...eventDraft, _id: editEvent._id });
        } else {
            createEvent.mutate(eventDraft);
        }
    };

    const shiftSelectedDate = (delta: number) => {
        const next = parseDateValue(selectedDate);
        next.setDate(next.getDate() + delta);
        setSelectedDate(formatDateValue(next));
    };

    const changeMonthView = (delta: number) => {
        const next = parseDateValue(selectedDate);
        next.setMonth(next.getMonth() + delta);
        setSelectedDate(formatDateValue(next));
    };

    const canEditEvent = (event: any) => !event?.isSynced && !String(event._id || "").startsWith("sync-");

    const { data: attendanceDashboard } = useQuery<any>({
        queryKey: ["dashboard_attendance_summary", today],
        enabled: canAttendance,
        queryFn: async () => {
            try { const r = await api.get("/schools/default/attendance/dashboard"); return r.data?.data || null; } catch { return null; }
        },
    });

    // ── Approvals & Requests (admins + department heads) ────────────────────────
    // A department head is anyone granted the exams/employees modules; all the
    // underlying endpoints are already server-scoped to what the user may act on,
    // so non-approvers simply get empty lists and the section stays hidden.
    const isApprover = perms.isAdmin || can("exams") || can("employees");

    // Marks awaiting HOD/admin approval — teacher-submitted batches (exam × subject).
    // Scoped by the backend to the user's departments (admins see all).
    const canApproveMarks = can("exams") || perms.isAdmin;
    const { data: pendingMarks = [] } = useQuery<any[]>({
        queryKey: ["dashboard_pending_marks"],
        enabled: canApproveMarks,
        queryFn: async () => { try { const r = await api.get("/mark-approvals", { params: { status: "Submitted" } }); return Array.isArray(r.data) ? r.data : []; } catch { return []; } },
    });

    // Requisitions / purchase / clearance requests sitting in my inbox awaiting action.
    const { data: inboxRequests = [] } = useQuery<any[]>({
        queryKey: ["dashboard_req_inbox"],
        enabled: isApprover,
        queryFn: async () => { try { return await reqApi.inbox(); } catch { return []; } },
    });

    // Staff leave requests still awaiting a decision — reuses the TSC Leave
    // Management endpoint (staff_leave_requests) that admins approve/reject from /tsc/leave.
    const { data: pendingLeave = [] } = useQuery<any[]>({
        queryKey: ["dashboard_leave_requests"],
        enabled: isApprover,
        queryFn: async () => {
            try { const r = await api.get("/tsc/leave-requests", { params: { status: "pending" } }); return Array.isArray(r.data) ? r.data : []; } catch { return []; }
        },
    });

    const approvalsTotal = pendingMarks.length + inboxRequests.length + pendingLeave.length;

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

    // Money actually received this month (fee payments + other income), one row per receipt.
    const monthFrom = `${currentMonthStr}-01`;
    const monthTo = new Date().toISOString().slice(0, 10);
    const { data: monthRevenue } = useRevenue(monthFrom, monthTo);
    const [revenueOpen, setRevenueOpen] = useState(false);

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

        const revenue = monthRevenue ? monthRevenue.total : thisMonthIncome.reduce((acc, i) => acc + (parseFloat(i.amount) || 0), 0) + invoiceRevenue;
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
            return { key: mon.key, monthName: mon.name, income: monIncome + monPaidInv, expenses: monExpenses };
        });

        return { revenue, expenseTotal, profit, chart1Data };
    }, [income, expenses, invoices, currentMonthStr, monthRevenue]);

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

    const fmt = (n: number) => `KSh ${(Number(n) || 0).toLocaleString()}`;

    // ── Chart interactivity ─────────────────────────────────────────────────────
    // Hovered point/bar index + on-screen tooltip position. The SVGs use a fixed
    // 500×160 viewBox with non-uniform scaling, so we translate the datum's viewBox
    // x into a percentage of the container width for a pixel-accurate tooltip.
    const [finHover, setFinHover] = useState<number | null>(null);
    const [barHover, setBarHover] = useState<number | null>(null);
    const finChangePct = (cur: number, prev: number) =>
        prev > 0 ? Math.round(((cur - prev) / prev) * 100) : (cur > 0 ? 100 : 0);

    // Clicking the financial chart drills into that month's account statement;
    // clicking a class bar opens that class's student roster.
    const goToMonth = (key: string) => navigate(`/accounts/statement?month=${key}`);
    const goToClass = (className: string) => navigate(`/students?class=${encodeURIComponent(className)}`);

    return (
        <>
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
                {revenueOpen && <RevenueModal from={monthFrom} to={monthTo} title={`Revenue — ${new Date().toLocaleString("en-GB", { month: "long", year: "numeric" })}`} onClose={() => setRevenueOpen(false)} />}
                {canFinance && (
                <div onClick={() => setRevenueOpen(true)} title="See every payment received this month"
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

            {/* ── Approvals & Requests (admins + department heads) ───────────── */}
            {isApprover && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                            <ClipboardCheck className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-black text-slate-800 text-base leading-tight">Approvals &amp; Requests</h3>
                            <p className="text-xs text-slate-500">
                                {approvalsTotal > 0
                                    ? <>You have <b className="text-amber-600">{approvalsTotal}</b> item{approvalsTotal === 1 ? "" : "s"} needing your action</>
                                    : "Everything is up to date — nothing awaiting your approval"}
                            </p>
                        </div>
                    </div>
                    {approvalsTotal > 0 && (
                        <span className="text-lg font-black text-white bg-amber-500 rounded-full min-w-9 h-9 px-2 flex items-center justify-center">{approvalsTotal}</span>
                    )}
                </div>

                {approvalsTotal === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-emerald-600 bg-emerald-50/40 border border-emerald-100 rounded-2xl">
                        <CheckCircle2 className="w-8 h-8 mb-2" />
                        <p className="font-black text-sm uppercase tracking-wide">All caught up</p>
                        <p className="text-xs text-emerald-600/80 mt-0.5">No pending marks, requests or leave to review.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                        {/* Marks awaiting approval */}
                        {canApproveMarks && (
                        <div className={`rounded-2xl border p-4 flex flex-col ${pendingMarks.length ? "border-blue-100 bg-blue-50/30" : "border-slate-100 bg-slate-50/40"}`}>
                            <div className="flex items-center justify-between mb-3">
                                <span className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-blue-700">
                                    <ClipboardList className="w-4 h-4" /> Marks Submitted
                                </span>
                                <span className="text-sm font-black text-blue-700 bg-blue-100 rounded-full min-w-7 h-7 px-2 flex items-center justify-center">{pendingMarks.length}</span>
                            </div>
                            <div className="space-y-1.5 flex-1 max-h-40 overflow-y-auto pr-1">
                                {pendingMarks.length === 0 ? (
                                    <p className="text-xs text-slate-400 py-2">No marks awaiting approval.</p>
                                ) : pendingMarks.slice(0, 5).map((b: any) => (
                                    <div key={b._id} onClick={() => navigate(`/marks-approval/${b._id}`)} className="flex items-center justify-between border-b border-slate-100/70 py-1.5 cursor-pointer hover:bg-blue-50/50 rounded">
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-slate-700 truncate">{b.subject}</p>
                                            <p className="text-[11px] text-slate-400 truncate">{b.examName || ""}{b.submittedBy ? ` · ${b.submittedBy}` : ""} · {b.entries} entries</p>
                                        </div>
                                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 flex-shrink-0 ml-2">New</span>
                                    </div>
                                ))}
                                {pendingMarks.length > 5 && <p className="text-[11px] font-bold text-slate-400 pt-1">+{pendingMarks.length - 5} more</p>}
                            </div>
                            <button onClick={() => navigate("/marks-approval")} className="mt-3 text-xs font-black text-blue-700 hover:underline self-start flex items-center gap-1">
                                Review &amp; approve <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                        </div>
                        )}

                        {/* Requisitions / purchase / clearance inbox */}
                        <div className={`rounded-2xl border p-4 flex flex-col ${inboxRequests.length ? "border-indigo-100 bg-indigo-50/30" : "border-slate-100 bg-slate-50/40"}`}>
                            <div className="flex items-center justify-between mb-3">
                                <span className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-indigo-700">
                                    <Inbox className="w-4 h-4" /> New Requests
                                </span>
                                <span className="text-sm font-black text-indigo-700 bg-indigo-100 rounded-full min-w-7 h-7 px-2 flex items-center justify-center">{inboxRequests.length}</span>
                            </div>
                            <div className="space-y-1.5 flex-1 max-h-40 overflow-y-auto pr-1">
                                {inboxRequests.length === 0 ? (
                                    <p className="text-xs text-slate-400 py-2">No requests in your inbox.</p>
                                ) : inboxRequests.slice(0, 5).map((r: any) => (
                                    <button key={r._id} onClick={() => navigate(`/requests/${r._id}`)}
                                        className="w-full flex items-center justify-between border-b border-slate-100/70 py-1.5 text-left hover:bg-white/60 rounded-lg px-1 -mx-1">
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-slate-700 truncate">{r.title}</p>
                                            <p className="text-[11px] text-slate-400 truncate">{r.number} · {r.requesterName || r.department || "—"}</p>
                                        </div>
                                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full flex-shrink-0 ml-2"
                                            style={{ background: statusStyle(r.status).bg, color: statusStyle(r.status).fg }}>{r.status}</span>
                                    </button>
                                ))}
                                {inboxRequests.length > 5 && <p className="text-[11px] font-bold text-slate-400 pt-1">+{inboxRequests.length - 5} more</p>}
                            </div>
                            <button onClick={() => navigate("/requests/inbox")} className="mt-3 text-xs font-black text-indigo-700 hover:underline self-start flex items-center gap-1">
                                Open request inbox <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        {/* Staff leave requests pending decision */}
                        <div className={`rounded-2xl border p-4 flex flex-col ${pendingLeave.length ? "border-rose-100 bg-rose-50/30" : "border-slate-100 bg-slate-50/40"}`}>
                            <div className="flex items-center justify-between mb-3">
                                <span className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-rose-600">
                                    <CalendarDays className="w-4 h-4" /> Leave Requests
                                </span>
                                <span className="text-sm font-black text-rose-600 bg-rose-100 rounded-full min-w-7 h-7 px-2 flex items-center justify-center">{pendingLeave.length}</span>
                            </div>
                            <div className="space-y-1.5 flex-1 max-h-40 overflow-y-auto pr-1">
                                {pendingLeave.length === 0 ? (
                                    <p className="text-xs text-slate-400 py-2">No leave requests pending.</p>
                                ) : pendingLeave.slice(0, 5).map((l: any) => (
                                    <div key={l._id} className="flex items-center justify-between border-b border-slate-100/70 py-1.5">
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-slate-700 truncate">{l.staffName || l.employeeName || l.name || "Staff member"}</p>
                                            <p className="text-[11px] text-slate-400 truncate">{l.type || l.leaveType || "Leave"}{l.days ? ` · ${l.days} day${l.days === 1 ? "" : "s"}` : ""}</p>
                                        </div>
                                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-100 text-rose-600 flex-shrink-0 ml-2">{l.status === "HOD Approved" ? "HR" : "Pending"}</span>
                                    </div>
                                ))}
                                {pendingLeave.length > 5 && <p className="text-[11px] font-bold text-slate-400 pt-1">+{pendingLeave.length - 5} more</p>}
                            </div>
                            <button onClick={() => navigate("/tsc/leave")} className="mt-3 text-xs font-black text-rose-600 hover:underline self-start flex items-center gap-1">
                                Review leave <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
            )}

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
                                    <svg className="w-full h-full" viewBox="0 0 500 160" preserveAspectRatio="none"
                                        onMouseLeave={() => setFinHover(null)}>
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
                                        {/* Hover guide line on the active month */}
                                        {finHover !== null && finances.chart1Data[finHover] && (
                                            <line x1={getScaledX(finHover)} y1="20" x2={getScaledX(finHover)} y2="130" stroke="#94a3b8" strokeDasharray="4" strokeWidth="1" />
                                        )}
                                        {finances.chart1Data.map((d, idx) => {
                                            const active = finHover === idx;
                                            return (
                                                <g key={idx}>
                                                    <circle cx={getScaledX(idx)} cy={getScaledY(d.income)} r={active ? 6.5 : 4.5} fill="#6b8cff" stroke="#fff" strokeWidth="1.5" />
                                                    <circle cx={getScaledX(idx)} cy={getScaledY(d.expenses)} r={active ? 6.5 : 4.5} fill="#ff808b" stroke="#fff" strokeWidth="1.5" />
                                                    <text x={getScaledX(idx)} y="148" textAnchor="middle" fontSize="9" fill={active ? "#334155" : "#94a3b8"} fontWeight="bold">{d.monthName}</text>
                                                    {/* Invisible full-height hit column for easy hover/click */}
                                                    <rect x={getScaledX(idx) - 40} y="0" width="80" height="160" fill="transparent" style={{ cursor: "pointer" }}
                                                        onMouseEnter={() => setFinHover(idx)}
                                                        onClick={() => goToMonth(d.key)} />
                                                </g>
                                            );
                                        })}
                                    </svg>

                                    {/* Rich HTML tooltip anchored to the hovered month */}
                                    {finHover !== null && finances.chart1Data[finHover] && (() => {
                                        const d = finances.chart1Data[finHover];
                                        const prev = finHover > 0 ? finances.chart1Data[finHover - 1] : null;
                                        const net = d.income - d.expenses;
                                        const leftPct = (getScaledX(finHover) / 500) * 100;
                                        return (
                                            <div className="pointer-events-none absolute z-20 -translate-x-1/2 rounded-xl bg-slate-900/95 px-3 py-2 shadow-xl"
                                                style={{ left: `${leftPct}%`, top: 6, minWidth: 148 }}>
                                                <p className="text-[10px] font-black uppercase tracking-wider text-slate-300">{d.monthName}</p>
                                                <div className="mt-1 space-y-0.5">
                                                    <div className="flex items-center justify-between gap-4 text-[11px]">
                                                        <span className="flex items-center gap-1 text-slate-300"><span className="inline-block w-2 h-2 rounded-full bg-[#6b8cff]" />Income</span>
                                                        <span className="font-black text-white">{fmt(Math.round(d.income))}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between gap-4 text-[11px]">
                                                        <span className="flex items-center gap-1 text-slate-300"><span className="inline-block w-2 h-2 rounded-full bg-[#ff808b]" />Expenses</span>
                                                        <span className="font-black text-white">{fmt(Math.round(d.expenses))}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between gap-4 border-t border-white/10 pt-0.5 text-[11px]">
                                                        <span className="text-slate-300">Net</span>
                                                        <span className={`font-black ${net < 0 ? "text-rose-300" : "text-emerald-300"}`}>{net < 0 ? "-" : ""}{fmt(Math.abs(Math.round(net)))}</span>
                                                    </div>
                                                    {prev && (
                                                        <div className="flex items-center justify-between gap-4 text-[10px] text-slate-400">
                                                            <span>vs {prev.monthName}</span>
                                                            <span className={finChangePct(d.income, prev.income) < 0 ? "text-rose-300" : "text-emerald-300"}>
                                                                {finChangePct(d.income, prev.income) >= 0 ? "▲" : "▼"} {Math.abs(finChangePct(d.income, prev.income))}%
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                                <p className="mt-1 text-[9px] font-bold uppercase tracking-wide text-[#8b91db]">Click to open statement →</p>
                                            </div>
                                        );
                                    })()}
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
                                    <svg className="w-full h-full" viewBox="0 0 500 160" preserveAspectRatio="none"
                                        onMouseLeave={() => setBarHover(null)}>
                                        <defs>
                                            <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#8b91db" stopOpacity="0.95" />
                                                <stop offset="100%" stopColor="#6b8cff" stopOpacity="0.8" />
                                            </linearGradient>
                                            <linearGradient id="barGradActive" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#5C67F2" stopOpacity="1" />
                                                <stop offset="100%" stopColor="#4e4bb2" stopOpacity="0.95" />
                                            </linearGradient>
                                        </defs>
                                        <line x1="40" y1="30" x2="480" y2="30" stroke="#e2e8f0" strokeDasharray="3" />
                                        <line x1="40" y1="80" x2="480" y2="80" stroke="#e2e8f0" strokeDasharray="3" />
                                        <line x1="40" y1="130" x2="480" y2="130" stroke="#cbd5e1" strokeWidth="1.5" />
                                        {classChartData.map((d: any, idx: number) => {
                                            const w = 32;
                                            const x = 50 + idx * 80 - w / 2;
                                            const active = barHover === idx;
                                            return (
                                                <g key={idx} style={{ cursor: "pointer" }}
                                                    onMouseEnter={() => setBarHover(idx)}
                                                    onClick={() => goToClass(d.className)}>
                                                    {/* Invisible full-height hit area */}
                                                    <rect x={50 + idx * 80 - 40} y="0" width="80" height="160" fill="transparent" />
                                                    <rect x={x} y={getBarY(d.count)} width={w} height={getBarHeight(d.count)} rx="6"
                                                        fill={active ? "url(#barGradActive)" : "url(#barGrad)"} />
                                                    <text x={x + w / 2} y={getBarY(d.count) - 6} textAnchor="middle" fontSize={active ? "12" : "10"} fill={active ? "#5C67F2" : "#475569"} fontWeight="bold">{d.count}</text>
                                                    <text x={x + w / 2} y="148" textAnchor="middle" fontSize="8" fill={active ? "#334155" : "#94a3b8"} fontWeight="bold">{d.className.slice(0, 8)}</text>
                                                </g>
                                            );
                                        })}
                                    </svg>

                                    {/* Tooltip with full class name + share of enrolment */}
                                    {barHover !== null && classChartData[barHover] && (() => {
                                        const d: any = classChartData[barHover];
                                        const total = classChartData.reduce((a: number, c: any) => a + c.count, 0);
                                        const share = total > 0 ? Math.round((d.count / total) * 100) : 0;
                                        const leftPct = ((50 + barHover * 80) / 500) * 100;
                                        return (
                                            <div className="pointer-events-none absolute z-20 -translate-x-1/2 rounded-xl bg-slate-900/95 px-3 py-2 shadow-xl"
                                                style={{ left: `${leftPct}%`, top: 6, minWidth: 130 }}>
                                                <p className="text-[11px] font-black text-white">{d.className}</p>
                                                <div className="mt-1 flex items-center justify-between gap-4 text-[11px]">
                                                    <span className="text-slate-300">Students</span>
                                                    <span className="font-black text-white">{d.count}</span>
                                                </div>
                                                <div className="flex items-center justify-between gap-4 text-[11px]">
                                                    <span className="text-slate-300">Share</span>
                                                    <span className="font-black text-[#8b91db]">{share}%</span>
                                                </div>
                                                <p className="mt-1 text-[9px] font-bold uppercase tracking-wide text-[#8b91db]">Click to view roster →</p>
                                            </div>
                                        );
                                    })()}
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
                    <div onClick={() => navigate("/reports/fee-collection")}
                        className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center cursor-pointer hover:shadow-md hover:border-[#ff5e6c]/30 transition-all group">
                        <div className="flex items-center justify-center gap-2 mb-4">
                            <h3 className="text-slate-800 font-black text-sm uppercase tracking-wider">Fee Collection This Month</h3>
                            <ArrowRight className="w-3.5 h-3.5 text-slate-300 opacity-0 group-hover:opacity-100 group-hover:text-[#ff5e6c] transition-all" />
                        </div>
                        <div className="relative w-36 h-36 mx-auto mb-6 flex items-center justify-center">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle cx="72" cy="72" r="54" stroke="#f1f5f9" strokeWidth="12" fill="transparent" />
                                <circle cx="72" cy="72" r="54" stroke="#ff5e6c" strokeWidth="12" fill="transparent"
                                    strokeDasharray={2 * Math.PI * 54}
                                    strokeDashoffset={2 * Math.PI * 54 * (1 - feeEstimation.percent / 100)}
                                    strokeLinecap="round" className="transition-all duration-700 ease-out" />
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

                    {/* Quick Stats — each row gated by its module, clickable to its module */}
                    {(canAttendance || canFinance || canClasses) && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-100">
                        {canAttendance && (
                        <button onClick={() => navigate("/attendance/students")} className="w-full p-4 flex justify-between items-center text-left hover:bg-slate-50 transition-colors group">
                            <span className="text-sm font-medium text-gray-500 group-hover:text-slate-700">Today Present Students</span>
                            <span className="text-sm font-bold text-[#6b8cff] flex items-center gap-1">
                                {attendanceDashboard ? `${attendancePercentages.studentPercent}%` : "—"}
                                <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </span>
                        </button>
                        )}
                        {canAttendance && canStaff && (
                        <button onClick={() => navigate("/attendance/employees")} className="w-full p-4 flex justify-between items-center text-left hover:bg-slate-50 transition-colors group">
                            <span className="text-sm font-medium text-gray-500 group-hover:text-slate-700">Today Present Employees</span>
                            <span className="text-sm font-bold text-[#ff5e6c] flex items-center gap-1">
                                {attendanceDashboard ? `${attendancePercentages.employeePercent}%` : "—"}
                                <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </span>
                        </button>
                        )}
                        {canFinance && (
                        <button onClick={() => navigate("/reports/fee-collection")} className="w-full p-4 flex justify-between items-center text-left hover:bg-slate-50 transition-colors group">
                            <span className="text-sm font-medium text-gray-500 group-hover:text-slate-700">Fee Collection Rate</span>
                            <span className="text-sm font-bold text-[#5C67F2] flex items-center gap-1">
                                {feeEstimation.totalEstimated > 0 ? `${feeEstimation.percent}%` : "—"}
                                <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </span>
                        </button>
                        )}
                        {canClasses && (
                        <button onClick={() => navigate("/classes")} className="w-full p-4 flex justify-between items-center text-left hover:bg-slate-50 transition-colors group">
                            <span className="text-sm font-medium text-gray-500 group-hover:text-slate-700">Total Classes</span>
                            <span className="text-sm font-bold text-slate-700 flex items-center gap-1">
                                {classes.length}
                                <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </span>
                        </button>
                        )}
                    </div>
                    )}

                    {/* Calendar */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <CalendarIcon className="w-4 h-4 text-[#5C67F2]" />
                                <div className="text-left">
                                    <h3 className="text-[#ff5e6c] font-bold text-sm uppercase">School Calendar</h3>
                                    <p className="text-[10px] font-bold text-[#ff5e6c]/70">{parseDateValue(selectedDate).toDateString()}</p>
                                </div>
                            </div>
                            <button onClick={openCreateEvent} className="text-[11px] font-black text-[#5C67F2]">+ Add Event</button>
                        </div>

                        <div className="mb-3 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1">
                                <button onClick={() => changeMonthView(-1)} className="rounded-lg border border-slate-200 p-1.5">
                                    <ChevronLeft className="w-3.5 h-3.5 text-slate-600" />
                                </button>
                                <button onClick={() => changeMonthView(1)} className="rounded-lg border border-slate-200 p-1.5">
                                    <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                                </button>
                            </div>
                            <div className="text-sm font-black text-slate-700">
                                {parseDateValue(selectedDate).toLocaleString("default", { month: "long", year: "numeric" })}
                            </div>
                        </div>

                        <div className="grid grid-cols-7 gap-1 text-center mb-2">
                            {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((dayName) => (
                                <div key={dayName} className={`text-[9px] font-bold ${dayName === "SUN" || dayName === "SAT" ? "text-[#ff5e6c]" : "text-[#8b91db]"}`}>
                                    {dayName}
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold">
                            {(() => {
                                const base = parseDateValue(selectedDate);
                                const firstDay = new Date(base.getFullYear(), base.getMonth(), 1).getDay();
                                const totalDays = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
                                const cells: Array<{ date: string; inMonth: boolean }> = [];
                                for (let i = 0; i < firstDay; i++) {
                                    const d = new Date(base.getFullYear(), base.getMonth(), i - firstDay + 1);
                                    cells.push({ date: formatDateValue(d), inMonth: false });
                                }
                                for (let day = 1; day <= totalDays; day++) {
                                    const d = new Date(base.getFullYear(), base.getMonth(), day);
                                    cells.push({ date: formatDateValue(d), inMonth: true });
                                }
                                return cells.map((cell) => {
                                    const isToday = cell.date === new Date().toLocaleDateString("en-CA");
                                    const isSelected = cell.date === selectedDate;
                                    const dayEvents = calendarEventsByDate[cell.date] || [];
                                    return (
                                        <button
                                            key={cell.date}
                                            onClick={() => setSelectedDate(cell.date)}
                                            className={`min-h-16 rounded-lg border p-1 text-left ${cell.inMonth ? "border-slate-200" : "border-slate-100 bg-slate-50/70 text-slate-400"} ${isSelected ? "ring-2 ring-[#5C67F2]" : ""}`}
                                        >
                                            <div className={`text-[11px] font-black ${isToday ? "text-[#ff5e6c]" : "text-slate-700"}`}>{new Date(cell.date).getDate()}</div>
                                            <div className="mt-1 space-y-1">
                                                {dayEvents.slice(0, 2).map((event: any) => (
                                                    <div key={event._id} className="block w-full truncate rounded-md bg-[#5C67F2]/10 px-1.5 py-0.5 text-[9px] font-semibold text-[#5C67F2] text-left">
                                                        {event.title}
                                                    </div>
                                                ))}
                                                {dayEvents.length > 2 && <div className="text-[9px] font-semibold text-slate-500">+{dayEvents.length - 2} more</div>}
                                            </div>
                                        </button>
                                    );
                                });
                            })()}
                        </div>

                        <div className="mt-4 space-y-3">
                            {selectedDateEvents.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">No events for this day.</div>
                            ) : selectedDateEvents.map((event: any) => (
                                <div key={event._id} className="rounded-2xl border border-slate-100 p-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <div className="text-sm font-black text-slate-800">{event.title}</div>
                                            <div className="text-[11px] text-slate-500">{event.startTime || "All day"}{event.endTime ? ` - ${event.endTime}` : ""}</div>
                                        </div>
                                        {canEditEvent(event) && (
                                            <button onClick={() => openEditEvent(event)} className="text-[11px] font-semibold text-[#5C67F2]">Edit</button>
                                        )}
                                    </div>
                                    {event.description && <p className="mt-2 text-xs text-slate-500">{event.description}</p>}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {eventModalOpen && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/70 p-4">
                <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl">
                    <div className="mb-4 flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-black text-slate-900">{editEvent ? "Edit event" : "Add event"}</h3>
                            <p className="text-sm text-slate-500">Keep the dashboard calendar in sync with school activities.</p>
                        </div>
                        <button onClick={() => setEventModalOpen(false)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600">Close</button>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                        <div className="md:col-span-2">
                            <label className="mb-1 block text-sm font-semibold text-slate-700">Title</label>
                            <input value={eventDraft.title} onChange={(e) => setEventDraft({ ...eventDraft, title: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="mb-1 block text-sm font-semibold text-slate-700">Description</label>
                            <textarea value={eventDraft.description} onChange={(e) => setEventDraft({ ...eventDraft, description: e.target.value })} rows={3} className="w-full rounded-xl border border-slate-200 px-3 py-2" />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-semibold text-slate-700">Category</label>
                            <select value={eventDraft.category} onChange={(e) => setEventDraft({ ...eventDraft, category: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2">
                                {['academic','examinations','sports','meetings','fees','transport','hostel','library','medical','public_holiday','school_holiday','administration','other'].map(option => <option key={option} value={option}>{option}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-semibold text-slate-700">Date</label>
                            <input type="date" value={eventDraft.eventDate} onChange={(e) => setEventDraft({ ...eventDraft, eventDate: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2" />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-semibold text-slate-700">Start time</label>
                            <input type="time" value={eventDraft.startTime} onChange={(e) => setEventDraft({ ...eventDraft, startTime: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2" />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-semibold text-slate-700">End time</label>
                            <input type="time" value={eventDraft.endTime} onChange={(e) => setEventDraft({ ...eventDraft, endTime: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2" />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-semibold text-slate-700">Venue</label>
                            <input value={eventDraft.venue} onChange={(e) => setEventDraft({ ...eventDraft, venue: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2" />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-semibold text-slate-700">Organizer</label>
                            <input value={eventDraft.organizer} onChange={(e) => setEventDraft({ ...eventDraft, organizer: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2" />
                        </div>
                    </div>
                    <div className="mt-5 flex items-center justify-between gap-3">
                        <div>
                            {editEvent && canEditEvent(editEvent) && (
                                <button onClick={() => deleteEvent.mutate(editEvent._id)} className="rounded-xl border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-600">Delete</button>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => setEventModalOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600">Cancel</button>
                            <button onClick={saveEvent} className="rounded-xl bg-[#5C67F2] px-4 py-2 text-sm font-semibold text-white">Save</button>
                        </div>
                    </div>
                </div>
            </div>
        )}
        </>
    );
}
