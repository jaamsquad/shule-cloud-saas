import { useOutletContext, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Loader2, Users } from "lucide-react";
import { PageTitle, PanelCard } from "../../PortalShell";
import type { StaffCtx } from "../StaffLayout";

export default function MyClasses() {
    const { api } = useOutletContext<StaffCtx>();
    const navigate = useNavigate();

    const { data = [], isLoading } = useQuery({
        queryKey: ["staff_classes"],
        queryFn: async () => {
            const r = await api.get("/staff-portal/my-classes");
            return Array.isArray(r.data) ? r.data : [];
        },
        retry: false,
    });

    return (
        <>
            <PageTitle title="My Classes" />
            <PanelCard title="Classes & Subjects Assigned to Me">
                <p className="text-xs text-slate-400 -mt-1 mb-3">Click a class to see its learners and print the class list.</p>
                {isLoading ? (
                    <div className="flex items-center gap-2 text-slate-400 text-sm py-8 justify-center">
                        <Loader2 className="w-5 h-5 animate-spin" /> Loading…
                    </div>
                ) : data.length === 0 ? (
                    <div className="text-center py-10 text-slate-400">
                        <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
                        <p className="text-sm font-semibold">No classes assigned yet.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-slate-500 border-b border-black/10">
                                    <th className="py-2">Class</th>
                                    <th className="py-2">Subject</th>
                                    <th className="py-2 text-right">Students</th>
                                    <th className="py-2 w-8"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.map((c: any, i: number) => (
                                    <tr key={i} onClick={() => navigate(`/classes/${encodeURIComponent(c.className || c.class)}`)}
                                        title="Open class list" className="border-b border-black/5 hover:bg-slate-50 cursor-pointer">
                                        <td className="py-2.5 font-semibold text-slate-700">{c.className || c.class}</td>
                                        <td className="py-2.5 text-slate-600">{c.subjectName || c.subject || "—"}</td>
                                        <td className="py-2.5 text-right text-slate-600">{c.studentCount ?? "—"}</td>
                                        <td className="py-2.5 text-right text-slate-400"><ChevronRight className="w-4 h-4 inline" /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </PanelCard>
        </>
    );
}
