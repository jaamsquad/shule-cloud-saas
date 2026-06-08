import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Printer, Award } from "lucide-react";
import { PageTitle } from "../../PortalShell";
import type { StudentCtx } from "../StudentLayout";

type Family = "CBC" | "KCSE" | "Cambridge" | "IB";

const FAMILY_COLOR: Record<Family, string> = {
    CBC: "#10B981",
    KCSE: "#5C67F2",
    Cambridge: "#8B5CF6",
    IB: "#EC4899",
};

const FAMILY_TITLE: Record<Family, string> = {
    CBC: "Competency Based Assessment Report",
    KCSE: "Academic Report Card",
    Cambridge: "Cambridge International Report",
    IB: "IB Academic Report",
};

function levelColor(level: string) {
    return level === "EE" || level === "A" || level === "A*" || level === "7"
        ? "#10B981"
        : level === "ME" || level === "B" || level === "6" || level === "5"
            ? "#5C67F2"
            : level === "AE" || level === "C" || level === "D" || level === "4" || level === "3"
                ? "#F59E0B"
                : "#EF4444";
}

// Renders one exam as a report card styled per the chosen curriculum family.
function ReportCard({ exam, family, school, student, printId, onPrint }:
    { exam: any; family: Family; school: any; student: any; printId: string | null; onPrint: (id: string) => void }) {
    const color = FAMILY_COLOR[family];
    // When printing a single card, hide every other card.
    const hideOnPrint = printId && printId !== exam.examId;

    return (
        <div className={`bg-white rounded-md shadow-sm border-2 mb-6 overflow-hidden break-inside-avoid ${hideOnPrint ? "print:hidden" : ""}`} style={{ borderColor: color }}>
            {/* Report header */}
            <div className="relative text-center px-5 py-4 border-b-2" style={{ borderColor: color }}>
                <button onClick={() => onPrint(exam.examId)} title="Print this report"
                    className="print:hidden absolute right-4 top-4 inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded text-white" style={{ background: color }}>
                    <Printer className="w-3.5 h-3.5" /> Print
                </button>
                {school?.crest && <img src={school.crest} className="h-12 mx-auto mb-1 object-contain" />}
                <p className="font-black text-lg" style={{ color }}>{(school?.name || "").toUpperCase()}</p>
                <p className="font-bold text-sm text-slate-700 uppercase tracking-wide">{FAMILY_TITLE[family]}</p>
                <p className="text-xs text-slate-500">{exam.examName} · {exam.term}{exam.academicYear ? ` · ${exam.academicYear}` : ""}</p>
            </div>

            {/* Student strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 px-5 py-3 text-xs" style={{ background: `${color}10` }}>
                <span>Name: <strong className="text-slate-800">{student?.name}</strong></span>
                <span>Reg. No: <strong className="text-slate-800">{student?.registrationNo || "—"}</strong></span>
                <span>Class: <strong className="text-slate-800">{student?.class || "—"}</strong></span>
                <span>Subjects: <strong className="text-slate-800">{exam.subjects?.length || 0}</strong></span>
            </div>

            {/* Subjects table */}
            <div className="overflow-x-auto px-5 py-4">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-white" style={{ background: color }}>
                            <th className="text-left px-2 py-1.5">Subject</th>
                            <th className="px-2 py-1.5">Marks</th>
                            <th className="px-2 py-1.5">%</th>
                            {family === "CBC" && <th className="px-2 py-1.5">Level</th>}
                            {family === "KCSE" && <><th className="px-2 py-1.5">Grade</th><th className="px-2 py-1.5">Pts</th></>}
                            {family === "Cambridge" && <th className="px-2 py-1.5">Grade</th>}
                            {family === "IB" && <th className="px-2 py-1.5">Pts /7</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {exam.subjects?.map((s: any, i: number) => (
                            <tr key={i} className="border-b border-slate-100">
                                <td className="px-2 py-1.5 font-semibold text-slate-700">{s.name}</td>
                                <td className="px-2 py-1.5 text-center text-slate-600">{s.marks}/{s.outOf}</td>
                                <td className="px-2 py-1.5 text-center text-slate-600">{s.percent}%</td>
                                {family === "CBC" && <td className="px-2 py-1.5 text-center font-black" style={{ color: levelColor(s.level) }}>{s.level}</td>}
                                {family === "KCSE" && <><td className="px-2 py-1.5 text-center font-black" style={{ color: levelColor(s.grade) }}>{s.grade}</td><td className="px-2 py-1.5 text-center font-bold">{s.points}</td></>}
                                {family === "Cambridge" && <td className="px-2 py-1.5 text-center font-black" style={{ color: levelColor(s.grade) }}>{s.grade}</td>}
                                {family === "IB" && <td className="px-2 py-1.5 text-center font-black" style={{ color: levelColor(s.level) }}>{s.points}</td>}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Summary footer */}
            <div className="px-5 py-3 flex flex-wrap gap-x-6 gap-y-1 text-sm font-bold" style={{ background: `${color}10` }}>
                <span className="text-slate-600">Mean Score: <span style={{ color }}>{Number(exam.average || 0).toFixed(1)}%</span></span>
                {family === "CBC"
                    ? <span className="text-slate-600">Overall Level: <span style={{ color: levelColor(exam.meanLevel) }}>{exam.meanLevel}</span></span>
                    : <span className="text-slate-600">Mean Grade: <span style={{ color: levelColor(exam.meanGrade) }}>{exam.meanGrade}</span></span>}
                {(family === "KCSE" || family === "IB") && <span className="text-slate-600">Total Points: <span style={{ color }}>{exam.points}</span></span>}
            </div>

            {family === "CBC" && (
                <div className="px-5 pb-4 flex flex-wrap gap-3 text-[11px] font-bold">
                    <span className="text-emerald-600">EE: 80–100%</span>
                    <span className="text-indigo-600">ME: 60–79%</span>
                    <span className="text-amber-600">AE: 40–59%</span>
                    <span className="text-rose-600">BE: 0–39%</span>
                </div>
            )}
        </div>
    );
}

export default function ExamResults() {
    const { api } = useOutletContext<StudentCtx>();
    const [term, setTerm] = useState<string>("");
    const [printId, setPrintId] = useState<string | null>(null);

    // Print only the selected card: apply the hide classes, then print, then reset.
    useEffect(() => {
        if (!printId) return;
        const t = setTimeout(() => { window.print(); setPrintId(null); }, 60);
        return () => clearTimeout(t);
    }, [printId]);

    const { data, isLoading } = useQuery({
        queryKey: ["sp_report_card", term],
        queryFn: async () => (await api.get(`/student-portal/report-card${term ? `?term=${encodeURIComponent(term)}` : ""}`)).data,
        retry: false,
    });

    const family: Family = data?.template?.family || "KCSE";
    const results: any[] = data?.results || [];
    const terms: string[] = data?.terms || [];

    return (
        <>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 print:hidden">
                <PageTitle title="Exam Results" />
                <div className="flex items-center gap-2">
                    {terms.length > 0 && (
                        <select
                            value={term || data?.term || ""}
                            onChange={e => setTerm(e.target.value)}
                            className="h-10 px-3 border border-black/10 rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#159a52]/40"
                        >
                            {terms.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    )}
                    <button onClick={() => { setPrintId(null); setTimeout(() => window.print(), 60); }}
                        className="inline-flex items-center gap-2 bg-[#0f2942] hover:bg-[#15395c] text-white text-sm font-bold px-4 py-2 rounded">
                        <Printer className="w-4 h-4" /> Print All
                    </button>
                </div>
            </div>

            {data?.template && (
                <p className="text-xs text-slate-500 mb-4 print:hidden">
                    Rendered using your school's <strong>{family}</strong> report-card template
                    {data.template.id ? ` (${data.template.id})` : ""}.
                </p>
            )}

            {isLoading ? (
                <div className="flex items-center gap-2 text-slate-400 text-sm py-10 justify-center">
                    <Loader2 className="w-5 h-5 animate-spin" /> Loading results…
                </div>
            ) : results.length === 0 ? (
                <div className="bg-white rounded-md shadow-sm border border-black/5 text-center py-12 text-slate-400">
                    <Award className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    <p className="text-sm font-semibold">No exam results published{term ? ` for ${term}` : ""} yet.</p>
                </div>
            ) : (
                results.map(exam => (
                    <ReportCard key={exam.examId} exam={exam} family={family} school={data.school} student={data.student}
                        printId={printId} onPrint={setPrintId} />
                ))
            )}
        </>
    );
}
