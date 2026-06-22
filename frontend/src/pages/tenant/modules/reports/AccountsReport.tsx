import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";
import { useReportSchool } from "./useReportSchool";
import { 
    Wallet, Printer, Search, Filter, TrendingUp, TrendingDown, 
    DollarSign, ArrowUpRight, ArrowDownRight, Layers 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { openPrintDoc } from "@/lib/pdfDoc";

export default function AccountsReport() {
    const school = useReportSchool();
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [selectedType, setSelectedType] = useState("");
    const [searchTerm, setSearchTerm] = useState("");

    const { data: resData, isLoading } = useQuery({
        queryKey: ["reports_accounts", startDate, endDate, selectedType],
        queryFn: async () => {
            const res = await api.get("/reports/accounts", {
                params: { 
                    start_date: startDate || undefined, 
                    end_date: endDate || undefined,
                    type: selectedType || undefined
                }
            });
            return res.data;
        }
    });

    const summary = resData?.summary || { openingBalance: 0, closingBalance: 0, totalIncome: 0, totalExpense: 0 };
    const breakdown = resData?.breakdown || [];
    const ledger = resData?.data || [];

    const filteredLedger = ledger.filter((item: any) => 
        item.description?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        item.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const COLORS = ["#4F46E5", "#10B981", "#F59E0B", "#EC4899", "#8B5CF6", "#06B6D4"];

    const handlePrint = () => {
        const rowsHtml = filteredLedger.map((item: any, i: number) => `
            <tr style="border-bottom: 1px solid #E2E8F0; background: ${i % 2 === 0 ? '#fff' : '#F8FAFC'};">
                <td style="padding: 12px 16px; font-weight: 700; color: #1E293B;">${item.reference}</td>
                <td style="padding: 12px 16px; font-weight: 600; color: #0F172A;">${item.description}</td>
                <td style="padding: 12px 16px; color: #334155;">${item.category}</td>
                <td style="padding: 12px 16px; text-align: center;">${item.type === 'income' ? '<span style="background:#DCFCE7;color:#15803D;padding:4px 8px;border-radius:6px;font-weight:700;font-size:10px;text-transform:uppercase;">INCOME</span>' : '<span style="background:#FEE2E2;color:#B91C1C;padding:4px 8px;border-radius:6px;font-weight:700;font-size:10px;text-transform:uppercase;">EXPENSE</span>'}</td>
                <td style="padding: 12px 16px; text-align: right; font-weight: 800; color: ${item.type === 'income' ? '#10B981' : '#EF4444'};">KSH ${Number(item.amount || 0).toLocaleString()}</td>
                <td style="padding: 12px 16px; text-align: center; color: #475569;">${item.paymentMethod}</td>
                <td style="padding: 12px 16px; color: #475569;">${item.date}</td>
            </tr>
        `).join("");

        const html = `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>Accounts Financial Ledger Report</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
                @page { size: A4 landscape; margin: 15mm; }
                body { font-family: 'Inter', sans-serif; color: #0F172A; background: #fff; margin: 0; padding: 0; font-size: 11px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                .header { text-align: center; border-bottom: 3px solid #4F46E5; padding-bottom: 15px; margin-bottom: 25px; }
                .school-title { font-size: 24px; font-weight: 800; color: #1E293B; margin: 0; text-transform: uppercase; letter-spacing: 1px; }
                .report-title { font-size: 16px; font-weight: 600; color: #4F46E5; margin-top: 5px; }
                .metrics-grid { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 15px; margin-bottom: 30px; }
                .metric-card { background: #F8FAFC; border: 1px solid #E2E8F0; padding: 18px; border-radius: 10px; text-align: center; }
                .metric-label { font-size: 10px; font-weight: 600; color: #64748B; text-transform: uppercase; margin-bottom: 5px; }
                .metric-val { font-size: 20px; font-weight: 800; color: #1E293B; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 30px; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
                th { background: #4F46E5; color: #fff; padding: 12px 16px; text-align: left; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
                .footer { margin-top: 40px; padding-top: 15px; border-top: 1px solid #CBD5E1; display: flex; justify-content: space-between; font-size: 10px; color: #94A3B8; }
            </style>
        </head>
        <body>
            <div class="header">
                ${school.logo ? `<img src="${school.logo}" style="height:56px;margin-bottom:8px;object-fit:contain;" />` : ""}
                <h1 class="school-title">${school.name}</h1>
                <div class="report-title">Financial Accounts Ledger & Statement Report</div>
            </div>

            <div class="metrics-grid">
                <div class="metric-card"><div class="metric-label">Opening Balance</div><div class="metric-val" style="color:#64748B;">KSH ${summary.openingBalance.toLocaleString()}</div></div>
                <div class="metric-card"><div class="metric-label">Total Income</div><div class="metric-val" style="color:#10B981;">KSH ${summary.totalIncome.toLocaleString()}</div></div>
                <div class="metric-card"><div class="metric-label">Total Expense</div><div class="metric-val" style="color:#EF4444;">KSH ${summary.totalExpense.toLocaleString()}</div></div>
                <div class="metric-card"><div class="metric-label">Closing Balance</div><div class="metric-val" style="color:#4F46E5;">KSH ${summary.closingBalance.toLocaleString()}</div></div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th>Reference</th>
                        <th>Description</th>
                        <th>Category</th>
                        <th style="text-align: center;">Type</th>
                        <th style="text-align: right;">Amount</th>
                        <th style="text-align: center;">Method</th>
                        <th>Date</th>
                    </tr>
                </thead>
                <tbody>${rowsHtml}</tbody>
            </table>

            <div class="footer">
                <span>Official Institutional Financial Statement Report</span>
                <span>Total Ledger Entries: ${filteredLedger.length} | Printed: ${new Date().toLocaleDateString()}</span>
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
                    <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-inner">
                        <Wallet className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Accounts Report</h1>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">Financial Ledger, Revenue & Expense Statements</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/60 w-full md:w-auto">
                        <Search className="w-4 h-4 text-slate-400" />
                        <Input 
                            value={searchTerm} 
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Search description, ref..." 
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
                        value={selectedType} 
                        onChange={e => setSelectedType(e.target.value)}
                        className="h-11 px-4 bg-slate-50 border border-slate-200/60 rounded-xl text-xs font-bold text-slate-600 outline-none focus:border-indigo-500 transition-colors"
                    >
                        <option value="">All Entry Types</option>
                        <option value="income">Income</option>
                        <option value="expense">Expense</option>
                    </select>

                    <Button 
                        onClick={handlePrint}
                        className="h-11 bg-indigo-600 hover:bg-indigo-700 text-white border-none font-bold text-xs gap-2 rounded-xl shadow-lg shadow-indigo-100"
                    >
                        <Printer className="w-4 h-4" /> Print Ledger
                    </Button>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between relative overflow-hidden group">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Opening Balance</p>
                    <h3 className="text-2xl font-black text-slate-700 tracking-tight">KSH {summary.openingBalance.toLocaleString()}</h3>
                    <div className="absolute right-4 top-4 text-slate-100 font-black text-4xl select-none opacity-40">01</div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between relative overflow-hidden group">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Total Income</p>
                    <h3 className="text-2xl font-black text-emerald-600 tracking-tight">+ KSH {summary.totalIncome.toLocaleString()}</h3>
                    <div className="absolute right-4 top-4 text-emerald-100 font-black text-4xl select-none opacity-40">02</div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between relative overflow-hidden group">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Total Expense</p>
                    <h3 className="text-2xl font-black text-rose-600 tracking-tight">- KSH {summary.totalExpense.toLocaleString()}</h3>
                    <div className="absolute right-4 top-4 text-rose-100 font-black text-4xl select-none opacity-40">03</div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between relative overflow-hidden group border-l-4 border-l-indigo-600">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Closing Balance</p>
                    <h3 className="text-2xl font-black text-indigo-600 tracking-tight">KSH {summary.closingBalance.toLocaleString()}</h3>
                    <div className="absolute right-4 top-4 text-indigo-100 font-black text-4xl select-none opacity-40">04</div>
                </div>
            </div>

            {/* Charts & Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                {/* Chart Breakdown */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6 lg:col-span-1">
                    <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
                        <div className="w-2 h-5 bg-indigo-600 rounded-full" />
                        <h3 className="text-base font-black text-slate-800 tracking-tight">Category Breakdown</h3>
                    </div>
                    <div className="h-[280px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie 
                                    data={breakdown} 
                                    dataKey="amount" 
                                    nameKey="category" 
                                    cx="50%" 
                                    cy="50%" 
                                    innerRadius={60}
                                    outerRadius={90} 
                                    paddingAngle={4}
                                    label={({ category, percent }) => `${category} (${(percent * 100).toFixed(0)}%)`}
                                    labelLine={false}
                                >
                                    {breakdown.map((_, idx) => (
                                        <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(val: number) => `KSH ${val.toLocaleString()}`} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Ledger Table */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden lg:col-span-2">
                    <Table>
                        <TableHeader className="bg-slate-50/75 border-b border-slate-100">
                            <TableRow className="h-12 hover:bg-transparent">
                                <TableHead className="font-black text-[11px] text-slate-400 uppercase tracking-wider px-6">Reference</TableHead>
                                <TableHead className="font-black text-[11px] text-slate-400 uppercase tracking-wider px-6">Description</TableHead>
                                <TableHead className="font-black text-[11px] text-slate-400 uppercase tracking-wider px-6">Category</TableHead>
                                <TableHead className="font-black text-[11px] text-slate-400 uppercase tracking-wider px-6 text-center">Type</TableHead>
                                <TableHead className="font-black text-[11px] text-slate-400 uppercase tracking-wider px-6 text-right">Amount</TableHead>
                                <TableHead className="font-black text-[11px] text-slate-400 uppercase tracking-wider px-6 text-center">Method</TableHead>
                                <TableHead className="font-black text-[11px] text-slate-400 uppercase tracking-wider px-6">Date</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={7} className="text-center py-12 text-slate-400 font-bold text-xs uppercase tracking-widest animate-pulse">Loading ledger entries...</TableCell></TableRow>
                            ) : filteredLedger.length === 0 ? (
                                <TableRow><TableCell colSpan={7} className="text-center py-12 text-slate-400 font-bold text-xs uppercase tracking-widest">No ledger entries match your criteria</TableCell></TableRow>
                            ) : (
                                filteredLedger.map((item: any) => (
                                    <TableRow key={item._id} className="h-16 hover:bg-slate-50/50 transition-colors border-b border-slate-50">
                                        <TableCell className="px-6 font-mono text-xs text-slate-500 font-bold">{item.reference}</TableCell>
                                        <TableCell className="px-6 font-bold text-slate-800 text-sm">{item.description}</TableCell>
                                        <TableCell className="px-6 text-xs font-semibold text-slate-600">{item.category}</TableCell>
                                        <TableCell className="px-6 text-center">
                                            {item.type === 'income' ? (
                                                <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-black text-[10px] px-2.5 py-1 rounded-lg uppercase shadow-none">
                                                    INCOME
                                                </Badge>
                                            ) : (
                                                <Badge className="bg-rose-50 text-rose-700 border border-rose-200 font-black text-[10px] px-2.5 py-1 rounded-lg uppercase shadow-none">
                                                    EXPENSE
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className={`px-6 text-right font-black text-sm ${item.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            KSH {Number(item.amount || 0).toLocaleString()}
                                        </TableCell>
                                        <TableCell className="px-6 text-center text-xs font-semibold text-slate-600">{item.paymentMethod}</TableCell>
                                        <TableCell className="px-6 text-xs text-slate-500 font-medium">{item.date}</TableCell>
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
