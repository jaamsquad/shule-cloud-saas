import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";
import { 
    TrendingUp, Printer, Search, Filter, Award, 
    Calendar, CheckCircle, Star, BookOpen, User 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function StudentProgressReport() {
    const [selectedStudent, setSelectedStudent] = useState("");
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [searchTerm, setSearchTerm] = useState("");

    // Fetch student list for dropdown
    const { data: studentsList = [] } = useQuery({
        queryKey: ["reports_students_dropdown"],
        queryFn: async () => (await api.get("/reports/students-info", { params: { limit: 100 } })).data?.data || []
    });

    // Fetch tenant profile for institute name and logo
    const { data: profileData } = useQuery({
        queryKey: ["tenant_profile_global"],
        queryFn: async () => {
            const r = await api.get("/auth/tenant/profile");
            return Array.isArray(r.data) ? r.data[0] : r.data;
        },
        staleTime: Infinity,
        gcTime: Infinity,
    });

    const { data: resData, isLoading } = useQuery({
        queryKey: ["reports_student_progress", selectedStudent, selectedYear],
        queryFn: async () => {
            const res = await api.get("/reports/student-progress", {
                params: { student_id: selectedStudent, year: selectedYear }
            });
            return res.data;
        },
        enabled: !!selectedStudent,   // no default student — fetch only after one is chosen
    });

    const student = resData?.student || null;
    const historicalExams = resData?.historicalExams || [];
    const attendanceTrends = resData?.attendanceTrends || [];
    const evaluations = resData?.evaluations || [];

    const handlePrint = () => {
        const schoolLogo = profileData?.logo || "";
        const schoolName = profileData?.name || 'ShuleCloud International Academy';

        const logoHtml = schoolLogo
            ? `<img src="${schoolLogo}" style="max-height: 80px; width: auto; object-fit: contain; margin: 0 auto 12px;" />`
            : `<div style="width: 60px; height: 60px; border-radius: 50%; background: #4F46E5; color: white; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold; margin: 0 auto 12px;">SC</div>`;

        const examsHtml = historicalExams.map((e: any) => `
            <tr style="border-bottom: 1px solid #E2E8F0;">
                <td style="padding: 12px 16px; font-weight: 700; color: #1E293B;">${e.term}</td>
                <td style="padding: 12px 16px; font-weight: 600; color: #0F172A;">${e.examName}</td>
                <td style="padding: 12px 16px; text-align: center; font-weight: 800; color: #4F46E5;">${e.gpa}</td>
                <td style="padding: 12px 16px; text-align: center; color: #475569;">${e.totalMarks}</td>
                <td style="padding: 12px 16px; text-align: center; font-weight: 700; color: #10B981;">${e.average}%</td>
            </tr>
        `).join("");

        const evalsHtml = evaluations.map((ev: any) => `
            <tr style="border-bottom: 1px solid #E2E8F0;">
                <td style="padding: 12px 16px; font-weight: 700; color: #1E293B;">${ev.category}</td>
                <td style="padding: 12px 16px; font-weight: 800; color: #10B981;">${ev.rating}</td>
                <td style="padding: 12px 16px; color: #475569; font-style: italic;">${ev.remarks}</td>
            </tr>
        `).join("");

        const html = `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>Student Progress Report - ${student.name}</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
                @page { size: A4 portrait; margin: 20mm; }
                body { font-family: 'Inter', sans-serif; color: #0F172A; background: #fff; margin: 0; padding: 0; font-size: 12px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                .header { text-align: center; border-bottom: 3px solid #4F46E5; padding-bottom: 15px; margin-bottom: 25px; }
                .school-title { font-size: 24px; font-weight: 800; color: #1E293B; margin: 0; text-transform: uppercase; letter-spacing: 1px; }
                .report-title { font-size: 16px; font-weight: 600; color: #4F46E5; margin-top: 5px; }
                .meta-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; background: #F8FAFC; padding: 15px; border-radius: 10px; border: 1px solid #E2E8F0; margin-bottom: 25px; }
                .meta-label { font-weight: 600; color: #64748B; font-size: 10px; text-transform: uppercase; display: block; margin-bottom: 2px; }
                .meta-val { font-weight: 700; color: #0F172A; font-size: 14px; }
                .section-title { font-size: 15px; font-weight: 700; color: #1E293B; margin-bottom: 12px; border-bottom: 2px solid #E2E8F0; padding-bottom: 5px; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 30px; border-radius: 6px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
                th { background: #4F46E5; color: #fff; padding: 10px 14px; text-align: left; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
                .footer { margin-top: 40px; padding-top: 15px; border-top: 1px solid #CBD5E1; display: flex; justify-content: space-between; font-size: 10px; color: #94A3B8; }
            </style>
        </head>
        <body>
            <div class="header">
                ${logoHtml}
                <h1 class="school-title">${schoolName}</h1>
                <div class="report-title">Student Comprehensive Progress & Performance Report</div>
            </div>

            <div class="meta-grid">
                <div><span class="meta-label">Student Name</span><span class="meta-val">${student.name}</span></div>
                <div><span class="meta-label">Admission No.</span><span class="meta-val">${student.admNo}</span></div>
                <div><span class="meta-label">Class / Grade</span><span class="meta-val">${student.className}</span></div>
            </div>

            <div class="section-title">Historical Academic Performance</div>
            <table>
                <thead>
                    <tr>
                        <th>Academic Term</th>
                        <th>Examination</th>
                        <th style="text-align: center;">GPA / Mean</th>
                        <th style="text-align: center;">Total Marks</th>
                        <th style="text-align: center;">Average (%)</th>
                    </tr>
                </thead>
                <tbody>${examsHtml}</tbody>
            </table>

            <div class="section-title">Behavioral & Extracurricular Evaluations</div>
            <table>
                <thead>
                    <tr>
                        <th>Evaluation Category</th>
                        <th>Rating</th>
                        <th>Teacher Remarks</th>
                    </tr>
                </thead>
                <tbody>${evalsHtml}</tbody>
            </table>

            <div class="footer">
                <span>Official Institutional Registry Report</span>
                <span>Printed: ${new Date().toLocaleDateString()}</span>
            </div>
        </body>
        </html>`;

        const win = window.open("", "_blank", "width=900,height=1000");
        if (!win) { toast.error("Pop-up blocked"); return; }
        win.document.write(html);
        win.document.close();
        win.focus();
        win.onload = () => { win.print(); };
    };

    return (
        <div className="flex-1 bg-[#f8fafc] p-8 space-y-8 overflow-y-auto custom-scrollbar animate-in fade-in duration-500">
            {/* Header */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-inner">
                        <TrendingUp className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Student Progress Report</h1>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">Term-over-Term GPA Trends & Behavioral Evaluations</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <input
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Search student name or adm…"
                        className="h-11 px-4 bg-slate-50 border border-slate-200/60 rounded-xl text-xs font-bold text-slate-600 outline-none focus:border-indigo-500 transition-colors w-full md:w-56"
                    />
                    <select
                        value={selectedStudent}
                        onChange={e => setSelectedStudent(e.target.value)}
                        className="h-11 px-4 bg-slate-50 border border-slate-200/60 rounded-xl text-xs font-bold text-slate-600 outline-none focus:border-indigo-500 transition-colors w-full md:w-64"
                    >
                        <option value="">Select a student…</option>
                        {studentsList
                            .filter((s: any) => !searchTerm || `${s.name} ${s.admNo}`.toLowerCase().includes(searchTerm.toLowerCase()))
                            .map((s: any) => (
                                <option key={s._id} value={s._id}>{s.name} ({s.admNo})</option>
                            ))}
                    </select>

                    <select 
                        value={selectedYear} 
                        onChange={e => setSelectedYear(Number(e.target.value))}
                        className="h-11 px-4 bg-slate-50 border border-slate-200/60 rounded-xl text-xs font-bold text-slate-600 outline-none focus:border-indigo-500 transition-colors"
                    >
                        {[2024, 2025, 2026, 2027].map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>

                    <Button 
                        onClick={handlePrint}
                        className="h-11 bg-indigo-600 hover:bg-indigo-700 text-white border-none font-bold text-xs gap-2 rounded-xl shadow-lg shadow-indigo-100"
                    >
                        <Printer className="w-4 h-4" /> Print Progress PDF
                    </Button>
                </div>
            </div>

            {!student ? (
                <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
                    <User className="w-12 h-12" />
                    <p className="font-black uppercase tracking-widest text-xs">{isLoading ? "Loading…" : "Search and select a student to view their progress"}</p>
                </div>
            ) : (
              <>
            {/* Student Profile Overview */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 font-black text-xl border border-slate-200">
                        <User className="w-7 h-7 text-slate-500" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-slate-800 tracking-tight">{student.name}</h2>
                        <div className="flex items-center gap-3 mt-1">
                            <Badge className="bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold text-xs px-2.5 py-0.5 rounded-md shadow-none">
                                {student.admNo}
                            </Badge>
                            <span className="text-xs font-bold text-slate-500">{student.className}</span>
                        </div>
                    </div>
                </div>

                <div className="flex gap-8 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-8 w-full md:w-auto justify-around md:justify-start">
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Latest GPA</p>
                        <h4 className="text-2xl font-black text-indigo-600">3.85</h4>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Attendance Rate</p>
                        <h4 className="text-2xl font-black text-emerald-600">96.7%</h4>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Conduct</p>
                        <h4 className="text-2xl font-black text-amber-600">Excellent</h4>
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                {/* GPA Trend */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
                    <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
                        <div className="w-2 h-5 bg-indigo-600 rounded-full" />
                        <h3 className="text-base font-black text-slate-800 tracking-tight">Term-over-Term GPA Trend</h3>
                    </div>
                    <div className="h-[280px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={historicalExams}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="term" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} />
                                <YAxis domain={[2.0, 4.0]} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} />
                                <Tooltip contentStyle={{ borderRadius: '12px', borderColor: '#e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }} />
                                <Line type="monotone" dataKey="gpa" stroke="#4F46E5" strokeWidth={3} dot={{ stroke: '#4F46E5', strokeWidth: 3, r: 6, fill: '#fff' }} activeDot={{ r: 8 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Attendance Trend */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
                    <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
                        <div className="w-2 h-5 bg-emerald-600 rounded-full" />
                        <h3 className="text-base font-black text-slate-800 tracking-tight">Attendance Consistency (%)</h3>
                    </div>
                    <div className="h-[280px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={attendanceTrends}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="term" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} />
                                <YAxis domain={[80, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} />
                                <Tooltip contentStyle={{ borderRadius: '12px', borderColor: '#e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }} />
                                <Bar dataKey="presentPercentage" fill="#10B981" radius={[8, 8, 0, 0]} barSize={36} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Tables Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                {/* Historical Exams Table */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
                        <Award className="w-5 h-5 text-indigo-600" />
                        <h3 className="text-base font-black text-slate-800 tracking-tight">Exam Records</h3>
                    </div>
                    <Table>
                        <TableHeader className="bg-slate-50/75 border-b border-slate-100">
                            <TableRow className="h-11 hover:bg-transparent">
                                <TableHead className="font-black text-[11px] text-slate-400 uppercase tracking-wider px-6">Term</TableHead>
                                <TableHead className="font-black text-[11px] text-slate-400 uppercase tracking-wider px-6">Exam</TableHead>
                                <TableHead className="font-black text-[11px] text-slate-400 uppercase tracking-wider px-6 text-center">GPA</TableHead>
                                <TableHead className="font-black text-[11px] text-slate-400 uppercase tracking-wider px-6 text-center">Average</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={4} className="text-center py-8 text-slate-400 font-bold text-xs uppercase tracking-widest animate-pulse">Loading exams...</TableCell></TableRow>
                            ) : historicalExams.length === 0 ? (
                                <TableRow><TableCell colSpan={4} className="text-center py-8 text-slate-400 font-bold text-xs uppercase tracking-widest">No exam records found</TableCell></TableRow>
                            ) : (
                                historicalExams.map((e: any, idx: number) => (
                                    <TableRow key={idx} className="h-14 hover:bg-slate-50/50 transition-colors border-b border-slate-50">
                                        <TableCell className="px-6 font-bold text-slate-800 text-xs">{e.term}</TableCell>
                                        <TableCell className="px-6 text-xs font-semibold text-slate-600">{e.examName}</TableCell>
                                        <TableCell className="px-6 text-center">
                                            <Badge className="bg-indigo-50 text-indigo-700 border border-indigo-200 font-black text-xs px-2.5 py-0.5 rounded-md shadow-none">
                                                {e.gpa}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="px-6 text-center font-black text-emerald-600 text-xs">{e.average}%</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Evaluations Table */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
                        <Star className="w-5 h-5 text-amber-500" />
                        <h3 className="text-base font-black text-slate-800 tracking-tight">Behavioral & Co-curricular</h3>
                    </div>
                    <Table>
                        <TableHeader className="bg-slate-50/75 border-b border-slate-100">
                            <TableRow className="h-11 hover:bg-transparent">
                                <TableHead className="font-black text-[11px] text-slate-400 uppercase tracking-wider px-6">Category</TableHead>
                                <TableHead className="font-black text-[11px] text-slate-400 uppercase tracking-wider px-6 text-center">Rating</TableHead>
                                <TableHead className="font-black text-[11px] text-slate-400 uppercase tracking-wider px-6">Remarks</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={3} className="text-center py-8 text-slate-400 font-bold text-xs uppercase tracking-widest animate-pulse">Loading evaluations...</TableCell></TableRow>
                            ) : evaluations.length === 0 ? (
                                <TableRow><TableCell colSpan={3} className="text-center py-8 text-slate-400 font-bold text-xs uppercase tracking-widest">No evaluations found</TableCell></TableRow>
                            ) : (
                                evaluations.map((ev: any, idx: number) => (
                                    <TableRow key={idx} className="h-14 hover:bg-slate-50/50 transition-colors border-b border-slate-50">
                                        <TableCell className="px-6 font-bold text-slate-800 text-xs">{ev.category}</TableCell>
                                        <TableCell className="px-6 text-center">
                                            <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-black text-[10px] px-2.5 py-0.5 rounded-md uppercase shadow-none">
                                                {ev.rating}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="px-6 text-xs text-slate-500 font-medium italic">{ev.remarks}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
              </>
            )}
        </div>
    );
}
