/**
 * Teachers Management
 * Each teacher can be assigned:
 *   1. As CLASS TEACHER of a specific class (homeroom)
 *   2. As SUBJECT TEACHER — which subject they teach + which class they teach it to
 *
 * Subject assignments stored on staff.subjectAssignments:
 *   [{ subjectId, subjectName, classId, className }]
 */
import { useState, useMemo } from "react";
import {
    Search, GraduationCap, BookOpen, Users, Check, X, Loader2,
    School, Plus, Trash2, ChevronDown, ArrowRight
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";

interface SubjectAssignment {
    subjectId: string;
    subjectName: string;
    classId: string;
    className: string;
}

export default function Teachers() {
    const qc = useQueryClient();
    const [search, setSearch]               = useState("");
    const [assigningTeacher, setAssigning]  = useState<any>(null);
    const [editClassId, setEditClassId]     = useState("");
    const [subjectAssignments, setSubjectAssignments] = useState<SubjectAssignment[]>([]);
    // New row being added
    const [newSubjectId, setNewSubjectId]   = useState("");
    const [newClassId, setNewClassId]       = useState("");

    // ── Queries ────────────────────────────────────────────────────────────────
    const { data: allStaff = [], isLoading } = useQuery<any[]>({
        queryKey: ["staff"],
        queryFn: async () => (await api.get("/staff")).data || [],
    });
    const { data: subjects = [] } = useQuery<any[]>({
        queryKey: ["subjects"],
        queryFn: async () => (await api.get("/subjects")).data || [],
    });
    const { data: classes = [] } = useQuery<any[]>({
        queryKey: ["classes"],
        queryFn: async () => (await api.get("/academics/classes")).data || [],
    });

    // ── Derived ───────────────────────────────────────────────────────────────
    const teachers = useMemo(() => {
        const all = allStaff.filter((s: any) => {
            const d = (s.designation || "").toLowerCase();
            const r = (s.role || "").toLowerCase();
            return d.includes("teacher") || r.includes("teacher") || s.isTeachingStaff;
        });
        if (!search.trim()) return all;
        const q = search.toLowerCase();
        return all.filter((s: any) =>
            (s.employeeName || s.name || "").toLowerCase().includes(q) ||
            (s.email || "").toLowerCase().includes(q)
        );
    }, [allStaff, search]);

    const classTeacherMap = useMemo(() => {
        const m: Record<string, string> = {};
        classes.forEach((c: any) => { if (c.classTeacherId) m[c.classTeacherId] = c.levelName || c.name; });
        return m;
    }, [classes]);

    const withSubjects = teachers.filter((t: any) => (t.subjectAssignments || t.specializedSubjects || []).length > 0).length;
    const withClass    = teachers.filter((t: any) => classTeacherMap[t._id]).length;

    // ── Open modal ────────────────────────────────────────────────────────────
    const openAssign = (teacher: any) => {
        setAssigning(teacher);
        const assignedClass = classes.find((c: any) => c.classTeacherId === teacher._id);
        setEditClassId(assignedClass?._id || "");
        // Load existing subject assignments
        const existing: SubjectAssignment[] = teacher.subjectAssignments || [];
        // Migrate from old specializedSubjects if needed
        if (existing.length === 0 && (teacher.specializedSubjects || []).length > 0) {
            const migrated = (teacher.specializedSubjects || []).map((sid: string) => {
                const sub = subjects.find((s: any) => s._id?.toString() === sid);
                return sub ? { subjectId: sid, subjectName: sub.name || sub.subjectName, classId: "", className: "" } : null;
            }).filter(Boolean);
            setSubjectAssignments(migrated as SubjectAssignment[]);
        } else {
            setSubjectAssignments(existing);
        }
        setNewSubjectId(""); setNewClassId("");
    };

    const closeModal = () => { setAssigning(null); setSubjectAssignments([]); setEditClassId(""); setNewSubjectId(""); setNewClassId(""); };

    // ── Add a new subject-class assignment ────────────────────────────────────
    const addAssignment = () => {
        if (!newSubjectId) { toast.error("Select a subject first"); return; }
        const sub = subjects.find((s: any) => s._id?.toString() === newSubjectId);
        const cls = classes.find((c: any) => c._id === newClassId);
        // Prevent exact duplicate
        const duplicate = subjectAssignments.some(a => a.subjectId === newSubjectId && a.classId === newClassId);
        if (duplicate) { toast.error("This subject-class combination is already assigned"); return; }
        setSubjectAssignments(prev => [...prev, {
            subjectId:   newSubjectId,
            subjectName: sub?.name || sub?.subjectName || "Subject",
            classId:     newClassId,
            className:   cls?.levelName || cls?.name || (newClassId ? "Class" : "All Classes"),
        }]);
        setNewSubjectId(""); setNewClassId("");
    };

    const removeAssignment = (idx: number) => setSubjectAssignments(prev => prev.filter((_, i) => i !== idx));

    // ── Save ──────────────────────────────────────────────────────────────────
    const saveMut = useMutation({
        mutationFn: async () => {
            if (!assigningTeacher) return;
            const tid = assigningTeacher._id;
            const teacherName = assigningTeacher.employeeName || assigningTeacher.name || "";
            // Save subject assignments on staff record (backward-compat display)
            const uniqueSubjectIds = [...new Set(subjectAssignments.map(a => a.subjectId).filter(Boolean))];
            await api.patch(`/staff/${tid}`, {
                subjectAssignments,
                specializedSubjects: uniqueSubjectIds,
            });
            // Single source of truth: also write each assignment to staff_subjects
            // (via /v2/teacher-subjects) so the "Assign Teachers to Subjects" page +
            // report-card initials stay in sync.
            await Promise.all(subjectAssignments.map(a =>
                api.post("/v2/teacher-subjects", {
                    teacherId: tid, teacherName,
                    subjectId: a.subjectId, subjectName: a.subjectName,
                    classId: a.classId || null, className: a.className || "",
                }).catch(() => {})
            ));
            // Class teacher: remove from old class, assign to new
            const prevClass = classes.find((c: any) => c.classTeacherId === tid);
            if (prevClass && prevClass._id !== editClassId) {
                await api.patch(`/academics/classes/${prevClass._id}`, { classTeacherId: null }).catch(() => {});
            }
            if (editClassId) {
                await api.patch(`/academics/classes/${editClassId}`, { classTeacherId: tid });
            }
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["staff"] });
            qc.invalidateQueries({ queryKey: ["classes"] });
            qc.invalidateQueries({ queryKey: ["teacher_subjects"] });
            toast.success("Teacher assignments saved successfully");
            closeModal();
        },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed to save"),
    });

    // Get unique subjects already assigned (to show in summary)
    const assignedSubjectNames = [...new Set(subjectAssignments.map(a => a.subjectName))];

    return (
        <div className="flex-1 bg-[#f4f7f6] min-h-screen flex flex-col pb-10">

            {/* Header */}
            <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center">
                        <GraduationCap className="w-5 h-5 text-[#5C67F2]" />
                    </div>
                    <div>
                        <h1 className="font-black text-gray-900 text-base">Teachers</h1>
                        <p className="text-[10px] text-gray-400 font-medium">Assign class and subjects per teacher</p>
                    </div>
                </div>
                <div className="relative w-48 sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
                        className="w-full h-9 pl-9 pr-3 border border-gray-200 rounded-xl text-xs font-medium text-gray-700 focus:outline-none focus:border-[#5C67F2] bg-gray-50" />
                </div>
            </div>

            <div className="px-4 sm:px-6 pt-5 space-y-5">
                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                    {[
                        { l: "Total Teachers", v: teachers.length, icon: GraduationCap, color: "#5C67F2", bg: "bg-indigo-50" },
                        { l: "With Subjects",  v: withSubjects,    icon: BookOpen,      color: "#10B981", bg: "bg-emerald-50" },
                        { l: "Class Teachers", v: withClass,       icon: Users,         color: "#F59E0B", bg: "bg-amber-50" },
                    ].map(s => (
                        <div key={s.l} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
                            <div className={`w-9 h-9 ${s.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                                <s.icon className="w-4 h-4" style={{ color: s.color }} />
                            </div>
                            <div>
                                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">{s.l}</p>
                                <p className="text-xl font-black text-gray-900">{s.v}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Teacher cards */}
                {isLoading ? (
                    <div className="flex items-center justify-center py-16 gap-2 text-gray-400">
                        <Loader2 className="w-5 h-5 animate-spin text-[#5C67F2]" /><span className="text-xs font-bold uppercase">Loading…</span>
                    </div>
                ) : teachers.length === 0 ? (
                    <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 py-14 flex flex-col items-center gap-3 text-gray-300">
                        <GraduationCap className="w-10 h-10" />
                        <p className="text-sm font-bold text-gray-400">No teachers found</p>
                        <p className="text-xs text-gray-400 text-center px-8">Add staff with Teacher designation from Employees → Add New</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {teachers.map((teacher: any, i: number) => {
                            const name        = teacher.employeeName || teacher.name || "—";
                            const assignments: SubjectAssignment[] = teacher.subjectAssignments || [];
                            const className   = classTeacherMap[teacher._id];
                            // Group assignments by subject for display
                            const grouped: Record<string, string[]> = {};
                            assignments.forEach(a => {
                                if (!grouped[a.subjectName]) grouped[a.subjectName] = [];
                                if (a.className) grouped[a.subjectName].push(a.className);
                            });

                            return (
                                <div key={teacher._id}
                                    className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-all">
                                    <div className="flex items-start gap-3 p-4 sm:p-5">
                                        {/* Photo */}
                                        <div className="w-11 h-11 rounded-xl overflow-hidden bg-indigo-50 border border-indigo-100 flex-shrink-0 mt-0.5">
                                            {teacher.avatar || teacher.photo ? (
                                                <img src={teacher.avatar || teacher.photo} alt={name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-[#5C67F2] font-black">{name.charAt(0)}</div>
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <p className="font-black text-gray-900">{name}</p>
                                                    <p className="text-[10px] text-gray-400">{teacher.email || teacher.phone || "—"}</p>
                                                </div>
                                                <button onClick={() => openAssign(teacher)}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase text-[#5C67F2] bg-indigo-50 hover:bg-indigo-100 rounded-xl border border-indigo-100 transition-all flex-shrink-0">
                                                    <BookOpen className="w-3 h-3" /> Assign
                                                </button>
                                            </div>

                                            {/* Class teacher badge */}
                                            {className && (
                                                <div className="flex items-center gap-1.5 mt-2">
                                                    <School className="w-3 h-3 text-emerald-600" />
                                                    <span className="text-[10px] font-black text-emerald-700">Class Teacher: {className}</span>
                                                </div>
                                            )}

                                            {/* Subject assignments */}
                                            {Object.keys(grouped).length > 0 && (
                                                <div className="mt-2 space-y-1">
                                                    {Object.entries(grouped).map(([subName, classes]) => (
                                                        <div key={subName} className="flex items-center gap-1.5 flex-wrap">
                                                            <span className="text-[10px] font-black text-[#5C67F2] bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full flex-shrink-0">
                                                                {subName}
                                                            </span>
                                                            {classes.length > 0 && (
                                                                <>
                                                                    <ArrowRight className="w-2.5 h-2.5 text-gray-300 flex-shrink-0" />
                                                                    <div className="flex flex-wrap gap-1">
                                                                        {classes.map(cn => (
                                                                            <span key={cn} className="text-[9px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full">{cn}</span>
                                                                        ))}
                                                                    </div>
                                                                </>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            {!className && Object.keys(grouped).length === 0 && (
                                                <p className="text-[10px] text-amber-500 font-bold mt-1.5">⚠ No assignments yet — click Assign</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ══════════════════════════════════════════════════════════════
                  ASSIGN MODAL — bottom sheet mobile / centered desktop
            ══════════════════════════════════════════════════════════════ */}
            {assigningTeacher && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white w-full sm:max-w-xl sm:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh] overflow-hidden">

                        {/* Handle (mobile) */}
                        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mt-3 sm:hidden" />

                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl overflow-hidden bg-indigo-50 border border-indigo-100 flex-shrink-0">
                                    {assigningTeacher.avatar || assigningTeacher.photo
                                        ? <img src={assigningTeacher.avatar || assigningTeacher.photo} alt="" className="w-full h-full object-cover" />
                                        : <div className="w-full h-full flex items-center justify-center text-[#5C67F2] font-black text-sm">{(assigningTeacher.employeeName || assigningTeacher.name || "T").charAt(0)}</div>}
                                </div>
                                <div>
                                    <h2 className="font-black text-gray-900">Assign Teacher</h2>
                                    <p className="text-xs text-gray-400">{assigningTeacher.employeeName || assigningTeacher.name}</p>
                                </div>
                            </div>
                            <button onClick={closeModal} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-red-50 hover:text-red-500 flex items-center justify-center transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Scrollable body */}
                        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">

                            {/* ── 1. CLASS TEACHER ──────────────────────────── */}
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[9px] font-black">1</div>
                                    <p className="text-sm font-black text-gray-800">Class Teacher (Homeroom)</p>
                                </div>
                                <p className="text-[10px] text-gray-400 font-medium mb-3 ml-7">Which class is this teacher the homeroom teacher for?</p>

                                <div className="relative">
                                    <select value={editClassId} onChange={e => setEditClassId(e.target.value)}
                                        className="w-full h-11 px-4 pr-10 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 focus:outline-none focus:border-emerald-400 appearance-none transition-colors">
                                        <option value="">— Not a class teacher —</option>
                                        {classes.map((c: any) => {
                                            const isTaken = c.classTeacherId && c.classTeacherId !== assigningTeacher._id;
                                            return (
                                                <option key={c._id} value={c._id} disabled={isTaken}>
                                                    {c.levelName || c.name}{isTaken ? " (assigned)" : ""}
                                                </option>
                                            );
                                        })}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                </div>
                                {editClassId && (
                                    <p className="text-[10px] text-emerald-600 font-bold mt-1.5 flex items-center gap-1">
                                        <School className="w-3 h-3" />
                                        Class teacher of: {classes.find((c: any) => c._id === editClassId)?.levelName || "Selected class"}
                                    </p>
                                )}
                            </div>

                            {/* ── 2. SUBJECT-CLASS ASSIGNMENTS ─────────────── */}
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="w-5 h-5 rounded-full bg-indigo-100 text-[#5C67F2] flex items-center justify-center text-[9px] font-black">2</div>
                                    <p className="text-sm font-black text-gray-800">Subjects This Teacher Teaches</p>
                                </div>
                                <p className="text-[10px] text-gray-400 font-medium mb-3 ml-7">
                                    Specify which subject they teach and which class they teach it to.
                                </p>

                                {/* Existing assignments */}
                                {subjectAssignments.length > 0 && (
                                    <div className="space-y-2 mb-3">
                                        {subjectAssignments.map((a, idx) => (
                                            <div key={idx}
                                                className="flex items-center gap-3 bg-indigo-50/60 border border-indigo-100 rounded-xl px-3 py-2.5">
                                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                                    <span className="text-xs font-black text-[#5C67F2] bg-white border border-indigo-200 px-2.5 py-1 rounded-full flex-shrink-0">
                                                        {a.subjectName}
                                                    </span>
                                                    <ArrowRight className="w-3.5 h-3.5 text-indigo-300 flex-shrink-0" />
                                                    <span className="text-xs font-bold text-gray-600 bg-white border border-gray-200 px-2.5 py-1 rounded-full truncate">
                                                        {a.className || "All Classes"}
                                                    </span>
                                                </div>
                                                <button onClick={() => removeAssignment(idx)}
                                                    className="w-6 h-6 rounded-full bg-red-50 hover:bg-red-100 text-red-400 hover:text-red-600 flex items-center justify-center transition-colors flex-shrink-0">
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Add new assignment row */}
                                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3 space-y-2">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Add Assignment</p>
                                    <div className="flex items-center gap-2">
                                        {/* Subject select */}
                                        <div className="relative flex-1">
                                            <select value={newSubjectId} onChange={e => setNewSubjectId(e.target.value)}
                                                className="w-full h-10 px-3 pr-8 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 focus:outline-none focus:border-[#5C67F2] appearance-none">
                                                <option value="">Subject…</option>
                                                {subjects.map((s: any) => <option key={s._id} value={s._id?.toString()}>{s.name || s.subjectName}</option>)}
                                            </select>
                                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                                        {/* Class select */}
                                        <div className="relative flex-1">
                                            <select value={newClassId} onChange={e => setNewClassId(e.target.value)}
                                                className="w-full h-10 px-3 pr-8 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 focus:outline-none focus:border-[#5C67F2] appearance-none">
                                                <option value="">All Classes</option>
                                                {classes.map((c: any) => <option key={c._id} value={c._id}>{c.levelName || c.name}</option>)}
                                            </select>
                                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                                        </div>
                                        <button onClick={addAssignment} disabled={!newSubjectId}
                                            className="w-10 h-10 bg-[#5C67F2] hover:bg-[#4a54c4] disabled:opacity-40 text-white rounded-xl flex items-center justify-center flex-shrink-0 transition-all shadow-sm">
                                            <Plus className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <p className="text-[9px] text-gray-400 font-medium">
                                        Leave "All Classes" if this teacher teaches this subject to all classes
                                    </p>
                                </div>

                                {subjectAssignments.length === 0 && (
                                    <p className="text-[10px] text-amber-500 font-bold mt-2 flex items-center gap-1">
                                        ⚠ No subject assignments yet
                                    </p>
                                )}
                            </div>

                            {/* Summary */}
                            {(editClassId || subjectAssignments.length > 0) && (
                                <div className="bg-[#5C67F2]/5 border border-[#5C67F2]/20 rounded-2xl px-4 py-3">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-[#5C67F2] mb-2">Summary</p>
                                    <div className="space-y-1">
                                        {editClassId && (
                                            <p className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                                                <School className="w-3.5 h-3.5 text-emerald-600" />
                                                Class teacher of <span className="text-emerald-700">{classes.find((c: any) => c._id === editClassId)?.levelName || "—"}</span>
                                            </p>
                                        )}
                                        {assignedSubjectNames.length > 0 && (
                                            <p className="text-xs font-bold text-gray-700 flex items-start gap-1.5">
                                                <BookOpen className="w-3.5 h-3.5 text-[#5C67F2] flex-shrink-0 mt-0.5" />
                                                Teaches: {assignedSubjectNames.join(", ")}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="flex gap-3 px-5 py-4 border-t border-gray-100 flex-shrink-0 bg-white">
                            <button onClick={closeModal}
                                className="flex-1 h-11 border border-gray-200 text-gray-500 font-bold text-sm rounded-xl hover:bg-gray-50 transition-all">
                                Cancel
                            </button>
                            <button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}
                                className="flex-1 h-11 bg-[#5C67F2] hover:bg-[#4a54c4] text-white font-black text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50">
                                {saveMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                Save Assignments
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
