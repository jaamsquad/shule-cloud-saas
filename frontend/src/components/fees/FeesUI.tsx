import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Home, ChevronRight, Loader2, Search, X, Check, type LucideIcon } from "lucide-react";
import api from "@/lib/api";

/**
 * Shared look for every page in the Fees area: one header, one sub-navigation,
 * and the same cards, stats, tables, badges, buttons and form fields, so the
 * fee pages read as one product.
 */

// ── Money ────────────────────────────────────────────────────────────────────
export const money = (n: unknown, opts: { decimals?: boolean } = {}) => {
    const v = Number(n) || 0;
    return `KSh ${v.toLocaleString(undefined, { minimumFractionDigits: opts.decimals ? 2 : 0, maximumFractionDigits: opts.decimals ? 2 : 0 })}`;
};
export const fmtDate = (d: unknown) => {
    if (!d) return "—";
    const x = new Date(String(d));
    return isNaN(+x) ? String(d) : x.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
};

// ── Sub-navigation ───────────────────────────────────────────────────────────
export const FEES_NAV: { group: string; items: { label: string; path: string }[] }[] = [
    { group: "Overview", items: [{ label: "Dashboard", path: "/fees/dashboard" }] },
    { group: "Billing", items: [
        { label: "Generate Invoices", path: "/fees/generate-invoice" },
        { label: "Per Student", path: "/fees/generate-student-invoice" },
        { label: "Invoices", path: "/fees/invoices" },
    ] },
    { group: "Collections", items: [
        { label: "Collect Fees", path: "/fees/collect" },
        { label: "Receipts", path: "/fees/paid-slip" },
        { label: "Credits", path: "/fees/credits" },
    ] },
    { group: "Students", items: [
        { label: "Ledger", path: "/fees/ledger" },
        { label: "Defaulters", path: "/fees/defaulters" },
        { label: "Scholarships", path: "/fees/scholarships" },
        { label: "Sponsors", path: "/fees/sponsors" },
    ] },
    { group: "Reports", items: [
        { label: "Fees Report", path: "/fees/report" },
        { label: "Audit Log", path: "/fees/audit-log" },
    ] },
    { group: "Setup", items: [
        { label: "Fee Structure", path: "/settings/fees-structure" },
        { label: "Fee Particulars", path: "/settings/fees-particulars" },
        { label: "Settings", path: "/fees/settings" },
        { label: "Delete Fees", path: "/fees/delete" },
    ] },
];

export function FeesNav() {
    const { pathname } = useLocation();
    const ref = useRef<HTMLDivElement>(null);
    // Keep the active tab in view on narrow screens: centre it by scrolling the strip only (scrollIntoView would also slide the page sideways)
    useEffect(() => {
        const strip = ref.current;
        const tab = strip?.querySelector<HTMLElement>("[data-active=true]");
        if (strip && tab) strip.scrollLeft = tab.offsetLeft - (strip.clientWidth - tab.offsetWidth) / 2;
    }, [pathname]);
    return (
        <div ref={ref} className="relative flex items-stretch gap-1 overflow-x-auto pb-1 -mx-1 px-1 print:hidden" style={{ scrollbarWidth: "thin" }}>
            {FEES_NAV.map((g, gi) => (
                <div key={g.group} className="flex items-center gap-1 shrink-0">
                    {gi > 0 && <span className="w-px h-5 bg-slate-200 mx-1.5" />}
                    {g.items.map(it => {
                        const active = pathname === it.path || (it.path !== "/fees/dashboard" && pathname.startsWith(it.path + "/"));
                        return (
                            <Link
                                key={it.path}
                                to={it.path}
                                data-active={active}
                                className={`h-8 px-3 inline-flex items-center rounded-lg text-[12.5px] font-semibold whitespace-nowrap transition-colors ${
                                    active ? "bg-[#5C67F2] text-white shadow-sm shadow-indigo-200" : "text-slate-500 hover:text-slate-800 hover:bg-white"
                                }`}
                            >
                                {it.label}
                            </Link>
                        );
                    })}
                </div>
            ))}
        </div>
    );
}

// ── Page shell ───────────────────────────────────────────────────────────────
export function FeesPage({ title, subtitle, icon: Icon, actions, children, wide }: {
    title: string; subtitle?: string; icon?: LucideIcon; actions?: ReactNode; children: ReactNode; wide?: boolean;
}) {
    return (
        <div className="flex-1 min-h-screen bg-[#F8FAFC] pb-16">
            <div className="bg-white/80 backdrop-blur border-b border-slate-100 sticky top-0 z-20 print:hidden">
                <div className={`${wide ? "max-w-[1400px]" : "max-w-7xl"} mx-auto px-4 sm:px-6 pt-3 pb-2 space-y-2`}>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold">
                        <Home className="w-3.5 h-3.5 text-[#5C67F2]" />
                        <ChevronRight className="w-3 h-3" />
                        <Link to="/fees/dashboard" className="hover:text-slate-600">Fees</Link>
                        <ChevronRight className="w-3 h-3" />
                        <span className="text-slate-700">{title}</span>
                    </div>
                    <FeesNav />
                </div>
            </div>
            <div className={`${wide ? "max-w-[1400px]" : "max-w-7xl"} mx-auto px-4 sm:px-6 pt-6`}>
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
                    <div className="flex items-center gap-3 min-w-0">
                        {Icon && (
                            <div className="w-11 h-11 shrink-0 rounded-xl bg-[#5C67F2]/10 text-[#5C67F2] flex items-center justify-center">
                                <Icon className="w-5 h-5" />
                            </div>
                        )}
                        <div className="min-w-0">
                            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">{title}</h1>
                            {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
                        </div>
                    </div>
                    {actions && <div className="flex flex-wrap items-center gap-2 print:hidden">{actions}</div>}
                </div>
                {children}
            </div>
        </div>
    );
}

// ── Building blocks ──────────────────────────────────────────────────────────
export function FCard({ title, subtitle, icon: Icon, actions, children, className = "", bodyClassName = "p-5" }: {
    title?: ReactNode; subtitle?: ReactNode; icon?: LucideIcon; actions?: ReactNode; children: ReactNode; className?: string; bodyClassName?: string;
}) {
    return (
        <section className={`bg-white rounded-2xl border border-slate-100 shadow-[0_1px_3px_rgba(15,23,42,0.05)] ${className}`}>
            {(title || actions) && (
                <header className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-100">
                    <div className="flex items-center gap-2 min-w-0">
                        {Icon && <Icon className="w-4 h-4 text-[#5C67F2] shrink-0" />}
                        <div className="min-w-0">
                            {title && <h3 className="text-sm font-bold text-slate-800 truncate">{title}</h3>}
                            {subtitle && <p className="text-xs text-slate-400 truncate">{subtitle}</p>}
                        </div>
                    </div>
                    {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
                </header>
            )}
            <div className={bodyClassName}>{children}</div>
        </section>
    );
}

const TONES = {
    indigo: { bg: "bg-indigo-50", fg: "text-[#5C67F2]", ring: "border-indigo-100" },
    emerald: { bg: "bg-emerald-50", fg: "text-emerald-600", ring: "border-emerald-100" },
    rose: { bg: "bg-rose-50", fg: "text-rose-600", ring: "border-rose-100" },
    amber: { bg: "bg-amber-50", fg: "text-amber-600", ring: "border-amber-100" },
    sky: { bg: "bg-sky-50", fg: "text-sky-600", ring: "border-sky-100" },
    slate: { bg: "bg-slate-100", fg: "text-slate-600", ring: "border-slate-200" },
    violet: { bg: "bg-violet-50", fg: "text-violet-600", ring: "border-violet-100" },
} as const;
export type Tone = keyof typeof TONES;

export function FStat({ label, value, hint, icon: Icon, tone = "indigo", loading }: {
    label: string; value: ReactNode; hint?: ReactNode; icon?: LucideIcon; tone?: Tone; loading?: boolean;
}) {
    const t = TONES[tone];
    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_1px_3px_rgba(15,23,42,0.05)] p-4 flex items-start gap-3">
            {Icon && <div className={`w-10 h-10 rounded-xl ${t.bg} ${t.fg} flex items-center justify-center shrink-0`}><Icon className="w-5 h-5" /></div>}
            <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
                <p className="text-xl font-extrabold text-slate-900 truncate">{loading ? <Loader2 className="w-5 h-5 animate-spin text-slate-300" /> : value}</p>
                {hint && <p className="text-xs text-slate-400 mt-0.5">{hint}</p>}
            </div>
        </div>
    );
}

export function FBadge({ tone = "slate", children }: { tone?: Tone; children: ReactNode }) {
    const t = TONES[tone];
    return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border ${t.bg} ${t.fg} ${t.ring} text-[11px] font-bold whitespace-nowrap`}>{children}</span>;
}

/** Badge colour for invoice/payment status words. */
export const statusTone = (s: string): Tone => {
    const v = String(s || "").toUpperCase();
    if (["PAID", "ACTIVE", "COMPLETED", "CONFIRMED", "SENT"].includes(v)) return "emerald";
    if (["PARTIAL", "PENDING", "SUSPENDED", "QUEUED"].includes(v)) return "amber";
    if (["OVERDUE", "FAILED", "VOIDED", "REVERSED"].includes(v)) return "rose";
    if (["WAIVED", "ENDED"].includes(v)) return "slate";
    return "sky";
};

type BtnVariant = "primary" | "secondary" | "danger" | "ghost" | "success";
const BTN: Record<BtnVariant, string> = {
    primary: "bg-[#5C67F2] hover:bg-[#4b55e0] text-white shadow-sm shadow-indigo-200",
    secondary: "bg-white hover:bg-slate-50 text-slate-700 border border-slate-200",
    danger: "bg-rose-600 hover:bg-rose-700 text-white",
    ghost: "text-slate-600 hover:bg-slate-100",
    success: "bg-emerald-600 hover:bg-emerald-700 text-white",
};
export function FButton({ variant = "primary", icon: Icon, loading, children, className = "", size = "md", ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: BtnVariant; icon?: LucideIcon; loading?: boolean; size?: "sm" | "md";
}) {
    return (
        <button
            {...p}
            disabled={p.disabled || loading}
            className={`${size === "sm" ? "h-8 px-3 text-xs" : "h-10 px-4 text-sm"} inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${BTN[variant]} ${className}`}
        >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : Icon ? <Icon className={size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"} /> : null}
            {children}
        </button>
    );
}

export function FField({ label, hint, required, children, className = "" }: { label: string; hint?: ReactNode; required?: boolean; children: ReactNode; className?: string }) {
    return (
        <label className={`block ${className}`}>
            <span className="block text-xs font-semibold text-slate-600 mb-1.5">{label}{required && <span className="text-rose-500"> *</span>}</span>
            {children}
            {hint && <span className="block text-[11px] text-slate-400 mt-1">{hint}</span>}
        </label>
    );
}

export const inputCls = "w-full h-10 px-3 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#5C67F2]/25 focus:border-[#5C67F2] disabled:bg-slate-50";
export const FInput = (p: React.InputHTMLAttributes<HTMLInputElement>) => <input {...p} className={`${inputCls} ${p.className || ""}`} />;
export const FSelect = (p: React.SelectHTMLAttributes<HTMLSelectElement>) => <select {...p} className={`${inputCls} ${p.className || ""}`} />;
export const FTextarea = (p: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
    <textarea {...p} className={`${inputCls} h-auto py-2.5 min-h-[88px] ${p.className || ""}`} />
);

export function FEmpty({ icon: Icon, title, hint, action }: { icon?: LucideIcon; title: string; hint?: ReactNode; action?: ReactNode }) {
    return (
        <div className="text-center py-12 px-6">
            {Icon && <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3"><Icon className="w-6 h-6" /></div>}
            <p className="text-sm font-bold text-slate-700">{title}</p>
            {hint && <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">{hint}</p>}
            {action && <div className="mt-4 flex justify-center">{action}</div>}
        </div>
    );
}

export function FLoading({ label = "Loading…" }: { label?: string }) {
    return <div className="py-12 flex items-center justify-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin text-[#5C67F2]" />{label}</div>;
}

/** Table with consistent head/row styling. Pass <tr>s as children. */
export function FTable({ head, children, empty }: { head: ReactNode[]; children: ReactNode; empty?: ReactNode }) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="bg-slate-50/80 text-left">
                        {head.map((h, i) => <th key={i} className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">{h}</th>)}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 [&>tr:hover]:bg-slate-50/60">{children}</tbody>
            </table>
            {empty}
        </div>
    );
}
export const td = "px-4 py-3 align-middle text-slate-700";

export function FModal({ open, title, subtitle, onClose, children, footer, width = "max-w-lg" }: {
    open: boolean; title: ReactNode; subtitle?: ReactNode; onClose: () => void; children: ReactNode; footer?: ReactNode; width?: string;
}) {
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, onClose]);
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-[200] bg-slate-900/50 backdrop-blur-[2px] flex items-end sm:items-center justify-center p-0 sm:p-4" onMouseDown={onClose}>
            <div className={`bg-white w-full ${width} rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92vh] flex flex-col`} onMouseDown={e => e.stopPropagation()}>
                <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-100">
                    <div>
                        <h3 className="text-base font-bold text-slate-900">{title}</h3>
                        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center"><X className="w-4 h-4" /></button>
                </div>
                <div className="p-5 overflow-y-auto">{children}</div>
                {footer && <div className="px-5 py-3.5 border-t border-slate-100 flex justify-end gap-2">{footer}</div>}
            </div>
        </div>
    );
}

export function FTabs<T extends string>({ value, onChange, tabs }: { value: T; onChange: (v: T) => void; tabs: { value: T; label: string; count?: number }[] }) {
    return (
        <div className="inline-flex p-1 bg-slate-100 rounded-xl gap-1">
            {tabs.map(t => (
                <button
                    key={t.value}
                    onClick={() => onChange(t.value)}
                    className={`h-8 px-3.5 rounded-lg text-[13px] font-semibold transition-colors ${value === t.value ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                >
                    {t.label}{t.count !== undefined && <span className="ml-1.5 text-[11px] text-slate-400">{t.count}</span>}
                </button>
            ))}
        </div>
    );
}

// ── Student picker ───────────────────────────────────────────────────────────
export interface PickedStudent { _id: string; name: string; reg: string; cls: string }
const toPicked = (s: any): PickedStudent => ({
    _id: String(s._id),
    name: s.studentName || `${s.firstName || ""} ${s.lastName || ""}`.trim() || "Student",
    reg: s.registrationNo || s.admNo || s.studentId || "",
    cls: s.studentClass || s.currentClass || s.className || "",
});

/** Search-as-you-type student picker. Multi-select shows chips. */
export function StudentPicker({ value, onChange, multiple = false, placeholder = "Search by name or admission no…" }: {
    value: PickedStudent[]; onChange: (v: PickedStudent[]) => void; multiple?: boolean; placeholder?: string;
}) {
    const [q, setQ] = useState("");
    const [open, setOpen] = useState(false);
    const { data = [], isFetching } = useQuery({
        queryKey: ["fees_student_picker", q],
        queryFn: async () => {
            const r = await api.get(`/students?search=${encodeURIComponent(q)}`);
            return (Array.isArray(r.data) ? r.data : r.data?.data || []).slice(0, 12).map(toPicked);
        },
        enabled: q.trim().length >= 2,
    });
    const chosen = useMemo(() => new Set(value.map(v => v._id)), [value]);
    const pick = (s: PickedStudent) => {
        if (multiple) onChange(chosen.has(s._id) ? value.filter(v => v._id !== s._id) : [...value, s]);
        else { onChange([s]); setOpen(false); setQ(""); }
    };
    return (
        <div className="relative">
            {multiple && value.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                    {value.map(v => (
                        <span key={v._id} className="inline-flex items-center gap-1 pl-2.5 pr-1 h-7 rounded-lg bg-indigo-50 text-[#5C67F2] text-xs font-semibold">
                            {v.name}
                            <button type="button" onClick={() => onChange(value.filter(x => x._id !== v._id))} className="w-5 h-5 rounded hover:bg-indigo-100 flex items-center justify-center"><X className="w-3 h-3" /></button>
                        </span>
                    ))}
                </div>
            )}
            {!multiple && value[0] ? (
                <div className="flex items-center justify-between h-10 px-3 rounded-xl border border-slate-200 bg-slate-50">
                    <span className="text-sm font-semibold text-slate-800 truncate">{value[0].name} <span className="text-slate-400 font-normal">· {value[0].reg} · {value[0].cls}</span></span>
                    <button type="button" onClick={() => onChange([])} className="text-slate-400 hover:text-rose-500"><X className="w-4 h-4" /></button>
                </div>
            ) : (
                <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                        value={q}
                        onChange={e => { setQ(e.target.value); setOpen(true); }}
                        onFocus={() => setOpen(true)}
                        onBlur={() => setTimeout(() => setOpen(false), 150)}
                        placeholder={placeholder}
                        className={`${inputCls} pl-9`}
                    />
                    {isFetching && <Loader2 className="w-4 h-4 animate-spin text-slate-300 absolute right-3 top-1/2 -translate-y-1/2" />}
                </div>
            )}
            {open && q.trim().length >= 2 && (
                <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-64 overflow-y-auto">
                    {data.length === 0 && !isFetching && <p className="px-3 py-3 text-sm text-slate-400">No students match “{q}”.</p>}
                    {data.map((s: PickedStudent) => (
                        <button type="button" key={s._id} onMouseDown={e => e.preventDefault()} onClick={() => pick(s)}
                            className="w-full text-left px-3 py-2.5 hover:bg-slate-50 flex items-center justify-between gap-2 border-b border-slate-50 last:border-0">
                            <span className="min-w-0">
                                <span className="block text-sm font-semibold text-slate-800 truncate">{s.name}</span>
                                <span className="block text-xs text-slate-400">{s.reg} · {s.cls}</span>
                            </span>
                            {chosen.has(s._id) && <Check className="w-4 h-4 text-[#5C67F2]" />}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
