import { useState } from "react";
import { Home, Search, BookOpen, Check, Loader2, AlertTriangle, DollarSign, RefreshCw } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";

export default function ReturnBook() {
    const qc = useQueryClient();
    const [search, setSearch] = useState("");
    const [selectedIssue, setSelectedIssue] = useState<any>(null);
    const [returnConfirm, setReturnConfirm] = useState(false);

    const { data: activeIssues = [], isLoading, refetch } = useQuery({
        queryKey: ["library_issues_active"],
        queryFn: async () => {
            const r = await api.get("/library/issues");
            return (Array.isArray(r.data) ? r.data : []).filter((i: any) => i.status !== "RETURNED");
        },
    });

    const returnMutation = useMutation({
        mutationFn: (id: string) => api.patch(`/library/issues/${id}/return`, {}),
        onSuccess: (res) => {
            qc.invalidateQueries({ queryKey: ["library_issues_active"] });
            qc.invalidateQueries({ queryKey: ["library_books"] });
            qc.invalidateQueries({ queryKey: ["library_stats"] });
            const { fineAmount, daysOverdue } = res.data;
            if (fineAmount > 0) {
                toast.success(`Book returned! Fine: KSh ${fineAmount} (${daysOverdue} days overdue)`);
            } else {
                toast.success("Book returned successfully. No fine due.");
            }
            setSelectedIssue(null); setReturnConfirm(false); setSearch("");
        },
        onError: (e: any) => toast.error(e.response?.data?.message || "Return failed"),
    });

    const filtered = search.length >= 2
        ? activeIssues.filter((i: any) =>
            (i.memberName || "").toLowerCase().includes(search.toLowerCase()) ||
            (i.bookTitle || "").toLowerCase().includes(search.toLowerCase())
        )
        : activeIssues;

    const today = new Date();
    const calcDaysOverdue = (dueDate: string) => {
        const due = new Date(dueDate);
        const diff = today.getTime() - due.getTime();
        return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    };

    return (
        <div className="flex-1 bg-[#F8FAFC] min-h-screen flex flex-col pb-20 font-sans">
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-2 text-sm">
                    <Home className="w-4 h-4 text-[#5C67F2]" /><span className="text-gray-300">/</span>
                    <span className="font-bold text-gray-600">Library</span><span className="text-gray-300">/</span>
                    <span className="font-black text-[#5C67F2]">Return Book</span>
                </div>
            </div>

            <div className="flex-1 max-w-6xl mx-auto w-full px-6 pt-8">
                <div className="mb-6">
                    <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Return Book</h1>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-1">Process book returns and calculate overdue fines (KSh 10/day)</p>
                </div>

                {/* Search */}
                <div className="flex gap-4 mb-6">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by member or book title..."
                            className="w-full h-11 pl-12 pr-4 bg-white border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700 shadow-sm" />
                    </div>
                    <button onClick={() => refetch()} className="p-3 bg-white border border-slate-100 rounded-xl shadow-sm hover:bg-slate-50"><RefreshCw className="w-4 h-4 text-slate-500" /></button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Issues list */}
                    <div className="lg:col-span-2 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden p-6">
                        {isLoading ? (
                            <div className="flex items-center justify-center h-40 gap-2 text-slate-400 text-xs font-bold uppercase"><Loader2 className="w-5 h-5 animate-spin text-[#5C67F2]" />Loading...</div>
                        ) : filtered.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-40 gap-2 text-slate-300 text-xs font-bold uppercase"><BookOpen className="w-8 h-8" />No active issues found</div>
                        ) : (
                            <div className="space-y-3">
                                {filtered.map((issue: any) => {
                                    const daysOverdue = calcDaysOverdue(issue.dueDate);
                                    const fine = daysOverdue * 10;
                                    const isSelected = selectedIssue?._id === issue._id;
                                    return (
                                        <div key={issue._id} onClick={() => { setSelectedIssue(issue); setReturnConfirm(false); }}
                                            className={`p-4 rounded-2xl border cursor-pointer transition-all ${isSelected ? "border-[#5C67F2] bg-indigo-50/30" : daysOverdue > 0 ? "border-rose-200 bg-rose-50/20 hover:border-rose-300" : "border-slate-100 hover:border-indigo-200"}`}>
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-black text-slate-800">{issue.bookTitle}</p>
                                                    <p className="text-[9px] text-slate-500 font-bold uppercase mt-0.5">{issue.memberName} · {issue.memberClass || issue.memberType}</p>
                                                    <p className="text-[9px] text-slate-400 font-bold mt-1">Issued: {issue.issueDate} · Due: {issue.dueDate}</p>
                                                </div>
                                                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                                    <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase ${issue.status === "OVERDUE" ? "bg-rose-100 text-rose-600" : "bg-amber-100 text-amber-600"}`}>{issue.status}</span>
                                                    {daysOverdue > 0 && <span className="text-[9px] font-black text-rose-500">{daysOverdue}d · KSh {fine}</span>}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Return panel */}
                    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6">
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-4">Process Return</h3>
                        {!selectedIssue ? (
                            <p className="text-slate-300 text-xs font-bold uppercase text-center py-12">Select an issue from the list</p>
                        ) : (
                            <div className="space-y-4">
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 text-xs">
                                    <div className="flex justify-between"><span className="text-slate-400 font-black uppercase text-[9px]">Book</span><span className="font-black text-slate-800 text-right max-w-[60%] truncate">{selectedIssue.bookTitle}</span></div>
                                    <div className="flex justify-between"><span className="text-slate-400 font-black uppercase text-[9px]">Member</span><span className="font-black text-slate-700">{selectedIssue.memberName}</span></div>
                                    <div className="flex justify-between"><span className="text-slate-400 font-black uppercase text-[9px]">Issue Date</span><span className="font-black text-slate-700">{selectedIssue.issueDate}</span></div>
                                    <div className="flex justify-between"><span className="text-slate-400 font-black uppercase text-[9px]">Due Date</span><span className="font-black text-slate-700">{selectedIssue.dueDate}</span></div>
                                    <div className="flex justify-between"><span className="text-slate-400 font-black uppercase text-[9px]">Today</span><span className="font-black text-slate-700">{today.toISOString().split("T")[0]}</span></div>
                                </div>

                                {(() => {
                                    const days = calcDaysOverdue(selectedIssue.dueDate);
                                    const fine = days * 10;
                                    return days > 0 ? (
                                        <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200 flex items-center gap-3">
                                            <AlertTriangle className="w-5 h-5 text-rose-500 flex-shrink-0" />
                                            <div>
                                                <p className="text-xs font-black text-rose-700 uppercase">{days} Days Overdue</p>
                                                <p className="text-sm font-black text-rose-600">Fine: KSh {fine}</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center gap-3">
                                            <Check className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                                            <p className="text-xs font-black text-emerald-700 uppercase">Returned on time — No fine</p>
                                        </div>
                                    );
                                })()}

                                {!returnConfirm ? (
                                    <button onClick={() => setReturnConfirm(true)}
                                        className="w-full h-11 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-100">
                                        <Check className="w-4 h-4" /> Process Return
                                    </button>
                                ) : (
                                    <div className="space-y-2">
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Confirm return?</p>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button onClick={() => setReturnConfirm(false)} className="h-10 border border-slate-200 text-slate-500 font-black text-xs uppercase rounded-xl hover:bg-slate-50 transition-colors">Cancel</button>
                                            <button onClick={() => returnMutation.mutate(selectedIssue._id)} disabled={returnMutation.isPending}
                                                className="h-10 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs uppercase rounded-xl flex items-center justify-center gap-1.5 shadow-md transition-all">
                                                {returnMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                                Confirm
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
