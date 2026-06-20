import { useState } from "react";
import { Upload, Loader2, Check, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { nemis, toCSV, downloadFile } from "./nemisApi";

// Map common NEMIS headers → canonical keys.
const HEADER_MAP: Record<string, string> = {
    ADM_NO: "admissionNo", "ADMISSION NUMBER": "admissionNo", UPI: "upi", STUDENT_NAME: "studentName",
    BIRTH_CERT_NO: "birthCertNo", DOB: "dob", GENDER: "gender", NATIONALITY: "nationality",
    COUNTY: "county", SUB_COUNTY: "subCounty", WARD: "ward", GRADE: "grade", CLASS: "class",
    PARENT_NAME: "parentName", PARENT_PHONE: "parentPhone", GUARDIAN_NAME: "guardianName",
    GUARDIAN_PHONE: "guardianPhone", DISABILITY: "disability",
};
const norm = (h: string) => HEADER_MAP[h.trim().toUpperCase()] || h.trim();

export default function NemisImport() {
    const [preview, setPreview] = useState<any>(null);
    const [fileName, setFileName] = useState("");
    const [busy, setBusy] = useState(false);

    const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if (!file) return;
        setFileName(file.name); setBusy(true);
        try {
            const buf = await file.arrayBuffer();
            const { read, utils } = await import("xlsx");
            const wb = read(buf, { type: "array" });
            const json: any[] = utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
            const rows = json.map(r => { const o: any = {}; Object.entries(r).forEach(([k, v]) => { o[norm(k)] = v; }); return o; });
            const result = await nemis.importPreview(rows);
            setPreview(result);
            if (result.errors.length) toast.warning(`${result.errors.length} row(s) have errors`);
        } catch (e: any) { toast.error(e.response?.data?.message || "Could not read file"); }
        finally { setBusy(false); }
    };

    const apply = async () => {
        setBusy(true);
        try { const r = await nemis.importApply(preview.updated, fileName); toast.success(`Applied ${r.applied} update(s)`); setPreview(null); }
        catch (e: any) { toast.error(e.response?.data?.message || "Failed"); }
        finally { setBusy(false); }
    };
    const downloadErrors = () => {
        if (!preview?.errors?.length) return;
        const rows = preview.errors.map((e: any) => [JSON.stringify(e.row), e.error]);
        downloadFile(toCSV(["Row", "Error"], rows), "nemis_import_errors.csv");
    };

    const s = preview?.summary;

    return (
        <div className="max-w-4xl space-y-5">
            <label className="block bg-white rounded-2xl border-2 border-dashed border-slate-200 hover:border-[#0F766E] p-10 text-center cursor-pointer">
                <Upload className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="font-bold text-slate-600">Upload a NEMIS CSV or Excel file</p>
                <p className="text-xs text-slate-400 mt-1">Records are previewed before anything is saved</p>
                <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={onFile} />
                {fileName && <p className="text-xs text-[#0F766E] font-bold mt-2">{fileName}</p>}
            </label>

            {busy && <div className="flex items-center gap-2 text-slate-400 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Processing…</div>}

            {preview && (
                <>
                    <div className="grid grid-cols-4 gap-3">
                        {[["Added", s.added, "text-emerald-600"], ["Updated", s.updated, "text-blue-600"], ["Skipped", s.skipped, "text-amber-600"], ["Errors", s.errors, "text-rose-600"]].map(([l, v, c]) => (
                            <div key={l as string} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-center"><div className={`text-2xl font-black ${c}`}>{v as number}</div><div className="text-[11px] text-slate-400 font-bold">{l as string}</div></div>
                        ))}
                    </div>

                    {preview.errors.length > 0 && (
                        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4">
                            <div className="flex items-center justify-between"><p className="text-sm font-bold text-rose-700 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> {preview.errors.length} rows with errors</p><button onClick={downloadErrors} className="text-xs font-black text-rose-600 underline">Download error report</button></div>
                        </div>
                    )}

                    <div className="flex gap-2">
                        <button onClick={apply} disabled={busy || !s.updated} className="h-11 px-6 bg-[#0F766E] text-white rounded-xl text-sm font-bold flex items-center gap-2 disabled:opacity-40">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Apply {s.updated} update(s)</button>
                        <button onClick={() => setPreview(null)} className="h-11 px-5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600">Cancel</button>
                    </div>
                    <p className="text-[11px] text-slate-400">New students ({s.added}) are flagged but not auto-created — add them via the Students module to keep admissions controlled.</p>
                </>
            )}
        </div>
    );
}
