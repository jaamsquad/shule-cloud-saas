import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, UserPlus, X, ShieldCheck, Building2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { isOrgUser } from "@/lib/orgContext";

const ROLES = [
    { v: "ORG_OWNER", label: "Organization Owner (full access)", wide: true },
    { v: "ORG_ADMIN", label: "Organization Administrator", wide: true },
    { v: "ORG_FINANCE_MANAGER", label: "Organization Finance Manager", wide: true },
    { v: "ORG_HR_MANAGER", label: "Organization HR Manager", wide: true },
    { v: "ORG_PROCUREMENT_MANAGER", label: "Organization Procurement Manager", wide: true },
];

// Manage organization-level users and which branches each can access.
export default function OrgUsers() {
    const qc = useQueryClient();
    const [show, setShow] = useState(false);
    const [showBranchAdmin, setShowBranchAdmin] = useState(false);
    const [form, setForm] = useState<any>({ role: "ORG_ADMIN", allowedBranchIds: [] as string[] });

    const { data: users = [], isLoading } = useQuery({
        queryKey: ["org_users"], enabled: isOrgUser(),
        queryFn: async () => (await api.get("/org/users")).data,
    });
    const { data: branches = [] } = useQuery({
        queryKey: ["org_branches_users"], enabled: isOrgUser(),
        queryFn: async () => (await api.get("/org/branches")).data,
    });

    const create = useMutation({
        mutationFn: async () => (await api.post("/org/users", form)).data,
        onSuccess: () => { toast.success("Manager added"); setShow(false); setForm({ role: "ORG_ADMIN", allowedBranchIds: [] }); qc.invalidateQueries({ queryKey: ["org_users"] }); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Could not add manager"),
    });

    const [bForm, setBForm] = useState<any>({ branchId: "", name: "", email: "", phone: "", password: "" });
    const createBranchAdmin = useMutation({
        mutationFn: async () => (await api.post("/org/branch-admin", bForm)).data,
        onSuccess: (d: any) => { toast.success(d.message || "Branch admin created"); setShowBranchAdmin(false); setBForm({ branchId: "", name: "", email: "", phone: "", password: "" }); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Could not create branch admin"),
    });

    const roleLabel = (v: string) => ROLES.find(r => r.v === v)?.label || v;

    return (
        <div className="flex-1 bg-[#F8FAFC] min-h-screen p-6">
            <div className="flex items-center justify-between mb-5">
                <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2"><ShieldCheck className="w-6 h-6 text-[#5C67F2]" /> Organization Users</h1>
                <div className="flex items-center gap-2">
                    <button onClick={() => setShowBranchAdmin(true)} className="h-10 px-4 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm flex items-center gap-1.5"><Building2 className="w-4 h-4" /> Create Branch Admin</button>
                    <button onClick={() => setShow(true)} className="h-10 px-4 rounded-xl bg-[#5C67F2] text-white font-bold text-sm flex items-center gap-1.5"><UserPlus className="w-4 h-4" /> Add Manager</button>
                </div>
            </div>

            {isLoading ? <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div> : (
                <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead><tr className="bg-slate-50 text-slate-400 text-[11px] uppercase">
                            <th className="text-left px-4 py-3 font-black">Name</th>
                            <th className="text-left px-4 py-3 font-black">Email</th>
                            <th className="text-left px-4 py-3 font-black">Role</th>
                            <th className="text-left px-4 py-3 font-black">Branches</th>
                        </tr></thead>
                        <tbody>
                            {users.map((u: any) => (
                                <tr key={u.id} className="border-b border-slate-50">
                                    <td className="px-4 py-3 font-bold text-slate-700">{u.name}</td>
                                    <td className="px-4 py-3 text-slate-500">{u.email}</td>
                                    <td className="px-4 py-3">{roleLabel(u.role)}</td>
                                    <td className="px-4 py-3 text-slate-500">{u.allowedBranchIds?.length ? `${u.allowedBranchIds.length} branch(es)` : "All"}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {show && (
                <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShow(false)}>
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                            <h2 className="font-black text-slate-800">Add Organization User</h2>
                            <button onClick={() => setShow(false)} className="text-slate-400"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-5 space-y-3">
                            <input placeholder="Full name" value={form.name || ""} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm" />
                            <input placeholder="Email" value={form.email || ""} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm" />
                            <input placeholder="Temporary password" type="text" value={form.password || ""} onChange={e => setForm({ ...form, password: e.target.value })} className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm" />
                            <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm bg-white">
                                {ROLES.map(r => <option key={r.v} value={r.v}>{r.label}</option>)}
                            </select>
                            <p className="text-[11px] text-slate-400 font-bold">Organization roles see every branch. You can create another Owner/Admin with the same access as you.</p>
                        </div>
                        <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-100">
                            <button onClick={() => setShow(false)} className="h-10 px-4 rounded-xl border border-slate-200 text-slate-500 font-bold text-sm">Cancel</button>
                            <button onClick={() => create.mutate()} disabled={create.isPending || !form.email || !form.password} className="h-10 px-5 rounded-xl bg-[#5C67F2] text-white font-bold text-sm flex items-center gap-1.5 disabled:opacity-50">
                                {create.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />} Add
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Branch Admin modal */}
            {showBranchAdmin && (
                <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowBranchAdmin(false)}>
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                            <h2 className="font-black text-slate-800">Create Branch Admin</h2>
                            <button onClick={() => setShowBranchAdmin(false)} className="text-slate-400"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-5 space-y-3">
                            <p className="text-xs text-slate-500">Creates an administrator for one specific branch. They can sign in to and manage only that branch.</p>
                            <select value={bForm.branchId} onChange={e => setBForm({ ...bForm, branchId: e.target.value })} className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm bg-white">
                                <option value="">— Select branch —</option>
                                {branches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                            <input placeholder="Full name" value={bForm.name} onChange={e => setBForm({ ...bForm, name: e.target.value })} className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm" />
                            <input placeholder="Email" value={bForm.email} onChange={e => setBForm({ ...bForm, email: e.target.value })} className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm" />
                            <input placeholder="Phone (optional)" value={bForm.phone} onChange={e => setBForm({ ...bForm, phone: e.target.value })} className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm" />
                            <input placeholder="Temporary password" value={bForm.password} onChange={e => setBForm({ ...bForm, password: e.target.value })} className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm" />
                        </div>
                        <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-100">
                            <button onClick={() => setShowBranchAdmin(false)} className="h-10 px-4 rounded-xl border border-slate-200 text-slate-500 font-bold text-sm">Cancel</button>
                            <button onClick={() => createBranchAdmin.mutate()} disabled={createBranchAdmin.isPending || !bForm.branchId || !bForm.email || !bForm.password} className="h-10 px-5 rounded-xl bg-[#5C67F2] text-white font-bold text-sm flex items-center gap-1.5 disabled:opacity-50">
                                {createBranchAdmin.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Building2 className="w-4 h-4" />} Create
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
