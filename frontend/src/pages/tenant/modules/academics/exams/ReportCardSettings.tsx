import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Settings, Loader2, Check, Home, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

// Report Card Settings — controls what appears on the report card: KCPE fields,
// positions, each optional column (Point/Grade/Pos/Remarks/Initials), and a
// "Change" column (improvement/drop vs the previous exam). Saved server-side and
// consumed by the scholar-sheet endpoint, so every generated card obeys it.
const COLUMN_LABELS: Record<string, string> = {
    point: "Point", grade: "Grade", pos: "Position (per subject)", remarks: "Remarks", initials: "Teacher Initials",
};

export default function ReportCardSettings() {
    const qc = useQueryClient();
    const [s, setS] = useState<any>(null);
    const { data, isLoading } = useQuery({ queryKey: ["rc_settings"], queryFn: async () => (await api.get("/report-card-settings")).data });
    useEffect(() => { if (data && !s) setS(data); }, [data, s]);

    const save = useMutation({
        mutationFn: async (body: any) => (await api.patch("/report-card-settings", body)).data,
        onSuccess: (d) => {
            setS(d);
            qc.invalidateQueries({ queryKey: ["rc_settings"] });
            // Report cards embed these settings in their data — force them to refetch
            // so the change shows immediately instead of using cached card data.
            qc.invalidateQueries({ queryKey: ["scholar_sheet"] });
            toast.success("Report card settings saved");
        },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });

    if (isLoading || !s) return <div className="flex-1 flex items-center justify-center bg-[#f3f4f6] min-h-screen"><Loader2 className="w-6 h-6 animate-spin text-indigo-400" /></div>;

    const setTop = (k: string, v: boolean) => setS({ ...s, [k]: v });
    const setCol = (k: string, v: boolean) => setS({ ...s, columns: { ...s.columns, [k]: v } });

    const Toggle = ({ on, onToggle, label, hint }: { on: boolean; onToggle: () => void; label: string; hint?: string }) => (
        <div className="flex items-center justify-between py-3 border-b border-slate-50">
            <div><p className="text-sm font-bold text-slate-700">{label}</p>{hint && <p className="text-[11px] text-slate-400">{hint}</p>}</div>
            <button onClick={onToggle} className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${on ? "bg-emerald-500" : "bg-slate-300"}`}>
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${on ? "left-6" : "left-0.5"}`} />
            </button>
        </div>
    );

    return (
        <div className="flex-1 bg-[#f3f4f6] min-h-screen flex flex-col pb-10">
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-2 text-sm shadow-sm">
                <Home className="w-4 h-4 text-[#5C67F2]" /><ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                <span className="text-gray-500 font-medium">Exams</span><ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                <span className="font-black text-[#5C67F2]">Report Card Settings</span>
            </div>

            <div className="max-w-2xl mx-auto w-full px-4 sm:px-6 pt-6 space-y-5">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-indigo-50 rounded-2xl flex items-center justify-center"><Settings className="w-5 h-5 text-indigo-600" /></div>
                    <div><h1 className="text-xl font-black text-slate-800">Report Card Settings</h1><p className="text-xs text-slate-500">Control what appears on every report card. Applies to newly generated & viewed cards.</p></div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                    <p className="text-[11px] font-black text-slate-400 uppercase mb-2">General</p>
                    <Toggle on={!!s.showKcpe} onToggle={() => setTop("showKcpe", !s.showKcpe)} label="Show KCPE fields" hint="KCPE marks, rank, mean & value added row" />
                    <Toggle on={!!s.showPositions} onToggle={() => setTop("showPositions", !s.showPositions)} label="Show positions" hint="Class position & level position in the summary row" />
                    <Toggle on={!!s.showChange} onToggle={() => setTop("showChange", !s.showChange)} label='Show "Change" column' hint="Improvement or drop vs the previous exam, per subject" />
                </div>

                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                    <p className="text-[11px] font-black text-slate-400 uppercase mb-2">Subject Table Columns</p>
                    {Object.entries(COLUMN_LABELS).map(([k, label]) => (
                        <Toggle key={k} on={s.columns?.[k] !== false} onToggle={() => setCol(k, s.columns?.[k] === false)} label={label} />
                    ))}
                </div>

                <div className="flex justify-end">
                    <button onClick={() => save.mutate(s)} disabled={save.isPending} className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#5C67F2] hover:bg-[#4a54c4] text-white font-black text-sm rounded-xl disabled:opacity-50">
                        {save.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save Settings
                    </button>
                </div>
            </div>
        </div>
    );
}
