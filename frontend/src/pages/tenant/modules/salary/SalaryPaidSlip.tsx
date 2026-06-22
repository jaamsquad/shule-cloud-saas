import { useState } from "react";
import { Home, Search, Calendar, Printer, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";
import { openPrintDoc } from "@/lib/pdfDoc";

function printSlip(run: any, institute: any) {
    const schoolName = institute?.schoolName || institute?.name || "School Name";
    const address = institute?.address || "";
    const phone = institute?.phone || "";
    const email = institute?.email || "";
    const logo = institute?.logo || null;
    const win = openPrintDoc();
    if (!win) { toast.error("Allow popups to print salary slips"); return; }

    const allowancesRows = (run.allowances || [])
        .map((a: any) => `<tr><td>${a.name}</td><td class="amt">+ ${Number(a.amount).toLocaleString()}</td></tr>`)
        .join("");

    const deductionRows = (run.deductions || [])
        .map((d: any) => `<tr><td>${d.name}</td><td class="amt red">- ${Number(d.amount).toLocaleString()}</td></tr>`)
        .join("");

    win.document.write(`<!DOCTYPE html><html><head>
        <title>Salary Slip — ${run.staffName} — ${run.month}</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; padding: 48px; max-width: 680px; margin: 0 auto; color: #1e293b; font-size: 13px; }
            .institute { display: flex; align-items: center; gap: 16px; border-bottom: 3px solid #5C67F2; padding-bottom: 20px; margin-bottom: 8px; }
            .institute img { width: 64px; height: 64px; object-fit: contain; border-radius: 8px; }
            .institute-info { flex: 1; }
            .institute-name { font-size: 20px; font-weight: 900; color: #1e293b; text-transform: uppercase; letter-spacing: 1px; }
            .institute-sub { font-size: 10px; color: #94a3b8; margin-top: 3px; }
            .slip-title { text-align: center; padding: 12px 0 20px; }
            .slip-title h2 { color: #5C67F2; font-size: 16px; font-weight: 900; text-transform: uppercase; letter-spacing: 3px; }
            .slip-title p { font-size: 10px; color: #94a3b8; text-transform: uppercase; letter-spacing: 2px; margin-top: 3px; }
            .info { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: #f8fafc; padding: 16px 20px; border-radius: 8px; margin-bottom: 24px; }
            .info-item label { display: block; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; margin-bottom: 2px; }
            .info-item span { font-size: 12px; font-weight: 800; color: #1e293b; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
            th { background: #5C67F2; color: white; padding: 10px 14px; font-size: 10px; text-transform: uppercase; font-weight: 700; letter-spacing: 1px; text-align: left; }
            td { padding: 9px 14px; border-bottom: 1px solid #f1f5f9; }
            .amt { text-align: right; font-weight: 700; }
            .red { color: #ef4444; }
            .net-row { background: #eff6ff; }
            .net-row td { padding: 14px; font-weight: 900; font-size: 15px; color: #5C67F2; border: none; }
            .net-row .amt { font-size: 18px; }
            .footer { text-align: center; margin-top: 48px; font-size: 9px; color: #94a3b8; text-transform: uppercase; letter-spacing: 2px; border-top: 1px solid #e2e8f0; padding-top: 16px; }
            @media print { @page { margin: 20mm; } }
        </style>
    </head><body>
        <div class="institute">
            ${logo ? `<img src="${logo}" alt="logo" />` : ""}
            <div class="institute-info">
                <div class="institute-name">${schoolName}</div>
                <div class="institute-sub">
                    ${[address, phone, email].filter(Boolean).join(" &nbsp;·&nbsp; ")}
                </div>
            </div>
        </div>
        <div class="slip-title">
            <h2>Salary Slip</h2>
            <p>Pay Period: ${run.month}</p>
        </div>
        <div class="info">
            <div class="info-item"><label>Employee Name</label><span>${run.staffName || "—"}</span></div>
            <div class="info-item"><label>Designation</label><span>${run.designation || "—"}</span></div>
            <div class="info-item"><label>Payment Method</label><span>${run.paymentMethod || "—"}</span></div>
            <div class="info-item"><label>Payment Date</label><span>${run.paymentDate || "—"}</span></div>
            <div class="info-item"><label>Reference</label><span>${run.paymentReference || "—"}</span></div>
            <div class="info-item"><label>Status</label><span>${run.status || "—"}</span></div>
        </div>
        <table>
            <tr><th>Earnings</th><th style="text-align:right">Amount (KSh)</th></tr>
            <tr><td>Basic Salary</td><td class="amt">${Number(run.basicSalary || 0).toLocaleString()}</td></tr>
            ${allowancesRows}
            <tr style="font-weight:700;background:#f8fafc"><td>Gross Salary</td><td class="amt">${Number(run.grossSalary || 0).toLocaleString()}</td></tr>
        </table>
        <table>
            <tr><th>Deductions</th><th style="text-align:right">Amount (KSh)</th></tr>
            ${deductionRows}
            <tr style="font-weight:700;background:#fff5f5"><td style="color:#ef4444">Total Deductions</td><td class="amt red">${Number(run.totalDeductions || 0).toLocaleString()}</td></tr>
        </table>
        <table>
            <tr class="net-row"><td>NET SALARY</td><td class="amt">KSh ${Number(run.netSalary || 0).toLocaleString()}</td></tr>
        </table>
        <div class="footer">This is a computer-generated salary slip — no signature required</div>
        <script>window.onload = function() { window.print(); }</script>
    </body></html>`);
    win.document.close();
}

export default function SalaryPaidSlip() {
    const now = new Date();
    const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const [monthFilter, setMonthFilter] = useState(defaultMonth);
    const [searchQuery, setSearchQuery] = useState("");

    const { data: instituteData } = useQuery({
        queryKey: ["tenant_profile"],
        queryFn: async () => {
            const r = await api.get("/tenant_profile");
            return Array.isArray(r.data) ? r.data[0] : r.data;
        },
    });

    const { data: allRuns = [], isLoading, refetch } = useQuery({
        queryKey: ["salary_paid_slips", monthFilter],
        queryFn: async () => {
            const params = new URLSearchParams({ status: "Paid" });
            if (monthFilter) params.append("month", monthFilter);
            const r = await api.get(`/salary/payroll-runs?${params.toString()}`);
            return Array.isArray(r.data) ? r.data : [];
        },
    });

    const runs = searchQuery
        ? allRuns.filter((r: any) =>
            (r.staffName || "").toLowerCase().includes(searchQuery.toLowerCase())
        )
        : allRuns;

    return (
        <div className="flex-1 bg-[#F8FAFC] min-h-screen flex flex-col pb-20 font-sans">
            {/* Breadcrumb */}
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-2 text-sm">
                    <Home className="w-4 h-4 text-[#5C67F2]" />
                    <span className="text-gray-300">/</span>
                    <span className="font-bold text-gray-600">Salary</span>
                    <span className="text-gray-300">/</span>
                    <span className="font-black text-[#5C67F2]">Salary Paid Slips</span>
                </div>
            </div>

            <div className="flex-1 max-w-6xl mx-auto w-full px-6 pt-10">
                <div className="mb-8">
                    <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Salary Paid Slips</h1>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-1">
                        View and print payslips for all processed salary payments
                    </p>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-4 items-center bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm mb-8">
                    <div className="relative flex-1 max-w-xs">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search employee name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full h-11 pl-12 pr-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700"
                        />
                    </div>
                    <div className="relative w-48">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="month"
                            value={monthFilter}
                            onChange={(e) => setMonthFilter(e.target.value)}
                            className="w-full h-11 pl-12 pr-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700"
                        />
                    </div>
                    <button onClick={() => refetch()} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-100 transition-colors">
                        <RefreshCw className="w-4 h-4 text-slate-500" />
                    </button>
                    <div className="ml-auto text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        {runs.length} slip{runs.length !== 1 ? "s" : ""}
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden p-8">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                                    <th className="py-4 px-5">Employee</th>
                                    <th className="py-4 px-5">Month</th>
                                    <th className="py-4 px-5 text-right">Basic</th>
                                    <th className="py-4 px-5 text-right">Gross</th>
                                    <th className="py-4 px-5 text-right">Deductions</th>
                                    <th className="py-4 px-5 text-right">Net Salary</th>
                                    <th className="py-4 px-5 text-center">Method</th>
                                    <th className="py-4 px-5 text-center">Print</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700 text-xs">
                                {runs.map((run: any) => (
                                    <tr key={run._id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="py-4 px-5">
                                            <p className="font-black text-slate-800 uppercase">{run.staffName}</p>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">{run.designation}</p>
                                        </td>
                                        <td className="py-4 px-5 font-bold text-slate-600">{run.month}</td>
                                        <td className="py-4 px-5 text-right font-bold">{Number(run.basicSalary || 0).toLocaleString()}</td>
                                        <td className="py-4 px-5 text-right font-black text-slate-800">{Number(run.grossSalary || 0).toLocaleString()}</td>
                                        <td className="py-4 px-5 text-right font-bold text-rose-500">{Number(run.totalDeductions || 0).toLocaleString()}</td>
                                        <td className="py-4 px-5 text-right font-black text-[#5C67F2] text-sm">{Number(run.netSalary || 0).toLocaleString()}</td>
                                        <td className="py-4 px-5 text-center">
                                            <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-[9px] font-black uppercase tracking-wider">
                                                {run.paymentMethod || "—"}
                                            </span>
                                        </td>
                                        <td className="py-4 px-5 text-center">
                                            <button
                                                onClick={() => printSlip(run, instituteData)}
                                                className="group bg-white hover:bg-indigo-50 text-gray-700 hover:text-indigo-700 h-9 px-4 rounded-xl font-bold flex items-center gap-2 transition-all text-xs border border-gray-200 hover:border-indigo-300 shadow-sm mx-auto">
                                                <Printer className="w-3.5 h-3.5 text-indigo-500 group-hover:scale-110 transition-transform" />
                                                Print Slip
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {runs.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="text-center py-20 text-slate-400 font-bold uppercase text-xs tracking-widest">
                                            {isLoading ? "Loading salary slips..." : "No paid salary slips found for the selected period"}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
