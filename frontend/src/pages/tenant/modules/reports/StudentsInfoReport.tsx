import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";
import { 
    Users, Printer, Search, Filter, GraduationCap, Calendar, 
    Phone, Mail, CheckCircle, ChevronLeft, ChevronRight, UserCheck 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";

export default function StudentsInfoReport() {
    const [selectedClass, setSelectedClass] = useState("");
    const [selectedGender, setSelectedGender] = useState("");
    const [selectedStatus, setSelectedStatus] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [page, setPage] = useState(1);

    const { data: classes = [] } = useQuery({
        queryKey: ["reports_shared_classes"],
        queryFn: async () => (await api.get("/reports/shared/classes")).data
    });

    const { data: resData, isLoading } = useQuery({
        queryKey: ["reports_students_info", selectedClass, selectedGender, selectedStatus, searchTerm, page],
        queryFn: async () => {
            const res = await api.get("/reports/students-info", {
                params: { 
                    class_id: selectedClass || undefined, 
                    gender: selectedGender || undefined,
                    status: selectedStatus || undefined,
                    search: searchTerm || undefined,
                    page, limit: 15
                }
            });
            return res.data;
        }
    });

    const students = resData?.data || [];
    const pagination = resData?.pagination || { total: 0, page: 1, pages: 1 };

    // Real school branding for the print header.
    const { data: schoolRaw } = useQuery({ queryKey: ["theme_settings"], queryFn: async () => (await api.get("/theme_settings")).data });
    const school = Array.isArray(schoolRaw) ? schoolRaw[0] : (schoolRaw || {});
    const schoolName = school?.name || school?.instituteName || school?.schoolName || "School";
    const schoolAddr = [school?.address || school?.location, school?.city || school?.county].filter(Boolean).join(", ");
    const schoolLogo = school?.logo || school?.schoolLogo || school?.image || "";

    // Format admission dates — handles Excel serial numbers (46027.12…) and ISO strings.
    const fmtDate = (v: any) => {
        if (v === null || v === undefined || v === "") return "—";
        const n = typeof v === "number" ? v : (/^\d+(\.\d+)?$/.test(String(v)) ? parseFloat(String(v)) : NaN);
        let d: Date;
        if (!isNaN(n) && n > 20000 && n < 90000) d = new Date(Math.round((n - 25569) * 86400 * 1000)); // Excel serial
        else d = new Date(v);
        if (isNaN(d.getTime())) return String(v);
        return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    };

    const handlePrint = () => {
        const rowsHtml = students.map((s: any, i: number) => `
            <tr style="border-bottom: 1px solid #E2E8F0; background: ${i % 2 === 0 ? '#fff' : '#F8FAFC'};">
                <td style="padding: 12px 16px; font-weight: 700; color: #1E293B;">${s.admNo}</td>
                <td style="padding: 12px 16px; font-weight: 600; color: #0F172A;">${s.name}</td>
                <td style="padding: 12px 16px; text-align: center; color: #475569;">${s.gender}</td>
                <td style="padding: 12px 16px; font-weight: 600; color: #334155;">${s.studentClass || s.className || 'N/A'}</td>
                <td style="padding: 12px 16px; color: #475569;">${fmtDate(s.admissionDate)}</td>
                <td style="padding: 12px 16px; color: #334155;">${s.parents?.[0]?.name || 'N/A'} (${s.parents?.[0]?.phone || 'N/A'})</td>
                <td style="padding: 12px 16px; text-align: center;"><span style="background:#DCFCE7;color:#15803D;padding:4px 8px;border-radius:6px;font-weight:700;font-size:10px;text-transform:uppercase;">${s.status || 'Active'}</span></td>
            </tr>
        `).join("");

        const html = `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>Students Information Report</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
                @page { size: A4 landscape; margin: 15mm; }
                body { font-family: 'Inter', sans-serif; color: #0F172A; background: #fff; margin: 0; padding: 0; font-size: 11px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                .header { text-align: center; border-bottom: 3px solid #10B981; padding-bottom: 15px; margin-bottom: 25px; }
                .school-title { font-size: 24px; font-weight: 800; color: #1E293B; margin: 0; text-transform: uppercase; letter-spacing: 1px; }
                .report-title { font-size: 16px; font-weight: 600; color: #10B981; margin-top: 5px; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 30px; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
                th { background: #10B981; color: #fff; padding: 12px 16px; text-align: left; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
                .footer { margin-top: 40px; padding-top: 15px; border-top: 1px solid #CBD5E1; display: flex; justify-content: space-between; font-size: 10px; color: #94A3B8; }
            </style>
        </head>
        <body>
            <div class="header">
                ${schoolLogo ? `<img src="${schoolLogo}" style="height:54px;margin-bottom:8px;object-fit:contain;" />` : ""}
                <h1 class="school-title">${schoolName}</h1>
                ${schoolAddr ? `<div style="font-size:11px;color:#64748B;margin-top:2px;">${schoolAddr}</div>` : ""}
                <div class="report-title">Students Comprehensive Information Report</div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th>Adm No</th>
                        <th>Student Name</th>
                        <th style="text-align: center;">Gender</th>
                        <th>Class / Grade</th>
                        <th>Admission Date</th>
                        <th>Primary Parent / Contact</th>
                        <th style="text-align: center;">Status</th>
                    </tr>
                </thead>
                <tbody>${rowsHtml}</tbody>
            </table>

            <div class="footer">
                <span>Official Institutional Registry Report</span>
                <span>Total Records: ${students.length} | Printed: ${new Date().toLocaleDateString()}</span>
            </div>
        </body>
        </html>`;

        const win = window.open("", "_blank", "width=1200,height=900");
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
                        <Users className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Students Info Report</h1>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">Comprehensive Demographic & Enrollment Records</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/60 w-full md:w-auto">
                        <Search className="w-4 h-4 text-slate-400" />
                        <Input 
                            value={searchTerm} 
                            onChange={e => { setSearchTerm(e.target.value); setPage(1); }}
                            placeholder="Search name or Adm #..." 
                            className="h-8 bg-transparent border-none shadow-none text-xs focus-visible:ring-0 px-1 w-full md:w-48"
                        />
                    </div>

                    <select 
                        value={selectedClass} 
                        onChange={e => { setSelectedClass(e.target.value); setPage(1); }}
                        className="h-11 px-4 bg-slate-50 border border-slate-200/60 rounded-xl text-xs font-bold text-slate-600 outline-none focus:border-emerald-500 transition-colors"
                    >
                        <option value="">All Classes</option>
                        {classes.map((c: any) => (
                            <option key={c._id} value={c.name}>{c.name}</option>
                        ))}
                    </select>

                    <select 
                        value={selectedGender} 
                        onChange={e => { setSelectedGender(e.target.value); setPage(1); }}
                        className="h-11 px-4 bg-slate-50 border border-slate-200/60 rounded-xl text-xs font-bold text-slate-600 outline-none focus:border-emerald-500 transition-colors"
                    >
                        <option value="">All Genders</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                    </select>

                    <select 
                        value={selectedStatus} 
                        onChange={e => { setSelectedStatus(e.target.value); setPage(1); }}
                        className="h-11 px-4 bg-slate-50 border border-slate-200/60 rounded-xl text-xs font-bold text-slate-600 outline-none focus:border-emerald-500 transition-colors"
                    >
                        <option value="">All Statuses</option>
                        <option value="Active">Active</option>
                        <option value="Suspended">Suspended</option>
                        <option value="Transferred">Transferred</option>
                    </select>

                    <Button 
                        onClick={handlePrint}
                        className="h-11 bg-emerald-600 hover:bg-emerald-700 text-white border-none font-bold text-xs gap-2 rounded-xl shadow-lg shadow-emerald-100"
                    >
                        <Printer className="w-4 h-4" /> Print / Export
                    </Button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-50/75 border-b border-slate-100">
                        <TableRow className="h-12 hover:bg-transparent">
                            <TableHead className="font-black text-[11px] text-slate-400 uppercase tracking-wider px-6">Adm No</TableHead>
                            <TableHead className="font-black text-[11px] text-slate-400 uppercase tracking-wider px-6">Name</TableHead>
                            <TableHead className="font-black text-[11px] text-slate-400 uppercase tracking-wider px-6 text-center">Gender</TableHead>
                            <TableHead className="font-black text-[11px] text-slate-400 uppercase tracking-wider px-6">Class / Grade</TableHead>
                            <TableHead className="font-black text-[11px] text-slate-400 uppercase tracking-wider px-6">Admission Date</TableHead>
                            <TableHead className="font-black text-[11px] text-slate-400 uppercase tracking-wider px-6">Primary Parent</TableHead>
                            <TableHead className="font-black text-[11px] text-slate-400 uppercase tracking-wider px-6 text-center">Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={7} className="text-center py-12 text-slate-400 font-bold text-xs uppercase tracking-widest animate-pulse">Loading student records...</TableCell></TableRow>
                        ) : students.length === 0 ? (
                            <TableRow><TableCell colSpan={7} className="text-center py-12 text-slate-400 font-bold text-xs uppercase tracking-widest">No student records match your criteria</TableCell></TableRow>
                        ) : (
                            students.map((s: any) => (
                                <TableRow key={s._id} className="h-16 hover:bg-slate-50/50 transition-colors border-b border-slate-50">
                                    <TableCell className="px-6 font-mono text-xs text-slate-500 font-bold">{s.admNo}</TableCell>
                                    <TableCell className="px-6 font-bold text-slate-800 text-sm">{s.name}</TableCell>
                                    <TableCell className="px-6 text-center text-xs font-semibold text-slate-600">{s.gender}</TableCell>
                                    <TableCell className="px-6 text-xs font-bold text-slate-600">{s.studentClass || s.className || 'N/A'}</TableCell>
                                    <TableCell className="px-6 text-xs text-slate-500 font-medium">{fmtDate(s.admissionDate)}</TableCell>
                                    <TableCell className="px-6 text-xs font-semibold text-slate-700">
                                        <div className="flex flex-col">
                                            <span>{s.parents?.[0]?.name || 'N/A'}</span>
                                            <span className="text-[10px] text-slate-400 font-mono">{s.parents?.[0]?.phone || 'N/A'}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-6 text-center">
                                        <Badge className="bg-[#10b981] text-white font-black text-[10px] px-2.5 py-1 rounded-lg uppercase shadow-sm">
                                            {s.status || 'Active'}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-2 bg-white rounded-2xl border border-slate-100 shadow-sm">
                <p className="text-xs font-bold text-slate-400">Showing Page {pagination.page} of {pagination.pages} (Total: {pagination.total} records)</p>
                <div className="flex gap-2">
                    <Button 
                        onClick={() => setPage(p => Math.max(p - 1, 1))} 
                        disabled={page === 1}
                        variant="outline" 
                        size="sm" 
                        className="h-9 px-4 rounded-xl border-slate-200 text-slate-600 font-bold text-xs gap-1"
                    >
                        <ChevronLeft className="w-4 h-4" /> Previous
                    </Button>
                    <Button 
                        onClick={() => setPage(p => Math.min(p + 1, pagination.pages))} 
                        disabled={page >= pagination.pages}
                        variant="outline" 
                        size="sm" 
                        className="h-9 px-4 rounded-xl border-slate-200 text-slate-600 font-bold text-xs gap-1"
                    >
                        Next <ChevronRight className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
