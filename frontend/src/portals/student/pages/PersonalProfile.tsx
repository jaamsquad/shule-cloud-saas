import { useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { PageTitle, PanelCard, Field } from "../../PortalShell";
import type { StudentCtx } from "../StudentLayout";

export default function PersonalProfile() {
    const { student, api } = useOutletContext<StudentCtx>();

    const { data: summary } = useQuery({
        queryKey: ["sp_profile_summary"],
        queryFn: async () => {
            const r = await api.get("/student-portal/summary");
            return r.data;
        },
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
                        onClick={() => toast.info("Academic calendar will open here.")}
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
                            <Field label="ID No" value={student.nationalId || student.idNo} />
                            <Field label="Gender" value={student.gender} />
                        </div>
                        <div className="divide-y divide-black/5">
                            <Field label="Address" value={student.address || student.postalAddress} />
                            <Field label="Email" value={student.email || student.studentEmail} />
                            <Field label="Date Of Birth" value={fmtDate(student.dateOfBirth || student.dob)} />
                            <Field label="Campus" value={student.campus || student.class} />
                        </div>
                    </div>
                </div>

                <div className="mt-6 sm:hidden">
                    <button
                        onClick={() => toast.info("Academic calendar will open here.")}
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
        </>
    );
}
