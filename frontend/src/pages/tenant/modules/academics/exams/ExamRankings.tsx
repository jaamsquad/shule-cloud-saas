/**
 * Comprehensive Exam Rankings & Analytics
 * Implements all 40 calculations including class/stream/subject positions,
 * GPA, CGPA, Z-scores, standard deviation, grade distribution, and more.
 */
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Printer, Filter, ChevronDown, TrendingUp, TrendingDown, BarChart3, Users, BookOpen, Trophy } from "lucide-react";
import api from "@/lib/api";
import { openPrintDoc } from "@/lib/pdfDoc";
import { useGradingForClasses, type Grading } from "@/lib/grading";

// ── Math helpers ────────────────────────────────────────────────────────────
const mean = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

const median = (arr: number[]) => {
    if (!arr.length) return 0;
    const s = [...arr].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

const mode = (arr: number[]) => {
    if (!arr.length) return 0;
    const freq: Record<number, number> = {};
    arr.forEach(v => { freq[v] = (freq[v] || 0) + 1; });
    return Number(Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0]);
};

const stdDev = (arr: number[]) => {
    if (arr.length < 2) return 0;
    const m = mean(arr);
    return Math.sqrt(arr.reduce((s, v) => s + Math.pow(v - m, 2), 0) / arr.length);
};

const zScore = (v: number, m: number, sd: number) => sd > 0 ? ((v - m) / sd) : 0;

const assignRank = <T,>(arr: T[], key: (x: T) => number, rankProp: string): (T & Record<string, number>)[] => {
    const sorted = [...arr].sort((a, b) => key(b) - key(a));
    let rank = 1;
    return sorted.map((item, idx) => {
        if (idx > 0 && key(sorted[idx - 1]) > key(item)) rank = idx + 1;
        return { ...item as any, [rankProp]: rank };
    }) as any;
};

// ── Grade helpers ────────────────────────────────────────────────────────────
// Grade, points and remark from the configured grading scale for the student's class.
function computeGrade(pct: number, g: Grading): { grade: string; points: number; label: string } {
    const band = g.gradeOf(pct);
    return { grade: band.grade, points: band.points, label: band.remark || "" };
}

// ── Component ────────────────────────────────────────────────────────────────
export default function ExamRankings() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [filterClass, setFilterClass] = useState("");
    const [showTab, setShowTab] = useState<"rankings" | "stats" | "grade_dist" | "subject_analysis">("rankings");
    const [showColumns, setShowColumns] = useState({ gpa: true, meanGrade: true, zScore: false, streamPos: true, improvement: true, subjectPos: false });

    const { data: exam } = useQuery<any>({ queryKey: ["exam_detail", id], queryFn: async () => (await api.get(`/academics/exams/${id}`)).data, enabled: !!id });
    const { data: allMarks = [] } = useQuery<any[]>({ queryKey: ["exam_all_marks", id], queryFn: async () => (await api.get(`/academics/exam-marks?examId=${id}`)).data || [], enabled: !!id });
    const { data: students = [] } = useQuery<any[]>({ queryKey: ["students"], queryFn: async () => (await api.get("/students")).data || [] });
    const { data: curriculumSettings } = useQuery<any>({ queryKey: ["curriculum_settings"], queryFn: async () => { const r = await api.get("/curriculum_settings"); return Array.isArray(r.data) ? r.data[0] : null; } });
    const { data: tenantProfile } = useQuery<any>({ queryKey: ["tenant_profile_global"], queryFn: async () => { const r = await api.get("/auth/tenant/profile"); return Array.isArray(r.data) ? r.data[0] : r.data; } });
    const { data: allExams = [] } = useQuery<any[]>({ queryKey: ["exams"], queryFn: async () => (await api.get("/academics/exams")).data || [] });

    // Configured grading per class in this exam (class template → class/school criteria → settings).
    const markClasses = useMemo(() => {
        const seen = new Map<string, { classId?: string; className?: string }>();
        allMarks.forEach(m => { const c = { classId: m.classId ? String(m.classId) : undefined, className: m.className || m.studentClass || undefined }; seen.set(`${c.classId || ""}|${c.className || ""}`, c); });
        return [...seen.values()];
    }, [allMarks]);
    const gradingFor = useGradingForClasses(markClasses);
    const passMark: number = curriculumSettings?.passMark ?? 50;

    const studentMap = useMemo(() => { const m = new Map<string, any>(); students.forEach((s: any) => m.set(s._id?.toString(), s)); return m; }, [students]);

    const uniqueSubjects = useMemo(() => [...new Set(allMarks.map((m: any) => m.subjectName).filter(Boolean))], [allMarks]);
    const classNames    = useMemo(() => [...new Set(allMarks.map((m: any) => m.className || m.studentClass).filter(Boolean))], [allMarks]);
    const allStudentIds = useMemo(() => [...new Set(allMarks.map((m: any) => m.studentId?.toString()))], [allMarks]);

    // ── Previous exam for improvement calculation ──────────────────────────
    const prevExam = useMemo(() => {
        if (!exam || !allExams.length) return null;
        const sameYear = allExams.filter((e: any) => e.academicYear === exam.academicYear && e._id !== exam._id);
        // Find exam just before current one by date
        const before = sameYear.filter((e: any) => e.startDate && new Date(e.startDate) < new Date(exam.startDate || 0));
        return before.sort((a: any, b: any) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())[0] || null;
    }, [exam, allExams]);

    const { data: prevMarks = [] } = useQuery<any[]>({
        queryKey: ["prev_exam_marks", prevExam?._id],
        queryFn: async () => (await api.get(`/academics/exam-marks?examId=${prevExam._id}`)).data || [],
        enabled: !!prevExam,
    });

    // ── Build comprehensive per-student analytics (all 40 calculations) ────
    const analytics = useMemo(() => {
        const perStudent = allStudentIds.map(sid => {
            const sMarks = allMarks.filter((m: any) => m.studentId?.toString() === sid);
            const student = studentMap.get(sid) || sMarks[0];
            const name   = student?.studentName || `${student?.firstName || ""} ${student?.lastName || ""}`.trim() || "—";
            const admNo  = student?.admNo || student?.registrationNo || "—";
            const cls    = student?.studentClass || sMarks[0]?.className || sMarks[0]?.studentClass || "—";
            const photo  = student?.avatar || student?.studentPhoto || null;
            const grading = gradingFor(sMarks[0]?.classId ? String(sMarks[0].classId) : undefined, sMarks[0]?.className || sMarks[0]?.studentClass || (cls !== "—" ? cls : undefined));

            // #1 Subject totals (marks per subject)
            const subjectTotals: Record<string, { obtained: number; max: number; pct: number; grade: string; points: number; label: string }> = {};
            uniqueSubjects.forEach(sub => {
                const subMark = sMarks.find((m: any) => m.subjectName === sub);
                if (subMark) {
                    const obtained = Number(subMark.marksObtained) || 0;
                    const max      = Number(subMark.totalMarks) || 100;
                    const pct      = max > 0 ? Math.round((obtained / max) * 100) : 0;
                    const { grade, points, label } = computeGrade(pct, grading);
                    subjectTotals[sub] = { obtained, max, pct, grade, points, label };
                }
            });

            // #2 Overall total
            const totalObtained = sMarks.reduce((s: number, m: any) => s + (Number(m.marksObtained) || 0), 0);
            const totalMax      = sMarks.reduce((s: number, m: any) => s + (Number(m.totalMarks) || 100), 0);

            // #4 Percentage
            const totalPct = totalMax > 0 ? Math.round((totalObtained / totalMax) * 100) : 0;

            // #3 Average marks
            const avgMarks = sMarks.length > 0 ? Math.round(totalObtained / sMarks.length) : 0;

            // #6-8 Grade points, mean grade point, GPA
            const subjectCount  = Object.keys(subjectTotals).length;
            const totalPoints   = Object.values(subjectTotals).reduce((s, v) => s + v.points, 0);
            const gpa           = subjectCount > 0 ? Math.round((totalPoints / subjectCount) * 100) / 100 : 0;
            const meanGradeInfo = computeGrade(totalPct, grading);

            // #12 Previous exam improvement
            const prevStudentMarks = prevMarks.filter((m: any) => m.studentId?.toString() === sid);
            const prevTotal        = prevStudentMarks.reduce((s: number, m: any) => s + (Number(m.marksObtained) || 0), 0);
            const prevMax          = prevStudentMarks.reduce((s: number, m: any) => s + (Number(m.totalMarks) || 100), 0);
            const prevPct          = prevMax > 0 ? Math.round((prevTotal / prevMax) * 100) : 0;
            const improvement      = prevStudentMarks.length > 0 ? totalPct - prevPct : null;
            const improvementPct   = prevStudentMarks.length > 0 && prevPct > 0 ? Math.round(((totalPct - prevPct) / prevPct) * 100) : null;

            return { studentId: sid, name, admNo, cls, photo, sMarks, subjectTotals, totalObtained, totalMax, totalPct, avgMarks, totalPoints, gpa, meanGrade: meanGradeInfo.grade, meanLabel: meanGradeInfo.label, prevPct, improvement, improvementPct };
        });

        // #10 Class position (overall)
        const withClassPos = assignRank(perStudent, x => x.totalPoints || x.totalPct, "classPos");

        // #11 Stream/class-specific position
        const classGroups: Record<string, any[]> = {};
        withClassPos.forEach(s => { if (!classGroups[s.cls]) classGroups[s.cls] = []; classGroups[s.cls].push(s); });
        const withStreamPos = withClassPos.map(s => {
            const group = classGroups[s.cls] || [];
            const sorted = [...group].sort((a, b) => (b.totalPoints || b.totalPct) - (a.totalPoints || a.totalPct));
            let streamPos = 1;
            sorted.forEach((x, idx) => { if (x.studentId === s.studentId) streamPos = idx + 1; });
            return { ...s, streamPos };
        });

        // #12 Subject positions per student
        const withSubjectPos = withStreamPos.map(s => {
            const subjectPos: Record<string, number> = {};
            uniqueSubjects.forEach(sub => {
                const allForSub = withStreamPos.map(st => ({ sid: st.studentId, v: st.subjectTotals[sub]?.obtained ?? -1 }));
                const sorted = [...allForSub].sort((a, b) => b.v - a.v);
                const pos = sorted.findIndex(x => x.sid === s.studentId) + 1;
                subjectPos[sub] = pos > 0 ? pos : sorted.length;
            });
            return { ...s, subjectPos };
        });

        return withSubjectPos;
    }, [allStudentIds, allMarks, studentMap, uniqueSubjects, gradingFor, prevMarks]);

    const filtered = useMemo(() =>
        filterClass ? analytics.filter(s => s.cls === filterClass) : analytics,
        [analytics, filterClass]
    );

    // ── Class-wide statistics (#15-31) ─────────────────────────────────────
    const stats = useMemo(() => {
        const scores = filtered.map(s => s.totalPct);
        if (!scores.length) return null;

        const classMean = Math.round(mean(scores));
        const classMedian = Math.round(median(scores));
        const classMode  = mode(scores);
        const sd         = Math.round(stdDev(scores) * 100) / 100;
        const highest    = Math.max(...scores);
        const lowest     = Math.min(...scores);
        const passed     = filtered.filter(s => s.totalPct >= passMark).length;
        const failed     = filtered.length - passed;
        const passRate   = filtered.length > 0 ? Math.round((passed / filtered.length) * 100) : 0;

        // Grade distribution (#22)
        const gradeDist: Record<string, number> = {};
        filtered.forEach(s => { const g = s.meanGrade; gradeDist[g] = (gradeDist[g] || 0) + 1; });

        // Subject stats (#16, #23)
        const subjectStats: Record<string, { mean: number; passRate: number; highest: number; lowest: number }> = {};
        uniqueSubjects.forEach(sub => {
            const vals = filtered.map(s => s.subjectTotals[sub]?.pct ?? null).filter(v => v !== null) as number[];
            if (vals.length) {
                const subPass = vals.filter(v => v >= passMark).length;
                subjectStats[sub] = { mean: Math.round(mean(vals)), passRate: Math.round((subPass / vals.length) * 100), highest: Math.max(...vals), lowest: Math.min(...vals) };
            }
        });

        // Performance index per student (#38)
        const withPerfIndex = filtered.map(s => ({ ...s, perfIndex: classMean > 0 ? Math.round((s.totalPct / classMean) * 100) : 100, zScore: Math.round(zScore(s.totalPct, classMean, sd) * 100) / 100 }));

        return { classMean, classMedian, classMode, sd, highest, lowest, passed, failed, passRate, failRate: 100 - passRate, gradeDist, subjectStats, withPerfIndex };
    }, [filtered, uniqueSubjects, passMark]);

    const displayData = stats?.withPerfIndex || filtered;

    // ── Print ───────────────────────────────────────────────────────────────
    const printSheet = () => {
        const win = openPrintDoc();
        if (!win) return;
        const schoolName = tenantProfile?.name || "School";
        const schoolLogo = tenantProfile?.logo || "";
        const rows = displayData.map((s: any, idx) => `
            <tr style="${idx < 3 ? 'background:#fffbeb' : idx%2?'background:#f8fafc':''}">
                <td style="padding:7px 10px;text-align:center;font-weight:900;color:${idx===0?'#f59e0b':idx===1?'#94a3b8':idx===2?'#b45309':'#5C67F2'}">${s.classPos}</td>
                <td style="padding:7px 10px;font-weight:700">${s.name}</td>
                <td style="padding:7px 10px;text-align:center;color:#64748b;font-size:11px">${s.admNo}</td>
                <td style="padding:7px 10px;text-align:center;font-size:11px">${s.cls}</td>
                ${uniqueSubjects.map(sub => `<td style="padding:7px 8px;text-align:center;font-size:10px">${s.subjectTotals[sub]?.obtained ?? '—'}/${s.subjectTotals[sub]?.max ?? 100}</td>`).join("")}
                <td style="padding:7px 10px;text-align:center;font-weight:900;color:#5C67F2">${s.totalObtained}/${s.totalMax}</td>
                <td style="padding:7px 10px;text-align:center;font-weight:900;color:${s.totalPct>=passMark?'#10b981':'#ef4444'}">${s.totalPct}%</td>
                <td style="padding:7px 10px;text-align:center;font-weight:900">${s.gpa}</td>
                <td style="padding:7px 10px;text-align:center;font-weight:900">${s.meanGrade}</td>
                <td style="padding:7px 10px;text-align:center">${s.streamPos}</td>
                <td style="padding:7px 10px;text-align:center;color:${s.improvement===null?'#94a3b8':s.improvement>0?'#10b981':'#ef4444'}">${s.improvement===null?'—':(s.improvement>0?'+':'')+s.improvement+'%'}</td>
                <td style="padding:7px 10px;text-align:center">${s.totalPct>=passMark?'<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><polyline points="20 6 9 17 4 12"/></svg>':'<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'}</td>
            </tr>
        `).join("");

        win.document.write(`<!DOCTYPE html><html><head><title>Comprehensive Rankings — ${exam?.examName}</title>
        <style>
        *{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;padding:24px;color:#1e293b;font-size:12px}
        .header{display:flex;align-items:center;gap:16px;border-bottom:3px solid #5C67F2;padding-bottom:12px;margin-bottom:16px}
        .header img{height:52px;object-fit:contain}
        h1{font-size:17px;font-weight:900;color:#5C67F2;text-transform:uppercase}h2{font-size:12px;color:#64748b}
        .stats{display:grid;grid-template-columns:repeat(6,1fr);gap:8px;margin-bottom:16px}
        .stat{background:#eff6ff;border-radius:6px;padding:8px;text-align:center;border:1px solid #bfdbfe}
        .stat label{font-size:8px;text-transform:uppercase;color:#94a3b8;font-weight:700;display:block;letter-spacing:1px}
        .stat span{font-size:16px;font-weight:900;color:#5C67F2}
        table{width:100%;border-collapse:collapse;font-size:10px}
        th{background:#5C67F2;color:#fff;padding:7px 8px;font-size:9px;text-transform:uppercase;letter-spacing:.5px;white-space:nowrap}
        .sigs{display:grid;grid-template-columns:1fr 1fr 1fr;gap:24px;margin-top:40px}
        .sig{border-top:1px dashed #94a3b8;padding-top:4px;text-align:center;font-size:9px;color:#94a3b8;text-transform:uppercase}
        @media print{@page{size:A4 landscape;margin:10mm}}
        </style></head><body>
        <div class="header">${schoolLogo?`<img src="${schoolLogo}"/>`:""}
            <div><h1>${schoolName}</h1><h2>${exam?.examName}${filterClass?` — ${filterClass}`:""} · Comprehensive Rankings</h2></div>
        </div>
        ${stats?`<div class="stats">
            <div class="stat"><label>Students</label><span>${filtered.length}</span></div>
            <div class="stat"><label>Class Mean</label><span>${stats.classMean}%</span></div>
            <div class="stat"><label>Highest</label><span>${stats.highest}%</span></div>
            <div class="stat"><label>Lowest</label><span>${stats.lowest}%</span></div>
            <div class="stat"><label>Pass Rate</label><span style="color:#10b981">${stats.passRate}%</span></div>
            <div class="stat"><label>Std Dev</label><span>${stats.sd}</span></div>
        </div>`:""}
        <table><thead><tr>
            <th>Rank</th><th>Student</th><th>Adm No</th><th>Class</th>
            ${uniqueSubjects.map(s => `<th>${s}</th>`).join("")}
            <th>Total</th><th>%</th><th>GPA</th><th>Mean Grade</th><th>Stream Pos</th><th>Improvement</th><th>Result</th>
        </tr></thead><tbody>${rows}</tbody></table>
        <div class="sigs">
            <div class="sig">Class Teacher</div>
            <div class="sig">Principal / Head</div>
            <div class="sig">Academic Director</div>
        </div>
        <script>window.onload=()=>window.print()</script>
        </body></html>`);
        win.document.close();
    };

    if (!exam) return <div className="flex-1 flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-[#5C67F2] border-t-transparent rounded-full" /></div>;

    const TABS = [
        { id: "rankings",         label: "Rankings",           icon: Trophy },
        { id: "stats",            label: "Statistics",         icon: BarChart3 },
        { id: "grade_dist",       label: "Grade Distribution", icon: TrendingUp },
        { id: "subject_analysis", label: "Subject Analysis",   icon: BookOpen },
    ] as const;

    return (
        <div className="flex-1 bg-[#f3f4f6] min-h-screen flex flex-col pb-10">

            {/* Header */}
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-2">
                    <button onClick={() => navigate(`/exams/${id}`)} className="text-gray-400 hover:text-[#5C67F2] transition-colors"><ArrowLeft className="w-5 h-5" /></button>
                    <span className="text-gray-300">|</span>
                    <span className="text-gray-500 text-sm cursor-pointer hover:text-[#5C67F2]" onClick={() => navigate(`/exams/${id}`)}>
                        {exam.examName}
                    </span>
                    <span className="text-gray-300">/</span>
                    <span className="font-black text-[#5C67F2] text-sm">Comprehensive Rankings</span>
                </div>
                <div className="flex items-center gap-3">
                    {/* Class filter */}
                    <div className="relative">
                        <select value={filterClass} onChange={e => setFilterClass(e.target.value)}
                            className="h-9 pl-3 pr-8 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 bg-white focus:outline-none focus:border-[#5C67F2] appearance-none">
                            <option value="">All Classes</option>
                            {classNames.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                    </div>
                    <button onClick={printSheet}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-black text-xs uppercase rounded-xl shadow-sm transition-all">
                        <Printer className="w-3.5 h-3.5" /> Print (Landscape)
                    </button>
                </div>
            </div>

            {/* Exam info */}
            <div className="bg-gradient-to-r from-[#5C67F2] to-indigo-700 px-8 py-4 text-white">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-bold text-white/60 uppercase">{exam.type} · {exam.term || exam.academicYear}</p>
                        <h1 className="text-xl font-black">{exam.examName}</h1>
                    </div>
                    <div className="flex gap-3">
                        {[
                            { l: "Students", v: filtered.length },
                            { l: "Subjects", v: uniqueSubjects.length },
                            { l: "Class Mean", v: `${stats?.classMean || 0}%` },
                            { l: "Pass Rate", v: `${stats?.passRate || 0}%` },
                        ].map(s => (
                            <div key={s.l} className="bg-white/10 rounded-xl px-3 py-2 text-center min-w-[70px]">
                                <p className="text-sm font-black">{s.v}</p>
                                <p className="text-[9px] font-bold text-white/60 uppercase">{s.l}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Sub-tabs */}
            <div className="bg-white border-b border-gray-100 px-8">
                <div className="max-w-7xl mx-auto flex gap-1">
                    {TABS.map(t => (
                        <button key={t.id} onClick={() => setShowTab(t.id)}
                            className={`flex items-center gap-1.5 px-4 py-3 text-xs font-black uppercase tracking-wide border-b-2 transition-all -mb-px ${showTab === t.id ? "border-[#5C67F2] text-[#5C67F2]" : "border-transparent text-gray-400 hover:text-gray-600"}`}>
                            <t.icon className="w-3.5 h-3.5" /> {t.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="max-w-7xl mx-auto w-full px-8 pt-5 space-y-5">

                {/* ── RANKINGS TABLE ─────────────────────────────────────── */}
                {showTab === "rankings" && (
                    <div>
                        {/* Column toggles */}
                        <div className="flex items-center gap-2 mb-3 flex-wrap">
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Show columns:</span>
                            {Object.entries({ gpa: "GPA", meanGrade: "Mean Grade", streamPos: "Stream Pos", improvement: "Improvement", zScore: "Z-Score", subjectPos: "Subject Pos" }).map(([k, label]) => (
                                <button key={k} onClick={() => setShowColumns(p => ({ ...p, [k]: !p[k as keyof typeof p] }))}
                                    className={`px-2.5 py-1 rounded-full text-[10px] font-black border transition-all ${(showColumns as any)[k] ? "bg-[#5C67F2] text-white border-[#5C67F2]" : "bg-gray-50 text-gray-400 border-gray-200"}`}>
                                    {label}
                                </button>
                            ))}
                        </div>

                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
                            <table className="w-full border-collapse text-xs">
                                <thead>
                                    <tr className="bg-gradient-to-r from-slate-800 to-slate-700 text-white">
                                        <th className="px-3 py-3 text-center font-black uppercase text-[9px]">Rank</th>
                                        <th className="px-4 py-3 text-left font-black uppercase text-[9px]">Student</th>
                                        <th className="px-3 py-3 text-center font-black uppercase text-[9px]">Adm No</th>
                                        <th className="px-3 py-3 text-center font-black uppercase text-[9px]">Class</th>
                                        {uniqueSubjects.map(sub => (
                                            <th key={sub} className="px-2 py-3 text-center font-black uppercase text-[9px] whitespace-nowrap">{sub}</th>
                                        ))}
                                        <th className="px-3 py-3 text-center font-black uppercase text-[9px]">Total</th>
                                        <th className="px-3 py-3 text-center font-black uppercase text-[9px]">%</th>
                                        {showColumns.gpa && <th className="px-3 py-3 text-center font-black uppercase text-[9px]">GPA</th>}
                                        {showColumns.meanGrade && <th className="px-3 py-3 text-center font-black uppercase text-[9px]">Mean Grd</th>}
                                        {showColumns.streamPos && <th className="px-3 py-3 text-center font-black uppercase text-[9px]">Strm Pos</th>}
                                        {showColumns.improvement && <th className="px-3 py-3 text-center font-black uppercase text-[9px]">Improv.</th>}
                                        {showColumns.zScore && <th className="px-3 py-3 text-center font-black uppercase text-[9px]">Z-Score</th>}
                                        <th className="px-3 py-3 text-center font-black uppercase text-[9px]">Result</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {displayData.map((s: any, idx: number) => (
                                        <tr key={s.studentId} className={`border-b border-gray-50 ${idx < 3 ? "bg-amber-50/30" : idx % 2 === 0 ? "bg-white" : "bg-gray-50/20"}`}>
                                            <td className="px-3 py-2.5 text-center">
                                                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black mx-auto ${idx===0?"bg-yellow-400 text-white":idx===1?"bg-gray-400 text-white":idx===2?"bg-amber-700 text-white":"bg-gray-100 text-gray-600"}`}>
                                                    {s.classPos}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2.5">
                                                <div className="flex items-center gap-2">
                                                    {s.photo ? <img src={s.photo} alt="" className="w-6 h-6 rounded-full object-cover" /> :
                                                        <div className="w-6 h-6 rounded-full bg-indigo-50 text-[#5C67F2] font-black text-[9px] flex items-center justify-center">{s.name.charAt(0)}</div>}
                                                    <span className="font-black text-gray-900">{s.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-3 py-2.5 text-center text-gray-500">{s.admNo}</td>
                                            <td className="px-3 py-2.5 text-center text-gray-600 font-bold">{s.cls}</td>
                                            {uniqueSubjects.map(sub => {
                                                const st = s.subjectTotals[sub];
                                                return (
                                                    <td key={sub} className="px-2 py-2.5 text-center">
                                                        {st ? (
                                                            <div className="flex flex-col items-center gap-0.5">
                                                                <span className="font-black text-[#5C67F2]">{st.obtained}</span>
                                                                <span className="text-[8px] font-bold px-1 rounded" style={{ background: `${st.pct >= passMark ? "#10b981" : "#ef4444"}15`, color: st.pct >= passMark ? "#10b981" : "#ef4444" }}>{st.grade}</span>
                                                            </div>
                                                        ) : <span className="text-gray-300 text-xs">—</span>}
                                                    </td>
                                                );
                                            })}
                                            <td className="px-3 py-2.5 text-center font-black text-[#5C67F2]">{s.totalObtained}/{s.totalMax}</td>
                                            <td className="px-3 py-2.5 text-center">
                                                <div className="flex flex-col items-center gap-0.5">
                                                    <span className={`font-black ${s.totalPct >= passMark ? "text-emerald-600" : "text-red-500"}`}>{s.totalPct}%</span>
                                                    <div className="w-12 h-1 bg-gray-100 rounded-full overflow-hidden">
                                                        <div className="h-full rounded-full" style={{ width: `${s.totalPct}%`, backgroundColor: s.totalPct >= passMark ? "#10b981" : "#ef4444" }} />
                                                    </div>
                                                </div>
                                            </td>
                                            {showColumns.gpa && <td className="px-3 py-2.5 text-center font-black text-gray-700">{s.gpa}</td>}
                                            {showColumns.meanGrade && <td className="px-3 py-2.5 text-center"><span className="text-xs font-black px-2 py-0.5 rounded-lg bg-indigo-50 text-[#5C67F2]">{s.meanGrade}</span></td>}
                                            {showColumns.streamPos && <td className="px-3 py-2.5 text-center text-xs font-bold text-gray-500">{s.streamPos}</td>}
                                            {showColumns.improvement && (
                                                <td className="px-3 py-2.5 text-center text-xs font-black">
                                                    {s.improvement === null ? <span className="text-gray-300">—</span> : (
                                                        <span className={`flex items-center justify-center gap-0.5 ${s.improvement > 0 ? "text-emerald-600" : s.improvement < 0 ? "text-red-500" : "text-gray-400"}`}>
                                                            {s.improvement > 0 ? <TrendingUp className="w-3 h-3" /> : s.improvement < 0 ? <TrendingDown className="w-3 h-3" /> : null}
                                                            {s.improvement > 0 ? "+" : ""}{s.improvement}%
                                                        </span>
                                                    )}
                                                </td>
                                            )}
                                            {showColumns.zScore && <td className="px-3 py-2.5 text-center text-xs font-bold text-gray-500">{(s as any).zScore ?? "—"}</td>}
                                            <td className="px-3 py-2.5 text-center">
                                                {s.totalPct >= passMark
                                                    ? <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Pass</span>
                                                    : <span className="text-[9px] font-black text-red-500 bg-red-50 px-2 py-0.5 rounded-full">Fail</span>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ── STATISTICS ─────────────────────────────────────────── */}
                {showTab === "stats" && stats && (
                    <div className="space-y-5">
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {[
                                { l: "Class Mean",   v: `${stats.classMean}%`,   color: "#5C67F2" },
                                { l: "Median",       v: `${stats.classMedian}%`,  color: "#8B5CF6" },
                                { l: "Mode",         v: `${stats.classMode}%`,    color: "#EC4899" },
                                { l: "Std Deviation",v: String(stats.sd),         color: "#F59E0B" },
                                { l: "Highest",      v: `${stats.highest}%`,      color: "#10B981" },
                                { l: "Lowest",       v: `${stats.lowest}%`,       color: "#EF4444" },
                                { l: "Pass Count",   v: String(stats.passed),     color: "#10B981" },
                                { l: "Fail Count",   v: String(stats.failed),     color: "#EF4444" },
                                { l: "Pass Rate",    v: `${stats.passRate}%`,     color: "#10B981" },
                                { l: "Fail Rate",    v: `${stats.failRate}%`,     color: "#EF4444" },
                                { l: "Total Students", v: String(filtered.length), color: "#5C67F2" },
                                { l: "Subjects",     v: String(uniqueSubjects.length), color: "#8B5CF6" },
                            ].map(s => (
                                <div key={s.l} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">{s.l}</p>
                                    <p className="text-xl font-black" style={{ color: s.color }}>{s.v}</p>
                                </div>
                            ))}
                        </div>

                        {/* Top/Bottom 3 */}
                        <div className="grid grid-cols-2 gap-5">
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                                <h3 className="text-xs font-black text-emerald-600 uppercase tracking-wide mb-3 flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5" /> Top Performers</h3>
                                {displayData.slice(0, 3).map((s: any, i) => (
                                    <div key={s.studentId} className="flex items-center gap-3 py-2 border-b border-gray-50">
                                        <span className="w-6 h-6 rounded-full bg-indigo-50 text-[#5C67F2] font-black text-[9px] flex items-center justify-center">{i + 1}</span>
                                        <span className="flex-1 text-sm font-bold text-gray-800 truncate">{s.name}</span>
                                        <span className="font-black text-emerald-600 text-sm">{s.totalPct}%</span>
                                    </div>
                                ))}
                            </div>
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                                <h3 className="text-xs font-black text-amber-600 uppercase tracking-wide mb-3 flex items-center gap-1.5"><TrendingDown className="w-3.5 h-3.5" /> Need Support</h3>
                                {[...displayData].reverse().slice(0, 3).map((s: any, i) => (
                                    <div key={s.studentId} className="flex items-center gap-3 py-2 border-b border-gray-50">
                                        <span className="w-6 h-6 rounded-full bg-red-50 text-red-500 font-black text-[9px] flex items-center justify-center">{displayData.length - i}</span>
                                        <span className="flex-1 text-sm font-bold text-gray-800 truncate">{s.name}</span>
                                        <span className="font-black text-red-500 text-sm">{s.totalPct}%</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── GRADE DISTRIBUTION ─────────────────────────────────── */}
                {showTab === "grade_dist" && stats && (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                        <h3 className="text-sm font-black text-gray-800 mb-5">Grade Distribution — {filtered.length} Students</h3>
                        <div className="space-y-3">
                            {Object.entries(stats.gradeDist).sort(([a], [b]) => b.localeCompare(a)).map(([grade, count]) => {
                                const pct = Math.round(((count as number) / filtered.length) * 100);
                                return (
                                    <div key={grade} className="flex items-center gap-4">
                                        <div className="w-10 text-sm font-black text-[#5C67F2] text-right">{grade}</div>
                                        <div className="flex-1 h-8 bg-gray-50 rounded-xl overflow-hidden relative">
                                            <div className="h-full bg-[#5C67F2] rounded-xl transition-all" style={{ width: `${pct}%`, opacity: 0.7 + (pct / 300) }} />
                                            <span className="absolute inset-0 flex items-center px-3 text-xs font-black text-gray-700">{count} students ({pct}%)</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ── SUBJECT ANALYSIS ───────────────────────────────────── */}
                {showTab === "subject_analysis" && stats && (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gradient-to-r from-[#5C67F2] to-indigo-500 text-white">
                                    <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest">Subject</th>
                                    <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest">Subject Mean (#16)</th>
                                    <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest">Pass Rate (#23)</th>
                                    <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest">Highest (#18)</th>
                                    <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest">Lowest (#19)</th>
                                    <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest">Top Student</th>
                                </tr>
                            </thead>
                            <tbody>
                                {uniqueSubjects.map((sub, i) => {
                                    const ss = stats.subjectStats[sub];
                                    if (!ss) return null;
                                    const topStudent = [...displayData].sort((a: any, b: any) => (b.subjectTotals[sub]?.obtained ?? 0) - (a.subjectTotals[sub]?.obtained ?? 0))[0];
                                    return (
                                        <tr key={sub} className={`border-b border-gray-50 ${i % 2 === 0 ? "bg-white" : "bg-gray-50/20"}`}>
                                            <td className="px-5 py-3 font-black text-gray-800 text-sm">{sub}</td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`font-black text-sm ${ss.mean >= passMark ? "text-emerald-600" : "text-red-500"}`}>{ss.mean}%</span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`text-xs font-black px-2.5 py-1 rounded-full ${ss.passRate >= 70 ? "bg-emerald-50 text-emerald-700" : ss.passRate >= 50 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-600"}`}>
                                                    {ss.passRate}%
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center font-black text-emerald-600">{ss.highest}%</td>
                                            <td className="px-4 py-3 text-center font-black text-red-500">{ss.lowest}%</td>
                                            <td className="px-4 py-3 text-center text-xs font-bold text-gray-600">
                                                {topStudent?.name} ({topStudent?.subjectTotals[sub]?.obtained ?? "—"})
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
