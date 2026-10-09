import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User as UserIcon, Users, BookOpen, CalendarClock, Pencil, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageTitle, PanelCard, Field } from "../../PortalShell";
import type { StaffCtx } from "../StaffLayout";
import SignInSecurity from "@/components/auth/SignInSecurity";
import { staffCalendarApi } from "../staffApi";

export default function StaffDashboard() {
    const { staff, api } = useOutletContext<StaffCtx>();
    const qc = useQueryClient();
    const [editing, setEditing] = useState(false);
    const [email, setEmail] = useState(staff.email || "");
    const [phone, setPhone] = useState(staff.phone || "");

    const { data: summary } = useQuery({
        queryKey: ["staff_summary"],
        queryFn: async () => (await api.get("/staff-portal/summary")).data,
        retry: false,
    });

    const saveContact = useMutation({
        mutationFn: async () => (await api.patch("/staff-portal/profile", { email, phone })).data,
        onSuccess: () => { toast.success("Contact details updated"); setEditing(false); qc.invalidateQueries({ queryKey: ["staff_me"] }); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Update failed"),
    });

    const openEdit = () => { setEmail(staff.email || ""); setPhone(staff.phone || ""); setEditing(true); };

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

            <PanelCard title="Basic information" action={
                <button onClick={openEdit} className="inline-flex items-center gap-1.5 text-xs font-bold bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg">
                    <Pencil className="w-3.5 h-3.5" /> Edit Contact
                </button>
            }>
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

            <SignInSecurity client={staffCalendarApi} accent="#0f7a8a" />

            {editing && (
                <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl">
                        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
                            <h3 className="font-black text-slate-800">Edit Contact Details</h3>
                            <button onClick={() => setEditing(false)} className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400"><X className="w-4 h-4" /></button>
                        </div>
                        <div className="p-5 space-y-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Email</label>
                                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Phone</label>
                                <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="07XXXXXXXX" className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm" />
                            </div>
                        </div>
                        <div className="px-5 py-3 border-t border-slate-100 flex justify-end gap-2">
                            <button onClick={() => setEditing(false)} className="text-sm font-bold text-slate-500 px-4 py-2">Cancel</button>
                            <button onClick={() => saveContact.mutate()} disabled={saveContact.isPending} className="inline-flex items-center gap-1.5 bg-[#159a52] text-white text-sm font-bold px-5 py-2 rounded disabled:opacity-50">
                                {saveContact.isPending && <Loader2 className="w-4 h-4 animate-spin" />} Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
