import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2, ChevronDown, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

// In-app branch switcher shown in the school top bar when the school is part of
// an organization AND the user may switch branches. Entering a sibling branch
// mints that branch's token (same URL, no password).
export default function TenantBranchSwitcher() {
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState("");

    const { data } = useQuery({
        queryKey: ["org_my_context"],
        queryFn: async () => (await api.get("/org/my-context")).data,
        staleTime: 5 * 60 * 1000,
        retry: false,
    });

    if (!data?.inOrg || !data?.canSwitch || !(data.branches?.length > 1)) return null;

    const current = data.branches.find((b: any) => b.current);
    const go = async (b: any) => {
        if (b.current) { setOpen(false); return; }
        setBusy(b.id);
        try {
            const r = (await api.post(`/org/switch-branch/${b.id}`, {})).data;
            localStorage.setItem("auth_token", r.token);
            localStorage.setItem("tenant", JSON.stringify({ subdomain: r.subdomain, name: b.name }));
            localStorage.setItem("active_branch_subdomain", r.subdomain);
            localStorage.setItem("active_branch_id", b.id);
            window.location.href = "/dashboard";
        } catch (e: any) {
            toast.error(e.response?.data?.message || "Could not switch branch.");
            setBusy("");
        }
    };

    return (
        <div className="relative">
            <button onClick={() => setOpen(o => !o)} className="flex items-center gap-2 h-9 px-3 rounded-xl border border-[#5C67F2]/30 bg-[#5C67F2]/5 text-[#5C67F2] text-xs font-black uppercase tracking-wide hover:bg-[#5C67F2]/10">
                <Building2 className="w-4 h-4" />
                <span className="max-w-[9rem] truncate">{current?.name || "Branch"}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>
            {open && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-20">
                        <p className="px-4 py-1 text-[10px] font-black uppercase tracking-widest text-gray-400">{data.organization?.name || "Organization"} · Branches</p>
                        {data.branches.map((b: any) => (
                            <button key={b.id} onClick={() => go(b)} disabled={!!busy} className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 text-left disabled:opacity-50">
                                <span className="flex items-center gap-2 min-w-0">
                                    <Building2 className="w-4 h-4 text-gray-400 shrink-0" />
                                    <span className="text-sm font-semibold text-gray-700 truncate">{b.name}</span>
                                </span>
                                {busy === b.id ? <Loader2 className="w-4 h-4 animate-spin text-[#5C67F2]" /> : b.current ? <Check className="w-4 h-4 text-[#5C67F2]" /> : null}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
