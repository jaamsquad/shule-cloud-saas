import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { GraduationCap, Loader2, Check, BookOpen, Layers, Award, FileText } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

// Curriculum Settings — admins enable/disable curricula. Everything else in the
// system reads the active set from the backend, so toggling here immediately
// changes which curricula appear in class pickers and how classes behave.
const MODE_LABEL: Record<string, string> = { traditional: "Marks & Grades", competency: "Competencies & Levels" };

// Client-side fallback so the page is never blank if the curriculum API is down.
// Mirrors the backend built-in registry (lib/curriculum.ts).
const BUILTIN_CURRICULA = [
    { code: "844", name: "8-4-4", active: true, assessmentMode: "traditional", terminology: { subjectPlural: "Subjects" }, reportLayout: "844", levelPrefix: "Form", promotion: "class", examTypes: ["CAT", "Mid Term", "End Term", "Mock"] },
    { code: "CBC", name: "CBC (Competency-Based)", active: true, assessmentMode: "competency", terminology: { subjectPlural: "Learning Areas" }, reportLayout: "cbc", levelPrefix: "Grade", promotion: "grade", examTypes: ["Assessment Activity", "Competency Task", "Project", "Practical"] },
    { code: "Cambridge", name: "Cambridge", active: true, assessmentMode: "traditional", terminology: { subjectPlural: "Subjects" }, reportLayout: "cambridge", levelPrefix: "Year", promotion: "class", examTypes: ["Checkpoint", "Progression Test", "IGCSE", "AS/A Level"] },
];

export default function CurriculumSettings() {
    const qc = useQueryClient();
    const [busy, setBusy] = useState<string | null>(null);
    const { data: curricula = [], isLoading } = useQuery({
        queryKey: ["curricula_all"],
        queryFn: async () => {
            try { const r = await api.get("/curricula"); if (Array.isArray(r.data) && r.data.length) return r.data; } catch { /* fall through */ }
            // Fallback to the built-in set so the page is never blank (e.g. before the
            // curriculum service is available). These mirror the backend defaults.
            return BUILTIN_CURRICULA;
        },
    });

    const toggle = useMutation({
        mutationFn: async ({ code, active }: { code: string; active: boolean }) => api.patch(`/curricula/${encodeURIComponent(code)}`, { active }),
        onSuccess: () => { toast.success("Updated"); qc.invalidateQueries({ queryKey: ["curricula_all"] }); qc.invalidateQueries({ queryKey: ["curricula_active"] }); setBusy(null); },
        onError: (e: any) => { toast.error(e.response?.data?.message || "Failed"); setBusy(null); },
    });

    return (
        <div className="flex-1 bg-[#f8fafc] min-h-screen p-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-11 h-11 bg-indigo-50 rounded-2xl flex items-center justify-center"><GraduationCap className="w-5 h-5 text-indigo-600" /></div>
                <div>
                    <h1 className="text-xl font-black text-slate-800">Curriculum Settings</h1>
                    <p className="text-xs text-slate-500">Enable the curricula your school offers. Each class is assigned one; the curriculum drives its terminology, assessments, report cards & timetable.</p>
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-indigo-400" /></div>
            ) : curricula.length === 0 ? (
                <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center text-slate-400 max-w-2xl">
                    <GraduationCap className="w-10 h-10 mx-auto mb-2" />
                    <p className="font-bold text-sm text-slate-600">Couldn't load curricula.</p>
                    <p className="text-xs mt-1">The curriculum service may be unavailable. If you just updated the app, restart the server and reload this page.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 max-w-6xl">
                    {curricula.map((c: any) => (
                        <div key={c.code} className={`bg-white rounded-2xl border-2 shadow-sm p-5 transition-all ${c.active ? "border-emerald-200" : "border-slate-100 opacity-70"}`}>
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <h3 className="font-black text-slate-800 text-lg">{c.name}</h3>
                                    <p className="text-[11px] font-bold text-slate-400 uppercase">{c.code}</p>
                                </div>
                                {/* Toggle */}
                                <button
                                    onClick={() => { setBusy(c.code); toggle.mutate({ code: c.code, active: !c.active }); }}
                                    disabled={busy === c.code}
                                    className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${c.active ? "bg-emerald-500" : "bg-slate-300"}`}>
                                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${c.active ? "left-6" : "left-0.5"}`} />
                                </button>
                            </div>
                            <div className="space-y-2 text-[11px] text-slate-500">
                                <div className="flex items-center gap-2"><Award className="w-3.5 h-3.5 text-indigo-400" /> Assessment: <b className="text-slate-700">{MODE_LABEL[c.assessmentMode] || c.assessmentMode}</b></div>
                                <div className="flex items-center gap-2"><BookOpen className="w-3.5 h-3.5 text-emerald-400" /> Terminology: <b className="text-slate-700">{c.terminology?.subjectPlural}</b></div>
                                <div className="flex items-center gap-2"><FileText className="w-3.5 h-3.5 text-amber-400" /> Report: <b className="text-slate-700 uppercase">{c.reportLayout}</b></div>
                                <div className="flex items-center gap-2"><Layers className="w-3.5 h-3.5 text-violet-400" /> Levels: <b className="text-slate-700">{c.levelPrefix}</b> · Promotion: <b className="text-slate-700">{c.promotion === "grade" ? "Grade-to-grade" : "Class"}</b></div>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-1.5">
                                {(c.examTypes || []).slice(0, 5).map((t: string) => (
                                    <span key={t} className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">{t}</span>
                                ))}
                            </div>
                            <div className="mt-3 pt-3 border-t border-slate-50">
                                <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${c.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                                    {c.active ? <><Check className="w-3 h-3" /> Enabled</> : "Disabled"}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
