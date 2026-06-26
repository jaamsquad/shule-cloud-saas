import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Building2, Plus, X, Star, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { isOrgUser } from "@/lib/orgContext";

// Branch directory + create new branch (each branch = its own isolated database).
export default function OrgBranches() {
    const qc = useQueryClient();
    const [show, setShow] = useState(false);
    const [name, setName] = useState("");
    const [subdomain, setSubdomain] = useState("");

    const { data: branches = [], isLoading } = useQuery({
        queryKey: ["org_branches_manage"],
        enabled: isOrgUser(),
        queryFn: async () => (await api.get("/org/branches")).data,
    });

    const create = useMutation({
        mutationFn: async () => (await api.post("/org/branches", { name: name.trim() })).data,
        onSuccess: () => { toast.success("Branch created"); setShow(false); setName(""); setSubdomain(""); qc.invalidateQueries({ queryKey: ["org_branches_manage"] }); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Could not create branch"),
    });

    return (
        <div className="flex-1 bg-[#F8FAFC] min-h-screen p-6">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2"><Building2 className="w-6 h-6 text-[#5C67F2]" /> Branches</h1>
                <button onClick={() => setShow(true)} className="h-10 px-4 rounded-xl bg-[#5C67F2] text-white font-bold text-sm flex items-center gap-1.5"><Plus className="w-4 h-4" /> New Branch</button>
            </div>

            {isLoading ? <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div> : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {branches.map((b: any) => (
                        <div key={b.id} className="bg-white rounded-2xl border border-slate-100 p-5">
                            <div className="flex items-center justify-between">
                                <div className="w-10 h-10 rounded-xl bg-[#5C67F2]/10 text-[#5C67F2] flex items-center justify-center"><Building2 className="w-5 h-5" /></div>
                                {b.isPrimary && <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-600"><Star className="w-3 h-3" /> PRIMARY</span>}
                            </div>
                            <div className="mt-3 font-black text-slate-800">{b.name}</div>
                            {b.subdomain && (
                                <a href={`https://${b.subdomain}.shulecloud.com`} target="_blank" rel="noreferrer" className="text-xs text-[#5C67F2] font-mono inline-flex items-center gap-1 mt-0.5 hover:underline">
                                    {b.subdomain}.shulecloud.com <ExternalLink className="w-3 h-3" />
                                </a>
                            )}
                            <div className="mt-1 text-[10px] font-bold uppercase text-slate-400">{b.status}</div>
                        </div>
                    ))}
                </div>
            )}

            {show && (
                <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShow(false)}>
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                            <h2 className="font-black text-slate-800">New Branch</h2>
                            <button onClick={() => setShow(false)} className="text-slate-400"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-5 space-y-3">
                            <p className="text-xs text-slate-500">A new branch gets its own isolated database — its students, fees, staff and settings are completely separate. All branches are managed here under your organization; no separate web address needed.</p>
                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase">Branch Name</label>
                                <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Kilimo Town Campus" className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#5C67F2]" />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-100">
                            <button onClick={() => setShow(false)} className="h-10 px-4 rounded-xl border border-slate-200 text-slate-500 font-bold text-sm">Cancel</button>
                            <button onClick={() => create.mutate()} disabled={create.isPending || !name} className="h-10 px-5 rounded-xl bg-[#5C67F2] text-white font-bold text-sm flex items-center gap-1.5 disabled:opacity-50">
                                {create.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Create
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
