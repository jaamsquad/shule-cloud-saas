import { useState, useMemo } from "react";
import { ArrowLeft, Users, BookOpen, Briefcase, BarChart3, Award, Printer, ChevronRight, Loader2, TrendingUp, TrendingDown, GraduationCap } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import api from "@/lib/api";
import { openPrintDoc } from "@/lib/pdfDoc";

const TABS = [
    { id: "overview",   label: "Overview",         icon: BarChart3 },
    { id: "class",      label: "Per Class",         icon: Users },
    { id: "subject",    label: "Per Subject",       icon: BookOpen },
    { id: "teacher",    label: "Per Teacher",       icon: Briefcase },
    { id: "rankings",   label: "Rankings",          icon: Award },
];

function pct(obtained: number, max: number) { return max > 0 ? Math.round((obtained / max) * 100) : 0; }
function grade(p: number) { if (p>=80) return "A"; if (p>=70) return "B+"; if (p>=60) return "B"; if (p>=50) return "C+"; if (p>=40) return "C"; if (p>=33) return "D"; return "F"; }
function gColor(p: number) { return p>=70?"text-emerald-600":p>=50?"text-amber-600":"text-red-500"; }

export default function ExamDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [tab, setTab] = useState("overview");
    const [rankClass, setRankClass] = useState("");

    // ── Queries ───────────────────────────────────────────────────────────────
    const { data: exam } = useQuery<any>({
        queryKey: ["exam_detail", id],
        queryFn: async () => (await api.get(`/academics/exams/${id}`)).data,
        enabled: !!id,
    });
    const { data: allMarks = [], isLoading: loadMarks } = useQuery<any[]>({
        queryKey: ["exam_all_marks", id],
        queryFn: async () => (await api.get(`/academics/exam-marks?examId=${id}`)).data || [],
        enabled: !!id,
    });
    const { data: students = [] } = useQuery<any[]>({
        queryKey: ["students"],
        queryFn: async () => (await api.get("/students")).data || [],
    });
    const { data: staff = [] } = useQuery<any[]>({
        queryKey: ["staff"],
        queryFn: async () => (await api.get("/staff")).data || [],
    });
    const { data: classes = [] } = useQuery<any[]>({
        queryKey: ["classes"],
        queryFn: async () => (await api.get("/academics/classes")).data || [],
    });
    const { data: subjects = [] } = useQuery<any[]>({
        queryKey: ["subjects"],
        queryFn: async () => (await api.get("/subjects")).data || [],
    });
    const { data: tenantProfile } = useQuery<any>({
        queryKey: ["tenant_profile_global"],
        queryFn: async () => { const r = await api.get("/auth/tenant/profile"); return Array.isArray(r.data) ? r.data[0] : r.data; },
    });

    // ── Derived analytics ─────────────────────────────────────────────────────
    const studentMap = useMemo(() => {
        const m = new Map<string, any>();
        students.forEach((s: any) => m.set(s._id?.toString(), s));
        return m;
    }, [students]);

    const allStudentIds = useMemo(() => [...new Set(allMarks.map((m: any) => m.studentId?.toString()))], [allMarks]);
    const uniqueSubjectNames = useMemo(() => [...new Set(allMarks.map((m: any) => m.subjectName).filter(Boolean))], [allMarks]);
    // Marks are saved with `className` (see ExamMarks.tsx line 228); also check legacy field names
    const classNames = useMemo(() => [
        ...new Set(allMarks.map((m: any) => m.className || m.studentClass || m.class).filter(Boolean))
    ], [allMarks]);

    // Per-student totals
    const perStudent = useMemo(() => {
        return allStudentIds.map(sid => {
            const sMarks = allMarks.filter((m: any) => m.studentId?.toString() === sid);
            const obtained = sMarks.reduce((s: number, m: any) => s + (Number(m.marksObtained) || 0), 0);
            const maxM = sMarks.reduce((s: number, m: any) => s + (Number(m.totalMarks) || 100), 0);
            const p = pct(obtained, maxM);
            const student = studentMap.get(sid) || sMarks[0];
            return {
                studentId: sid,
                name: student?.studentName || `${student?.firstName || ""} ${student?.lastName || ""}`.trim() || "—",
                admNo: student?.admNo || student?.registrationNo || "—",
                class: student?.studentClass || sMarks[0]?.className || sMarks[0]?.studentClass || sMarks[0]?.class || "—",
                photo: student?.avatar || student?.studentPhoto || null,
                obtained, max: maxM, pct: p, grade: grade(p), marks: sMarks,
            };
        }).sort((a, b) => b.pct - a.pct);
    }, [allStudentIds, allMarks, studentMap]);

    // Per-class analytics
    const perClass = useMemo(() => {
        return classNames.map(cls => {
            const clsStudents = perStudent.filter(s => s.class === cls);
            if (!clsStudents.length) return null;
            const avg = Math.round(clsStudents.reduce((s, x) => s + x.pct, 0) / clsStudents.length);
            const passCount = clsStudents.filter(s => s.pct >= 50).length;
            return { class: cls, students: clsStudents.length, avg, passCount, failCount: clsStudents.length - passCount, grade: grade(avg) };
        }).filter(Boolean).sort((a: any, b: any) => b.avg - a.avg);
    }, [classNames, perStudent]);

    // Per-subject analytics
    const perSubject = useMemo(() => {
        return uniqueSubjectNames.map(subName => {
            const subMarks = allMarks.filter((m: any) => m.subjectName === subName);
            const obtained = subMarks.reduce((s: number, m: any) => s + (Number(m.marksObtained) || 0), 0);
            const maxM = subMarks.reduce((s: number, m: any) => s + (Number(m.totalMarks) || 100), 0);
            const avg = pct(obtained, maxM);
            const passCount = subMarks.filter((m: any) => pct(Number(m.marksObtained), Number(m.totalMarks)) >= 50).length;
            const highest = Math.max(...subMarks.map((m: any) => Number(m.marksObtained) || 0));
            const lowest  = Math.min(...subMarks.filter((m: any) => m.marksObtained !== null).map((m: any) => Number(m.marksObtained) || 0));
            return { subject: subName, entries: subMarks.length, avg, passCount, failCount: subMarks.length - passCount, highest, lowest, grade: grade(avg) };
        }).sort((a, b) => b.avg - a.avg);
    }, [uniqueSubjectNames, allMarks]);

    // Per-teacher analytics (teachers assigned via staff.specializedSubjects matching subject names)
    const perTeacher = useMemo(() => {
        return staff
            .filter((s: any) => {
                const d = (s.designation || s.role || "").toLowerCase();
                return d.includes("teacher") || s.isTeachingStaff;
            })
            .map((teacher: any) => {
                const tSubjects = (teacher.specializedSubjects || [])
                    .map((sid: any) => subjects.find((sub: any) => sub._id?.toString() === sid?.toString())?.name)
                    .filter(Boolean);
                const tMarks = allMarks.filter((m: any) => tSubjects.includes(m.subjectName));
                if (!tMarks.length) return null;
                const obtained = tMarks.reduce((s: number, m: any) => s + (Number(m.marksObtained) || 0), 0);
                const maxM    = tMarks.reduce((s: number, m: any) => s + (Number(m.totalMarks) || 100), 0);
                const avg     = pct(obtained, maxM);
                return {
                    name: teacher.employeeName || teacher.name || "—",
                    subjects: tSubjects.join(", ") || "—",
                    entries: tMarks.length, avg, grade: grade(avg),
                    passCount: tMarks.filter((m: any) => pct(Number(m.marksObtained), Number(m.totalMarks)) >= 50).length,
                };
            }).filter(Boolean).sort((a: any, b: any) => b.avg - a.avg);
    }, [staff, allMarks, subjects]);

    // ── Print ranking sheet ────────────────────────────────────────────────────
    const printRanking = (cls: string) => {
        const clsStudents = perStudent
            .filter(s => !cls || s.class === cls)
            .sort((a, b) => b.pct - a.pct);

        const win = openPrintDoc();
        if (!win) return;
        const schoolName = tenantProfile?.name || tenantProfile?.instituteName || "School";
        const schoolLogo = tenantProfile?.logo || tenantProfile?.logoUrl || "";
        const rows = clsStudents.map((s, idx) => `
            <tr style="${idx < 3 ? 'background:#fffbeb' : ''}">
                <td style="padding:8px 12px;text-align:center;font-weight:900;color:${idx === 0 ? '#f59e0b' : idx === 1 ? '#94a3b8' : idx === 2 ? '#b45309' : '#5C67F2'}">${idx + 1}</td>
                <td style="padding:8px 12px;font-weight:700">${s.name}</td>
                <td style="padding:8px 12px;text-align:center;color:#64748b">${s.admNo}</td>
                <td style="padding:8px 12px;text-align:center">${s.class}</td>
                <td style="padding:8px 12px;text-align:center;font-weight:900;color:#5C67F2">${s.obtained}/${s.max}</td>
                <td style="padding:8px 12px;text-align:center;font-weight:900;color:${s.pct >= 50 ? '#10b981' : '#ef4444'}">${s.pct}%</td>
                <td style="padding:8px 12px;text-align:center;font-weight:900">${s.grade}</td>
                <td style="padding:8px 12px;text-align:center">${s.pct >= 50 ? "✅ Pass" : "❌ Fail"}</td>
            </tr>
        `).join("");

        win.document.write(`<!DOCTYPE html><html><head><title>Rankings – ${exam?.examName} – ${cls || 'All Classes'}</title>
        <style>body{font-family:Arial,sans-serif;padding:32px;color:#1e293b;max-width:900px;margin:0 auto}
        .header{display:flex;align-items:center;gap:16px;border-bottom:3px solid #5C67F2;padding-bottom:16px;margin-bottom:24px}
        .header img{height:56px;object-fit:contain}
        h1{font-size:20px;font-weight:900;color:#5C67F2;text-transform:uppercase}
        h2{font-size:14px;color:#64748b;margin:0}
        table{width:100%;border-collapse:collapse;font-size:12px}
        th{background:#5C67F2;color:white;padding:10px 12px;text-align:center;font-size:10px;text-transform:uppercase;letter-spacing:1px}
        th:nth-child(2){text-align:left}
        tr:nth-child(even){background:#f8fafc}
        .summary{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:20px 0;text-align:center}
        .sum-box{background:#eff6ff;border-radius:8px;padding:12px;border:1px solid #bfdbfe}
        .sum-box label{font-size:9px;text-transform:uppercase;color:#94a3b8;font-weight:700;display:block;letter-spacing:1px}
        .sum-box span{font-size:20px;font-weight:900;color:#5C67F2}
        .medal{font-size:20px}
        @media print{@page{margin:15mm}}</style></head><body>
        <div class="header">
            ${schoolLogo ? `<img src="${schoolLogo}" />` : ""}
            <div><h1>${schoolName}</h1><h2>${exam?.examName} · ${cls ? cls + " · " : ""}Ranking Sheet</h2></div>
        </div>
        <div class="summary">
            <div class="sum-box"><label>Total Students</label><span>${clsStudents.length}</span></div>
            <div class="sum-box"><label>Class Average</label><span>${clsStudents.length ? Math.round(clsStudents.reduce((s, x) => s + x.pct, 0) / clsStudents.length) : 0}%</span></div>
            <div class="sum-box"><label>Pass</label><span style="color:#10b981">${clsStudents.filter(s => s.pct >= 50).length}</span></div>
            <div class="sum-box"><label>Fail</label><span style="color:#ef4444">${clsStudents.filter(s => s.pct < 50).length}</span></div>
        </div>
        <table><thead><tr>
            <th>#</th><th style="text-align:left">Student</th><th>Adm No</th>
            <th>Class</th><th>Marks</th><th>%</th><th>Grade</th><th>Result</th>
        </tr></thead><tbody>${rows}</tbody></table>
        <div style="margin-top:48px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:32px">
            ${["Class Teacher","Principal / Head","Parent / Guardian"].map(r => `
                <div style="text-align:center"><div style="height:40px;border-bottom:1px dashed #94a3b8;margin-bottom:6px"></div>
                <p style="font-size:9px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px">${r}</p></div>
            `).join("")}
        </div>
        <script>window.onload=()=>window.print()</script></body></html>`);
        win.document.close();
    };

    if (!exam) return <div className="flex-1 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#5C67F2]" /></div>;

    const overall = perStudent.length > 0 ? Math.round(perStudent.reduce((s, x) => s + x.pct, 0) / perStudent.length) : 0;

    return (
        <div className="flex-1 bg-[#f3f4f6] min-h-screen flex flex-col pb-10">
            {/* Header */}
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-2">
                    <button onClick={() => navigate("/exams/create")} className="text-gray-400 hover:text-[#5C67F2]">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <span className="text-gray-300">|</span>
                    <span className="text-gray-500 font-medium text-sm cursor-pointer hover:text-[#5C67F2]" onClick={() => navigate("/exams/create")}>Exams</span>
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                    <span className="font-black text-[#5C67F2] text-sm truncate max-w-xs">{exam.examName}</span>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => navigate(`/exams/edit/${id}`)}
                        className="px-4 py-2 border border-gray-200 text-gray-600 font-bold text-xs rounded-xl hover:bg-gray-50 transition-all">
                        Edit Exam
                    </button>
                    <button onClick={() => navigate(`/exams/${id}/rankings`)}
                        className="px-4 py-2 bg-indigo-50 text-[#5C67F2] border border-indigo-200 font-bold text-xs rounded-xl hover:bg-indigo-100 transition-all">
                        Full Analytics →
                    </button>
                    <button onClick={() => navigate("/exams/marks")}
                        className="px-4 py-2 bg-[#5C67F2] text-white font-bold text-xs rounded-xl hover:bg-[#4a54c4] transition-all shadow-sm">
                        Enter Marks →
                    </button>
                </div>
            </div>

            {/* Exam info banner */}
            <div className="bg-gradient-to-r from-[#5C67F2] to-indigo-600 px-8 py-5 text-white">
                <div className="max-w-6xl mx-auto flex items-start justify-between">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-white/60 mb-1">
                            {exam.type} · {exam.term || exam.academicYear}
                        </p>
                        <h1 className="text-2xl font-black">{exam.examName}</h1>
                        <p className="text-white/70 text-sm mt-1">
                            {exam.startDate ? new Date(exam.startDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "—"}
                            {exam.endDate ? ` → ${new Date(exam.endDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}` : ""}
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <div className="bg-white/10 rounded-2xl px-4 py-3 text-center min-w-[80px]">
                            <p className="text-lg font-black">{perStudent.length}</p>
                            <p className="text-[9px] font-bold text-white/60 uppercase">Scored</p>
                        </div>
                        <div className="bg-white/10 rounded-2xl px-4 py-3 text-center min-w-[80px]">
                            <p className="text-lg font-black">{overall}%</p>
                            <p className="text-[9px] font-bold text-white/60 uppercase">Avg</p>
                        </div>
                        <div className="bg-white/10 rounded-2xl px-4 py-3 text-center min-w-[80px]">
                            <p className="text-lg font-black">{perStudent.filter(s => s.pct >= 50).length}</p>
                            <p className="text-[9px] font-bold text-white/60 uppercase">Pass</p>
                        </div>
                        <div className="bg-white/10 rounded-2xl px-4 py-3 text-center min-w-[80px]">
                            <p className="text-lg font-black">{grade(overall)}</p>
                            <p className="text-[9px] font-bold text-white/60 uppercase">Grade</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white border-b border-gray-100 px-8">
                <div className="max-w-6xl mx-auto flex gap-1">
                    {TABS.map(t => (
                        <button key={t.id} onClick={() => setTab(t.id)}
                            className={`flex items-center gap-1.5 px-4 py-3 text-xs font-black uppercase tracking-wide border-b-2 transition-all -mb-px ${tab === t.id ? "border-[#5C67F2] text-[#5C67F2]" : "border-transparent text-gray-400 hover:text-gray-600"}`}>
                            <t.icon className="w-3.5 h-3.5" /> {t.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="max-w-6xl mx-auto w-full px-8 pt-6 space-y-5">

                {/* ── OVERVIEW ──────────────────────────────────────────────── */}
                {tab === "overview" && (
                    <div className="grid grid-cols-2 gap-5">
                        {/* School-wide summary */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                            <h3 className="text-sm font-black text-gray-800 mb-4">School Performance Summary</h3>
                            <div className="space-y-3">
                                {[
                                    { label: "Total Students Examined", value: perStudent.length },
                                    { label: "Students Passed", value: `${perStudent.filter(s => s.pct >= 50).length} (${perStudent.length ? Math.round(perStudent.filter(s => s.pct >= 50).length / perStudent.length * 100) : 0}%)` },
                                    { label: "Students Failed",  value: `${perStudent.filter(s => s.pct < 50).length}` },
                                    { label: "School Average",   value: `${overall}% (${grade(overall)})` },
                                    { label: "Highest Score",    value: perStudent[0] ? `${perStudent[0].pct}% — ${perStudent[0].name}` : "—" },
                                    { label: "Classes Examined", value: classNames.length },
                                    { label: "Subjects Covered", value: uniqueSubjectNames.length },
                                ].map(r => (
                                    <div key={r.label} className="flex justify-between text-sm border-b border-gray-50 pb-2">
                                        <span className="text-gray-500 font-medium">{r.label}</span>
                                        <span className="font-black text-gray-800">{r.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Top/Bottom 5 */}
                        <div className="space-y-4">
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                                <h3 className="text-xs font-black text-emerald-600 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                                    <TrendingUp className="w-3.5 h-3.5" /> Top 5 Students
                                </h3>
                                <div className="space-y-2">
                                    {perStudent.slice(0, 5).map((s, i) => (
                                        <div key={s.studentId} className="flex items-center gap-3">
                                            <span className="w-6 h-6 rounded-full bg-indigo-50 text-[#5C67F2] font-black text-xs flex items-center justify-center">{i + 1}</span>
                                            <span className="flex-1 text-sm font-bold text-gray-800 truncate">{s.name}</span>
                                            <span className="text-xs font-black" style={{ color: s.pct >= 70 ? "#10b981" : "#f59e0b" }}>{s.pct}%</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                                <h3 className="text-xs font-black text-amber-600 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                                    <TrendingDown className="w-3.5 h-3.5" /> Need Attention (Bottom 5)
                                </h3>
                                <div className="space-y-2">
                                    {[...perStudent].reverse().slice(0, 5).map((s, i) => (
                                        <div key={s.studentId} className="flex items-center gap-3">
                                            <span className="w-6 h-6 rounded-full bg-red-50 text-red-500 font-black text-xs flex items-center justify-center">{perStudent.length - i}</span>
                                            <span className="flex-1 text-sm font-bold text-gray-800 truncate">{s.name}</span>
                                            <span className="text-xs font-black text-red-500">{s.pct}%</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── PER CLASS ─────────────────────────────────────────────── */}
                {tab === "class" && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {perClass.map((cls: any) => (
                                <div key={cls.class} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="text-base font-black text-gray-800">{cls.class}</h3>
                                        <span className={`text-sm font-black ${gColor(cls.avg)}`}>{cls.avg}%</span>
                                    </div>
                                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
                                        <div className="h-full rounded-full transition-all" style={{ width: `${cls.avg}%`, backgroundColor: cls.avg >= 70 ? "#10b981" : cls.avg >= 50 ? "#f59e0b" : "#ef4444" }} />
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 text-center text-[10px] mb-4">
                                        <div className="bg-gray-50 rounded-lg p-2">
                                            <p className="font-black text-gray-700">{cls.students}</p>
                                            <p className="text-gray-400 font-bold uppercase">Students</p>
                                        </div>
                                        <div className="bg-emerald-50 rounded-lg p-2">
                                            <p className="font-black text-emerald-700">{cls.passCount}</p>
                                            <p className="text-emerald-400 font-bold uppercase">Pass</p>
                                        </div>
                                        <div className="bg-red-50 rounded-lg p-2">
                                            <p className="font-black text-red-600">{cls.failCount}</p>
                                            <p className="text-red-400 font-bold uppercase">Fail</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button onClick={() => { setTab("rankings"); setRankClass(cls.class); }}
                                            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-[#5C67F2]/10 text-[#5C67F2] text-[10px] font-black uppercase rounded-xl hover:bg-[#5C67F2]/20 transition-all">
                                            <Award className="w-3 h-3" /> Rankings
                                        </button>
                                        <button onClick={() => printRanking(cls.class)}
                                            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-700 text-white text-[10px] font-black uppercase rounded-xl hover:bg-slate-800 transition-all">
                                            <Printer className="w-3 h-3" /> Print Sheet
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {perClass.length === 0 && <div className="text-center py-16 text-gray-400"><p className="font-bold">No class data available</p><p className="text-sm">Enter marks first</p></div>}
                    </div>
                )}

                {/* ── PER SUBJECT ───────────────────────────────────────────── */}
                {tab === "subject" && (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gradient-to-r from-[#5C67F2] to-indigo-500 text-white">
                                    <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest">Subject</th>
                                    <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest">Entries</th>
                                    <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest">Average</th>
                                    <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest">Grade</th>
                                    <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest">Pass</th>
                                    <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest">Fail</th>
                                    <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest">Highest</th>
                                    <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest">Lowest</th>
                                </tr>
                            </thead>
                            <tbody>
                                {perSubject.map((sub: any, i: number) => (
                                    <tr key={sub.subject} className={`border-b border-gray-50 hover:bg-gray-50/50 ${i % 2 === 0 ? "bg-white" : "bg-gray-50/20"}`}>
                                        <td className="px-5 py-3 text-sm font-black text-gray-800">{sub.subject}</td>
                                        <td className="px-4 py-3 text-center text-xs font-bold text-gray-500">{sub.entries}</td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`text-sm font-black ${gColor(sub.avg)}`}>{sub.avg}%</span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className="text-xs font-black px-2 py-0.5 rounded-lg" style={{ backgroundColor: `${sub.avg >= 70 ? "#10b981" : sub.avg >= 50 ? "#f59e0b" : "#ef4444"}15`, color: sub.avg >= 70 ? "#10b981" : sub.avg >= 50 ? "#f59e0b" : "#ef4444" }}>
                                                {sub.grade}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center text-xs font-bold text-emerald-600">{sub.passCount}</td>
                                        <td className="px-4 py-3 text-center text-xs font-bold text-red-500">{sub.failCount}</td>
                                        <td className="px-4 py-3 text-center text-xs font-bold text-[#5C67F2]">{sub.highest}</td>
                                        <td className="px-4 py-3 text-center text-xs font-bold text-red-400">{sub.lowest}</td>
                                    </tr>
                                ))}
                                {perSubject.length === 0 && <tr><td colSpan={8} className="px-5 py-12 text-center text-gray-400 text-sm font-bold">No subject data available — enter marks first</td></tr>}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* ── PER TEACHER ───────────────────────────────────────────── */}
                {tab === "teacher" && (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gradient-to-r from-[#5C67F2] to-indigo-500 text-white">
                                    <th className="px-5 py-3 text-left text-[10px] font-black uppercase">Teacher</th>
                                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase">Subjects</th>
                                    <th className="px-4 py-3 text-center text-[10px] font-black uppercase">Entries</th>
                                    <th className="px-4 py-3 text-center text-[10px] font-black uppercase">Avg %</th>
                                    <th className="px-4 py-3 text-center text-[10px] font-black uppercase">Grade</th>
                                    <th className="px-4 py-3 text-center text-[10px] font-black uppercase">Pass</th>
                                </tr>
                            </thead>
                            <tbody>
                                {perTeacher.map((t: any, i: number) => (
                                    <tr key={t.name} className={`border-b border-gray-50 ${i % 2 === 0 ? "bg-white" : "bg-gray-50/20"}`}>
                                        <td className="px-5 py-3 text-sm font-black text-gray-800">{t.name}</td>
                                        <td className="px-4 py-3 text-xs font-medium text-gray-500">{t.subjects}</td>
                                        <td className="px-4 py-3 text-center text-xs font-bold text-gray-500">{t.entries}</td>
                                        <td className="px-4 py-3 text-center"><span className={`text-sm font-black ${gColor(t.avg)}`}>{t.avg}%</span></td>
                                        <td className="px-4 py-3 text-center"><span className="text-xs font-black px-2 py-0.5 rounded-lg bg-indigo-50 text-[#5C67F2]">{t.grade}</span></td>
                                        <td className="px-4 py-3 text-center text-xs font-bold text-emerald-600">{t.passCount}</td>
                                    </tr>
                                ))}
                                {perTeacher.length === 0 && <tr><td colSpan={6} className="px-5 py-12 text-center text-gray-400 text-sm font-bold">Assign subjects to teachers in Employees → Teachers first</td></tr>}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* ── RANKINGS ──────────────────────────────────────────────── */}
                {tab === "rankings" && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <select value={rankClass} onChange={e => setRankClass(e.target.value)}
                                    className="h-9 px-3 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 bg-white focus:outline-none focus:border-[#5C67F2]">
                                    <option value="">All Classes</option>
                                    {classNames.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <span className="text-sm font-bold text-gray-500">
                                    {perStudent.filter(s => !rankClass || s.class === rankClass).length} students
                                </span>
                            </div>
                            <button onClick={() => printRanking(rankClass)}
                                className="flex items-center gap-2 px-5 py-2 bg-slate-800 text-white font-black text-xs uppercase rounded-full hover:bg-slate-900 shadow-sm transition-all">
                                <Printer className="w-3.5 h-3.5" /> Print Ranking Sheet
                            </button>
                        </div>

                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-gradient-to-r from-slate-800 to-slate-700 text-white">
                                        <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest">Rank</th>
                                        <th className="px-4 py-3 text-left text-[10px] font-black uppercase">Student</th>
                                        <th className="px-4 py-3 text-center text-[10px] font-black uppercase">Adm No</th>
                                        <th className="px-4 py-3 text-center text-[10px] font-black uppercase">Class</th>
                                        <th className="px-4 py-3 text-center text-[10px] font-black uppercase">Marks</th>
                                        <th className="px-4 py-3 text-center text-[10px] font-black uppercase">%</th>
                                        <th className="px-4 py-3 text-center text-[10px] font-black uppercase">Grade</th>
                                        <th className="px-4 py-3 text-center text-[10px] font-black uppercase">Result</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {perStudent
                                        .filter(s => !rankClass || s.class === rankClass)
                                        .map((s, idx) => (
                                            <tr key={s.studentId} className={`border-b border-gray-50 ${idx < 3 ? "bg-amber-50/30" : idx % 2 === 0 ? "bg-white" : "bg-gray-50/20"}`}>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black mx-auto ${idx === 0 ? "bg-yellow-400 text-white" : idx === 1 ? "bg-gray-400 text-white" : idx === 2 ? "bg-amber-700 text-white" : "bg-gray-100 text-gray-600"}`}>
                                                        {idx < 3 ? ["🥇","🥈","🥉"][idx] : idx + 1}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        {s.photo ? <img src={s.photo} alt={s.name} className="w-7 h-7 rounded-full object-cover" /> :
                                                            <div className="w-7 h-7 rounded-full bg-indigo-50 text-[#5C67F2] font-black text-xs flex items-center justify-center">{s.name.charAt(0)}</div>}
                                                        <span className="text-sm font-black text-gray-800">{s.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-center text-xs font-bold text-gray-500">{s.admNo}</td>
                                                <td className="px-4 py-3 text-center text-xs font-bold text-gray-600">{s.class}</td>
                                                <td className="px-4 py-3 text-center text-sm font-black text-[#5C67F2]">{s.obtained}/{s.max}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <div className="flex flex-col items-center gap-0.5">
                                                        <span className={`text-sm font-black ${gColor(s.pct)}`}>{s.pct}%</span>
                                                        <div className="w-14 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                            <div className="h-full rounded-full" style={{ width: `${s.pct}%`, backgroundColor: s.pct >= 70 ? "#10b981" : s.pct >= 50 ? "#f59e0b" : "#ef4444" }} />
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className="text-xs font-black px-2 py-0.5 rounded-lg" style={{ backgroundColor: `${s.pct >= 70 ? "#10b981" : s.pct >= 50 ? "#f59e0b" : "#ef4444"}15`, color: s.pct >= 70 ? "#10b981" : s.pct >= 50 ? "#f59e0b" : "#ef4444" }}>
                                                        {s.grade}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {s.pct >= 50
                                                        ? <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">✅ Pass</span>
                                                        : <span className="text-[10px] font-black text-red-500 bg-red-50 px-2 py-0.5 rounded-full">❌ Fail</span>}
                                                </td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
