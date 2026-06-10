import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Shield, Loader2, Check, Users, Copy, Save, UserPlus, X, Crown } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { PERMISSION_GROUPS, DEFAULT_ROLE_PERMISSIONS, MIS_ROLE_GROUPS, MIS_ROLES } from "@/lib/permissions";

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

export default function StaffRoles() {
    const qc = useQueryClient();
    const [selected, setSelected] = useState<string>("Teacher");
    const [perms, setPerms] = useState<string[]>([]);
    const [addStaffId, setAddStaffId] = useState("");

    const { data: roleDocs = [] } = useQuery({ queryKey: ["rbac_roles"], queryFn: async () => { const r = await api.get("/roles"); return Array.isArray(r.data) ? r.data : []; } });
    const { data: staff = [] } = useQuery({ queryKey: ["rbac_staff"], queryFn: async () => { const r = await api.get("/staff"); return Array.isArray(r.data) ? r.data : []; } });

    const roleDoc = useMemo(() => roleDocs.find((r: any) => r.name === selected), [roleDocs, selected]);
    const effectivePerms = (name: string) => {
        const doc = roleDocs.find((r: any) => r.name === name);
        return (doc?.permissions as string[]) || DEFAULT_ROLE_PERMISSIONS[name] || [];
    };

    useEffect(() => { setPerms(effectivePerms(selected)); /* eslint-disable-next-line */ }, [selected, roleDocs]);

    const isAll = perms.includes("*");
    const has = (c: string) => isAll || perms.includes(c);
    const toggle = (c: string) => setPerms(p => p.includes(c) ? p.filter(x => x !== c) : [...p.filter(x => x !== "*"), c]);
    const toggleAll = () => setPerms(isAll ? [] : ["*"]);
    const toggleGroup = (codes: string[]) => {
        const allOn = codes.every(c => has(c));
        setPerms(p => allOn ? p.filter(x => !codes.includes(x)) : Array.from(new Set([...p.filter(x => x !== "*"), ...codes])));
    };

    const staffWithRole = staff.filter((s: any) => (s.roles || []).includes(selected) || s.designation === selected);

    const save = useMutation({
        mutationFn: async () => {
            if (roleDoc?._id) return api.patch(`/roles/${roleDoc._id}`, { permissions: perms });
            return api.post("/roles", { name: selected, key: slug(selected), permissions: perms });
        },
        onSuccess: () => { toast.success(`Permissions saved for ${selected}`); qc.invalidateQueries({ queryKey: ["rbac_roles"] }); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });

    const assign = useMutation({
        mutationFn: async (sid: string) => { const s = staff.find((x: any) => x._id === sid); const roles = Array.from(new Set([...(s?.roles || []), selected])); return api.patch(`/staff/${sid}`, { roles }); },
        onSuccess: () => { toast.success("Staff assigned"); setAddStaffId(""); qc.invalidateQueries({ queryKey: ["rbac_staff"] }); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });
    const unassign = useMutation({
        mutationFn: async (sid: string) => { const s = staff.find((x: any) => x._id === sid); const roles = (s?.roles || []).filter((r: string) => r !== selected); return api.patch(`/staff/${sid}`, { roles }); },
        onSuccess: () => { toast.success("Removed"); qc.invalidateQueries({ queryKey: ["rbac_staff"] }); },
    });

    const clone = useMutation({
        mutationFn: async () => { const name = prompt("Name for the cloned role:", `${selected} (Copy)`); if (!name) throw new Error("cancelled"); return api.post("/roles", { name, key: slug(name), permissions: perms }); },
        onSuccess: () => { toast.success("Role cloned"); qc.invalidateQueries({ queryKey: ["rbac_roles"] }); },
        onError: (e: any) => { if (e.message !== "cancelled") toast.error("Failed"); },
    });

    return (
        <div className="flex-1 bg-[#f8fafc] min-h-screen p-6">
            <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 bg-indigo-50 rounded-2xl flex items-center justify-center"><Shield className="w-5 h-5 text-indigo-600" /></div>
                <div><h1 className="text-xl font-black text-slate-800">Role Management</h1><p className="text-xs text-slate-500">Assign permissions to roles and staff to roles — the staff portal adapts automatically</p></div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Roles list */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 h-fit max-h-[80vh] overflow-y-auto">
                    {MIS_ROLE_GROUPS.map(g => (
                        <div key={g.group} className="mb-3">
                            <p className="text-[10px] font-black uppercase tracking-wide text-slate-400 mb-1">{g.group}</p>
                            {g.roles.map(r => {
                                const count = staff.filter((s: any) => (s.roles || []).includes(r) || s.designation === r).length;
                                return (
                                    <button key={r} onClick={() => setSelected(r)} className={`w-full text-left px-3 py-2 rounded-lg mb-1 text-sm font-semibold flex items-center justify-between ${selected === r ? "bg-[#5C67F2] text-white" : "text-slate-600 hover:bg-slate-50"}`}>
                                        {r}{count > 0 && <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${selected === r ? "bg-white/25" : "bg-slate-100 text-slate-500"}`}>{count}</span>}
                                    </button>
                                );
                            })}
                        </div>
                    ))}
                </div>

                {/* Role detail */}
                <div className="lg:col-span-2 space-y-5">
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="font-black text-slate-800 text-lg">{selected}</h2>
                                <p className="text-xs text-slate-400">{staffWithRole.length} staff · {isAll ? "Full access" : `${perms.length} permission${perms.length !== 1 ? "s" : ""}`}</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => clone.mutate()} className="inline-flex items-center gap-1.5 text-xs font-bold border border-slate-200 text-slate-600 px-3 py-2 rounded-lg hover:bg-slate-50"><Copy className="w-3.5 h-3.5" /> Clone</button>
                                <button onClick={() => save.mutate()} disabled={save.isPending} className="inline-flex items-center gap-1.5 text-xs font-bold bg-[#5C67F2] text-white px-4 py-2 rounded-lg disabled:opacity-50">{save.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save</button>
                            </div>
                        </div>

                        <button onClick={toggleAll} className={`w-full mb-4 flex items-center justify-between px-4 py-2.5 rounded-xl border ${isAll ? "border-emerald-300 bg-emerald-50" : "border-slate-200"}`}>
                            <span className="flex items-center gap-2 text-sm font-bold text-slate-700"><Crown className="w-4 h-4 text-amber-500" /> Full access (all permissions)</span>
                            <span className={`w-10 h-5 rounded-full relative ${isAll ? "bg-emerald-500" : "bg-slate-300"}`}><span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${isAll ? "left-5" : "left-0.5"}`} /></span>
                        </button>

                        <div className={`space-y-4 ${isAll ? "opacity-40 pointer-events-none" : ""}`}>
                            {PERMISSION_GROUPS.map(g => {
                                const codes = g.perms.map(p => p.code);
                                const allOn = codes.every(c => has(c));
                                return (
                                    <div key={g.group} className="border border-slate-100 rounded-xl p-3">
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="text-xs font-black text-slate-600 uppercase">{g.group}</p>
                                            <button onClick={() => toggleGroup(codes)} className="text-[10px] font-bold text-[#5C67F2]">{allOn ? "Clear" : "Select all"}</button>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {g.perms.map(p => (
                                                <button key={p.code} onClick={() => toggle(p.code)} className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${has(p.code) ? "bg-[#5C67F2] text-white border-[#5C67F2]" : "bg-white text-slate-600 border-slate-200 hover:border-[#5C67F2]"}`}>
                                                    {has(p.code) && <Check className="w-3 h-3" />} {p.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Assigned staff */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                        <p className="text-xs font-black text-slate-500 uppercase mb-3 flex items-center gap-1.5"><Users className="w-4 h-4" /> Staff with this role</p>
                        <div className="flex gap-2 mb-3">
                            <select value={addStaffId} onChange={e => setAddStaffId(e.target.value)} className="flex-1 h-9 px-3 border border-slate-200 rounded-lg text-sm bg-white">
                                <option value="">— Select staff to assign —</option>
                                {staff.filter((s: any) => !((s.roles || []).includes(selected) || s.designation === selected)).map((s: any) => <option key={s._id} value={s._id}>{s.employeeName} {s.designation ? `(${s.designation})` : ""}</option>)}
                            </select>
                            <button onClick={() => addStaffId && assign.mutate(addStaffId)} disabled={!addStaffId || assign.isPending} className="inline-flex items-center gap-1 bg-[#159a52] text-white text-xs font-bold px-4 rounded-lg disabled:opacity-50"><UserPlus className="w-3.5 h-3.5" /> Assign</button>
                        </div>
                        {staffWithRole.length === 0 ? <p className="text-sm text-slate-400 text-center py-4">No staff assigned to this role.</p> : (
                            <div className="space-y-1">
                                {staffWithRole.map((s: any) => (
                                    <div key={s._id} className="flex items-center justify-between border-b border-slate-50 py-2">
                                        <div><p className="text-sm font-bold text-slate-700">{s.employeeName}</p><p className="text-xs text-slate-400">{(s.roles || [s.designation]).filter(Boolean).join(", ")}</p></div>
                                        <button onClick={() => unassign.mutate(s._id)} className="text-slate-400 hover:text-rose-500"><X className="w-4 h-4" /></button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
