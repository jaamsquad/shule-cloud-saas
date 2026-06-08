import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Loader2, Save, Trash2, Pencil, ArrowLeft, Settings as SettingsIcon,
    CalendarClock, Users, Calculator, FileQuestion, MonitorCheck, UserCheck,
    BarChart3, ShieldCheck, ShieldAlert, FileText, Bell, Sliders,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

type FieldType = "text" | "number" | "textarea" | "select" | "date" | "time" | "toggle";
interface Field { k: string; label: string; type: FieldType; scope: "general" | "settings"; options?: string[] }
interface Section { title: string; icon: any; fields: Field[] }

const S = (k: string, label: string, type: FieldType, options?: string[]): Field => ({ k, label, type, scope: "settings", options });
const G = (k: string, label: string, type: FieldType, options?: string[]): Field => ({ k, label, type, scope: "general", options });

const SECTIONS: Section[] = [
    { title: "General Exam Settings", icon: SettingsIcon, fields: [
        G("examName", "Exam Name", "text"),
        G("examCode", "Exam Code", "text"),
        G("academicYear", "Academic Year", "text"),
        G("term", "Term / Semester", "text"),
        G("type", "Examination Type", "select", ["CAT", "Midterm", "End-Term", "Mock", "Final"]),
        G("remarks", "Description / Instructions", "textarea"),
        G("status", "Status", "select", ["Draft", "Active", "Completed", "Archived"]),
    ]},
    { title: "Scheduling Settings", icon: CalendarClock, fields: [
        S("examDate", "Exam Date", "date"),
        S("startTime", "Start Time", "time"),
        S("endTime", "End Time", "time"),
        S("duration", "Duration (minutes)", "number"),
        S("venue", "Exam Venue / Room", "text"),
        S("session", "Exam Session", "select", ["Morning", "Afternoon", "Evening"]),
        S("allowLateEntry", "Allow Late Entry", "toggle"),
        S("timetableAssignment", "Exam Timetable Assignment", "text"),
    ]},
    { title: "Class & Subject Settings", icon: Users, fields: [
        S("classAssignment", "Class / Grade Assignment", "text"),
        S("streamAssignment", "Stream Assignment", "text"),
        S("subjectSelection", "Subject Selection", "text"),
        S("examinerAssignment", "Teacher / Examiner Assignment", "text"),
        S("multipleClassSupport", "Multiple Class Support", "toggle"),
    ]},
    { title: "Marks & Grading Settings", icon: Calculator, fields: [
        S("totalMarks", "Total Marks", "number"),
        S("passingMarks", "Passing Marks", "number"),
        S("passPercentage", "Pass Percentage", "number"),
        S("weight", "Weight Contribution to Final Grade (%)", "number"),
        S("gradingSystem", "Grading System Selection", "select", ["KCSE (8-4-4)", "CBC", "Cambridge", "IB", "Custom"]),
        S("autoGrade", "Auto Grade Calculation", "toggle"),
        S("gpaCalculation", "GPA Calculation", "toggle"),
        S("autoRank", "Rank Students Automatically", "toggle"),
    ]},
    { title: "Question Settings", icon: FileQuestion, fields: [
        S("numberOfQuestions", "Number of Questions", "number"),
        S("questionTypes", "Question Types (MCQ, Essay, Short Answer, Practical)", "text"),
        S("randomizeQuestions", "Randomize Questions", "toggle"),
        S("randomizeChoices", "Randomize Answer Choices", "toggle"),
        S("questionBank", "Question Bank Selection", "text"),
        S("negativeMarking", "Negative Marking", "toggle"),
        S("marksPerQuestion", "Marks per Question", "number"),
    ]},
    { title: "Online Exam Settings", icon: MonitorCheck, fields: [
        S("browserLockdown", "Browser Lockdown", "toggle"),
        S("webcamMonitoring", "Webcam Monitoring", "toggle"),
        S("autoSubmit", "Auto Submit on Time Expiry", "toggle"),
        S("oneQuestionPerPage", "One Question per Page", "toggle"),
        S("allowBackNavigation", "Allow Back Navigation", "toggle"),
        S("shuffleQuestions", "Shuffle Questions", "toggle"),
        S("timeLimitEnforcement", "Time Limit Enforcement", "toggle"),
    ]},
    { title: "Student Access Settings", icon: UserCheck, fields: [
        S("eligibleStudents", "Eligible Students", "text"),
        S("specialAccommodation", "Special Accommodation Students", "text"),
        S("retakeEligibility", "Retake Eligibility", "toggle"),
        S("registrationRequired", "Exam Registration Required", "toggle"),
        S("admitCardRequired", "Admit Card Requirement", "toggle"),
    ]},
    { title: "Results Settings", icon: BarChart3, fields: [
        S("autoPublishResults", "Auto Publish Results", "toggle"),
        S("manualApproval", "Manual Approval Before Publishing", "toggle"),
        S("resultReleaseDate", "Result Release Date", "date"),
        S("showMarks", "Show Marks to Students", "toggle"),
        S("showGrades", "Show Grades to Students", "toggle"),
        S("showRankings", "Show Rankings", "toggle"),
        S("showComments", "Show Teacher Comments", "toggle"),
    ]},
    { title: "Security Settings", icon: ShieldCheck, fields: [
        S("examPassword", "Exam Password", "text"),
        S("accessPin", "Access PIN", "text"),
        S("ipRestrictions", "IP Restrictions", "text"),
        S("deviceRestrictions", "Device Restrictions", "text"),
        S("visibility", "Exam Visibility", "select", ["Public", "Restricted", "Hidden"]),
    ]},
    { title: "Anti-Cheating Settings", icon: ShieldAlert, fields: [
        S("antiCheating", "Anti-Cheating Enabled", "toggle"),
        S("tabSwitchDetection", "Tab Switch Detection", "toggle"),
        S("copyPasteBlock", "Block Copy / Paste", "toggle"),
        S("plagiarismCheck", "Plagiarism Check", "toggle"),
    ]},
    { title: "Reports Settings", icon: FileText, fields: [
        S("generateReportCards", "Generate Report Cards", "toggle"),
        S("subjectAnalysis", "Generate Subject Analysis", "toggle"),
        S("classPerformance", "Generate Class Performance Reports", "toggle"),
        S("teacherPerformance", "Generate Teacher Performance Reports", "toggle"),
        S("exportPDF", "Export to PDF", "toggle"),
        S("exportExcel", "Export to Excel", "toggle"),
    ]},
    { title: "Notifications Settings", icon: Bell, fields: [
        S("notifyStudents", "Notify Students", "toggle"),
        S("notifyParents", "Notify Parents", "toggle"),
        S("notifyTeachers", "Notify Teachers", "toggle"),
        S("smsNotifications", "SMS Notifications", "toggle"),
        S("emailNotifications", "Email Notifications", "toggle"),
        S("resultsAlerts", "Results Publication Alerts", "toggle"),
    ]},
    { title: "Advanced Settings", icon: Sliders, fields: [
        S("moderationRequired", "Moderation Required", "toggle"),
        S("markingWorkflowApproval", "Marking Workflow Approval", "toggle"),
        S("recheckRequests", "Recheck / Re-mark Requests", "toggle"),
        S("lockAfterSubmission", "Exam Lock After Submission", "toggle"),
        S("carryForwardMarks", "Carry Forward Marks", "toggle"),
        S("combineExams", "Combine Multiple Exams", "toggle"),
        S("subjectWeighting", "Subject Weighting Configuration", "text"),
    ]},
];

export default function ExamSettings() {
    const { id } = useParams();
    const navigate = useNavigate();
    const qc = useQueryClient();
    const [general, setGeneral] = useState<any>({});
    const [settings, setSettings] = useState<any>({});
    const [confirmDelete, setConfirmDelete] = useState(false);

    const { data: exam, isLoading } = useQuery({
        queryKey: ["exam_settings", id],
        queryFn: async () => (await api.get(`/academics/exams/${id}`)).data,
        enabled: !!id,
    });

    useEffect(() => {
        if (!exam) return;
        setGeneral({
            examName: exam.examName || "", examCode: exam.examCode || "", academicYear: exam.academicYear || "",
            term: exam.term || "", type: exam.type || "", remarks: exam.remarks || "", status: exam.status || "Draft",
        });
        setSettings({ allowMarksEntry: exam.settings?.allowMarksEntry !== false, ...(exam.settings || {}) });
    }, [exam]);

    const save = useMutation({
        mutationFn: async () => api.patch(`/academics/exams/${id}`, { ...general, settings }),
        onSuccess: () => { toast.success("Exam settings saved"); qc.invalidateQueries({ queryKey: ["exam_settings", id] }); qc.invalidateQueries({ queryKey: ["exams"] }); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Save failed"),
    });

    const del = useMutation({
        mutationFn: async () => api.delete(`/academics/exams/${id}`),
        onSuccess: () => { toast.success("Exam deleted"); navigate("/exams/create"); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Delete failed"),
    });

    const get = (f: Field) => (f.scope === "general" ? general[f.k] : settings[f.k]);
    const set = (f: Field, v: any) =>
        f.scope === "general" ? setGeneral((g: any) => ({ ...g, [f.k]: v })) : setSettings((s: any) => ({ ...s, [f.k]: v }));

    if (isLoading) return <div className="flex-1 flex items-center justify-center min-h-screen bg-[#f8fafc]"><Loader2 className="w-8 h-8 animate-spin text-[#5C67F2]" /></div>;

    const allowMarks = settings.allowMarksEntry !== false;
    const isActive = general.status === "Active";

    const renderField = (f: Field) => {
        const v = get(f);
        if (f.type === "toggle") {
            return (
                <button onClick={() => set(f, !v)}
                    className={`relative w-11 h-6 rounded-full transition-colors ${v ? "bg-[#5C67F2]" : "bg-slate-300"}`}>
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${v ? "translate-x-5" : ""}`} />
                </button>
            );
        }
        if (f.type === "select") {
            return (
                <select value={v || ""} onChange={e => set(f, e.target.value)}
                    className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-[#5C67F2]">
                    <option value="">— Select —</option>
                    {f.options!.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
            );
        }
        if (f.type === "textarea") {
            return <textarea value={v || ""} onChange={e => set(f, e.target.value)} rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#5C67F2]" />;
        }
        return <input type={f.type === "number" ? "number" : f.type === "date" ? "date" : f.type === "time" ? "time" : "text"}
            value={v ?? ""} onChange={e => set(f, f.type === "number" ? Number(e.target.value) : e.target.value)}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#5C67F2]" />;
    };

    return (
        <div className="flex-1 bg-[#f8fafc] min-h-screen pb-16">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-6 py-4 flex flex-wrap items-center gap-3 shadow-sm">
                <button onClick={() => navigate("/exams/create")} className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50">
                    <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="flex-1 min-w-0">
                    <h1 className="text-lg font-black text-slate-800 truncate">{general.examName || "Exam"} — Settings</h1>
                    <p className="text-xs text-slate-400">{general.examCode} · {general.academicYear} {general.term ? `· ${general.term}` : ""}</p>
                </div>
                <button onClick={() => navigate(`/exams/edit/${id}`)} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50">
                    <Pencil className="w-3.5 h-3.5" /> Edit Basics
                </button>
                <button onClick={() => setConfirmDelete(true)} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-rose-200 text-rose-600 text-xs font-bold hover:bg-rose-50">
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
                <button onClick={() => save.mutate()} disabled={save.isPending} className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-[#5C67F2] text-white text-xs font-black hover:opacity-90 disabled:opacity-50">
                    {save.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save Settings
                </button>
            </div>

            {confirmDelete && (
                <div className="mx-6 mt-4 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 flex items-center justify-between">
                    <p className="text-xs font-bold text-rose-700">Delete <span className="font-black">{general.examName}</span>? This cannot be undone.</p>
                    <div className="flex gap-2">
                        <button onClick={() => setConfirmDelete(false)} className="text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-200">Cancel</button>
                        <button onClick={() => del.mutate()} disabled={del.isPending} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-rose-600 text-white">Confirm Delete</button>
                    </div>
                </div>
            )}

            {/* Quick actions */}
            <div className="px-6 mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-black text-slate-800">Allow Marks Entry</p>
                        <p className="text-xs text-slate-400">Teachers can enter marks for this exam from their portal</p>
                    </div>
                    <button onClick={() => setSettings((s: any) => ({ ...s, allowMarksEntry: !allowMarks }))}
                        className={`relative w-12 h-7 rounded-full transition-colors ${allowMarks ? "bg-emerald-500" : "bg-slate-300"}`}>
                        <span className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full transition-transform ${allowMarks ? "translate-x-5" : ""}`} />
                    </button>
                </div>
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-black text-slate-800">Exam Active</p>
                        <p className="text-xs text-slate-400">Toggle between Active and Draft (inactive)</p>
                    </div>
                    <button onClick={() => setGeneral((g: any) => ({ ...g, status: isActive ? "Draft" : "Active" }))}
                        className={`relative w-12 h-7 rounded-full transition-colors ${isActive ? "bg-emerald-500" : "bg-slate-300"}`}>
                        <span className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full transition-transform ${isActive ? "translate-x-5" : ""}`} />
                    </button>
                </div>
            </div>

            {/* Sections */}
            <div className="px-6 mt-5 space-y-5 max-w-5xl">
                {SECTIONS.map(sec => (
                    <div key={sec.title} className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-100 bg-slate-50/60">
                            <sec.icon className="w-4 h-4 text-[#5C67F2]" />
                            <h2 className="text-sm font-black text-slate-700">{sec.title}</h2>
                        </div>
                        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                            {sec.fields.map(f => (
                                <div key={f.k} className={`${f.type === "textarea" ? "md:col-span-2" : ""} ${f.type === "toggle" ? "flex items-center justify-between" : ""}`}>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">{f.label}</label>
                                    {renderField(f)}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
