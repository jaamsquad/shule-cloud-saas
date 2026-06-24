import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Printer, ArrowLeft, Loader2, FileBarChart } from "lucide-react";
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { toast } from "sonner";
import api from "@/lib/api";
import { openPrintDoc } from "@/lib/pdfDoc";

const BLUE = "#2563EB";
const COLORS = ["#2563EB", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#06B6D4", "#0F766E"];

// Maps the route slug → backend computed endpoint.
const ENDPOINT: Record<string, string> = {
    "subject-performance": "subject-performance", "class-performance": "class-performance",
    "grade-distribution": "grade-distribution", "mark-sheets": "mark-sheets",
    "cbc-competency": "cbc-competency", "mean-score-trends": "mean-score-trends",
    "attendance-summary": "attendance-summary", "balance-sheet": "balance-sheet",
    "trial-balance": "trial-balance", "revenue-overview": "revenue-overview",
    "enrollment-trends": "enrollment-trends", "nemis-export": "nemis-export",
    "knec-registration": "knec-registration", "statutory-returns": "statutory-returns",
    "ministry-data": "ministry-data",
};

// Marks-based reports that should offer an exam filter.
const EXAM_FILTERABLE = new Set(["subject-performance", "class-performance", "grade-distribution", "mark-sheets", "cbc-competency", "mean-score-trends"]);

export default function ComputedReport() {
    const { key = "" } = useParams();
    const endpoint = ENDPOINT[key];
    const showExamFilter = EXAM_FILTERABLE.has(key);
    const [examId, setExamId] = useState("");   // "" = All Exams

    // Exam list for the dropdown (only fetched for marks-based reports).
    const { data: exams = [] } = useQuery({
        queryKey: ["reports_shared_exams"],
        queryFn: async () => (await api.get("/reports/shared/exams")).data,
        enabled: showExamFilter,
    });

    const { data, isLoading } = useQuery({
        queryKey: ["computed_report", key, examId],
        queryFn: async () => (await api.get(`/reports/computed/${endpoint}`, { params: examId ? { exam_id: examId } : {} })).data,
        enabled: !!endpoint,
    });
    const { data: schoolRaw } = useQuery({ queryKey: ["tenant_profile_global"], queryFn: async () => (await api.get("/auth/tenant/profile")).data });
    const school = Array.isArray(schoolRaw) ? schoolRaw[0] : (schoolRaw || {});
    const schoolName = school?.name || school?.instituteName || "School";
    const schoolLogo = school?.logo || school?.schoolLogo || "";

    if (!endpoint) return <NotConfigured />;
    if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-[#2563EB]" /></div>;

    const cols = data?.columns || [];
    const rows = data?.rows || [];
    const cards = data?.cards || [];
    const chart = data?.chart;

    const print = () => {
        const head = cols.map((c: any) => `<th style="background:#2563EB;color:#fff;padding:9px;text-align:left;font-size:11px">${c.label}</th>`).join("");
        const body = rows.map((r: any, i: number) => `<tr style="background:${i % 2 ? "#F8FAFC" : "#fff"}">${cols.map((c: any) => `<td style="padding:8px;border-bottom:1px solid #E2E8F0;font-size:11px">${r[c.key] ?? ""}</td>`).join("")}</tr>`).join("");
        const w = openPrintDoc(); if (!w) return toast.error("Allow pop-ups");
        w.document.write(`<!DOCTYPE html><html><head><title>${data.title}</title><style>@page{size:A4 landscape;margin:14mm}body{font-family:Arial;color:#0F172A}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}.h{text-align:center;border-bottom:3px solid #2563EB;padding-bottom:12px;margin-bottom:16px}table{width:100%;border-collapse:collapse}</style></head><body><div class="h">${schoolLogo ? `<img src="${schoolLogo}" style="height:48px"/>` : ""}<h1 style="margin:4px 0;text-transform:uppercase">${schoolName}</h1><div style="color:#2563EB;font-weight:600">${data.title}</div></div><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table><p style="text-align:right;color:#94A3B8;font-size:10px;margin-top:16px">${rows.length} records · ${new Date().toLocaleDateString()}</p><script>onload=()=>print()</script></body></html>`);
        w.document.close();
    };

    return (
        <div className="flex-1 bg-[#F8FAFC] min-h-screen p-6 md:p-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <Link to="/reports" className="inline-flex items-center gap-1.5 text-xs font-black text-slate-400 hover:text-[#2563EB] uppercase tracking-widest mb-2"><ArrowLeft className="w-3.5 h-3.5" /> Reports Center</Link>
                        <h1 className="text-2xl font-black text-slate-900">{data?.title}</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        {showExamFilter && (
                            <select value={examId} onChange={e => setExamId(e.target.value)} className="h-10 px-4 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 outline-none focus:border-[#2563EB]">
                                <option value="">All Exams</option>
                                {exams.map((e: any) => <option key={e._id} value={e._id}>{e.name}</option>)}
                            </select>
                        )}
                        <button onClick={print} disabled={!rows.length} className="h-10 px-5 bg-[#2563EB] hover:bg-blue-700 disabled:opacity-40 text-white font-black text-xs uppercase tracking-widest rounded-xl flex items-center gap-2 shadow-md"><Printer className="w-4 h-4" /> Print / Export</button>
                    </div>
                </div>

                {cards.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                        {cards.map((c: any) => (
                            <div key={c.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                                <div className="text-xl font-black text-slate-800">{c.value}</div>
                                <div className="text-[11px] text-slate-400 font-bold">{c.label}</div>
                            </div>
                        ))}
                    </div>
                )}

                {chart && chart.data?.length > 0 && (
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-5">
                        <ResponsiveContainer width="100%" height={260}>
                            {chart.type === "pie" ? (
                                <PieChart><Pie data={chart.data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>{chart.data.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Legend /><Tooltip /></PieChart>
                            ) : chart.type === "line" ? (
                                <LineChart data={chart.data}><XAxis dataKey="name" fontSize={11} /><YAxis fontSize={11} /><Tooltip /><Line type="monotone" dataKey="value" stroke={BLUE} strokeWidth={2} /></LineChart>
                            ) : (
                                <BarChart data={chart.data}><XAxis dataKey="name" fontSize={11} /><YAxis fontSize={11} /><Tooltip /><Bar dataKey="value" fill={BLUE} radius={[6, 6, 0, 0]} /></BarChart>
                            )}
                        </ResponsiveContainer>
                    </div>
                )}

                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead><tr className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wide">{cols.map((c: any) => <th key={c.key} className="text-left px-5 py-3 font-black">{c.label}</th>)}</tr></thead>
                        <tbody>
                            {rows.length === 0 ? (
                                <tr><td colSpan={cols.length || 1} className="py-12 text-center text-slate-400 font-bold text-xs uppercase">No data available</td></tr>
                            ) : rows.map((r: any, i: number) => (
                                <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50">
                                    {cols.map((c: any) => <td key={c.key} className={`px-5 py-3 ${c.key === cols[0].key ? "font-bold text-slate-700" : "text-slate-500"}`}>{r[c.key] ?? "—"}</td>)}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <p className="text-xs text-slate-400 font-bold mt-3">{rows.length} records</p>
            </div>
        </div>
    );
}

function NotConfigured() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-slate-400">
            <FileBarChart className="w-12 h-12" /><p className="font-bold">This report isn't configured yet.</p>
            <Link to="/reports" className="text-[#2563EB] font-black text-sm">← Back to Reports Center</Link>
        </div>
    );
}
