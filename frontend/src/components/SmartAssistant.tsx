import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
    Bot, X, ChevronLeft, Loader2, Eye, Download, MessageSquare, Printer,
    CheckCircle2, Sparkles, ArrowRight,
} from "lucide-react";
import {
    BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import { toast } from "sonner";
import api from "@/lib/api";

// Smart Assistant — a floating, button-driven school insights panel. No typing:
// pick a category → pick a question → get a SmartCard (summary, stat, chart,
// quick actions). Every question calls the same backend query engine, so a future
// AI can reuse it. Mounted globally by DashboardLayout.

const CAT_META: Record<string, { icon: string; color: string }> = {
    Students: { icon: "📚", color: "#5C67F2" }, Attendance: { icon: "🗓️", color: "#0EA5E9" },
    Fees: { icon: "💰", color: "#16A34A" }, Finance: { icon: "💵", color: "#16A34A" },
    Library: { icon: "📖", color: "#D97706" }, Staff: { icon: "👨‍🏫", color: "#7C3AED" },
    Academics: { icon: "📝", color: "#DB2777" }, Examinations: { icon: "🎯", color: "#DC2626" },
    Transport: { icon: "🚌", color: "#CA8A04" }, Hostel: { icon: "🏠", color: "#0891B2" },
    Inventory: { icon: "📦", color: "#64748B" }, Payroll: { icon: "🧾", color: "#059669" },
    Parents: { icon: "👪", color: "#2563EB" }, Discipline: { icon: "⚖️", color: "#B91C1C" },
    Health: { icon: "🩺", color: "#E11D48" }, Calendar: { icon: "📅", color: "#7C3AED" },
    Admissions: { icon: "🎓", color: "#0D9488" }, Reports: { icon: "📊", color: "#4F46E5" },
    System: { icon: "⚙️", color: "#475569" },
};
const PIE = ["#5C67F2", "#16A34A", "#F59E0B", "#DC2626", "#0EA5E9", "#7C3AED", "#DB2777"];
const ACTION_ICON: Record<string, any> = { eye: Eye, download: Download, message: MessageSquare, printer: Printer, check: CheckCircle2 };

export default function SmartAssistant() {
    const [open, setOpen] = useState(false);
    const [category, setCategory] = useState<string | null>(null);
    const [card, setCard] = useState<any | null>(null);

    const { data: catalog } = useQuery({
        queryKey: ["assistant_catalog"],
        enabled: open,
        queryFn: async () => (await api.get("/assistant/catalog")).data,
        staleTime: 5 * 60 * 1000,
    });
    const categories: Array<{ category: string; queries: any[] }> = catalog?.categories || [];

    const runQuery = useMutation({
        mutationFn: async (id: string) => (await api.post("/assistant/query", { id, filters: {} })).data,
        onSuccess: (data) => setCard(data),
        onError: (e: any) => toast.error(e.response?.data?.message || "Query failed"),
    });

    const reset = () => { setCard(null); };
    const backToCats = () => { setCategory(null); setCard(null); };

    const onAction = (a: any) => {
        // Actions are deterministic hooks; wire to real flows as they land.
        if (a.action === "export" && card) {
            const rows = (card.breakdown || []).map((b: any) => [b.label, b.value]);
            const csv = ["Label,Value", ...rows.map((r: any[]) => r.join(","))].join("\n");
            const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
            const el = document.createElement("a"); el.href = url; el.download = `${card.id}.csv`; el.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            return;
        }
        toast.info(`${a.label} — coming soon`);
    };

    return (
        <>
            {/* Floating button */}
            {!open && (
                <button onClick={() => setOpen(true)}
                    className="fixed bottom-6 right-6 z-[120] flex items-center gap-2 pl-3 pr-4 py-3 rounded-full bg-gradient-to-br from-[#5C67F2] to-[#4a54c4] text-white shadow-xl shadow-indigo-500/30 hover:scale-105 transition-transform"
                    aria-label="Open Smart Assistant">
                    <span className="relative flex items-center justify-center w-8 h-8 rounded-full bg-white/15"><Bot className="w-5 h-5" /><span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-[#5C67F2]" /></span>
                    <span className="text-sm font-black hidden sm:inline">ShuleCloud Assistant</span>
                </button>
            )}

            {/* Panel */}
            {open && (
                <div className="fixed inset-0 z-[120] sm:inset-auto sm:bottom-6 sm:right-6 sm:w-[420px] sm:max-h-[80vh] flex flex-col bg-white sm:rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 text-white bg-gradient-to-br from-[#5C67F2] to-[#4a54c4]">
                        <div className="flex items-center gap-2">
                            {(category || card) && <button onClick={card ? reset : backToCats} className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center"><ChevronLeft className="w-4 h-4" /></button>}
                            <Bot className="w-5 h-5" />
                            <div><p className="text-sm font-black leading-tight">ShuleCloud Assistant</p><p className="text-[10px] text-white/70">{card ? "Insight" : category || "What would you like to know?"}</p></div>
                        </div>
                        <button onClick={() => setOpen(false)} className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center"><X className="w-4 h-4" /></button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 bg-slate-50/40">
                        {/* Result card */}
                        {card ? (
                            <SmartCardView card={card} onAction={onAction} loading={runQuery.isPending} />
                        ) : !category ? (
                            /* Category grid */
                            <div className="grid grid-cols-2 gap-2.5">
                                {categories.length === 0 ? (
                                    <div className="col-span-2 flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-indigo-300" /></div>
                                ) : categories.map(c => {
                                    const m = CAT_META[c.category] || { icon: "•", color: "#5C67F2" };
                                    return (
                                        <button key={c.category} onClick={() => setCategory(c.category)}
                                            className="flex flex-col items-start gap-1 p-3 rounded-2xl border border-slate-100 bg-white hover:border-[#5C67F2] hover:shadow-sm transition-all text-left">
                                            <span className="text-2xl">{m.icon}</span>
                                            <span className="text-sm font-black text-slate-700">{c.category}</span>
                                            <span className="text-[10px] text-slate-400">{c.queries.length} insight{c.queries.length !== 1 ? "s" : ""}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            /* Question list */
                            <div className="space-y-1.5">
                                {(categories.find(c => c.category === category)?.queries || []).map((q: any) => (
                                    <button key={q.id} onClick={() => runQuery.mutate(q.id)} disabled={runQuery.isPending}
                                        className="w-full flex items-center justify-between gap-2 px-3.5 py-3 rounded-xl border border-slate-100 bg-white hover:border-[#5C67F2] hover:bg-[#5C67F2]/5 transition-all text-left disabled:opacity-50">
                                        <span className="text-sm font-bold text-slate-700">{q.label}</span>
                                        {runQuery.isPending && runQuery.variables === q.id ? <Loader2 className="w-4 h-4 animate-spin text-indigo-400" /> : <ArrowRight className="w-4 h-4 text-slate-300" />}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer hint */}
                    <div className="px-4 py-2 border-t border-slate-100 flex items-center gap-1.5 text-[10px] text-slate-400 bg-white">
                        <Sparkles className="w-3 h-3" /> Live data · button-driven · AI-ready
                    </div>
                </div>
            )}
        </>
    );
}

function SmartCardView({ card, onAction, loading }: { card: any; onAction: (a: any) => void; loading: boolean }) {
    if (loading) return <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-indigo-400" /></div>;
    return (
        <div className="space-y-3">
            <div className="bg-white rounded-2xl border border-slate-100 p-4">
                <p className="text-xs font-black text-slate-400 uppercase tracking-wide mb-1">{card.title}</p>
                <p className="text-sm text-slate-700">{card.summary}</p>
                {card.stat && (
                    <div className="mt-3 flex items-baseline gap-2">
                        <span className="text-3xl font-black text-[#5C67F2]">{card.stat.value}</span>
                        {card.stat.label && <span className="text-xs font-bold text-slate-400">{card.stat.label}</span>}
                    </div>
                )}
            </div>

            {card.breakdown?.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-100 p-4">
                    <p className="text-[11px] font-black text-slate-400 uppercase mb-2">Breakdown</p>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                        {card.breakdown.map((b: any, i: number) => (
                            <div key={i} className="flex items-center justify-between text-sm border-b border-slate-50 py-1.5">
                                <span className="text-slate-600 truncate">{b.label}</span><span className="font-bold text-slate-800 flex-shrink-0 ml-2">{b.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {card.chart?.data?.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-100 p-4">
                    {card.chart.title && <p className="text-[11px] font-black text-slate-400 uppercase mb-2">{card.chart.title}</p>}
                    <div style={{ height: 180 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            {card.chart.type === "pie" ? (
                                <PieChart>
                                    <Pie data={card.chart.data} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={70} label={(e: any) => e.label}>
                                        {card.chart.data.map((_: any, i: number) => <Cell key={i} fill={PIE[i % PIE.length]} />)}
                                    </Pie><Tooltip />
                                </PieChart>
                            ) : card.chart.type === "line" ? (
                                <LineChart data={card.chart.data}><XAxis dataKey="label" tick={{ fontSize: 9 }} /><YAxis tick={{ fontSize: 9 }} /><Tooltip /><Line dataKey="value" stroke="#5C67F2" strokeWidth={2} dot={false} /></LineChart>
                            ) : (
                                <BarChart data={card.chart.data}><XAxis dataKey="label" tick={{ fontSize: 9 }} interval={0} /><YAxis tick={{ fontSize: 9 }} /><Tooltip /><Bar dataKey="value" radius={[3, 3, 0, 0]}>{card.chart.data.map((_: any, i: number) => <Cell key={i} fill={PIE[i % PIE.length]} />)}</Bar></BarChart>
                            )}
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {card.actions?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {card.actions.map((a: any, i: number) => {
                        const Icon = ACTION_ICON[a.icon] || ArrowRight;
                        return (
                            <button key={i} onClick={() => onAction(a)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-600 hover:border-[#5C67F2] hover:text-[#5C67F2] transition-all">
                                <Icon className="w-3.5 h-3.5" /> {a.label}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
