import { useState } from "react";
import { Home, Search, Calendar, Printer, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { outputHtmlDoc } from "@/lib/pdfDoc";
import { useSchoolBrand } from "@/lib/printDoc";

// Convert a number to words (whole KES) for the professional amount-in-words line.
const ONES = ["", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE", "TEN", "ELEVEN", "TWELVE", "THIRTEEN", "FOURTEEN", "FIFTEEN", "SIXTEEN", "SEVENTEEN", "EIGHTEEN", "NINETEEN"];
const TENS = ["", "", "TWENTY", "THIRTY", "FORTY", "FIFTY", "SIXTY", "SEVENTY", "EIGHTY", "NINETY"];
function threeDigit(n: number): string { let s = ""; if (n >= 100) { s += ONES[Math.floor(n / 100)] + " HUNDRED "; n %= 100; } if (n >= 20) { s += TENS[Math.floor(n / 10)] + " "; n %= 10; } if (n > 0) s += ONES[n] + " "; return s.trim(); }
function inWords(amount: number): string { let n = Math.floor(amount); if (n === 0) return "ZERO"; const units = ["", "THOUSAND", "MILLION", "BILLION"]; const g: number[] = []; while (n > 0) { g.push(n % 1000); n = Math.floor(n / 1000); } const parts: string[] = []; for (let i = g.length - 1; i >= 0; i--) { if (!g[i]) continue; parts.push(`${threeDigit(g[i])}${units[i] ? " " + units[i] : ""}`); } return parts.join(" ").trim(); }

function printSlip(run: any, institute: any) {
    const schoolName = (institute?.name || institute?.schoolName || "School").toUpperCase();
    const address = institute?.address || "";
    const phone = institute?.phone || "";
    const email = institute?.email || "";
    const logo = institute?.logo || null;
    const slipNo = `PS-${String(run.month || "").replace("-", "")}-${String(run._id || "").slice(-5).toUpperCase()}`;
    const fmt = (n: any) => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const earnRows = [
        `<tr><td>Basic Salary</td><td class="amt">${fmt(run.basicSalary)}</td></tr>`,
        ...(run.allowances || []).map((a: any) => `<tr><td>${a.name}</td><td class="amt">${fmt(a.amount)}</td></tr>`),
    ].join("");
    const dedRows = (run.deductions || []).length
        ? (run.deductions || []).map((d: any) => `<tr><td>${d.name}</td><td class="amt">${fmt(d.amount)}</td></tr>`).join("")
        : `<tr><td style="color:#94a3b8">No deductions</td><td class="amt">0.00</td></tr>`;

    const html = `<!DOCTYPE html><html><head>
        <title>Salary Slip — ${run.staffName} — ${run.month}</title>
        <style>
            @page { size: A4 portrait; margin: 14mm; }
            *{ margin:0; padding:0; box-sizing:border-box; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
            body{ font-family:'Segoe UI', Arial, sans-serif; color:#1e293b; font-size:12px; }
            .doc{ border:1.5px solid #cbd5e1; border-radius:6px; overflow:hidden; }
            .head{ display:flex; align-items:center; gap:16px; padding:18px 24px; border-bottom:3px solid #1e3a8a; }
            .head img{ width:64px; height:64px; object-fit:contain; }
            .crest{ width:60px; height:60px; border-radius:50%; background:#1e3a8a; color:#fff; display:flex; align-items:center; justify-content:center; font-size:24px; font-weight:900; }
            .sname{ font-size:22px; font-weight:900; color:#1e3a8a; letter-spacing:.5px; }
            .scontact{ font-size:10px; color:#64748b; margin-top:3px; }
            .ribbon{ background:#1e3a8a; color:#fff; text-align:center; padding:8px; font-weight:800; letter-spacing:4px; text-transform:uppercase; font-size:13px; }
            .meta{ display:flex; justify-content:space-between; padding:10px 24px; background:#f8fafc; font-size:10px; color:#475569; border-bottom:1px solid #e2e8f0; }
            .info{ display:grid; grid-template-columns:1fr 1fr; gap:10px 24px; padding:18px 24px; }
            .info label{ display:block; font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#94a3b8; }
            .info span{ font-size:13px; font-weight:800; color:#0f172a; }
            .cols{ display:grid; grid-template-columns:1fr 1fr; gap:0; border-top:1px solid #e2e8f0; }
            .cols > div{ padding:0; }
            .cols > div:first-child{ border-right:1px solid #e2e8f0; }
            table{ width:100%; border-collapse:collapse; }
            th{ background:#eef2ff; color:#1e3a8a; padding:9px 16px; font-size:10px; text-transform:uppercase; letter-spacing:1px; text-align:left; border-bottom:1px solid #e2e8f0; }
            td{ padding:8px 16px; border-bottom:1px solid #f1f5f9; }
            .amt{ text-align:right; font-weight:700; }
            tfoot td{ background:#f8fafc; font-weight:900; border-top:2px solid #1e3a8a; }
            .net{ display:flex; justify-content:space-between; align-items:center; padding:16px 24px; background:#1e3a8a; color:#fff; }
            .net .lbl{ font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:2px; }
            .net .val{ font-size:22px; font-weight:900; }
            .words{ padding:10px 24px; font-size:11px; color:#475569; font-style:italic; border-bottom:1px solid #e2e8f0; }
            .sign{ display:flex; justify-content:space-between; padding:36px 24px 18px; }
            .sign .line{ border-top:1.4px solid #334155; width:200px; padding-top:5px; text-align:center; font-size:10px; font-weight:700; color:#334155; }
            .foot{ text-align:center; padding:10px; font-size:9px; color:#94a3b8; background:#f8fafc; letter-spacing:1px; }
        </style>
    </head><body>
        <div class="doc">
            <div class="head">
                ${logo ? `<img src="${logo}" alt="logo" />` : `<div class="crest">${schoolName[0] || "S"}</div>`}
                <div style="flex:1">
                    <div class="sname">${schoolName}</div>
                    <div class="scontact">${[address, phone, email].filter(Boolean).join(" &nbsp;·&nbsp; ")}</div>
                </div>
            </div>
            <div class="ribbon">Salary Pay Slip</div>
            <div class="meta"><span>Slip No: <b>${slipNo}</b></span><span>Pay Period: <b>${run.month || "—"}</b></span><span>Issued: <b>${new Date().toLocaleDateString("en-GB")}</b></span></div>
            <div class="info">
                <div><label>Employee Name</label><span>${run.staffName || "—"}</span></div>
                <div><label>Designation</label><span>${run.designation || "—"}</span></div>
                <div><label>Payment Method</label><span>${run.paymentMethod || "—"}</span></div>
                <div><label>Payment Date</label><span>${run.paymentDate || "—"}</span></div>
                <div><label>Reference</label><span>${run.paymentReference || "—"}</span></div>
                <div><label>Status</label><span>${run.status || "—"}</span></div>
            </div>
            <div class="cols">
                <div>
                    <table>
                        <thead><tr><th>Earnings</th><th class="amt">KSh</th></tr></thead>
                        <tbody>${earnRows}</tbody>
                        <tfoot><tr><td>Gross Salary</td><td class="amt">${fmt(run.grossSalary)}</td></tr></tfoot>
                    </table>
                </div>
                <div>
                    <table>
                        <thead><tr><th>Deductions</th><th class="amt">KSh</th></tr></thead>
                        <tbody>${dedRows}</tbody>
                        <tfoot><tr><td>Total Deductions</td><td class="amt">${fmt(run.totalDeductions)}</td></tr></tfoot>
                    </table>
                </div>
            </div>
            <div class="words"><b>Net pay in words:</b> KENYA SHILLINGS ${inWords(Number(run.netSalary || 0))} ONLY</div>
            <div class="net"><span class="lbl">Net Salary Payable</span><span class="val">KSh ${fmt(run.netSalary)}</span></div>
            <div class="sign">
                <div class="line">Prepared By</div>
                <div class="line">Approved By</div>
                <div class="line">Employee Signature</div>
            </div>
            <div class="foot">This is a computer-generated salary slip and is valid without a signature.</div>
        </div>
        <script>window.onload = () => window.print();</script>
    </body></html>`;
    void outputHtmlDoc(`Salary Slip — ${run.staffName}`, html, { fileName: `Salary-Slip-${run.staffName || ""}-${run.month || ""}` });
}

export default function SalaryPaidSlip() {
    const now = new Date();
    const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const [monthFilter, setMonthFilter] = useState(defaultMonth);
    const [searchQuery, setSearchQuery] = useState("");

    // Real school details for the slip header (the same source the rest of the app uses).
    const instituteData = useSchoolBrand();

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
