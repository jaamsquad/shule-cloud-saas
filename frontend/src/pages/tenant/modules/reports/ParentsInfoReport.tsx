import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";
import { 
    UserPlus, Printer, Search, Filter, Phone, Mail, 
    Briefcase, AlertCircle, ShieldCheck, CheckCircle 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";

export default function ParentsInfoReport() {
    const [selectedClass, setSelectedClass] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedRelation, setSelectedRelation] = useState("");

    const { data: classes = [] } = useQuery({
        queryKey: ["reports_shared_classes"],
        queryFn: async () => (await api.get("/reports/shared/classes")).data
    });

    const { data: parentsData = [], isLoading } = useQuery({
        queryKey: ["reports_parents_info", selectedClass, searchTerm, selectedRelation],
        queryFn: async () => {
            const res = await api.get("/reports/parents-info", {
                params: { 
                    student_class_id: selectedClass || undefined, 
                    search: searchTerm || undefined,
                    relation: selectedRelation || undefined
                }
            });
            return res.data?.data || [];
        }
    });

    const handlePrint = () => {
        const rowsHtml = parentsData.map((p: any, i: number) => `
            <tr style="border-bottom: 1px solid #E2E8F0; background: ${i % 2 === 0 ? '#fff' : '#F8FAFC'};">
                <td style="padding: 12px 16px; font-weight: 700; color: #1E293B;">${p.parentName}</td>
                <td style="padding: 12px 16px; font-weight: 600; color: #475569;">${p.relation}</td>
                <td style="padding: 12px 16px; font-weight: 600; color: #0F172A;">${p.studentName} (${p.studentAdmNo})</td>
                <td style="padding: 12px 16px; color: #334155;">${p.studentClass}</td>
                <td style="padding: 12px 16px; font-family: monospace; font-weight: 600; color: #1E293B;">${p.phone}</td>
                <td style="padding: 12px 16px; color: #475569;">${p.email}</td>
                <td style="padding: 12px 16px; color: #334155;">${p.occupation}</td>
                <td style="padding: 12px 16px; text-align: center;">${p.isEmergencyContact ? '<span style="background:#DCFCE7;color:#15803D;padding:4px 8px;border-radius:6px;font-weight:700;font-size:10px;text-transform:uppercase;">YES</span>' : '<span style="background:#F1F5F9;color:#64748B;padding:4px 8px;border-radius:6px;font-weight:700;font-size:10px;text-transform:uppercase;">NO</span>'}</td>
            </tr>
        `).join("");

        const html = `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>Parents Information Report</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
                @page { size: A4 landscape; margin: 15mm; }
                body { font-family: 'Inter', sans-serif; color: #0F172A; background: #fff; margin: 0; padding: 0; font-size: 11px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                .header { text-align: center; border-bottom: 3px solid #6366F1; padding-bottom: 15px; margin-bottom: 25px; }
                .school-title { font-size: 24px; font-weight: 800; color: #1E293B; margin: 0; text-transform: uppercase; letter-spacing: 1px; }
                .report-title { font-size: 16px; font-weight: 600; color: #6366F1; margin-top: 5px; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 30px; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
                th { background: #6366F1; color: #fff; padding: 12px 16px; text-align: left; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
                .footer { margin-top: 40px; padding-top: 15px; border-top: 1px solid #CBD5E1; display: flex; justify-content: space-between; font-size: 10px; color: #94A3B8; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1 class="school-title">ShuleCloud International Academy</h1>
                <div class="report-title">Parents & Guardians Contact Registry Report</div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th>Parent Name</th>
                        <th>Relationship</th>
                        <th>Student Name (Adm #)</th>
                        <th>Class / Grade</th>
                        <th>Phone Number</th>
                        <th>Email Address</th>
                        <th>Occupation</th>
                        <th style="text-align: center;">Emergency Contact</th>
                    </tr>
                </thead>
                <tbody>${rowsHtml}</tbody>
            </table>

            <div class="footer">
                <span>Official Institutional Registry Report</span>
                <span>Total Records: ${parentsData.length} | Printed: ${new Date().toLocaleDateString()}</span>
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
                    <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-inner">
                        <UserPlus className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Parents Info Report</h1>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">Guardians & Sponsors Contact Directory</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/60 w-full md:w-auto">
                        <Search className="w-4 h-4 text-slate-400" />
                        <Input 
                            value={searchTerm} 
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Search parent, student or phone..." 
                            className="h-8 bg-transparent border-none shadow-none text-xs focus-visible:ring-0 px-1 w-full md:w-56"
                        />
                    </div>

                    <select 
                        value={selectedClass} 
                        onChange={e => setSelectedClass(e.target.value)}
                        className="h-11 px-4 bg-slate-50 border border-slate-200/60 rounded-xl text-xs font-bold text-slate-600 outline-none focus:border-indigo-500 transition-colors"
                    >
                        <option value="">All Student Classes</option>
                        {classes.map((c: any) => (
                            <option key={c._id} value={c.name}>{c.name}</option>
                        ))}
                    </select>

                    <select 
                        value={selectedRelation} 
                        onChange={e => setSelectedRelation(e.target.value)}
                        className="h-11 px-4 bg-slate-50 border border-slate-200/60 rounded-xl text-xs font-bold text-slate-600 outline-none focus:border-indigo-500 transition-colors"
                    >
                        <option value="">All Relationships</option>
                        <option value="Father">Father</option>
                        <option value="Mother">Mother</option>
                        <option value="Guardian">Guardian</option>
                        <option value="Sponsor">Sponsor</option>
                    </select>

                    <Button 
                        onClick={handlePrint}
                        className="h-11 bg-indigo-600 hover:bg-indigo-700 text-white border-none font-bold text-xs gap-2 rounded-xl shadow-lg shadow-indigo-100"
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
                            <TableHead className="font-black text-[11px] text-slate-400 uppercase tracking-wider px-6">Parent Name</TableHead>
                            <TableHead className="font-black text-[11px] text-slate-400 uppercase tracking-wider px-6">Relationship</TableHead>
                            <TableHead className="font-black text-[11px] text-slate-400 uppercase tracking-wider px-6">Student (Adm #)</TableHead>
                            <TableHead className="font-black text-[11px] text-slate-400 uppercase tracking-wider px-6">Class</TableHead>
                            <TableHead className="font-black text-[11px] text-slate-400 uppercase tracking-wider px-6">Phone</TableHead>
                            <TableHead className="font-black text-[11px] text-slate-400 uppercase tracking-wider px-6">Email</TableHead>
                            <TableHead className="font-black text-[11px] text-slate-400 uppercase tracking-wider px-6">Occupation</TableHead>
                            <TableHead className="font-black text-[11px] text-slate-400 uppercase tracking-wider px-6 text-center">Emergency Contact</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={8} className="text-center py-12 text-slate-400 font-bold text-xs uppercase tracking-widest animate-pulse">Loading parents registry...</TableCell></TableRow>
                        ) : parentsData.length === 0 ? (
                            <TableRow><TableCell colSpan={8} className="text-center py-12 text-slate-400 font-bold text-xs uppercase tracking-widest">No parent records match your criteria</TableCell></TableRow>
                        ) : (
                            parentsData.map((p: any) => (
                                <TableRow key={p._id} className="h-16 hover:bg-slate-50/50 transition-colors border-b border-slate-50">
                                    <TableCell className="px-6 font-bold text-slate-800 text-sm">{p.parentName}</TableCell>
                                    <TableCell className="px-6 text-xs font-semibold text-indigo-600">{p.relation}</TableCell>
                                    <TableCell className="px-6 font-bold text-slate-700 text-xs">
                                        <div className="flex flex-col">
                                            <span>{p.studentName}</span>
                                            <span className="text-[10px] text-slate-400 font-mono">{p.studentAdmNo}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-6 text-xs font-bold text-slate-600">{p.studentClass}</TableCell>
                                    <TableCell className="px-6 font-mono text-xs text-slate-600 font-semibold">{p.phone}</TableCell>
                                    <TableCell className="px-6 text-xs text-slate-500 font-medium">{p.email}</TableCell>
                                    <TableCell className="px-6 text-xs font-medium text-slate-600">{p.occupation}</TableCell>
                                    <TableCell className="px-6 text-center">
                                        {p.isEmergencyContact ? (
                                            <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-black text-[10px] px-2.5 py-1 rounded-lg uppercase shadow-none">
                                                YES
                                            </Badge>
                                        ) : (
                                            <Badge className="bg-slate-100 text-slate-500 border border-slate-200 font-bold text-[10px] px-2.5 py-1 rounded-lg uppercase shadow-none">
                                                NO
                                            </Badge>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
