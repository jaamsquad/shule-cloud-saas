/**
 * The report-card layouts a school can choose on Settings → Report Card Templates.
 *
 *   annual_exam    – navy · marks table, result-analysis chart, comments, three signatures
 *   progress_report– blue · marks table, performance chart, assessment key, special comments
 *   class_test     – grey · marks table with totals, exam-by-exam progress, chart, grade boundaries
 *   term_end       – teal · subject/marks/percentage/grade, comments, grade boundaries
 *
 * "scholarsheet" is the school's existing A4 format; it is printed from the ScholarSheet page.
 * All layouts are plain inline-styled markup so they print identically from any window.
 */
import type { ReactNode } from "react";

export interface LayoutProps {
    schoolName: string;
    schoolTagline?: string;
    schoolAddress?: string;
    schoolLogo?: string;
    studentName: string;
    admNo: string;
    studentPhoto?: string | null;
    className: string;
    periodLabel: string;
    examName: string;
    examDate: string;
    marks: any[];
    totalMax: number;
    totalObtained: number;
    overall: number;
    overallGrade: string;
    overallStatus: string;
    getGradeForPct: (pct: number) => string;
    getStatusForPct: (pct: number) => string;
    termProgress?: any[];
    gradingScale?: any[];
    passMark?: number;
    subjectTeachers?: Record<string, string>;
    /** per-subject class average / topper as percentages, keyed by lower-case subject name */
    classStats?: Record<string, { avg: number; top: number }>;
    comments?: { classTeacher?: string; principal?: string };
    /** principal's signature and school stamp (Institute Profile) */
    signature?: string; stamp?: string; signerName?: string; signerTitle?: string;
}

const pctOf = (m: any) => (!m.noMarks && Number(m.totalMarks) > 0 ? Math.round((Number(m.marksObtained) / Number(m.totalMarks)) * 100) : null);

function Logo({ logo, name, size = 66 }: { logo?: string; name: string; size?: number }) {
    if (logo) return <img src={logo} alt="" style={{ width: size, height: size, objectFit: "contain", flexShrink: 0 }} />;
    const ini = name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
    return <div style={{ width: size, height: size, borderRadius: "50%", background: "#1e293b", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: size / 3, flexShrink: 0 }}>{ini}</div>;
}

function Letterhead({ p, big = true }: { p: LayoutProps; big?: boolean }) {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 18, paddingBottom: 10, borderBottom: "1.5px solid #cbd5e1" }}>
            <Logo logo={p.schoolLogo} name={p.schoolName} size={big ? 72 : 60} />
            <div>
                <div style={{ fontSize: big ? 26 : 22, fontWeight: 800, color: "#000", lineHeight: 1.15 }}>{p.schoolName}</div>
                {(p.schoolAddress || p.schoolTagline) && <div style={{ fontSize: 13, marginTop: 5, color: "#222" }}>{p.schoolAddress || p.schoolTagline}</div>}
            </div>
        </div>
    );
}

/** grouped bars: Achieved (red) · Class average (blue) · Class topper (green). Series without data are left out. */
function BarChart({ title, rows, series, tall = 200 }: { title: string; rows: { label: string; v: (number | null)[] }[]; series: { name: string; color: string }[]; tall?: number }) {
    const W = 720, padL = 46, padR = 14, padT = 26, padB = 42;
    const H = tall + padT + padB, cw = W - padL - padR;
    const n = rows.length || 1, groupW = cw / n, barW = Math.min(26, (groupW * 0.78) / series.length);
    const y = (v: number) => padT + tall - (Math.max(0, Math.min(100, v)) / 100) * tall;
    return (
        <div style={{ border: "1px solid #444", padding: "6px 6px 4px", marginTop: 12, breakInside: "avoid" }}>
            <div style={{ textAlign: "center", fontWeight: 700, fontSize: 13, color: "#333" }}>{title}</div>
            <svg viewBox={`0 0 ${W} ${H + 24}`} style={{ width: "100%", height: "auto", display: "block" }}>
                {[0, 25, 50, 75, 100].map(t => (
                    <g key={t}>
                        <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke="#d4d4d8" strokeDasharray="3 3" />
                        <text x={padL - 6} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#111">{t}</text>
                    </g>
                ))}
                <text x={13} y={padT + tall / 2} transform={`rotate(-90 13 ${padT + tall / 2})`} textAnchor="middle" fontSize="12" fontWeight="700">% Marks</text>
                {rows.map((r, gi) => {
                    const gx = padL + gi * groupW + (groupW - barW * series.length) / 2;
                    return (
                        <g key={gi}>
                            {series.map((s, si) => {
                                const v = r.v[si];
                                if (v == null) return null;
                                return (
                                    <g key={si}>
                                        <rect x={gx + si * barW} y={y(v)} width={barW - 2} height={padT + tall - y(v)} fill={s.color} />
                                        <text x={gx + si * barW + (barW - 2) / 2} y={y(v) - 4} textAnchor="middle" fontSize="10.5" fill="#111">{Math.round(v)}</text>
                                    </g>
                                );
                            })}
                            <text x={padL + gi * groupW + groupW / 2} y={padT + tall + 16} textAnchor="middle" fontSize="11.5" fill="#111">{r.label.length > 11 ? r.label.slice(0, 9) + "…" : r.label}</text>
                        </g>
                    );
                })}
                <line x1={padL} x2={W - padR} y1={padT + tall} y2={padT + tall} stroke="#111" />
                <line x1={padL} x2={padL} y1={padT} y2={padT + tall} stroke="#111" />
                <g transform={`translate(${W / 2 - series.length * 62},${H + 2})`}>
                    {series.map((s, i) => (
                        <g key={s.name} transform={`translate(${i * 124},0)`}>
                            <rect width="12" height="12" fill={s.color} /><text x="17" y="11" fontSize="11.5">{s.name}</text>
                        </g>
                    ))}
                </g>
            </svg>
        </div>
    );
}

function chartData(p: LayoutProps) {
    const withStats = !!p.classStats && p.marks.some(m => p.classStats![String(m.subjectName || "").toLowerCase()]);
    const series = [{ name: "Achieved Marks", color: "#ff5555" }, ...(withStats ? [{ name: "Class Avg", color: "#5555ff" }, { name: "Class Topper", color: "#55ff55" }] : [])];
    const rows = p.marks.filter(m => !m.noMarks).map(m => {
        const st = p.classStats?.[String(m.subjectName || "").toLowerCase()];
        return { label: String(m.subjectName || ""), v: [pctOf(m), ...(withStats ? [st ? st.avg : null, st ? st.top : null] : [])] as (number | null)[] };
    });
    return { rows, series };
}

const boundaries = (scale?: any[]) => (scale || []).length
    ? [...scale!].sort((a, b) => b.min - a.min).map(g => `${g.grade} : ${g.max} - ${g.min}`).join(", ")
    : "";

const Lines = ({ text, n = 3 }: { text?: string; n?: number }) => text
    ? <div style={{ fontSize: 12, lineHeight: 1.45, padding: "4px 8px", whiteSpace: "pre-wrap" }}>{text}</div>
    : <div style={{ padding: "2px 8px 4px" }}>{Array.from({ length: n }).map((_, i) => <div key={i} style={{ borderBottom: "1px solid #94a3b8", height: 20 }} />)}</div>;

const Bar = ({ color, children, dark = true }: { color: string; children: ReactNode; dark?: boolean }) => (
    <div style={{ background: color, color: dark ? "#fff" : "#000", fontWeight: 700, fontSize: 13, padding: "5px 9px" }}>{children}</div>
);

const TH = (bg: string, color = "#fff") => ({ background: bg, color, fontWeight: 700, padding: "7px 8px", border: "1px solid #222", fontSize: 12.5 } as const);
const TD = { border: "1px solid #222", padding: "7px 8px", fontSize: 12.5 } as const;

function Info({ rows }: { rows: [string, string][][] }) {
    const cols = Math.max(...rows.map(r => r.length));
    return (
        <table style={{ width: "100%", borderCollapse: "collapse", margin: "10px 0", tableLayout: "fixed" }}><tbody>
            {rows.map((r, i) => (
                <tr key={i}>{r.map(([l, v], j) => (
                    <td key={j} colSpan={j === r.length - 1 ? cols - r.length + 1 : 1} style={{ padding: "5px 12px", fontSize: 13 }}><b>{l} :</b>&nbsp;&nbsp;<span style={{ fontWeight: 400 }}>{v}</span></td>
                ))}</tr>
            ))}
        </tbody></table>
    );
}

const Sign = ({ titles, p }: { titles: string[]; p: LayoutProps }) => (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${titles.length},1fr)`, gap: 22, marginTop: 34, breakInside: "avoid" }}>
        {titles.map(t => {
            const isHead = /principal|head ?teacher|director/i.test(t);
            return (
                <div key={t} style={{ textAlign: "center", fontSize: 12.5, position: "relative" }}>
                    <div style={{ height: 34, position: "relative" }}>
                        {isHead && p.signature && <img src={p.signature} alt="" style={{ position: "absolute", left: "50%", bottom: 2, transform: "translateX(-50%)", maxHeight: 46, maxWidth: 150, objectFit: "contain" }} />}
                    </div>
                    {isHead && p.stamp && <img src={p.stamp} alt="" style={{ position: "absolute", right: -8, bottom: -6, width: 70, height: 70, objectFit: "contain", opacity: 0.88, transform: "rotate(-8deg)" }} />}
                    <div style={{ borderTop: "1.5px solid #111", paddingTop: 4 }}>{isHead && p.signerName ? <>{p.signerName}<br /></> : null}{t}</div>
                </div>
            );
        })}
    </div>
);

const wrap = (children: ReactNode) => <div style={{ padding: "26px 30px", fontFamily: "Arial, Helvetica, sans-serif", color: "#111", background: "#fff" }}>{children}</div>;

// ───────────────────────── 1. Annual examination (navy) ─────────────────────────
export function LayoutAnnual(p: LayoutProps) {
    const c = "#33357f";
    const { rows, series } = chartData(p);
    return wrap(<>
        <Letterhead p={p} />
        <div style={{ textAlign: "center", fontSize: 24, fontWeight: 700, textTransform: "uppercase", margin: "16px 0 4px" }}>{p.examName}</div>
        <Info rows={[[["Student Name", p.studentName], ["Adm No", p.admNo]], [["Class", p.className], ["Period", p.periodLabel]]]} />
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>{["Sr.No", "Subject Name", "Total Marks", "Obtained Marks", "%", "Grade"].map(h => <th key={h} style={TH(c)}>{h}</th>)}</tr></thead>
            <tbody>
                {p.marks.map((m, i) => { const pc = pctOf(m); return (
                    <tr key={i} style={{ background: i % 2 ? "#fff" : "#f8f8ff" }}>
                        <td style={TD}>{i + 1}</td><td style={TD}>{m.subjectName}</td>
                        <td style={{ ...TD, textAlign: "center" }}>{m.totalMarks}</td>
                        <td style={{ ...TD, textAlign: "center" }}>{m.noMarks ? "AB" : m.marksObtained}</td>
                        <td style={{ ...TD, textAlign: "center" }}>{pc == null ? "—" : `${pc}%`}</td>
                        <td style={{ ...TD, textAlign: "center", fontWeight: 700 }}>{pc == null ? "—" : p.getGradeForPct(pc)}</td>
                    </tr>); })}
                <tr style={{ fontWeight: 700 }}>
                    <td colSpan={2} style={{ ...TD, textAlign: "center" }}>Total</td>
                    <td style={{ ...TD, textAlign: "center" }}>{p.totalMax.toFixed(1)}</td><td style={{ ...TD, textAlign: "center" }}>{p.totalObtained.toFixed(1)}</td>
                    <td style={{ ...TD, textAlign: "center" }}>{p.overall}%</td><td style={{ ...TD, textAlign: "center" }}>{p.overallGrade}</td>
                </tr>
            </tbody>
        </table>
        {rows.length > 0 && <BarChart title="Result Analysis" rows={rows} series={series} />}
        <div style={{ border: "1px solid #222", marginTop: 12, breakInside: "avoid" }}>
            <Bar color={c}>Class Teacher's Comments :</Bar>
            <Lines text={p.comments?.classTeacher} />
        </div>
        <Sign titles={["Principal", "HOD", "Homeroom Teacher"]} p={p} />
    </>);
}

// ───────────────────────── 2. Progress report (blue) ─────────────────────────
export function LayoutProgress(p: LayoutProps) {
    const c = "#4a6fa5";
    const { rows, series } = chartData(p);
    const scale = [...(p.gradingScale || [])].sort((a, b) => b.min - a.min);
    return wrap(<>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 10 }}>
            <Logo logo={p.schoolLogo} name={p.schoolName} size={72} />
            <div style={{ flex: 1, textAlign: "center", paddingRight: 72 }}>
                <div style={{ fontWeight: 700, fontSize: 17 }}>{p.schoolName}</div>
                <div style={{ fontWeight: 700, fontSize: 15, textTransform: "uppercase" }}>{p.examName}</div>
                <div style={{ fontWeight: 700, fontSize: 16, marginTop: 14 }}>Progress Report</div>
            </div>
        </div>
        <div style={{ background: c, color: "#fff", padding: "3px 8px", display: "flex", justifyContent: "space-between", fontSize: 12.5, border: "1px solid #222" }}>
            <span>Period : <b>{p.periodLabel}</b></span><span>{p.examDate !== "—" ? `Date : ${p.examDate}` : ""}</span>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "center", marginBottom: 16 }}>
            <thead><tr>{["Student Name", "Class", "Adm No", "Result"].map(h => <th key={h} style={{ ...TD, fontSize: 12, fontWeight: 700 }}>{h}</th>)}</tr></thead>
            <tbody><tr>{[p.studentName, p.className, p.admNo, p.overallStatus].map((v, i) => <td key={i} style={{ ...TD, fontSize: 12 }}>{v}</td>)}</tr></tbody>
        </table>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>{["#", "Subject", "Max Marks", "Marks Obtained", "Overall %"].map(h => <th key={h} style={TH(c)}>{h}</th>)}</tr></thead>
            <tbody>
                {p.marks.map((m, i) => { const pc = pctOf(m); return (
                    <tr key={i}>
                        <td style={{ ...TD, textAlign: "center", width: 36 }}>{i + 1}</td><td style={TD}>{m.subjectName}</td>
                        <td style={{ ...TD, textAlign: "center" }}>{Number(m.totalMarks).toFixed(2)}</td>
                        <td style={{ ...TD, textAlign: "center" }}>{m.noMarks ? "—" : Number(m.marksObtained).toFixed(2)}</td>
                        <td style={{ ...TD, textAlign: "center" }}>{pc == null ? "—" : pc.toFixed(2)}</td>
                    </tr>); })}
                <tr style={{ fontWeight: 700 }}><td colSpan={2} style={{ ...TD, textAlign: "center" }}>Total</td>
                    <td style={{ ...TD, textAlign: "center" }}>{p.totalMax.toFixed(2)}</td><td style={{ ...TD, textAlign: "center" }}>{p.totalObtained.toFixed(2)}</td>
                    <td style={{ ...TD, textAlign: "center" }}>{p.overall.toFixed(2)} · {p.overallGrade}</td></tr>
            </tbody>
        </table>
        {rows.length > 0 && <BarChart title="Examination Performance Analysis" rows={rows.map(r => ({ ...r, v: [r.v[0]] }))} series={[{ name: "Obtained Marks", color: "#ff5555" }]} tall={190} />}
        {scale.length > 0 && (
            <table style={{ borderCollapse: "collapse", margin: "14px 0", width: 300, breakInside: "avoid" }}>
                <thead><tr><th colSpan={3} style={{ ...TH(c), textAlign: "center", fontSize: 14 }}>Assessment Key</th></tr>
                    <tr>{["Grade", "Percentage", "Meaning"].map(h => <th key={h} style={{ ...TH("#dbe6f4", "#000"), fontSize: 11.5 }}>{h}</th>)}</tr></thead>
                <tbody>{scale.map((g, i) => <tr key={i}><td style={{ ...TD, textAlign: "center", fontSize: 12 }}>{g.grade}</td><td style={{ ...TD, textAlign: "center", fontSize: 12 }}>{g.min}% - {g.max}%</td><td style={{ ...TD, fontSize: 11.5 }}>{g.label || ""}</td></tr>)}</tbody>
            </table>
        )}
        <div style={{ border: "1px solid #222", breakInside: "avoid" }}>
            <Bar color={c}>Special Comments :</Bar>
            <Lines text={p.comments?.classTeacher} />
        </div>
        <Sign titles={["Class Teacher", "Principal", "Parent / Guardian"]} p={p} />
    </>);
}

// ───────────────────────── 3. Report card with class tests (grey) ─────────────────────────
export function LayoutClassTest(p: LayoutProps) {
    const g = "#d9d9d9";
    const { rows, series } = chartData(p);
    const prog = (p.termProgress || []).length > 1 ? p.termProgress! : [];
    const bounds = boundaries(p.gradingScale);
    return wrap(<>
        <Letterhead p={p} />
        <div style={{ textAlign: "center", fontSize: 21, fontWeight: 700, margin: "16px 0 6px" }}>{p.examName} Report Card ( {p.periodLabel} )</div>
        <hr style={{ border: 0, borderTop: "1px solid #ccc", margin: "0 0 8px" }} />
        <Info rows={[[["Student Name", p.studentName], ["Adm No", p.admNo]], [["Class", p.className], ["Result", p.overallStatus]]]} />
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>{["Sr.No", "Subject Name", "Total Marks", "Marks Obtained", "%", "Grade"].map(h => <th key={h} style={TH(g, "#000")}>{h}</th>)}</tr></thead>
            <tbody>
                {p.marks.map((m, i) => { const pc = pctOf(m); return (
                    <tr key={i}>
                        <td style={{ ...TD, textAlign: "center", width: 44 }}>{i + 1}</td><td style={TD}>{m.subjectName}</td>
                        <td style={{ ...TD, textAlign: "center" }}>{m.totalMarks}</td>
                        <td style={{ ...TD, textAlign: "center" }}>{m.noMarks ? "—" : m.marksObtained}</td>
                        <td style={{ ...TD, textAlign: "center" }}>{pc == null ? "—" : `${pc}%`}</td>
                        <td style={{ ...TD, textAlign: "center", fontWeight: 700 }}>{pc == null ? "—" : p.getGradeForPct(pc)}</td>
                    </tr>); })}
                <tr style={{ fontWeight: 700 }}><td colSpan={2} style={{ ...TD, textAlign: "center" }}>Total Marks</td>
                    <td colSpan={2} style={{ ...TD, textAlign: "center" }}>{p.totalObtained.toFixed(1)}/{p.totalMax.toFixed(1)}</td>
                    <td colSpan={2} style={{ ...TD, textAlign: "center" }}>{p.overallGrade}</td></tr>
                <tr style={{ fontWeight: 700 }}><td colSpan={2} style={{ ...TD, textAlign: "center" }}>Total Percentage</td>
                    <td colSpan={4} style={{ ...TD, textAlign: "center" }}>{p.overall}%</td></tr>
            </tbody>
        </table>
        {prog.length > 0 && (
            <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 12, breakInside: "avoid" }}>
                <thead><tr><th colSpan={prog.length + 1} style={{ ...TH(g, "#000"), textAlign: "center" }}>Progress Across This Term's Exams</th></tr></thead>
                <tbody>
                    <tr><td style={{ ...TD, fontWeight: 700 }}>Exam</td>{prog.map((e, i) => <td key={i} style={{ ...TD, textAlign: "center", fontSize: 11.5 }}>{e.examName}</td>)}</tr>
                    <tr><td style={{ ...TD, fontWeight: 700 }}>Score</td>{prog.map((e, i) => <td key={i} style={{ ...TD, textAlign: "center" }}>{e.totalObtained ?? "—"}{e.totalMax ? `/${e.totalMax}` : ""}</td>)}</tr>
                    <tr><td style={{ ...TD, fontWeight: 700 }}>%</td>{prog.map((e, i) => <td key={i} style={{ ...TD, textAlign: "center", fontWeight: 700 }}>{e.pct}% {e.grade || ""}</td>)}</tr>
                </tbody>
            </table>
        )}
        {rows.length > 0 && <BarChart title="Result Analysis" rows={rows} series={series} tall={170} />}
        <div style={{ border: "1px solid #444", marginTop: 12, breakInside: "avoid" }}>
            <div style={{ background: g, fontWeight: 700, fontSize: 13, padding: "5px 9px", border: "1px solid #444", borderWidth: "0 0 1px" }}>Class Teacher's Comments :</div>
            <Lines text={p.comments?.classTeacher} />
        </div>
        {bounds && (
            <div style={{ border: "1px solid #444", marginTop: 8, breakInside: "avoid" }}>
                <div style={{ background: g, fontWeight: 700, fontSize: 13, padding: "5px 9px", borderBottom: "1px solid #444" }}>Grade Boundaries :</div>
                <div style={{ fontSize: 12, padding: "5px 9px" }}>{bounds}</div>
            </div>
        )}
        <Sign titles={["Class Teacher", "Principal", "Parent / Guardian"]} p={p} />
    </>);
}

// ───────────────────────── 4. Term end report (teal) ─────────────────────────
export function LayoutTermEnd(p: LayoutProps) {
    const c = "#17a2b8";
    const bounds = boundaries(p.gradingScale);
    const hasTeachers = !!p.subjectTeachers && Object.keys(p.subjectTeachers).length > 0;
    return wrap(<>
        <Letterhead p={p} />
        <div style={{ textAlign: "center", fontSize: 23, fontWeight: 700, margin: "16px 0 4px" }}>Term End Report</div>
        <Info rows={[[["Student Name", p.studentName]], [["Class", p.className], ["Adm No", p.admNo]], [["Period", p.periodLabel], ["Exam", p.examName]]]} />
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>{["Subject", ...(hasTeachers ? ["Teacher"] : []), "Marks", "Percentage", "Grade"].map(h => <th key={h} style={{ ...TH(c, "#000"), textAlign: "center", fontSize: 13 }}>{h}</th>)}</tr></thead>
            <tbody>
                {p.marks.map((m, i) => { const pc = pctOf(m); return (
                    <tr key={i}>
                        <td style={TD}>{m.subjectName}</td>
                        {hasTeachers && <td style={{ ...TD, fontSize: 11.5 }}>{p.subjectTeachers![m.subjectName] || "—"}</td>}
                        <td style={{ ...TD, textAlign: "center" }}>{m.noMarks ? "—" : `${m.marksObtained}/${m.totalMarks}`}</td>
                        <td style={{ ...TD, textAlign: "center" }}>{pc == null ? "—" : `${pc}%`}</td>
                        <td style={{ ...TD, textAlign: "center", fontWeight: 700 }}>{pc == null ? "—" : p.getGradeForPct(pc)}</td>
                    </tr>); })}
                <tr style={{ fontWeight: 700, background: "#eef9fb" }}>
                    <td style={TD} colSpan={hasTeachers ? 2 : 1}>Overall</td>
                    <td style={{ ...TD, textAlign: "center" }}>{p.totalObtained.toFixed(1)}/{p.totalMax.toFixed(1)}</td>
                    <td style={{ ...TD, textAlign: "center" }}>{p.overall}%</td><td style={{ ...TD, textAlign: "center" }}>{p.overallGrade}</td>
                </tr>
            </tbody>
        </table>
        <div style={{ border: "1px solid #222", marginTop: 12, breakInside: "avoid" }}>
            <Bar color={c}><span style={{ color: "#000" }}>Class Teacher's Comments :</span></Bar>
            <Lines text={p.comments?.classTeacher} />
        </div>
        {p.comments?.principal !== undefined && (
            <div style={{ border: "1px solid #222", marginTop: 10, breakInside: "avoid" }}>
                <Bar color={c}><span style={{ color: "#000" }}>Principal's Comments :</span></Bar>
                <Lines text={p.comments.principal} />
            </div>
        )}
        {bounds && (
            <div style={{ border: "1px solid #222", marginTop: 10, breakInside: "avoid" }}>
                <Bar color={c}><span style={{ color: "#000" }}>Grade Boundaries :</span></Bar>
                <div style={{ fontSize: 12.5, padding: "6px 9px" }}>{bounds}</div>
            </div>
        )}
        <Sign titles={["Class Teacher", "Principal", "Parent / Guardian"]} p={p} />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginTop: 18, color: "#333" }}><span>{p.studentName}</span><span>{p.schoolName}</span></div>
    </>);
}
