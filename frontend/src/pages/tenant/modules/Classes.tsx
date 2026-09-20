import { useState } from "react";
import { Plus, Home, DollarSign, Loader2, Edit2, Trash2, GraduationCap, X, ChevronDown, Save, Users, Layers, LayoutGrid, List } from "lucide-react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";

// ─── Grade + Stream combine modal ────────────────────────────────────────────
const STREAM_SUGGESTIONS = ["East", "West", "North", "South", "Red", "Blue", "Green", "Gold", "A", "B", "C", "D"];

function AddClassModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
    const qc = useQueryClient();
    const [gradeInput, setGradeInput] = useState("");
    const [streamInput, setStreamInput] = useState("");
    const [capacity, setCapacity] = useState("40");
    const [curriculum, setCurriculum] = useState("844");
    const [isSaving, setIsSaving] = useState(false);

    // Fetch existing grades and streams for chip selection
    const { data: existingGrades = [] } = useQuery<any[]>({
        queryKey: ["v2_classes"],
        queryFn: async () => { const r = await api.get("/v2/classes"); return Array.isArray(r.data) ? r.data : []; },
    });
    const { data: existingStreams = [] } = useQuery<any[]>({
        queryKey: ["v2_streams"],
        queryFn: async () => { const r = await api.get("/v2/streams"); return Array.isArray(r.data) ? r.data : []; },
    });

    // Unique stream names used across all v2 streams
    const usedStreamNames = [...new Set(existingStreams.map((s: any) => s.name).filter(Boolean))];

    const gradeVal   = gradeInput.trim();
    const streamVal  = streamInput.trim();
    const previewName = gradeVal && streamVal ? `${gradeVal} ${streamVal}` : "";

    // Check if this exact combination already exists
    const alreadyExists = existingStreams.some((s: any) =>
        (s.fullName || `${s.className} ${s.name}`).toLowerCase() === previewName.toLowerCase()
    );

    const handleCreate = async () => {
        if (!gradeVal) { toast.error("Grade/Level name is required"); return; }
        if (!streamVal) { toast.error("Stream name is required"); return; }
        if (alreadyExists) { toast.error(`${previewName} already exists`); return; }

        setIsSaving(true);
        try {
            // 1. Find or create v2 class (grade)
            let cls = existingGrades.find((c: any) => c.name.toLowerCase() === gradeVal.toLowerCase());
            if (!cls) {
                const res = await api.post("/v2/classes", {
                    name: gradeVal,
                    code: gradeVal.replace(/\s+/g, "").toUpperCase().slice(0, 6),
                    level: Number(gradeVal.replace(/\D/g, "") || 1),
                    curriculumType: curriculum,
                    capacity: Number(capacity),
                });
                cls = res.data;
            }

            // 2. Create stream under that grade
            await api.post("/v2/streams", { classId: cls._id || cls.id, name: streamVal, capacity: Number(capacity) });

            // 3. Mirror to legacy classes collection so all queries that read /academics/classes still work
            await api.post("/academics/classes", { levelName: previewName, capacity: Number(capacity) });

            qc.invalidateQueries({ queryKey: ["classes"] });
            qc.invalidateQueries({ queryKey: ["v2_classes"] });
            qc.invalidateQueries({ queryKey: ["v2_streams"] });
            toast.success(`"${previewName}" created successfully`);
            onSuccess();
        } catch (e: any) {
            toast.error(e.response?.data?.message || "Failed to create class");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 w-full max-w-[520px] relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

                {/* Header */}
                <div className="px-8 pt-8 pb-0">
                    <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-slate-50 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all">
                        <X className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-10 h-10 bg-[#5C67F2] rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                            <Plus className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-slate-800 leading-tight">Create Learning Class</h2>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Grade + Stream → Combined Class</p>
                        </div>
                    </div>
                </div>

                {/* Preview badge */}
                <div className="mx-8 mt-5">
                    <div className={`rounded-2xl px-4 py-3 flex items-center justify-between transition-all ${previewName ? (alreadyExists ? "bg-rose-50 border border-rose-200" : "bg-indigo-50 border border-indigo-200") : "bg-slate-50 border border-slate-100"}`}>
                        <div className="flex items-center gap-2">
                            <GraduationCap className={`w-4 h-4 ${previewName ? (alreadyExists ? "text-rose-500" : "text-[#5C67F2]") : "text-slate-300"}`} />
                            <span className={`text-sm font-black ${previewName ? (alreadyExists ? "text-rose-600" : "text-[#5C67F2]") : "text-slate-300"}`}>
                                {previewName || "Grade + Stream preview"}
                            </span>
                        </div>
                        {previewName && (
                            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${alreadyExists ? "bg-rose-100 text-rose-600" : "bg-[#5C67F2]/10 text-[#5C67F2]"}`}>
                                {alreadyExists ? "Already exists" : "New class"}
                            </span>
                        )}
                    </div>

                    {/* Equation visual */}
                    {(gradeVal || streamVal) && (
                        <div className="flex items-center justify-center gap-2 mt-3 mb-1">
                            <div className={`px-3 py-1.5 rounded-xl text-xs font-black border ${gradeVal ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-slate-50 border-slate-200 text-slate-300"}`}>
                                {gradeVal || "Grade"}
                            </div>
                            <span className="text-slate-400 font-black text-lg">+</span>
                            <div className={`px-3 py-1.5 rounded-xl text-xs font-black border ${streamVal ? "bg-purple-50 border-purple-200 text-purple-700" : "bg-slate-50 border-slate-200 text-slate-300"}`}>
                                {streamVal || "Stream"}
                            </div>
                            <span className="text-slate-400 font-black text-lg">=</span>
                            <div className={`px-3 py-1.5 rounded-xl text-xs font-black border ${previewName && !alreadyExists ? "bg-[#5C67F2] border-[#5C67F2] text-white" : "bg-slate-50 border-slate-200 text-slate-300"}`}>
                                {previewName || "Class"}
                            </div>
                        </div>
                    )}
                </div>

                <div className="px-8 pt-5 pb-8 space-y-6">
                    {/* Step 1: Grade/Level */}
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[9px] font-black">1</div>
                            <p className="text-xs font-black text-slate-700 uppercase tracking-wide">Grade / Level</p>
                        </div>

                        {/* Existing grade chips */}
                        {existingGrades.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-3">
                                {existingGrades.map((g: any) => (
                                    <button key={g._id} type="button"
                                        onClick={() => setGradeInput(g.name)}
                                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black border transition-all ${gradeInput === g.name ? "bg-blue-600 border-blue-600 text-white" : "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"}`}>
                                        {g.name}
                                    </button>
                                ))}
                            </div>
                        )}

                        <input
                            type="text"
                            value={gradeInput}
                            onChange={e => setGradeInput(e.target.value)}
                            placeholder="e.g. Grade 1, Form 2, Class 4, Year 6…"
                            className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-400 text-sm font-bold text-slate-700 placeholder-slate-300"
                        />
                    </div>

                    {/* Step 2: Stream */}
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[9px] font-black">2</div>
                            <p className="text-xs font-black text-slate-700 uppercase tracking-wide">Stream Name</p>
                        </div>

                        {/* Stream suggestion chips — combine used + common suggestions */}
                        <div className="flex flex-wrap gap-2 mb-3">
                            {[...new Set([...usedStreamNames, ...STREAM_SUGGESTIONS])].slice(0, 12).map(s => (
                                <button key={s} type="button"
                                    onClick={() => setStreamInput(s)}
                                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black border transition-all ${streamInput === s ? "bg-purple-600 border-purple-600 text-white" : "bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100"}`}>
                                    {s}
                                </button>
                            ))}
                        </div>

                        <input
                            type="text"
                            value={streamInput}
                            onChange={e => setStreamInput(e.target.value)}
                            placeholder="e.g. East, West, North, Red, A, B…"
                            className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-purple-400 text-sm font-bold text-slate-700 placeholder-slate-300"
                        />
                    </div>

                    {/* Step 3: Options */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="relative">
                            <div className="absolute -top-2.5 left-3 bg-slate-700 text-white text-[8px] px-2 py-0.5 rounded-full font-black z-10 uppercase">Capacity</div>
                            <input type="number" value={capacity} onChange={e => setCapacity(e.target.value)}
                                className="w-full h-10 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700 text-center" />
                        </div>
                        <div className="relative">
                            <div className="absolute -top-2.5 left-3 bg-slate-700 text-white text-[8px] px-2 py-0.5 rounded-full font-black z-10 uppercase">Curriculum</div>
                            <select value={curriculum} onChange={e => setCurriculum(e.target.value)}
                                className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700">
                                <option value="844">8-4-4</option>
                                <option value="CBC">CBC</option>
                                <option value="Cambridge">Cambridge</option>
                                <option value="IGCSE">IGCSE</option>
                            </select>
                        </div>
                    </div>

                    {/* Create button */}
                    <button onClick={handleCreate}
                        disabled={isSaving || !gradeVal || !streamVal || alreadyExists}
                        className="w-full h-12 bg-[#5C67F2] hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-sm uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 transition-all">
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        {previewName ? `Create "${previewName}"` : "Create Class"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Main Classes page ────────────────────────────────────────────────────────
export default function Classes() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [view, setView] = useState<"grid" | "list">("grid");
    const [editingClass, setEditingClass] = useState<any>(null);
    const [editName, setEditName] = useState("");
    const [editTeacherId, setEditTeacherId] = useState("");

    // Old classes
    const { data: legacyClasses = [], isLoading: loadLegacy } = useQuery({
        queryKey: ["classes"],
        queryFn: async () => { const r = await api.get("/academics/classes"); return Array.isArray(r.data) ? r.data : []; },
    });

    // V2 streams (the actual classroom units in the new system)
    const { data: v2Streams = [], isLoading: loadV2 } = useQuery({
        queryKey: ["v2_streams"],
        queryFn: async () => { const r = await api.get("/v2/streams"); return Array.isArray(r.data) ? r.data : []; },
    });

    const { data: students = [] } = useQuery({
        queryKey: ["students"],
        queryFn: async () => { const r = await api.get("/students"); return Array.isArray(r.data) ? r.data : []; },
    });

    const { data: staff = [] } = useQuery({
        queryKey: ["staff"],
        queryFn: async () => { const r = await api.get("/staff"); return Array.isArray(r.data) ? r.data : []; },
    });

    const isLoading = loadLegacy || loadV2;

    // Merge: v2 streams take precedence; legacy classes that aren't already represented get shown too
    const v2Names = new Set(v2Streams.map((s: any) => (s.fullName || "").toLowerCase().trim()));
    const filteredLegacy = legacyClasses.filter((c: any) => !v2Names.has((c.name || c.levelName || "").toLowerCase().trim()));

    // Build unified class list
    const allClasses = [
        ...v2Streams.map((s: any) => ({
            _id: s._id, name: s.fullName || `${s.className} ${s.name}`,
            streamId: s._id, classId: s.classId, isV2: true,
            classTeacherId: s.classTeacherId, capacity: s.capacity,
        })),
        ...filteredLegacy.map((c: any) => ({ _id: c._id, name: c.name || c.levelName, isV2: false, classTeacherId: c.classTeacherId, capacity: c.capacity })),
    ];

    const norm = (v: any) => String(v ?? "").toLowerCase().replace(/\s+/g, " ").trim();
    const getClassStudents = (cls: any) => {
        if (cls.isV2) {
            // V2: students whose streamId matches, or whose class text equals the
            // stream's full name ("Form 4 East").
            return students.filter((s: any) => String(s.streamId) === String(cls.streamId) || norm(s.studentClass || s.currentClass) === norm(cls.name));
        }
        // Legacy: match by class name
        return students.filter((s: any) => s.studentClass === cls.name || s.levelName === cls.name);
    };

    const getGenderStats = (sts: any[]) => {
        const total = sts.length;
        const boys = sts.filter((s: any) => s.gender?.toLowerCase() === "male").length;
        const girls = sts.filter((s: any) => s.gender?.toLowerCase() === "female").length;
        return { total, boys, girls, boysPct: total > 0 ? Math.round((boys / total) * 100) : 0, girlsPct: total > 0 ? Math.round((girls / total) * 100) : 0 };
    };

    const deleteMut = useMutation({
        mutationFn: async (cls: any) => {
            if (cls.isV2) return api.delete(`/v2/streams/${cls._id}`);
            return api.delete(`/academics/classes/${cls._id}`);
        },
        onSuccess: (_, cls) => {
            queryClient.invalidateQueries({ queryKey: [cls.isV2 ? "v2_streams" : "classes"] });
            toast.success("Class removed");
        },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed to remove"),
    });

    const updateMut = useMutation({
        mutationFn: async ({ cls, name, teacherId }: { cls: any; name: string; teacherId: string }) => {
            if (cls.isV2) return api.patch(`/v2/streams/${cls._id}`, { name: name.split(" ").pop() || name, classTeacherId: teacherId || null });
            return api.put(`/academics/classes/${cls._id}`, { levelName: name, classTeacherId: teacherId || null });
        },
        onSuccess: (_, { cls }) => {
            queryClient.invalidateQueries({ queryKey: [cls.isV2 ? "v2_streams" : "classes"] });
            toast.success("Class updated");
            setEditingClass(null);
        },
    });

    const teachers = staff.filter((s: any) => s.designation?.toLowerCase().includes("teacher") || s.role?.toLowerCase().includes("teacher") || s.isTeachingStaff);

    return (
        <div className="flex-1 bg-[#f4f7f6] min-h-screen flex flex-col">
            {/* Header */}
            <div className="bg-white border-b border-gray-100 px-5 py-3 flex items-center justify-between shadow-sm z-10 m-4 rounded-xl">
                <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-800 text-sm">Classes</span>
                    <span className="text-gray-300">|</span>
                    <Home className="w-3.5 h-3.5 text-gray-500" />
                    <span className="text-gray-500 font-medium text-sm">- All Classes</span>
                    <span className="ml-2 px-2.5 py-0.5 bg-indigo-50 text-[#5C67F2] text-[9px] font-black uppercase rounded-full border border-indigo-100">
                        {allClasses.length} total
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="bg-white border border-gray-100 rounded-xl p-0.5 flex shadow-sm">
                        <button onClick={() => setView("grid")} className={`px-2.5 h-8 rounded-lg ${view === "grid" ? "bg-[#5C67F2] text-white" : "text-slate-400"}`}><LayoutGrid className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setView("list")} className={`px-2.5 h-8 rounded-lg ${view === "list" ? "bg-[#5C67F2] text-white" : "text-slate-400"}`}><List className="w-3.5 h-3.5" /></button>
                    </div>
                    <a href="/academic-system/classes" className="h-8 px-4 bg-indigo-50 hover:bg-indigo-100 text-[#5C67F2] border border-indigo-100 font-black text-[9px] uppercase rounded-xl flex items-center gap-1.5 transition-all">
                        <Layers className="w-3.5 h-3.5" /> Manage V2
                    </a>
                    <button onClick={() => navigate("/classes/new")}
                        className="h-8 px-4 bg-[#5C67F2] hover:bg-[#4a54c4] text-white font-black text-[9px] uppercase rounded-xl flex items-center gap-1.5 transition-all shadow-sm">
                        <Plus className="w-3.5 h-3.5" /> New Class
                    </button>
                </div>
            </div>

            <div className="p-6">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <Loader2 className="w-10 h-10 animate-spin text-[#5C67F2]" />
                        <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest">Loading classes...</p>
                    </div>
                ) : view === "list" ? (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wide">
                                    <th className="text-left px-5 py-3 font-black">Class</th>
                                    <th className="text-center px-3 py-3 font-black">Students</th>
                                    <th className="text-center px-3 py-3 font-black">Boys</th>
                                    <th className="text-center px-3 py-3 font-black">Girls</th>
                                    <th className="text-center px-3 py-3 font-black">Capacity</th>
                                    <th className="text-right px-5 py-3 font-black">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {allClasses.length === 0 ? (
                                    <tr><td colSpan={6} className="py-10 text-center text-slate-400">No classes yet.</td></tr>
                                ) : allClasses.map(cls => {
                                    const stats = getGenderStats(getClassStudents(cls));
                                    return (
                                        <tr key={cls._id} className="border-b border-slate-50 hover:bg-slate-50/50">
                                            <td className="px-5 py-3 font-bold text-slate-700 cursor-pointer" onClick={() => navigate(cls.isV2 ? `/classes/room/${(cls as any).streamId}` : `/classes/${cls._id}`)}>{cls.name}{cls.isV2 && <span className="ml-2 text-[8px] font-black text-[#5C67F2] bg-indigo-50 px-1.5 py-0.5 rounded">V2</span>}</td>
                                            <td className="px-3 py-3 text-center font-black text-slate-700">{stats.total}</td>
                                            <td className="px-3 py-3 text-center text-blue-600 font-bold">{stats.boys}</td>
                                            <td className="px-3 py-3 text-center text-pink-600 font-bold">{stats.girls}</td>
                                            <td className="px-3 py-3 text-center text-slate-500">{cls.capacity || "—"}</td>
                                            <td className="px-5 py-3">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button onClick={() => { setEditingClass(cls); setEditName(cls.name); setEditTeacherId(cls.classTeacherId || ""); }} className="w-8 h-8 rounded-lg border border-slate-200 text-slate-500 hover:text-[#5C67F2] flex items-center justify-center"><Edit2 className="w-4 h-4" /></button>
                                                    <button onClick={() => { if (confirm(`Delete ${cls.name}?`)) deleteMut.mutate(cls); }} className="w-8 h-8 rounded-lg border border-slate-200 text-slate-500 hover:text-rose-500 flex items-center justify-center"><Trash2 className="w-4 h-4" /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                        {allClasses.map(cls => {
                            const classStudents = getClassStudents(cls);
                            const stats = getGenderStats(classStudents);
                            return (
                                <div key={cls._id}
                                    className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col hover:shadow-lg transition-all group relative cursor-pointer"
                                    onClick={() => navigate(cls.isV2 ? `/classes/room/${(cls as any).streamId}` : `/classes/${cls._id}`)}>

                                    {/* V2 badge */}
                                    {cls.isV2 && (
                                        <span className="absolute top-3 right-3 px-2 py-0.5 bg-[#5C67F2] text-white text-[7px] font-black uppercase rounded-full opacity-0 group-hover:opacity-100 transition-all">V2</span>
                                    )}

                                    {/* Header */}
                                    <div className="flex items-start justify-between mb-3">
                                        <h3 className="text-base font-black text-slate-800 tracking-tight">{cls.name}</h3>
                                        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all">
                                            <button onClick={e => { e.stopPropagation(); setEditingClass(cls); setEditName(cls.name); setEditTeacherId(cls.classTeacherId || ""); }}
                                                className="p-1.5 bg-slate-50 rounded-lg text-slate-400 hover:text-[#5C67F2] hover:bg-indigo-50 transition-all">
                                                <Edit2 className="w-3.5 h-3.5" />
                                            </button>
                                            <button onClick={e => { e.stopPropagation(); if (confirm(`Delete ${cls.name}?`)) deleteMut.mutate(cls); }}
                                                className="p-1.5 bg-slate-50 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Student count */}
                                    <div className="flex items-center gap-2.5 mb-4">
                                        <span className="text-2xl font-black text-slate-800">{stats.total}</span>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Students</span>
                                        <div className="ml-auto w-8 h-8 bg-[#5C67F2]/10 rounded-lg flex items-center justify-center text-[#5C67F2]">
                                            <GraduationCap className="w-4 h-4" />
                                        </div>
                                    </div>

                                    {/* Gender stats */}
                                    <div className="flex gap-2 mb-3">
                                        <div className="flex-1 bg-blue-50 rounded-xl p-2.5 text-center">
                                            <div className="text-sm font-black text-blue-600">{stats.boysPct}%</div>
                                            <div className="text-[8px] font-black text-blue-400 uppercase tracking-widest">Boys</div>
                                            <div className="text-[9px] font-bold text-blue-300">{stats.boys}</div>
                                        </div>
                                        <div className="flex-1 bg-pink-50 rounded-xl p-2.5 text-center">
                                            <div className="text-sm font-black text-pink-600">{stats.girlsPct}%</div>
                                            <div className="text-[8px] font-black text-pink-400 uppercase tracking-widest">Girls</div>
                                            <div className="text-[9px] font-bold text-pink-300">{stats.girls}</div>
                                        </div>
                                    </div>

                                    {/* Capacity */}
                                    {cls.capacity && (
                                        <div className="text-[9px] text-slate-400 font-bold flex items-center gap-1">
                                            <Users className="w-3 h-3" /> Capacity: {cls.capacity}
                                            {stats.total > 0 && <span className="ml-auto">{Math.round((stats.total / cls.capacity) * 100)}% full</span>}
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {/* Add New */}
                        <div onClick={() => navigate("/classes/new")}
                            className="border-2 border-dashed border-[#5C67F2]/30 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-[#5C67F2]/5 hover:border-[#5C67F2] transition-all bg-white min-h-[200px] group">
                            <div className="w-10 h-10 flex items-center justify-center text-[#5C67F2] mb-2 group-hover:scale-110 transition-transform">
                                <Plus className="w-8 h-8" />
                            </div>
                            <span className="text-slate-500 font-bold text-sm">Add New Class</span>
                            <span className="text-[9px] text-slate-300 font-bold uppercase mt-0.5">Grade + Stream</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Edit Modal */}
            {editingClass && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 w-full max-w-[480px] mx-4 p-8 relative">
                        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-400 to-orange-500 rounded-t-[2.5rem]" />
                        <button onClick={() => setEditingClass(null)} className="absolute top-6 right-6 p-2 bg-slate-50 rounded-xl text-slate-400 hover:text-rose-500"><X className="w-4 h-4" /></button>
                        <div className="text-center mb-6">
                            <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center text-white mx-auto mb-3"><Edit2 className="w-6 h-6" /></div>
                            <h2 className="text-xl font-black text-slate-800">Edit Class</h2>
                        </div>
                        <div className="space-y-5">
                            <div className="relative">
                                <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Class Name*</div>
                                <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700" />
                            </div>
                            <div className="relative">
                                <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Class Teacher</div>
                                <select value={editTeacherId} onChange={e => setEditTeacherId(e.target.value)} className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700">
                                    <option value="">— No teacher —</option>
                                    {teachers.map((t: any) => <option key={t._id} value={t._id}>{t.employeeName || t.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setEditingClass(null)} className="flex-1 h-11 border border-slate-200 text-slate-500 font-black text-xs uppercase rounded-2xl hover:bg-slate-50">Cancel</button>
                            <button onClick={() => updateMut.mutate({ cls: editingClass, name: editName, teacherId: editTeacherId })} disabled={updateMut.isPending}
                                className="flex-1 h-11 bg-[#5C67F2] hover:bg-indigo-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-100">
                                {updateMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
