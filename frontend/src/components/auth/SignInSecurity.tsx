import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ShieldCheck, Mail, Link2, Unlink, Loader2, Lock, MonitorSmartphone } from "lucide-react";
import type { AxiosInstance } from "axios";
import defaultApi from "@/lib/api";
import GoogleSignIn from "./GoogleSignIn";

// "Sign-in & security" card: link a Google account (one-click sign-in) and turn on the
// emailed sign-in code. Works for admin-app users and staff (pass the staff api client).

const GoogleG = () => (
    <svg viewBox="0 0 48 48" className="w-5 h-5"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
);

export default function SignInSecurity({ client = defaultApi, accent = "#5C67F2" }: { client?: AxiosInstance; accent?: string }) {
    const qc = useQueryClient();
    const [busy, setBusy] = useState<string | null>(null);
    const [askPw, setAskPw] = useState(false);
    const [pw, setPw] = useState("");
    const { data, isLoading, error } = useQuery<any>({ queryKey: ["account_security"], queryFn: async () => (await client.get("/auth/account-security")).data, retry: false });
    const refresh = () => qc.invalidateQueries({ queryKey: ["account_security"] });

    const run = async (key: string, fn: () => Promise<any>) => {
        setBusy(key);
        try { const r = await fn(); toast.success(r?.data?.message || "Saved"); refresh(); return true; }
        catch (e: any) { toast.error(e.response?.data?.message || "Failed"); return false; }
        finally { setBusy(null); }
    };

    if (isLoading) return <div className="bg-white rounded-2xl border border-slate-100 p-6 flex items-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Loading sign-in security…</div>;
    if (error || !data) return null;
    const g = data.google, t = data.twoFactor;

    return (
        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm">
            <header className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
                <ShieldCheck className="w-5 h-5" style={{ color: accent }} />
                <div>
                    <h3 className="text-sm font-bold text-slate-800">Sign-in & security</h3>
                    <p className="text-xs text-slate-400">Sign in with Google, and protect your account with an emailed code.</p>
                </div>
            </header>
            <div className="divide-y divide-slate-100">
                {/* Google */}
                <div className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0"><GoogleG /></div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800">Google account</p>
                        <p className="text-xs text-slate-500">
                            {!g.enabled ? "Google sign-in has not been switched on for schools yet."
                                : g.linked ? <>Linked to <b className="text-slate-700">{g.email}</b> — use “Continue with Google” on the sign-in page.</>
                                : "Link your Google account to sign in with one click — no password needed."}
                        </p>
                    </div>
                    {g.enabled && (g.linked
                        ? <button onClick={() => confirm("Unlink this Google account?") && run("unlink", () => client.post("/auth/google/unlink"))} disabled={busy === "unlink"}
                            className="h-9 px-4 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 flex items-center gap-2 disabled:opacity-50">
                            {busy === "unlink" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlink className="w-4 h-4" />} Unlink
                          </button>
                        : <div className="flex items-center gap-2">
                            {busy === "link" && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
                            <GoogleSignIn text="continue_with" width={230} disabled={busy === "link"}
                                onCredential={c => run("link", () => client.post("/auth/google/link", { credential: c }))} />
                          </div>)}
                </div>

                {/* Emailed code */}
                <div className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${accent}14`, color: accent }}><Mail className="w-5 h-5" /></div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                            Two-step sign-in (email code)
                            {t.enabled ? <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-100">ON</span>
                                : <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">OFF</span>}
                        </p>
                        <p className="text-xs text-slate-500">
                            {!t.available ? "Not available right now."
                                : t.enforced ? <>Required for school admins. Codes go to <b>{t.sendsTo || "your email"}</b>.</>
                                : !data.email ? "Add an email address to your profile to use this."
                                : <>After your password, we email a 6-digit code to <b>{t.sendsTo}</b>.</>}
                        </p>
                        {askPw && (
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                                <div className="relative">
                                    <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                    <input type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="Current password" autoFocus
                                        className="h-9 pl-8 pr-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-slate-400" />
                                </div>
                                <button onClick={async () => { if (await run("off", () => client.post("/auth/2fa/enable", { enabled: false, password: pw }))) { setAskPw(false); setPw(""); } }}
                                    disabled={!pw || busy === "off"} className="h-9 px-4 rounded-xl bg-rose-600 text-white text-sm font-semibold disabled:opacity-50">Turn off</button>
                                <button onClick={() => { setAskPw(false); setPw(""); }} className="h-9 px-3 text-sm text-slate-500">Cancel</button>
                            </div>
                        )}
                    </div>
                    {t.available && !t.enforced && !askPw && (t.enabled
                        ? <button onClick={() => setAskPw(true)} className="h-9 px-4 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">Turn off</button>
                        : <button onClick={() => run("on", () => client.post("/auth/2fa/enable", { enabled: true }))} disabled={!data.email || busy === "on"}
                            className="h-9 px-4 rounded-xl text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-50" style={{ background: accent }}>
                            {busy === "on" ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />} Turn on
                          </button>)}
                </div>

                {t.enabled && (
                    <div className="px-5 py-3 flex items-center justify-between gap-3 bg-slate-50/60 rounded-b-2xl">
                        <p className="text-xs text-slate-500 flex items-center gap-2"><MonitorSmartphone className="w-4 h-4" /> Devices you chose to remember skip the code.</p>
                        <button onClick={() => run("forget", () => client.post("/auth/trusted-devices/forget"))} className="text-xs font-semibold hover:underline" style={{ color: accent }}>Forget all devices</button>
                    </div>
                )}
            </div>
        </section>
    );
}
