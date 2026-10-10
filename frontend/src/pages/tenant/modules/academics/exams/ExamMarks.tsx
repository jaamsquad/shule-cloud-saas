import { useState } from "react";
import {
    Search, Save, AlertCircle, Loader2, Home, Users, CheckCircle,
    XCircle, ChevronDown, ArrowLeft, Calculator, Lock, Send, Check
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";
import { motion } from "framer-motion";

// Approval-batch status → badge colours (mirrors the HOD Marks Approval tab).
const BATCH_BADGE: Record<string, string> = {
    Approved: "bg-emerald-100 text-emerald-700", Submitted: "bg-blue-100 text-blue-700",
    Returned: "bg-amber-100 text-amber-700", Rejected: "bg-rose-100 text-rose-700",
    Locked: "bg-slate-800 text-white", Draft: "bg-slate-100 text-slate-500",
};

interface MarkEntry {
    _id?: string;
    studentId: string;
    studentName: string;
    admNo?: string;
    subjectId: string;
    subjectName: string;
    examId: string;
    marksObtained: number | string;
    totalMarks: number;
    grade?: string;
    gradePoints?: number;
    remarks?: string;
    attendanceStatus?: "Present" | "Absent" | "Sick";
}

// Dynamic grade calculator — uses saved tiers, sorted highest-first
function autoGrade(
    marks: number,
    total: number,
    tiers?: Array<{ grade: string; from: number; upto: number; status: string }>
): { grade: string; points: number; remarks: string } {
    const pct = total > 0 ? (marks / total) * 100 : 0;

    // Use saved grading tiers if available
    if (tiers && tiers.length > 0) {
        const sorted = [...tiers].sort((a, b) => b.from - a.from);
        const match = sorted.find(t => pct >= t.from && pct <= t.upto);
        if (match) {
            return {
                grade: match.grade,
                points: parseFloat((match.from / 25).toFixed(1)), // approximate points
                remarks: match.status || (pct >= 50 ? "Pass" : "Fail")
            };
        }
    }

    // Hardcoded fallback
    if (pct >= 80) return { grade: "A+", points: 4.0, remarks: "Excellent" };
    if (pct >= 70) return { grade: "A",  points: 3.5, remarks: "Very Good" };
    if (pct >= 60) return { grade: "B+", points: 3.0, remarks: "Good" };
    if (pct >= 50) return { grade: "B",  points: 2.5, remarks: "Average" };
    if (pct >= 40) return { grade: "C",  points: 2.0, remarks: "Below Average" };
    if (pct >= 33) return { grade: "D",  points: 1.0, remarks: "Poor" };
    return { grade: "F", points: 0.0, remarks: "Fail" };
}

export default function ExamMarks() {
    const [selectedExam, setSelectedExam] = useState<any>(null);
    const [selectedClass, setSelectedClass] = useState<any>(null);
    const [selectedStream, setSelectedStream] = useState<any>(null);   // v2 stream (East/South)
    const [selectedSubject, setSelectedSubject] = useState<any>(null);
    const [entries, setEntries] = useState<MarkEntry[]>([]);
    const [search, setSearch] = useState("");
    const queryClient = useQueryClient();

    // Determine if current user is a teacher (data isolation)
    const currentUser = (() => { try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; } })();
    const isTeacher = (currentUser.role || "").toLowerCase().includes("teacher");
    const teacherName = currentUser.name || "";

    // Exams this person may enter marks for: admins get every exam, teachers only this term's.
    const { data: examsRaw = [] } = useQuery<any[]>({
        queryKey: ["exams_for_marks"],
        queryFn: async () => (await api.get("/academics/exams", { params: { for: "marks" } })).data,
    });
    const { data: marksWindow } = useQuery<any>({
        queryKey: ["marks_window"],
        queryFn: async () => (await api.get("/academics/marks-window")).data,
    });
    const exams = examsRaw;

    // Fetch the full exam detail to get subjectConfigs and missingMarkPolicy
    const { data: examDetail } = useQuery<any>({
        queryKey: ["exam_detail_marks", selectedExam?._id],
        queryFn: async () => (await api.get(`/academics/exams/${selectedExam._id}`)).data,
        enabled: !!selectedExam,
    });
    // subjectConfigs from exam creation — tells us which subjects are examined + their max marks
    const examSubjectConfigs: Array<{ subjectId: string; subjectName: string; maxMarks: number }> =
        examDetail?.subjectConfigs || [];

    // v2 classes (Form 4) + streams (East/South) for the chosen class.
    const { data: classes = [] } = useQuery<any[]>({
        queryKey: ["v2_classes"],
        queryFn: async () => (await api.get("/v2/classes")).data || [],
    });
    const { data: streams = [] } = useQuery<any[]>({
        queryKey: ["v2_streams", selectedClass?._id],
        enabled: !!selectedClass?._id,
        queryFn: async () => (await api.get("/v2/streams", { params: { classId: selectedClass._id } })).data || [],
    });

    const { data: subjectsRaw = [] } = useQuery<any[]>({
        queryKey: ["subjects"],
        queryFn: async () => (await api.get("/subjects")).data,
    });
    // Filter subjects: if exam has subjectConfigs, only show those subjects
    const subjects = (() => {
        let base = isTeacher
            ? subjectsRaw.filter((s: any) =>
                !s.teacherId ||
                s.teacherName?.toLowerCase().includes(teacherName.toLowerCase()) ||
                s.teacherId === currentUser.id
              )
            : subjectsRaw;

        // If the selected exam has configured subjects, restrict to those only
        if (examSubjectConfigs.length > 0) {
            const allowedIds   = new Set(examSubjectConfigs.map(c => c.subjectId));
            const allowedNames = new Set(examSubjectConfigs.map(c => c.subjectName?.toLowerCase()));
            base = base.filter((s: any) =>
                allowedIds.has(s._id?.toString()) ||
                allowedNames.has((s.name || s.subjectName || "").toLowerCase())
            );
        }
        return base;
    })();

    // Get the max marks for the selected subject from exam's subjectConfigs
    const subjectMaxMarks = (() => {
        if (!selectedSubject || examSubjectConfigs.length === 0) return 100;
        const cfg = examSubjectConfigs.find(c =>
            c.subjectId === selectedSubject._id?.toString() ||
            c.subjectName?.toLowerCase() === (selectedSubject.name || "").toLowerCase()
        );
        return cfg?.maxMarks || 100;
    })();

    const { data: allStudents = [], isLoading: loadingStudents } = useQuery<any[]>({
        queryKey: ["students"],
        queryFn: async () => (await api.get("/students")).data,
    });

    // Fetch grading tiers from the saved setting (same as MarksGrading.tsx settings page)
    const { data: gradingConfig } = useQuery<any>({
        queryKey: ["grading_criteria"],
        queryFn: async () => (await api.get("/grading_criteria")).data?.[0],
    });
    const gradeTiers: Array<{ grade: string; from: number; upto: number; status: string }> =
        gradingConfig?.grades || [];


    // Filter students for the selected class + stream. Match by v2 classId/streamId
    // when stored on the student, else fall back to class/stream TEXT.
    const normTxt = (v: any) => String(v ?? "").toLowerCase().replace(/\s+/g, " ").trim();
    const students = selectedClass
        ? allStudents.filter((s: any) => {
            const classOk = s.classId === selectedClass._id ||
                normTxt(s.studentClass || s.currentClass) === normTxt(selectedClass.name || selectedClass.className);
            if (!classOk) return false;
            if (!selectedStream) return true;   // "All streams"
            return String(s.streamId) === String(selectedStream._id) ||
                normTxt(s.stream || s.streamName) === normTxt(selectedStream.name);
          })
        : [];

    const { data: existingMarks = [] } = useQuery<any[]>({
        queryKey: ["exam-marks", selectedExam?._id, selectedClass?._id, selectedSubject?._id],
        queryFn: async () => {
            if (!selectedExam || !selectedClass || !selectedSubject) return [];
            const r = await api.get(`/academics/exam-marks?examId=${selectedExam._id}&classId=${selectedClass._id}&subjectId=${selectedSubject._id}`);
            return r.data;
        },
        enabled: !!selectedExam && !!selectedClass && !!selectedSubject,
    });

    const saveMutation = useMutation({
        mutationFn: async (data: any[]) => {
            return api.post("/academics/exam-marks/bulk", { entries: data });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["exam-marks"] });
            toast.success("Marks saved successfully!");
        },
        onError: (e: any) => toast.error(e?.response?.data?.message || "Failed to save marks"),
    });

    // ── Approval status of this (exam × subject) batch, so the teacher sees whether
    //    it's Submitted / Approved / Locked / Returned, and can Submit for approval.
    const subjectName = selectedSubject?.name || selectedSubject?.subjectName || "";
    const { data: batchStatus } = useQuery<{ status?: string; _id?: string } | null>({
        queryKey: ["mark_batch_status", selectedExam?._id, subjectName],
        enabled: !!selectedExam?._id && !!subjectName,
        queryFn: async () => {
            const r = await api.get(`/mark-approvals`, { params: { examId: selectedExam._id, subject: subjectName } });
            const list = Array.isArray(r.data) ? r.data : [];
            return list[0] || null;
        },
    });
    const status = batchStatus?.status || "";
    const isLockedStatus = status === "Approved" || status === "Locked";

    const submitMutation = useMutation({
        mutationFn: async () => api.post("/mark-approvals/submit", {
            examId: selectedExam._id,
            examName: selectedExam.examName || selectedExam.name,
            subject: subjectName,
            className: selectedClass?.name || selectedClass?.className,
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["mark_batch_status", selectedExam?._id, subjectName] });
            toast.success("Marks submitted to HOD for approval");
        },
        onError: (e: any) => toast.error(e?.response?.data?.message || "Failed to submit"),
    });

    const loadStudents = () => {
        if (!selectedExam || !selectedClass || !selectedSubject || students.length === 0) {
            return toast.error("Ensure exam, class, subject are selected and students are loaded.");
        }
        const mapped = students.map((s: any) => {
        const name = s.studentName || (s.firstName && s.lastName ? `${s.firstName} ${s.lastName}` : null) || s.fullName || s.name || s.admNo || "Student";
            const adm = s.admissionNumber || s.admNo || s.registrationNo || "—";
            const existing = existingMarks.find((m: any) => m.studentId === s._id);
            if (existing) {
                // Re-calculate grade using saved tiers when loading existing marks
                const m = Number(existing.marksObtained);
                const t = Number(existing.totalMarks) || 100;
                const { grade, points, remarks } = autoGrade(m, t, gradeTiers);
                return { ...existing, studentName: name, admNo: adm, grade, gradePoints: points, remarks };
            }
            return {
                studentId: s._id, studentName: name, admNo: adm,
                subjectId: selectedSubject._id, subjectName: selectedSubject.name,
                examId: selectedExam._id, marksObtained: "", totalMarks: subjectMaxMarks,
                grade: "", remarks: "", attendanceStatus: "Present"
            };
        });
        setEntries(mapped);
        toast.success(`Loaded ${mapped.length} students`);
    };

    const updateEntry = (idx: number, field: keyof MarkEntry, value: any) => {
        setEntries(prev => {
            const updated = [...prev];

            // Cap obtained marks so they never exceed the total marks
            if (field === "marksObtained") {
                const totalMarks = Number(updated[idx].totalMarks) || 100;
                const entered    = Number(value);
                if (!isNaN(entered) && entered > totalMarks) {
                    value = totalMarks; // hard cap
                    toast.error(`Obtained cannot exceed max marks (${totalMarks})`, { id: "marks-cap" });
                }
                if (!isNaN(entered) && entered < 0) value = 0;
            }

            updated[idx] = { ...updated[idx], [field]: value };
            if (field === "marksObtained" || field === "totalMarks") {
                // If totalMarks changes, also re-cap any existing obtained value
                if (field === "totalMarks") {
                    const newTotal = Number(value) || 100;
                    const existing = Number(updated[idx].marksObtained);
                    if (!isNaN(existing) && existing > newTotal) {
                        updated[idx].marksObtained = newTotal;
                    }
                }
                const marks = field === "marksObtained" ? Number(value) : Number(updated[idx].marksObtained);
                const total = field === "totalMarks" ? Number(value) : Number(updated[idx].totalMarks);
                if (!isNaN(marks) && !isNaN(total) && total > 0) {
                    const { grade, points, remarks } = autoGrade(marks, total, gradeTiers);
                    updated[idx].grade = grade;
                    updated[idx].gradePoints = points;
                    updated[idx].remarks = remarks;
                }
            }
            return updated;
        });
    };

    const handleSave = () => {
        if (!selectedExam || !selectedClass || !selectedSubject) return toast.error("Please select exam, class, and subject first");
        if (entries.length === 0) return toast.error("Load students first before saving.");

        // Include all entries that have marks OR are marked Absent (save with 0)
        const toSave = entries
            .filter(e => e.marksObtained !== "" || e.attendanceStatus === "Absent")
            .map(e => ({
                ...e,
                examId: selectedExam._id,
                subjectId: selectedSubject._id,
                subjectName: selectedSubject.name || selectedSubject.subjectName,
                classId: selectedClass._id,
                className: selectedClass.name || selectedClass.className,
                streamId: selectedStream?._id || null,
                streamName: selectedStream?.name || "",
                // Always store as number; 0 for absent
                marksObtained: e.attendanceStatus === "Absent" ? 0 : Number(e.marksObtained),
                totalMarks: Number(e.totalMarks) || 100,
            }));

        if (toSave.length === 0) return toast.error("Enter at least one student's marks before saving.");
        saveMutation.mutate(toSave);
    };

    const filtered = entries.filter(e => (e.studentName || "").toLowerCase().includes(search.toLowerCase()) || (e.admNo || "").toLowerCase().includes(search.toLowerCase()));

    const setupReady = selectedExam && selectedClass && selectedSubject;

    return (
        <div className="flex-1 bg-[#f3f4f6] min-h-screen flex flex-col overflow-y-auto pb-20">
            <div className="w-full bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-2 text-sm">
                    <Home className="w-4 h-4 text-[#5C67F2]" />
                    <span className="text-gray-300">/</span>
                    <span className="font-bold text-gray-600">Exams</span>
                    <span className="text-gray-300">/</span>
                    <span className="font-black text-[#5C67F2]">Add / Update Exam Marks</span>
                </div>
                {setupReady && (
                    <div className="flex items-center gap-2">
                        {status && (
                            <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase ${BATCH_BADGE[status] || "bg-slate-100 text-slate-500"}`}>{status}</span>
                        )}
                        <button onClick={handleSave} disabled={saveMutation.isPending || isLockedStatus} title={isLockedStatus ? "Locked by HOD — ask them to unlock to edit" : ""} className="flex items-center gap-2 px-6 py-2 bg-[#5C67F2] hover:bg-[#4a54c4] text-white rounded-full font-black text-xs tracking-widest uppercase shadow-md shadow-indigo-100 transition-all disabled:opacity-60">
                            {saveMutation.isPending ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</> : isLockedStatus ? <><Lock className="w-3.5 h-3.5" /> Locked</> : <><Save className="w-3.5 h-3.5" /> Save All Marks</>}
                        </button>
                        {!isLockedStatus && status !== "Submitted" && (
                            <button onClick={() => submitMutation.mutate()} disabled={submitMutation.isPending} className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full font-black text-xs tracking-widest uppercase shadow-md transition-all disabled:opacity-60">
                                {submitMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Submit for Approval
                            </button>
                        )}
                    </div>
                )}
            </div>

            <div className="flex-1 px-8 py-8 w-full max-w-7xl mx-auto">
                <h1 className="text-2xl font-black text-slate-800 tracking-tight mb-2">Add / Update Exam Marks</h1>
                <p className="text-slate-400 text-sm font-medium mb-4">Select exam, class, and subject to enter or update student marks.</p>
                {marksWindow?.restricted && (
                    <div className="mb-8 flex items-start gap-2 rounded-xl border border-indigo-100 bg-indigo-50/60 px-4 py-3 text-sm text-indigo-900">
                        <Lock className="w-4 h-4 mt-0.5 flex-shrink-0 text-indigo-500" />
                        <span>Marks entry is open for <b>{marksWindow.label}</b> exams only. Earlier exams are managed by the school administrator.</span>
                    </div>
                )}

                {/* Filters */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    {/* Exam */}
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Select Exam</label>
                        <div className="relative">
                            <select
                                value={selectedExam?._id || ""}
                                onChange={e => setSelectedExam(exams.find((o: any) => o._id === e.target.value) || null)}
                                className="w-full h-12 pl-4 pr-10 border border-gray-200 rounded-2xl text-sm font-bold text-slate-700 bg-white focus:outline-none focus:border-[#5C67F2] appearance-none"
                            >
                                <option value="">— Select Exam —</option>
                                {exams.map((o: any) => (
                                    <option key={o._id} value={o._id}>
                                        {o.examName || o.name || o.label || "Unnamed Exam"}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                    </div>

                    {/* Class (Form 4) */}
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Select Class</label>
                        <div className="relative">
                            <select
                                value={selectedClass?._id || ""}
                                onChange={e => { setSelectedClass(classes.find((o: any) => o._id === e.target.value) || null); setSelectedStream(null); setEntries([]); }}
                                className="w-full h-12 pl-4 pr-10 border border-gray-200 rounded-2xl text-sm font-bold text-slate-700 bg-white focus:outline-none focus:border-[#5C67F2] appearance-none"
                            >
                                <option value="">— Select Class —</option>
                                {classes.map((o: any) => (
                                    <option key={o._id} value={o._id}>
                                        {o.name || "—"}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                    </div>

                    {/* Stream (East / South) */}
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Select Stream</label>
                        <div className="relative">
                            <select
                                value={selectedStream?._id || ""}
                                onChange={e => { setSelectedStream(streams.find((o: any) => o._id === e.target.value) || null); setEntries([]); }}
                                disabled={!selectedClass}
                                className="w-full h-12 pl-4 pr-10 border border-gray-200 rounded-2xl text-sm font-bold text-slate-700 bg-white focus:outline-none focus:border-[#5C67F2] appearance-none disabled:bg-gray-50"
                            >
                                <option value="">All streams</option>
                                {streams.map((o: any) => (
                                    <option key={o._id} value={o._id}>{o.name}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                    </div>

                    {/* Subject */}
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Select Subject</label>
                        <div className="relative">
                            <select
                                value={selectedSubject?._id || ""}
                                onChange={e => setSelectedSubject(subjects.find((o: any) => o._id === e.target.value) || null)}
                                className="w-full h-12 pl-4 pr-10 border border-gray-200 rounded-2xl text-sm font-bold text-slate-700 bg-white focus:outline-none focus:border-[#5C67F2] appearance-none"
                            >
                                <option value="">— Select Subject —</option>
                                {subjects.map((o: any) => (
                                    <option key={o._id} value={o._id}>
                                        {o.name || o.subjectName || o.label || "Unnamed Subject"}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                    </div>
                </div>


                {setupReady && (
                    <div className="mb-4 flex items-center justify-between">
                        <button onClick={loadStudents} className="flex items-center gap-2 px-5 py-2.5 bg-white border border-[#5C67F2] text-[#5C67F2] rounded-full font-black text-xs tracking-widest uppercase hover:bg-indigo-50 transition-all">
                            <Users className="w-3.5 h-3.5" /> Load Students
                        </button>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search student…" className="h-10 pl-10 pr-4 border border-gray-200 rounded-xl text-sm font-medium text-slate-700 bg-white focus:outline-none focus:border-[#5C67F2] placeholder:text-slate-200" />
                        </div>
                    </div>
                )}

                {!setupReady ? (
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center py-20 gap-4">
                        <div className="w-20 h-20 bg-amber-50 rounded-[2rem] flex items-center justify-center">
                            <Calculator className="w-10 h-10 text-amber-500" />
                        </div>
                        <div className="text-center">
                            <h3 className="text-base font-black text-slate-700">Select Exam, Class & Subject</h3>
                            <p className="text-slate-400 text-sm font-medium mt-1">Use the dropdowns above to start entering marks.</p>
                        </div>
                    </div>
                ) : entries.length === 0 ? (
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center py-16 gap-4">
                        <Users className="w-10 h-10 text-slate-300" />
                        <p className="text-slate-400 text-sm font-bold">Click "Load Students" to populate the marks sheet.</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-[#5C67F2]/5 to-transparent">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h3 className="font-black text-slate-700 text-sm">
                                        {selectedExam?.examName} · {selectedClass?.name}{selectedStream ? ` ${selectedStream.name}` : ""} · {selectedSubject?.name}
                                    </h3>
                                    <p className="text-xs text-slate-400 font-medium mt-0.5">
                                        {filtered.length} student(s) · Grades auto-calculated · Max marks: <strong className="text-[#5C67F2]">{subjectMaxMarks}</strong>
                                        {examSubjectConfigs.length > 0 && (
                                            <span className="ml-2 text-emerald-600 font-bold inline-flex items-center gap-1"><Check className="w-3.5 h-3.5" />From exam configuration</span>
                                        )}
                                    </p>
                                </div>
                                {examSubjectConfigs.length > 0 && !examSubjectConfigs.some(c =>
                                    c.subjectId === selectedSubject?._id?.toString() ||
                                    c.subjectName?.toLowerCase() === (selectedSubject?.name || "").toLowerCase()
                                ) && (
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-xl">
                                        <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                                        <span className="text-[10px] font-black text-amber-700">Subject not configured for this exam</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-gray-100">
                                        <th className="px-4 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">#</th>
                                        <th className="px-4 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Student</th>
                                        <th className="px-4 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Adm No</th>
                                        <th className="px-4 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Marks</th>
                                        <th className="px-4 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Obtained</th>
                                        <th className="px-4 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">%</th>
                                        <th className="px-4 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Grade</th>
                                        <th className="px-4 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th>
                                        <th className="px-4 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Remarks</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((entry, idx) => {
                                        const globalIdx = entries.indexOf(entry);
                                        const pct = entry.totalMarks > 0 && entry.marksObtained !== "" ? Math.round((Number(entry.marksObtained) / entry.totalMarks) * 100) : null;
                                        const isAbsent = entry.attendanceStatus === "Absent";
                                        return (
                                            <tr key={entry.studentId} className={`border-b border-gray-50 hover:bg-slate-50/50 transition-colors ${isAbsent ? "opacity-50" : ""}`}>
                                                <td className="px-4 py-3 text-xs font-bold text-slate-400">{idx + 1}</td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-7 h-7 rounded-xl bg-indigo-50 text-[#5C67F2] flex items-center justify-center text-[10px] font-black">
                                                            {(entry.studentName || "?")[0].toUpperCase()}
                                                        </div>
                                                        <span className="text-sm font-black text-slate-700">{entry.studentName}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-xs font-bold text-slate-400">{entry.admNo || "—"}</td>
                                                <td className="px-4 py-3">
                                                    <input type="number" value={entry.totalMarks} onChange={e => updateEntry(globalIdx, "totalMarks", Number(e.target.value))} min="0" className="w-20 h-9 px-3 border border-gray-200 rounded-lg text-sm font-bold text-slate-700 focus:outline-none focus:border-[#5C67F2] text-center" />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <input
                                                        type="number"
                                                        value={entry.marksObtained}
                                                        onChange={e => updateEntry(globalIdx, "marksObtained", e.target.value)}
                                                        disabled={isAbsent}
                                                        min="0"
                                                        max={entry.totalMarks}
                                                        placeholder="—"
                                                        className={`w-20 h-9 px-3 rounded-lg text-sm font-bold text-slate-700 focus:outline-none text-center disabled:bg-gray-50 border ${
                                                            entry.marksObtained !== "" && Number(entry.marksObtained) >= entry.totalMarks
                                                                ? "border-amber-400 bg-amber-50 focus:border-amber-500"
                                                                : "border-gray-200 focus:border-[#5C67F2]"
                                                        }`}
                                                    />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`text-xs font-black ${pct !== null ? (pct >= 50 ? "text-emerald-600" : "text-red-500") : "text-slate-300"}`}>
                                                        {pct !== null ? `${pct}%` : "—"}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`text-xs font-black px-2 py-1 rounded-lg ${entry.grade ? "bg-indigo-50 text-[#5C67F2]" : "text-slate-200"}`}>
                                                        {entry.grade || "—"}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <select value={entry.attendanceStatus || "Present"} onChange={e => updateEntry(globalIdx, "attendanceStatus", e.target.value)} className="h-9 px-3 border border-gray-200 rounded-lg text-xs font-bold text-slate-700 bg-white focus:outline-none focus:border-[#5C67F2]">
                                                        <option>Present</option>
                                                        <option>Absent</option>
                                                        <option>Sick</option>
                                                    </select>
                                                </td>
                                                <td className="px-4 py-3 text-xs font-bold text-slate-400">{entry.remarks || "—"}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <div className="px-6 py-4 border-t border-gray-100 bg-slate-50/50 flex items-center justify-between">
                            <p className="text-xs font-bold text-slate-400">{entries.filter(e => e.marksObtained !== "").length} / {entries.length} marks entered</p>
                            <button onClick={handleSave} disabled={saveMutation.isPending || isLockedStatus} title={isLockedStatus ? "Locked by HOD — ask them to unlock to edit" : ""} className="flex items-center gap-2 px-6 py-2.5 bg-[#5C67F2] hover:bg-[#4a54c4] text-white rounded-full font-black text-xs tracking-widest uppercase shadow-md shadow-indigo-100 transition-all disabled:opacity-60">
                                {saveMutation.isPending ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</> : isLockedStatus ? <><Lock className="w-3.5 h-3.5" /> Locked</> : <><Save className="w-3.5 h-3.5" /> Save All Marks</>}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
