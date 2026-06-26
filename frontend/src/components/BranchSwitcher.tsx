import { useState } from "react";
import { Building2, ChevronDown, Check, Layers, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
    isOrgUser, getOrgBranches, getActiveBranchId, isAllBranches,
    canSeeAllBranches, selectBranch, selectAllBranches, type OrgBranch,
} from "@/lib/orgContext";

// Branch Switcher in the top navigation — shown only to organization-level users.
// Switching a branch reloads the app scoped to that branch's isolated database
// (via the active-branch subdomain). "All Branches" routes to the org dashboard.
export default function BranchSwitcher() {
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    if (!isOrgUser()) return null;

    const branches = getOrgBranches();
    if (!branches.length) return null;
    const activeId = getActiveBranchId();
    const all = isAllBranches();
    const active = branches.find(b => b.id === activeId);
    const label = all ? "All Branches" : (active?.name || "Select branch");

    const pick = (b: OrgBranch) => { selectBranch(b); setOpen(false); window.location.href = "/"; };
    const pickAll = () => { selectAllBranches(); setOpen(false); navigate("/org/dashboard"); };

    return (
        <div className="relative">
            <button onClick={() => setOpen(o => !o)}
                className="flex items-center gap-2 h-9 px-3 rounded-xl border border-[#5C67F2]/30 bg-[#5C67F2]/5 text-[#5C67F2] text-xs font-black uppercase tracking-wide hover:bg-[#5C67F2]/10 transition-colors">
                {all ? <Layers className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                <span className="max-w-[10rem] truncate">{label}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>

            {open && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
                    <div className="absolute left-0 mt-2 w-64 bg-white rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.12)] border border-gray-100 py-2 z-20">
                        <p className="px-4 py-1 text-[10px] font-black uppercase tracking-widest text-gray-400">Branches</p>
                        {branches.map(b => (
                            <button key={b.id} onClick={() => pick(b)}
                                className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 text-left">
                                <span className="flex items-center gap-2 min-w-0">
                                    <Building2 className="w-4 h-4 text-gray-400 shrink-0" />
                                    <span className="text-sm font-semibold text-gray-700 truncate">{b.name}{b.isPrimary ? " ·" : ""}</span>
                                </span>
                                {!all && b.id === activeId && <Check className="w-4 h-4 text-[#5C67F2]" />}
                            </button>
                        ))}
                        {canSeeAllBranches() && (
                            <>
                                <div className="h-[1px] bg-gray-100 my-1 mx-4" />
                                <button onClick={pickAll} className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 text-left">
                                    <span className="flex items-center gap-2"><Layers className="w-4 h-4 text-[#5C67F2]" /><span className="text-sm font-bold text-[#5C67F2]">All Branches</span></span>
                                    {all && <Check className="w-4 h-4 text-[#5C67F2]" />}
                                </button>
                                <button onClick={() => { setOpen(false); navigate("/org/branches"); }} className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 text-left text-gray-500">
                                    <Plus className="w-4 h-4" /><span className="text-sm font-semibold">Manage branches</span>
                                </button>
                            </>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
