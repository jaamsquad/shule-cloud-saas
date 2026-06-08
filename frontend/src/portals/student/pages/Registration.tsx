import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, CheckCircle2, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { PageTitle, PanelCard } from "../../PortalShell";
import type { StudentCtx } from "../StudentLayout";

export default function Registration() {
    const { api } = useOutletContext<StudentCtx>();
    const qc = useQueryClient();
    const [selected, setSelected] = useState<string[]>([]);

    const { data, isLoading } = useQuery({
        queryKey: ["sp_registration"],
        queryFn: async () => (await api.get("/student-portal/registration")).data,
        retry: false,
    });

    useEffect(() => {
        if (data?.registeredUnitIds) setSelected(data.registeredUnitIds);
    }, [data]);

    const register = useMutation({
        mutationFn: async () => (await api.post("/student-portal/registration", { unitIds: selected })).data,
        onSuccess: () => {
            toast.success("Registration submitted");
            qc.invalidateQueries({ queryKey: ["sp_registration"] });
            qc.invalidateQueries({ queryKey: ["sp_profile_summary"] });
        },
        onError: (e: any) => toast.error(e.response?.data?.message || "Registration failed"),
    });

    const toggle = (id: string) =>
        setSelected(s => (s.includes(id) ? s.filter(x => x !== id) : [...s, id]));

    const units: any[] = data?.units || [];
    const isRegistered = data?.status === "Registered";

    return (
        <>
            <PageTitle title="Registration" />

            <PanelCard
                title={`Unit Registration — ${data?.term || "Current Term"}`}
                action={
                    isRegistered ? (
                        <span className="flex items-center gap-1.5 text-white text-xs font-bold">
                            <CheckCircle2 className="w-4 h-4" /> Registered
                        </span>
                    ) : undefined
                }
            >
                {isLoading ? (
                    <div className="flex items-center gap-2 text-slate-400 text-sm py-8 justify-center">
                        <Loader2 className="w-5 h-5 animate-spin" /> Loading units…
                    </div>
                ) : units.length === 0 ? (
                    <div className="text-center py-10 text-slate-400">
                        <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-40" />
                        <p className="text-sm font-semibold">No units available for registration yet.</p>
                        <p className="text-xs mt-1">Contact your faculty office.</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left text-slate-500 border-b border-black/10">
                                        <th className="py-2 w-10"></th>
                                        <th className="py-2">Code</th>
                                        <th className="py-2">Unit / Subject</th>
                                        <th className="py-2">Credit Hours</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {units.map(u => (
                                        <tr key={u._id} className="border-b border-black/5 hover:bg-slate-50">
                                            <td className="py-2.5">
                                                <input
                                                    type="checkbox"
                                                    disabled={isRegistered}
                                                    checked={selected.includes(u._id)}
                                                    onChange={() => toggle(u._id)}
                                                    className="h-4 w-4 accent-[#159a52]"
                                                />
                                            </td>
                                            <td className="py-2.5 font-mono text-xs text-slate-500">{u.code || "—"}</td>
                                            <td className="py-2.5 font-semibold text-slate-700">{u.name}</td>
                                            <td className="py-2.5 text-slate-600">{u.creditHours || 3}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex items-center justify-between mt-5">
                            <p className="text-xs text-slate-500 font-semibold">
                                {selected.length} unit{selected.length === 1 ? "" : "s"} selected
                            </p>
                            <button
                                disabled={isRegistered || register.isPending || selected.length === 0}
                                onClick={() => register.mutate()}
                                className="bg-[#0f2942] hover:bg-[#15395c] disabled:opacity-50 text-white text-sm font-bold px-5 py-2.5 rounded flex items-center gap-2"
                            >
                                {register.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                                {isRegistered ? "Already Registered" : "Submit Registration"}
                            </button>
                        </div>
                    </>
                )}
            </PanelCard>
        </>
    );
}
