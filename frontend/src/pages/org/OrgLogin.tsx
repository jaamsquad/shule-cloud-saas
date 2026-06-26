import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Building2, Lock, Mail } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { orgLogin } from "@/lib/orgContext";

// Organization-level sign-in, branded with the organization's own logo + name
// (resolved from the current subdomain). After login the user lands on the
// account switcher to pick a branch or the whole organisation.
export default function OrgLogin() {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [busy, setBusy] = useState(false);

    // Resolve the org/school branding for the subdomain we're on.
    const sub = (() => { const h = window.location.hostname; const p = h.split("."); const r = new Set(["www", "app", "owner", "api", "org", "localhost"]); return (h.includes(".") && !r.has(p[0])) ? p[0] : ""; })();
    const { data: brand } = useQuery({
        queryKey: ["org_login_brand", sub],
        enabled: !!sub,
        queryFn: async () => (await api.get(`/public/school/${sub}`)).data,
        retry: false, staleTime: 5 * 60 * 1000,
    });
    const accent = brand?.organization ? "#5C67F2" : "#5C67F2";
    const orgName = brand?.organization?.name || brand?.name;
    const logo = brand?.logo;

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        try {
            const { branches } = await orgLogin(email.trim(), password);
            toast.success("Welcome back");
            // Land on the account switcher so the user picks a branch or the whole
            // organisation — unless there's only a single branch and no org view.
            navigate(branches.length > 1 ? "/org/switch" : "/org/switch");
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Sign-in failed");
        } finally { setBusy(false); }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#5C67F2]/10 to-slate-50 p-4">
            <form onSubmit={submit} className="bg-white w-full max-w-sm rounded-3xl shadow-xl border border-slate-100 p-8">
                <div className="flex flex-col items-center mb-6 text-center">
                    {logo ? (
                        <img src={logo} alt={orgName || "Organization"} className="w-16 h-16 rounded-2xl object-contain border border-slate-100 bg-white p-1 mb-3" />
                    ) : (
                        <div className="w-14 h-14 rounded-2xl text-white flex items-center justify-center mb-3" style={{ background: accent }}><Building2 className="w-7 h-7" /></div>
                    )}
                    <h1 className="text-xl font-black text-slate-900">{orgName || "Organization Sign-in"}</h1>
                    <p className="text-xs text-slate-400 font-bold">{brand?.organization ? "Manage all your school branches" : "Organization sign-in"}</p>
                </div>
                <div className="space-y-3">
                    <div className="relative">
                        <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="Email"
                            className="w-full h-12 pl-10 pr-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#5C67F2]" />
                    </div>
                    <div className="relative">
                        <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="Password"
                            className="w-full h-12 pl-10 pr-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#5C67F2]" />
                    </div>
                </div>
                <button type="submit" disabled={busy || !email || !password}
                    className="w-full h-12 mt-5 rounded-xl bg-[#5C67F2] text-white font-black text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                    {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign in"}
                </button>
            </form>
        </div>
    );
}
