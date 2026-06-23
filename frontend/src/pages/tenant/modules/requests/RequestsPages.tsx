import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, X, FileText, Inbox, CheckCircle2, XCircle, Clock, Building2, Tag } from "lucide-react";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { toast } from "sonner";
import RequestsList from "./RequestsList";
import { reqApi } from "@/lib/requestsApi";

const PURPLE = "#5C67F2";
const COLORS = ["#5C67F2", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#06B6D4", "#0F766E"];
const toData = (o: Record<string, number> = {}) => Object.entries(o).map(([name, value]) => ({ name, value }));

// ── Dashboard (role-aware) ─────────────────────────────────────────────────────
export function RequestsDashboard() {
    const { data, isLoading } = useQuery({ queryKey: ["req_dashboard"], queryFn: reqApi.stats });
    if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-[#5C67F2]" /></div>;
    const mine = data?.mine || {}; const inbox = data?.inbox || {}; const admin = data?.admin || {};

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-2xl font-black text-slate-900">Requests Dashboard</h1>

            <section>
                <h3 className="text-xs font-black text-slate-400 uppercase mb-2">My Requests</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <Stat label="Total" value={mine.total} icon={FileText} tone="bg-slate-100 text-slate-600" />
                    <Stat label="Pending" value={mine.pending} icon={Clock} tone="bg-amber-50 text-amber-600" />
                    <Stat label="Approved" value={mine.approved} icon={CheckCircle2} tone="bg-emerald-50 text-emerald-600" />
                    <Stat label="Rejected" value={mine.rejected} icon={XCircle} tone="bg-rose-50 text-rose-600" />
                    <Stat label="Completed" value={mine.completed} icon={CheckCircle2} tone="bg-green-50 text-green-700" />
                </div>
            </section>

            {(inbox.pending > 0 || inbox.new > 0 || data?.office) && (
                <section>
                    <h3 className="text-xs font-black text-slate-400 uppercase mb-2">Assigned to me / my office</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <Stat label="New" value={inbox.new} icon={Inbox} tone="bg-blue-50 text-blue-600" />
                        <Stat label="Pending Approvals" value={inbox.pending} icon={Clock} tone="bg-amber-50 text-amber-600" />
                        <Stat label="Approved" value={inbox.approved} icon={CheckCircle2} tone="bg-emerald-50 text-emerald-600" />
                        <Stat label="Rejected" value={inbox.rejected} icon={XCircle} tone="bg-rose-50 text-rose-600" />
                    </div>
                </section>
            )}

            {data?.isAdmin && (
                <section className="space-y-4">
                    <h3 className="text-xs font-black text-slate-400 uppercase mb-2">Administrator Overview</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <Stat label="Total Requests" value={admin.total} icon={FileText} tone="bg-slate-100 text-slate-600" />
                        <Stat label="Pending" value={admin.pending} icon={Clock} tone="bg-amber-50 text-amber-600" />
                        <Stat label="Completed" value={admin.completed} icon={CheckCircle2} tone="bg-green-50 text-green-700" />
                        <Stat label="Rejected" value={admin.rejected} icon={XCircle} tone="bg-rose-50 text-rose-600" />
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <Card title="Requests by Office"><ResponsiveContainer width="100%" height={240}><BarChart data={toData(admin.byOffice)}><XAxis dataKey="name" fontSize={11} /><YAxis fontSize={11} allowDecimals={false} /><Tooltip /><Bar dataKey="value" fill={PURPLE} radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></Card>
                        <Card title="Requests by Category"><ResponsiveContainer width="100%" height={240}><PieChart><Pie data={toData(admin.byCategory)} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>{toData(admin.byCategory).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Legend /><Tooltip /></PieChart></ResponsiveContainer></Card>
                        <Card title="Monthly Requests"><ResponsiveContainer width="100%" height={240}><BarChart data={toData(admin.byMonth)}><XAxis dataKey="name" fontSize={11} /><YAxis fontSize={11} allowDecimals={false} /><Tooltip /><Bar dataKey="value" fill="#10B981" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></Card>
                    </div>
                </section>
            )}
        </div>
    );
}
function Stat({ label, value, icon: Icon, tone }: any) {
    return <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4"><div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${tone}`}><Icon className="w-4 h-4" /></div><div className="text-2xl font-black text-slate-800">{value ?? 0}</div><div className="text-[11px] text-slate-400 font-bold">{label}</div></div>;
}
function Card({ title, children }: { title: string; children: React.ReactNode }) { return <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5"><h3 className="text-sm font-black text-slate-700 mb-3">{title}</h3>{children}</div>; }

// ── Thin list wrappers ──────────────────────────────────────────────────────────
export const MyRequests = () => <RequestsList source="mine" title="My Requests" subtitle="Requests you have submitted" showCreate />;
export const InboxNew = () => <RequestsList source="inbox" title="New Requests" subtitle="Awaiting your action" />;
export const PendingApprovals = () => <RequestsList source="inbox" title="Pending Approvals" />;
export const ApprovedRequests = () => <RequestsList source="inbox" title="Approved Requests" statusFilter="Approved" />;
export const RejectedRequests = () => <RequestsList source="inbox" title="Rejected Requests" statusFilter="Rejected" />;
export const CompletedRequests = () => <RequestsList source="all" title="Completed Requests" statusFilter="Completed" />;
export const AllRequests = () => <RequestsList source="all" title="All Requests" subtitle="Every request, every stage" />;
export const PendingRequests = () => <RequestsList source="all" title="Pending Requests" statusFilter="Pending Approval" />;
// Office-flavoured wrappers (same inbox, friendlier titles)
export const PurchaseRequestsInbox = () => <RequestsList source="inbox" title="Purchase Requests" subtitle="Forwarded to Procurement" />;
export const ExpenseRequestsInbox = () => <RequestsList source="inbox" title="Expense Requests" subtitle="Forwarded to Finance" />;

// ── Settings: Offices + Categories ───────────────────────────────────────────────
export function RequestsSettings() {
    return (
        <div className="p-6 max-w-3xl space-y-6">
            <h1 className="text-2xl font-black text-slate-900">Request Settings</h1>
            <ConfigList title="Offices" icon={Building2}
                load={reqApi.offices} add={reqApi.addOffice} del={reqApi.delOffice} qkey="req_offices_cfg" />
            <ConfigList title="Request Categories" icon={Tag}
                load={reqApi.categories} add={reqApi.addCategory} del={reqApi.delCategory} qkey="req_categories_cfg" />
        </div>
    );
}
function ConfigList({ title, icon: Icon, load, add, del, qkey }: any) {
    const qc = useQueryClient();
    const { data = [], isLoading } = useQuery({ queryKey: [qkey], queryFn: load });
    const [name, setName] = useState("");
    const addM = useMutation({ mutationFn: () => add(name.trim()), onSuccess: () => { setName(""); qc.invalidateQueries({ queryKey: [qkey] }); toast.success("Added"); }, onError: (e: any) => toast.error(e?.response?.data?.message || "Failed") });
    const delM = useMutation({ mutationFn: (id: string) => del(id), onSuccess: () => qc.invalidateQueries({ queryKey: [qkey] }) });
    return (
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
            <h3 className="text-sm font-black text-slate-700 mb-3 flex items-center gap-2"><Icon className="w-4 h-4" /> {title}</h3>
            <div className="flex gap-2 mb-3">
                <input value={name} onChange={e => setName(e.target.value)} placeholder={`Add ${title.toLowerCase().replace(/s$/, "")}…`} className="inp flex-1" />
                <button onClick={() => name.trim() && addM.mutate()} className="h-11 px-4 rounded-xl text-white font-bold text-sm flex items-center gap-1.5" style={{ background: PURPLE }}><Plus className="w-4 h-4" /> Add</button>
            </div>
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-slate-300" /> : (
                <div className="flex flex-wrap gap-2">
                    {data.map((o: any) => (
                        <span key={o._id} className="flex items-center gap-1.5 bg-slate-50 rounded-full pl-3 pr-2 py-1.5 text-xs font-bold text-slate-600">
                            {o.name}
                            <button onClick={() => delM.mutate(o._id)} className="text-slate-400 hover:text-rose-500"><X className="w-3.5 h-3.5" /></button>
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}
