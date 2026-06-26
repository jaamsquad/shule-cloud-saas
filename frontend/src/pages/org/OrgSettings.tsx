import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Building2, Save, Upload } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { isOrgUser } from "@/lib/orgContext";

// Organization-level branding/settings (applied across the org's branches).
export default function OrgSettings() {
    const qc = useQueryClient();
    const [form, setForm] = useState<any>({ name: "", branding: { primaryColor: "#5C67F2", logo: "", motto: "" } });

    const { data, isLoading } = useQuery({
        queryKey: ["org_settings"], enabled: isOrgUser(),
        queryFn: async () => (await api.get("/org/settings")).data,
    });
    useEffect(() => { if (data) setForm({ name: data.name || "", branding: { primaryColor: "#5C67F2", logo: "", motto: "", ...(data.branding || {}) } }); }, [data]);

    const save = useMutation({
        mutationFn: async () => (await api.put("/org/settings", { name: form.name, branding: form.branding })).data,
        onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["org_settings"] }); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Save failed"),
    });
    const setB = (k: string, v: string) => setForm((f: any) => ({ ...f, branding: { ...f.branding, [k]: v } }));

    // Read an uploaded image as a base64 data URL (stored as the logo).
    const onPickLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 600 * 1024) { toast.error("Logo is too large (max ~500KB). Use a smaller image."); return; }
        const reader = new FileReader();
        reader.onload = () => setB("logo", String(reader.result || ""));
        reader.readAsDataURL(file);
    };

    if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>;

    return (
        <div className="flex-1 bg-[#F8FAFC] min-h-screen p-6">
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2 mb-5"><Building2 className="w-6 h-6 text-[#5C67F2]" /> Organization Settings</h1>
            <div className="bg-white rounded-2xl border border-slate-100 p-6 max-w-lg space-y-4">
                <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase">Organization Name</label>
                    <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#5C67F2]" />
                </div>
                <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase">Organization Logo</label>
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                            {form.branding.logo
                                ? <img src={form.branding.logo} alt="logo" className="w-full h-full object-contain" />
                                : <span className="text-[10px] text-slate-400 font-bold">No logo</span>}
                        </div>
                        <div className="flex-1">
                            <label className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm cursor-pointer hover:bg-slate-50">
                                <Upload className="w-4 h-4" /> Upload logo
                                <input type="file" accept="image/*" className="hidden" onChange={onPickLogo} />
                            </label>
                            {form.branding.logo && <button onClick={() => setB("logo", "")} className="ml-2 text-xs font-bold text-rose-500">Remove</button>}
                            <p className="text-[10px] text-slate-400 mt-1">PNG/JPG/SVG, up to ~500&nbsp;KB. Or paste a URL below.</p>
                        </div>
                    </div>
                    <input value={form.branding.logo?.startsWith("data:") ? "" : form.branding.logo} onChange={e => setB("logo", e.target.value)} placeholder="https://… (optional)" className="w-full h-10 px-3 mt-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#5C67F2]" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase">Primary Color</label>
                        <input type="color" value={form.branding.primaryColor} onChange={e => setB("primaryColor", e.target.value)} className="w-full h-11 rounded-xl border border-slate-200" />
                    </div>
                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase">Motto</label>
                        <input value={form.branding.motto} onChange={e => setB("motto", e.target.value)} className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#5C67F2]" />
                    </div>
                </div>
                <p className="text-[11px] text-slate-400">Branches keep their own per-school branding too; this is the organization-wide default.</p>
                <button onClick={() => save.mutate()} disabled={save.isPending} className="h-11 px-5 rounded-xl bg-[#5C67F2] text-white font-bold text-sm flex items-center gap-1.5 disabled:opacity-50">
                    {save.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
                </button>
            </div>
        </div>
    );
}
