import { useState } from "react";
import {
    Plus, ArrowLeft, Loader2, GraduationCap, Check, Trash2, Pencil,
    Settings, X, ChevronRight
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { toast } from "sonner";

const DEFAULT_STREAMS = ["East", "West", "North", "South", "Red", "Blue", "Green", "Gold", "A", "B", "C", "D"];

export default function NewClass() {
    const navigate = useNavigate();
    const qc = useQueryClient();

    // ── Class builder state ────────────────────────────────────────────────
    const [gradeInput, setGradeInput]   = useState("");
    const [streamInput, setStreamInput] = useState("");
    const [capacity, setCapacity]       = useState("40");
    const [curriculum, setCurriculum]   = useState("CBC");
    const [teacherId, setTeacherId]     = useState("");
    const [isSaving, setIsSaving]       = useState(false);

    // ── Stream template manager state ──────────────────────────────────────
    const [showTemplateManager, setShowTemplateManager] = useState(false);
    const [newStreamName, setNewStreamName] = useState("");
    const [newGradeName, setNewGradeName]   = useState("");

    // ── Queries ────────────────────────────────────────────────────────────
    const { data: streamTemplates = [] } = useQuery<any[]>({
        queryKey: ["stream_templates"],
        queryFn: async () => (await api.get("/stream_templates")).data || [],
    });

    const { data: gradeTemplates = [] } = useQuery<any[]>({
        queryKey: ["grade_templates"],
        queryFn: async () => (await api.get("/grade_templates")).data || [],
    });

    const { data: existingGrades = [] } = useQuery<any[]>({
        queryKey: ["v2_classes"],
        queryFn: async () => (await api.get("/v2/classes")).data || [],
    });

    const { data: existingStreams = [] } = useQuery<any[]>({
        queryKey: ["v2_streams"],
        queryFn: async () => (await api.get("/v2/streams")).data || [],
    });

    const { data: staff = [] } = useQuery<any[]>({
        queryKey: ["staff"],
        queryFn: async () => (await api.get("/staff")).data || [],
    });

    // Stream chips: DB templates first, then defaults that aren't in DB
    const dbStreamNames: string[] = streamTemplates.map((t: any) => t.name).filter(Boolean);
    const streamChips: string[] = dbStreamNames.length > 0
        ? dbStreamNames
        : DEFAULT_STREAMS;

    // Grade chips: DB templates + existing v2 classes
    const dbGradeNames: string[] = gradeTemplates.map((t: any) => t.name).filter(Boolean);
    const v2GradeNames: string[] = existingGrades.map((g: any) => g.name).filter(Boolean);
    const gradeChips: string[] = [...new Set([...dbGradeNames, ...v2GradeNames])];

    const teachers = staff.filter((s: any) =>
        s.isTeachingStaff || s.designation?.toLowerCase().includes("teacher") || s.role?.toLowerCase().includes("teacher")
    );

    const gradeVal  = gradeInput.trim();
    const streamVal = streamInput.trim();
    const preview   = gradeVal && streamVal ? `${gradeVal} ${streamVal}` : "";

    const alreadyExists = existingStreams.some((s: any) =>
        (s.fullName || `${s.className} ${s.name}`).toLowerCase() === preview.toLowerCase()
    );

    // ── Template mutations ─────────────────────────────────────────────────
    const addStreamTpl = useMutation({
        mutationFn: (name: string) => api.post("/stream_templates", { name }),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["stream_templates"] }); setNewStreamName(""); toast.success("Stream name added"); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });

    const deleteStreamTpl = useMutation({
        mutationFn: (id: string) => api.delete(`/stream_templates/${id}`),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["stream_templates"] }); toast.success("Removed"); },
    });

    const addGradeTpl = useMutation({
        mutationFn: (name: string) => api.post("/grade_templates", { name }),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["grade_templates"] }); setNewGradeName(""); toast.success("Grade name added"); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });

    const deleteGradeTpl = useMutation({
        mutationFn: (id: string) => api.delete(`/grade_templates/${id}`),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["grade_templates"] }); toast.success("Removed"); },
    });

    // ── Create class ───────────────────────────────────────────────────────
    const handleCreate = async () => {
        if (!gradeVal) { toast.error("Grade/Level name is required"); return; }
        if (!streamVal) { toast.error("Stream name is required"); return; }
        if (alreadyExists) { toast.error(`"${preview}" already exists`); return; }

        setIsSaving(true);
        try {
            // 1. Find or create v2 grade
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

            // 2. Create v2 stream
            await api.post("/v2/streams", {
                classId: cls._id || cls.id,
                name: streamVal,
                capacity: Number(capacity),
                classTeacherId: teacherId || null,
            });

            // 3. Mirror to legacy /academics/classes for backward compat
            await api.post("/academics/classes", {
                levelName: preview,
                capacity: Number(capacity),
                classTeacherId: teacherId || null,
            });

            qc.invalidateQueries({ queryKey: ["classes"] });
            qc.invalidateQueries({ queryKey: ["v2_classes"] });
            qc.invalidateQueries({ queryKey: ["v2_streams"] });
            toast.success(`"${preview}" created successfully`);
            navigate("/classes");
        } catch (e: any) {
            toast.error(e.response?.data?.message || "Failed to create class");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="flex-1 bg-[#f4f7f6] min-h-screen flex flex-col pb-10">

            {/* ── Breadcrumb ─────────────────────────────────────────────── */}
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm m-4 rounded-xl">
                <div className="flex items-center gap-2">
                    <button onClick={() => navigate("/classes")} className="text-gray-400 hover:text-[#5C67F2] transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <span className="text-gray-300">|</span>
                    <span className="font-bold text-gray-800">Classes</span>
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                    <span className="font-bold text-[#5C67F2]">Create New Class</span>
                </div>
                <button
                    onClick={() => setShowTemplateManager(v => !v)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
                        showTemplateManager
                            ? "bg-[#5C67F2] text-white border-[#5C67F2]"
                            : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                    }`}>
                    <Settings className="w-4 h-4" />
                    {showTemplateManager ? "Hide" : "Manage"} Name Templates
                </button>
            </div>

            <div className="max-w-3xl mx-auto w-full px-6 space-y-6">

                {/* ── Template Manager (expandable) ──────────────────────── */}
                {showTemplateManager && (
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                            <h3 className="text-sm font-black text-gray-800">Stream & Grade Name Templates</h3>
                            <p className="text-[10px] text-gray-400 font-medium mt-0.5">
                                Define the default stream and grade names that appear as chips when creating classes.
                                These are school-wide templates used by all staff.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x divide-gray-100">
                            {/* Stream templates */}
                            <div className="p-5">
                                <p className="text-[10px] font-black uppercase tracking-widest text-purple-600 mb-3">Stream Names</p>
                                <div className="flex flex-wrap gap-2 mb-4 min-h-[36px]">
                                    {streamTemplates.length === 0 ? (
                                        <p className="text-[10px] text-gray-400 font-medium italic">No custom streams yet — defaults (East, West…) are used</p>
                                    ) : streamTemplates.map((t: any) => (
                                        <span key={t._id} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 border border-purple-200 text-purple-700 text-[11px] font-black rounded-xl">
                                            {t.name}
                                            <button onClick={() => deleteStreamTpl.mutate(t._id)} className="text-purple-400 hover:text-red-500 transition-colors">
                                                <X className="w-3 h-3" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newStreamName}
                                        onChange={e => setNewStreamName(e.target.value)}
                                        onKeyDown={e => { if (e.key === "Enter" && newStreamName.trim()) addStreamTpl.mutate(newStreamName.trim()); }}
                                        placeholder="e.g. Phoenix, Alpha, Unit 1…"
                                        className="flex-1 h-9 px-3 border border-gray-200 rounded-lg text-xs font-bold text-gray-700 focus:outline-none focus:border-purple-400"
                                    />
                                    <button
                                        onClick={() => { if (newStreamName.trim()) addStreamTpl.mutate(newStreamName.trim()); }}
                                        disabled={!newStreamName.trim() || addStreamTpl.isPending}
                                        className="h-9 px-3 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-lg disabled:opacity-50 transition-all flex items-center gap-1">
                                        <Plus className="w-3.5 h-3.5" /> Add
                                    </button>
                                </div>
                            </div>

                            {/* Grade templates */}
                            <div className="p-5">
                                <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-3">Grade / Level Names</p>
                                <div className="flex flex-wrap gap-2 mb-4 min-h-[36px]">
                                    {gradeTemplates.length === 0 ? (
                                        <p className="text-[10px] text-gray-400 font-medium italic">No templates yet — type any grade when creating</p>
                                    ) : gradeTemplates.map((t: any) => (
                                        <span key={t._id} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-black rounded-xl">
                                            {t.name}
                                            <button onClick={() => deleteGradeTpl.mutate(t._id)} className="text-blue-400 hover:text-red-500 transition-colors">
                                                <X className="w-3 h-3" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newGradeName}
                                        onChange={e => setNewGradeName(e.target.value)}
                                        onKeyDown={e => { if (e.key === "Enter" && newGradeName.trim()) addGradeTpl.mutate(newGradeName.trim()); }}
                                        placeholder="e.g. Grade 1, Form 1, Year 7…"
                                        className="flex-1 h-9 px-3 border border-gray-200 rounded-lg text-xs font-bold text-gray-700 focus:outline-none focus:border-blue-400"
                                    />
                                    <button
                                        onClick={() => { if (newGradeName.trim()) addGradeTpl.mutate(newGradeName.trim()); }}
                                        disabled={!newGradeName.trim() || addGradeTpl.isPending}
                                        className="h-9 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg disabled:opacity-50 transition-all flex items-center gap-1">
                                        <Plus className="w-3.5 h-3.5" /> Add
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Class Builder ───────────────────────────────────────── */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    {/* Header */}
                    <div className="px-6 py-5 border-b border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-[#5C67F2] rounded-xl flex items-center justify-center text-white">
                                <GraduationCap className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-base font-black text-gray-900">Build Learning Class</h2>
                                <p className="text-[10px] text-gray-400 font-medium">Choose a grade and stream to form a class</p>
                            </div>
                        </div>
                    </div>

                    {/* Preview equation */}
                    <div className={`mx-6 mt-5 rounded-xl px-4 py-3 flex items-center gap-3 transition-all ${
                        preview
                            ? alreadyExists ? "bg-red-50 border border-red-200" : "bg-[#5C67F2]/5 border border-[#5C67F2]/20"
                            : "bg-gray-50 border border-gray-100"
                    }`}>
                        <div className={`px-3 py-1.5 rounded-lg text-xs font-black border ${gradeVal ? "bg-blue-100 border-blue-300 text-blue-800" : "bg-gray-100 border-gray-200 text-gray-300"}`}>
                            {gradeVal || "Grade"}
                        </div>
                        <span className="text-gray-400 font-black">+</span>
                        <div className={`px-3 py-1.5 rounded-lg text-xs font-black border ${streamVal ? "bg-purple-100 border-purple-300 text-purple-800" : "bg-gray-100 border-gray-200 text-gray-300"}`}>
                            {streamVal || "Stream"}
                        </div>
                        <span className="text-gray-400 font-black">=</span>
                        <div className={`flex-1 px-3 py-1.5 rounded-lg text-sm font-black border ${
                            preview
                                ? alreadyExists ? "bg-red-100 border-red-300 text-red-700" : "bg-[#5C67F2] border-[#5C67F2] text-white"
                                : "bg-gray-100 border-gray-200 text-gray-300"
                        }`}>
                            {preview || "Learning Class"}
                        </div>
                        {preview && (
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${alreadyExists ? "bg-red-200 text-red-700" : "bg-[#5C67F2]/20 text-[#5C67F2]"}`}>
                                {alreadyExists ? "Duplicate" : "New"}
                            </span>
                        )}
                    </div>

                    <div className="px-6 py-5 space-y-6">
                        {/* Step 1: Grade */}
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[9px] font-black">1</div>
                                <p className="text-xs font-black text-gray-700 uppercase tracking-wide">Grade / Level</p>
                            </div>

                            {gradeChips.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {gradeChips.map(g => (
                                        <button key={g} type="button" onClick={() => setGradeInput(g === gradeInput ? "" : g)}
                                            className={`px-3 py-1.5 rounded-xl text-[11px] font-black border transition-all ${
                                                gradeInput === g
                                                    ? "bg-blue-600 border-blue-600 text-white"
                                                    : "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                                            }`}>
                                            {g}
                                        </button>
                                    ))}
                                </div>
                            )}

                            <input type="text" value={gradeInput} onChange={e => setGradeInput(e.target.value)}
                                placeholder={gradeChips.length > 0 ? "Or type a custom grade…" : "e.g. Grade 1, Form 2, Class 4, Year 6…"}
                                className="w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400 text-sm font-bold text-gray-700 placeholder-gray-300 transition-all" />
                        </div>

                        {/* Step 2: Stream */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[9px] font-black">2</div>
                                    <p className="text-xs font-black text-gray-700 uppercase tracking-wide">Stream Name</p>
                                </div>
                                <button onClick={() => setShowTemplateManager(true)}
                                    className="text-[10px] font-bold text-gray-400 hover:text-[#5C67F2] flex items-center gap-1 transition-colors">
                                    <Pencil className="w-3 h-3" /> Edit templates
                                </button>
                            </div>

                            <div className="flex flex-wrap gap-2 mb-3">
                                {streamChips.map(s => (
                                    <button key={s} type="button" onClick={() => setStreamInput(s === streamInput ? "" : s)}
                                        className={`px-3 py-1.5 rounded-xl text-[11px] font-black border transition-all ${
                                            streamInput === s
                                                ? "bg-purple-600 border-purple-600 text-white"
                                                : "bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100"
                                        }`}>
                                        {s}
                                    </button>
                                ))}
                            </div>

                            <input type="text" value={streamInput} onChange={e => setStreamInput(e.target.value)}
                                placeholder="Or type a custom stream…"
                                className="w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-purple-400 text-sm font-bold text-gray-700 placeholder-gray-300 transition-all" />
                        </div>

                        {/* Step 3: Settings */}
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-5 h-5 rounded-full bg-gray-600 text-white flex items-center justify-center text-[9px] font-black">3</div>
                                <p className="text-xs font-black text-gray-700 uppercase tracking-wide">Class Settings</p>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="relative">
                                    <div className="absolute -top-2.5 left-3 bg-gray-700 text-white text-[8px] px-2 py-0.5 rounded-full font-black z-10">Capacity</div>
                                    <input type="number" value={capacity} onChange={e => setCapacity(e.target.value)}
                                        className="w-full h-10 px-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#5C67F2] text-sm font-bold text-gray-700 text-center" />
                                </div>
                                <div className="relative">
                                    <div className="absolute -top-2.5 left-3 bg-gray-700 text-white text-[8px] px-2 py-0.5 rounded-full font-black z-10">Curriculum</div>
                                    <select value={curriculum} onChange={e => setCurriculum(e.target.value)}
                                        className="w-full h-10 px-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-gray-700">
                                        <option value="CBC">CBC</option>
                                        <option value="844">8-4-4</option>
                                        <option value="Cambridge">Cambridge</option>
                                        <option value="IGCSE">IGCSE</option>
                                    </select>
                                </div>
                                <div className="relative col-span-2">
                                    <div className="absolute -top-2.5 left-3 bg-gray-700 text-white text-[8px] px-2 py-0.5 rounded-full font-black z-10">Class Teacher (optional)</div>
                                    <select value={teacherId} onChange={e => setTeacherId(e.target.value)}
                                        className="w-full h-10 px-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-gray-700">
                                        <option value="">— Assign later —</option>
                                        {teachers.map((t: any) => (
                                            <option key={t._id} value={t._id}>
                                                {t.employeeName || t.firstName ? `${t.firstName || ""} ${t.lastName || ""}`.trim() : t.name || "Staff"}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer action */}
                    <div className="px-6 pb-6 flex items-center gap-3">
                        <button onClick={() => navigate("/classes")}
                            className="h-11 px-6 border border-gray-200 text-gray-500 font-bold text-sm rounded-xl hover:bg-gray-50 transition-all">
                            Cancel
                        </button>
                        <button
                            onClick={handleCreate}
                            disabled={isSaving || !gradeVal || !streamVal || alreadyExists}
                            className="flex-1 h-11 bg-[#5C67F2] hover:bg-[#4a54c4] disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-sm uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 shadow-sm shadow-indigo-200 transition-all">
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            {preview && !alreadyExists ? `Create "${preview}"` : "Create Class"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
