import { useState } from "react";
import { Home, Plus, Check, X, Loader2, Layers, ChevronRight, Users } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";

const emptyClass = { name: "", code: "", level: "1", curriculumType: "844", capacity: "40" };
const emptyStream = { classId: "", name: "", capacity: "40", classTeacherId: "" };

export default function ClassesStreamsPage() {
    const qc = useQueryClient();
    const [showClassModal, setShowClassModal] = useState(false);
    const [showStreamModal, setShowStreamModal] = useState(false);
    const [classForm, setClassForm] = useState(emptyClass);
    const [streamForm, setStreamForm] = useState(emptyStream);
    const [editClassId, setEditClassId] = useState<string | null>(null);
    const [editStreamId, setEditStreamId] = useState<string | null>(null);
    const [selectedClass, setSelectedClass] = useState<any>(null);
    const [confirmDelete, setConfirmDelete] = useState<{ id: string; type: "class" | "stream" } | null>(null);

    const { data: classes = [], isLoading: loadC } = useQuery({ queryKey: ["v2_classes"], queryFn: async () => { const r = await api.get("/v2/classes"); return Array.isArray(r.data) ? r.data : []; } });
    const { data: streams = [] } = useQuery({ queryKey: ["v2_streams", selectedClass?._id], queryFn: async () => { if (!selectedClass) return []; const r = await api.get(`/v2/streams?classId=${selectedClass._id}`); return Array.isArray(r.data) ? r.data : []; }, enabled: !!selectedClass });
    const { data: staff = [] } = useQuery({ queryKey: ["staff"], queryFn: async () => { const r = await api.get("/staff"); return Array.isArray(r.data) ? r.data : []; } });
    // Curriculum options come from the backend registry (active curricula only), so
    // disabling a curriculum in settings removes it from the picker — no hardcoding.
    const { data: curricula = [] } = useQuery({ queryKey: ["curricula_active"], queryFn: async () => { const r = await api.get("/curricula/active"); return Array.isArray(r.data) ? r.data : []; } });

    const classMut = useMutation({
        mutationFn: (p: any) => editClassId ? api.patch(`/v2/classes/${editClassId}`, p) : api.post("/v2/classes", p),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["v2_classes"] }); toast.success(editClassId ? "Class updated" : "Class created"); setShowClassModal(false); setClassForm(emptyClass); setEditClassId(null); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });

    const streamMut = useMutation({
        mutationFn: (p: any) => editStreamId ? api.patch(`/v2/streams/${editStreamId}`, p) : api.post("/v2/streams", p),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["v2_streams"] }); toast.success(editStreamId ? "Stream updated" : "Stream created"); setShowStreamModal(false); setStreamForm(emptyStream); setEditStreamId(null); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });

    // Purge leftover student_enrollments records (the old enrollment feature).
    // who may change classes: administrators, principal / head teacher (the server enforces it too)
    const { data: access } = useQuery<{ canEdit: boolean }>({ queryKey: ["v2_structure_access"], queryFn: async () => (await api.get("/v2/structure/access")).data });
    const canEdit = access?.canEdit === true;

    const delMut = useMutation({
        mutationFn: ({ id, type }: { id: string; type: "class" | "stream" }) =>
            type === "class" ? api.delete(`/v2/classes/${id}`) : api.delete(`/v2/streams/${id}`),
        onSuccess: (_, { type }) => { qc.invalidateQueries({ queryKey: [type === "class" ? "v2_classes" : "v2_streams"] }); toast.success("Deleted"); setConfirmDelete(null); },
    });

    const classStreams = streams;

    return (
        <div className="flex-1 bg-[#F8FAFC] min-h-screen flex flex-col pb-20 font-sans">
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-2 text-sm">
                    <Home className="w-4 h-4 text-[#5C67F2]" /><span className="text-gray-300">/</span>
                    <span className="font-bold text-gray-600">Academic System</span><span className="text-gray-300">/</span>
                    <span className="font-semibold text-[#5C67F2]">Classes & Streams</span>
                </div>
                <div className="flex items-center gap-2">
                    {canEdit && (
                    <button onClick={() => { setEditClassId(null); setClassForm(emptyClass); setShowClassModal(true); }} className="h-10 px-5 bg-[#5C67F2] hover:bg-indigo-600 text-white font-medium text-sm rounded-xl flex items-center gap-2 shadow-md shadow-indigo-100">
                        <Plus className="w-4 h-4" /> New Class
                    </button>
                    )}
                </div>
            </div>

            <div className="flex-1 max-w-6xl mx-auto w-full px-6 pt-8">
                <div className="mb-6">
                    <h1 className="text-2xl font-semibold text-slate-900 flex items-center gap-3"><Layers className="w-7 h-7 text-[#5C67F2]" />Classes & Streams</h1>
                    <p className="text-slate-500 text-sm mt-1">
                        Classes (Grade 1, Form 2) → Streams (East, North, Red). A stream MUST belong to a class.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Classes */}
                    <div>
                        <h3 className="text-sm font-medium text-slate-500 mb-3">Classes ({classes.length})</h3>
                        {loadC ? <div className="flex items-center justify-center h-32 gap-2 text-slate-400 text-xs font-bold uppercase"><Loader2 className="w-4 h-4 animate-spin text-[#5C67F2]" />Loading...</div>
                        : classes.length === 0 ? <div className="bg-white rounded-xl border border-dashed border-slate-200 h-32 flex flex-col items-center justify-center gap-2 text-slate-400 text-sm"><Layers className="w-8 h-8" />No classes yet</div>
                        : [...classes].sort((a: any, b: any) => a.level - b.level).map((c: any) => {
                            const streamCount = classes.reduce((s: number, _: any) => s, 0); // placeholder
                            return (
                                <div key={c._id} onClick={() => setSelectedClass(c === selectedClass ? null : c)}
                                    className={`bg-white rounded-xl border p-4 mb-3 cursor-pointer transition-all hover:border-slate-300 ${selectedClass?._id === c._id ? "border-indigo-400 bg-indigo-50/40" : "border-slate-100 hover:border-slate-200"}`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-11 h-11 rounded-lg bg-indigo-50 flex items-center justify-center font-semibold text-indigo-600 text-sm">{c.level}</div>
                                            <div>
                                                <p className="font-semibold text-slate-800">{c.name}</p>
                                                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                    {c.code && <span className="text-[11px] text-slate-400">{c.code}</span>}
                                                    {/* Curriculum badge — driven by the backend-resolved config */}
                                                    <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded-full ${c.curriculumCode === "CBC" ? "bg-emerald-100 text-emerald-700" : c.curriculumCode === "Cambridge" ? "bg-violet-100 text-violet-700" : "bg-blue-100 text-blue-700"}`}>{c.curriculum?.name || c.curriculumType}</span>
                                                    {c.curriculum?.terminology && <span className="text-[11px] text-slate-400">{c.curriculum.terminology.subjectPlural}</span>}
                                                    <span className="text-[11px] text-slate-400">Cap: {c.capacity}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {canEdit && (<>
                                            <button onClick={e => { e.stopPropagation(); setEditClassId(c._id); setClassForm({ name: c.name, code: c.code || "", level: String(c.level), curriculumType: c.curriculumType || "844", capacity: String(c.capacity) }); setShowClassModal(true); }} className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-amber-50 text-slate-400 hover:text-amber-500 flex items-center justify-center border border-slate-100">✎</button>
                                            {confirmDelete?.id === c._id ? (
                                                <><button onClick={e => { e.stopPropagation(); delMut.mutate({ id: c._id, type: "class" }); }} className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center"><Check className="w-3.5 h-3.5" /></button>
                                                <button onClick={e => { e.stopPropagation(); setConfirmDelete(null); }} className="w-8 h-8 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center"><X className="w-3.5 h-3.5" /></button></>
                                            ) : <button onClick={e => { e.stopPropagation(); setConfirmDelete({ id: c._id, type: "class" }); }} className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-500 flex items-center justify-center border border-slate-100"><X className="w-3.5 h-3.5" /></button>}
                                            </>)}
                                            <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${selectedClass?._id === c._id ? "rotate-90" : ""}`} />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Streams */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-medium text-slate-500">
                                {selectedClass ? `Streams in ${selectedClass.name} (${classStreams.length})` : "Select a class to see streams"}
                            </h3>
                            {selectedClass && canEdit && (
                                <button onClick={() => { setEditStreamId(null); setStreamForm({ ...emptyStream, classId: selectedClass._id }); setShowStreamModal(true); }} className="h-8 px-4 bg-indigo-50 hover:bg-indigo-100 text-[#5C67F2] border border-indigo-100 font-black text-[9px] uppercase rounded-xl flex items-center gap-1">
                                    <Plus className="w-3 h-3" /> Add Stream
                                </button>
                            )}
                        </div>
                        {!selectedClass ? (
                            <div className="bg-white rounded-xl border border-dashed border-slate-200 h-32 flex flex-col items-center justify-center gap-2 text-slate-400 text-sm"><Users className="w-8 h-8" />Click a class to see its streams</div>
                        ) : classStreams.length === 0 ? (
                            <div className="bg-white rounded-xl border border-dashed border-slate-200 h-32 flex flex-col items-center justify-center gap-2 text-slate-400 text-sm"><Users className="w-8 h-8" />No streams — click Add Stream</div>
                        ) : classStreams.map((s: any) => (
                            <div key={s._id} className="bg-white rounded-xl border border-slate-200 p-4 mb-3 transition-all">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center font-semibold text-emerald-600 text-sm">{s.name[0]}</div>
                                        <div>
                                            <p className="font-semibold text-slate-800">{s.fullName || `${selectedClass?.name} ${s.name}`}</p>
                                            <p className="text-xs text-slate-400">Capacity: {s.capacity} {s.classTeacherId ? "· Teacher assigned" : "· No class teacher"}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {canEdit && (<>
                                        <button onClick={() => { setEditStreamId(s._id); setStreamForm({ classId: s.classId, name: s.name, capacity: String(s.capacity), classTeacherId: s.classTeacherId || "" }); setShowStreamModal(true); }} className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-amber-50 text-slate-400 hover:text-amber-500 flex items-center justify-center border border-slate-100">✎</button>
                                        {confirmDelete?.id === s._id ? (
                                            <><button onClick={() => delMut.mutate({ id: s._id, type: "stream" })} className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center"><Check className="w-3.5 h-3.5" /></button>
                                            <button onClick={() => setConfirmDelete(null)} className="w-8 h-8 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center"><X className="w-3.5 h-3.5" /></button></>
                                        ) : <button onClick={() => setConfirmDelete({ id: s._id, type: "stream" })} className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-500 flex items-center justify-center border border-slate-100"><X className="w-3.5 h-3.5" /></button>}
                                        </>)}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Class Modal */}
            {showClassModal && (
                <div className="fixed inset-0 bg-slate-900/40 z-[100] flex items-center justify-center p-4">
                    <div className="bg-white max-w-md w-full rounded-2xl border border-slate-200 shadow-xl relative">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6"><h3 className="text-base font-semibold text-slate-900">{editClassId ? "Edit" : "New"} Class</h3><button onClick={() => setShowClassModal(false)} className="text-slate-400 hover:text-rose-500"><X className="w-5 h-5" /></button></div>
                            <div className="grid grid-cols-2 gap-5">
                                {[{ label: "Class Name*", field: "name", col: 2 }, { label: "Code (e.g. GR1)", field: "code" }, { label: "Level (1=lowest)", field: "level", type: "number" }, { label: "Capacity", field: "capacity", type: "number" }].map((f: any) => (
                                    <div key={f.field} className={`relative ${f.col === 2 ? "col-span-2" : ""}`}>
                                        <label className="block text-xs font-medium text-slate-500 mb-1.5">{f.label}</label>
                                        <input type={f.type || "text"} value={(classForm as any)[f.field]} onChange={e => setClassForm({ ...classForm, [f.field]: e.target.value })} className="w-full h-11 px-4 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700" />
                                    </div>
                                ))}
                                <div className="relative col-span-2">
                                    <label className="block text-xs font-medium text-slate-500 mb-1.5">Curriculum Type</label>
                                    <select value={classForm.curriculumType} onChange={e => setClassForm({ ...classForm, curriculumType: e.target.value })} className="w-full h-11 px-4 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700">
                                        {curricula.length === 0
                                            ? <><option value="844">8-4-4</option><option value="CBC">CBC (Competency-Based)</option></>
                                            : curricula.map((c: any) => <option key={c.code} value={c.code}>{c.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button onClick={() => setShowClassModal(false)} className="px-6 py-2.5 hover:bg-slate-100 text-slate-500 text-sm font-medium rounded-xl">Cancel</button>
                                <button onClick={() => { if (!classForm.name) { toast.error("Class name required"); return; } classMut.mutate({ ...classForm, level: Number(classForm.level), capacity: Number(classForm.capacity) }); }} disabled={classMut.isPending} className="px-6 py-2.5 bg-[#5C67F2] hover:bg-indigo-600 text-white text-sm font-medium rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-100">
                                    {classMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}{editClassId ? "Save" : "Create Class"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Stream Modal */}
            {showStreamModal && (
                <div className="fixed inset-0 bg-slate-900/40 z-[100] flex items-center justify-center p-4">
                    <div className="bg-white max-w-md w-full rounded-2xl border border-slate-200 shadow-xl relative">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6"><h3 className="text-base font-semibold text-slate-900">{editStreamId ? "Edit" : "Add"} Stream</h3><button onClick={() => setShowStreamModal(false)} className="text-slate-400 hover:text-rose-500"><X className="w-5 h-5" /></button></div>
                            <div className="space-y-5">
                                <div className="bg-indigo-50 border border-indigo-100 rounded-2xl px-4 py-3 text-xs text-indigo-600">
                                    Adding stream to: <strong>{selectedClass?.name || "—"}</strong>. Full name will be: <strong>{selectedClass?.name} {streamForm.name || "[Stream Name]"}</strong>
                                </div>
                                {[{ label: "Stream Name* (e.g. East, North, Red)", field: "name" }, { label: "Capacity", field: "capacity", type: "number" }].map(f => (
                                    <div key={f.field} className="relative">
                                        <label className="block text-xs font-medium text-slate-500 mb-1.5">{f.label}</label>
                                        <input type={f.type || "text"} value={(streamForm as any)[f.field]} onChange={e => setStreamForm({ ...streamForm, [f.field]: e.target.value })} className="w-full h-11 px-4 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700" />
                                    </div>
                                ))}
                                <div className="relative">
                                    <label className="block text-xs font-medium text-slate-500 mb-1.5">Class Teacher</label>
                                    <select value={streamForm.classTeacherId} onChange={e => setStreamForm({ ...streamForm, classTeacherId: e.target.value })} className="w-full h-11 px-4 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700">
                                        <option value="">— No class teacher —</option>
                                        {staff.map((s: any) => <option key={s._id} value={s._id}>{s.employeeName || s.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button onClick={() => setShowStreamModal(false)} className="px-6 py-2.5 hover:bg-slate-100 text-slate-500 text-sm font-medium rounded-xl">Cancel</button>
                                <button onClick={() => { if (!streamForm.name) { toast.error("Stream name required"); return; } streamMut.mutate({ ...streamForm, classId: streamForm.classId || selectedClass?._id, capacity: Number(streamForm.capacity) }); }} disabled={streamMut.isPending} className="px-6 py-2.5 bg-[#5C67F2] hover:bg-indigo-600 text-white text-sm font-medium rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-100">
                                    {streamMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}{editStreamId ? "Save" : "Add Stream"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
