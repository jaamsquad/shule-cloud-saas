import { useState } from "react";
import { Home, Search, Check, Loader2, X, Plus, AlertTriangle } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";

export default function PaySalary() {
    const now = new Date();
    const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const [searchQuery, setSearchQuery] = useState("");
    const [selectedStaff, setSelectedStaff] = useState<any>(null);
    const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
    const [method, setMethod] = useState("CASH");
    const [reference, setReference] = useState("");
    const [paymentDate, setPaymentDate] = useState(now.toISOString().split("T")[0]);
    const [remarks, setRemarks] = useState("");
    const [selectedAllowances, setSelectedAllowances] = useState<any[]>([]);
    const [selectedDeductions, setSelectedDeductions] = useState<any[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const queryClient = useQueryClient();

    // ── Data queries ──────────────────────────────────────────────────────────
    const { data: allStaff = [] } = useQuery({
        queryKey: ["staff"],
        queryFn: async () => {
            const r = await api.get("/staff");
            return Array.isArray(r.data) ? r.data : [];
        },
    });

    const { data: salaryComponents = [] } = useQuery({
        queryKey: ["salary_components"],
        queryFn: async () => {
            const r = await api.get("/salary/components");
            return Array.isArray(r.data) ? r.data : [];
        },
    });

    const { data: existingRun } = useQuery({
        queryKey: ["payroll_run_single", selectedStaff?._id, selectedMonth],
        queryFn: async () => {
            const r = await api.get(`/salary/payroll-runs?staffId=${selectedStaff._id}&month=${selectedMonth}`);
            return Array.isArray(r.data) ? r.data[0] : null;
        },
        enabled: !!selectedStaff && !!selectedMonth,
    });

    const allowanceComponents = salaryComponents.filter((c: any) =>
        (c.category === "allowance" || c.category === "bonus") && c.isActive !== false
    );
    const deductionComponents = salaryComponents.filter((c: any) =>
        c.category === "deduction" && c.isActive !== false
    );

    const filteredStaff = searchQuery.length >= 2 && !selectedStaff
        ? allStaff.filter((s: any) =>
            (s.employeeName || s.name || "").toLowerCase().includes(searchQuery.toLowerCase())
        )
        : [];

    // ── Calculations ──────────────────────────────────────────────────────────
    const basic = selectedStaff ? Number(selectedStaff.salary) || 0 : 0;

    const resolveAmount = (component: any): number => {
        if (component.amountType === "percentage") {
            return Math.round((basic * Number(component.percentage)) / 100);
        }
        return Number(component.amount) || 0;
    };

    const totalAllowances = selectedAllowances.reduce((s, a) => s + resolveAmount(a), 0);
    const grossSalary = basic + totalAllowances;
    const totalDeductions = selectedDeductions.reduce((s, d) => s + resolveAmount(d), 0);
    const netSalary = Math.max(0, grossSalary - totalDeductions);

    // ── Toggle helpers ────────────────────────────────────────────────────────
    const toggleAllowance = (component: any) => {
        setSelectedAllowances(prev =>
            prev.find(a => a._id === component._id)
                ? prev.filter(a => a._id !== component._id)
                : [...prev, component]
        );
    };

    const toggleDeduction = (component: any) => {
        setSelectedDeductions(prev =>
            prev.find(d => d._id === component._id)
                ? prev.filter(d => d._id !== component._id)
                : [...prev, component]
        );
    };

    // ── Submit ────────────────────────────────────────────────────────────────
    const handlePay = async () => {
        if (!selectedStaff || !selectedMonth) {
            toast.error("Select an employee and month");
            return;
        }
        setIsSubmitting(true);
        try {
            const payload = {
                month: selectedMonth,
                staffId: selectedStaff._id,
                staffName: selectedStaff.employeeName || selectedStaff.name,
                designation: selectedStaff.designation || "",
                department: selectedStaff.department || "",
                basicSalary: basic,
                allowances: selectedAllowances.map(a => ({ name: a.name, amount: resolveAmount(a) })),
                deductions: selectedDeductions.map(d => ({ name: d.name, amount: resolveAmount(d) })),
                grossSalary,
                totalDeductions,
                netSalary,
                paymentMethod: method,
                paymentReference: reference,
                paymentDate,
                remarks,
                status: "Paid",
            };

            if (existingRun?._id) {
                await api.patch(`/salary/payroll-runs/${existingRun._id}`, payload);
            } else {
                await api.post("/salary/payroll-runs", payload);
            }

            toast.success(`Salary paid — ${payload.staffName}: KSh ${netSalary.toLocaleString()}`);
            queryClient.invalidateQueries({ queryKey: ["payroll_runs"] });
            queryClient.invalidateQueries({ queryKey: ["payroll_run_single"] });
            setSelectedStaff(null);
            setSearchQuery("");
            setReference(""); setRemarks("");
            setSelectedAllowances([]); setSelectedDeductions([]);
        } catch (e: any) {
            toast.error(e.response?.data?.message || "Failed to process payment");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex-1 bg-[#F8FAFC] min-h-screen flex flex-col pb-20 font-sans">
            {/* Breadcrumb */}
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-2 text-sm">
                    <Home className="w-4 h-4 text-[#5C67F2]" />
                    <span className="text-gray-300">/</span>
                    <span className="font-bold text-gray-600">Salary</span>
                    <span className="text-gray-300">/</span>
                    <span className="font-black text-[#5C67F2]">Pay Salary</span>
                </div>
            </div>

            <div className="flex-1 max-w-6xl mx-auto w-full px-6 pt-10">
                <div className="mb-8">
                    <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Pay Salary</h1>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-1">
                        Select employee, apply allowances and deductions, then process payment
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* ── Left Panel ───────────────────────────────────────── */}
                    <div className="space-y-6">
                        {/* Employee Search */}
                        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm relative">
                            <div className="absolute -top-3 left-6 bg-[#5C67F2] text-white text-[9px] px-3 py-0.5 rounded-full font-black tracking-widest z-10 shadow-sm uppercase">
                                Search Employee*
                            </div>
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => { setSearchQuery(e.target.value); if (selectedStaff) setSelectedStaff(null); }}
                                    className="w-full h-11 pl-12 pr-10 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] focus:bg-white text-xs font-bold text-slate-700"
                                    placeholder="Type name..."
                                />
                                {selectedStaff && (
                                    <button onClick={() => { setSelectedStaff(null); setSearchQuery(""); setSelectedAllowances([]); setSelectedDeductions([]); }}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500">
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                            {filteredStaff.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-slate-100 shadow-xl z-50 overflow-hidden max-h-56 overflow-y-auto">
                                    {filteredStaff.map((s: any) => (
                                        <div key={s._id}
                                            onClick={() => { setSelectedStaff(s); setSearchQuery(s.employeeName || s.name); setSelectedAllowances([]); setSelectedDeductions([]); }}
                                            className="px-4 py-3 hover:bg-slate-50 cursor-pointer flex items-center justify-between border-b border-slate-50 transition-colors">
                                            <div>
                                                <p className="text-xs font-black text-slate-700 uppercase">{s.employeeName || s.name}</p>
                                                <p className="text-[9px] text-slate-400 font-bold uppercase">{s.designation} · KSh {Number(s.salary || 0).toLocaleString()}/mo</p>
                                            </div>
                                            <Check className="w-3.5 h-3.5 text-slate-200" />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Month Picker */}
                        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm relative">
                            <div className="absolute -top-3 left-6 bg-slate-800 text-white text-[9px] px-3 py-0.5 rounded-full font-black tracking-widest z-10 shadow-sm uppercase">
                                Pay Month*
                            </div>
                            <input
                                type="month"
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700"
                            />
                            {existingRun && (
                                <p className="mt-3 text-[9px] font-black text-amber-600 uppercase tracking-wide flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" />Record exists — will be updated
                                </p>
                            )}
                        </div>

                        {/* Staff Summary */}
                        {selectedStaff && (
                            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-50">
                                    <div className="w-11 h-11 rounded-2xl bg-indigo-50 flex items-center justify-center font-black text-[#5C67F2] text-lg">
                                        {(selectedStaff.employeeName || selectedStaff.name || "?")[0]}
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-black text-slate-800 uppercase">{selectedStaff.employeeName || selectedStaff.name}</h4>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase">{selectedStaff.designation}</p>
                                    </div>
                                </div>
                                <div className="space-y-2.5">
                                    {[
                                        ["Basic Salary", `KSh ${basic.toLocaleString()}`],
                                        ["Bank", selectedStaff.bankName || "—"],
                                        ["Account No", selectedStaff.accountNo || "—"],
                                        ["KRA PIN", selectedStaff.kraPin || "—"],
                                        ["NSSF No", selectedStaff.nssfNo || "—"],
                                        ["NHIF No", selectedStaff.nhifNo || "—"],
                                    ].map(([label, value]) => (
                                        <div key={label} className="flex justify-between">
                                            <span className="text-[9px] text-slate-400 font-black uppercase">{label}</span>
                                            <span className="text-[10px] font-black text-slate-700">{value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── Right Panel ──────────────────────────────────────── */}
                    <div className="md:col-span-2 space-y-6">
                        {selectedStaff ? (
                            <>
                                {/* Salary Breakdown */}
                                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-6">Salary Breakdown</h3>

                                    {/* ── EARNINGS ─────────────────────────────────── */}
                                    <div className="space-y-3 mb-6">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Earnings</p>

                                        {/* Basic */}
                                        <div className="flex justify-between items-center py-2 border-b border-slate-50">
                                            <span className="text-[10px] font-black text-slate-600 uppercase">Basic Salary</span>
                                            <span className="text-sm font-black text-slate-800">KSh {basic.toLocaleString()}</span>
                                        </div>

                                        {/* Selected allowances */}
                                        {selectedAllowances.map((a) => (
                                            <div key={a._id} className="flex justify-between items-center py-2 border-b border-slate-50">
                                                <span className="text-[10px] font-black text-emerald-600 uppercase">+ {a.name}</span>
                                                <span className="text-sm font-black text-emerald-600">KSh {resolveAmount(a).toLocaleString()}</span>
                                            </div>
                                        ))}

                                        {/* Allowance component pills */}
                                        {allowanceComponents.length > 0 ? (
                                            <div className="flex flex-wrap gap-2 pt-2">
                                                {allowanceComponents.map((c: any) => {
                                                    const active = selectedAllowances.some(a => a._id === c._id);
                                                    const preview = c.amountType === "percentage"
                                                        ? `${c.percentage}% · KSh ${Math.round(basic * c.percentage / 100).toLocaleString()}`
                                                        : `KSh ${Number(c.amount).toLocaleString()}`;
                                                    return (
                                                        <button
                                                            key={c._id}
                                                            onClick={() => toggleAllowance(c)}
                                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wide border transition-all ${
                                                                active
                                                                    ? "bg-emerald-500 text-white border-emerald-500 shadow-sm"
                                                                    : "bg-white text-slate-600 border-slate-200 hover:border-emerald-300 hover:text-emerald-600 hover:bg-emerald-50"
                                                            }`}
                                                        >
                                                            {active ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                                                            {c.name}
                                                            <span className={`text-[8px] font-bold normal-case ${active ? "text-white/80" : "text-slate-400"}`}>
                                                                ({preview})
                                                            </span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <p className="text-[9px] text-slate-300 font-bold italic pt-1">
                                                No allowances defined —{" "}
                                                <a href="/salary/components" className="text-[#5C67F2] underline">add in Salary Components</a>
                                            </p>
                                        )}
                                    </div>

                                    {/* Gross */}
                                    <div className="flex justify-between items-center py-3 border-y border-slate-100 mb-6">
                                        <span className="text-[10px] font-black text-slate-600 uppercase">Gross Salary</span>
                                        <span className="text-lg font-black text-slate-800">KSh {grossSalary.toLocaleString()}</span>
                                    </div>

                                    {/* ── DEDUCTIONS ───────────────────────────────── */}
                                    <div className="space-y-3 mb-6">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Deductions</p>

                                        {/* Selected deductions */}
                                        {selectedDeductions.map((d) => (
                                            <div key={d._id} className="flex justify-between items-center py-2 border-b border-slate-50">
                                                <span className="text-[10px] font-black text-rose-500 uppercase">- {d.name}</span>
                                                <span className="text-sm font-black text-rose-500">KSh {resolveAmount(d).toLocaleString()}</span>
                                            </div>
                                        ))}

                                        {/* Deduction component pills */}
                                        {deductionComponents.length > 0 ? (
                                            <div className="flex flex-wrap gap-2 pt-2">
                                                {deductionComponents.map((c: any) => {
                                                    const active = selectedDeductions.some(d => d._id === c._id);
                                                    const preview = c.amountType === "percentage"
                                                        ? `${c.percentage}% · KSh ${Math.round(basic * c.percentage / 100).toLocaleString()}`
                                                        : `KSh ${Number(c.amount).toLocaleString()}`;
                                                    return (
                                                        <button
                                                            key={c._id}
                                                            onClick={() => toggleDeduction(c)}
                                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wide border transition-all ${
                                                                active
                                                                    ? "bg-rose-500 text-white border-rose-500 shadow-sm"
                                                                    : "bg-white text-slate-600 border-slate-200 hover:border-rose-300 hover:text-rose-600 hover:bg-rose-50"
                                                            }`}
                                                        >
                                                            {active ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                                                            {c.name}
                                                            <span className={`text-[8px] font-bold normal-case ${active ? "text-white/80" : "text-slate-400"}`}>
                                                                ({preview})
                                                            </span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <p className="text-[9px] text-slate-300 font-bold italic pt-1">
                                                No deductions defined —{" "}
                                                <a href="/salary/components" className="text-[#5C67F2] underline">add in Salary Components</a>
                                            </p>
                                        )}
                                    </div>

                                    {/* Net */}
                                    <div className="bg-indigo-50 rounded-2xl p-5 flex justify-between items-center">
                                        <span className="text-xs font-black text-[#5C67F2] uppercase tracking-widest">Net Salary</span>
                                        <span className="text-2xl font-black text-[#5C67F2]">KSh {netSalary.toLocaleString()}</span>
                                    </div>
                                </div>

                                {/* Payment Details */}
                                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-6">Payment Details</h3>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="relative group">
                                            <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Payment Method*</div>
                                            <select value={method} onChange={(e) => setMethod(e.target.value)}
                                                className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700">
                                                <option value="CASH">Cash</option>
                                                <option value="BANK_TRANSFER">Bank Transfer</option>
                                                <option value="MPESA">M-Pesa</option>
                                                <option value="CHEQUE">Cheque</option>
                                            </select>
                                        </div>
                                        <div className="relative group">
                                            <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Payment Date*</div>
                                            <input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)}
                                                className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700" />
                                        </div>
                                        <div className="relative group col-span-2">
                                            <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Transaction Reference</div>
                                            <input type="text" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Cheque / Transfer / M-Pesa code..."
                                                className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700" />
                                        </div>
                                        <div className="relative group col-span-2">
                                            <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Remarks</div>
                                            <input type="text" value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Optional notes..."
                                                className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700" />
                                        </div>
                                    </div>
                                    <button onClick={handlePay} disabled={isSubmitting}
                                        className="mt-6 w-full h-12 bg-[#5C67F2] hover:bg-indigo-600 disabled:opacity-40 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2">
                                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                        Confirm & Process — KSh {netSalary.toLocaleString()}
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="bg-white rounded-[2.5rem] border-2 border-dashed border-slate-100 flex items-center justify-center h-64 text-slate-400 font-bold uppercase text-xs tracking-widest">
                                Search and select an employee to view salary breakdown
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
