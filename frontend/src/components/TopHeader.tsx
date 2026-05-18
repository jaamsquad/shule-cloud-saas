import { useState } from "react";
import { 
    Menu, Search, Maximize, ShoppingBag, MessageSquare, Bell, 
    ShoppingCart, ChevronDown, GraduationCap, Settings, Building2, Lock 
} from "lucide-react";
import { Link } from "react-router-dom";
import { useItems } from "@/hooks/useItems";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

export default function TopHeader({ onMenuClick }: { onMenuClick?: () => void }) {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const { items: tenantProfiles } = useItems("tenant_profile");
    const instituteName = tenantProfiles?.[0]?.name || "Institute Name";

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
        <header className={`h-16 ${headerBg} border-b ${borderClass} flex items-center px-6 sticky top-0 z-50 shadow-sm transition-colors duration-300`}>
            {/* Logo Area */}
            <div className="flex items-center gap-3 w-64 flex-shrink-0">
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
            <div className="flex items-center gap-6 ml-10">
                <button 
                    onClick={onMenuClick}
                    className={`${textSecondary} ${hoverSecondary} transition-colors`}
                >
                    <Menu className="w-6 h-6" />
                </button>
                <button className={`${textSecondary} ${hoverSecondary} transition-colors`}>
                    <Search className="w-5 h-5" />
                </button>
                <button 
                    onClick={toggleFullscreen}
                    className={`${textSecondary} ${hoverSecondary} transition-colors`}
                >
                    <Maximize className="w-5 h-5" />
                </button>
            </div>

            {/* Right side Actions */}
            <div className="ml-auto flex items-center gap-4">
                {/* Store Links */}
                <div className="hidden xl:flex items-center gap-3">
                    <button className="bg-[#00A3FF] hover:bg-[#0089d6] text-white rounded-full px-4 py-2 flex items-center gap-2 transition-all shadow-sm">
                        <div className="bg-white/20 p-1 rounded-full">
                            <svg className="w-3.5 h-3.5 fill-white" viewBox="0 0 384 512"><path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-31.4-97.3-132-101.7-192zM232.2 35.6c28.5-35 23.6-69.5 23.6-69.5s-36.1 3.1-64.1 35.6c-25.2 29-22.1 63.5-22.1 63.5s34.1 5.4 62.6-29.6z"/></svg>
                        </div>
                        <div className="text-left">
                            <p className="text-[6px] font-bold opacity-80 leading-none">DOWNLOAD ON THE</p>
                            <p className="text-[9px] font-black leading-tight">APP STORE</p>
                        </div>
                    </button>

                    <button className="bg-[#868DF4] hover:bg-[#5C67F2] text-white rounded-full px-4 py-2 flex items-center gap-2 transition-all shadow-sm">
                        <div className="bg-white/20 p-1 rounded-full">
                            <svg className="w-3.5 h-3.5 fill-white" viewBox="0 0 512 512"><path d="M325.3 234.3L104.6 13l280.8 161.2-60.1 60.1zM47 0C34 6.8 25.3 19.2 25.3 35.3v441.3c0 16.1 8.7 28.5 21.7 35.3l256.6-256L47 0zm425.2 225.6l-58.9-34.1-65.7 64.5 65.7 64.5 60.1-34.1c18-10.3 18-28.5-1.2-40.8zM303.6 277.7l-233 233 283.4-162.8-50.4-70.2z"/></svg>
                        </div>
                        <div className="text-left">
                            <p className="text-[6px] font-bold opacity-80 leading-none">GET IT ON</p>
                            <p className="text-[9px] font-black leading-tight">GOOGLE PLAY</p>
                        </div>
                    </button>
                </div>

                {/* Vertical Divider */}
                <div className={`w-[1px] h-8 ${isDark ? 'bg-white/10' : 'bg-gray-100'} mx-2 hidden lg:block`}></div>

                {/* Profile Tools */}
                <div className="flex items-center gap-5 relative">
                    <button className={`relative ${textSecondary} ${hoverSecondary} transition-colors`}>
                        <ShoppingBag className="w-6 h-6" strokeWidth={1.5} />
                    </button>
                    <button className={`relative ${textSecondary} ${hoverSecondary} transition-colors`}>
                        <MessageSquare className="w-6 h-6" strokeWidth={1.5} />
                        <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-white rounded-full"></span>
                    </button>
                    <button className={`relative ${textSecondary} ${hoverSecondary} transition-colors`}>
                        <Bell className="w-6 h-6" strokeWidth={1.5} />
                        <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-rose-400 border-2 border-white rounded-full"></span>
                    </button>
                    <button className={`relative ${textSecondary} ${hoverSecondary} transition-colors`}>
                        <ShoppingCart className="w-6 h-6" strokeWidth={1.5} />
                        <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-orange-300 border-2 border-white rounded-full"></span>
                    </button>

                    {/* Institute Profile Dropdown Container */}
                    <div className="relative">
                        <button 
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className={`flex items-center gap-3 pl-4 border-l ${borderClass} group focus:outline-none`}
                        >
                            <div className={`w-10 h-10 rounded-full ${isDark ? 'bg-white/10' : 'bg-[#f4f7f6]'} flex items-center justify-center border ${isDark ? 'border-white/20' : 'border-gray-100'} group-hover:border-[#5C67F2] transition-colors overflow-hidden`}>
                                <svg className={`w-6 h-6 ${isDark ? 'text-white' : 'text-[#5C67F2]'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 21h18M3 10h18M5 10V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3M7 10v4M11 10v4M13 10v4M17 10v4M10 21v-4a2 2 0 0 1 2-2 2 2 0 0 1 2 2v4"/></svg>
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
                                        className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors text-left"
                                        onClick={() => {
                                            setIsDropdownOpen(false);
                                            // Handle logout logic here
                                        }}
                                    >
                                        <Lock className="w-5 h-5 text-gray-400" strokeWidth={1.5} />
                                        <span className="text-sm font-medium">Logout</span>
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
