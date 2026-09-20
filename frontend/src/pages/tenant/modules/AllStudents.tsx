import { useState, useEffect } from "react";
import { Home, Plus, Search, Edit, Trash2, User, Loader2, LayoutGrid, List, Check, X, ListChecks } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api from "@/lib/api";
import { useItems } from "@/hooks/useItems";
import { useModuleCrud } from "@/contexts/PermissionsContext";
import StudentTrashDialog, { STUDENT_TRASH_KEY } from "./students/StudentTrashDialog";

const NO_CLASS = "__none__";   // class filter value for students who aren't in any class
const norm = (v: any) => String(v ?? "").toLowerCase().replace(/\s+/g, " ").trim();

// Students with no status yet (older records) count as Active.
const statusOf = (s: any) => String(s.status || "Active");
const STATUS_BADGE: Record<string, string> = {
    transferred: "bg-amber-50 text-amber-700 border-amber-200",
    graduated: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export default function AllStudents() {
    const navigate = useNavigate();
    const { items: students, isLoading, deleteItem, updateItem, isUpdating } = useItems("students");
    const { canCreate, canUpdate, canDelete } = useModuleCrud("students");
    const [searchTerm, setSearchTerm] = useState("");
    const [filterClassId, setFilterClassId] = useState("");   // v2 class filter
    const [filterStreamId, setFilterStreamId] = useState(""); // v2 stream filter
    const [sortBy, setSortBy] = useState("name_asc");
    const [filterStatus, setFilterStatus] = useState("Active");   // Transferred/Graduated students are hidden by default
    const [showTrash, setShowTrash] = useState(false);
    // Select mode: tick students, then delete them together (they go to the Trash, where they can be restored).
    const queryClient = useQueryClient();
    const [selectMode, setSelectMode] = useState(false);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const toggleSelected = (id: string) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    const exitSelect = () => { setSelectMode(false); setSelected(new Set()); setConfirmDelete(false); };
    const deleteSelected = async () => {
        const ids = Array.from(selected);
        setDeleting(true);
        let ok = 0, failed = 0;
        for (let i = 0; i < ids.length; i += 4) {   // a few at a time
            await Promise.all(ids.slice(i, i + 4).map(id => api.delete(`/students/${id}`).then(() => { ok++; }).catch(() => { failed++; })));
        }
        setDeleting(false);
        queryClient.invalidateQueries({ queryKey: ["students"] });
        queryClient.invalidateQueries({ queryKey: STUDENT_TRASH_KEY });
        if (ok) toast.success(`${ok} student${ok === 1 ? "" : "s"} moved to Trash${failed ? ` · ${failed} could not be deleted` : ""}`);
        else toast.error("Could not delete the selected students.");
        exitSelect();
    };
    const [viewMode, setViewMode] = useState<'grid'|'list'>(localStorage.getItem('studentViewMode') as any || 'grid');
    const [editingId, setEditingId] = useState<string | null>(null);   // inline class edit

    // v2 classes (Form 4) + streams for the chosen filter class.
    const { data: classes = [] } = useQuery<any[]>({ queryKey: ["v2_classes"], queryFn: async () => (await api.get("/v2/classes")).data || [] });
    const { data: filterStreams = [] } = useQuery<any[]>({ queryKey: ["v2_streams", filterClassId], enabled: !!filterClassId && filterClassId !== NO_CLASS, queryFn: async () => (await api.get("/v2/streams", { params: { classId: filterClassId } })).data || [] });
    // Soft-deleted students (for the Trash button's count). Only people who may delete can open the trash.
    const { data: trash = [] } = useQuery<any[]>({ queryKey: STUDENT_TRASH_KEY, enabled: canDelete, queryFn: async () => (await api.get("/students/trash")).data || [] });
    const filterCls = classes.find((c: any) => String(c._id) === filterClassId);
    const filterStream = filterStreams.find((s: any) => String(s._id) === filterStreamId);

    // Drill-down from the dashboard: /students?class=<name>. Match the name against a
    // v2 class (by level/name) and pre-select that filter once classes have loaded.
    const [searchParams] = useSearchParams();
    const classParam = searchParams.get("class");
    useEffect(() => {
        if (!classParam || filterClassId || classes.length === 0) return;
        const target = norm(classParam);
        const match = classes.find((c: any) => {
            const n = norm(c.name || c.levelName);
            return n === target || target.startsWith(n) || n.startsWith(target);
        });
        if (match) setFilterClassId(String(match._id));
        else setSearchTerm(classParam);   // fall back to a text search so the drill-down still narrows
    }, [classParam, classes, filterClassId]);

    const handleViewModeChange = (mode: 'grid'|'list') => {
        setViewMode(mode);
        localStorage.setItem('studentViewMode', mode);
    };

    // A student matches the class/stream filter by v2 ids or by class/stream TEXT.
    const hasClass = (s: any) => !!(String(s.classId || "").trim() || String(s.studentClass || s.currentClass || s.className || "").trim());
    const matchesClassFilter = (s: any) => {
        if (!filterClassId) return true;
        if (filterClassId === NO_CLASS) return !hasClass(s);
        const classOk = String(s.classId) === filterClassId || norm(s.studentClass || s.currentClass) === norm(filterCls?.name) || norm(s.studentClass).startsWith(norm(filterCls?.name));
        if (!classOk) return false;
        if (!filterStreamId) return true;
        return String(s.streamId) === filterStreamId || norm(s.stream || s.streamName) === norm(filterStream?.name) || norm(s.studentClass).endsWith(norm(filterStream?.name));
    };

    const filteredAndSorted = students
        .filter((s: any) => {
            const name = (s.studentName || s.name || "").toLowerCase();
            const reg = (s.registrationNo || "").toLowerCase();
            const matchesSearch = name.includes(searchTerm.toLowerCase()) || reg.includes(searchTerm.toLowerCase());
            const matchesStatus = filterStatus === "all" || norm(statusOf(s)) === norm(filterStatus);
            return matchesSearch && matchesStatus && matchesClassFilter(s);
        })
        .sort((a: any, b: any) => {
            if (sortBy === "name_asc") {
                return (a.studentName || a.name || "").localeCompare(b.studentName || b.name || "");
            }
            if (sortBy === "name_desc") {
                return (b.studentName || b.name || "").localeCompare(a.studentName || a.name || "");
            }
            if (sortBy === "newest") {
                return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
            }
            if (sortBy === "oldest") {
                return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
            }
            if (sortBy === "gender_male" || sortBy === "gender_female") {
                const order = sortBy === "gender_male" ? ["male", "female"] : ["female", "male"];
                const rank = (s: any) => { const i = order.indexOf(norm(s.gender)); return i === -1 ? order.length : i; };   // unset/other last
                return rank(a) - rank(b) || (a.studentName || a.name || "").localeCompare(b.studentName || b.name || "");
            }
            return 0;
        });

    return (
        <div className="flex-1 bg-[#f4f7f6] min-h-screen flex flex-col items-center">
            {/* Breadcrumb */}
            <div className="bg-white border-b border-gray-100 px-5 py-3 flex items-center shadow-sm z-10 m-4 rounded-xl w-[calc(100%-2rem)]">
                <span className="font-bold text-gray-800 text-sm mr-2">Students</span>
                <span className="text-gray-300 mx-2">|</span>
                <Home className="w-3.5 h-3.5 text-gray-500 mr-1.5" />
                <span className="text-gray-500 font-medium text-sm">- All Students</span>
            </div>

            <div className="p-6 pt-0 w-full mt-4">
                {/* Filters & Search */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        {/* Class filter (Form 4) */}
                        <select
                            value={filterClassId}
                            onChange={(e) => { setFilterClassId(e.target.value); setFilterStreamId(""); }}
                            className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:border-[#5C67F2] text-sm bg-white font-medium text-gray-700 flex-1 md:flex-none cursor-pointer"
                        >
                            <option value="">All Classes</option>
                            <option value={NO_CLASS}>No class</option>
                            {classes.map((c: any) => (
                                <option key={c._id} value={c._id}>{c.name}</option>
                            ))}
                        </select>
                        {/* Stream filter (East/South) */}
                        <select
                            value={filterStreamId}
                            onChange={(e) => setFilterStreamId(e.target.value)}
                            disabled={!filterClassId || filterClassId === NO_CLASS}
                            className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:border-[#5C67F2] text-sm bg-white font-medium text-gray-700 flex-1 md:flex-none cursor-pointer disabled:bg-gray-50"
                        >
                            <option value="">All Streams</option>
                            {filterStreams.map((s: any) => (
                                <option key={s._id} value={s._id}>{s.name}</option>
                            ))}
                        </select>
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:border-[#5C67F2] text-sm bg-white font-medium text-gray-700 flex-1 md:flex-none cursor-pointer"
                        >
                            <option value="Active">Active</option>
                            <option value="Transferred">Transferred</option>
                            <option value="Graduated">Graduated</option>
                            <option value="all">All statuses</option>
                        </select>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:border-[#5C67F2] text-sm bg-white font-medium text-gray-700 flex-1 md:flex-none cursor-pointer"
                        >
                            <option value="name_asc">Name (A-Z)</option>
                            <option value="name_desc">Name (Z-A)</option>
                            <option value="newest">Newest First</option>
                            <option value="oldest">Oldest First</option>
                            <option value="gender_male">Gender (Male first)</option>
                            <option value="gender_female">Gender (Female first)</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        {canDelete && (
                            <button
                                onClick={() => (selectMode ? exitSelect() : setSelectMode(true))}
                                className={`h-10 px-3 border rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${selectMode ? "bg-[#5C67F2] border-[#5C67F2] text-white" : "bg-white border-gray-200 text-gray-700 hover:border-[#5C67F2] hover:text-[#5C67F2]"}`}
                            >
                                <ListChecks className="w-4 h-4" /> {selectMode ? "Cancel" : "Select"}
                            </button>
                        )}
                        {canDelete && (
                            <button
                                onClick={() => setShowTrash(true)}
                                className="h-10 px-3 border border-gray-200 hover:border-rose-300 rounded-lg text-sm bg-white font-medium text-gray-700 hover:text-rose-600 flex items-center gap-2 transition-colors"
                            >
                                <Trash2 className="w-4 h-4" /> Trash
                                {trash.length > 0 && <span className="min-w-5 h-5 px-1.5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">{trash.length}</span>}
                            </button>
                        )}
                        <div className="flex bg-gray-100 rounded-lg p-1 mr-2 hidden md:flex">
                            <button 
                                onClick={() => handleViewModeChange('grid')}
                                className={`p-2 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white shadow-sm text-[#5C67F2]' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                <LayoutGrid className="w-4 h-4" />
                            </button>
                            <button 
                                onClick={() => handleViewModeChange('list')}
                                className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-[#5C67F2]' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                <List className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="relative w-full md:w-auto">
                            <input 
                                type="text" 
                                placeholder="Search students..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="h-10 pl-10 pr-4 border border-gray-200 rounded-lg focus:outline-none focus:border-[#5C67F2] text-sm bg-white w-full md:w-64"
                            />
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        </div>
                    </div>
                </div>

                {/* Content */}
                {viewMode === 'grid' ? (
                    <div className="flex gap-5 flex-wrap justify-center lg:justify-start pl-4">
                        {isLoading ? (
                            <div className="w-full flex justify-center py-20">
                                <Loader2 className="w-10 h-10 animate-spin text-[#5C67F2]" />
                            </div>
                        ) : (
                            filteredAndSorted.map((student: any) => (
                                <div key={student._id} className={`w-52 bg-white rounded-2xl shadow-sm border p-5 flex flex-col items-center relative hover:shadow-md transition-shadow ${selected.has(student._id) ? "border-[#5C67F2] ring-2 ring-[#5C67F2]/30" : "border-gray-100"}`}>
                                    {selectMode && <input type="checkbox" checked={selected.has(student._id)} onChange={() => toggleSelected(student._id)} className="absolute top-3 left-3 w-4 h-4 accent-[#5C67F2] cursor-pointer" aria-label={`Select ${student.studentName || student.name}`} />}
                                    <div className="w-16 h-16 bg-gray-100 rounded-full border-4 border-[#868DF4]/20 flex items-center justify-center overflow-hidden mb-3 text-[#5C67F2]">
                                        {student.avatar || student.studentPhoto ? (
                                            <img src={student.avatar || student.studentPhoto} alt={student.studentName || student.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <User className="w-8 h-8" />
                                        )}
                                    </div>
                                    
                                    <p className="text-[9px] font-bold text-gray-400 mb-0.5">{student.registrationNo || '—'}</p>
                                    <h3 className="font-bold text-gray-800 text-xs tracking-tight mb-1 text-center">{student.studentName || student.name}</h3>
                                    <p className="text-[8px] font-black text-[#5C67F2] uppercase tracking-widest mb-3">
                                        {STATUS_BADGE[norm(statusOf(student))] ? statusOf(student) : (student.studentClass || '—')}
                                    </p>

                                    <div className="flex gap-2">
                                        <Link to={`/students/report/${student._id}`} className="w-7 h-7 rounded-full bg-[#868DF4] hover:bg-[#5C67F2] text-white flex items-center justify-center transition-colors shadow-sm">
                                            <Search className="w-3.5 h-3.5" />
                                        </Link>
                                        {canUpdate && (
                                        <button
                                            onClick={() => navigate(`/students/edit/${student._id}`)}
                                            className="w-7 h-7 rounded-full bg-[#5C67F2] hover:bg-[#4a54c4] text-white flex items-center justify-center transition-colors shadow-sm"
                                        >
                                            <Edit className="w-3.5 h-3.5" />
                                        </button>
                                        )}
                                        {canDelete && (
                                        <button
                                            onClick={() => { if(confirm("Move this student to Trash? You can restore them from there.")) deleteItem(student._id); }}
                                            className="w-7 h-7 rounded-full bg-[#ff5e6c] hover:bg-[#e04553] text-white flex items-center justify-center transition-colors shadow-sm"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}

                        {/* Add New — only shown if user has create permission */}
                        {canCreate && (
                        <Link to="/students/new" className="w-52 bg-white rounded-2xl shadow-sm border border-dashed border-[#5C67F2]/40 hover:border-[#5C67F2] p-5 flex flex-col items-center justify-center cursor-pointer transition-colors group min-h-[200px]">
                            <div className="w-12 h-12 rounded-full bg-blue-50 group-hover:bg-blue-100 flex items-center justify-center mb-3 transition-colors">
                                <Plus className="w-6 h-6 text-[#5C67F2]" />
                            </div>
                            <h3 className="font-bold text-[#5C67F2] text-xs">Add New</h3>
                        </Link>
                        )}
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden w-full">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50/50">
                                    {selectMode && (
                                        <th className="p-4 w-10">
                                            <input type="checkbox" className="w-4 h-4 accent-[#5C67F2] cursor-pointer" aria-label="Select all"
                                                checked={filteredAndSorted.length > 0 && filteredAndSorted.every((x: any) => selected.has(x._id))}
                                                onChange={e => setSelected(e.target.checked ? new Set(filteredAndSorted.map((x: any) => x._id)) : new Set())} />
                                        </th>
                                    )}
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Student</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Reg No</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Gender</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Class</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={selectMode ? 6 : 5} className="p-8 text-center">
                                            <Loader2 className="w-8 h-8 animate-spin text-[#5C67F2] mx-auto" />
                                        </td>
                                    </tr>
                                ) : (
                                    filteredAndSorted.map((student: any) => (
                                        <tr key={student._id} className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${selected.has(student._id) ? "bg-indigo-50/50" : ""}`}>
                                            {selectMode && (
                                                <td className="p-4 w-10"><input type="checkbox" checked={selected.has(student._id)} onChange={() => toggleSelected(student._id)} className="w-4 h-4 accent-[#5C67F2] cursor-pointer" aria-label={`Select ${student.studentName || student.name}`} /></td>
                                            )}
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden border border-gray-200 text-[#5C67F2]">
                                                        {student.avatar || student.studentPhoto ? (
                                                            <img src={student.avatar || student.studentPhoto} alt={student.studentName || student.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <User className="w-5 h-5" />
                                                        )}
                                                    </div>
                                                    <span className="font-bold text-gray-800 text-sm">{student.studentName || student.name}</span>
                                                    {STATUS_BADGE[norm(statusOf(student))] && (
                                                        <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase ${STATUS_BADGE[norm(statusOf(student))]}`}>{statusOf(student)}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-4 text-xs font-medium text-gray-600">{student.registrationNo || '—'}</td>
                                            <td className="p-4 text-xs font-medium text-gray-600">{student.gender || '—'}</td>
                                            <td className="p-4 text-xs">
                                                {editingId === student._id ? (
                                                    <ClassStreamEditor
                                                        student={student}
                                                        classes={classes}
                                                        saving={isUpdating}
                                                        onCancel={() => setEditingId(null)}
                                                        onSave={(payload) => { updateItem({ id: student._id, ...payload }); setEditingId(null); }}
                                                    />
                                                ) : STATUS_BADGE[norm(statusOf(student))] ? (
                                                    // Transferred / graduated: they are out of their class, so show the class they were in (read-only).
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-gray-400 uppercase">{student.studentClass || student.currentClass || student.statusPrevClass?.studentClass || '—'}</span>
                                                        {(student.studentClass || student.currentClass || student.statusPrevClass?.studentClass) && <span className="text-[9px] font-bold uppercase text-gray-400">previous</span>}
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-[#5C67F2] uppercase">{student.studentClass || '—'}</span>
                                                        {canUpdate && (
                                                            <button onClick={() => setEditingId(student._id)} className="text-gray-300 hover:text-[#5C67F2] transition-colors" title="Edit class & stream">
                                                                <Edit className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Link to={`/students/report/${student._id}`} className="w-8 h-8 rounded-full bg-blue-50 hover:bg-blue-100 text-[#5C67F2] flex items-center justify-center transition-colors">
                                                        <Search className="w-4 h-4" />
                                                    </Link>
                                                    <button 
                                                        onClick={() => navigate(`/students/edit/${student._id}`)}
                                                        className="w-8 h-8 rounded-full bg-orange-50 hover:bg-orange-100 text-orange-600 flex items-center justify-center transition-colors"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                    <button 
                                                        onClick={() => { if(confirm("Move this student to Trash? You can restore them from there.")) deleteItem(student._id); }}
                                                        className="w-8 h-8 rounded-full bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                                {!isLoading && (
                                    <tr>
                                        <td colSpan={selectMode ? 6 : 5} className="p-4 text-center">
                                            <Link to="/students/new" className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-[#5C67F2] font-bold rounded-lg transition-colors text-sm border border-indigo-100">
                                                <Plus className="w-4 h-4" /> Add New Student
                                            </Link>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {selectMode && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
                    <div className="bg-gray-900 text-white pl-5 pr-3 py-3 rounded-2xl shadow-2xl flex items-center gap-4 text-sm font-bold">
                        <span>{selected.size} selected</span>
                        {selected.size > 0 && <button onClick={() => setSelected(new Set())} className="text-xs text-gray-400 hover:text-white">Clear</button>}
                        <button onClick={() => setConfirmDelete(true)} disabled={selected.size === 0}
                            className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 disabled:opacity-40 disabled:hover:bg-rose-500 text-xs font-black uppercase tracking-wide flex items-center gap-1.5 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" /> Delete {selected.size > 1 ? "students" : "student"}
                        </button>
                        <button onClick={exitSelect} className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center" title="Cancel"><X className="w-4 h-4" /></button>
                    </div>
                </div>
            )}

            {confirmDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => !deleting && setConfirmDelete(false)}>
                    <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
                        <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center"><Trash2 className="w-5 h-5" /></div>
                        <div>
                            <h3 className="font-black text-slate-800 text-lg">Delete {selected.size} student{selected.size === 1 ? "" : "s"}?</h3>
                            <p className="text-sm text-slate-500 mt-1">They move to the Trash, where they can be restored. Deleting them for good needs the administrator's password and an emailed code.</p>
                        </div>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setConfirmDelete(false)} disabled={deleting} className="px-5 py-2.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">Cancel</button>
                            <button onClick={deleteSelected} disabled={deleting} className="px-5 py-2.5 rounded-xl font-bold text-white bg-rose-500 hover:bg-rose-600 transition-colors flex items-center gap-2 disabled:opacity-60">
                                {deleting && <Loader2 className="w-4 h-4 animate-spin" />} Move to Trash
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showTrash && <StudentTrashDialog onClose={() => setShowTrash(false)} />}
        </div>
    );
}

// Inline class + stream editor for a student row. Picks a v2 class then a v2
// stream, and saves both the ids and the denormalised text the rest of the app
// reads (studentClass = "Form 4 East", stream = "East").
function ClassStreamEditor({ student, classes, saving, onCancel, onSave }: {
    student: any;
    classes: any[];
    saving: boolean;
    onCancel: () => void;
    onSave: (payload: any) => void;
}) {
    // Pre-select the student's current class. We TRUST the displayed class TEXT
    // (studentClass, e.g. "Form 4 West") over a possibly-stale classId, because the
    // list shows that text. Match the v2 class whose name is the class LEVEL of that
    // text ("Form 4"). Only fall back to classId if the text gives no match.
    const displayText = norm(student.studentClass || student.currentClass || student.className);
    const levelKey = (v: string) => { const m = String(v).match(/(form|grade)\s*\d+/i); return m ? m[0].replace(/\s+/g, " ").toLowerCase().trim() : ""; };
    const wantLevel = levelKey(displayText);
    const byText = classes.find((c: any) => {
        const cn = norm(c.name);
        return cn === displayText || (wantLevel && levelKey(cn) === wantLevel) || (cn && displayText.startsWith(cn + " ")) || cn === displayText;
    });
    const byId = classes.find((c: any) => String(c._id) === String(student.classId));
    const initialClass = byText || byId;
    const [classId, setClassId] = useState<string>(initialClass?._id ? String(initialClass._id) : "");
    // Pre-select the stream from streamId, else the stream word in the class text.
    const streamWord = (() => { const m = String(student.studentClass || "").match(/(?:form|grade)\s*\d+\s+(.+)$/i); return m ? m[1].trim() : ""; })();
    const [streamId, setStreamId] = useState<string>(student.streamId ? String(student.streamId) : "");
    const [streamPreset] = useState<string>(norm(student.streamName || student.stream || streamWord));

    const { data: streams = [] } = useQuery<any[]>({
        queryKey: ["v2_streams", classId],
        enabled: !!classId,
        queryFn: async () => (await api.get("/v2/streams", { params: { classId } })).data || [],
    });
    const cls = classes.find((c: any) => String(c._id) === classId);
    const stream = streams.find((s: any) => String(s._id) === streamId);

    // Once the class's streams load, pre-select the student's current stream by name
    // (when we don't already have a streamId).
    useEffect(() => {
        if (streamId || !streamPreset || !streams.length) return;
        const match = streams.find((s: any) => norm(s.name) === streamPreset);
        if (match) setStreamId(String(match._id));
    }, [streams, streamPreset, streamId]);

    const save = () => {
        if (!cls) { onCancel(); return; }
        const fullName = stream ? (stream.fullName || `${cls.name} ${stream.name}`) : cls.name;
        onSave({
            classId,
            className: cls.name,
            studentClass: fullName,   // denormalised label used across the app
            currentClass: fullName,
            streamId: streamId || null,
            stream: stream?.name || "",
            streamName: stream?.name || "",
        });
    };

    return (
        <div className="flex items-center gap-1.5">
            <select value={classId} onChange={e => { setClassId(e.target.value); setStreamId(""); }} className="h-8 px-2 border border-gray-200 rounded-md text-xs bg-white">
                <option value="">— Class —</option>
                {classes.map((c: any) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
            <select value={streamId} onChange={e => setStreamId(e.target.value)} disabled={!classId} className="h-8 px-2 border border-gray-200 rounded-md text-xs bg-white disabled:bg-gray-50">
                <option value="">No stream</option>
                {streams.map((s: any) => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
            <button onClick={save} disabled={!classId || saving} className="w-7 h-7 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-600 flex items-center justify-center disabled:opacity-40" title="Save">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            </button>
            <button onClick={onCancel} className="w-7 h-7 rounded-full bg-gray-50 hover:bg-gray-100 text-gray-500 flex items-center justify-center" title="Cancel">
                <X className="w-3.5 h-3.5" />
            </button>
        </div>
    );
}
