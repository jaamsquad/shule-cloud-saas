import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UserPlus, Trash2, Loader2, X, Shield } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

const ROLE_LABEL: Record<string, string> = {
    super_owner: "Super Owner", owner: "Owner", support: "Support",
    finance: "Finance", sales: "Sales", viewer: "Viewer",
};
const ROLES = ["owner", "support", "finance", "sales", "viewer"];

export default function OwnerUsers() {
    const qc = useQueryClient();
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState({ name: "", email: "", password: "", role: "viewer" });

    const { data: users = [], isLoading } = useQuery({
        queryKey: ["owner_users"],
        queryFn: async () => { try { const r = await api.get("/owner/users"); return Array.isArray(r.data) ? r.data : []; } catch { return []; } },
    });

    const create = useMutation({
        mutationFn: async () => api.post("/owner/users", form),
        onSuccess: () => { toast.success("User added"); setOpen(false); setForm({ name: "", email: "", password: "", role: "viewer" }); qc.invalidateQueries({ queryKey: ["owner_users"] }); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });
    const update = useMutation({
        mutationFn: async ({ id, body }: { id: string; body: any }) => api.patch(`/owner/users/${id}`, body),
        onSuccess: () => { toast.success("Updated"); qc.invalidateQueries({ queryKey: ["owner_users"] }); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });
    const remove = useMutation({
        mutationFn: async (id: string) => api.delete(`/owner/users/${id}`),
        onSuccess: () => { toast.success("Removed"); qc.invalidateQueries({ queryKey: ["owner_users"] }); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-black text-slate-800 flex items-center gap-2"><Shield className="w-5 h-5" style={{ color: "#534AB7" }} /> Portal Users</h2>
                    <p className="text-xs text-slate-500">Add team members and assign their role in the owner portal</p>
                </div>
                <button onClick={() => setOpen(true)} className="h-10 px-4 text-white rounded-xl text-sm font-bold flex items-center gap-2" style={{ background: "#534AB7" }}>
                    <UserPlus className="w-4 h-4" /> Add User
                </button>
            </div>

            <div className="bg-white rounded-xl overflow-x-auto" style={{ border: "0.5px solid #e5e7eb" }}>
                <table className="w-full text-left text-sm">
                    <thead><tr className="bg-slate-50 border-b text-[10px] font-black uppercase text-slate-400 tracking-wider">
                        <th className="py-3 px-4">Name</th><th className="py-3 px-4">Email</th><th className="py-3 px-4">Role</th><th className="py-3 px-4">Status</th><th className="py-3 px-4" />
                    </tr></thead>
                    <tbody className="divide-y divide-slate-50">
                        {isLoading ? (
                            <tr><td colSpan={5} className="py-14 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-300" /></td></tr>
                        ) : users.length === 0 ? (
                            <tr><td colSpan={5} className="py-14 text-center text-slate-400 text-xs font-bold uppercase">No users yet</td></tr>
                        ) : users.map((u: any) => (
                            <tr key={u._id} className="hover:bg-slate-50/50">
                                <td className="py-3 px-4 font-bold text-slate-800">{u.name}</td>
                                <td className="py-3 px-4 text-slate-500">{u.email}</td>
                                <td className="py-3 px-4">
                                    {u.role === "super_owner" ? (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-700">Super Owner</span>
                                    ) : (
                                        <select value={u.role} onChange={(e) => update.mutate({ id: u._id, body: { role: e.target.value } })}
                                            className="h-8 px-2 rounded-lg text-xs font-bold text-slate-600" style={{ border: "0.5px solid #e5e7eb" }}>
                                            {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                                        </select>
                                    )}
                                </td>
                                <td className="py-3 px-4">
                                    <button onClick={() => update.mutate({ id: u._id, body: { status: u.status === "suspended" ? "active" : "suspended" } })}
                                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${u.status === "suspended" ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>
                                        {u.status || "active"}
                                    </button>
                                </td>
                                <td className="py-3 px-4">
                                    {u.role !== "super_owner" && (
                                        <button onClick={() => { if (confirm("Remove this user?")) remove.mutate(u._id); }} className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 text-red-400 hover:text-red-600 flex items-center justify-center">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="font-black text-slate-800">Add Portal User</h2>
                            <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500"><X className="w-4 h-4" /></button>
                        </div>
                        <div className="space-y-3">
                            {[["name", "Full Name"], ["email", "Email"], ["password", "Temporary Password"]].map(([k, label]) => (
                                <div key={k}>
                                    <label className="block text-[11px] font-bold text-slate-600 mb-1">{label}</label>
                                    <input type={k === "password" ? "password" : k === "email" ? "email" : "text"} value={(form as any)[k]}
                                        onChange={(e) => setForm((p) => ({ ...p, [k]: e.target.value }))}
                                        className="w-full h-10 px-3 rounded-lg text-sm focus:outline-none" style={{ border: "0.5px solid #e5e7eb" }} />
                                </div>
                            ))}
                            <div>
                                <label className="block text-[11px] font-bold text-slate-600 mb-1">Role</label>
                                <select value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
                                    className="w-full h-10 px-3 rounded-lg text-sm" style={{ border: "0.5px solid #e5e7eb" }}>
                                    {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="flex gap-2 mt-6">
                            <button onClick={() => setOpen(false)} className="flex-1 h-10 rounded-xl text-slate-600 font-bold text-sm" style={{ border: "0.5px solid #e5e7eb" }}>Cancel</button>
                            <button onClick={() => create.mutate()} disabled={create.isPending} className="flex-1 h-10 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50" style={{ background: "#534AB7" }}>
                                {create.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />} Add User
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
