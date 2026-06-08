import { useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { User as UserIcon, Users, BookOpen, CalendarClock } from "lucide-react";
import { PageTitle, PanelCard, Field } from "../../PortalShell";
import type { StaffCtx } from "../StaffLayout";

export default function StaffDashboard() {
    const { staff, api } = useOutletContext<StaffCtx>();

    const { data: summary } = useQuery({
        queryKey: ["staff_summary"],
        queryFn: async () => (await api.get("/staff-portal/summary")).data,
        retry: false,
    });

    const stats = [
        { label: "My Classes", value: summary?.classCount ?? "—", icon: Users },
        { label: "Subjects", value: summary?.subjectCount ?? "—", icon: BookOpen },
        { label: "Lessons / Week", value: summary?.lessonsPerWeek ?? "—", icon: CalendarClock },
    ];

    return (
        <>
            <PageTitle title="Dashboard" />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                {stats.map(s => (
                    <div key={s.label} className="bg-white rounded-md shadow-sm border border-black/5 p-5 flex items-center gap-4">
                        <div className="w-11 h-11 rounded-lg bg-[#159a52]/10 flex items-center justify-center">
                            <s.icon className="w-5 h-5 text-[#159a52]" />
                        </div>
                        <div>
                            <p className="text-xl font-black text-slate-800">{s.value}</p>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-wide">{s.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            <PanelCard title="Basic information">
                <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-shrink-0">
                        {staff.photo ? (
                            <img src={staff.photo} className="w-32 h-32 rounded-full object-cover border border-black/10" />
                        ) : (
                            <div className="w-32 h-32 rounded-full bg-[#7fd0e6] flex items-center justify-center">
                                <UserIcon className="w-16 h-16 text-[#2a4a37]" />
                            </div>
                        )}
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-10 flex-1">
                        <div className="divide-y divide-black/5">
                            <Field label="Staff No" value={staff.staffNo || staff.employeeId || staff.portalUsername} />
                            <Field label="Name" value={staff.name?.toUpperCase()} />
                            <Field label="Designation" value={staff.designation} />
                            <Field label="Department" value={staff.department} />
                        </div>
                        <div className="divide-y divide-black/5">
                            <Field label="Email" value={staff.email} />
                            <Field label="Phone" value={staff.phone} />
                            <Field label="Gender" value={staff.gender} />
                            <Field label="National ID" value={staff.nationalId || staff.idNo} />
                        </div>
                    </div>
                </div>
            </PanelCard>
        </>
    );
}
