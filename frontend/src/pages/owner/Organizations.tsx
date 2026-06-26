import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Building2, Plus, X, Layers, ExternalLink, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

// Super-Owner: create and manage multi-branch organizations. Each branch is its
// own isolated tenant database; the org groups them.
export default function Organizations() {
    const qc = useQueryClient();
    const [show, setShow] = useState(false);
    const [addBranchFor, setAddBranchFor] = useState<any>(null);

    const { data: orgs = [], isLoading } = useQuery({
        queryKey: ["owner_orgs"],
        queryFn: async () => (await api.get("/owner/organizations")).data,
    });

    const [editOrg, setEditOrg] = useState<any>(null);

    const wrap = useMutation({
        mutationFn: async (tenantId: string) => (await api.post(`/owner/organizations/wrap-tenant/${tenantId}`, {})).data,
        onSuccess: () => { toast.success("Tenant wrapped into an organization"); qc.invalidateQueries({ queryKey: ["owner_orgs"] }); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });

    const del = useMutation({
        mutationFn: async ({ id, force }: { id: string; force?: boolean }) => (await api.delete(`/owner/organizations/${id}${force ? "?force=1" : ""}`)).data,
        onSuccess: (d: any) => { toast.success(d.message || "Deleted"); qc.invalidateQueries({ queryKey: ["owner_orgs"] }); },
        onError: (e: any, vars: any) => {
            const msg = e.response?.data?.message || "Delete failed";
            if (e.response?.status === 409 && confirm(`${msg}\n\nForce-delete anyway? (schools are preserved)`)) del.mutate({ id: vars.id, force: true });
            else toast.error(msg);
        },
    });

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2"><Layers className="w-6 h-6 text-[#5C67F2]" /> Organizations</h1>
                    <p className="text-muted-foreground">School groups with multiple branches. Each branch is a fully isolated school database.</p>
                </div>
                <button onClick={() => setShow(true)} className="h-10 px-4 rounded-xl bg-[#5C67F2] text-white font-bold text-sm flex items-center gap-1.5 shrink-0"><Plus className="w-4 h-4" /> New Organization</button>
            </div>

            {isLoading ? <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div> : orgs.length === 0 ? (
                <div className="border-2 border-dashed border-slate-200 rounded-2xl py-16 text-center text-slate-400">
                    <Layers className="w-10 h-10 mx-auto mb-2" />
                    <p className="font-bold">No organizations yet</p>
                    <p className="text-sm">Create one, or wrap an existing standalone school into a single-branch org.</p>
                </div>
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {orgs.map((o: any) => (
                        <div key={o.id} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div className="w-10 h-10 rounded-xl bg-[#5C67F2]/10 text-[#5C67F2] flex items-center justify-center"><Building2 className="w-5 h-5" /></div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black uppercase text-slate-400">{o.branchCount} branch{o.branchCount === 1 ? "" : "es"}</span>
                                    <button onClick={() => setEditOrg(o)} title="Edit" className="text-slate-300 hover:text-[#5C67F2]"><Pencil className="w-4 h-4" /></button>
                                    <button onClick={() => { if (confirm(`Delete "${o.name}"? Linked schools are preserved.`)) del.mutate({ id: o.id }); }} title="Delete" className="text-slate-300 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            </div>
                            <div className="mt-3 font-black text-slate-800">{o.name}</div>
                            <div className="text-xs text-slate-400">{o.ownerEmail}</div>
                            <div className="mt-3 space-y-1">
                                {o.branches.map((b: any) => (
                                    <div key={b.id} className="flex items-center justify-between text-xs">
                                        <span className="font-semibold text-slate-600">{b.name}</span>
                                        <a href={`https://${b.subdomain}.shulecloud.com`} target="_blank" rel="noreferrer" className="text-[#5C67F2] font-mono inline-flex items-center gap-0.5">{b.subdomain} <ExternalLink className="w-3 h-3" /></a>
                                    </div>
                                ))}
                            </div>
                            <button onClick={() => setAddBranchFor(o)} className="mt-3 w-full h-9 rounded-lg border border-slate-200 text-slate-600 font-bold text-xs flex items-center justify-center gap-1.5"><Plus className="w-3.5 h-3.5" /> Add Branch</button>
                        </div>
                    ))}
                </div>
            )}

            {show && <NewOrgModal onClose={() => setShow(false)} onDone={() => { setShow(false); qc.invalidateQueries({ queryKey: ["owner_orgs"] }); }} />}
            {addBranchFor && <AddBranchModal org={addBranchFor} onClose={() => setAddBranchFor(null)} onDone={() => { setAddBranchFor(null); qc.invalidateQueries({ queryKey: ["owner_orgs"] }); }} />}
            {editOrg && <EditOrgModal org={editOrg} onClose={() => setEditOrg(null)} onDone={() => { setEditOrg(null); qc.invalidateQueries({ queryKey: ["owner_orgs"] }); }} />}
        </div>
    );
}

function NewOrgModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
    const [f, setF] = useState<any>({ name: "", ownerEmail: "", ownerName: "", password: "", branchName: "", subdomain: "" });
    const create = useMutation({
        mutationFn: async () => (await api.post("/owner/organizations", {
            name: f.name, ownerEmail: f.ownerEmail, ownerName: f.ownerName, password: f.password,
            primaryBranch: f.branchName && f.subdomain ? { name: f.branchName, subdomain: f.subdomain } : undefined,
        })).data,
        onSuccess: () => { toast.success("Organization created"); onDone(); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });
    const set = (k: string, v: string) => setF((s: any) => ({ ...s, [k]: v }));
    return (
        <Modal title="New Organization" onClose={onClose} onSubmit={() => create.mutate()} busy={create.isPending} disabled={!f.name || !f.ownerEmail || !f.password}>
            <Field label="Organization Name" v={f.name} on={(v) => set("name", v)} ph="e.g. Egerton Education Group" />
            <div className="grid grid-cols-2 gap-3">
                <Field label="Owner Name" v={f.ownerName} on={(v) => set("ownerName", v)} ph="Owner full name" />
                <Field label="Owner Email" v={f.ownerEmail} on={(v) => set("ownerEmail", v)} ph="owner@school.com" />
            </div>
            <Field label="Owner Password" v={f.password} on={(v) => set("password", v)} ph="Temporary password" />
            <div className="pt-2 border-t border-slate-100"><p className="text-[11px] font-bold text-slate-400 uppercase mb-2">Primary Branch (optional)</p>
                <div className="grid grid-cols-2 gap-3">
                    <Field label="Branch Name" v={f.branchName} on={(v) => set("branchName", v)} ph="Main Campus" />
                    <Field label="Subdomain" v={f.subdomain} on={(v) => set("subdomain", v.toLowerCase().replace(/[^a-z0-9-]/g, ""))} ph="egerton-main" mono />
                </div>
            </div>
        </Modal>
    );
}

function EditOrgModal({ org, onClose, onDone }: { org: any; onClose: () => void; onDone: () => void }) {
    const [name, setName] = useState(org.name || "");
    const [ownerEmail, setOwnerEmail] = useState(org.ownerEmail || "");
    const save = useMutation({
        mutationFn: async () => (await api.patch(`/owner/organizations/${org.id}`, { name, ownerEmail })).data,
        onSuccess: () => { toast.success("Organization updated"); onDone(); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });
    return (
        <Modal title="Edit Organization" onClose={onClose} onSubmit={() => save.mutate()} busy={save.isPending} disabled={!name}>
            <Field label="Organization Name" v={name} on={setName} />
            <Field label="Owner Email" v={ownerEmail} on={setOwnerEmail} ph="owner@school.com" />
            <p className="text-[11px] text-slate-400">Changing the owner email also updates the org owner's sign-in email.</p>
        </Modal>
    );
}

function AddBranchModal({ org, onClose, onDone }: { org: any; onClose: () => void; onDone: () => void }) {
    const [name, setName] = useState("");
    const [subdomain, setSubdomain] = useState("");
    const add = useMutation({
        mutationFn: async () => (await api.post(`/owner/organizations/${org.id}/branches`, { name, subdomain })).data,
        onSuccess: () => { toast.success("Branch added"); onDone(); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });
    return (
        <Modal title={`Add Branch to ${org.name}`} onClose={onClose} onSubmit={() => add.mutate()} busy={add.isPending} disabled={!name || !subdomain}>
            <Field label="Branch Name" v={name} on={setName} ph="e.g. Town Campus" />
            <Field label="Subdomain" v={subdomain} on={(v) => setSubdomain(v.toLowerCase().replace(/[^a-z0-9-]/g, ""))} ph="egerton-town" mono />
        </Modal>
    );
}

function Modal({ title, children, onClose, onSubmit, busy, disabled }: any) {
    return (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100"><h2 className="font-black text-slate-800">{title}</h2><button onClick={onClose} className="text-slate-400"><X className="w-5 h-5" /></button></div>
                <div className="p-5 space-y-3">{children}</div>
                <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-100">
                    <button onClick={onClose} className="h-10 px-4 rounded-xl border border-slate-200 text-slate-500 font-bold text-sm">Cancel</button>
                    <button onClick={onSubmit} disabled={busy || disabled} className="h-10 px-5 rounded-xl bg-[#5C67F2] text-white font-bold text-sm flex items-center gap-1.5 disabled:opacity-50">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Save</button>
                </div>
            </div>
        </div>
    );
}

function Field({ label, v, on, ph, mono }: { label: string; v: string; on: (v: string) => void; ph?: string; mono?: boolean }) {
    return (
        <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase">{label}</label>
            <input value={v} onChange={(e) => on(e.target.value)} placeholder={ph} className={`w-full h-11 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#5C67F2] ${mono ? "font-mono" : ""}`} />
        </div>
    );
}
