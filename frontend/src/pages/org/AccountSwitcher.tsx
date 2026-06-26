import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Briefcase, Search, GraduationCap, Building2 } from "lucide-react";
import {
    isOrgUser, getOrgUser, getOrgBranches, getOrgInfo, orgPrimary,
    selectBranch, selectAllBranches, canSeeAllBranches, orgLogout, type OrgBranch,
} from "@/lib/orgContext";

// eCitizen-style account switcher: pick a single branch (your "personal" working
// account) or the whole organisation. Shown after org sign-in, or any time the
// user wants to switch context.
export default function AccountSwitcher() {
    const navigate = useNavigate();
    const [q, setQ] = useState("");
    if (!isOrgUser()) { navigate("/org/login", { replace: true }); return null; }

    const accent = orgPrimary();
    const user = getOrgUser();
    const org = getOrgInfo();
    const branches = getOrgBranches();

    // Isolation guard: the org portal must not appear on a school subdomain that
    // doesn't belong to the org. If we're on a tenant subdomain and none of the
    // org's branches match it, this org session doesn't belong here — bail out.
    const host = window.location.hostname;
    const sub = host.split(".")[0];
    const reserved = new Set(["www", "app", "owner", "api", "localhost", "127", "org"]);
    const onTenantSubdomain = host.includes(".") && !reserved.has(sub);
    const belongsHere = !onTenantSubdomain || branches.some(b => b.subdomain.toLowerCase() === sub.toLowerCase());
    if (onTenantSubdomain && !belongsHere) {
        // Wrong place for this org — send the user to the school's normal login.
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-white p-6 text-center">
                <p className="text-lg font-black text-slate-800">This organization isn't linked to <span style={{ color: accent }}>{sub}</span>.</p>
                <p className="text-sm text-slate-500 mt-1 max-w-md">You're signed in to a different organization. Open the organization portal from its own address, or sign in to this school directly.</p>
                <div className="flex gap-2 mt-5">
                    <a href="/login" className="h-10 px-5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm flex items-center">Sign in to {sub}</a>
                    <button onClick={() => { orgLogout(); navigate("/org/login"); }} className="h-10 px-5 rounded-xl text-white font-bold text-sm" style={{ background: accent }}>Switch organization</button>
                </div>
            </div>
        );
    }

    const primary = branches.find(b => b.isPrimary) || branches[0];
    const others = branches.filter(b => b.id !== primary?.id);
    const filtered = others.filter(b => b.name.toLowerCase().includes(q.trim().toLowerCase()) || b.subdomain.toLowerCase().includes(q.trim().toLowerCase()));

    const enterBranch = (b: OrgBranch) => { selectBranch(b); window.location.href = "/"; };
    const enterOrg = () => { selectAllBranches(); navigate("/org/dashboard"); };

    return (
        <div className="min-h-screen bg-white flex flex-col items-center px-4 py-12">
            <div className="w-full max-w-xl">
                {/* Heading */}
                <div className="text-center mb-10">
                    <h1 className="text-3xl font-black" style={{ color: accent }}>Accounts Switcher</h1>
                    <p className="text-slate-500 mt-1">Here are the accounts you can switch between</p>
                </div>

                {/* Primary / branch account */}
                <section className="mb-8">
                    <h2 className="font-black text-slate-800">{primary?.name ? "Branch Account" : "School Account"}</h2>
                    <p className="text-sm text-slate-400 mb-3">Proceed to your main branch</p>
                    {primary && (
                        <button onClick={() => enterBranch(primary)} className="w-full flex items-center justify-between border border-slate-200 rounded-xl px-5 py-4 hover:border-slate-300 hover:shadow-sm transition-all text-left">
                            <span className="flex items-center gap-3">
                                <span className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-400"><GraduationCap className="w-5 h-5" /></span>
                                <span>
                                    <span className="block font-black text-slate-800 uppercase tracking-tight">{primary.name}</span>
                                    <span className="block text-xs font-bold text-slate-400">{primary.subdomain}</span>
                                </span>
                            </span>
                            <ChevronRight className="w-5 h-5 text-slate-300" />
                        </button>
                    )}
                </section>

                {/* Organisation account(s) */}
                {(others.length > 0 || canSeeAllBranches()) && (
                    <section className="mb-8">
                        <h2 className="font-black text-slate-800">Organisation Account</h2>
                        <p className="text-sm text-slate-400 mb-3">Manage all branches under {org.name || "your group"}</p>

                        {/* Whole-organisation entry */}
                        {canSeeAllBranches() && (
                            <button onClick={enterOrg} className="w-full flex items-center justify-between border border-slate-200 rounded-xl px-5 py-4 mb-3 hover:border-slate-300 hover:shadow-sm transition-all text-left">
                                <span className="flex items-center gap-3">
                                    <span className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-400"><Briefcase className="w-5 h-5" /></span>
                                    <span>
                                        <span className="block font-black text-slate-800 uppercase tracking-tight">{org.name || "Organization"}</span>
                                        <span className="block text-xs font-bold text-slate-400">{branches.length} branches</span>
                                        <span className="inline-block mt-1 text-[10px] font-black uppercase px-2 py-0.5 rounded" style={{ color: accent, background: `${accent}1a` }}>organisation</span>
                                    </span>
                                </span>
                                <ChevronRight className="w-5 h-5 text-slate-300" />
                            </button>
                        )}

                        {/* Search + other branches */}
                        {others.length > 0 && (
                            <>
                                <div className="relative mb-3">
                                    <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search branches" className="w-full h-12 pl-11 pr-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-slate-300" />
                                </div>
                                <div className="space-y-3">
                                    {filtered.map(b => (
                                        <button key={b.id} onClick={() => enterBranch(b)} className="w-full flex items-center justify-between border border-slate-200 rounded-xl px-5 py-4 hover:border-slate-300 hover:shadow-sm transition-all text-left">
                                            <span className="flex items-center gap-3">
                                                <span className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-400"><Building2 className="w-5 h-5" /></span>
                                                <span>
                                                    <span className="block font-black text-slate-800 uppercase tracking-tight">{b.name}</span>
                                                    <span className="block text-xs font-bold text-slate-400">{b.subdomain}</span>
                                                    <span className="inline-block mt-1 text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-50 text-amber-600">branch</span>
                                                </span>
                                            </span>
                                            <ChevronRight className="w-5 h-5 text-slate-300" />
                                        </button>
                                    ))}
                                    {filtered.length === 0 && <p className="text-center text-sm text-slate-400 py-4">No branches match "{q}".</p>}
                                </div>
                            </>
                        )}
                    </section>
                )}

                {/* Footer */}
                <div className="text-center text-sm text-slate-400 mt-10">
                    <p>You can work inside a single branch, or manage the whole organisation. Select one above.</p>
                    <button onClick={() => { orgLogout(); navigate("/org/login"); }} className="mt-2 font-bold" style={{ color: accent }}>Sign in with a different account</button>
                </div>
            </div>
        </div>
    );
}
