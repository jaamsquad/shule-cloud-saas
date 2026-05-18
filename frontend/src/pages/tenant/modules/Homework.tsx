import { useState } from "react";
import { Home, Plus, Search, Edit3, Trash2, Calendar, Book, Users, Loader2, FileText, CheckCircle2 } from "lucide-react";
import { useItems } from "@/hooks/useItems";
import { toast } from "sonner";
import Modal from "@/components/ui/modal"; // Assuming there is a generic modal component or we can build a simple one
import { format, parseISO } from "date-fns";

export default function Homework() {
    // Endpoints
    const { items: homeworks, isLoading, createItem, updateItem, deleteItem, isCreating, isUpdating } = useItems("homework");
    const { items: classesList } = useItems("classes");
    const { items: staffList } = useItems("staff");
    const { items: subjectsList } = useItems("subjects");

    // Filters
    const [filterDate, setFilterDate] = useState("");
    const [filterClass, setFilterClass] = useState("");
    const [filterTeacher, setFilterTeacher] = useState("");

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<any>(null);

    // Form state
    const [formData, setFormData] = useState({
        homeworkDate: new Date().toISOString().split('T')[0],
        classId: "",
        subjectId: "",
        teacherId: "",
        title: "",
        description: "",
        submissionDate: "",
    });

    const openModal = (item?: any) => {
        if (item) {
            setEditingItem(item);
            setFormData({
                homeworkDate: item.homeworkDate,
                classId: item.classId,
                subjectId: item.subjectId,
                teacherId: item.teacherId,
                title: item.title,
                description: item.description,
                submissionDate: item.submissionDate || "",
            });
        } else {
            setEditingItem(null);
            setFormData({
                homeworkDate: new Date().toISOString().split('T')[0],
                classId: "",
                subjectId: "",
                teacherId: "",
                title: "",
                description: "",
                submissionDate: "",
            });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => setIsModalOpen(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        try {
            if (editingItem) {
                await updateItem({ id: editingItem._id, ...formData });
                toast.success("Homework updated successfully");
            } else {
                await createItem(formData);
                toast.success("Homework added successfully");
            }
            closeModal();
        } catch (error) {
            toast.error("Failed to save homework");
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("Are you sure you want to delete this homework?")) {
            try {
                await deleteItem(id);
                toast.success("Homework deleted successfully");
            } catch (error) {
                toast.error("Failed to delete homework");
            }
        }
    };

    // Filter logic
    const filteredHomeworks = homeworks?.filter((hw: any) => {
        if (filterDate && hw.homeworkDate !== filterDate) return false;
        if (filterClass && hw.classId !== filterClass) return false;
        if (filterTeacher && hw.teacherId !== filterTeacher) return false;
        return true;
    });

    return (
        <div className="flex-1 bg-[#f4f7f6] min-h-screen p-6">
            <div className="max-w-6xl mx-auto space-y-6">
                
                {/* Header Card */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center justify-between">
                    <div className="flex items-center text-[#5C67F2] font-semibold">
                        <span className="text-lg">Homework</span>
                        <span className="text-gray-300 mx-3">|</span>
                        <Home className="w-4 h-4 mr-2" />
                        <span className="text-gray-500 font-medium">- Homeworks</span>
                    </div>
                    <button 
                        onClick={() => openModal()}
                        className="bg-[#5C67F2] hover:bg-[#4b54db] text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-colors text-sm shadow-md shadow-indigo-200"
                    >
                        <Plus className="w-4 h-4" /> Add Homework
                    </button>
                </div>

                {/* Filter Card */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-wrap gap-6 items-end">
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">Homework Date</label>
                        <div className="relative">
                            <input 
                                type="date" 
                                value={filterDate}
                                onChange={e => setFilterDate(e.target.value)}
                                className="w-full h-12 px-4 border border-gray-200 rounded-xl focus:outline-none focus:border-[#5C67F2] text-sm font-semibold text-gray-700"
                            />
                        </div>
                    </div>

                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">Class</label>
                        <select 
                            value={filterClass}
                            onChange={e => setFilterClass(e.target.value)}
                            className="w-full h-12 px-4 border border-gray-200 rounded-xl focus:outline-none focus:border-[#5C67F2] text-sm font-semibold text-gray-700 appearance-none bg-white"
                        >
                            <option value="">All Classes</option>
                            {classesList?.map((c: any) => (
                                <option key={c._id} value={c._id}>{c.className}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">Teacher</label>
                        <select 
                            value={filterTeacher}
                            onChange={e => setFilterTeacher(e.target.value)}
                            className="w-full h-12 px-4 border border-gray-200 rounded-xl focus:outline-none focus:border-[#5C67F2] text-sm font-semibold text-gray-700 appearance-none bg-white"
                        >
                            <option value="">All Teachers</option>
                            {staffList?.map((s: any) => (
                                <option key={s._id} value={s._id}>{s.fullName || s.firstName + ' ' + s.lastName}</option>
                            ))}
                        </select>
                    </div>

                    <button className="h-12 px-8 bg-[#5C67F2] hover:bg-[#4b54db] text-white rounded-xl font-bold flex items-center gap-2 transition-colors text-sm shadow-md shadow-indigo-200">
                        <Search className="w-4 h-4" /> Search
                    </button>
                </div>

                {/* Content */}
                {isLoading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-[#5C67F2]" />
                    </div>
                ) : filteredHomeworks?.length === 0 ? (
                    <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Book className="w-8 h-8 text-gray-300" />
                        </div>
                        <h3 className="text-gray-900 font-bold text-lg">No Homework Found</h3>
                        <p className="text-gray-500 text-sm mt-1">There are no assignments matching your criteria.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredHomeworks?.map((hw: any) => {
                            const hwDate = hw.homeworkDate ? parseISO(hw.homeworkDate) : new Date();
                            const day = format(hwDate, "dd");
                            const month = format(hwDate, "MMM").toUpperCase();

                            const teacher = staffList?.find((s: any) => s._id === hw.teacherId);
                            const teacherName = teacher ? (teacher.fullName || `${teacher.firstName} ${teacher.lastName}`) : "Unknown Teacher";
                            
                            const cls = classesList?.find((c: any) => c._id === hw.classId);
                            const className = cls ? cls.className : "Unknown Class";

                            const sub = subjectsList?.find((s: any) => s._id === hw.subjectId);
                            const subjectName = sub ? sub.subjectName : "Unknown Subject";

                            return (
                                <div key={hw._id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center gap-8 group hover:shadow-md transition-shadow">
                                    {/* Date Block */}
                                    <div className="flex flex-col items-center justify-center min-w-[60px]">
                                        <span className="text-3xl font-black text-[#1e293b] leading-none">{day}</span>
                                        <span className="text-xs font-bold text-gray-500 mt-1">{month}</span>
                                    </div>

                                    {/* Vertical Divider */}
                                    <div className="w-px h-16 bg-gray-100"></div>

                                    {/* Info Block */}
                                    <div className="flex-1 flex flex-col justify-center">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="flex items-center gap-1.5 text-[#5C67F2] bg-indigo-50 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                                                <Users className="w-3 h-3" /> {teacherName}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                                                <Calendar className="w-3 h-3" /> {className}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                                                <Book className="w-3 h-3" /> {subjectName}
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <FileText className="w-5 h-5 text-[#5C67F2] mt-0.5" />
                                            <div>
                                                <h4 className="font-bold text-gray-900 text-base">{hw.title}</h4>
                                                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{hw.description}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={() => openModal(hw)}
                                            className="w-10 h-10 rounded-xl bg-indigo-50 text-[#5C67F2] hover:bg-[#5C67F2] hover:text-white flex items-center justify-center transition-colors"
                                        >
                                            <Edit3 className="w-4 h-4" />
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(hw._id)}
                                            className="w-10 h-10 rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Modal for Add/Edit */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <Book className="w-5 h-5 text-[#5C67F2]" />
                                {editingItem ? "Edit Homework" : "Add New Homework"}
                            </h2>
                            <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <Trash2 className="w-5 h-5" style={{display:'none'}} />
                                <span className="text-2xl leading-none">&times;</span>
                            </button>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">Homework Date *</label>
                                    <input 
                                        type="date" 
                                        required
                                        value={formData.homeworkDate}
                                        onChange={e => setFormData({...formData, homeworkDate: e.target.value})}
                                        className="w-full h-12 px-4 border border-gray-200 rounded-xl focus:outline-none focus:border-[#5C67F2] text-sm font-semibold text-gray-700"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">Submission Date</label>
                                    <input 
                                        type="date" 
                                        value={formData.submissionDate}
                                        onChange={e => setFormData({...formData, submissionDate: e.target.value})}
                                        className="w-full h-12 px-4 border border-gray-200 rounded-xl focus:outline-none focus:border-[#5C67F2] text-sm font-semibold text-gray-700"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">Class *</label>
                                    <select 
                                        required
                                        value={formData.classId}
                                        onChange={e => setFormData({...formData, classId: e.target.value})}
                                        className="w-full h-12 px-4 border border-gray-200 rounded-xl focus:outline-none focus:border-[#5C67F2] text-sm font-semibold text-gray-700 appearance-none bg-white"
                                    >
                                        <option value="" disabled>Select Class</option>
                                        {classesList?.map((c: any) => (
                                            <option key={c._id} value={c._id}>{c.className}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">Subject *</label>
                                    <select 
                                        required
                                        value={formData.subjectId}
                                        onChange={e => setFormData({...formData, subjectId: e.target.value})}
                                        className="w-full h-12 px-4 border border-gray-200 rounded-xl focus:outline-none focus:border-[#5C67F2] text-sm font-semibold text-gray-700 appearance-none bg-white"
                                    >
                                        <option value="" disabled>Select Subject</option>
                                        {subjectsList?.map((s: any) => (
                                            <option key={s._id} value={s._id}>{s.subjectName}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="col-span-2">
                                    <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">Teacher *</label>
                                    <select 
                                        required
                                        value={formData.teacherId}
                                        onChange={e => setFormData({...formData, teacherId: e.target.value})}
                                        className="w-full h-12 px-4 border border-gray-200 rounded-xl focus:outline-none focus:border-[#5C67F2] text-sm font-semibold text-gray-700 appearance-none bg-white"
                                    >
                                        <option value="" disabled>Select Teacher</option>
                                        {staffList?.map((s: any) => (
                                            <option key={s._id} value={s._id}>{s.fullName || s.firstName + ' ' + s.lastName}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="col-span-2">
                                    <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">Title / Type *</label>
                                    <input 
                                        type="text" 
                                        required
                                        placeholder="e.g. Assignment, Project, Reading"
                                        value={formData.title}
                                        onChange={e => setFormData({...formData, title: e.target.value})}
                                        className="w-full h-12 px-4 border border-gray-200 rounded-xl focus:outline-none focus:border-[#5C67F2] text-sm font-semibold text-gray-700"
                                    />
                                </div>

                                <div className="col-span-2">
                                    <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">Description</label>
                                    <textarea 
                                        rows={4}
                                        placeholder="Enter homework details..."
                                        value={formData.description}
                                        onChange={e => setFormData({...formData, description: e.target.value})}
                                        className="w-full p-4 border border-gray-200 rounded-xl focus:outline-none focus:border-[#5C67F2] text-sm font-semibold text-gray-700 resize-none"
                                    ></textarea>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-50">
                                <button 
                                    type="button" 
                                    onClick={closeModal}
                                    className="px-6 py-2.5 rounded-xl font-bold text-gray-500 hover:bg-gray-50 transition-colors text-sm"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={isCreating || isUpdating}
                                    className="bg-[#5C67F2] hover:bg-[#4b54db] disabled:opacity-70 text-white px-8 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-colors text-sm shadow-md shadow-indigo-200"
                                >
                                    {(isCreating || isUpdating) ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                    {editingItem ? "Update" : "Save Homework"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
