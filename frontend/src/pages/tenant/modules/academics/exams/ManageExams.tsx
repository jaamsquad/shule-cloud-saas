/**
 * Exams → Manage Exams: every exam of the year, by term, with one row per class showing
 * whether its results are published. Results are hidden from the merit list, analytics,
 * report cards, portals and result links until published here (backend lib/examPublish).
 */
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
    ClipboardCheck, Loader2, Pencil, FileSpreadsheet, Send, Undo2, BarChart3, Printer, Trash2, CalendarRange, CircleDot,
} from "lucide-react";
import api from "@/lib/api";
import { useModuleCrud } from "@/contexts/PermissionsContext";

const INK = "#1f2937";          // deep indigo headings
const ACCENT = "#534AB7";       // ShuleCloud brand
const border = { border: "0.5px solid #e5e7eb" };
const fmtDate = (d: string | null | undefined) => (d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—");

type ClassRow = { classId: string; className: string; students: number; subjects: number; marks: number; updatedAt: string | null; status: "Published" | "Pending"; publishedAt: string | null; publishedBy: string | null; changedBy: string | null };
type ExamRow = { _id: string; title: string; examName: string; type: string; term: string; academicYear: string; classes: ClassRow[]; manual: boolean };

export default function ManageExams() {
    const nav = useNavigate();
    const qc = useQueryClient();
    const crud = useModuleCrud("exams");
    const canEdit = crud.canUpdate;
    const canDelete = crud.canDelete;
    const thisYear = String(new Date().getFullYear());
    const [year, setYear] = useState(thisYear);
    const [busy, setBusy] = useState("");

    const { data: all } = useQuery({ queryKey: ["exam_publishing_years"], queryFn: async () => (await api.get("/exam-publishing")).data });
    const years: string[] = useMemo(() => {
        const ys: string[] = ((all?.years || []) as { year: string }[]).map(y => y.year);
        return ys.includes(thisYear) ? ys : [thisYear, ...ys];
    }, [all, thisYear]);
    const { data, isLoading } = useQuery({ queryKey: ["exam_publishing", year], queryFn: async () => (await api.get("/exam-publishing", { params: { year } })).data });
    const terms: { term: string; exams: ExamRow[] }[] = useMemo(() => data?.years?.[0]?.terms || [], [data]);

    const refresh = () => { qc.invalidateQueries({ queryKey: ["exam_publishing"] }); qc.invalidateQueries({ queryKey: ["exam_publishing_years"] }); qc.invalidateQueries({ queryKey: ["an_exams"] }); };
    const act = useMutation({
        mutationFn: async ({ kind, exam, row }: { kind: "publish" | "unpublish" | "delete-results"; exam: ExamRow; row: ClassRow }) =>
            (await api.post(`/exam-publishing/${exam._id}/${kind}`, { classId: row.classId, className: row.className })).data,
        onMutate: ({ exam, row }) => setBusy(`${exam._id}|${row.classId || row.className}`),
        onSuccess: (d: { message?: string }) => { toast.success(d.message || "Done"); refresh(); },
        onError: (e: { response?: { data?: { message?: string } } }) => toast.error(e?.response?.data?.message || "Could not do that"),
        onSettled: () => setBusy(""),
    });
    const confirmDelete = (exam: ExamRow, row: ClassRow) => {
        const typed = window.prompt(`Delete ALL ${row.marks} marks of ${exam.title} for ${row.className}? This cannot be undone.\n\nType DELETE to confirm.`);
        if (typed === "DELETE") act.mutate({ kind: "delete-results", exam, row });
    };

    const actionsFor = (exam: ExamRow, row: ClassRow, align: string) => {
        const key = `${exam._id}|${row.classId || row.className}`;
        const pub = row.status === "Published";
        return (
                                                                    <div className={`flex flex-wrap gap-1.5 ${align}`}>
                                                                        {busy === key && <Loader2 className="w-4 h-4 animate-spin text-slate-400 self-center" />}
                                                                        {canEdit && (pub ? (
                                                                            <button disabled={!!busy} onClick={() => act.mutate({ kind: "unpublish", exam, row })} className="h-8 px-2.5 rounded-lg text-xs font-bold flex items-center gap-1 bg-white text-amber-700 disabled:opacity-50" style={border}><Undo2 className="w-3.5 h-3.5" /> Unpublish</button>
                                                                        ) : (
                                                                            <button disabled={!!busy} onClick={() => act.mutate({ kind: "publish", exam, row })} className="h-8 px-2.5 rounded-lg text-xs font-bold flex items-center gap-1 text-white disabled:opacity-50" style={{ background: ACCENT }}><Send className="w-3.5 h-3.5" /> Publish results</button>
                                                                        ))}
                                                                        <button disabled={!pub} title={pub ? "" : "Publish first"} onClick={() => nav(`/exams/analytics?exam=${exam._id}&class=${encodeURIComponent(row.className)}`)} className="h-8 px-2.5 rounded-lg text-xs font-bold flex items-center gap-1 bg-white disabled:opacity-40" style={{ ...border, color: INK }}><BarChart3 className="w-3.5 h-3.5" /> Analyse</button>
                                                                        <button disabled={!pub} title={pub ? "" : "Publish first"} onClick={() => nav(`/exams/printouts?exam=${exam._id}&class=${encodeURIComponent(row.className)}`)} className="h-8 px-2.5 rounded-lg text-xs font-bold flex items-center gap-1 bg-white disabled:opacity-40" style={{ ...border, color: INK }}><Printer className="w-3.5 h-3.5" /> Print</button>
                                                                        {canDelete && <button disabled={!!busy} onClick={() => confirmDelete(exam, row)} title="Delete this class's marks for this exam" className="h-8 w-8 rounded-lg flex items-center justify-center bg-white text-rose-600 disabled:opacity-50" style={border}><Trash2 className="w-3.5 h-3.5" /></button>}
                                                                    </div>
        );
    };

    const totals = useMemo(() => {
        let pub = 0, pend = 0;
        terms.forEach(t => t.exams.forEach(e => e.classes.forEach(c => (c.status === "Published" ? pub++ : pend++))));
        return { pub, pend };
    }, [terms]);

    return (
        <div className="min-h-screen bg-[#f6f7fb] p-4 sm:p-6">
            <div className="max-w-7xl mx-auto space-y-5">
                {/* header */}
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white" style={{ background: INK }}><ClipboardCheck className="w-5 h-5" /></div>
                        <div>
                            <h1 className="text-xl font-black" style={{ color: INK }}>Manage Exams</h1>
                            <p className="text-xs text-slate-500">Publish results per class. Unpublished results don't appear on merit lists, analytics, report cards or parent portals.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg">{totals.pub} published</span>
                        <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-lg">{totals.pend} pending</span>
                        <label className="flex items-center gap-2 bg-white rounded-xl px-3 h-10" style={border}>
                            <CalendarRange className="w-4 h-4 text-slate-400" />
                            <select value={year} onChange={e => setYear(e.target.value)} className="bg-transparent text-sm font-bold outline-none" style={{ color: INK }}>
                                {years.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </label>
                        <button onClick={() => nav("/exams/printouts")} className="h-10 px-3 rounded-xl text-sm font-bold flex items-center gap-1.5 bg-white" style={{ ...border, color: INK }}><Printer className="w-4 h-4" /> Printouts</button>
                    </div>
                </div>

                {isLoading ? (
                    <div className="py-20 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
                ) : terms.length === 0 ? (
                    <div className="bg-white rounded-2xl p-10 text-center text-slate-500" style={border}>
                        No exams for {year} yet. <button className="font-bold underline" style={{ color: ACCENT }} onClick={() => nav("/exams/create")}>Create an exam</button>
                    </div>
                ) : terms.map(t => (
                    <section key={t.term} className="bg-white rounded-2xl overflow-hidden" style={border}>
                        <div className="px-4 sm:px-5 py-3 flex items-center gap-2" style={{ background: "#f8fafc" }}>
                            <CircleDot className="w-4 h-4 text-slate-500" />
                            <h2 className="text-sm font-black" style={{ color: INK }}>{t.term} · {year}</h2>
                            <span className="text-[11px] text-slate-500">{t.exams.length} exam{t.exams.length === 1 ? "" : "s"}</span>
                        </div>
                        <div className="divide-y divide-slate-100">
                            {t.exams.map(exam => (
                                <div key={exam._id} className="px-4 sm:px-5 py-4">
                                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                                        <div>
                                            <div className="font-black" style={{ color: INK }}>{exam.title}</div>
                                            <div className="text-[11px] text-slate-400">{exam.type || "Exam"}{exam.manual ? "" : " · results shown automatically (created before publishing)"}</div>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <button onClick={() => nav(`/exams/edit/${exam._id}`)} className="h-8 px-3 rounded-lg text-xs font-bold flex items-center gap-1 bg-white" style={{ ...border, color: INK }}><Pencil className="w-3.5 h-3.5" /> Edit exam</button>
                                            <button onClick={() => nav("/exams/marks")} className="h-8 px-3 rounded-lg text-xs font-bold flex items-center gap-1 bg-white" style={{ ...border, color: INK }}><FileSpreadsheet className="w-3.5 h-3.5" /> Enter marks</button>
                                        </div>
                                    </div>
                                    {exam.classes.length === 0 ? (
                                        <p className="text-xs text-slate-400 italic">No marks entered yet.</p>
                                    ) : (
                                        <>
                                        <div className="hidden md:block overflow-x-auto -mx-1">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="text-[10px] font-black uppercase tracking-wide text-slate-400 text-left">
                                                        <th className="px-1 py-1.5">Class</th><th>Status</th><th>Entries</th><th>Last change</th><th>Published by</th><th className="text-right">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {exam.classes.map(row => {
                                                        const key = `${exam._id}|${row.classId || row.className}`;
                                                        const pub = row.status === "Published";
                                                        return (
                                                            <tr key={key} className="border-t border-slate-100">
                                                                <td className="px-1 py-2.5 font-bold" style={{ color: INK }}>{row.className}</td>
                                                                <td>
                                                                    <span className={`text-[11px] font-black px-2 py-0.5 rounded-full ${pub ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{pub ? "Published" : "Pending publishing"}</span>
                                                                </td>
                                                                <td className="text-xs text-slate-600">{row.students} students · {row.subjects} subjects</td>
                                                                <td className="text-xs text-slate-600">{fmtDate(row.updatedAt)}</td>
                                                                <td className="text-xs text-slate-600">{pub ? <>{row.publishedBy || "—"}<div className="text-[10px] text-slate-400">{fmtDate(row.publishedAt)}</div></> : "—"}</td>
                                                                <td className="py-2">
                                                                    {actionsFor(exam, row, "justify-end")}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                        <div className="md:hidden space-y-2">
                                            {exam.classes.map(row => {
                                                const pub = row.status === "Published";
                                                return (
                                                    <div key={row.classId || row.className} className="rounded-xl p-3 bg-slate-50/70" style={border}>
                                                        <div className="flex items-center justify-between gap-2">
                                                            <span className="font-black" style={{ color: INK }}>{row.className}</span>
                                                            <span className={`text-[11px] font-black px-2 py-0.5 rounded-full ${pub ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{pub ? "Published" : "Pending publishing"}</span>
                                                        </div>
                                                        <div className="text-[11px] text-slate-500 mt-1">{row.students} students · {row.subjects} subjects · changed {fmtDate(row.updatedAt)}{pub && row.publishedBy ? ` · published by ${row.publishedBy}` : ""}</div>
                                                        <div className="mt-2">{actionsFor(exam, row, "")}</div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>
                ))}
            </div>
        </div>
    );
}
