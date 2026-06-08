import { useState } from "react";
import {
    Menu, Search, Maximize, MessageSquare, Bell,
    ChevronDown, GraduationCap, Settings, Building2, Lock
} from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

export default function TopHeader({ onMenuClick }: { onMenuClick?: () => void }) {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const { data: profileData } = useQuery<any>({
        queryKey: ["tenant_profile_global"],
        queryFn: async () => {
            const r = await api.get("/auth/tenant/profile");
            return Array.isArray(r.data) ? r.data[0] : r.data;
        },
    });
    const instituteName = profileData?.name || "Institute Name";
    const instituteLogo = profileData?.logo || "";

    const { data: theme } = useQuery({
        queryKey: ["theme_settings"],
        queryFn: async () => {
            const r = await api.get("/theme_settings");
            return r.data?.[0];
        }
    });

    const headerBg = theme?.headerBackground || "bg-white";
    const isDark = headerBg !== "bg-white" && headerBg !== "bg-gray-50" && headerBg !== "";
    const textPrimary = isDark ? "text-white" : "text-gray-800";
    const textSecondary = isDark ? "text-gray-200" : "text-gray-400";
    const hoverSecondary = isDark ? "hover:text-white" : "hover:text-gray-600";
    const borderClass = isDark ? "border-white/10" : "border-gray-100";

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    };

    return (
        <header className={`h-16 ${headerBg} border-b ${borderClass} flex items-center px-3 sm:px-6 sticky top-0 z-50 shadow-sm transition-colors duration-300`}>
            {/* Logo Area */}
            <div className="flex items-center gap-2 sm:gap-3 w-auto sm:w-64 flex-shrink-0">
                <div className="flex flex-col items-center">
                    <GraduationCap className={`w-8 h-8 ${textPrimary}`} strokeWidth={1.5} />
                    <div className="flex items-center gap-0.5">
                        <span className={`${isDark ? 'text-white' : 'text-[#5C67F2]'} font-black text-lg tracking-tighter`}>shule</span>
                        <span className={`${textPrimary} font-black text-lg tracking-tighter italic flex items-center`}>
                            cl<span className={`relative inline-block w-4 h-4 rounded-full border-2 ${isDark ? 'border-white' : 'border-gray-800'} mx-0.5 -mt-0.5 after:content-[''] after:absolute after:top-1/2 after:left-1/2 after:-translate-x-1/2 after:-translate-y-1/2 after:w-1.5 after:h-1.5 after:${isDark ? 'bg-white' : 'bg-[#5C67F2]'} after:rounded-full`}></span>ud
                        </span>
                    </div>
                </div>
            </div>

            {/* Middle Tools */}
            <div className="flex items-center gap-3 sm:gap-6 ml-3 sm:ml-10">
                {/* Hamburger — prominent on mobile, subtle on desktop */}
                <button
                    onClick={onMenuClick}
                    className={`${textSecondary} ${hoverSecondary} transition-colors p-1 -ml-1`}
                    aria-label="Toggle sidebar"
                >
                    <Menu className="w-6 h-6" />
                </button>
                <button className={`hidden sm:block ${textSecondary} ${hoverSecondary} transition-colors`}>
                    <Search className="w-5 h-5" />
                </button>
                <button
                    onClick={toggleFullscreen}
                    className={`hidden sm:block ${textSecondary} ${hoverSecondary} transition-colors`}
                >
                    <Maximize className="w-5 h-5" />
                </button>
            </div>

            {/* Right side Actions */}
            <div className="ml-auto flex items-center gap-4">
                {/* Vertical Divider */}
                <div className={`w-[1px] h-8 ${isDark ? 'bg-white/10' : 'bg-gray-100'} mx-2 hidden lg:block`}></div>

                {/* Profile Tools */}
                <div className="flex items-center gap-5 relative">
                    <button className={`relative ${textSecondary} ${hoverSecondary} transition-colors`}>
                        <MessageSquare className="w-6 h-6" strokeWidth={1.5} />
                    </button>
                    <button className={`relative ${textSecondary} ${hoverSecondary} transition-colors`}>
                        <Bell className="w-6 h-6" strokeWidth={1.5} />
                    </button>

                    {/* Institute Profile Dropdown Container */}
                    <div className="relative">
                        <button 
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className={`flex items-center gap-3 pl-4 border-l ${borderClass} group focus:outline-none`}
                        >
                            <div className={`w-10 h-10 rounded-full ${isDark ? 'bg-white/10' : 'bg-[#f4f7f6]'} flex items-center justify-center border ${isDark ? 'border-white/20' : 'border-gray-100'} group-hover:border-[#5C67F2] transition-colors overflow-hidden`}>
                                {instituteLogo ? (
                                    <img src={instituteLogo} alt="Logo" className="w-full h-full object-contain" />
                                ) : (
                                    <svg className={`w-6 h-6 ${isDark ? 'text-white' : 'text-[#5C67F2]'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 21h18M3 10h18M5 10V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3M7 10v4M11 10v4M13 10v4M17 10v4M10 21v-4a2 2 0 0 1 2-2 2 2 0 0 1 2 2v4"/></svg>
                                )}
                            </div>
                            <div className="text-left hidden sm:block">
                                <div className="flex items-center gap-1">
                                    <p className={`text-sm font-bold ${textPrimary} tracking-tight`}>{instituteName}</p>
                                    <ChevronDown className={`w-4 h-4 ${textSecondary} transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                                </div>
                            </div>
                        </button>

                        {/* Dropdown Menu */}
                        {isDropdownOpen && (
                            <>
                                {/* Overlay to close dropdown */}
                                <div 
                                    className="fixed inset-0 z-10" 
                                    onClick={() => setIsDropdownOpen(false)}
                                />
                                <div className="absolute right-0 mt-3 w-56 bg-white rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] border border-gray-100 py-2 z-20 animate-in fade-in zoom-in duration-200 origin-top-right">
                                    {/* Triangle Arrow */}
                                    <div className="absolute -top-2 right-4 w-4 h-4 bg-white border-t border-l border-gray-100 rotate-45" />
                                    
                                    <Link 
                                        to="/settings/account" 
                                        className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors"
                                        onClick={() => setIsDropdownOpen(false)}
                                    >
                                        <Settings className="w-5 h-5 text-gray-400" strokeWidth={1.5} />
                                        <span className="text-sm font-medium">Account Settings</span>
                                    </Link>
                                    
                                    <Link 
                                        to="/settings/profile" 
                                        className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors"
                                        onClick={() => setIsDropdownOpen(false)}
                                    >
                                        <Building2 className="w-5 h-5 text-gray-400" strokeWidth={1.5} />
                                        <span className="text-sm font-medium">Profile</span>
                                    </Link>
                                    
                                    <div className="h-[1px] bg-gray-100 my-1 mx-4" />
                                    
                                    <button
                                        className="w-full flex items-center gap-3 px-4 py-3 text-rose-600 hover:bg-rose-50 transition-colors text-left"
                                        onClick={() => {
                                            setIsDropdownOpen(false);
                                            window.location.href = "/logout";
                                        }}
                                    >
                                        <Lock className="w-5 h-5 text-rose-400" strokeWidth={1.5} />
                                        <span className="text-sm font-medium font-bold">Logout</span>
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}
