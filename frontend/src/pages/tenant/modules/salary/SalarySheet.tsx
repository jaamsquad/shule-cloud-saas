import { useState } from "react";
import { Home, Calendar, Loader2, Check, Printer, RefreshCw } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";

export default function SalarySheet() {
    const now = new Date();
    const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
    const [isProcessing, setIsProcessing] = useState(false);
    const queryClient = useQueryClient();

    const { data: sheetData, isLoading, refetch } = useQuery({
        queryKey: ["salary_sheet", selectedMonth],
        queryFn: async () => {
            const r = await api.get(`/salary/sheet?month=${selectedMonth}`);
            return r.data;
        },
        enabled: !!selectedMonth,
    });

    const runs: any[] = sheetData?.runs || [];
    const isGenerated: boolean = sheetData?.generated || false;
    const staffPreviewCount: number = sheetData?.staff?.length || 0;

    const totalGross = runs.reduce((s, r) => s + (r.grossSalary || 0), 0);
    const totalDeductions = runs.reduce((s, r) => s + (r.totalDeductions || 0), 0);
    const totalNet = runs.reduce((s, r) => s + (r.netSalary || 0), 0);
    const paidCount = runs.filter((r) => r.status === "Paid").length;

    const handleGeneratePayroll = async () => {
        setIsProcessing(true);
        try {
            const res = await api.post("/salary/process-month", { month: selectedMonth });
            toast.success(res.data?.message || `Payroll generated for ${selectedMonth}`);
            refetch();
            queryClient.invalidateQueries({ queryKey: ["payroll_runs"] });
        } catch (e: any) {
            toast.error(e.response?.data?.message || "Failed to generate payroll");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleMarkPaid = async (run: any) => {
        try {
            await api.patch(`/salary/payroll-runs/${run._id}`, {
                status: "Paid",
                paymentDate: new Date().toISOString().split("T")[0],
                paymentMethod: "CASH",
            });
            toast.success(`${run.staffName} marked as paid`);
            refetch();
        } catch {
            toast.error("Failed to update status");
        }
    };

    const handleMarkAllPaid = async () => {
        const pending = runs.filter((r) => r.status !== "Paid");
        if (pending.length === 0) { toast.info("All entries are already paid"); return; }
        try {
            await Promise.all(pending.map((r) =>
                api.patch(`/salary/payroll-runs/${r._id}`, {
                    status: "Paid",
                    paymentDate: new Date().toISOString().split("T")[0],
                    paymentMethod: "CASH",
                })
            ));
            toast.success(`${pending.length} salaries marked as paid`);
            refetch();
        } catch {
            toast.error("Failed to update some records");
        }
    };

    return (
        <div className="flex-1 bg-[#F8FAFC] min-h-screen flex flex-col pb-20 font-sans">
            {/* Breadcrumb */}
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-2 text-sm">
                    <Home className="w-4 h-4 text-[#5C67F2]" />
                    <span className="text-gray-300">/</span>
                    <span className="font-bold text-gray-600">Salary</span>
                    <span className="text-gray-300">/</span>
                    <span className="font-black text-[#5C67F2]">Salary Sheet</span>
                </div>
                {runs.length > 0 && (
                    <button onClick={() => window.print()}
                        className="bg-white hover:bg-indigo-50 text-gray-700 h-9 px-4 rounded-xl font-bold flex items-center gap-2 text-xs border border-gray-200 hover:border-indigo-300 shadow-sm transition-all">
                        <Printer className="w-3.5 h-3.5 text-indigo-500" />
                        Print Sheet
                    </button>
                )}
            </div>

            <div className="flex-1 max-w-7xl mx-auto w-full px-6 pt-10">
                <div className="mb-8">
                    <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Salary Sheet</h1>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-1">
                        Monthly payroll register — generate, review, and mark salaries as paid
                    </p>
                </div>

                {/* Controls */}
                <div className="flex flex-wrap gap-4 items-center bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm mb-8">
                    <div className="relative w-52">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="month"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="w-full h-11 pl-12 pr-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700"
                        />
                    </div>
                    <button onClick={() => refetch()} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-100 transition-colors">
                        <RefreshCw className="w-4 h-4 text-slate-500" />
                    </button>

                    {runs.length > 0 && paidCount < runs.length && (
                        <button onClick={handleMarkAllPaid}
                            className="h-11 px-5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-black text-xs uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 border border-emerald-100">
                            <Check className="w-4 h-4" />
                            Mark All Paid
                        </button>
                    )}

                    {!isGenerated && selectedMonth && (
                        <button onClick={handleGeneratePayroll} disabled={isProcessing}
                            className="ml-auto h-11 px-6 bg-[#5C67F2] hover:bg-indigo-600 disabled:opacity-50 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-indigo-100 flex items-center gap-2">
                            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            Generate Payroll for {selectedMonth}
                            {staffPreviewCount > 0 && ` (${staffPreviewCount} staff)`}
                        </button>
                    )}
                </div>

                {/* Summary Stats */}
                {runs.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        {[
                            { label: "Total Gross", value: `KSh ${totalGross.toLocaleString()}`, color: "text-slate-800" },
                            { label: "Total Deductions", value: `KSh ${totalDeductions.toLocaleString()}`, color: "text-rose-500" },
                            { label: "Total Net Pay", value: `KSh ${totalNet.toLocaleString()}`, color: "text-[#5C67F2]" },
                            { label: "Payment Status", value: `${paidCount} Paid / ${runs.length} Total`, color: "text-emerald-600" },
                        ].map((s) => (
                            <div key={s.label} className="bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-sm">
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">{s.label}</p>
                                <p className={`text-base font-black ${s.color}`}>{s.value}</p>
                            </div>
                        ))}
                    </div>
                )}

                {/* Sheet Table */}
                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden p-8">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-20 gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest">
                            <Loader2 className="w-5 h-5 animate-spin text-[#5C67F2]" /> Loading payroll data...
                        </div>
                    ) : runs.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                                        <th className="py-4 px-3">#</th>
                                        <th className="py-4 px-3">Employee</th>
                                        <th className="py-4 px-3 text-right">Basic</th>
                                        <th className="py-4 px-3 text-right">Allow.</th>
                                        <th className="py-4 px-3 text-right">Gross</th>
                                        <th className="py-4 px-3 text-right">NSSF</th>
                                        <th className="py-4 px-3 text-right">NHIF</th>
                                        <th className="py-4 px-3 text-right">PAYE</th>
                                        <th className="py-4 px-3 text-right">Net Pay</th>
                                        <th className="py-4 px-3 text-center">Status</th>
                                        <th className="py-4 px-3 text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {runs.map((run: any, idx: number) => {
                                        const nssf = run.deductions?.find((d: any) => d.name === "NSSF")?.amount || 0;
                                        const nhif = run.deductions?.find((d: any) => d.name === "NHIF")?.amount || 0;
                                        const paye = run.deductions?.find((d: any) => d.name === "PAYE")?.amount || 0;
                                        const totalAllowances = (run.allowances || []).reduce((s: number, a: any) => s + a.amount, 0);
                                        return (
                                            <tr key={run._id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="py-3 px-3 text-slate-400 font-bold">{idx + 1}</td>
                                                <td className="py-3 px-3">
                                                    <p className="font-black text-slate-800 uppercase">{run.staffName}</p>
                                                    <p className="text-[9px] text-slate-400 font-bold uppercase">{run.designation}</p>
                                                </td>
                                                <td className="py-3 px-3 text-right font-bold">{Number(run.basicSalary).toLocaleString()}</td>
                                                <td className="py-3 px-3 text-right font-bold text-emerald-600">
                                                    {totalAllowances > 0 ? totalAllowances.toLocaleString() : "—"}
                                                </td>
                                                <td className="py-3 px-3 text-right font-black">{Number(run.grossSalary).toLocaleString()}</td>
                                                <td className="py-3 px-3 text-right text-rose-400">{nssf.toLocaleString()}</td>
                                                <td className="py-3 px-3 text-right text-rose-400">{nhif.toLocaleString()}</td>
                                                <td className="py-3 px-3 text-right text-rose-400">{paye.toLocaleString()}</td>
                                                <td className="py-3 px-3 text-right font-black text-[#5C67F2] text-sm">
                                                    {Number(run.netSalary).toLocaleString()}
                                                </td>
                                                <td className="py-3 px-3 text-center">
                                                    <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                                                        run.status === "Paid"
                                                            ? "bg-emerald-50 text-emerald-600"
                                                            : "bg-amber-50 text-amber-600"
                                                    }`}>
                                                        {run.status}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-3 text-center">
                                                    {run.status !== "Paid" && (
                                                        <button onClick={() => handleMarkPaid(run)}
                                                            className="h-8 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-black text-[9px] uppercase rounded-xl transition-colors flex items-center gap-1 mx-auto">
                                                            <Check className="w-3 h-3" /> Mark Paid
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-slate-50 border-t-2 border-slate-100 font-black text-xs">
                                        <td colSpan={2} className="py-4 px-3 uppercase text-slate-500 tracking-wider">Totals ({runs.length})</td>
                                        <td className="py-4 px-3 text-right text-slate-800">
                                            {runs.reduce((s, r) => s + (r.basicSalary || 0), 0).toLocaleString()}
                                        </td>
                                        <td className="py-4 px-3 text-right text-emerald-600">
                                            {runs.reduce((s, r) => s + (r.allowances || []).reduce((a: number, x: any) => a + x.amount, 0), 0).toLocaleString() || "—"}
                                        </td>
                                        <td className="py-4 px-3 text-right">{totalGross.toLocaleString()}</td>
                                        <td className="py-4 px-3 text-right text-rose-400">
                                            {runs.reduce((s, r) => s + (r.deductions?.find((d: any) => d.name === "NSSF")?.amount || 0), 0).toLocaleString()}
                                        </td>
                                        <td className="py-4 px-3 text-right text-rose-400">
                                            {runs.reduce((s, r) => s + (r.deductions?.find((d: any) => d.name === "NHIF")?.amount || 0), 0).toLocaleString()}
                                        </td>
                                        <td className="py-4 px-3 text-right text-rose-400">
                                            {runs.reduce((s, r) => s + (r.deductions?.find((d: any) => d.name === "PAYE")?.amount || 0), 0).toLocaleString()}
                                        </td>
                                        <td className="py-4 px-3 text-right text-[#5C67F2]">{totalNet.toLocaleString()}</td>
                                        <td colSpan={2}></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-20">
                            <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">
                                {selectedMonth
                                    ? staffPreviewCount > 0
                                        ? `No payroll for ${selectedMonth} — ${staffPreviewCount} staff ready. Click "Generate Payroll" to process.`
                                        : `No payroll data for ${selectedMonth} and no staff records found.`
                                    : "Select a month to view or generate the salary sheet"}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
