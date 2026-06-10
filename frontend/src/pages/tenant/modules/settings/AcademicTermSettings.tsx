import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, CalendarRange, Clock, UserCheck, FileText, ClipboardCheck, Banknote, GraduationCap, BedDouble, Lock, Bell, Coffee, Loader2, Settings } from "lucide-react";
import api from "@/lib/api";
import SettingsBuilder, { SBSection, toggles } from "../communications/SettingsBuilder";

const SECTIONS: SBSection[] = [
    { title: "Basic Term Information", icon: CalendarRange, fields: [
        { k: "academicYear", label: "Academic Year", type: "text" },
        { k: "termName", label: "Term Name", type: "select", options: ["Term 1", "Term 2", "Term 3", "Semester 1", "Semester 2"] },
        { k: "termCode", label: "Term Code", type: "text" },
        { k: "startDate", label: "Term Start Date", type: "date" },
        { k: "endDate", label: "Term End Date", type: "date" },
        { k: "learningWeeks", label: "Number of Learning Weeks", type: "number" },
        { k: "status", label: "Status", type: "select", options: ["Upcoming", "Active", "Closed"] },
        { k: "description", label: "Description", type: "textarea" },
    ]},
    { title: "Academic Calendar — Important Dates", icon: CalendarDays, fields: [
        { k: "schoolOpening", label: "School Opening Date", type: "date" },
        { k: "midTermBreakStart", label: "Mid-Term Break Start", type: "date" },
        { k: "midTermBreakEnd", label: "Mid-Term Break End", type: "date" },
        { k: "closingDate", label: "Closing Date", type: "date" },
        { k: "reportingDay", label: "Reporting Day", type: "date" },
        { k: "parentMeetingDay", label: "Parent Meeting Day", type: "date" },
        { k: "graduationDate", label: "Graduation Date", type: "date" },
        { k: "prizeGivingDay", label: "Prize Giving Day", type: "date" },
    ]},
    { title: "Daily School Schedule", icon: Clock, fields: [
        { k: "schoolStartTime", label: "School Start Time", type: "time" },
        { k: "schoolEndTime", label: "School End Time", type: "time" },
        { k: "attendanceCutoffTime", label: "Attendance Cutoff Time", type: "time" },
        { k: "staffReportingTime", label: "Staff Reporting Time", type: "time" },
        { k: "staffDepartureTime", label: "Staff Departure Time", type: "time" },
        { k: "studentReportingTime", label: "Student Reporting Time", type: "time" },
    ]},
    { title: "Breaks & Periods", icon: Coffee, fields: [
        { k: "breaks", label: "Breaks (one per line — Name | Start | End)", type: "textarea" },
        { k: "periods", label: "Lesson Periods (one per line — Name | Start | End)", type: "textarea" },
    ]},
    { title: "Attendance Settings", icon: UserCheck, fields: [
        { k: "attStartTime", label: "Attendance Start Time", type: "time" },
        { k: "attCutoffTime", label: "Attendance Cutoff Time", type: "time" },
        { k: "lateThreshold", label: "Late Arrival Threshold (min)", type: "number" },
        { k: "staffGracePeriod", label: "Staff Grace Period (min)", type: "number" },
        ...toggles([["trackOvertime", "Staff Overtime Tracking"]]),
    ]},
    { title: "Examination Schedule", icon: FileText, fields: [
        { k: "examStartDate", label: "Exam Start Date", type: "date" },
        { k: "examEndDate", label: "Exam End Date", type: "date" },
        { k: "examStartTime", label: "Exam Start Time", type: "time" },
        { k: "examEndTime", label: "Exam End Time", type: "time" },
    ]},
    { title: "Assessment Windows", icon: ClipboardCheck, fields: [
        { k: "assignmentStart", label: "Assignment Start Date", type: "date" },
        { k: "assignmentDue", label: "Assignment Due Date", type: "date" },
        { k: "projectSubmission", label: "Project Submission Date", type: "date" },
        { k: "markEntryDeadline", label: "Mark Entry Deadline", type: "date" },
    ]},
    { title: "Fee Collection Schedule", icon: Banknote, fields: [
        { k: "openingFeeDue", label: "Opening Fee Due Date", type: "date" },
        { k: "midTermFeeDue", label: "Mid-Term Fee Due Date", type: "date" },
        { k: "finalFeeDue", label: "Final Fee Due Date", type: "date" },
        { k: "latePenalty", label: "Late Payment Penalty (KSh)", type: "number" },
        { k: "feeGracePeriod", label: "Grace Period (days)", type: "number" },
    ]},
    { title: "Report Card Schedule", icon: GraduationCap, fields: [
        { k: "resultProcessing", label: "Result Processing Date", type: "date" },
        { k: "resultApproval", label: "Result Approval Date", type: "date" },
        { k: "resultRelease", label: "Result Release Date", type: "date" },
        { k: "parentAccessDate", label: "Parent Access Date", type: "date" },
    ]},
    { title: "Boarding Schedule (optional)", icon: BedDouble, fields: [
        { k: "wakeUpTime", label: "Wake Up Time", type: "time" },
        { k: "breakfastTime", label: "Breakfast Time", type: "time" },
        { k: "prepTime", label: "Prep Time", type: "time" },
        { k: "dinnerTime", label: "Dinner Time", type: "time" },
        { k: "lightsOutTime", label: "Lights Out Time", type: "time" },
    ]},
    { title: "Holidays & Activities", icon: CalendarDays, fields: [
        { k: "holidays", label: "Holidays (one per line — Name | Start | End | Type)", type: "textarea" },
        { k: "activities", label: "Activities (one per line — Name | Date | Venue)", type: "textarea" },
    ]},
    { title: "Term Locking & Controls", icon: Lock, fields: toggles([
        ["lockAttendance", "Lock Attendance"], ["lockExams", "Lock Exams"], ["lockResults", "Lock Results"],
        ["lockFeePosting", "Lock Fee Posting"], ["archived", "Archive Term"],
    ]) },
    { title: "Notifications", icon: Bell, fields: [
        { k: "feeReminderDates", label: "Fee Reminder Dates", type: "text" },
        { k: "examReminderDates", label: "Exam Reminder Dates", type: "text" },
        { k: "eventReminderDates", label: "Event Reminder Dates", type: "text" },
    ]},
];

export default function AcademicTermSettings() {
    const { termId } = useParams();
    const navigate = useNavigate();

    // All terms (for the picker and to pre-fill the selected term's basics).
    const { data: years = [] } = useQuery({ queryKey: ["v2_academic_years"], queryFn: async () => { const r = await api.get("/v2/academic-years"); return Array.isArray(r.data) ? r.data : (r.data?.data || []); } });
    const { data: terms = [], isLoading } = useQuery({ queryKey: ["v2_terms"], queryFn: async () => { const r = await api.get("/v2/terms"); return Array.isArray(r.data) ? r.data : (r.data?.data || []); } });

    // No term selected → show a picker (also reachable from Learning Periods).
    if (!termId) {
        return (
            <div className="flex-1 bg-[#f8fafc] min-h-screen p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-11 h-11 bg-indigo-50 rounded-2xl flex items-center justify-center"><CalendarRange className="w-5 h-5 text-indigo-600" /></div>
                    <div><h1 className="text-xl font-black text-slate-800">Academic Term Settings</h1><p className="text-xs text-slate-500">Pick a term to configure (or click the ⚙ on a term in Learning Periods)</p></div>
                </div>
                {isLoading ? <Loader2 className="w-6 h-6 animate-spin text-indigo-400" /> : terms.length === 0 ? (
                    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 text-sm text-slate-500">No terms yet. Create academic years and terms in <a href="/academics/periods" className="text-indigo-600 font-bold underline">Learning Periods</a>.</div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-w-4xl">
                        {terms.map((t: any) => (
                            <button key={t._id} onClick={() => navigate(`/settings/term-settings/${t._id}`)}
                                className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 text-left hover:border-[#5C67F2] transition-colors">
                                <p className="font-black text-slate-800">{t.name}</p>
                                <p className="text-xs text-slate-400">{t.academicYear || ""}{t.isActive ? " · Current" : ""}</p>
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 mt-2"><Settings className="w-3.5 h-3.5" /> Configure</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    const term: any = terms.find((t: any) => String(t._id) === String(termId));
    const year: any = years.find((y: any) => String(y._id) === String(term?.academicYearId));
    const prefill = term ? {
        termName: term.name,
        academicYear: year?.name || (term.academicYear ? `Academic Year ${term.academicYear}` : ""),
        startDate: term.startDate || undefined,
        endDate: term.endDate || undefined,
        status: term.isActive ? "Active" : "Upcoming",
    } : {};

    return (
        <SettingsBuilder
            title={`Term Settings — ${term?.name || "Term"}`}
            subtitle={`${year?.name || ""} · configure this term's calendar, schedule, deadlines and controls`}
            icon={CalendarRange}
            collection="term_settings"
            recordId={termId}
            recordField="termId"
            prefill={prefill}
            sections={SECTIONS}
            defaults={{ status: "Active" }}
        />
    );
}
