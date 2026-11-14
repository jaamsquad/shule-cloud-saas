/**
 * Extra exam analytics (Exams → Analysis → a class): grade spread & pass rate, gender,
 * top & bottom learners, learners at risk, and subjects ranked with their teachers —
 * plus the Analysis settings (which views show, thresholds). Server: /analytics/insights,
 * /analytics/settings.
 */
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { AlertTriangle, Loader2, Settings2, X } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

const GREEN = "#2E7D32";

export interface AnalyticsSettings {
    views: Record<string, boolean>;
    passMarkPct: number; atRiskBelowPct: number; atRiskDropPoints: number; topBottomCount: number; defaultToCurrentTerm: boolean;
}

export function useAnalyticsSettings() {
    return useQuery<AnalyticsSettings>({ queryKey: ["an_settings"], queryFn: async () => (await api.get("/analytics/settings")).data, staleTime: 60_000 });
}

export function useInsights(examId: string, form: string, enabled: boolean) {
    return useQuery<any>({ queryKey: ["an_insights", examId, form], enabled, queryFn: async () => (await api.get("/analytics/insights", { params: { examId, form } })).data });
}

const Box = ({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) => (
    <div className="bg-white rounded-2xl border border-slate-100 p-4">
        <h3 className="font-black text-slate-700 text-sm">{title}</h3>
        {sub && <p className="text-[11px] text-slate-400 mb-3">{sub}</p>}
        <div className={sub ? "" : "mt-3"}>{children}</div>
    </div>
);
const Big = ({ v, l, tone = GREEN }: { v: any; l: string; tone?: string }) => (
    <div className="text-center"><div className="text-2xl font-black" style={{ color: tone }}>{v}</div><div className="text-[10px] font-bold uppercase text-slate-400">{l}</div></div>
);
const Loading = () => <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>;

export function DistributionView({ d }: { d: any }) {
    const data = d.grades.map((g: string) => ({ grade: g, students: d.counts[g] || 0 }));
    return (
        <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-100 p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Big v={`${d.passRate}%`} l="Pass rate" />
                <Big v={d.passed} l={`Passed (≥ ${d.passMarkPct}%)`} />
                <Big v={d.failed} l="Below pass mark" tone="#C62828" />
                <Big v={d.passed + d.failed} l="Students" tone="#334155" />
            </div>
            <Box title="Grade distribution" sub="How many learners got each mean grade">
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data}><XAxis dataKey="grade" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} /><Tooltip />
                            <Bar dataKey="students" radius={[6, 6, 0, 0]}>{data.map((_: any, i: number) => <Cell key={i} fill={i < data.length / 2 ? GREEN : "#81C784"} />)}</Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </Box>
        </div>
    );
}

export function GenderView({ rows }: { rows: any[] }) {
    if (!rows.length) return <p className="py-12 text-center text-slate-400 font-bold">No results yet.</p>;
    return (
        <Box title="Performance by gender" sub="Mean points and mean % for boys and girls">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {rows.map(g => (
                    <div key={g.gender} className="rounded-xl border border-slate-100 p-4">
                        <div className="text-xs font-black uppercase text-slate-500">{g.gender} · {g.students}</div>
                        <div className="flex items-end gap-4 mt-2">
                            <div><div className="text-2xl font-black" style={{ color: GREEN }}>{g.meanPoints}</div><div className="text-[10px] font-bold text-slate-400 uppercase">Mean pts</div></div>
                            <div><div className="text-xl font-black text-slate-700">{g.meanPct}%</div><div className="text-[10px] font-bold text-slate-400 uppercase">Mean %</div></div>
                            <div><div className="text-xl font-black text-slate-700">{g.meanGrade}</div><div className="text-[10px] font-bold text-slate-400 uppercase">Grade</div></div>
                        </div>
                    </div>
                ))}
            </div>
        </Box>
    );
}

const StudentTable = ({ rows, tone }: { rows: any[]; tone: string }) => (
    <table className="w-full text-sm">
        <thead><tr className="text-[10px] font-black uppercase text-slate-400 text-left"><th className="py-2">#</th><th>Student</th><th>Stream</th><th className="text-right">Pts</th><th className="text-right">%</th><th className="text-right">Grade</th></tr></thead>
        <tbody className="divide-y divide-slate-50">
            {rows.map((r, i) => (
                <tr key={`${r.adm}-${i}`}><td className="py-2 text-slate-400">{i + 1}</td><td><div className="font-bold text-slate-700">{r.name}</div><div className="text-[11px] text-slate-400">{r.adm}</div></td><td className="text-slate-500">{r.stream}</td>
                    <td className="text-right font-black" style={{ color: tone }}>{r.meanPoints}</td><td className="text-right text-slate-600">{r.meanPct}</td><td className="text-right font-bold">{r.meanGrade}</td></tr>
            ))}
        </tbody>
    </table>
);

export function TopBottomView({ top, bottom }: { top: any[]; bottom: any[] }) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Box title={`Top ${top.length}`} sub="Highest mean points"><StudentTable rows={top} tone={GREEN} /></Box>
            <Box title={`Bottom ${bottom.length}`} sub="Lowest mean points — may need support"><StudentTable rows={bottom} tone="#C62828" /></Box>
        </div>
    );
}

export function AtRiskView({ rows, comparedTo, s }: { rows: any[]; comparedTo: string | null; s: AnalyticsSettings }) {
    return (
        <Box title={`Learners at risk (${rows.length})`} sub={`Mean below ${s.atRiskBelowPct}%, or a drop of ${s.atRiskDropPoints}+ points${comparedTo ? ` since ${comparedTo}` : ""}. Change these in Settings.`}>
            {!rows.length ? <p className="py-8 text-center text-emerald-600 font-bold">No learner is at risk in this exam.</p> : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[560px]">
                        <thead><tr className="text-[10px] font-black uppercase text-slate-400 text-left"><th className="py-2">Student</th><th>Stream</th><th className="text-right">Pts</th><th className="text-right">%</th><th className="pl-4">Why</th><th>Weak subjects</th></tr></thead>
                        <tbody className="divide-y divide-slate-50">
                            {rows.map((r, i) => (
                                <tr key={`${r.adm}-${i}`} className="align-top">
                                    <td className="py-2"><div className="font-bold text-slate-700 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5 text-amber-500" />{r.name}</div><div className="text-[11px] text-slate-400">{r.adm}</div></td>
                                    <td className="text-slate-500">{r.stream}</td><td className="text-right font-black text-rose-600">{r.meanPoints}</td><td className="text-right">{r.meanPct}</td>
                                    <td className="pl-4 text-xs text-slate-600">{r.reasons.join(" · ")}</td>
                                    <td className="text-xs text-slate-500">{r.weakSubjects.join(", ") || "—"}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </Box>
    );
}

export function SubjectRankingView({ rows }: { rows: any[] }) {
    return (
        <Box title="Subjects ranked" sub="Best to weakest by mean points, with pass rate and who teaches it">
            <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[560px]">
                    <thead><tr className="text-[10px] font-black uppercase text-slate-400 text-left"><th className="py-2">Rank</th><th>Subject</th><th>Teacher</th><th className="text-right">Pts</th><th className="text-right">Mean %</th><th className="text-right">Grade</th><th className="text-right">Pass rate</th></tr></thead>
                    <tbody className="divide-y divide-slate-50">
                        {rows.map(r => (
                            <tr key={r.name}><td className="py-2 font-black text-slate-400">{r.rank}</td><td className="font-bold text-slate-700">{r.name}</td><td className="text-slate-500 text-xs">{r.teachers.join(", ") || "—"}</td>
                                <td className="text-right font-black" style={{ color: GREEN }}>{r.meanPoints}</td><td className="text-right">{r.meanPct}</td><td className="text-right font-bold">{r.grade}</td>
                                <td className="text-right"><span className={`font-bold ${r.passRate >= 50 ? "text-emerald-600" : "text-rose-500"}`}>{r.passRate}%</span></td></tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Box>
    );
}

/** One insights tab, loaded on demand. */
export function InsightsTab({ examId, form, kind }: { examId: string; form: string; kind: "distribution" | "gender" | "topBottom" | "atRisk" | "subjectRanking" }) {
    const { data, isLoading } = useInsights(examId, form, true);
    if (isLoading || !data) return <Loading />;
    if (kind === "distribution") return <DistributionView d={data.distribution} />;
    if (kind === "gender") return <GenderView rows={data.gender} />;
    if (kind === "topBottom") return <TopBottomView top={data.top} bottom={data.bottom} />;
    if (kind === "atRisk") return <AtRiskView rows={data.atRisk} comparedTo={data.comparedTo} s={data.settings} />;
    return <SubjectRankingView rows={data.subjectRanking} />;
}

const VIEW_LABELS: { key: string; label: string; note: string; basic?: boolean }[] = [
    { key: "meritList", label: "Merit list", note: "Ranked learners with subject marks", basic: true },
    { key: "comparison", label: "Comparison", note: "This exam vs the previous one", basic: true },
    { key: "subjects", label: "Subjects", note: "Each subject's mark sheet", basic: true },
    { key: "classes", label: "Class & stream", note: "Streams compared within the class", basic: true },
    { key: "improved", label: "Most improved", note: "Biggest gains since last exam", basic: true },
    { key: "distribution", label: "Grades & pass rate", note: "Grade spread and how many passed", basic: true },
    { key: "gender", label: "Gender", note: "Boys vs girls" },
    { key: "topBottom", label: "Top & bottom", note: "Best and weakest learners" },
    { key: "atRisk", label: "At risk", note: "Low scores or a big drop" },
    { key: "subjectRanking", label: "Subject ranking", note: "Subjects ranked, with teachers" },
];

export function AnalyticsSettingsModal({ onClose }: { onClose: () => void }) {
    const qc = useQueryClient();
    const { data } = useAnalyticsSettings();
    const [s, setS] = useState<AnalyticsSettings | null>(null);
    const [busy, setBusy] = useState(false);
    useEffect(() => { if (data && !s) setS(JSON.parse(JSON.stringify(data))); }, [data, s]);
    const save = async () => {
        if (!s) return;
        setBusy(true);
        try {
            await api.put("/analytics/settings", s);
            qc.invalidateQueries({ queryKey: ["an_settings"] }); qc.invalidateQueries({ queryKey: ["an_insights"] }); qc.invalidateQueries({ queryKey: ["an_exams"] });
            toast.success("Analysis settings saved"); onClose();
        } catch (e: any) { toast.error(e?.response?.data?.message || "Could not save"); } finally { setBusy(false); }
    };
    const num = (k: keyof AnalyticsSettings, label: string, min: number, max: number, step = 1) => s && (
        <label className="block"><span className="text-[11px] font-bold text-slate-500">{label}</span>
            <input type="number" min={min} max={max} step={step} value={s[k] as number} onChange={e => setS({ ...s, [k]: Number(e.target.value) })} className="mt-1 w-full h-10 px-3 border border-slate-200 rounded-xl text-sm" /></label>
    );
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/40" onClick={onClose}>
            <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[92vh]" onClick={e => e.stopPropagation()}>
                <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2"><Settings2 className="w-5 h-5" style={{ color: GREEN }} /><h2 className="font-black text-slate-800">Analysis settings</h2></div>
                    <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center"><X className="w-4 h-4" /></button>
                </div>
                {!s ? <Loading /> : (
                    <div className="p-5 space-y-5 overflow-y-auto">
                        <div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Views shown</div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {VIEW_LABELS.map(v => (
                                    <label key={v.key} className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 cursor-pointer hover:bg-slate-50">
                                        <input type="checkbox" checked={!!s.views[v.key]} onChange={e => setS({ ...s, views: { ...s.views, [v.key]: e.target.checked } })} className="mt-0.5 w-4 h-4 accent-[#2E7D32]" />
                                        <span><span className="text-sm font-bold text-slate-700">{v.label}</span>{v.basic && <span className="ml-1.5 text-[9px] font-black uppercase text-emerald-600">basic</span>}<span className="block text-[11px] text-slate-400">{v.note}</span></span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {num("passMarkPct", "Pass mark (mean %)", 0, 100)}
                            {num("topBottomCount", "Top & bottom: how many", 3, 50)}
                            {num("atRiskBelowPct", "At risk below (mean %)", 0, 100)}
                            {num("atRiskDropPoints", "At risk if points drop by", 0, 12, 0.5)}
                        </div>
                        <label className="flex items-center gap-3 text-sm font-bold text-slate-700">
                            <input type="checkbox" checked={s.defaultToCurrentTerm} onChange={e => setS({ ...s, defaultToCurrentTerm: e.target.checked })} className="w-4 h-4 accent-[#2E7D32]" />
                            Open on the current term's latest exam
                        </label>
                    </div>
                )}
                <div className="p-5 border-t border-slate-100 flex gap-3">
                    <button onClick={onClose} className="flex-1 h-10 border border-slate-200 rounded-xl font-bold text-sm text-slate-600">Cancel</button>
                    <button onClick={save} disabled={busy || !s} className="flex-1 h-10 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50" style={{ background: GREEN }}>{busy && <Loader2 className="w-4 h-4 animate-spin" />} Save</button>
                </div>
            </div>
        </div>
    );
}
