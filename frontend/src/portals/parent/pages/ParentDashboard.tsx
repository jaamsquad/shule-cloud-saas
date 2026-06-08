import { useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { GraduationCap, CreditCard, Award } from "lucide-react";
import { PageTitle, PanelCard, Field } from "../../PortalShell";
import type { ParentCtx } from "../ParentLayout";

export default function ParentDashboard() {
    const { parent, api } = useOutletContext<ParentCtx>();

    const { data: child } = useQuery({
        queryKey: ["parent_student"],
        queryFn: async () => (await api.get("/parent-portal/student")).data,
        retry: false,
    });
    const { data: summary } = useQuery({
        queryKey: ["parent_summary"],
        queryFn: async () => (await api.get("/parent-portal/summary")).data,
        retry: false,
    });

    const s = child || parent.student || {};
    const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString("en-GB") : "—");

    const stats = [
        { label: "Class", value: s.studentClass || s.currentClass || s.class || "—", icon: GraduationCap },
        { label: "Fee Balance", value: summary ? `KSh ${Number(summary.balance || 0).toLocaleString()}` : "—", icon: CreditCard },
        { label: "Avg. Score", value: summary?.overallAverage != null ? `${Number(summary.overallAverage).toFixed(1)}%` : "—", icon: Award },
    ];

    return (
        <>
            <PageTitle title="My Child" />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                {stats.map(st => (
                    <div key={st.label} className="bg-white rounded-md shadow-sm border border-black/5 p-5 flex items-center gap-4">
                        <div className="w-11 h-11 rounded-lg bg-[#159a52]/10 flex items-center justify-center">
                            <st.icon className="w-5 h-5 text-[#159a52]" />
                        </div>
                        <div>
                            <p className="text-xl font-black text-slate-800">{st.value}</p>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-wide">{st.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            <PanelCard title="Student Basic information">
                <div className="flex flex-col md:flex-row gap-6">
                    {(s.studentPhoto || s.photo || s.avatar)
                        ? <img src={s.studentPhoto || s.photo || s.avatar} alt={s.studentName} className="w-28 h-28 rounded-full object-cover border border-black/10 flex-shrink-0" />
                        : <div className="w-28 h-28 rounded-full bg-[#7fd0e6] flex items-center justify-center text-[#2a4a37] font-black text-3xl flex-shrink-0">{(s.studentName || s.name || "S")[0]}</div>}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-10 flex-1">
                    <div className="divide-y divide-black/5">
                        <Field label="Reg. No" value={s.registrationNo || s.admNo} />
                        <Field label="Name" value={(s.studentName || s.name)?.toUpperCase()} />
                        <Field label="Class" value={s.studentClass || s.currentClass || s.class} />
                        <Field label="Gender" value={s.gender} />
                    </div>
                    <div className="divide-y divide-black/5">
                        <Field label="Date Of Birth" value={fmtDate(s.dateOfBirth || s.dob)} />
                        <Field label="Admission Date" value={fmtDate(s.admissionDate)} />
                        <Field label="Parent / Guardian" value={parent.name} />
                        <Field label="Contact" value={parent.phone} />
                    </div>
                </div>
                </div>
            </PanelCard>
        </>
    );
}
