import { useState } from "react";
import { Plus, Trash2, Loader2, Play, Calendar, ShieldCheck, Archive } from "lucide-react";
import { useItems } from "@/hooks/useItems";
import { toast } from "sonner";

export default function CreateTimetable() {
    const { items: timetables, isLoading, createItem, updateItem, deleteItem } = useItems("timetables");
    const { items: classes } = useItems("classes");
    const { items: staff } = useItems("staff");

    // Form
    const [formData, setFormData] = useState({
        name: "",
        semester: "Term 1 2026",
        academicYear: "2026/2027",
        classIds: [] as string[],
        teacherIds: [] as string[]
    });
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await createItem({
                ...formData,
                status: "DRAFT",
                createdAt: new Date().toISOString()
            });
            toast.success("Timetable draft created");
            setFormData({ name: "", semester: "Term 1 2026", academicYear: "2026/2027", classIds: [], teacherIds: [] });
        } catch (e) {
            toast.error("Failed to create timetable");
        } finally {
            setSubmitting(false);
        }
    };

    const handlePublish = async (id: string) => {
        try {
            await updateItem({ id, status: "PUBLISHED", publishedAt: new Date().toISOString() });
            toast.success("Timetable published!");
        } catch (e) {
            toast.error("Failed to publish timetable");
        }
    };

    const handleArchive = async (id: string) => {
        try {
            await updateItem({ id, status: "ARCHIVED" });
            toast.success("Timetable archived");
        } catch (e) {
            toast.error("Failed to archive");
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("Delete this timetable?")) {
            try {
                await deleteItem(id);
                toast.success("Timetable deleted");
            } catch (e) {
                toast.error("Failed to delete");
            }
        }
    };

    const toggleClass = (id: string) => {
        setFormData(prev => ({
            ...prev,
            classIds: prev.classIds.includes(id) 
                ? prev.classIds.filter(cid => cid !== id) 
                : [...prev.classIds, id]
        }));
    };

    const toggleTeacher = (id: string) => {
        setFormData(prev => ({
            ...prev,
            teacherIds: prev.teacherIds.includes(id) 
                ? prev.teacherIds.filter(tid => tid !== id) 
                : [...prev.teacherIds, id]
        }));
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Form column */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6 h-fit">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        <Plus className="w-5 h-5 text-[#5C67F2]" /> Create Timetable Draft
                    </h3>
                    
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Timetable Name</label>
                            <input required type="text" placeholder="e.g. Term 1 General" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full h-10 px-3 border border-gray-200 rounded-lg focus:border-[#5C67F2] outline-none text-sm" />
                        </div>

                        <div>
                            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Semester / Term</label>
                            <select value={formData.semester} onChange={e => setFormData({...formData, semester: e.target.value})} className="w-full h-10 px-3 border border-gray-200 rounded-lg focus:border-[#5C67F2] outline-none text-sm bg-white">
                                <option value="Term 1 2026">Term 1 2026</option>
                                <option value="Term 2 2026">Term 2 2026</option>
                                <option value="Term 3 2026">Term 3 2026</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Academic Year</label>
                            <select value={formData.academicYear} onChange={e => setFormData({...formData, academicYear: e.target.value})} className="w-full h-10 px-3 border border-gray-200 rounded-lg focus:border-[#5C67F2] outline-none text-sm bg-white">
                                <option value="2026/2027">2026/2027</option>
                                <option value="2027/2028">2027/2028</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">Include Classes</label>
                            <div className="max-h-36 overflow-y-auto border border-gray-100 rounded-lg p-2 space-y-1 bg-gray-50/50">
                                {classes?.map((c: any) => (
                                    <label key={c._id} className="flex items-center gap-2 text-xs font-semibold text-gray-600 cursor-pointer p-1 rounded hover:bg-white">
                                        <input type="checkbox" checked={formData.classIds.includes(c._id)} onChange={() => toggleClass(c._id)} className="rounded text-[#5C67F2]" />
                                        {c.name || c.levelName}
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">Include Teachers</label>
                            <div className="max-h-36 overflow-y-auto border border-gray-100 rounded-lg p-2 space-y-1 bg-gray-50/50">
                                {staff?.map((s: any) => (
                                    <label key={s._id} className="flex items-center gap-2 text-xs font-semibold text-gray-600 cursor-pointer p-1 rounded hover:bg-white">
                                        <input type="checkbox" checked={formData.teacherIds.includes(s._id)} onChange={() => toggleTeacher(s._id)} className="rounded text-[#5C67F2]" />
                                        {s.name || s.employeeName}
                                    </label>
                                ))}
                            </div>
                        </div>

                        <button disabled={submitting} type="submit" className="w-full h-10 bg-[#5C67F2] hover:bg-[#4b54db] text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-70 text-sm">
                            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                            Create Draft
                        </button>
                    </form>
                </div>

                {/* Table column */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden h-fit">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2 bg-gray-50/50">
                        <Calendar className="w-5 h-5 text-[#5C67F2]" />
                        <h3 className="font-bold text-gray-900">Existing Timetables</h3>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100 text-[10px] uppercase tracking-wider text-gray-500 font-bold">
                                    <th className="p-4">Name</th>
                                    <th className="p-4">Semester</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4">Created At</th>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr><td colSpan={5} className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-[#5C67F2]" /></td></tr>
                                ) : timetables?.length === 0 ? (
                                    <tr><td colSpan={5} className="p-8 text-center text-gray-400 font-medium">No timetables found.</td></tr>
                                ) : (
                                    timetables?.map((t: any) => (
                                        <tr key={t._id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                            <td className="p-4 font-bold text-gray-800">{t.name}</td>
                                            <td className="p-4 text-gray-600 text-sm">{t.semester}</td>
                                            <td className="p-4">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${
                                                    t.status === "PUBLISHED" ? "bg-emerald-100 text-emerald-700" :
                                                    t.status === "ARCHIVED" ? "bg-gray-100 text-gray-700" : "bg-amber-100 text-amber-700"
                                                }`}>
                                                    {t.status}
                                                </span>
                                            </td>
                                            <td className="p-4 text-gray-500 text-xs">{new Date(t.createdAt).toLocaleDateString()}</td>
                                            <td className="p-4 text-right space-x-1 whitespace-nowrap">
                                                {t.status === "DRAFT" && (
                                                    <button onClick={() => handlePublish(t._id)} className="p-2 text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors inline-flex items-center gap-1 text-xs font-bold">
                                                        <ShieldCheck className="w-4 h-4" /> Publish
                                                    </button>
                                                )}
                                                {t.status !== "ARCHIVED" && (
                                                    <button onClick={() => handleArchive(t._id)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors inline-flex items-center gap-1 text-xs font-bold">
                                                        <Archive className="w-4 h-4" /> Archive
                                                    </button>
                                                )}
                                                <button onClick={() => handleDelete(t._id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors inline-flex items-center gap-1 text-xs font-bold">
                                                    <Trash2 className="w-4 h-4" /> Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
