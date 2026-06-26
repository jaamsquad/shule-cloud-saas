import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Layers, ArrowRight, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

// Lets a school admin turn their existing school into a multi-branch organization.
// Their current login then also works at /org/login (same email + password).
export default function OrganizationSetup() {
    const [done, setDone] = useState<any>(null);

    const convert = useMutation({
        mutationFn: async () => (await api.post("/org/convert-this-school", {})).data,
        onSuccess: (d: any) => { setDone(d); toast.success(d.message || "Converted to organization"); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Conversion failed"),
    });

    return (
        <div className="flex-1 bg-[#F8FAFC] min-h-screen p-6">
            <div className="max-w-2xl">
                <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2 mb-2"><Layers className="w-6 h-6 text-[#5C67F2]" /> Organization (Multi-Branch)</h1>
                <p className="text-sm text-slate-500 mb-6">Run several campuses or branches under one group. Each branch keeps its own students, fees, staff and accounts — fully separate — while you get combined dashboards, transfers and reports.</p>

                {done ? (
                    <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6">
                        <div className="flex items-center gap-2 text-emerald-700 font-black mb-2"><CheckCircle2 className="w-5 h-5" /> Organization created</div>
                        <p className="text-sm text-emerald-800">{done.message}</p>
                        {done.orgLoginEmail && (
                            <p className="text-sm text-emerald-800 mt-2">Sign in to the organization at <a href="/org/login" className="font-black underline">/org/login</a> using <b>{done.orgLoginEmail}</b>{done.reusedSchoolLogin ? " and your current school password." : " (use your school password, or reset it)."}</p>
                        )}
                        <a href="/org/login" className="inline-flex items-center gap-1.5 mt-4 h-10 px-5 rounded-xl bg-emerald-600 text-white font-bold text-sm">Go to Organization sign-in <ArrowRight className="w-4 h-4" /></a>
                    </div>
                ) : (
                    <div className="bg-white border border-slate-100 rounded-2xl p-6">
                        <h2 className="font-black text-slate-800 mb-2">Make this school an Organization</h2>
                        <ul className="text-sm text-slate-600 space-y-1.5 mb-4 list-disc list-inside">
                            <li>Your current school becomes the <b>first branch</b>. Nothing is moved or deleted.</li>
                            <li>Your existing admin login also works at <b>/org/login</b> — same email and password.</li>
                            <li>You can then add more branches, each as its own isolated school.</li>
                        </ul>
                        <button onClick={() => convert.mutate()} disabled={convert.isPending}
                            className="h-11 px-5 rounded-xl bg-[#5C67F2] text-white font-bold text-sm flex items-center gap-1.5 disabled:opacity-50">
                            {convert.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Layers className="w-4 h-4" />} Convert to Organization
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
