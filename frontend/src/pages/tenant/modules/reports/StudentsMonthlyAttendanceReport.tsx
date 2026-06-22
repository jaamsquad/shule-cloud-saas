import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";
import { 
    Calendar, Printer, Search, Filter, CheckCircle, 
    XCircle, Clock, AlertCircle, Users 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { openPrintDoc } from "@/lib/pdfDoc";

export default function StudentsMonthlyAttendanceReport() {
    const [selectedClass, setSelectedClass] = useState("");
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [searchTerm, setSearchTerm] = useState("");

    const { data: classes = [] } = useQuery({
        queryKey: ["reports_shared_classes"],
        queryFn: async () => (await api.get("/reports/shared/classes")).data
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
        queryKey: ["reports_attendance_monthly_students", selectedClass, selectedMonth, selectedYear],
        queryFn: async () => {
            const res = await api.get("/reports/attendance/monthly-students", {
                params: { class_id: selectedClass || undefined, month: selectedMonth, year: selectedYear }
            });
            return res.data;
        }
    });

    const studentsGrid = resData?.data || [];
    const meta = resData?.meta || { daysInMonth: 30, month: selectedMonth, year: selectedYear };
    const daysArray = Array.from({ length: meta.daysInMonth }, (_, i) => i + 1);

    const filteredGrid = studentsGrid.filter((s: any) => 
        s.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        s.admNo?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const MONTHS = [
        "January", "February", "March", "April", "May", "June", 
        "July", "August", "September", "October", "November", "December"
    ];

    const handlePrint = () => {
        const schoolLogo = profileData?.logo || "";
        const schoolName = profileData?.name || 'ShuleCloud International Academy';

        const logoHtml = schoolLogo
            ? `<img src="${schoolLogo}" style="max-height: 75px; width: auto; object-fit: contain; margin: 0 auto 12px;" />`
            : `<div style="width: 55px; height: 55px; border-radius: 50%; background: #10B981; color: white; display: flex; align-items: center; justify-content: center; font-size: 22px; font-weight: bold; margin: 0 auto 12px;">SC</div>`;

        const headersHtml = daysArray.map(d => `<th style="text-align:center;padding:8px 4px;font-size:10px;width:24px;">${d}</th>`).join("");
        
        const rowsHtml = filteredGrid.map((s: any, i: number) => {
            const dailyHtml = daysArray.map(d => {
                const st = s.dailyStatus[d];
                let bg = "#F1F5F9";
                let col = "#64748B";
                if (st === "P") { bg = "#DCFCE7"; col = "#15803D"; }
                else if (st === "A") { bg = "#FEE2E2"; col = "#B91C1C"; }
                else if (st === "L") { bg = "#FEF3C7"; col = "#D97706"; }
                else if (st === "E") { bg = "#EDE9FE"; col = "#6D28D9"; }

                return `<td style="text-align:center;padding:8px 4px;font-weight:700;font-size:10px;background:${bg};color:${col};border:1px solid #E2E8F0;">${st || '-'}</td>`;
            }).join("");

            return `
                <tr style="border-bottom: 1px solid #E2E8F0; background: ${i % 2 === 0 ? '#fff' : '#F8FAFC'};">
                    <td style="padding: 10px 12px; font-weight: 700; color: #1E293B; font-size:11px;">${s.admNo}</td>
                    <td style="padding: 10px 12px; font-weight: 600; color: #0F172A; font-size:11px; white-space:nowrap;">${s.studentName}</td>
                    ${dailyHtml}
                    <td style="text-align:center;padding:10px 6px;font-weight:700;color:#1E293B;font-size:11px;background:#F8FAFC;border-left:2px solid #CBD5E1;">${s.totalWorkingDays}</td>
                    <td style="text-align:center;padding:10px 6px;font-weight:800;color:#10B981;font-size:11px;background:#F8FAFC;">${s.presentCount}</td>
                    <td style="text-align:center;padding:10px 6px;font-weight:800;color:#EF4444;font-size:11px;background:#F8FAFC;">${s.absentCount}</td>
                    <td style="text-align:center;padding:10px 6px;font-weight:800;color:#6366F1;font-size:11px;background:#EEF2FF;border-left:1px solid #C7D2FE;">${s.percentage}</td>
                </tr>
            `;
        }).join("");

        const html = `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>Monthly Attendance Report - ${MONTHS[selectedMonth - 1]} ${selectedYear}</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
                @page { size: A4 landscape; margin: 10mm; }
                body { font-family: 'Inter', sans-serif; color: #0F172A; background: #fff; margin: 0; padding: 0; font-size: 11px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                .header { text-align: center; border-bottom: 3px solid #10B981; padding-bottom: 12px; margin-bottom: 20px; }
                .school-title { font-size: 22px; font-weight: 800; color: #1E293B; margin: 0; text-transform: uppercase; letter-spacing: 1px; }
                .report-title { font-size: 15px; font-weight: 600; color: #10B981; margin-top: 4px; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 20px; border-radius: 6px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
                th { background: #10B981; color: #fff; padding: 10px 6px; text-align: left; font-weight: 700; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; border: 1px solid #059669; }
                .footer { margin-top: 30px; padding-top: 12px; border-top: 1px solid #CBD5E1; display: flex; justify-content: space-between; font-size: 10px; color: #94A3B8; }
                .legend { display: flex; gap: 15px; justify-content: center; margin-bottom: 15px; font-size: 10px; font-weight: 600; }
                .legend-item { display: flex; align-items: center; gap: 5px; }
                .legend-box { width: 12px; height: 12px; border-radius: 3px; }
            </style>
        </head>
        <body>
            <div class="header">
                ${logoHtml}
                <h1 class="school-title">${schoolName}</h1>
                <div class="report-title">Students Monthly Attendance Register — ${MONTHS[selectedMonth - 1]} ${selectedYear}</div>
            </div>

            <div class="legend">
                <div class="legend-item"><div class="legend-box" style="background:#DCFCE7;border:1px solid #15803D;"></div> P - Present</div>
                <div class="legend-item"><div class="legend-box" style="background:#FEE2E2;border:1px solid #B91C1C;"></div> A - Absent</div>
                <div class="legend-item"><div class="legend-box" style="background:#FEF3C7;border:1px solid #D97706;"></div> L - Late</div>
                <div class="legend-item"><div class="legend-box" style="background:#EDE9FE;border:1px solid #6D28D9;"></div> E - Excused</div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th style="width: 50px;">Adm No</th>
                        <th style="min-width: 140px;">Student Name</th>
                        ${headersHtml}
                        <th style="text-align:center;width:40px;">Work</th>
                        <th style="text-align:center;width:40px;">Pres</th>
                        <th style="text-align:center;width:40px;">Abs</th>
                        <th style="text-align:center;width:50px;">%</th>
                    </tr>
                </thead>
                <tbody>${rowsHtml}</tbody>
            </table>

            <div class="footer">
                <span>Official Monthly Attendance Registry Report</span>
                <span>Total Students: ${filteredGrid.length} | Printed: ${new Date().toLocaleDateString()}</span>
            </div>
        </body>
        </html>`;

        const win = openPrintDoc();
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
                    <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 shadow-inner">
                        <Calendar className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Students Monthly Attendance</h1>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">Monthly Roster Register & Percentage Tracking</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/60 w-full md:w-auto">
                        <Search className="w-4 h-4 text-slate-400" />
                        <Input 
                            value={searchTerm} 
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Search student..." 
                            className="h-8 bg-transparent border-none shadow-none text-xs focus-visible:ring-0 px-1 w-full md:w-48"
                        />
                    </div>

                    <select 
                        value={selectedClass} 
                        onChange={e => setSelectedClass(e.target.value)}
                        className="h-11 px-4 bg-slate-50 border border-slate-200/60 rounded-xl text-xs font-bold text-slate-600 outline-none focus:border-emerald-500 transition-colors"
                    >
                        <option value="">All Classes</option>
                        {classes.map((c: any) => (
                            <option key={c._id} value={c.name}>{c.name}</option>
                        ))}
                    </select>

                    <select 
                        value={selectedMonth} 
                        onChange={e => setSelectedMonth(Number(e.target.value))}
                        className="h-11 px-4 bg-slate-50 border border-slate-200/60 rounded-xl text-xs font-bold text-slate-600 outline-none focus:border-emerald-500 transition-colors"
                    >
                        {MONTHS.map((m, idx) => (
                            <option key={m} value={idx + 1}>{m}</option>
                        ))}
                    </select>

                    <select 
                        value={selectedYear} 
                        onChange={e => setSelectedYear(Number(e.target.value))}
                        className="h-11 px-4 bg-slate-50 border border-slate-200/60 rounded-xl text-xs font-bold text-slate-600 outline-none focus:border-emerald-500 transition-colors"
                    >
                        {[2024, 2025, 2026, 2027].map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>

                    <Button 
                        onClick={handlePrint}
                        className="h-11 bg-emerald-600 hover:bg-emerald-700 text-white border-none font-bold text-xs gap-2 rounded-xl shadow-lg shadow-emerald-100"
                    >
                        <Printer className="w-4 h-4" /> Print Register
                    </Button>
                </div>
            </div>

            {/* Legend */}
            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-wrap gap-6 items-center justify-center text-xs font-bold text-slate-600">
                <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-emerald-100 border border-emerald-300 text-emerald-800 flex items-center justify-center font-black text-xs">P</span>
                    <span>Present</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-rose-100 border border-rose-300 text-rose-800 flex items-center justify-center font-black text-xs">A</span>
                    <span>Absent</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-amber-100 border border-amber-300 text-amber-800 flex items-center justify-center font-black text-xs">L</span>
                    <span>Late</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-purple-100 border border-purple-300 text-purple-800 flex items-center justify-center font-black text-xs">E</span>
                    <span>Excused</span>
                </div>
            </div>

            {/* Grid Table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto custom-scrollbar">
                <table className="w-full border-collapse min-w-[1200px]">
                    <thead>
                        <tr className="bg-slate-50/75 border-b border-slate-100 text-left text-[11px] font-black text-slate-400 uppercase tracking-wider">
                            <th className="p-4 w-24 border-r border-slate-100">Adm No</th>
                            <th className="p-4 min-w-[160px] border-r border-slate-100">Student Name</th>
                            {daysArray.map(d => (
                                <th key={d} className="p-3 text-center border-r border-slate-100 w-10 font-bold">{d}</th>
                            ))}
                            <th className="p-4 text-center border-r border-slate-100 w-16 bg-slate-100/50">Work</th>
                            <th className="p-4 text-center border-r border-slate-100 w-16 bg-slate-100/50">Pres</th>
                            <th className="p-4 text-center border-r border-slate-100 w-16 bg-slate-100/50">Abs</th>
                            <th className="p-4 text-center w-20 bg-indigo-50/50 text-indigo-600 font-black">%</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {isLoading ? (
                            <tr><td colSpan={daysArray.length + 6} className="text-center py-12 text-slate-400 font-bold text-xs uppercase tracking-widest animate-pulse">Loading monthly roster...</td></tr>
                        ) : filteredGrid.length === 0 ? (
                            <tr><td colSpan={daysArray.length + 6} className="text-center py-12 text-slate-400 font-bold text-xs uppercase tracking-widest">No attendance records found</td></tr>
                        ) : (
                            filteredGrid.map((s: any) => (
                                <tr key={s.studentId} className="hover:bg-slate-50/50 transition-colors h-14">
                                    <td className="p-4 font-mono text-xs text-slate-500 font-bold border-r border-slate-50">{s.admNo}</td>
                                    <td className="p-4 font-bold text-slate-800 text-xs border-r border-slate-50 truncate max-w-[180px]">{s.studentName}</td>
                                    {daysArray.map(d => {
                                        const st = s.dailyStatus[d];
                                        let bgClass = "bg-slate-50 text-slate-400";
                                        if (st === "P") bgClass = "bg-emerald-100 text-emerald-800 font-black";
                                        else if (st === "A") bgClass = "bg-rose-100 text-rose-800 font-black";
                                        else if (st === "L") bgClass = "bg-amber-100 text-amber-800 font-black";
                                        else if (st === "E") bgClass = "bg-purple-100 text-purple-800 font-black";

                                        return (
                                            <td key={d} className="p-1 text-center border-r border-slate-50">
                                                <div className={`w-7 h-7 mx-auto rounded-lg flex items-center justify-center text-[10px] font-bold ${bgClass}`}>
                                                    {st || '-'}
                                                </div>
                                            </td>
                                        );
                                    })}
                                    <td className="p-4 text-center font-bold text-slate-700 text-xs border-r border-slate-50 bg-slate-50/50">{s.totalWorkingDays}</td>
                                    <td className="p-4 text-center font-black text-emerald-600 text-xs border-r border-slate-50 bg-slate-50/50">{s.presentCount}</td>
                                    <td className="p-4 text-center font-black text-rose-500 text-xs border-r border-slate-50 bg-slate-50/50">{s.absentCount}</td>
                                    <td className="p-4 text-center font-black text-indigo-600 text-xs bg-indigo-50/40">{s.percentage}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
