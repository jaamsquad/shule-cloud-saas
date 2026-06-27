import { useQuery } from "@tanstack/react-query";
import { Loader2, Printer } from "lucide-react";
import api from "@/lib/api";

// ScholarSheet — the classic A4 academic report card.
// Black & white only (colour permitted solely for the logo + student photo).
// Subjects are curriculum-driven (from the class) and grades use the chosen
// grading scale — both resolved by the backend /reports/scholar-sheet endpoint.
// Designed to fit ONE A4 page via print media queries.
export default function ScholarSheetReportCard({ studentId, examId, showKcpe = true, hideToolbar = false, preloaded }: { studentId: string; examId: string; showKcpe?: boolean; hideToolbar?: boolean; preloaded?: any }) {
    // When the parent page has already fetched the data (whole-class print), use
    // it directly so the card never shows a spinner mid-print. Otherwise fetch.
    const { data: fetched, isLoading } = useQuery({
        queryKey: ["scholar_sheet", studentId, examId],
        enabled: !preloaded && !!studentId && !!examId,
        queryFn: async () => (await api.get(`/reports/scholar-sheet/${studentId}`, { params: { examId } })).data,
    });
    const data = preloaded || fetched;

    if (!preloaded && isLoading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;
    if (!data) return <div className="p-8 text-center text-slate-400">No report data.</div>;

    const d = data;
    const maxChart = Math.max(12.5, ...((d.chart || []).map((c: any) => c.value)));
    // Chart bars = only the (level, term) points that have data + a Target.
    const chartBars = [...(d.chart || []), { label: "Target", value: maxChart, target: true }];
    // History grid: render only the levels & terms that actually have data.
    const levels: number[] = d.levels?.length ? d.levels : [];
    const terms: number[] = d.terms?.length ? d.terms : [];
    const levelPrefix: string = d.levelSystem || "Form";   // "Form" | "Grade"
    const hist = (lvl: number, t: number) => d.history?.[`l${lvl}t${t}`];

    return (
        <div className="bg-white">
            {/* Toolbar (screen only; hidden when the parent page provides its own) */}
            {!hideToolbar && (
                <div className="print:hidden flex justify-end p-3 gap-2 bg-slate-50 border-b">
                    <button onClick={() => window.print()} className="h-9 px-4 rounded-lg bg-slate-800 text-white text-sm font-bold flex items-center gap-1.5"><Printer className="w-4 h-4" /> Print</button>
                </div>
            )}

            <style>{`
                ${hideToolbar ? "" : "@page { size: A4 portrait; margin: 8mm; }"}
                @media print { .no-print { display: none !important; } body { -webkit-print-color-adjust: exact; } .rc { break-inside: avoid; } }
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
                        <td>Subject</td><td style={{ textAlign: "center" }}>END TERM</td><td style={{ textAlign: "center" }}>Point</td><td style={{ textAlign: "center" }}>Grade</td><td style={{ textAlign: "center" }}>Pos</td><td>Remarks</td><td style={{ textAlign: "center" }}>Initials</td>
                    </tr>
                    {(d.subjects || []).map((s: any, i: number) => (
                        <tr key={i}>
                            <td style={{ textTransform: "uppercase" }}>{s.subject}</td>
                            <td style={{ textAlign: "center" }}>{Math.round(s.mark)}/{Math.round(s.outOf)}</td>
                            <td style={{ textAlign: "center" }}>{s.point}</td>
                            <td style={{ textAlign: "center" }}>{s.grade}</td>
                            <td style={{ textAlign: "center" }}>{s.position}</td>
                            <td style={{ textTransform: "uppercase" }}>{s.remark}</td>
                            <td style={{ textAlign: "center" }}>{s.initials || "-"}</td>
                        </tr>
                    ))}
                </tbody></table>

                {/* Performance line graph (B&W) — mean points per term */}
                {chartBars.length > 1 && (() => {
                    const W = 180, H = 70, padL = 10, padR = 6, padT = 6, padB = 14;   // viewBox units
                    const n = chartBars.length;
                    const x = (i: number) => padL + (n <= 1 ? 0 : (i * (W - padL - padR)) / (n - 1));
                    const y = (v: number) => padT + (H - padT - padB) * (1 - (maxChart ? v / maxChart : 0));
                    const pts = chartBars.map((c: any, i: number) => `${x(i)},${y(c.value)}`).join(" ");
                    return (
                        <div style={{ border: "0.6px solid #000", marginTop: 3 }}>
                            <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "30mm" }} preserveAspectRatio="none">
                                {/* gridlines */}
                                {[0, 0.25, 0.5, 0.75, 1].map(g => <line key={g} x1={padL} x2={W - padR} y1={padT + (H - padT - padB) * g} y2={padT + (H - padT - padB) * g} stroke="#ddd" strokeWidth={0.3} />)}
                                {/* the performance line */}
                                <polyline points={pts} fill="none" stroke="#000" strokeWidth={0.8} />
                                {chartBars.map((c: any, i: number) => (
                                    <g key={i}>
                                        <circle cx={x(i)} cy={y(c.value)} r={1.2} fill="#000" />
                                        {!c.target && <text x={x(i)} y={y(c.value) - 2} fontSize={5} textAnchor="middle">{c.value}</text>}
                                        <text x={x(i)} y={H - 4} fontSize={5} textAnchor="middle">{c.label}</text>
                                    </g>
                                ))}
                            </svg>
                        </div>
                    );
                })()}

                {/* Historical grid — only the levels & terms that have data */}
                {levels.length > 0 && terms.length > 0 && (
                    <table style={{ marginTop: 3, textAlign: "center" }}><tbody>
                        <tr style={{ fontWeight: 700 }}>
                            <td></td>
                            {levels.map(l => <td key={l} colSpan={terms.length}>{levelPrefix} {l}</td>)}
                        </tr>
                        <tr style={{ fontWeight: 700 }}>
                            <td></td>
                            {levels.flatMap(l => terms.map(t => <td key={`${l}-${t}`}>T{t}</td>))}
                        </tr>
                        {(["mp", "mg"] as const).map(metric => (
                            <tr key={metric}>
                                <td style={{ fontWeight: 700 }}>{metric.toUpperCase()}</td>
                                {levels.flatMap(l => terms.map(t => { const h = hist(l, t); return <td key={`${metric}-${l}-${t}`}>{h ? (h as any)[metric] ?? "-" : "-"}</td>; }))}
                            </tr>
                        ))}
                    </tbody></table>
                )}

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
