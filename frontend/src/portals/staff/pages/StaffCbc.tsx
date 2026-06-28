import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2, Save, Plus, BookOpen, ClipboardCheck } from "lucide-react";
import { toast } from "sonner";
import { PageTitle, PanelCard } from "../../PortalShell";
import type { StaffCtx } from "../StaffLayout";

const LEVELS = [
    { code: "EE", label: "Exceeding" },
    { code: "ME", label: "Meeting" },
    { code: "AE", label: "Approaching" },
    { code: "BE", label: "Below" },
];

// CBC Assessment in the teacher portal — scoped to the teacher's own classes.
// Create activities, then record achievement level (and optional numeric marks)
// per learner. Records flow into the same CBC data the report cards read.
export default function StaffCbc() {
    const { api } = useOutletContext<StaffCtx>();

    // The teacher's allowed classes + learning areas.
    const { data: scope } = useQuery({ queryKey: ["cbc_scope"], queryFn: async () => (await api.get("/staff-portal/cbc/scope")).data, retry: false });
    const classes: any[] = scope?.classes || [];
    const allAreas: string[] = scope?.allLearningAreas || [];

    const [className, setClassName] = useState("");
    const cls = classes.find((c: any) => c.className === className);
    // Learning areas this teacher may use for the class (their assigned areas, else all).
    const areasForClass = (cls?.learningAreas?.length ? cls.learningAreas : allAreas) as string[];

    // Activities (own classes) + the one being recorded.
    const { data: activities = [], refetch: refetchActs } = useQuery({ queryKey: ["cbc_activities"], queryFn: async () => (await api.get("/staff-portal/cbc/activities")).data, retry: false });
    const myActs = activities.filter((a: any) => !className || a.grade === className || a.class === className);
    const [activityId, setActivityId] = useState("");
    const activity = activities.find((a: any) => String(a._id) === activityId);

    // New activity form.
    const [showNew, setShowNew] = useState(false);
    const [na, setNa] = useState({ title: "", learningArea: "", strand: "", assessmentType: "Observation", maxMarks: "" });
    const createAct = useMutation({
        mutationFn: async () => (await api.post("/staff-portal/cbc/activities", { ...na, grade: className, maxMarks: Number(na.maxMarks) || 0 })).data,
        onSuccess: () => { toast.success("Activity created"); setShowNew(false); setNa({ title: "", learningArea: "", strand: "", assessmentType: "Observation", maxMarks: "" }); refetchActs(); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Could not create"),
    });

    // Roster for the chosen class + activity (with any existing records).
    const { data: roster, isFetching } = useQuery({
        queryKey: ["cbc_roster", className, activityId],
        queryFn: async () => (await api.get(`/staff-portal/cbc/roster?className=${encodeURIComponent(className)}&activityId=${activityId}`)).data,
        enabled: !!className,
        retry: false,
    });
    const [rows, setRows] = useState<any[]>([]);
    useEffect(() => { if (roster) setRows(roster.map((r: any) => ({ ...r }))); }, [roster]);

    const setRow = (i: number, patch: any) => setRows(rs => rs.map((r, j) => j === i ? { ...r, ...patch } : r));
    const hasMarks = (activity?.maxMarks || 0) > 0;

    const save = useMutation({
        mutationFn: async () => (await api.post("/staff-portal/cbc/assess", {
            className, activityId,
            learningArea: activity?.learningArea, strand: activity?.strand,
            term: activity?.term, year: activity?.year, maxMarks: activity?.maxMarks || 0,
            records: rows.filter(r => r.level || (r.marks !== "" && r.marks != null)).map(r => ({ studentId: r.studentId, level: r.level || "", marks: r.marks === "" ? null : r.marks })),
        })).data,
        onSuccess: (d: any) => toast.success(`Saved ${d.saved} assessment(s)`),
        onError: (e: any) => toast.error(e.response?.data?.message || "Could not save"),
    });

    return (
        <div>
            <PageTitle title="CBC Assessment" />

            <PanelCard title="Record Assessment">
                <div className="grid sm:grid-cols-3 gap-3 mb-4">
                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase">Class</label>
                        <select value={className} onChange={e => { setClassName(e.target.value); setActivityId(""); }} className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm bg-white">
                            <option value="">— Select Class —</option>
                            {classes.map((c: any) => <option key={c.className} value={c.className}>{c.className}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase">Activity</label>
                        <select value={activityId} onChange={e => setActivityId(e.target.value)} disabled={!className} className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm bg-white disabled:bg-slate-50">
                            <option value="">— Select Activity —</option>
                            {myActs.map((a: any) => <option key={a._id} value={a._id}>{a.title} · {a.learningArea}</option>)}
                        </select>
                    </div>
                    <div className="flex items-end">
                        <button onClick={() => setShowNew(s => !s)} disabled={!className} className="h-11 px-4 rounded-xl border border-[#159a52] text-[#159a52] font-bold text-sm flex items-center gap-1.5 disabled:opacity-40"><Plus className="w-4 h-4" /> New Activity</button>
                    </div>
                </div>

                {showNew && (
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 mb-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        <input value={na.title} onChange={e => setNa({ ...na, title: e.target.value })} placeholder="Activity title" className="h-10 px-3 rounded-lg border border-slate-200 text-sm" />
                        <select value={na.learningArea} onChange={e => setNa({ ...na, learningArea: e.target.value })} className="h-10 px-3 rounded-lg border border-slate-200 text-sm bg-white">
                            <option value="">— Learning Area —</option>
                            {areasForClass.map((a: string) => <option key={a} value={a}>{a}</option>)}
                        </select>
                        <input value={na.strand} onChange={e => setNa({ ...na, strand: e.target.value })} placeholder="Strand (optional)" className="h-10 px-3 rounded-lg border border-slate-200 text-sm" />
                        <select value={na.assessmentType} onChange={e => setNa({ ...na, assessmentType: e.target.value })} className="h-10 px-3 rounded-lg border border-slate-200 text-sm bg-white">
                            {["Observation", "Practical Activity", "Oral Assessment", "Project", "Portfolio", "Written Exercise", "Quiz", "Group Work", "Presentation", "Experiment"].map(t => <option key={t}>{t}</option>)}
                        </select>
                        <input value={na.maxMarks} onChange={e => setNa({ ...na, maxMarks: e.target.value })} type="number" placeholder="Max marks (0 = level only)" className="h-10 px-3 rounded-lg border border-slate-200 text-sm" />
                        <button onClick={() => na.title && na.learningArea ? createAct.mutate() : toast.error("Title + learning area required")} disabled={createAct.isPending} className="h-10 px-4 rounded-lg bg-[#159a52] text-white font-bold text-sm flex items-center justify-center gap-1.5 disabled:opacity-50">
                            {createAct.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Create
                        </button>
                    </div>
                )}

                {!className ? (
                    <div className="py-12 text-center text-slate-400"><BookOpen className="w-8 h-8 mx-auto mb-2" /><p className="text-sm font-bold">Select one of your classes to begin.</p></div>
                ) : isFetching ? (
                    <div className="py-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-[#159a52]" /></div>
                ) : (
                    <>
                        <div className="overflow-x-auto border border-slate-100 rounded-xl">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase">
                                    <tr><th className="text-left px-4 py-2.5">Learner</th><th className="text-left px-4 py-2.5">Adm</th>{hasMarks && <th className="px-4 py-2.5">Marks /{activity?.maxMarks}</th>}<th className="px-4 py-2.5">Level</th></tr>
                                </thead>
                                <tbody>
                                    {rows.length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400 text-sm">No learners in this class.</td></tr>}
                                    {rows.map((r, i) => (
                                        <tr key={r.studentId} className="border-t border-slate-50">
                                            <td className="px-4 py-2 font-bold text-slate-700">{r.name}</td>
                                            <td className="px-4 py-2 text-slate-400 text-xs">{r.admNo}</td>
                                            {hasMarks && <td className="px-4 py-2 text-center"><input value={r.marks ?? ""} onChange={e => setRow(i, { marks: e.target.value })} type="number" min={0} max={activity?.maxMarks} className="w-20 h-9 px-2 rounded-lg border border-slate-200 text-sm text-center" /></td>}
                                            <td className="px-4 py-2">
                                                <div className="flex gap-1 justify-center">
                                                    {LEVELS.map(l => (
                                                        <button key={l.code} onClick={() => setRow(i, { level: r.level === l.code ? "" : l.code })} title={l.label} className={`w-9 h-8 rounded-lg text-xs font-black ${r.level === l.code ? "bg-[#159a52] text-white" : "bg-slate-50 text-slate-500 hover:bg-slate-100"}`}>{l.code}</button>
                                                    ))}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="flex justify-end mt-4">
                            <button onClick={() => save.mutate()} disabled={save.isPending || !activityId} className="h-11 px-5 rounded-xl bg-[#159a52] text-white font-bold text-sm flex items-center gap-1.5 disabled:opacity-40">
                                {save.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Assessment
                            </button>
                        </div>
                        {!activityId && <p className="text-[11px] text-amber-500 font-bold mt-2 flex items-center gap-1"><ClipboardCheck className="w-3.5 h-3.5" /> Pick or create an activity to save records against.</p>}
                    </>
                )}
            </PanelCard>
        </div>
    );
}
