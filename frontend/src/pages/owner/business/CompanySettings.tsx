import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { ACCENT, inputClass as inp } from "./bizShared";

// The details printed at the top of every quotation, invoice and contract, and how customers can pay.
export default function CompanySettings() {
    const qc = useQueryClient();
    const { data, isLoading } = useQuery({ queryKey: ["biz_company"], queryFn: async () => (await api.get("/owner/business/settings")).data });
    const [f, setF] = useState<any>(null);
    const [saving, setSaving] = useState(false);
    useEffect(() => { if (data && !f) setF(data); }, [data, f]);
    if (isLoading || !f) return <div className="py-20 flex justify-center"><Loader2 className="w-6 h-6 animate-spin" style={{ color: ACCENT }} /></div>;
    const set = (k: string, v: any) => setF((s: any) => ({ ...s, [k]: v }));
    const field = (k: string, label: string, ph = "") => <div><label className="block text-[11px] font-bold text-slate-500 mb-1">{label}</label><input className={inp} value={f[k] || ""} onChange={e => set(k, e.target.value)} placeholder={ph} /></div>;

    const logo = (file?: File) => {
        if (!file) return;
        if (file.size > 250_000) { toast.error("Use a logo under 250 KB."); return; }
        const r = new FileReader(); r.onload = () => set("logo", String(r.result)); r.readAsDataURL(file);
    };
    const save = async () => {
        setSaving(true);
        try { await api.put("/owner/business/settings", f); qc.invalidateQueries({ queryKey: ["biz_company"] }); qc.invalidateQueries({ queryKey: ["biz_doc"] }); toast.success("Company details saved"); }
        catch (e: any) { toast.error(e.response?.data?.message || "Failed to save"); } finally { setSaving(false); }
    };

    return (
        <div className="max-w-3xl space-y-5">
            <p className="text-sm text-slate-500">These details appear on every quotation, invoice and contract.</p>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
                <h3 className="font-black text-slate-800">Company</h3>
                <div className="flex items-center gap-4">
                    {f.logo ? <img src={f.logo} alt="" className="h-14 w-auto object-contain border border-slate-100 rounded-lg p-1" /> : <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 text-xs">Logo</div>}
                    <label className="h-9 px-3 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 flex items-center gap-1.5 cursor-pointer"><Upload className="w-3.5 h-3.5" /> Upload logo<input type="file" accept="image/*" className="hidden" onChange={e => logo(e.target.files?.[0])} /></label>
                    {f.logo && <button onClick={() => set("logo", "")} className="text-xs text-slate-400 hover:text-red-500">Remove</button>}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {field("companyName", "Company name")}{field("tagline", "Tagline")}
                    {field("address", "Address")}{field("phone", "Phone")}
                    {field("email", "Email")}{field("website", "Website")}
                    {field("kraPin", "KRA PIN")}{field("quoteValidityDays", "Quotation valid for (days)")}
                </div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
                <h3 className="font-black text-slate-800">How customers pay</h3>
                <p className="text-xs text-slate-400 -mt-2">M-PESA online payment uses the platform M-PESA set up under Settings. Bank details below print on invoices as a fallback.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{field("bankName", "Bank")}{field("bankBranch", "Branch")}{field("accountName", "Account name")}{field("accountNo", "Account number")}</div>
                <div><label className="block text-[11px] font-bold text-slate-500 mb-1">Payment instructions</label><textarea rows={3} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" value={f.paymentInstructions || ""} onChange={e => set("paymentInstructions", e.target.value)} placeholder="e.g. Pay via M-PESA Paybill 123456, account = invoice number." /></div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
                <h3 className="font-black text-slate-800">Default wording</h3>
                <div><label className="block text-[11px] font-bold text-slate-500 mb-1">Invoice terms</label><textarea rows={3} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" value={f.invoiceTerms || ""} onChange={e => set("invoiceTerms", e.target.value)} /></div>
                <div><label className="block text-[11px] font-bold text-slate-500 mb-1">Quotation terms</label><textarea rows={3} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" value={f.quoteTerms || ""} onChange={e => set("quoteTerms", e.target.value)} /></div>
                {field("footer", "Footer line")}
            </div>
            <button onClick={save} disabled={saving} className="h-10 px-6 rounded-xl text-white text-sm font-bold disabled:opacity-50" style={{ background: ACCENT }}>{saving ? "Saving…" : "Save company details"}</button>
        </div>
    );
}
