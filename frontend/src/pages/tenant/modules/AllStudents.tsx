import { useState } from "react";
import { Home, Plus, Search, Edit, Trash2, User, Loader2, LayoutGrid, List, Check, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { useItems } from "@/hooks/useItems";
import { useModuleCrud } from "@/contexts/PermissionsContext";

const norm = (v: any) => String(v ?? "").toLowerCase().replace(/\s+/g, " ").trim();

export default function AllStudents() {
    const navigate = useNavigate();
    const { items: students, isLoading, deleteItem, updateItem, isUpdating } = useItems("students");
    const { canCreate, canUpdate, canDelete } = useModuleCrud("students");
    const [searchTerm, setSearchTerm] = useState("");
    const [filterClassId, setFilterClassId] = useState("");   // v2 class filter
    const [filterStreamId, setFilterStreamId] = useState(""); // v2 stream filter
    const [sortBy, setSortBy] = useState("name_asc");
    const [viewMode, setViewMode] = useState<'grid'|'list'>(localStorage.getItem('studentViewMode') as any || 'grid');
    const [editingId, setEditingId] = useState<string | null>(null);   // inline class edit

    // v2 classes (Form 4) + streams for the chosen filter class.
    const { data: classes = [] } = useQuery<any[]>({ queryKey: ["v2_classes"], queryFn: async () => (await api.get("/v2/classes")).data || [] });
    const { data: filterStreams = [] } = useQuery<any[]>({ queryKey: ["v2_streams", filterClassId], enabled: !!filterClassId, queryFn: async () => (await api.get("/v2/streams", { params: { classId: filterClassId } })).data || [] });
    const filterCls = classes.find((c: any) => String(c._id) === filterClassId);
    const filterStream = filterStreams.find((s: any) => String(s._id) === filterStreamId);

    const handleViewModeChange = (mode: 'grid'|'list') => {
        setViewMode(mode);
        localStorage.setItem('studentViewMode', mode);
    };

    // A student matches the class/stream filter by v2 ids or by class/stream TEXT.
    const matchesClassFilter = (s: any) => {
        if (!filterClassId) return true;
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
            return matchesSearch && matchesClassFilter(s);
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
                            {classes.map((c: any) => (
                                <option key={c._id} value={c._id}>{c.name}</option>
                            ))}
                        </select>
                        {/* Stream filter (East/South) */}
                        <select
                            value={filterStreamId}
                            onChange={(e) => setFilterStreamId(e.target.value)}
                            disabled={!filterClassId}
                            className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:border-[#5C67F2] text-sm bg-white font-medium text-gray-700 flex-1 md:flex-none cursor-pointer disabled:bg-gray-50"
                        >
                            <option value="">All Streams</option>
                            {filterStreams.map((s: any) => (
                                <option key={s._id} value={s._id}>{s.name}</option>
                            ))}
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
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
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
                                <div key={student._id} className="w-52 bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col items-center relative hover:shadow-md transition-shadow">
                                    <div className="w-16 h-16 bg-gray-100 rounded-full border-4 border-[#868DF4]/20 flex items-center justify-center overflow-hidden mb-3 text-[#5C67F2]">
                                        {student.avatar || student.studentPhoto ? (
                                            <img src={student.avatar || student.studentPhoto} alt={student.studentName || student.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <User className="w-8 h-8" />
                                        )}
                                    </div>
                                    
                                    <p className="text-[9px] font-bold text-gray-400 mb-0.5">{student.registrationNo || '—'}</p>
                                    <h3 className="font-bold text-gray-800 text-xs tracking-tight mb-1 text-center">{student.studentName || student.name}</h3>
                                    <p className="text-[8px] font-black text-[#5C67F2] uppercase tracking-widest mb-3">{student.studentClass || '—'}</p>

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
                                            onClick={() => { if(confirm("Delete this student?")) deleteItem(student._id); }}
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
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Student</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Reg No</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Class</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={4} className="p-8 text-center">
                                            <Loader2 className="w-8 h-8 animate-spin text-[#5C67F2] mx-auto" />
                                        </td>
                                    </tr>
                                ) : (
                                    filteredAndSorted.map((student: any) => (
                                        <tr key={student._id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
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
                                                </div>
                                            </td>
                                            <td className="p-4 text-xs font-medium text-gray-600">{student.registrationNo || '—'}</td>
                                            <td className="p-4 text-xs">
                                                {editingId === student._id ? (
                                                    <ClassStreamEditor
                                                        student={student}
                                                        classes={classes}
                                                        saving={isUpdating}
                                                        onCancel={() => setEditingId(null)}
                                                        onSave={(payload) => { updateItem({ id: student._id, ...payload }); setEditingId(null); }}
                                                    />
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
                                                        onClick={() => { if(confirm("Delete this student?")) deleteItem(student._id); }}
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
                                        <td colSpan={4} className="p-4 text-center">
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
    // Pre-select the student's current class (by id or by name) and stream.
    const initialClass = classes.find((c: any) =>
        String(c._id) === String(student.classId) || norm(c.name) === norm(student.studentClass) || norm(student.studentClass).startsWith(norm(c.name)));
    const [classId, setClassId] = useState<string>(initialClass?._id ? String(initialClass._id) : "");
    const [streamId, setStreamId] = useState<string>(student.streamId ? String(student.streamId) : "");

    const { data: streams = [] } = useQuery<any[]>({
        queryKey: ["v2_streams", classId],
        enabled: !!classId,
        queryFn: async () => (await api.get("/v2/streams", { params: { classId } })).data || [],
    });
    const cls = classes.find((c: any) => String(c._id) === classId);
    const stream = streams.find((s: any) => String(s._id) === streamId);

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
