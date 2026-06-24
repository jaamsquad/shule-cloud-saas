import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, GraduationCap, Wallet, FileText } from "lucide-react";
import api from "@/lib/api";

const ksh = (n: any) => `KSh ${(Number(n) || 0).toLocaleString()}`;

// A student's records grouped by every class they have been in (academic + fees).
export default function StudentHistory() {
    const { id = "" } = useParams();
    const navigate = useNavigate();
    const { data, isLoading } = useQuery({
        queryKey: ["student_history", id],
        queryFn: async () => (await api.get(`/reports/student-history/${id}`)).data,
        enabled: !!id,
    });

    if (isLoading) return <div className="flex-1 flex items-center justify-center min-h-screen"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;
    const history: any[] = data?.history || [];
    const s = data?.student || {};

    return (
        <div className="flex-1 bg-[#F8FAFC] min-h-screen p-6">
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm font-bold text-slate-500 mb-4"><ArrowLeft className="w-4 h-4" /> Back</button>
            <div className="mb-6">
                <h1 className="text-2xl font-black text-slate-900">{s.name || "Student"} — Class History</h1>
                <p className="text-sm text-slate-400">Adm No: {s.admNo || "—"} · Currently in {s.currentClass || "—"}. Records below are grouped by each class the student has been in.</p>
            </div>

            {history.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center text-slate-400">
                    <FileText className="w-10 h-10 mx-auto mb-2" /><p className="font-bold">No records yet</p>
                </div>
            ) : (
                <div className="space-y-5">
                    {history.map((h: any) => (
                        <div key={h.class} className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                            <div className="px-5 py-3 bg-slate-900 text-white flex items-center gap-2">
                                <GraduationCap className="w-4 h-4" />
                                <h3 className="font-black text-sm">{h.class}</h3>
                            </div>
                            <div className="grid md:grid-cols-2 gap-0">
                                {/* Exams */}
                                <div className="p-5 border-b md:border-b-0 md:border-r border-slate-100">
                                    <div className="flex items-center gap-2 mb-3 text-slate-700"><FileText className="w-4 h-4" /><span className="text-xs font-black uppercase tracking-wide">Exams</span></div>
                                    {h.exams?.length ? (
                                        <table className="w-full text-sm">
                                            <thead><tr className="text-[10px] text-slate-400 uppercase"><th className="text-left font-black pb-1">Exam</th><th className="text-right font-black pb-1">Mean %</th><th className="text-right font-black pb-1">Subjects</th></tr></thead>
                                            <tbody>
                                                {h.exams.map((e: any, i: number) => (
                                                    <tr key={i} className="border-t border-slate-50"><td className="py-1.5 font-bold text-slate-700">{e.exam}</td><td className="py-1.5 text-right font-black" style={{ color: e.mean >= 50 ? "#15803d" : "#b91c1c" }}>{e.mean}%</td><td className="py-1.5 text-right text-slate-500">{e.subjects}</td></tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    ) : <p className="text-xs text-slate-400">No exam records for this class.</p>}
                                </div>
                                {/* Fees */}
                                <div className="p-5">
                                    <div className="flex items-center gap-2 mb-3 text-slate-700"><Wallet className="w-4 h-4" /><span className="text-xs font-black uppercase tracking-wide">Fees</span></div>
                                    <div className="grid grid-cols-3 gap-2 text-center">
                                        <div className="bg-slate-50 rounded-lg p-2"><div className="text-[9px] font-black text-slate-400 uppercase">Invoiced</div><div className="text-sm font-black text-slate-800">{ksh(h.invoiced)}</div></div>
                                        <div className="bg-emerald-50 rounded-lg p-2"><div className="text-[9px] font-black text-emerald-500 uppercase">Paid</div><div className="text-sm font-black text-emerald-700">{ksh(h.paid)}</div></div>
                                        <div className="bg-rose-50 rounded-lg p-2"><div className="text-[9px] font-black text-rose-500 uppercase">Balance</div><div className="text-sm font-black text-rose-700">{ksh(h.balance)}</div></div>
                                    </div>
                                    <p className="text-[11px] text-slate-400 mt-2">{h.invoices || 0} invoice(s) in this class.</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
