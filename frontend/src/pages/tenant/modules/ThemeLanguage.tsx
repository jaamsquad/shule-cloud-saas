import { Home, Check, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";

export default function ThemeLanguage() {
    const queryClient = useQueryClient();

    const [settings, setSettings] = useState({
        themePlacement: "LTL",
        sidebarBackground: "light",
        headerBackground: "bg-white",
        activeItemBackground: "bg-[#5C67F2]",
        language: "English"
    });

    const { data: existingSettings, isLoading } = useQuery({
        queryKey: ["theme_settings"],
        queryFn: async () => {
            const r = await api.get("/theme_settings");
            return r.data?.[0]; // Assume global settings
        }
    });

    useEffect(() => {
        if (existingSettings) {
            setSettings({
                themePlacement: existingSettings.themePlacement || "LTL",
                sidebarBackground: existingSettings.sidebarBackground || "light",
                headerBackground: existingSettings.headerBackground || "bg-white",
                activeItemBackground: existingSettings.activeItemBackground || "bg-[#5C67F2]",
                language: existingSettings.language || "English"
            });
        }
    }, [existingSettings]);

    const saveMutation = useMutation({
        mutationFn: async (payload: any) => {
            if (existingSettings?._id) {
                return api.patch(`/theme_settings/${existingSettings._id}`, payload);
            }
            return api.post("/theme_settings", payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["theme_settings"] });
            toast.success("Theme settings saved successfully");
        },
        onError: (err: any) => toast.error(err?.response?.data?.message || "Failed to save settings")
    });

    const headerColors = ['bg-gray-800', 'bg-red-400', 'bg-blue-400', 'bg-green-400', 'bg-sky-400', 'bg-white'];
    const activeColors = [
        'bg-red-500', 'bg-pink-500', 'bg-teal-500', 'bg-blue-500', 'bg-yellow-500', 'bg-orange-500',
        'bg-[#5C67F2]', 'bg-indigo-600', 'bg-rose-500', 'bg-orange-600', 'bg-green-600', 'bg-purple-600'
    ];

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-[#f4f7f6]">
                <Loader2 className="w-12 h-12 text-[#5C67F2] animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex-1 bg-[#f4f7f6] min-h-screen flex flex-col items-center pb-20">
            {/* Breadcrumb Header */}
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center shadow-sm z-10 m-4 rounded-xl w-[calc(100%-2rem)]">
                <span className="font-bold text-gray-800 text-lg mr-2">Settings</span>
                <span className="text-gray-300 mx-2">|</span>
                <Home className="w-4 h-4 text-gray-500 mr-2" />
                <span className="text-gray-500 font-medium">
                    - Theme & Language
                </span>
            </div>

            <div className="p-6 pt-0 w-full max-w-4xl mt-6">
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-10 relative">
                    <div className="text-center mb-10">
                        <h2 className="text-2xl font-bold text-gray-800 tracking-tight mb-2">Theme Settings</h2>
                        <div className="flex items-center justify-center gap-2 text-sm text-gray-500 font-medium">
                            <div className="w-3.5 h-1.5 bg-[#5C67F2] rounded-full"></div>
                            Update Theme styling and Language Settings
                        </div>
                    </div>

                    <div className="space-y-10">
                        {/* Theme Placement and Sidebar Background */}
                        <div className="flex gap-6">
                            <div className="relative flex-1">
                                <div className="absolute -top-3 left-6 bg-[#868DF4] text-white text-[11px] px-3 py-1 rounded-full font-semibold tracking-wide z-10 shadow-sm">
                                    Theme Placement*
                                </div>
                                <div className="w-full h-24 border border-[#5C67F2]/20 rounded-3xl p-4 flex gap-4 bg-gray-50">
                                    <div 
                                        onClick={() => setSettings({...settings, themePlacement: 'LTL'})}
                                        className={`w-16 h-full bg-white rounded-xl flex flex-col items-center justify-center relative cursor-pointer transition-all ${settings.themePlacement === 'LTL' ? 'border-2 border-[#5C67F2] shadow-sm' : 'border border-gray-200 hover:border-[#5C67F2]/50'}`}
                                    >
                                        {settings.themePlacement === 'LTL' && (
                                            <div className="absolute -top-2 -right-2 w-5 h-5 bg-[#5C67F2] rounded-full flex items-center justify-center text-white">
                                                <Check className="w-3 h-3" />
                                            </div>
                                        )}
                                        <div className="w-full flex px-2 gap-1 mb-2">
                                            <div className={`w-3 h-3 ${settings.themePlacement === 'LTL' ? 'bg-[#5C67F2]' : 'bg-gray-300'} rounded-sm`}></div>
                                            <div className="flex-1 flex flex-col gap-0.5 mt-0.5">
                                                <div className="w-full h-0.5 bg-gray-200"></div>
                                                <div className="w-3/4 h-0.5 bg-gray-200"></div>
                                            </div>
                                        </div>
                                        <span className={`${settings.themePlacement === 'LTL' ? 'text-[#5C67F2]' : 'text-gray-500'} font-bold text-sm`}>LTL</span>
                                    </div>

                                    <div 
                                        onClick={() => setSettings({...settings, themePlacement: 'RTL'})}
                                        className={`w-16 h-full bg-white rounded-xl flex flex-col items-center justify-center relative cursor-pointer transition-all ${settings.themePlacement === 'RTL' ? 'border-2 border-[#5C67F2] shadow-sm' : 'border border-gray-200 hover:border-[#5C67F2]/50'}`}
                                    >
                                        {settings.themePlacement === 'RTL' && (
                                            <div className="absolute -top-2 -right-2 w-5 h-5 bg-[#5C67F2] rounded-full flex items-center justify-center text-white">
                                                <Check className="w-3 h-3" />
                                            </div>
                                        )}
                                        <div className="w-full flex px-2 gap-1 mb-2 flex-row-reverse">
                                            <div className={`w-3 h-3 ${settings.themePlacement === 'RTL' ? 'bg-[#5C67F2]' : 'bg-gray-300'} rounded-sm`}></div>
                                            <div className="flex-1 flex flex-col gap-0.5 mt-0.5 items-end">
                                                <div className="w-full h-0.5 bg-gray-200"></div>
                                                <div className="w-3/4 h-0.5 bg-gray-200"></div>
                                            </div>
                                        </div>
                                        <span className={`${settings.themePlacement === 'RTL' ? 'text-[#5C67F2]' : 'text-gray-500'} font-bold text-sm`}>RTL</span>
                                    </div>
                                </div>
                            </div>

                            <div className="relative flex-1">
                                <div className="absolute -top-3 left-6 bg-[#868DF4] text-white text-[11px] px-3 py-1 rounded-full font-semibold tracking-wide z-10 shadow-sm">
                                    Sidebar Background*
                                </div>
                                <div className="w-full h-24 border border-[#5C67F2]/20 rounded-3xl p-4 flex gap-4 bg-gray-50">
                                    <div 
                                        onClick={() => setSettings({...settings, sidebarBackground: 'light'})}
                                        className={`w-16 h-full bg-white rounded-xl flex relative cursor-pointer overflow-hidden transition-all ${settings.sidebarBackground === 'light' ? 'border-2 border-[#5C67F2] shadow-sm' : 'border border-gray-200 hover:border-[#5C67F2]/50'}`}
                                    >
                                        {settings.sidebarBackground === 'light' && (
                                            <div className="absolute -top-2 -right-2 w-5 h-5 bg-[#5C67F2] rounded-full flex items-center justify-center text-white z-10">
                                                <Check className="w-3 h-3" />
                                            </div>
                                        )}
                                        <div className="w-1/3 h-full bg-gray-100 border-r border-gray-200"></div>
                                    </div>
                                    <div 
                                        onClick={() => setSettings({...settings, sidebarBackground: 'dark'})}
                                        className={`w-16 h-full bg-white rounded-xl flex relative cursor-pointer overflow-hidden transition-all ${settings.sidebarBackground === 'dark' ? 'border-2 border-[#5C67F2] shadow-sm' : 'border border-gray-200 hover:border-[#5C67F2]/50'}`}
                                    >
                                        {settings.sidebarBackground === 'dark' && (
                                            <div className="absolute -top-2 -right-2 w-5 h-5 bg-[#5C67F2] rounded-full flex items-center justify-center text-white z-10">
                                                <Check className="w-3 h-3" />
                                            </div>
                                        )}
                                        <div className="w-1/3 h-full bg-gray-800 border-r border-gray-700"></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Header Background */}
                        <div className="relative">
                            <div className="absolute -top-3 left-6 bg-[#868DF4] text-white text-[11px] px-3 py-1 rounded-full font-semibold tracking-wide z-10 shadow-sm">
                                Header Background
                            </div>
                            <div className="w-full border border-gray-200 rounded-3xl p-6 flex gap-4 bg-gray-50 flex-wrap">
                                {headerColors.map((color, i) => (
                                    <div 
                                        key={i} 
                                        onClick={() => setSettings({...settings, headerBackground: color})}
                                        className={`w-12 h-10 bg-white rounded-lg flex flex-col cursor-pointer overflow-hidden relative transition-all ${settings.headerBackground === color ? 'border-2 border-[#5C67F2]' : 'border border-gray-200 hover:border-[#5C67F2]/50'}`}
                                    >
                                        {settings.headerBackground === color && (
                                            <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#5C67F2] rounded-full flex items-center justify-center text-white z-10">
                                                <Check className="w-2.5 h-2.5" />
                                            </div>
                                        )}
                                        <div className={`w-full h-3 ${color} ${color === 'bg-white' ? 'border-b border-gray-200 bg-gray-100' : ''}`}></div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Active item Background */}
                        <div className="relative">
                            <div className="absolute -top-3 left-6 bg-[#868DF4] text-white text-[11px] px-3 py-1 rounded-full font-semibold tracking-wide z-10 shadow-sm">
                                Active item Background
                            </div>
                            <div className="w-full border border-gray-200 rounded-3xl p-6 flex gap-4 bg-gray-50 flex-wrap items-center">
                                {activeColors.map((color, i) => (
                                    <div
                                        key={i}
                                        onClick={() => setSettings({...settings, activeItemBackground: color})}
                                        className={`rounded cursor-pointer relative transition-all ${settings.activeItemBackground === color ? 'w-8 h-8 border-2 border-[#5C67F2] p-0.5 bg-white' : 'w-6 h-6 hover:opacity-80'}`}
                                    >
                                        {settings.activeItemBackground === color ? (
                                            <>
                                                <div className="absolute -top-2 -right-2 w-4 h-4 bg-[#5C67F2] rounded-full flex items-center justify-center text-white z-10">
                                                    <Check className="w-2.5 h-2.5" />
                                                </div>
                                                <div className={`w-full h-full rounded ${color}`}></div>
                                            </>
                                        ) : (
                                            <div className={`w-full h-full rounded ${color}`}></div>
                                        )}
                                    </div>
                                ))}
                                {/* Any colour — custom picker. Stored as bg-[#hex] (Tailwind arbitrary value). */}
                                <label className="w-8 h-8 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center cursor-pointer overflow-hidden relative" title="Choose any colour">
                                    <input type="color"
                                        value={(settings.activeItemBackground.match(/#([0-9a-fA-F]{6})/) || [, "5C67F2"])[1] ? `#${(settings.activeItemBackground.match(/#([0-9a-fA-F]{6})/) || [, "5C67F2"])[1]}` : "#5C67F2"}
                                        onChange={(e) => setSettings({ ...settings, activeItemBackground: `bg-[${e.target.value}]` })}
                                        className="w-10 h-10 cursor-pointer" />
                                </label>
                                {settings.activeItemBackground.startsWith("bg-[#") && (
                                    <div className="w-8 h-8 rounded border-2 border-[#5C67F2] p-0.5 bg-white relative">
                                        <div className="w-full h-full rounded" style={{ background: settings.activeItemBackground.slice(4, -1) }} />
                                        <div className="absolute -top-2 -right-2 w-4 h-4 bg-[#5C67F2] rounded-full flex items-center justify-center text-white z-10"><Check className="w-2.5 h-2.5" /></div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Select Language */}
                        <div className="relative group">
                            <div className="absolute -top-3 left-6 bg-[#868DF4] text-white text-[11px] px-3 py-1 rounded-full font-semibold tracking-wide z-10 shadow-sm group-focus-within:scale-110 transition-transform">
                                Select Language
                            </div>
                            <select 
                                value={settings.language}
                                onChange={(e) => setSettings({...settings, language: e.target.value})}
                                className="w-full h-12 px-6 border border-[#5C67F2]/40 rounded-full focus:outline-none focus:border-[#5C67F2] text-gray-700 font-bold bg-white appearance-none cursor-pointer text-sm"
                            >
                                <option value="English">English</option>
                                <option value="French">French</option>
                                <option value="Swahili">Swahili</option>
                            </select>
                            <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none">
                                <svg className="w-4 h-4 text-[#5C67F2]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                            </div>
                        </div>

                        <div className="flex justify-center mt-10">
                            <button 
                                onClick={() => saveMutation.mutate(settings)}
                                disabled={saveMutation.isPending}
                                className="h-12 px-10 bg-[#FFC165] hover:bg-[#e0a855] text-gray-800 font-bold rounded-full shadow-md flex items-center gap-2 transition-colors disabled:opacity-50"
                            >
                                {saveMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                                Save Settings
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
