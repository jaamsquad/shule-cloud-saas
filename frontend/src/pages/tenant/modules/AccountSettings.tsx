import { Settings, RefreshCcw, Eye, Lock, Trash2, Check, EyeOff, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
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

    const deleteAccount = useMutation({
        mutationFn: async (id: string) => await api.delete(`/auth/tenant/user/${id}`),
        onSuccess: () => {
            toast.success("Account deleted successfully.");
            localStorage.clear();
            navigate("/login");
        },
        onError: () => toast.error("Failed to delete account.")
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

    const handleDelete = () => {
        if (window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
            if (user?.id) {
                deleteAccount.mutate(user.id);
            }
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
                                    <span className={`${isFree ? "bg-[#2dd4bf]" : "bg-amber-500"} text-white text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1`}>
                                        <Check className="w-3 h-3" /> {subStatus}
                                    </span>
                                </div>
                                <div className="flex">
                                    <span className="w-28 text-blue-200">Expiry:</span>
                                    <span className="font-medium text-white">{isFree ? "Never" : "N/A"}</span>
                                </div>
                            </div>

                            <button 
                                onClick={handleDelete}
                                disabled={deleteAccount.isPending}
                                className="h-10 px-6 bg-[#ef4444] hover:bg-[#dc2626] disabled:opacity-70 text-white font-bold rounded-full shadow-sm flex items-center gap-2 transition-colors relative z-10 text-xs tracking-wide"
                            >
                                {deleteAccount.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} 
                                Delete Account
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
