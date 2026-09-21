/**
 * Print-ready report card templates that match the previews in ReportCardTemplates settings page.
 * Each template receives the same props and renders a full-page print layout.
 */

interface PrintProps {
    schoolName: string;
    schoolTagline: string;
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
    passMark?: number;
    gradingScale?: any[];
    curriculumId?: string;
    subjectTeachers?: Record<string, string>; // subjectName → teacherName
    qrUrl?: string; // QR image (data URL) that opens the online verification page
}

// Shared logo block — shows img if available, else colored initials
const LogoBlock = ({ logo, name, color = "#1e3a8a" }: { logo?: string; name: string; color?: string }) => {
    const initials = name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
    return logo
        ? <img src={logo} alt={name} style={{ width: 56, height: 56, objectFit: 'contain', borderRadius: 8, flexShrink: 0, border: '1px solid #e2e8f0', background: '#fff', padding: 3 }} />
        : <div style={{ width: 56, height: 56, borderRadius: '50%', background: color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 900, flexShrink: 0 }}>{initials}</div>;
};

// Shared student photo block
const PhotoBlock = ({ photo, name }: { photo?: string | null; name: string }) => photo
    ? <img src={photo} alt={name} style={{ width: 80, height: 100, objectFit: 'cover', borderRadius: 8, border: '2px solid #e2e8f0', flexShrink: 0 }} />
    : <div style={{ width: 80, height: 100, border: '2px solid #e2e8f0', borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 9, background: '#f8fafc', flexShrink: 0 }}>
        <span style={{ fontSize: 22 }}>👤</span><span style={{ marginTop: 4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Photo</span>
      </div>;

// Helper to render a mark row (handles "no marks" = null/undefined marksObtained)
const MarkRow = ({ m, i, pct, grade, status, accentColor }: { m: any; i: number; pct: number | null; grade: string; status: string; accentColor: string }) => (
    <tr style={{ borderBottom: '1px solid #e2e8f0', opacity: m.noMarks ? 0.55 : 1 }}>
        <td style={{ padding: '6px 10px' }}>{i + 1}</td>
        <td style={{ padding: '6px 10px', fontWeight: 700 }}>{m.subjectName}</td>
        <td style={{ padding: '6px 10px', textAlign: 'center' }}>{m.totalMarks}</td>
        <td style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 900, color: m.noMarks ? '#94a3b8' : accentColor }}>{m.noMarks ? '—' : m.marksObtained}</td>
        <td style={{ padding: '6px 10px', textAlign: 'center', color: m.noMarks ? '#94a3b8' : (pct !== null && pct >= 50 ? '#059669' : '#dc2626') }}>{m.noMarks ? '—' : `${pct}%`}</td>
        <td style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 900, color: m.noMarks ? '#94a3b8' : accentColor }}>{grade}</td>
        <td style={{ padding: '6px 10px', color: '#64748b' }}>{m.noMarks ? 'Pending' : status}</td>
    </tr>
);

// ── Term Progress Table — HORIZONTAL layout (exams as columns, metrics as rows) ──
// This compact format takes far less vertical space than the original vertical layout.
const TermProgressTable = ({ termProgress, accentColor = '#5C67F2' }: { termProgress?: any[]; accentColor?: string }) => {
    if (!termProgress || termProgress.length < 2) return null;
    const rows = [
        { label: 'Obtained', key: 'totalObtained', fmt: (v: any) => v, bold: true, color: accentColor },
        { label: 'Max',      key: 'totalMax',      fmt: (v: any) => v, bold: false, color: '#64748b' },
        { label: '%',        key: 'pct',            fmt: (v: any, p: any) => `${v}%`, bold: true, colorFn: (p: any) => p.pct >= 50 ? '#059669' : '#dc2626' },
        { label: 'Grade',    key: 'grade',          fmt: (v: any) => v, bold: true, color: accentColor },
        { label: 'Trend',    key: '_trend',         fmt: (v: any, _: any, idx: number) => {
            if (idx === 0) return '—';
            const prev = termProgress[idx - 1];
            const cur  = termProgress[idx];
            return cur.pct > prev.pct ? '▲' : cur.pct < prev.pct ? '▼' : '→';
        }, bold: true, colorFn: (_: any, idx: number) => {
            if (idx === 0) return '#94a3b8';
            const prev = termProgress[idx - 1];
            const cur  = termProgress[idx];
            return cur.pct > prev.pct ? '#059669' : cur.pct < prev.pct ? '#dc2626' : '#94a3b8';
        }},
    ];

    return (
        <div style={{ marginTop: 12, marginBottom: 8 }}>
            <p style={{ fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 2, color: accentColor, marginBottom: 5 }}>
                Term Progress — {termProgress.length} Exams
            </p>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
                <thead>
                    <tr>
                        {/* Left header column */}
                        <th style={{ padding: '5px 8px', background: '#1e293b', color: '#fff', textAlign: 'left', fontWeight: 700, fontSize: 9, width: 70 }}>Metric</th>
                        {termProgress.map((p: any, idx) => {
                            const isCurrent = idx === termProgress.length - 1;
                            return (
                                <th key={p.examId} style={{ padding: '5px 8px', background: isCurrent ? accentColor : '#334155', color: '#fff', textAlign: 'center', fontWeight: isCurrent ? 900 : 600, fontSize: 9 }}>
                                    {/* Shorten exam name to fit horizontally */}
                                    {p.examName.length > 18 ? p.examName.slice(0, 16) + '…' : p.examName}
                                    {isCurrent && <span style={{ display: 'block', fontSize: 7, opacity: 0.8 }}>CURRENT</span>}
                                </th>
                            );
                        })}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, rIdx) => (
                        <tr key={row.label} style={{ background: rIdx % 2 ? '#f8fafc' : '#fff' }}>
                            <td style={{ padding: '4px 8px', fontWeight: 700, fontSize: 9, color: '#64748b', borderBottom: '1px solid #e2e8f0', background: '#f1f5f9' }}>
                                {row.label}
                            </td>
                            {termProgress.map((p: any, idx) => {
                                const rawVal   = row.key === '_trend' ? null : (p as any)[row.key];
                                const display  = row.fmt(rawVal, p, idx);
                                const clr      = (row as any).colorFn ? (row as any).colorFn(p, idx) : (row as any).color;
                                return (
                                    <td key={p.examId} style={{ padding: '4px 8px', textAlign: 'center', fontWeight: row.bold ? 900 : 500, color: clr, borderBottom: '1px solid #e2e8f0', fontSize: 10 }}>
                                        {display}
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

// ── Shared signature block ───────────────────────────────────────────────
const Signatures = ({ roles = ["Class Teacher", "Principal / Head", "Parent / Guardian"] }: { roles?: string[] }) => (
    <div className="grid gap-8 mt-8 pt-4" style={{ gridTemplateColumns: `repeat(${roles.length}, 1fr)` }}>
        {roles.map(r => (
            <div key={r} className="text-center">
                <div className="h-10 border-b border-dashed border-slate-300 mb-2" />
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{r}</p>
            </div>
        ))}
    </div>
);

// ── Shared SVG Line Chart for progress tracking ──────────────────────────
const PerformanceChart = ({
    termProgress = [],
    color = "#5c67f2"
}: {
    termProgress?: any[];
    color?: string;
}) => {
    if (!termProgress || termProgress.length === 0) return null;

    const width = 600;
    const height = 150;
    const paddingLeft = 45;
    const paddingRight = 45;
    const paddingTop = 22;
    const paddingBottom = 30;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    const numPoints = termProgress.length;

    // Calculate coordinates
    const coords = termProgress.map((d, idx) => {
        const x = paddingLeft + (numPoints > 1 ? (idx / (numPoints - 1)) * chartWidth : chartWidth / 2);
        const y = paddingTop + chartHeight - (d.pct / 100) * chartHeight;
        return { x, y, ...d };
    });

    let pathD = "";
    if (coords.length > 1) {
        pathD = `M ${coords[0].x} ${coords[0].y} ` +
            coords.slice(1).map(c => `L ${c.x} ${c.y}`).join(" ");
    }

    const yTicks = [0, 25, 50, 75, 100];

    return (
        <div className="mt-8 mb-6 p-4 border border-slate-200 rounded-2xl bg-slate-50/50">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 text-center">
                Academic Progress Tracker (Overall Percentage & Grade per Term)
            </h4>

            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
                {/* Gridlines */}
                {yTicks.map(tick => {
                    const y = paddingTop + chartHeight - (tick / 100) * chartHeight;
                    return (
                        <g key={tick}>
                            <line
                                x1={paddingLeft}
                                y1={y}
                                x2={width - paddingRight}
                                y2={y}
                                stroke="#e2e8f0"
                                strokeWidth="1"
                                strokeDasharray="3 3"
                            />
                            <text
                                x={paddingLeft - 8}
                                y={y + 3}
                                textAnchor="end"
                                fontSize="9"
                                fill="#94a3b8"
                                fontWeight="bold"
                            >
                                {tick}%
                            </text>
                        </g>
                    );
                })}

                {/* Line Path */}
                {pathD && (
                    <path
                        d={pathD}
                        fill="none"
                        stroke={color}
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                )}

                {/* Dots and Labels */}
                {coords.map((c, idx) => (
                    <g key={idx}>
                        <circle
                            cx={c.x}
                            cy={c.y}
                            r="6"
                            fill={color}
                            opacity="0.15"
                        />
                        <circle
                            cx={c.x}
                            cy={c.y}
                            r="4.5"
                            fill="#ffffff"
                            stroke={color}
                            strokeWidth="3"
                        />

                        {/* Percentage and Grade */}
                        <text
                            x={c.x}
                            y={c.y - 10}
                            textAnchor="middle"
                            fontSize="8.5"
                            fontWeight="extrabold"
                            fill={color}
                        >
                            {c.grade} ({c.pct}%)
                        </text>

                        {/* Marks details */}
                        <text
                            x={c.x}
                            y={c.y + 12}
                            textAnchor="middle"
                            fontSize="8"
                            fontWeight="bold"
                            fill="#64748b"
                        >
                            {c.totalObtained}/{c.totalMax}
                        </text>

                        {/* Exam Name */}
                        <text
                            x={c.x}
                            y={paddingTop + chartHeight + 16}
                            textAnchor="middle"
                            fontSize="8"
                            fontWeight="extrabold"
                            fill="#334155"
                        >
                            {c.examName}
                        </text>
                    </g>
                ))}
            </svg>
        </div>
    );
};

// ── 1. Cherith Gate Termly (Pink / Nigerian) ─────────────────────────────
export function TemplateCherith(p: PrintProps) {
    const accentColor = "#be185d";
    return (
        <div style={{ padding: 32, fontFamily: 'Arial, sans-serif', color: '#1e293b', fontSize: 13 }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: `4px solid ${accentColor}`, paddingBottom: 16, marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <LogoBlock logo={p.schoolLogo} name={p.schoolName} color={accentColor} />
                    <div>
                        <h1 style={{ fontSize: 20, fontWeight: 900, color: accentColor, textTransform: 'uppercase', letterSpacing: 1, margin: 0 }}>{p.schoolName}</h1>
                        <p style={{ fontSize: 11, color: '#64748b', margin: '4px 0 2px' }}>{p.schoolTagline}</p>
                        <p style={{ fontSize: 11, color: accentColor, fontWeight: 700, margin: 0 }}>{p.periodLabel}</p>
                    </div>
                </div>
                <PhotoBlock photo={p.studentPhoto} name={p.studentName} />
            </div>
            <p style={{ textAlign: 'center', fontWeight: 900, fontSize: 14, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 16 }}>Performance Report Sheet</p>
            {/* Student info */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, background: '#fdf2f8', border: '1px solid #fbcfe8', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 11 }}>
                {[["Student", p.studentName],["Adm No", p.admNo],["Class", p.className],["Period", p.periodLabel],["Exam", p.examName],["Date", p.examDate],["Subjects", String(p.marks.length)],["Result", p.overallStatus]].map(([l, v]) => (
                    <span key={l as string}>{l}: <strong>{v}</strong></span>
                ))}
            </div>
            {/* Table */}
            <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse', marginBottom: 16 }}>
                <thead>
                    <tr style={{ background: accentColor, color: '#fff' }}>
                        {['#','Subject','Teacher','Max','Obtained','%','Grade','Status'].map(h => <th key={h} style={{ padding: '8px 10px', textAlign: h === 'Subject' || h === 'Teacher' ? 'left' : 'center', fontWeight: 700 }}>{h}</th>)}
                    </tr>
                </thead>
                <tbody>
                    {p.marks.map((m, i) => {
                        const pct = !m.noMarks && m.totalMarks > 0 ? Math.round((m.marksObtained / m.totalMarks) * 100) : null;
                        const teacher = p.subjectTeachers?.[m.subjectName] || '—';
                        return (
                            <tr key={i} style={{ borderBottom: '1px solid #e2e8f0', opacity: m.noMarks ? 0.55 : 1 }}>
                                <td style={{ padding: '6px 10px' }}>{i + 1}</td>
                                <td style={{ padding: '6px 10px', fontWeight: 700 }}>{m.subjectName}</td>
                                <td style={{ padding: '6px 10px', fontSize: 10, color: '#64748b' }}>{teacher}</td>
                                <td style={{ padding: '6px 10px', textAlign: 'center' }}>{m.totalMarks}</td>
                                <td style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 900, color: m.noMarks ? '#94a3b8' : accentColor }}>{m.noMarks ? '—' : m.marksObtained}</td>
                                <td style={{ padding: '6px 10px', textAlign: 'center', color: m.noMarks ? '#94a3b8' : (pct !== null && pct >= 50 ? '#059669' : '#dc2626') }}>{m.noMarks ? '—' : `${pct}%`}</td>
                                <td style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 900, color: m.noMarks ? '#94a3b8' : accentColor }}>{pct !== null ? p.getGradeForPct(pct) : '—'}</td>
                                <td style={{ padding: '6px 10px', color: '#64748b' }}>{m.noMarks ? 'Pending' : (pct !== null ? p.getStatusForPct(pct) : '—')}</td>
                            </tr>
                        );
                    })}
                </tbody>
                <tfoot>
                    <tr style={{ background: accentColor, color: '#fff', fontWeight: 900 }}>
                        <td colSpan={2} style={{ padding: '8px 10px' }}>TOTAL ({p.marks.filter((m:any) => !m.noMarks).length} scored)</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>{p.totalMax}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>{p.totalObtained}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>{p.overall}%</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>{p.overallGrade}</td>
                        <td style={{ padding: '8px 10px' }}>{p.overallStatus}</td>
                    </tr>
                </tfoot>
            </table>
            <TermProgressTable termProgress={p.termProgress} accentColor={accentColor} />{"\n"}<PerformanceChart termProgress={p.termProgress} color={accentColor} />
            <Signatures />
        </div>
    );
}

// ── 2. CBSE Scholastic (Blue / Indian) ───────────────────────────────────
export function TemplateCBSE(p: PrintProps) {
    return (
        <div className="p-8 font-sans text-slate-800 text-sm">
            <div className="flex items-center gap-4 border-b-4 border-blue-800 pb-4 mb-4">
                <LogoBlock logo={p.schoolLogo} name={p.schoolName} color="#1e40af" />
                <div className="flex-1 text-center">
                    <h1 className="text-2xl font-black uppercase text-blue-900 tracking-tight">{p.schoolName}</h1>
                    <p className="text-xs text-slate-500 mt-0.5">{p.schoolTagline}</p>
                    <p className="text-xs text-blue-600 font-bold mt-0.5">{p.periodLabel}</p>
                </div>
                <PhotoBlock photo={p.studentPhoto} name={p.studentName} />
            </div>
            <div className="grid grid-cols-4 gap-3 bg-slate-50 border border-slate-200 rounded-lg p-3 mb-4 text-xs">
                <span>Student: <strong>{p.studentName}</strong></span>
                <span>Adm No: <strong>{p.admNo}</strong></span>
                <span>Class: <strong>{p.className}</strong></span>
                <span>Exam: <strong>{p.examName}</strong></span>
            </div>
            <p className="text-xs font-bold text-blue-900 uppercase border-l-4 border-red-600 pl-3 mb-3">Scholastic Areas</p>
            <table className="w-full text-xs mb-4" style={{ borderCollapse: "collapse" }}>
                <thead>
                    <tr className="bg-blue-800 text-white">
                        <th className="px-3 py-2 text-left font-bold">#</th>
                        <th className="px-3 py-2 text-left font-bold">Subject</th>
                        <th className="px-3 py-2 text-center font-bold">Max Marks</th>
                        <th className="px-3 py-2 text-center font-bold">Marks Obtained</th>
                        <th className="px-3 py-2 text-center font-bold">Percentage</th>
                        <th className="px-3 py-2 text-center font-bold">Grade</th>
                        <th className="px-3 py-2 text-left font-bold">Remark</th>
                    </tr>
                </thead>
                <tbody>
                    {p.marks.map((m, i) => {
                        const pct = m.totalMarks > 0 ? Math.round((m.marksObtained / m.totalMarks) * 100) : 0;
                        return (
                            <tr key={m._id || i} className={`border-b border-slate-200 ${i % 2 ? "bg-blue-50/30" : ""}`}>
                                <td className="px-3 py-2">{i + 1}</td>
                                <td className="px-3 py-2 font-semibold">{m.subjectName}</td>
                                <td className="px-3 py-2 text-center">{m.totalMarks}</td>
                                <td className="px-3 py-2 text-center font-bold">{m.marksObtained}</td>
                                <td className="px-3 py-2 text-center">{pct}%</td>
                                <td className="px-3 py-2 text-center font-black text-blue-700">{p.getGradeForPct(pct)}</td>
                                <td className="px-3 py-2">{m.attendanceStatus === "Absent" ? "Absent" : p.getStatusForPct(pct)}</td>
                            </tr>
                        );
                    })}
                </tbody>
                <tfoot>
                    <tr className="bg-slate-800 text-white font-bold">
                        <td colSpan={2} className="px-3 py-2">GRAND TOTAL</td>
                        <td className="px-3 py-2 text-center">{p.totalMax}</td>
                        <td className="px-3 py-2 text-center text-yellow-300">{p.totalObtained}</td>
                        <td className="px-3 py-2 text-center text-yellow-300">{p.overall}%</td>
                        <td className="px-3 py-2 text-center text-yellow-300">{p.overallGrade}</td>
                        <td className="px-3 py-2">{p.overallStatus}</td>
                    </tr>
                </tfoot>
            </table>
            <TermProgressTable termProgress={p.termProgress} accentColor="#1e40af" />`n<PerformanceChart termProgress={p.termProgress} color="#1e40af" />
            <Signatures roles={["Class Teacher", "Principal", "Parent / Guardian"]} />
        </div>
    );
}

// ── 3. TriTriangle Modern (Cyan / Minimalist) ────────────────────────────
export function TemplateTriTriangle(p: PrintProps) {
    return (
        <div className="p-8 font-sans text-slate-800 text-sm">
            <div className="flex items-center justify-between border-b-2 border-slate-200 pb-4 mb-4">
                <div className="flex items-center gap-3">
                    <LogoBlock logo={p.schoolLogo} name={p.schoolName} color="#0891b2" />
                    <div>
                        <h1 className="text-2xl font-black uppercase text-slate-900 tracking-tight">{p.schoolName}</h1>
                        <p className="text-xs text-slate-500 mt-0.5">{p.schoolTagline}</p>
                        <p className="text-xs text-cyan-600 font-bold mt-0.5">{p.periodLabel}</p>
                    </div>
                </div>
                <PhotoBlock photo={p.studentPhoto} name={p.studentName} />
            </div>
            <div className="grid grid-cols-4 gap-3 bg-slate-50 rounded-xl border border-slate-100 p-3 mb-4 text-xs">
                <span className="text-slate-400">Student: <strong className="text-slate-800">{p.studentName}</strong></span>
                <span className="text-slate-400">Adm No: <strong className="text-slate-800">{p.admNo}</strong></span>
                <span className="text-slate-400">Class: <strong className="text-slate-800">{p.className}</strong></span>
                <span className="text-slate-400">Exam: <strong className="text-slate-800">{p.examName}</strong></span>
            </div>
            <table className="w-full text-xs mb-4 rounded-lg overflow-hidden" style={{ borderCollapse: "collapse" }}>
                <thead>
                    <tr className="bg-cyan-600 text-white">
                        <th className="px-3 py-2 text-left font-bold uppercase text-[10px] tracking-wider">#</th>
                        <th className="px-3 py-2 text-left font-bold uppercase text-[10px] tracking-wider">Subject</th>
                        <th className="px-3 py-2 text-center font-bold uppercase text-[10px]">Max</th>
                        <th className="px-3 py-2 text-center font-bold uppercase text-[10px]">Obtained</th>
                        <th className="px-3 py-2 text-center font-bold uppercase text-[10px]">%</th>
                        <th className="px-3 py-2 text-center font-bold uppercase text-[10px]">Grade</th>
                        <th className="px-3 py-2 text-left font-bold uppercase text-[10px]">Status</th>
                    </tr>
                </thead>
                <tbody>
                    {p.marks.map((m, i) => {
                        const pct = m.totalMarks > 0 ? Math.round((m.marksObtained / m.totalMarks) * 100) : 0;
                        return (
                            <tr key={m._id || i} className="border-b border-slate-100">
                                <td className="px-3 py-2 text-slate-400">{i + 1}</td>
                                <td className="px-3 py-2 font-semibold">{m.subjectName}</td>
                                <td className="px-3 py-2 text-center text-slate-500">{m.totalMarks}</td>
                                <td className="px-3 py-2 text-center font-black text-cyan-700">{m.marksObtained}</td>
                                <td className="px-3 py-2 text-center">{pct}%</td>
                                <td className="px-3 py-2 text-center font-black text-cyan-700">{p.getGradeForPct(pct)}</td>
                                <td className="px-3 py-2">{m.attendanceStatus === "Absent" ? "Absent" : p.getStatusForPct(pct)}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            <div className="bg-cyan-50 border border-cyan-100 rounded-xl p-4 text-center font-bold text-cyan-900 text-sm mb-4">
                Total: {p.totalObtained} / {p.totalMax} &nbsp;·&nbsp; {p.overall}% &nbsp;·&nbsp; Grade: {p.overallGrade} &nbsp;·&nbsp; Result: <span className="text-cyan-600">{p.overallStatus}</span>
            </div>
            <TermProgressTable termProgress={p.termProgress} accentColor="#0891b2" />`n<PerformanceChart termProgress={p.termProgress} color="#0891b2" />
            <Signatures />
        </div>
    );
}

// ── 4. Islamabad Consolidated (Green / Weighted) ─────────────────────────
export function TemplateIslamabad(p: PrintProps) {
    return (
        <div className="p-8 font-sans text-slate-800 text-sm">
            <div className="flex items-center gap-4 border-b-4 border-emerald-700 pb-4 mb-4">
                <LogoBlock logo={p.schoolLogo} name={p.schoolName} color="#047857" />
                <div className="flex-1 text-center">
                    <h1 className="text-xl font-black uppercase text-slate-900 tracking-tight">{p.schoolName}</h1>
                    <p className="text-xs text-slate-500 mt-0.5">{p.schoolTagline}</p>
                    <p className="text-xs text-emerald-700 font-bold uppercase tracking-wider mt-0.5">{p.periodLabel} · Final Consolidated Report</p>
                </div>
                <PhotoBlock photo={p.studentPhoto} name={p.studentName} />
            </div>
            <div className="grid grid-cols-4 gap-3 bg-emerald-50 border border-emerald-100 rounded-lg p-3 mb-4 text-xs">
                <span>Student: <strong>{p.studentName}</strong></span>
                <span>Adm No: <strong>{p.admNo}</strong></span>
                <span>Class: <strong>{p.className} · {p.periodLabel}</strong></span>
                <span>Exam: <strong>{p.examName}</strong></span>
            </div>
            <table className="w-full text-xs mb-4" style={{ borderCollapse: "collapse" }}>
                <thead>
                    <tr className="bg-emerald-700 text-white">
                        <th className="px-3 py-2 text-left font-bold">#</th>
                        <th className="px-3 py-2 text-left font-bold">Subject</th>
                        <th className="px-3 py-2 text-center font-bold">Max Marks</th>
                        <th className="px-3 py-2 text-center font-bold">Obtained</th>
                        <th className="px-3 py-2 text-center font-bold">%</th>
                        <th className="px-3 py-2 text-center font-bold">Grade</th>
                        <th className="px-3 py-2 text-left font-bold">Status</th>
                    </tr>
                </thead>
                <tbody>
                    {p.marks.map((m, i) => {
                        const pct = m.totalMarks > 0 ? Math.round((m.marksObtained / m.totalMarks) * 100) : 0;
                        return (
                            <tr key={m._id || i} className="border-b border-slate-200">
                                <td className="px-3 py-2">{i + 1}</td>
                                <td className="px-3 py-2 font-semibold">{m.subjectName}</td>
                                <td className="px-3 py-2 text-center">{m.totalMarks}</td>
                                <td className="px-3 py-2 text-center font-bold">{m.marksObtained}</td>
                                <td className="px-3 py-2 text-center">{pct}%</td>
                                <td className="px-3 py-2 text-center font-black text-emerald-700">{p.getGradeForPct(pct)}</td>
                                <td className="px-3 py-2">{m.attendanceStatus === "Absent" ? "Absent" : p.getStatusForPct(pct)}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex justify-around text-sm font-bold text-slate-800 mb-4">
                <span>Marks: {p.totalObtained}/{p.totalMax}</span>
                <span>Pct: {p.overall}%</span>
                <span>Grade: {p.overallGrade}</span>
                <span className="text-emerald-700">Result: {p.overallStatus}</span>
            </div>
            <TermProgressTable termProgress={p.termProgress} accentColor="#047857" />`n<PerformanceChart termProgress={p.termProgress} color="#047857" />
            <Signatures />
        </div>
    );
}

// ── 5. Annual Split Panel (Indigo / Split) ───────────────────────────────
export function TemplateSplitPanel(p: PrintProps) {
    return (
        <div className="p-8 font-sans text-slate-800 text-sm">
            <div className="flex items-center gap-4 border-b-4 border-indigo-500 pb-4 mb-4">
                <LogoBlock logo={p.schoolLogo} name={p.schoolName} color="#4338ca" />
                <div className="flex-1 text-center">
                    <h1 className="text-2xl font-black uppercase text-slate-900 tracking-tight">{p.schoolName}</h1>
                    <p className="text-xs text-slate-500 mt-0.5">{p.schoolTagline}</p>
                    <p className="text-xs text-indigo-600 font-bold uppercase tracking-widest mt-0.5">{p.periodLabel} · Annual Report Card</p>
                </div>
                <PhotoBlock photo={p.studentPhoto} name={p.studentName} />
            </div>
            <div className="grid grid-cols-4 gap-3 bg-slate-50 border border-slate-200 rounded-lg p-3 mb-4 text-xs">
                <span>Student: <strong>{p.studentName}</strong></span>
                <span>Adm No: <strong>{p.admNo}</strong></span>
                <span>Class: <strong>{p.className}</strong></span>
                <span>Period: <strong>{p.periodLabel}</strong></span>
            </div>
            <div className="grid grid-cols-3 gap-6 mb-4">
                {/* Left: marks table */}
                <div className="col-span-2">
                    <table className="w-full text-xs" style={{ borderCollapse: "collapse" }}>
                        <thead>
                            <tr className="bg-indigo-600 text-white">
                                <th className="px-3 py-2 text-left font-bold">#</th>
                                <th className="px-3 py-2 text-left font-bold">Subject</th>
                                <th className="px-3 py-2 text-center font-bold">Max</th>
                                <th className="px-3 py-2 text-center font-bold">Obtained</th>
                                <th className="px-3 py-2 text-center font-bold">Grade</th>
                                <th className="px-3 py-2 text-left font-bold">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {p.marks.map((m, i) => {
                                const pct = m.totalMarks > 0 ? Math.round((m.marksObtained / m.totalMarks) * 100) : 0;
                                return (
                                    <tr key={m._id || i} className="border-b border-slate-100">
                                        <td className="px-3 py-2">{i + 1}</td>
                                        <td className="px-3 py-2 font-semibold">{m.subjectName}</td>
                                        <td className="px-3 py-2 text-center">{m.totalMarks}</td>
                                        <td className="px-3 py-2 text-center font-bold text-indigo-700">{m.marksObtained}</td>
                                        <td className="px-3 py-2 text-center font-black text-indigo-700">{p.getGradeForPct(pct)}</td>
                                        <td className="px-3 py-2">{m.attendanceStatus === "Absent" ? "Absent" : p.getStatusForPct(pct)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                {/* Right: summary */}
                <div className="space-y-3">
                    <div className="border border-indigo-200 bg-indigo-50 rounded-xl p-4 text-center">
                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Overall Result</p>
                        <p className="text-3xl font-black text-indigo-700">{p.overall}%</p>
                        <p className="text-sm font-bold text-indigo-600 mt-1">{p.overallGrade} · {p.overallStatus}</p>
                    </div>
                    <div className="border border-slate-200 rounded-xl p-3 space-y-2 text-xs">
                        <div className="flex justify-between"><span className="text-slate-500">Total Marks</span><strong>{p.totalObtained}/{p.totalMax}</strong></div>
                        <div className="flex justify-between"><span className="text-slate-500">Subjects</span><strong>{p.marks.length}</strong></div>
                        <div className="flex justify-between"><span className="text-slate-500">Exam</span><strong>{p.examName}</strong></div>
                        <div className="flex justify-between"><span className="text-slate-500">Date</span><strong>{p.examDate}</strong></div>
                    </div>
                </div>
            </div>
            <TermProgressTable termProgress={p.termProgress} accentColor="#4338ca" />`n<PerformanceChart termProgress={p.termProgress} color="#4338ca" />
            <Signatures />
        </div>
    );
}

// ── Template router ──────────────────────────────────────────────────────
// Maps all 16 template IDs (from ReportCardTemplates.tsx) to print layouts.
// CBC → Cherith (green tones), 8-4-4 → Islamabad (indigo), Cambridge → CBSE (purple), IB → SplitPanel (pink)
function PickTemplate({ templateId, curriculumId, ...props }: PrintProps & { templateId: string; curriculumId?: string }) {
    // Auto-select by curriculum when no explicit template or using legacy IDs
    const resolved = templateId || (
        curriculumId === "CBC"       ? "cbc_classic"  :
        curriculumId === "844"       ? "kcse_classic" :
        curriculumId === "Cambridge" ? "cam_standard" :
        curriculumId === "IB"        ? "ib_standard"  : "cherith_termly"
    );

    switch (resolved) {
        // Legacy IDs
        case "cherith_termly":       return <TemplateCherith {...props} />;
        case "cbse_scholastic":      return <TemplateCBSE {...props} />;
        case "tritriangle_modern":   return <TemplateTriTriangle {...props} />;
        case "islamabad_bimonthly":  return <TemplateIslamabad {...props} />;
        case "annual_split_panel":   return <TemplateSplitPanel {...props} />;

        // CBC templates (green)
        case "cbc_classic":    return <TemplateCherith {...props} />;
        case "cbc_portfolio":  return <TemplateSplitPanel {...props} />;
        case "cbc_holistic":   return <TemplateSplitPanel {...props} />;
        case "cbc_modern":     return <TemplateTriTriangle {...props} />;

        // 8-4-4 / KCSE templates (indigo)
        case "kcse_classic":        return <TemplateIslamabad {...props} />;
        case "kcse_termly":         return <TemplateCBSE {...props} />;
        case "kcse_merit":          return <TemplateCherith {...props} />;
        case "kcse_comprehensive":  return <TemplateSplitPanel {...props} />;

        // Cambridge templates (purple)
        case "cam_standard":    return <TemplateCBSE {...props} />;
        case "cam_igcse":       return <TemplateCBSE {...props} />;
        case "cam_progress":    return <TemplateIslamabad {...props} />;
        case "cam_continuous":  return <TemplateSplitPanel {...props} />;

        // IB templates (pink)
        case "ib_standard":  return <TemplateSplitPanel {...props} />;
        case "ib_myp":       return <TemplateTriTriangle {...props} />;
        case "ib_progress":  return <TemplateSplitPanel {...props} />;
        case "ib_diploma":   return <TemplateCBSE {...props} />;

        default: return <TemplateCherith {...props} />;
    }
}

/** Any report-card design, followed by a small "scan to verify" strip when a QR is supplied. */
export function RenderPrintTemplate(props: PrintProps & { templateId: string; curriculumId?: string }) {
    const { qrUrl, ...rest } = props;
    return (
        <>
            <PickTemplate {...rest} />
            {qrUrl && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "6px 12px 0", breakInside: "avoid" }}>
                    <img src={qrUrl} alt="QR" style={{ width: 54, height: 54 }} />
                    <div style={{ textAlign: "center", fontSize: 8, color: "#64748b", lineHeight: 1.35 }}>
                        <b style={{ color: "#334155" }}>Scan to verify this report</b> · Confirms it was issued by {props.schoolName}
                    </div>
                </div>
            )}
        </>
    );
}
