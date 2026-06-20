import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Save, Download } from "lucide-react";
import { toast } from "sonner";
import { nemis, toCSV, downloadFile } from "./nemisApi";

// Blank NEMIS template headers (official field order).
const TEMPLATE_HEADERS = ["ADM_NO", "UPI", "STUDENT_NAME", "BIRTH_CERT_NO", "DOB", "GENDER", "NATIONALITY", "COUNTY", "SUB_COUNTY", "WARD", "GRADE", "CLASS", "ADMISSION_DATE", "PARENT_NAME", "PARENT_PHONE", "GUARDIAN_NAME", "GUARDIAN_PHONE", "DISABILITY", "PHOTO"];

export default function NemisSettings() {
    const { data, isLoading } = useQuery({ queryKey: ["nemis_settings"], queryFn: nemis.getSettings });
    const [form, setForm] = useState<any>({ csvDelimiter: ",", fileNaming: "nemis_{type}_{date}", validateBeforeExport: true });
    const [saving, setSaving] = useState(false);

    useEffect(() => { if (data) setForm({ ...form, ...data }); }, [data]); // eslint-disable-line

    const save = async () => { setSaving(true); try { await nemis.setSettings(form); toast.success("Settings saved"); } catch (e: any) { toast.error(e.response?.data?.message || "Failed"); } finally { setSaving(false); } };

    const downloadTemplate = (kind: "csv" | "xlsx") => {
        if (kind === "csv") { downloadFile(toCSV(TEMPLATE_HEADERS, []), "nemis_blank_template.csv"); }
        else import("xlsx").then(({ utils, writeFile }) => { const ws = utils.aoa_to_sheet([TEMPLATE_HEADERS]); const wb = utils.book_new(); utils.book_append_sheet(wb, ws, "NEMIS"); writeFile(wb, "nemis_blank_template.xlsx"); });
        toast.success("Template downloaded");
    };

    if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-[#0F766E]" /></div>;

    return (
        <div className="max-w-2xl space-y-5">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
                <h3 className="text-sm font-black text-slate-700">Export & Import Settings</h3>
                <div><label className="block text-[11px] font-bold text-slate-600 mb-1">CSV Delimiter</label>
                    <select value={form.csvDelimiter} onChange={e => setForm((f: any) => ({ ...f, csvDelimiter: e.target.value }))} className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm">
                        <option value=",">Comma ( , )</option><option value=";">Semicolon ( ; )</option><option value="\t">Tab</option>
                    </select>
                </div>
                <div><label className="block text-[11px] font-bold text-slate-600 mb-1">Export File Naming</label>
                    <input value={form.fileNaming} onChange={e => setForm((f: any) => ({ ...f, fileNaming: e.target.value }))} className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#0F766E]" />
                    <p className="text-[10px] text-slate-400 mt-1">Use {"{type}"} and {"{date}"} placeholders.</p>
                </div>
                <label className="flex items-center gap-2 text-sm font-bold text-slate-600"><input type="checkbox" checked={!!form.validateBeforeExport} onChange={e => setForm((f: any) => ({ ...f, validateBeforeExport: e.target.checked }))} /> Run validation automatically before export</label>
                <button onClick={save} disabled={saving} className="h-10 px-5 bg-[#0F766E] text-white rounded-xl text-sm font-bold flex items-center gap-2 disabled:opacity-50">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Settings</button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <h3 className="text-sm font-black text-slate-700 mb-1">Blank NEMIS Templates</h3>
                <p className="text-xs text-slate-400 mb-4">Download an empty template with the official NEMIS columns to fill offline.</p>
                <div className="flex gap-2">
                    <button onClick={() => downloadTemplate("csv")} className="h-10 px-4 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 flex items-center gap-2"><Download className="w-4 h-4" /> CSV Template</button>
                    <button onClick={() => downloadTemplate("xlsx")} className="h-10 px-4 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 flex items-center gap-2"><Download className="w-4 h-4" /> Excel Template</button>
                </div>
            </div>
        </div>
    );
}
