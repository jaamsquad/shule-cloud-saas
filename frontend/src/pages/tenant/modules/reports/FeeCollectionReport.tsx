import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { useReportSchool } from "./useReportSchool";
import { toast } from "sonner";
import { 
    CreditCard, Printer, Search, Filter, TrendingUp, 
    ArrowUpRight, ArrowDownRight, DollarSign, CheckCircle 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { openPrintDoc } from "@/lib/pdfDoc";

export default function FeeCollectionReport() {
    const school = useReportSchool();
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [selectedClass, setSelectedClass] = useState("");
    const [selectedMode, setSelectedMode] = useState("");
    const [selectedStatus, setSelectedStatus] = useState("");
    const [searchTerm, setSearchTerm] = useState("");

    const { data: classes = [] } = useQuery({
        queryKey: ["reports_shared_classes"],
        queryFn: async () => (await api.get("/reports/shared/classes")).data
    });

    const { data: resData, isLoading } = useQuery({
        queryKey: ["reports_fee_collection", startDate, endDate, selectedClass, selectedMode, selectedStatus],
        queryFn: async () => {
            const res = await api.get("/reports/fee-collection", {
                params: { 
                    start_date: startDate || undefined, 
                    end_date: endDate || undefined,
                    class_id: selectedClass || undefined,
                    payment_mode: selectedMode || undefined,
                    status: selectedStatus || undefined
                }
            });
            return res.data;
        }
    });

    const summary = resData?.summary || { totalExpected: 1500000, totalCollected: 0, totalOutstanding: 1500000 };
    const transactions = resData?.data || [];

    const filteredTxns = transactions.filter((t: any) => 
        t.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        t.receiptNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.admNo?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Chart data breakdown by mode
    const modeMap: Record<string, number> = {};
    filteredTxns.forEach((t: any) => {
        const m = t.paymentMode || "Other";
        modeMap[m] = (modeMap[m] || 0) + Number(t.amount || 0);
    });
    const pieData = Object.entries(modeMap).map(([name, value]) => ({ name, value }));
    const COLORS = ["#4F46E5", "#10B981", "#F59E0B", "#EC4899", "#6366F1"];

    const handlePrint = () => {
        const rowsHtml = filteredTxns.map((t: any, i: number) => `
            <tr style="border-bottom: 1px solid #E2E8F0; background: ${i % 2 === 0 ? '#fff' : '#F8FAFC'};">
                <td style="padding: 12px 16px; font-weight: 700; color: #1E293B;">${t.receiptNo}</td>
                <td style="padding: 12px 16px; font-weight: 600; color: #0F172A;">${t.studentName} (${t.admNo})</td>
                <td style="padding: 12px 16px; color: #334155;">${t.className}</td>
                <td style="padding: 12px 16px; text-align: right; font-weight: 800; color: #10B981;">KSH ${Number(t.amount || 0).toLocaleString()}</td>
                <td style="padding: 12px 16px; text-align: center; color: #475569;">${t.paymentMode}</td>
                <td style="padding: 12px 16px; color: #475569;">${t.paymentDate}</td>
                <td style="padding: 12px 16px; text-align: center;"><span style="background:#DCFCE7;color:#15803D;padding:4px 8px;border-radius:6px;font-weight:700;font-size:10px;text-transform:uppercase;">${t.status}</span></td>
            </tr>
        `).join("");

        const html = `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>Fee Collection Report</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
                @page { size: A4 landscape; margin: 15mm; }
                body { font-family: 'Inter', sans-serif; color: #0F172A; background: #fff; margin: 0; padding: 0; font-size: 11px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                .header { text-align: center; border-bottom: 3px solid #10B981; padding-bottom: 15px; margin-bottom: 25px; }
                .school-title { font-size: 24px; font-weight: 800; color: #1E293B; margin: 0; text-transform: uppercase; letter-spacing: 1px; }
                .report-title { font-size: 16px; font-weight: 600; color: #10B981; margin-top: 5px; }
                .metrics-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-bottom: 30px; }
                .metric-card { background: #F8FAFC; border: 1px solid #E2E8F0; padding: 20px; border-radius: 10px; text-align: center; }
                .metric-label { font-size: 11px; font-weight: 600; color: #64748B; text-transform: uppercase; margin-bottom: 5px; }
                .metric-val { font-size: 22px; font-weight: 800; color: #1E293B; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 30px; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
                th { background: #10B981; color: #fff; padding: 12px 16px; text-align: left; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
                .footer { margin-top: 40px; padding-top: 15px; border-top: 1px solid #CBD5E1; display: flex; justify-content: space-between; font-size: 10px; color: #94A3B8; }
            </style>
        </head>
        <body>
            <div class="header">
                ${school.logo ? `<img src="${school.logo}" style="height:56px;margin-bottom:8px;object-fit:contain;" />` : ""}
                <h1 class="school-title">${school.name}</h1>
                ${school.address ? `<div style="font-size:11px;color:#64748B;margin-top:2px;">${school.address}</div>` : ""}
                <div class="report-title">Fee Collection & Revenue Summary Report</div>
            </div>

            <div class="metrics-grid">
                <div class="metric-card"><div class="metric-label">Total Expected Revenue</div><div class="metric-val" style="color:#4F46E5;">KSH ${summary.totalExpected.toLocaleString()}</div></div>
                <div class="metric-card"><div class="metric-label">Total Fee Collected</div><div class="metric-val" style="color:#10B981;">KSH ${summary.totalCollected.toLocaleString()}</div></div>
                <div class="metric-card"><div class="metric-label">Total Outstanding Balance</div><div class="metric-val" style="color:#EF4444;">KSH ${summary.totalOutstanding.toLocaleString()}</div></div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th>Receipt No</th>
                        <th>Student (Adm #)</th>
                        <th>Class / Grade</th>
                        <th style="text-align: right;">Amount Paid</th>
                        <th style="text-align: center;">Payment Mode</th>
                        <th>Payment Date</th>
                        <th style="text-align: center;">Status</th>
                    </tr>
                </thead>
                <tbody>${rowsHtml}</tbody>
            </table>

            <div class="footer">
                <span>Official Financial Revenue Registry Report</span>
                <span>Total Transactions: ${filteredTxns.length} | Printed: ${new Date().toLocaleDateString()}</span>
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
                        <CreditCard className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Fee Collection Report</h1>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">Revenue Metrics, Transactions & Payment Modes</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/60 w-full md:w-auto">
                        <Search className="w-4 h-4 text-slate-400" />
                        <Input 
                            value={searchTerm} 
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Search receipt, student..." 
                            className="h-8 bg-transparent border-none shadow-none text-xs focus-visible:ring-0 px-1 w-full md:w-48"
                        />
                    </div>

                    <Input 
                        type="date"
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        className="h-11 px-3 bg-slate-50 border border-slate-200/60 rounded-xl text-xs font-bold text-slate-600"
                    />
                    <Input 
                        type="date"
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                        className="h-11 px-3 bg-slate-50 border border-slate-200/60 rounded-xl text-xs font-bold text-slate-600"
                    />

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
                        value={selectedMode} 
                        onChange={e => setSelectedMode(e.target.value)}
                        className="h-11 px-4 bg-slate-50 border border-slate-200/60 rounded-xl text-xs font-bold text-slate-600 outline-none focus:border-emerald-500 transition-colors"
                    >
                        <option value="">All Modes</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="M-Pesa">M-Pesa</option>
                        <option value="Cash">Cash</option>
                        <option value="Cheque">Cheque</option>
                    </select>

                    <Button 
                        onClick={handlePrint}
                        className="h-11 bg-emerald-600 hover:bg-emerald-700 text-white border-none font-bold text-xs gap-2 rounded-xl shadow-lg shadow-emerald-100"
                    >
                        <Printer className="w-4 h-4" /> Print / Export
                    </Button>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-6 relative overflow-hidden group">
                    <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-inner group-hover:scale-110 transition-transform">
                        <DollarSign className="w-8 h-8" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Expected</p>
                        <h3 className="text-2xl font-black text-slate-800 tracking-tight">KSH {summary.totalExpected.toLocaleString()}</h3>
                    </div>
                    <div className="absolute right-4 top-4 text-indigo-100 font-black text-4xl select-none opacity-40">01</div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-6 relative overflow-hidden group">
                    <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 shadow-inner group-hover:scale-110 transition-transform">
                        <ArrowUpRight className="w-8 h-8" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Collected</p>
                        <h3 className="text-2xl font-black text-emerald-600 tracking-tight">KSH {summary.totalCollected.toLocaleString()}</h3>
                    </div>
                    <div className="absolute right-4 top-4 text-emerald-100 font-black text-4xl select-none opacity-40">02</div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-6 relative overflow-hidden group">
                    <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600 shadow-inner group-hover:scale-110 transition-transform">
                        <ArrowDownRight className="w-8 h-8" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Outstanding</p>
                        <h3 className="text-2xl font-black text-rose-600 tracking-tight">KSH {summary.totalOutstanding.toLocaleString()}</h3>
                    </div>
                    <div className="absolute right-4 top-4 text-rose-100 font-black text-4xl select-none opacity-40">03</div>
                </div>
            </div>

            {/* Charts & Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                {/* Chart */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6 lg:col-span-1">
                    <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
                        <div className="w-2 h-5 bg-indigo-600 rounded-full" />
                        <h3 className="text-base font-black text-slate-800 tracking-tight">Collection by Mode</h3>
                    </div>
                    <div className="h-[280px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie 
                                    data={pieData} 
                                    dataKey="value" 
                                    nameKey="name" 
                                    cx="50%" 
                                    cy="50%" 
                                    innerRadius={60}
                                    outerRadius={90} 
                                    paddingAngle={4}
                                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                    labelLine={false}
                                >
                                    {pieData.map((_, idx) => (
                                        <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(val: number) => `KSH ${val.toLocaleString()}`} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden lg:col-span-2">
                    <Table>
                        <TableHeader className="bg-slate-50/75 border-b border-slate-100">
                            <TableRow className="h-12 hover:bg-transparent">
                                <TableHead className="font-black text-[11px] text-slate-400 uppercase tracking-wider px-6">Receipt No</TableHead>
                                <TableHead className="font-black text-[11px] text-slate-400 uppercase tracking-wider px-6">Student (Adm #)</TableHead>
                                <TableHead className="font-black text-[11px] text-slate-400 uppercase tracking-wider px-6">Class</TableHead>
                                <TableHead className="font-black text-[11px] text-slate-400 uppercase tracking-wider px-6 text-right">Amount Paid</TableHead>
                                <TableHead className="font-black text-[11px] text-slate-400 uppercase tracking-wider px-6 text-center">Mode</TableHead>
                                <TableHead className="font-black text-[11px] text-slate-400 uppercase tracking-wider px-6">Date</TableHead>
                                <TableHead className="font-black text-[11px] text-slate-400 uppercase tracking-wider px-6 text-center">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={7} className="text-center py-12 text-slate-400 font-bold text-xs uppercase tracking-widest animate-pulse">Loading fee records...</TableCell></TableRow>
                            ) : filteredTxns.length === 0 ? (
                                <TableRow><TableCell colSpan={7} className="text-center py-12 text-slate-400 font-bold text-xs uppercase tracking-widest">No fee transactions match your criteria</TableCell></TableRow>
                            ) : (
                                filteredTxns.map((t: any) => (
                                    <TableRow key={t._id} className="h-16 hover:bg-slate-50/50 transition-colors border-b border-slate-50">
                                        <TableCell className="px-6 font-mono text-xs text-slate-500 font-bold">{t.receiptNo}</TableCell>
                                        <TableCell className="px-6 font-bold text-slate-800 text-sm">
                                            <div className="flex flex-col">
                                                <span>{t.studentName}</span>
                                                <span className="text-[10px] text-slate-400 font-mono">{t.admNo}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-6 text-xs font-bold text-slate-600">{t.className}</TableCell>
                                        <TableCell className="px-6 text-right font-black text-emerald-600 text-sm">KSH {Number(t.amount || 0).toLocaleString()}</TableCell>
                                        <TableCell className="px-6 text-center text-xs font-semibold text-slate-600">{t.paymentMode}</TableCell>
                                        <TableCell className="px-6 text-xs text-slate-500 font-medium">{t.paymentDate}</TableCell>
                                        <TableCell className="px-6 text-center">
                                            <Badge className="bg-[#10b981] text-white font-black text-[10px] px-2.5 py-1 rounded-lg uppercase shadow-sm">
                                                {t.status}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}
