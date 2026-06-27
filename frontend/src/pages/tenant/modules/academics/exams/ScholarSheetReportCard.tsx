import { useQuery } from "@tanstack/react-query";
import { Loader2, Printer } from "lucide-react";
import api from "@/lib/api";

// ScholarSheet — the classic A4 academic report card.
// Black & white only (colour permitted solely for the logo + student photo).
// Subjects are curriculum-driven (from the class) and grades use the chosen
// grading scale — both resolved by the backend /reports/scholar-sheet endpoint.
// Designed to fit ONE A4 page via print media queries.
export default function ScholarSheetReportCard({ studentId, examId, showKcpe = true, hideToolbar = false }: { studentId: string; examId: string; showKcpe?: boolean; hideToolbar?: boolean }) {
    const { data, isLoading } = useQuery({
        queryKey: ["scholar_sheet", studentId, examId],
        enabled: !!studentId && !!examId,
        queryFn: async () => (await api.get(`/reports/scholar-sheet/${studentId}`, { params: { examId } })).data,
    });

    if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;
    if (!data) return <div className="p-8 text-center text-slate-400">No report data.</div>;

    const d = data;
    const maxChart = Math.max(12.5, ...((d.chart || []).map((c: any) => c.value)));
    const TERMS = [["f1Tm1", "f1Tm2", "f1Tm3"], ["f2Tm1", "f2Tm2", "f2Tm3"], ["f3Tm1", "f3Tm2", "f3Tm3"], ["f4Tm1", "f4Tm2", "f4Tm3"], ["Target"]].flat();
    const hist = (f: number, t: number) => d.history?.[`f${f}t${t}`];

    return (
        <div className="bg-white">
            {/* Toolbar (screen only; hidden when the parent page provides its own) */}
            {!hideToolbar && (
                <div className="print:hidden flex justify-end p-3 gap-2 bg-slate-50 border-b">
                    <button onClick={() => window.print()} className="h-9 px-4 rounded-lg bg-slate-800 text-white text-sm font-bold flex items-center gap-1.5"><Printer className="w-4 h-4" /> Print</button>
                </div>
            )}

            <style>{`
                @page { size: A4 portrait; margin: 8mm; }
                @media print { .no-print { display: none !important; } body { -webkit-print-color-adjust: exact; } }
                .rc { width: 194mm; margin: 0 auto; color: #000; font-family: 'Times New Roman', Georgia, serif; font-size: 10px; line-height: 1.15; }
                .rc table { width: 100%; border-collapse: collapse; }
                .rc td, .rc th { border: 0.6px solid #000; padding: 1.5px 3px; }
                .rc .nb td, .rc .nb th { border: none; }
                .rc h1 { font-size: 20px; font-weight: 800; letter-spacing: .5px; margin: 0; }
                .rc .muted { font-size: 9px; }
            `}</style>

            <div className="rc p-2">
                {/* Header */}
                <table className="nb"><tbody><tr>
                    <td style={{ width: "16mm", verticalAlign: "top" }}>{d.school.logo ? <img src={d.school.logo} alt="logo" style={{ width: "15mm", height: "15mm", objectFit: "contain" }} /> : null}</td>
                    <td style={{ verticalAlign: "top" }}>
                        <h1>{d.school.name || "SCHOOL NAME"}</h1>
                        <div className="muted">{d.school.box}{d.school.tel ? ` Tel : ${d.school.tel}` : ""}</div>
                        <div className="muted" style={{ fontStyle: "italic" }}>{d.school.motto}</div>
                        <div style={{ fontWeight: 700, marginTop: 2 }}>Report Form</div>
                    </td>
                    <td style={{ width: "55mm", verticalAlign: "top", textAlign: "right" }} className="muted">Issue Date : <b>{d.issueDate}</b></td>
                </tr></tbody></table>

                {/* Term/Year + class line */}
                <table className="nb" style={{ marginTop: 3 }}><tbody><tr>
                    <td style={{ fontWeight: 700 }}>{d.termYear}</td>
                    <td style={{ textAlign: "right" }} className="muted">Class : <b>{d.student.className}</b>&nbsp;&nbsp; House : {d.student.house || "—"}</td>
                </tr></tbody></table>

                {/* Student info */}
                <table style={{ marginTop: 2 }}><tbody><tr>
                    <td>Name : <b>{d.student.name}</b></td>
                    <td style={{ width: "32mm" }}>Adm No : <b>{d.student.adm}</b></td>
                </tr></tbody></table>

                {/* Summary row */}
                <table style={{ marginTop: 2 }}><tbody>
                    <tr style={{ fontWeight: 700, textAlign: "center" }}>
                        <td>Total Marks</td><td>Mean Score</td><td>Total Points</td><td>Mean Point</td><td>Mean Grade</td><td>Class Pos</td><td>Level Pos(Overall)</td>
                    </tr>
                    <tr style={{ textAlign: "center" }}>
                        <td>{d.summary.totalMarks}</td><td>{d.summary.meanScore}</td><td>{d.summary.totalPoints}</td><td>{d.summary.meanPoint}</td><td>{d.summary.meanGrade}</td><td>{d.summary.classPos}</td><td>{d.summary.levelPos}</td>
                    </tr>
                </tbody></table>

                {/* KCPE row (toggleable) */}
                {showKcpe && (
                    <table style={{ marginTop: 1 }}><tbody><tr style={{ textAlign: "center" }}>
                        <td>KCPE Marks : <b>{d.kcpe.marks}</b></td><td>KCPE Rank : <b>{d.kcpe.rank}</b></td><td>KCPE Mean : <b>{d.kcpe.mean}</b></td><td>Value Added : <b>{d.kcpe.valueAdded}</b></td>
                    </tr></tbody></table>
                )}

                {/* Subject table */}
                <table style={{ marginTop: 3 }}><tbody>
                    <tr style={{ fontWeight: 700 }}>
                        <td>Subject</td><td style={{ textAlign: "center" }}>END TERM</td><td style={{ textAlign: "center" }}>Out of</td><td style={{ textAlign: "center" }}>Total</td><td style={{ textAlign: "center" }}>Point</td><td style={{ textAlign: "center" }}>Grade</td><td style={{ textAlign: "center" }}>Pos</td><td>Remarks</td><td style={{ textAlign: "center" }}>Initials</td>
                    </tr>
                    {(d.subjects || []).map((s: any, i: number) => (
                        <tr key={i}>
                            <td style={{ textTransform: "uppercase" }}>{s.subject}</td>
                            <td style={{ textAlign: "center" }}>{s.mark.toFixed(1)}</td>
                            <td style={{ textAlign: "center" }}>{s.outOf.toFixed(1)}</td>
                            <td style={{ textAlign: "center" }}>{s.total}</td>
                            <td style={{ textAlign: "center" }}>{s.point}</td>
                            <td style={{ textAlign: "center" }}>{s.grade}</td>
                            <td style={{ textAlign: "center" }}>{s.position}</td>
                            <td style={{ textTransform: "uppercase" }}>{s.remark}</td>
                            <td style={{ textAlign: "center" }}>{s.initials || "-"}</td>
                        </tr>
                    ))}
                </tbody></table>

                {/* Term bar chart (B&W) */}
                <div style={{ border: "0.6px solid #000", marginTop: 3, padding: "2px 4px", height: "30mm", position: "relative" }}>
                    <div style={{ display: "flex", alignItems: "flex-end", height: "24mm", gap: 2 }}>
                        {TERMS.map((label) => {
                            const v = label === "Target" ? maxChart : (d.chart?.find((c: any) => c.label === label)?.value || 0);
                            const h = maxChart ? (v / maxChart) * 100 : 0;
                            return (
                                <div key={label} style={{ flex: 1, textAlign: "center", height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                                    <div style={{ height: `${h}%`, background: "#bdbdbd", border: "0.6px solid #000", width: "70%", margin: "0 auto" }} />
                                </div>
                            );
                        })}
                    </div>
                    <div style={{ display: "flex", gap: 2 }}>
                        {TERMS.map((label) => <div key={label} style={{ flex: 1, textAlign: "center", fontSize: 7 }}>{label}</div>)}
                    </div>
                </div>

                {/* Historical grid Form 1-4 × T1-T3 */}
                <table style={{ marginTop: 3, textAlign: "center" }}><tbody>
                    <tr style={{ fontWeight: 700 }}>
                        <td></td>
                        {[1, 2, 3, 4].map(f => <td key={f} colSpan={3}>Form {f}</td>)}
                    </tr>
                    <tr style={{ fontWeight: 700 }}>
                        <td></td>
                        {[1, 2, 3, 4].flatMap(f => [1, 2, 3].map(t => <td key={`${f}-${t}`}>T{t}</td>))}
                    </tr>
                    {(["mp", "mg", "pos"] as const).map(metric => (
                        <tr key={metric}>
                            <td style={{ fontWeight: 700 }}>{metric.toUpperCase()}</td>
                            {[1, 2, 3, 4].flatMap(f => [1, 2, 3].map(t => { const h = hist(f, t); return <td key={`${metric}-${f}-${t}`}>{h ? (h as any)[metric] || "-" : "-"}</td>; }))}
                        </tr>
                    ))}
                </tbody></table>

                {/* Comments + signatures */}
                <table style={{ marginTop: 3 }}><tbody>
                    <tr><td style={{ height: "11mm", verticalAlign: "top" }}><b>Class Teacher's Comments :</b><div>{d.comments.classTeacher}</div></td>
                        <td style={{ width: "45mm", verticalAlign: "bottom" }}>Signature : ____________</td></tr>
                    <tr><td style={{ height: "11mm", verticalAlign: "top" }}><b>Principal's Comments :</b><div>{d.comments.principal}</div><div style={{ marginTop: 6 }}>{d.comments.principalName}</div></td>
                        <td style={{ verticalAlign: "bottom" }}>Signature : ____________</td></tr>
                    <tr><td style={{ height: "9mm", verticalAlign: "top" }}><b>Report Seen By Parent/Guardian :</b><div style={{ marginTop: 6 }} className="muted">Date : __________ &nbsp; Signature : __________</div></td>
                        <td style={{ verticalAlign: "top" }}>Next Term Begins On : <b>{d.nextTermBegins || "—"}</b></td></tr>
                </tbody></table>

                <div className="muted" style={{ textAlign: "center", marginTop: 3 }}>ShuleCloud School System | www.shulecloud.com</div>
            </div>
        </div>
    );
}
