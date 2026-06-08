import { useState } from "react";
import { Home, Plus, Pencil, Trash2, Check, X, Loader2, BookOpen, GraduationCap } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";

const FRAMEWORKS = [
    {
        key: "CBC",
        label: "CBC",
        full: "Competency-Based Curriculum",
        desc: "Kenya's current curriculum (2017–present)",
        color: "text-emerald-600",
        bg: "bg-emerald-50",
        border: "border-emerald-200",
        levels: ["PP1", "PP2", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12"],
        structure: ["Learning Area → Strand → Sub-Strand → Specific Learning Outcomes (SLOs)"],
    },
    {
        key: "844",
        label: "8-4-4",
        full: "8-4-4 Education System",
        desc: "Kenya's former curriculum structure",
        color: "text-blue-600",
        bg: "bg-blue-50",
        border: "border-blue-200",
        levels: ["Standard 1–8", "Form 1", "Form 2", "Form 3", "Form 4"],
        structure: ["Subject → Topic → Sub-Topic → Objectives"],
    },
    {
        key: "Cambridge",
        label: "Cambridge",
        full: "Cambridge International Education",
        desc: "IGCSE, AS/A Levels, Primary/Lower Secondary",
        color: "text-purple-600",
        bg: "bg-purple-50",
        border: "border-purple-200",
        levels: ["Lower Primary", "Upper Primary", "Lower Secondary", "IGCSE", "AS Level", "A Level"],
        structure: ["Subject → Unit → Topic → Learning Objectives"],
    },
];

const emptyForm = {
    framework: "CBC", subjectId: "", subjectName: "", level: "",
    strand: "", subStrand: "", topic: "", objectives: "", duration: "", notes: "",
};

export default function CurriculumFramework() {
    const [activeFramework, setActiveFramework] = useState("CBC");
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ ...emptyForm, framework: "CBC" });
    const [editId, setEditId] = useState<string | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    const [filterSubject, setFilterSubject] = useState("");
    const qc = useQueryClient();

    const { data: frameworks = [], isLoading, refetch } = useQuery({
        queryKey: ["curriculum_frameworks", activeFramework],
        queryFn: async () => {
            const r = await api.get(`/curriculum_frameworks?framework=${activeFramework}`);
            return Array.isArray(r.data) ? r.data : [];
        },
    });

    const { data: subjects = [] } = useQuery({
        queryKey: ["subjects"],
        queryFn: async () => {
            const r = await api.get("/subjects");
            return Array.isArray(r.data) ? r.data : [];
        },
    });

    const saveMut = useMutation({
        mutationFn: (p: any) => editId
            ? api.patch(`/curriculum_frameworks/${editId}`, p)
            : api.post("/curriculum_frameworks", p),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["curriculum_frameworks"] });
            toast.success(editId ? "Entry updated" : "Curriculum entry added");
            setShowModal(false); setForm({ ...emptyForm, framework: activeFramework }); setEditId(null);
        },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed to save"),
    });

    const delMut = useMutation({
        mutationFn: (id: string) => api.delete(`/curriculum_frameworks/${id}`),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["curriculum_frameworks"] }); toast.success("Deleted"); setConfirmDelete(null); },
    });

    const fw = FRAMEWORKS.find(f => f.key === activeFramework)!;
    const filtered = filterSubject
        ? frameworks.filter((f: any) => (f.subjectName || "").toLowerCase().includes(filterSubject.toLowerCase()))
        : frameworks;

    const openEdit = (item: any) => {
        setEditId(item._id);
        setForm({ framework: item.framework, subjectId: item.subjectId || "", subjectName: item.subjectName || "", level: item.level || "", strand: item.strand || "", subStrand: item.subStrand || "", topic: item.topic || "", objectives: item.objectives || "", duration: item.duration || "", notes: item.notes || "" });
        setShowModal(true);
    };

    const labels = {
        CBC: { l1: "Strand", l2: "Sub-Strand", l3: "SLO / Topic" },
        "844": { l1: "Topic", l2: "Sub-Topic", l3: "Objective" },
        Cambridge: { l1: "Unit", l2: "Topic", l3: "Learning Objective" },
    }[activeFramework] || { l1: "Level 1", l2: "Level 2", l3: "Level 3" };

    return (
        <div className="flex-1 bg-[#F8FAFC] min-h-screen flex flex-col pb-20 font-sans">
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-2 text-sm">
                    <Home className="w-4 h-4 text-[#5C67F2]" /><span className="text-gray-300">/</span>
                    <span className="font-bold text-gray-600">Subjects</span><span className="text-gray-300">/</span>
                    <span className="font-black text-[#5C67F2]">Curriculum Framework</span>
                </div>
                <button onClick={() => { setEditId(null); setForm({ ...emptyForm, framework: activeFramework }); setShowModal(true); }}
                    className="h-10 px-5 bg-[#5C67F2] hover:bg-indigo-600 text-white font-black text-xs uppercase tracking-widest rounded-xl flex items-center gap-2 shadow-md shadow-indigo-100">
                    <Plus className="w-4 h-4" /> Add Entry
                </button>
            </div>

            <div className="flex-1 max-w-7xl mx-auto w-full px-6 pt-8">
                <div className="mb-6">
                    <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                        <GraduationCap className="w-8 h-8 text-[#5C67F2]" /> Curriculum Frameworks
                    </h1>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-1">Set up CBC, 8-4-4, and Cambridge curriculum structures for each subject</p>
                </div>

                {/* Framework selector cards */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                    {FRAMEWORKS.map(f => (
                        <button key={f.key} onClick={() => setActiveFramework(f.key)}
                            className={`p-5 rounded-[1.5rem] border-2 text-left transition-all ${activeFramework === f.key ? `${f.bg} ${f.border}` : "bg-white border-slate-100 hover:border-slate-200"}`}>
                            <div className="flex items-center gap-3 mb-2">
                                <span className={`text-2xl font-black ${activeFramework === f.key ? f.color : "text-slate-400"}`}>{f.label}</span>
                                {activeFramework === f.key && <Check className={`w-5 h-5 ${f.color}`} />}
                            </div>
                            <p className={`text-xs font-black uppercase tracking-wide ${activeFramework === f.key ? f.color : "text-slate-600"}`}>{f.full}</p>
                            <p className="text-[9px] text-slate-400 font-bold mt-1">{f.desc}</p>
                            <p className={`text-[9px] font-black mt-2 uppercase tracking-widest ${activeFramework === f.key ? f.color : "text-slate-300"}`}>{f.structure[0]}</p>
                        </button>
                    ))}
                </div>

                {/* Filter */}
                <div className="flex gap-4 mb-4">
                    <input value={filterSubject} onChange={e => setFilterSubject(e.target.value)} placeholder="Filter by subject..."
                        className="h-10 px-4 bg-white border border-slate-100 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-[#5C67F2] shadow-sm w-64" />
                    <span className={`text-[10px] font-black uppercase tracking-widest self-center ${fw.color}`}>{filtered.length} entries for {fw.label}</span>
                </div>

                {/* Table */}
                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden p-6">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-40 gap-2 text-slate-400 text-xs font-bold uppercase"><Loader2 className="w-5 h-5 animate-spin text-[#5C67F2]" />Loading...</div>
                    ) : filtered.length === 0 ? (
                        <div className={`flex flex-col items-center justify-center h-40 gap-3 ${fw.color} opacity-40`}>
                            <BookOpen className="w-10 h-10" />
                            <p className="text-xs font-black uppercase">No {fw.label} entries yet — click Add Entry</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                                        <th className="py-3 px-4">Subject</th>
                                        <th className="py-3 px-4">Level</th>
                                        <th className="py-3 px-4">{labels.l1}</th>
                                        <th className="py-3 px-4">{labels.l2}</th>
                                        <th className="py-3 px-4">{labels.l3}</th>
                                        <th className="py-3 px-4">Duration</th>
                                        <th className="py-3 px-4 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filtered.map((item: any) => (
                                        <tr key={item._id} className="hover:bg-slate-50/50">
                                            <td className="py-3 px-4 font-black text-slate-800">{item.subjectName || "—"}</td>
                                            <td className="py-3 px-4 font-bold text-slate-500">{item.level || "—"}</td>
                                            <td className="py-3 px-4 font-bold text-slate-700">{item.strand || "—"}</td>
                                            <td className="py-3 px-4 font-bold text-slate-600">{item.subStrand || "—"}</td>
                                            <td className="py-3 px-4 font-bold text-slate-600 max-w-xs truncate">{item.topic || item.objectives || "—"}</td>
                                            <td className="py-3 px-4 font-bold text-slate-500">{item.duration || "—"}</td>
                                            <td className="py-3 px-4 text-center">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <button onClick={() => openEdit(item)} className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-amber-50 text-slate-400 hover:text-amber-500 flex items-center justify-center border border-slate-100 transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                                                    {confirmDelete === item._id ? (
                                                        <><button onClick={() => delMut.mutate(item._id)} className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center"><Check className="w-3.5 h-3.5" /></button>
                                                        <button onClick={() => setConfirmDelete(null)} className="w-8 h-8 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center"><X className="w-3.5 h-3.5" /></button></>
                                                    ) : (
                                                        <button onClick={() => setConfirmDelete(item._id)} className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-500 flex items-center justify-center border border-slate-100 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white max-w-2xl w-full rounded-[2.5rem] border border-slate-100 shadow-2xl relative my-4">
                        <div className={`absolute top-0 inset-x-0 h-1.5 rounded-t-[2.5rem] ${fw.bg.replace("bg-", "bg-")} border-b ${fw.border}`} style={{ background: activeFramework === "CBC" ? "#10b981" : activeFramework === "844" ? "#3b82f6" : "#8b5cf6" }} />
                        <div className="p-8">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 uppercase">{editId ? "Edit" : "Add"} {fw.label} Entry</h3>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">{fw.structure[0]}</p>
                                </div>
                                <button onClick={() => { setShowModal(false); setEditId(null); }} className="text-slate-400 hover:text-rose-500"><X className="w-5 h-5" /></button>
                            </div>
                            <div className="grid grid-cols-2 gap-5">
                                <div className="relative">
                                    <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Subject*</div>
                                    <select value={form.subjectId} onChange={e => { const s = subjects.find((s: any) => s._id === e.target.value); setForm({ ...form, subjectId: e.target.value, subjectName: s?.name || s?.subjectName || "" }); }} className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700">
                                        <option value="">— Select Subject —</option>
                                        {subjects.map((s: any) => <option key={s._id} value={s._id}>{s.name || s.subjectName}</option>)}
                                    </select>
                                </div>
                                <div className="relative">
                                    <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Level / Grade</div>
                                    <select value={form.level} onChange={e => setForm({ ...form, level: e.target.value })} className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700">
                                        <option value="">— Select Level —</option>
                                        {fw.levels.map(l => <option key={l}>{l}</option>)}
                                    </select>
                                </div>
                                {[
                                    { label: `${labels.l1}*`, field: "strand" },
                                    { label: labels.l2, field: "subStrand" },
                                    { label: labels.l3, field: "topic", col: 2 },
                                    { label: "Learning Objectives / Outcomes", field: "objectives", col: 2 },
                                    { label: "Duration (e.g. 2 lessons)", field: "duration" },
                                    { label: "Notes / Resources", field: "notes" },
                                ].map(f => (
                                    <div key={f.field} className={`relative ${(f as any).col === 2 ? "col-span-2" : ""}`}>
                                        <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">{f.label}</div>
                                        {f.field === "objectives" || f.field === "notes" ? (
                                            <textarea value={(form as any)[f.field]} onChange={e => setForm({ ...form, [f.field]: e.target.value })} rows={2} className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700 resize-none" />
                                        ) : (
                                            <input type="text" value={(form as any)[f.field]} onChange={e => setForm({ ...form, [f.field]: e.target.value })} className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700" />
                                        )}
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button onClick={() => { setShowModal(false); setEditId(null); }} className="px-6 py-2.5 hover:bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded-xl">Cancel</button>
                                <button onClick={() => { if (!form.strand.trim()) { toast.error(`${labels.l1} is required`); return; } saveMut.mutate({ ...form, framework: activeFramework }); }} disabled={saveMut.isPending}
                                    className="px-6 py-2.5 bg-[#5C67F2] hover:bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-100">
                                    {saveMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                    {editId ? "Save Changes" : "Add Entry"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
