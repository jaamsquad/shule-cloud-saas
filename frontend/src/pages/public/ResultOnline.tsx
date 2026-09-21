import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ShieldCheck, ShieldX, Printer } from "lucide-react";
import api from "@/lib/api";

/**
 * What a parent's result link opens:  /<school>/result/<exam code>/<result id>/<student id>
 * The link itself is the proof (the result id is a signature the server checks), so there is no login.
 */
export default function ResultOnline() {
    const { school = "", examCode = "", resultId = "", studentId = "" } = useParams();
    const { data, isLoading, error } = useQuery<any>({
        queryKey: ["result_online", school, examCode, resultId, studentId], retry: false,
        queryFn: async () => (await api.get(`/public/verify/result/${encodeURIComponent(school)}/${encodeURIComponent(examCode)}/${encodeURIComponent(resultId)}/${encodeURIComponent(studentId)}`)).data,
    });
    useEffect(() => { document.title = "Exam result — ShuleCloud"; }, []);

    if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-8 h-8 animate-spin text-[#534AB7]" /></div>;
    const r = data?.result;
    const y = data?.yearly;
    if (error || (!r && !y)) {
        return (
            <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden text-center">
                    <div className="bg-rose-600 text-white px-6 py-7"><ShieldX className="w-14 h-14 mx-auto" /><div className="text-2xl font-black mt-2">LINK NOT VALID</div></div>
                    <p className="p-6 text-sm text-slate-600">{(error as any)?.response?.data?.message || "This result link is not valid, or the result is not available yet."} Please contact the school for a new link.</p>
                </div>
            </div>
        );
    }
    const tone = (p: number) => p >= 70 ? "text-emerald-600" : p >= 50 ? "text-amber-600" : "text-rose-600";
    return (
        <div className="min-h-screen bg-slate-100 p-3 sm:p-6 print:bg-white print:p-0">
            <div className="max-w-2xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden print:shadow-none print:rounded-none">
                <div className="px-6 py-5 flex items-center gap-4 border-b border-slate-100">
                    {data.school?.logo ? <img src={data.school.logo} alt="" className="h-14 w-auto object-contain" /> : null}
                    <div className="flex-1 min-w-0"><div className="text-lg font-black text-slate-800 leading-tight">{data.school?.name}</div>{data.school?.address && <div className="text-xs text-slate-400">{data.school.address}</div>}</div>
                    <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full"><ShieldCheck className="w-3.5 h-3.5" /> Verified link</span>
                </div>
                {y ? (
                    <>
                        <div className="px-6 pt-5">
                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Annual report</div>
                            <div className="text-xl font-black text-slate-900">{y.year} · Term 1, Term 2, Term 3 and the year average</div>
                            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                                <div><div className="text-slate-400 text-xs">Student</div><div className="font-bold text-slate-800">{y.name}</div></div>
                                <div><div className="text-slate-400 text-xs">Reg. no. / Class</div><div className="font-bold text-slate-800">{[y.regNo, y.className].filter(Boolean).join(" · ") || "—"}</div></div>
                            </div>
                        </div>
                        <div className="p-6">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm border-collapse">
                                    <thead><tr className="bg-slate-50 text-slate-500 text-xs uppercase"><th className="text-left p-2.5">Subject</th><th className="p-2.5">Term 1</th><th className="p-2.5">Term 2</th><th className="p-2.5">Term 3</th><th className="p-2.5">Year</th><th className="p-2.5">Grade</th></tr></thead>
                                    <tbody>
                                        {y.subjects.map((s: any, i: number) => (
                                            <tr key={i} className="border-b border-slate-100"><td className="p-2.5 font-semibold text-slate-700">{s.name}</td>{s.t.map((v: number | null, j: number) => <td key={j} className="p-2.5 text-center">{v == null ? "—" : `${v}%`}</td>)}<td className={`p-2.5 text-center font-bold ${tone(s.avg ?? 0)}`}>{s.avg == null ? "—" : `${s.avg}%`}</td><td className="p-2.5 text-center font-black">{s.grade}</td></tr>
                                        ))}
                                        <tr className="bg-slate-50 font-black"><td className="p-2.5">Overall</td>{y.termOverall.map((v: number | null, j: number) => <td key={j} className="p-2.5 text-center">{v == null ? "—" : `${v}%`}</td>)}<td className={`p-2.5 text-center ${tone(y.yearAvg ?? 0)}`}>{y.yearAvg == null ? "—" : `${y.yearAvg}%`}</td><td className="p-2.5 text-center">{y.yearGrade}</td></tr>
                                    </tbody>
                                </table>
                            </div>
                            <button onClick={() => window.print()} className="print:hidden mt-5 h-11 px-5 rounded-xl bg-[#534AB7] text-white font-bold text-sm flex items-center gap-2"><Printer className="w-4 h-4" /> Print / save as PDF</button>
                            <p className="text-[11px] text-slate-400 mt-4">This is a private link sent to the student's parent or guardian. Please do not share it.</p>
                        </div>
                    </>
                ) : (<>
                <div className="px-6 pt-5">
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Exam result</div>
                    <div className="text-xl font-black text-slate-900">{r.examTitle}</div>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                        <div><div className="text-slate-400 text-xs">Student</div><div className="font-bold text-slate-800">{r.studentName}</div></div>
                        <div><div className="text-slate-400 text-xs">Reg. no. / Class</div><div className="font-bold text-slate-800">{[r.registrationNo, r.className].filter(Boolean).join(" · ") || "—"}</div></div>
                    </div>
                </div>
                <div className="p-6">
                    <table className="w-full text-sm border-collapse">
                        <thead><tr className="bg-slate-50 text-slate-500 text-xs uppercase"><th className="text-left p-2.5">Subject</th><th className="p-2.5">Marks</th><th className="p-2.5">%</th><th className="p-2.5">Grade</th></tr></thead>
                        <tbody>
                            {r.subjects.map((s: any, i: number) => (
                                <tr key={i} className="border-b border-slate-100"><td className="p-2.5 font-semibold text-slate-700">{s.name}</td><td className="p-2.5 text-center">{s.marks}/{s.outOf}</td><td className={`p-2.5 text-center font-bold ${tone(s.pct)}`}>{s.pct}%</td><td className="p-2.5 text-center font-black">{s.grade}</td></tr>
                            ))}
                            <tr className="bg-slate-50 font-black"><td className="p-2.5">Total</td><td className="p-2.5 text-center">{r.total}/{r.totalMax}</td><td className={`p-2.5 text-center ${tone(r.meanPct)}`}>{r.meanPct}%</td><td className="p-2.5 text-center">{r.meanGrade}</td></tr>
                        </tbody>
                    </table>
                    <button onClick={() => window.print()} className="print:hidden mt-5 h-11 px-5 rounded-xl bg-[#534AB7] text-white font-bold text-sm flex items-center gap-2"><Printer className="w-4 h-4" /> Print / save as PDF</button>
                    <p className="text-[11px] text-slate-400 mt-4">This is a private link sent to the student's parent or guardian. Please do not share it.</p>
                </div>
                </>)}
            </div>
        </div>
    );
}
