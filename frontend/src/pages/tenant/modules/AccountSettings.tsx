import { Settings, RefreshCcw, Eye, Lock, Check, EyeOff, Loader2, X, AlertTriangle } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function AccountSettings() {
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    const [user, setUser] = useState<any>(null);
    const [showPassword, setShowPassword] = useState(false);

    // Form state
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [timezone, setTimezone] = useState("Africa/Nairobi");
    const [currency, setCurrency] = useState("KES");
    const [symbol, setSymbol] = useState("KSh");

    useEffect(() => {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
            const parsed = JSON.parse(storedUser);
            setUser(parsed);
            setUsername(parsed.email || "");
        }
    }, []);

    // Fetch tenant profile for timezone, currency, subscription
    const { data: tenant, isLoading } = useQuery({
        queryKey: ["tenant_profile_global"],
        queryFn: async () => {
            const res = await api.get("/auth/tenant/profile");
            return res.data;
        }
    });

    // ── Subscription & plans ───────────────────────────────────────────────────
    const [payPhone, setPayPhone] = useState("");
    const { data: sub } = useQuery({
        queryKey: ["tenant_subscription"],
        queryFn: async () => { try { return (await api.get("/auth/tenant/subscription")).data; } catch { return { plans: [], current: null }; } },
    });
    // Subscription payment modal state.
    const [payModal, setPayModal] = useState<null | { stage: "sending" | "waiting" | "success" | "failed"; message: string; plan?: string; receipt?: string }>(null);
    const payPollRef = useRef<any>(null);

    const pollSub = (cid: string, attempt: number) => {
        if (attempt > 50) { setPayModal(m => m && { ...m, stage: "failed", message: "We didn't get a confirmation. If you paid, your plan will activate shortly — no need to pay again." }); return; }
        payPollRef.current = setTimeout(async () => {
            try {
                const r = await api.get(`/auth/tenant/subscribe/status?checkoutRequestId=${encodeURIComponent(cid)}`);
                const st = r.data?.status;
                if (st === "completed") { setPayModal(m => m && { ...m, stage: "success", message: "Your plan is now active.", receipt: r.data?.receipt, plan: r.data?.plan }); queryClient.invalidateQueries({ queryKey: ["tenant_subscription"] }); return; }
                if (st === "failed") { setPayModal(m => m && { ...m, stage: "failed", message: r.data?.message || "Payment was cancelled or failed." }); return; }
            } catch { /* transient — keep polling */ }
            pollSub(cid, attempt + 1);
        }, 3000);
    };

    const closePayModal = () => { if (payPollRef.current) clearTimeout(payPollRef.current); setPayModal(null); };

    const subscribe = useMutation({
        mutationFn: async (planId: string) => api.post("/auth/tenant/subscribe", { planId, phone: payPhone }),
        onMutate: () => setPayModal({ stage: "sending", message: "Sending M-PESA request…" }),
        onSuccess: (res: any) => {
            if (res.data?.activated) {
                setPayModal({ stage: "success", message: res.data.message || "Your plan is now active." });
                queryClient.invalidateQueries({ queryKey: ["tenant_subscription"] });
            } else if (res.data?.checkoutRequestId) {
                setPayModal({ stage: "waiting", message: res.data.message || "Enter your M-PESA PIN on your phone to complete." });
                pollSub(res.data.checkoutRequestId, 0);
            } else {
                setPayModal({ stage: "failed", message: res.data?.message || "Could not start the payment." });
            }
        },
        onError: (e: any) => setPayModal({ stage: "failed", message: e.response?.data?.message || "Failed to subscribe" }),
    });
    const ksh = (n: any) => `KSh ${Number(n || 0).toLocaleString()}`;

    // Sync tenant data into form
    useEffect(() => {
        if (tenant) {
            if (tenant.timezone) setTimezone(tenant.timezone);
            if (tenant.currency) setCurrency(tenant.currency);
            if (tenant.currencySymbol) setSymbol(tenant.currencySymbol);
        }
    }, [tenant]);

    // Mutations
    const updateTenantProfile = useMutation({
        mutationFn: async (data: any) => await api.patch("/auth/tenant/profile", data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tenant_profile_global"] }),
    });

    const updateUserProfile = useMutation({
        mutationFn: async ({ id, data }: { id: string, data: any }) => await api.patch(`/auth/tenant/user/${id}`, data),
        onSuccess: (res, variables) => {
            if (variables.data.email) {
                const updatedUser = { ...user, email: variables.data.email };
                setUser(updatedUser);
                localStorage.setItem("user", JSON.stringify(updatedUser));
            }
        }
    });

    const handleUpdate = async () => {
        try {
            // Update Tenant settings
            await updateTenantProfile.mutateAsync({
                timezone,
                currency,
                currencySymbol: symbol
            });

            // Update User settings if changed
            if (user?.id) {
                const userData: any = {};
                if (username !== user.email) userData.email = username;
                if (password.trim() !== "") userData.password = password;
                
                if (Object.keys(userData).length > 0) {
                    await updateUserProfile.mutateAsync({ id: user.id, data: userData });
                }
            }

            toast.success("Account settings updated successfully!");
            setPassword(""); // clear password field after update
        } catch (error: any) {
            toast.error(error?.response?.data?.message || "Failed to update settings");
        }
    };

    const isUpdating = updateTenantProfile.isPending || updateUserProfile.isPending;

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center min-h-screen bg-[#f4f7f6]">
                <Loader2 className="w-8 h-8 animate-spin text-[#5C67F2]" />
            </div>
        );
    }

    const subStatus = tenant?.status?.toUpperCase() || "FREE";
    const isFree = subStatus === "FREE";

    return (
        <>
        <div className="flex-1 bg-[#f4f7f6] min-h-screen flex flex-col items-center">
            <div className="p-6 pt-10 w-full max-w-5xl mt-6">
                
                {/* Huge Header Banner */}
                <div className="w-full bg-[#5C67F2] text-white rounded-full py-4 px-8 mb-10 shadow-md flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    <h2 className="text-xl font-bold tracking-tight">Account Settings</h2>
                </div>

                <div className="flex flex-col md:flex-row gap-10">
                    {/* Left Form */}
                    <div className="flex-1 space-y-8">
                        <div className="relative">
                            <div className="absolute -top-3 left-6 bg-[#868DF4] text-white text-[11px] px-3 py-1 rounded-full font-semibold tracking-wide z-10 shadow-sm">
                                Username*
                            </div>
                            <input 
                                type="text" 
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                className="w-full h-12 px-6 border border-[#5C67F2]/40 rounded-full focus:outline-none focus:border-[#5C67F2] text-gray-700 text-sm"
                            />
                        </div>

                        <div className="relative">
                            <div className="absolute -top-3 left-6 bg-[#868DF4] text-white text-[11px] px-3 py-1 rounded-full font-semibold tracking-wide z-10 shadow-sm">
                                New Password
                            </div>
                            <div className="relative w-full h-12 border border-[#5C67F2]/40 rounded-full overflow-hidden flex items-center bg-white pr-4">
                                <input 
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="Leave blank to keep current password"
                                    className="w-full h-full px-6 focus:outline-none text-gray-700 text-sm tracking-widest placeholder:tracking-normal placeholder:text-gray-300"
                                />
                                <button type="button" onClick={() => setShowPassword(!showPassword)}>
                                    {showPassword 
                                        ? <EyeOff className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                                        : <Eye className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                                    }
                                </button>
                            </div>
                        </div>

                        <div className="relative">
                            <div className="absolute -top-3 left-6 bg-[#868DF4] text-white text-[11px] px-3 py-1 rounded-full font-semibold tracking-wide z-10 shadow-sm">
                                TimeZone*
                            </div>
                            <select 
                                value={timezone}
                                onChange={e => setTimezone(e.target.value)}
                                className="w-full h-12 px-6 border border-[#5C67F2]/40 rounded-full focus:outline-none focus:border-[#5C67F2] text-gray-700 bg-white appearance-none cursor-pointer text-sm"
                            >
                                <option value="Africa/Nairobi">Africa/Nairobi</option>
                                <option value="Africa/Johannesburg">Africa/Johannesburg</option>
                                <option value="Africa/Lagos">Africa/Lagos</option>
                                <option value="Europe/London">Europe/London</option>
                                <option value="Asia/Karachi">Asia/Karachi</option>
                                <option value="Asia/Dubai">Asia/Dubai</option>
                            </select>
                            <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="relative flex-1">
                                <div className="absolute -top-3 left-6 bg-[#868DF4] text-white text-[11px] px-3 py-1 rounded-full font-semibold tracking-wide z-10 shadow-sm">
                                    Currency*
                                </div>
                                <select 
                                    value={currency}
                                    onChange={e => setCurrency(e.target.value)}
                                    className="w-full h-12 px-6 border border-[#5C67F2]/40 rounded-full focus:outline-none focus:border-[#5C67F2] text-gray-700 bg-white appearance-none cursor-pointer text-sm"
                                >
                                    <option value="KES">Kenya Shilling (KES)</option>
                                    <option value="USD">US Dollar (USD)</option>
                                    <option value="GBP">British Pound (GBP)</option>
                                    <option value="EUR">Euro (EUR)</option>
                                    <option value="ZAR">South African Rand (ZAR)</option>
                                    <option value="UGX">Ugandan Shilling (UGX)</option>
                                    <option value="TZS">Tanzanian Shilling (TZS)</option>
                                    <option value="RWF">Rwandan Franc (RWF)</option>
                                </select>
                                <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none">
                                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                </div>
                            </div>

                            <div className="relative w-32">
                                <div className="absolute -top-3 left-6 bg-[#868DF4] text-white text-[11px] px-3 py-1 rounded-full font-semibold tracking-wide z-10 shadow-sm">
                                    Symbol*
                                </div>
                                <input 
                                    type="text" 
                                    value={symbol}
                                    onChange={e => setSymbol(e.target.value)}
                                    placeholder="$"
                                    className="w-full h-12 px-6 border border-[#5C67F2]/40 rounded-full focus:outline-none focus:border-[#5C67F2] text-gray-700 text-sm"
                                />
                            </div>
                        </div>

                        <div className="flex justify-center mt-6">
                            <button 
                                type="button" 
                                onClick={handleUpdate}
                                disabled={isUpdating}
                                className="h-12 px-8 bg-[#0ea5e9] hover:bg-[#0284c7] disabled:opacity-70 text-white font-bold rounded-full shadow-md flex items-center gap-2 transition-colors"
                            >
                                {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />} 
                                {isUpdating ? "Updating..." : "Update Settings"}
                            </button>
                        </div>
                    </div>

                    {/* Right Card */}
                    <div className="w-full md:w-96">
                        <div className="bg-[#3B54A6] rounded-3xl p-8 text-white shadow-lg relative overflow-hidden min-h-[18rem]">
                            {/* Decorative background leaves/pattern mock */}
                            <div className="absolute right-0 top-0 w-32 h-32 bg-white/5 rounded-bl-full pointer-events-none"></div>
                            <div className="absolute left-0 bottom-0 w-40 h-40 bg-white/5 rounded-tr-full pointer-events-none"></div>
                            
                            <h3 className="text-xl font-bold flex items-center gap-2 mb-8 relative z-10">
                                <Lock className="w-5 h-5" /> Account details
                            </h3>

                            <div className="space-y-3 text-sm relative z-10 mb-8">
                                <div className="flex">
                                    <span className="w-28 text-blue-200">Username:</span>
                                    <span className="font-medium truncate max-w-[140px]" title={user?.email}>{user?.email || "N/A"}</span>
                                </div>
                                <div className="flex items-center">
                                    <span className="w-28 text-blue-200">Password:</span>
                                    <span className="font-medium tracking-widest mt-1 mr-2">••••••••••••</span>
                                </div>
                                <div className="flex items-center">
                                    <span className="w-28 text-blue-200">Subscription:</span>
                                    <span className={`${(sub?.current ? sub.current.name : subStatus)?.toString().toLowerCase().includes("free") ? "bg-[#2dd4bf]" : "bg-amber-500"} text-white text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1`}>
                                        <Check className="w-3 h-3" /> {sub?.current?.name || subStatus}
                                    </span>
                                </div>
                                <div className="flex">
                                    <span className="w-28 text-blue-200">Expiry:</span>
                                    <span className="font-medium text-white">{sub?.expiresAt ? new Date(sub.expiresAt).toLocaleDateString() : (isFree ? "Never" : "N/A")}</span>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>

                {/* ── Subscription & Plans ─────────────────────────────────── */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 md:p-8 mt-6">
                    <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
                        <h3 className="text-lg font-black text-slate-800">Subscription & Plans</h3>
                        {sub?.current && <span className="text-xs font-bold text-emerald-600">Current plan: {sub.current.name} · {ksh(sub.current.price)}/mo</span>}
                    </div>
                    <p className="text-xs text-slate-400 mb-5">Choose a plan and pay securely via M-PESA. {sub?.expiresAt ? `Renews/expires ${new Date(sub.expiresAt).toLocaleDateString()}.` : ""}</p>

                    {/* Payment phone */}
                    <div className="mb-5 max-w-xs">
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">M-PESA Phone (for paid plans)</label>
                        <input value={payPhone} onChange={(e) => setPayPhone(e.target.value)} placeholder="2547XXXXXXXX" className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#5C67F2]" />
                    </div>

                    {(!sub?.plans || sub.plans.length === 0) ? (
                        <div className="text-sm text-slate-400 py-6 text-center bg-slate-50 rounded-2xl">No plans available yet. Please check back soon.</div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {sub.plans.map((p: any) => {
                                const isCurrent = sub.current?._id === p._id;
                                return (
                                    <div key={p._id} className={`rounded-2xl border p-5 flex flex-col ${isCurrent ? "border-[#5C67F2] bg-[#5C67F2]/5" : "border-slate-100"}`}>
                                        <div className="flex items-center justify-between">
                                            <h4 className="font-black text-slate-800">{p.name}</h4>
                                            {isCurrent && <span className="text-[9px] font-black uppercase bg-[#5C67F2] text-white px-2 py-0.5 rounded-full">Current</span>}
                                        </div>
                                        <p className="text-2xl font-black mt-1 text-[#5C67F2]">{p.price > 0 ? ksh(p.price) : "Free"}<span className="text-xs text-slate-400 font-bold">{p.price > 0 ? "/mo" : ""}</span></p>
                                        <div className="text-xs text-slate-500 mt-2 space-y-1 flex-1">
                                            <div>Up to <b>{p.maxStudents == null ? "Unlimited" : Number(p.maxStudents).toLocaleString()}</b> students</div>
                                            <div><b>{(p.modules || []).length}</b> modules included</div>
                                            {p.description && <p className="text-[11px] text-slate-400 pt-1">{p.description}</p>}
                                        </div>
                                        <button
                                            disabled={isCurrent || subscribe.isPending}
                                            onClick={() => subscribe.mutate(p._id)}
                                            className={`mt-4 h-10 rounded-xl text-sm font-bold flex items-center justify-center gap-2 ${isCurrent ? "bg-slate-100 text-slate-400 cursor-default" : "bg-[#5C67F2] text-white hover:bg-[#4a54c4]"}`}>
                                            {subscribe.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                            {isCurrent ? "Active" : p.price > 0 ? "Subscribe & Pay" : "Choose Plan"}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* Subscription M-PESA payment modal with spinner */}
        {payModal && (
            <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4">
                <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden">
                    <div className="h-1.5 bg-gradient-to-r from-[#5C67F2] to-indigo-500" />
                    <div className="p-7 text-center">
                        {payModal.stage === "success" ? (
                            <>
                                <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4"><Check className="w-9 h-9 text-white" /></div>
                                <h3 className="text-xl font-black text-slate-800 mb-1">Payment Received!</h3>
                                <p className="text-slate-500 text-sm mb-3">{payModal.message}{payModal.plan ? ` (${payModal.plan})` : ""}</p>
                                {payModal.receipt && (
                                    <div className="bg-emerald-50 border border-emerald-100 rounded-lg px-4 py-2 mb-5">
                                        <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">M-PESA Code</p>
                                        <p className="text-base font-black text-emerald-700 tracking-wider">{payModal.receipt}</p>
                                    </div>
                                )}
                                <button onClick={closePayModal} className="w-full py-3 bg-emerald-500 text-white font-black text-xs uppercase tracking-widest rounded-lg">Done</button>
                            </>
                        ) : payModal.stage === "failed" ? (
                            <>
                                <div className="w-14 h-14 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-3"><AlertTriangle className="w-7 h-7 text-rose-500" /></div>
                                <h3 className="text-lg font-black text-slate-800 mb-1">Payment not completed</h3>
                                <p className="text-slate-500 text-xs mb-5">{payModal.message}</p>
                                <button onClick={closePayModal} className="w-full py-2.5 bg-slate-100 text-slate-600 font-bold text-xs rounded-lg">Close</button>
                            </>
                        ) : (
                            <>
                                <Loader2 className="w-12 h-12 animate-spin text-[#5C67F2] mx-auto mb-4" />
                                <h3 className="text-lg font-black text-slate-800 mb-1">{payModal.stage === "sending" ? "Starting payment…" : "Check your phone"}</h3>
                                <p className="text-slate-500 text-sm">{payModal.message}</p>
                                <p className="text-[11px] text-slate-400 mt-3">Detecting your M-PESA payment — this can take up to 2 minutes. Please don't close this window.</p>
                            </>
                        )}
                    </div>
                </div>
            </div>
        )}
        </>
    );
}
