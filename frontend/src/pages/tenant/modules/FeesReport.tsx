import { useState } from "react";
import {
    Home, Download, Landmark, TrendingUp,
    ChevronRight, ArrowLeft, Search, Loader2, Sparkles
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { API_ORIGIN } from "@/lib/config";
import { toast } from "sonner";

// ── Safe value helpers — guarantee no field access ever throws ────────────────
const num = (v: any): number => {
    const n = typeof v === "number" ? v : parseFloat(v);
    return Number.isFinite(n) ? n : 0;
};
const ksh = (v: any) => `KSh ${num(v).toLocaleString()}`;
const str = (v: any, fallback = ""): string => (v === null || v === undefined ? fallback : String(v));
const arr = <T,>(v: any): T[] => (Array.isArray(v) ? v : []);
const clampPct = (v: any) => Math.max(0, Math.min(100, num(v)));

export default function FeesReport() {
    const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
    const [selectedClassName, setSelectedClassName] = useState<string>("");
    const [classSearchQuery, setClassSearchQuery] = useState("");

    // Main report data — tolerant of any error/shape (never throws, never crashes).
    const { data: reportRes, isLoading: loadingReport } = useQuery({
        queryKey: ["fees_report_data"],
        retry: false,
        queryFn: async () => {
            try { return (await api.get("/schools/default/fees/report")).data; }
            catch { return null; }
        }
    });

    const raw = reportRes?.data ?? reportRes ?? {};
    const k = raw.kpis ?? {};
    const kpis = {
        total_invoiced: num(k.total_invoiced),
        total_collected: num(k.total_collected),
        outstanding: num(k.outstanding),
        collection_rate_percent: clampPct(k.collection_rate_percent),
        overdue_count: num(k.overdue_count),
    };
    const trendData = arr<any>(raw.monthly_trend).map((d: any) => ({
        month: str(d?.month),
        invoiced: num(d?.invoiced),
        collected: num(d?.collected),
    }));
    const methodBreakdown = arr<any>(raw.method_breakdown).map((m: any) => ({
        method: str(m?.method, "—"),
        percent: clampPct(m?.percent),
        amount: num(m?.amount),
    }));
    const classBreakdown = arr<any>(raw.class_breakdown).map((c: any) => ({
        class_name: str(c?.class_name, "Unassigned"),
        student_count: num(c?.student_count),
        total_invoiced: num(c?.total_invoiced),
        collected: num(c?.collected),
        outstanding: num(c?.outstanding),
        collection_percent: clampPct(c?.collection_percent),
    }));

    // Class drill-down — also fully tolerant.
    const { data: drillDownRes, isLoading: loadingDrillDown } = useQuery({
        queryKey: ["fees_report_class", selectedClassId],
        enabled: !!selectedClassId,
        retry: false,
        queryFn: async () => {
            if (!selectedClassId) return [];
            try {
                const r = await api.get(`/schools/default/fees/report/class/${encodeURIComponent(selectedClassId)}`);
                return Array.isArray(r.data) ? r.data : (r.data?.data ?? []);
            } catch { return []; }
        }
    });

    const drillDownData = arr<any>(drillDownRes).map((d: any) => ({
        admission_no: str(d?.admission_no),
        student_name: str(d?.student_name, "—"),
        total_invoiced: num(d?.total_invoiced),
        total_paid: num(d?.total_paid),
        outstanding: num(d?.outstanding),
        collection_percent: clampPct(d?.collection_percent),
        status: str(d?.status, "PENDING").toUpperCase(),
    }));

    const handleExport = () => {
        try {
            toast.info("Preparing PDF report for download...");
            window.open(`${API_ORIGIN}/api/v1/schools/default/fees/report/export`, "_blank");
        } catch {
            toast.error("Export failed");
        }
    };

    // SVG chart geometry — all inputs are guaranteed-finite numbers.
    const chartHeight = 180;
    const chartWidth = 500;
    const padding = 30;
    const maxVal = trendData.length > 0
        ? Math.max(1, ...trendData.map((d) => Math.max(d.invoiced, d.collected))) * 1.1
        : 100;
    const getX = (index: number) =>
        trendData.length <= 1 ? chartWidth / 2 : padding + (index * (chartWidth - padding * 2)) / (trendData.length - 1);
    const getY = (val: number) => chartHeight - padding - (num(val) * (chartHeight - padding * 2)) / (maxVal || 1);
    const ring = 2 * Math.PI * 22;

    return (
        <div className="flex-1 bg-[#F8FAFC] min-h-screen flex flex-col pb-20 font-sans">
            {/* Breadcrumb */}
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-2 text-sm">
                    <Home className="w-4 h-4 text-[#5C67F2]" />
                    <span className="text-gray-300">/</span>
                    <span className="font-bold text-gray-600">Fees</span>
                    <span className="text-gray-300">/</span>
                    <span className="font-black text-[#5C67F2]">Fees Report</span>
                </div>
                <button
                    onClick={handleExport}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-100 transition-all active:scale-95"
                >
                    <Download className="w-3.5 h-3.5" />
                    Export PDF
                </button>
            </div>

            <div className="flex-1 max-w-6xl mx-auto w-full px-6 pt-10">

                {/* Header title */}
                <div className="mb-10">
                    <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                        Financial Audit &amp; Analysis <Sparkles className="w-6 h-6 text-indigo-500" />
                    </h1>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-1">Live fee collections, class performance indices, and payment channel audit</p>
                </div>

                {loadingReport && !selectedClassId ? (
                    <div className="flex items-center justify-center py-32 gap-3 text-slate-400 font-black uppercase text-xs tracking-widest">
                        <Loader2 className="w-5 h-5 animate-spin text-[#5C67F2]" /> Loading financial report…
                    </div>
                ) : !selectedClassId ? (
                    <>
                        {/* KPIs Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
                            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 inset-x-0 h-1.5 bg-[#5C67F2]" />
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Invoiced</p>
                                <h3 className="text-2xl font-black text-slate-800 mt-2">{ksh(kpis.total_invoiced)}</h3>
                                <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Active Academic Term</p>
                            </div>

                            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 inset-x-0 h-1.5 bg-emerald-500" />
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Collected</p>
                                <h3 className="text-2xl font-black text-emerald-600 mt-2">{ksh(kpis.total_collected)}</h3>
                                <p className="text-[9px] text-emerald-400 font-bold uppercase mt-1">Received &amp; Cleared</p>
                            </div>

                            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 inset-x-0 h-1.5 bg-rose-500" />
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Outstanding Balance</p>
                                <h3 className="text-2xl font-black text-rose-600 mt-2">{ksh(kpis.outstanding)}</h3>
                                <p className="text-[9px] text-rose-400 font-bold uppercase mt-1">Pending Invoices</p>
                            </div>

                            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden flex items-center justify-between">
                                <div className="absolute top-0 inset-x-0 h-1.5 bg-indigo-500" />
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Collection Rate</p>
                                    <h3 className="text-2xl font-black text-indigo-600 mt-2">{kpis.collection_rate_percent}%</h3>
                                    <p className="text-[9px] text-indigo-400 font-bold uppercase mt-1">{kpis.overdue_count} Overdue Invoices</p>
                                </div>
                                <div className="relative w-14 h-14 flex items-center justify-center">
                                    <svg className="w-full h-full transform -rotate-90">
                                        <circle cx="28" cy="28" r="22" stroke="#e2e8f0" strokeWidth="4.5" fill="transparent" />
                                        <circle cx="28" cy="28" r="22" stroke="#5C67F2" strokeWidth="4.5" fill="transparent"
                                            strokeDasharray={`${ring}`}
                                            strokeDashoffset={`${ring * (1 - kpis.collection_rate_percent / 100)}`}
                                            strokeLinecap="round"
                                        />
                                    </svg>
                                    <span className="absolute text-[9px] font-black text-slate-700">{kpis.collection_rate_percent}%</span>
                                </div>
                            </div>
                        </div>

                        {/* Chart & Channel Breakdown */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
                            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm md:col-span-2 relative">
                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-6 flex items-center gap-2">
                                    Collection Trend Line <TrendingUp className="w-4 h-4 text-indigo-500" />
                                </h3>

                                {trendData.length === 0 ? (
                                    <div className="h-[180px] flex items-center justify-center text-slate-400 text-xs font-bold uppercase tracking-wider">No trend data yet</div>
                                ) : (
                                    <div className="w-full overflow-hidden">
                                        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto overflow-visible">
                                            <line x1={padding} y1={getY(0)} x2={chartWidth - padding} y2={getY(0)} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4" />
                                            <line x1={padding} y1={getY(maxVal / 2)} x2={chartWidth - padding} y2={getY(maxVal / 2)} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4" />
                                            <line x1={padding} y1={getY(maxVal)} x2={chartWidth - padding} y2={getY(maxVal)} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4" />

                                            {trendData.length > 1 && (
                                                <path d={trendData.map((d, i) => `${i === 0 ? "M" : "L"} ${getX(i)} ${getY(d.invoiced)}`).join(" ")}
                                                    fill="none" stroke="#5C67F2" strokeWidth="3.5" strokeLinecap="round" />
                                            )}
                                            {trendData.length > 1 && (
                                                <path d={trendData.map((d, i) => `${i === 0 ? "M" : "L"} ${getX(i)} ${getY(d.collected)}`).join(" ")}
                                                    fill="none" stroke="#10b981" strokeWidth="3.5" strokeLinecap="round" />
                                            )}

                                            {trendData.map((d, i) => (
                                                <g key={i}>
                                                    <circle cx={getX(i)} cy={getY(d.invoiced)} r="5" fill="#5C67F2" className="hover:scale-150 transition-transform cursor-pointer" />
                                                    <circle cx={getX(i)} cy={getY(d.collected)} r="5" fill="#10b981" className="hover:scale-150 transition-transform cursor-pointer" />
                                                    <text x={getX(i)} y={chartHeight - 8} textAnchor="middle" fill="#94a3b8" fontSize="9" fontWeight="bold">
                                                        {d.month.includes("-") ? d.month.split("-")[1] : d.month || String(i + 1).padStart(2, "0")}
                                                    </text>
                                                </g>
                                            ))}
                                        </svg>
                                    </div>
                                )}

                                <div className="flex gap-6 mt-6 justify-center">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-[#5C67F2]" />
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Invoiced Amount</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-emerald-500" />
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Collected Fees</span>
                                    </div>
                                </div>
                            </div>

                            {/* Payment Method Distribution */}
                            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden flex flex-col justify-between">
                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-6 flex items-center gap-2">
                                    Payment Channels <Landmark className="w-4 h-4 text-indigo-500" />
                                </h3>

                                <div className="space-y-5 flex-1 justify-center flex flex-col">
                                    {methodBreakdown.map((item, idx) => (
                                        <div key={`${item.method}-${idx}`} className="space-y-1.5">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="font-black text-slate-700 uppercase tracking-wider">{item.method}</span>
                                                <span className="font-black text-slate-800">{item.percent}% ({ksh(item.amount)})</span>
                                            </div>
                                            <div className="w-full h-2 bg-slate-50 border border-slate-100 rounded-full overflow-hidden">
                                                <div className={`h-full rounded-full ${idx === 0 ? "bg-[#5C67F2]" : "bg-emerald-400"}`} style={{ width: `${item.percent}%` }} />
                                            </div>
                                        </div>
                                    ))}
                                    {methodBreakdown.length === 0 && (
                                        <p className="text-center text-slate-400 text-xs font-bold uppercase tracking-wider">No payments received</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Class Breakdown List */}
                        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden p-8">
                            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Class Collection Indexes</h3>
                                <div className="relative max-w-xs w-full">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Filter class..."
                                        value={classSearchQuery}
                                        onChange={(e) => setClassSearchQuery(e.target.value)}
                                        className="w-full h-8 pl-9 pr-3 bg-slate-50 border border-slate-100 rounded-lg focus:outline-none focus:border-[#5C67F2] text-[10px] font-bold"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {classBreakdown
                                    .filter((c) => c.class_name.toLowerCase().includes(classSearchQuery.toLowerCase()))
                                    .map((c, i) => (
                                        <div
                                            key={`${c.class_name}-${i}`}
                                            onClick={() => { setSelectedClassId(c.class_name); setSelectedClassName(c.class_name); }}
                                            className="p-5 border border-slate-100 hover:border-indigo-100 rounded-2xl hover:shadow-md transition-all cursor-pointer flex items-center justify-between group"
                                        >
                                            <div className="space-y-1.5 flex-1 pr-6">
                                                <div className="flex items-center justify-between">
                                                    <h4 className="font-black text-xs text-slate-800 uppercase tracking-wider">{c.class_name}</h4>
                                                    <span className="text-[9px] font-black text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-md uppercase">{c.student_count} Students</span>
                                                </div>
                                                <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-500 font-bold uppercase mt-1">
                                                    <div><span className="text-[9px] block text-slate-400">Total:</span>{ksh(c.total_invoiced)}</div>
                                                    <div><span className="text-[9px] block text-emerald-400">Paid:</span>{ksh(c.collected)}</div>
                                                    <div><span className="text-[9px] block text-rose-400">Bal:</span>{ksh(c.outstanding)}</div>
                                                </div>
                                                <div className="flex items-center gap-3 mt-2">
                                                    <div className="flex-1 h-1.5 bg-slate-50 border border-slate-100 rounded-full overflow-hidden">
                                                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${c.collection_percent}%` }} />
                                                    </div>
                                                    <span className="text-[10px] font-black text-slate-700">{c.collection_percent}%</span>
                                                </div>
                                            </div>
                                            <div className="w-8 h-8 rounded-full bg-slate-50 group-hover:bg-[#5C67F2] group-hover:text-white flex items-center justify-center text-slate-400 transition-colors">
                                                <ChevronRight className="w-4 h-4" />
                                            </div>
                                        </div>
                                    ))}
                                {classBreakdown.length === 0 && (
                                    <p className="col-span-full text-center text-slate-400 text-xs font-bold uppercase tracking-wider py-10">No class records found</p>
                                )}
                            </div>
                        </div>
                    </>
                ) : (
                    /* Drilldown Class Detail Page */
                    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8 animate-in slide-in-from-right-4 duration-300">
                        <div className="flex items-center justify-between mb-8 border-b border-slate-100 pb-6 flex-wrap gap-3">
                            <button
                                onClick={() => setSelectedClassId(null)}
                                className="flex items-center gap-2 hover:text-[#5C67F2] text-slate-500 font-black text-[10px] uppercase tracking-widest transition-colors"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Back to Main Report
                            </button>
                            <h2 className="text-xl font-black text-slate-800 uppercase tracking-wider">{selectedClassName} - Detailed Ledger</h2>
                        </div>

                        {loadingDrillDown ? (
                            <div className="text-center py-20 text-slate-400 font-bold uppercase text-xs tracking-widest flex items-center justify-center gap-3">
                                <Loader2 className="w-5 h-5 animate-spin text-[#5C67F2]" />
                                Loading class ledger detail...
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                                            <th className="py-4 px-6">Student Info</th>
                                            <th className="py-4 px-6 text-right">Invoiced (KSh)</th>
                                            <th className="py-4 px-6 text-right">Collected (KSh)</th>
                                            <th className="py-4 px-6 text-right">Outstanding (KSh)</th>
                                            <th className="py-4 px-6 text-center">Collection Rate</th>
                                            <th className="py-4 px-6 text-center">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-slate-700 text-xs">
                                        {drillDownData.map((d, i) => (
                                            <tr key={`${d.admission_no || d.student_name}-${i}`} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="py-4 px-6">
                                                    <p className="font-bold text-slate-800 uppercase">{d.student_name}</p>
                                                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tight mt-0.5">{d.admission_no || "—"}</p>
                                                </td>
                                                <td className="py-4 px-6 text-right font-black text-slate-800">{ksh(d.total_invoiced)}</td>
                                                <td className="py-4 px-6 text-right font-black text-emerald-600">{ksh(d.total_paid)}</td>
                                                <td className="py-4 px-6 text-right font-black text-rose-600">{ksh(d.outstanding)}</td>
                                                <td className="py-4 px-6">
                                                    <div className="flex items-center gap-3 justify-center max-w-[120px] mx-auto">
                                                        <div className="flex-1 h-1.5 bg-slate-50 border border-slate-100 rounded-full overflow-hidden">
                                                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${d.collection_percent}%` }} />
                                                        </div>
                                                        <span className="text-[10px] font-black text-slate-700">{d.collection_percent}%</span>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-6 text-center">
                                                    <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${
                                                        d.status === "PAID" ? "bg-emerald-100 text-emerald-600 border-emerald-200" :
                                                        d.status === "VOIDED" ? "bg-slate-100 text-slate-600 border-slate-200" :
                                                        d.status === "OVERDUE" ? "bg-rose-100 text-rose-600 border-rose-200" :
                                                        "bg-amber-100 text-amber-600 border-amber-200"
                                                    }`}>
                                                        {d.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}

                                        {drillDownData.length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="text-center py-20 text-slate-400 font-bold uppercase text-xs tracking-widest">
                                                    No student invoice records found for this class
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
