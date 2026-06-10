import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, User as UserIcon, X, Loader2, CircleDot } from "lucide-react";
import { PageTitle, PanelCard, Field } from "../../PortalShell";
import type { StudentCtx } from "../StudentLayout";

const TYPE_COLOR: Record<string, string> = {
    milestone: "#159a52", exam: "#ef4444", assessment: "#7c3aed", fee: "#f59e0b",
    meeting: "#0ea5e9", break: "#64748b", holiday: "#e11d48", results: "#16a34a", activity: "#2563eb",
};

export default function PersonalProfile() {
    const { student, api } = useOutletContext<StudentCtx>();
    const [calOpen, setCalOpen] = useState(false);

    const { data: summary } = useQuery({
        queryKey: ["sp_profile_summary"],
        queryFn: async () => {
            const r = await api.get("/student-portal/summary");
            return r.data;
        },
        retry: false,
    });

    const { data: calendar, isLoading: calLoading } = useQuery({
        queryKey: ["sp_academic_calendar"],
        queryFn: async () => (await api.get("/student-portal/academic-calendar")).data as { term: any; activities: any[] },
        enabled: calOpen,
        retry: false,
    });

    const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString("en-GB") : "—");

    return (
        <>
            <PageTitle title="Dashboard" />

            <PanelCard
                title="Basic information"
                action={
                    <button
                        onClick={() => setCalOpen(true)}
                        className="hidden sm:inline-flex items-center gap-1.5 bg-[#159a52] hover:bg-[#127a42] text-white text-xs font-bold px-3 py-1.5 rounded"
                    >
                        <CalendarDays className="w-3.5 h-3.5" /> Get Academic Calendar
                    </button>
                }
            >
                <div className="flex flex-col md:flex-row gap-6">
                    {/* Photo */}
                    <div className="flex-shrink-0">
                        {student.photo ? (
                            <img src={student.photo} alt={student.name}
                                className="w-32 h-32 rounded-full object-cover border border-black/10" />
                        ) : (
                            <div className="w-32 h-32 rounded-full bg-[#7fd0e6] flex items-center justify-center">
                                <UserIcon className="w-16 h-16 text-[#2a4a37]" />
                            </div>
                        )}
                    </div>

                    {/* Two-column field grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-10 flex-1">
                        <div className="divide-y divide-black/5">
                            <Field label="Reg. No" value={student.registrationNo} />
                            <Field label="Name" value={student.name?.toUpperCase()} />
                            <Field label="Admission No" value={student.admNo || student.admissionNo} />
                            <Field label="ID No" value={student.nationalId || student.idNo || student.birthFormId} />
                            <Field label="Gender" value={student.gender} />
                        </div>
                        <div className="divide-y divide-black/5">
                            <Field label="Date Of Birth" value={fmtDate(student.dateOfBirth || student.dob)} />
                            <Field label="Class / Campus" value={student.studentClass || student.campus || student.class} />
                            <Field label="Phone" value={student.phone} />
                            <Field label="Email" value={student.email || student.studentEmail || student.fatherEmail || student.motherEmail} />
                            <Field label="Address" value={student.address || student.postalAddress} />
                        </div>
                    </div>
                </div>

                <div className="mt-6 sm:hidden">
                    <button
                        onClick={() => setCalOpen(true)}
                        className="inline-flex items-center gap-1.5 bg-[#159a52] text-white text-xs font-bold px-3 py-2 rounded"
                    >
                        <CalendarDays className="w-3.5 h-3.5" /> Get Academic Calendar
                    </button>
                </div>
            </PanelCard>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <PanelCard title="Academic Information">
                    <div className="divide-y divide-black/5">
                        <Field label="Programme" value={student.programme || student.course || student.class} />
                        <Field label="Year of Study" value={student.yearOfStudy || student.year} />
                        <Field label="Current Term" value={summary?.currentTerm} />
                        <Field label="Reg. Status" value={summary?.registrationStatus || "Not Registered"} />
                    </div>
                </PanelCard>

                <PanelCard title="Fee Payment">
                    <div className="divide-y divide-black/5">
                        <Field label="Total Billed" value={summary ? `KSh ${Number(summary.totalBilled || 0).toLocaleString()}` : "—"} />
                        <Field label="Total Paid" value={summary ? `KSh ${Number(summary.totalPaid || 0).toLocaleString()}` : "—"} />
                        <Field label="Balance" value={summary ? `KSh ${Number(summary.balance || 0).toLocaleString()}` : "—"} />
                        <Field label="Status" value={summary && summary.balance <= 0 ? "Cleared" : "Outstanding"} />
                    </div>
                </PanelCard>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <PanelCard title="Parent / Guardian Information">
                    <div className="divide-y divide-black/5">
                        <Field label="Father's Name" value={student.fatherName} />
                        <Field label="Father's Phone" value={student.fatherPhone} />
                        <Field label="Father's Occupation" value={student.fatherOccupation} />
                        <Field label="Mother's Name" value={student.motherName} />
                        <Field label="Mother's Phone" value={student.motherPhone} />
                        <Field label="Guardian" value={student.guardianName || student.parentName} />
                        <Field label="Guardian Phone" value={student.parentPhone || student.guardianPhone} />
                    </div>
                </PanelCard>

                <PanelCard title="Other Information">
                    <div className="divide-y divide-black/5">
                        <Field label="Admission Date" value={fmtDate(student.admissionDate)} />
                        <Field label="Blood Group" value={student.bloodGroup} />
                        <Field label="Religion" value={student.religion} />
                        <Field label="Nationality" value={student.nationality || student.cast} />
                        <Field label="Previous School" value={student.previousSchool} />
                        <Field label="Transport Zone" value={student.transportZone} />
                        <Field label="Siblings" value={student.totalSiblings} />
                    </div>
                </PanelCard>
            </div>

            {/* Academic Calendar modal */}
            {calOpen && (
                <div className="fixed inset-0 bg-black/60 z-[200] flex items-start sm:items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl my-8 overflow-hidden">
                        <div className="bg-[#c4a35a] px-5 py-3 flex items-center justify-between">
                            <h3 className="text-white font-bold text-sm flex items-center gap-2"><CalendarDays className="w-4 h-4" /> Academic Calendar</h3>
                            <button onClick={() => setCalOpen(false)} className="text-white/90 hover:text-white"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-5 max-h-[70vh] overflow-y-auto">
                            {calLoading ? (
                                <div className="flex items-center gap-2 text-slate-400 text-sm py-8 justify-center"><Loader2 className="w-5 h-5 animate-spin" /> Loading calendar…</div>
                            ) : !calendar?.term ? (
                                <p className="text-center text-slate-400 text-sm py-8">No current term has been set yet.</p>
                            ) : (
                                <>
                                    {/* Current term header */}
                                    <div className="rounded-xl p-4 mb-4 text-white" style={{ background: "linear-gradient(135deg, #159a52, #0f2942)" }}>
                                        <div className="flex items-center gap-2 mb-1">
                                            <CircleDot className="w-4 h-4" />
                                            <p className="font-black">{calendar.term.name}</p>
                                            <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full">Current</span>
                                        </div>
                                        <p className="text-white/80 text-xs">{calendar.term.year}</p>
                                        <p className="text-white/80 text-xs mt-1">{fmtDate(calendar.term.startDate)} – {fmtDate(calendar.term.endDate)}{calendar.term.learningWeeks ? ` · ${calendar.term.learningWeeks} weeks` : ""}</p>
                                    </div>

                                    {/* Activities & important dates */}
                                    <p className="text-xs font-black text-slate-400 uppercase mb-2">Activities & Important Dates</p>
                                    {(!calendar.activities || calendar.activities.length === 0) ? (
                                        <p className="text-center text-slate-400 text-sm py-6">No activities have been set for this term yet.</p>
                                    ) : (
                                        <div className="space-y-1.5">
                                            {calendar.activities.map((a: any, i: number) => (
                                                <div key={i} className="flex items-center justify-between border border-black/5 rounded-lg px-3 py-2.5">
                                                    <span className="flex items-center gap-2 text-sm font-semibold text-slate-700 min-w-0">
                                                        <CircleDot className="w-3.5 h-3.5 flex-shrink-0" style={{ color: TYPE_COLOR[a.type] || "#94a3b8" }} />
                                                        <span className="truncate">{a.name}{a.venue ? <span className="text-xs text-slate-400"> · {a.venue}</span> : null}</span>
                                                    </span>
                                                    <span className="text-xs text-slate-500 flex-shrink-0 ml-2">{fmtDate(a.date)}{a.endDate ? ` – ${fmtDate(a.endDate)}` : ""}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
