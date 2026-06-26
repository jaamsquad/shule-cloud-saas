import { useState, useEffect, useRef } from "react";
import {
    Menu, Search, Maximize, MessageSquare, Bell,
    ChevronDown, GraduationCap, Settings, Building2, Lock,
    LayoutGrid, User, Users, BookOpen, FileText, X
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { navItems } from "./AppSidebar";
import BranchSwitcher from "./BranchSwitcher";

// Flatten the sidebar nav into searchable {label, path, group} entries.
const NAV_LINKS = navItems.flatMap((item: any) =>
    item.children
        ? item.children.filter((c: any) => c.path && c.label && c.path !== "/logout").map((c: any) => ({ label: c.label, path: c.path, group: item.label || "" }))
        : item.path && item.label && item.path !== "/logout" ? [{ label: item.label, path: item.path, group: "" }] : []
);

const TYPE_META: Record<string, { icon: any; link: (id: string) => string }> = {
    Page: { icon: LayoutGrid, link: () => "#" },
    Employee: { icon: User, link: id => `/staff/edit/${id}` },
    Student: { icon: Users, link: id => `/students/edit/${id}` },
    Subject: { icon: BookOpen, link: () => `/subjects/all` },
    Invoice: { icon: FileText, link: id => `/fees/invoice/${id}` },
};

// Highlight the matched part of a string.
function Highlight({ text, q }: { text: string; q: string }) {
    if (!q) return <>{text}</>;
    const i = text.toLowerCase().indexOf(q.toLowerCase());
    if (i === -1) return <>{text}</>;
    return <>{text.slice(0, i)}<mark className="bg-yellow-200 text-inherit rounded px-0.5">{text.slice(i, i + q.length)}</mark>{text.slice(i + q.length)}</>;
}

export default function TopHeader({ onMenuClick }: { onMenuClick?: () => void }) {
    const navigate = useNavigate();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [q, setQ] = useState("");
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);
    const [notifOpen, setNotifOpen] = useState(false);
    const [dismissedBanner, setDismissedBanner] = useState<string[]>(() => { try { return JSON.parse(sessionStorage.getItem("dismissedBanners") || "[]"); } catch { return []; } });

    const qc = useQueryClient();
    const { data: notifications = [] } = useQuery({
        queryKey: ["tenant_notifications"],
        refetchInterval: 60000,
        queryFn: async () => { try { const r = await api.get("/notifications"); return Array.isArray(r.data) ? r.data : []; } catch { return []; } },
    });
    const unread = notifications.filter((n: any) => !n.read).length;
    // Banner = platform notices not yet dismissed this session.
    const banners = notifications.filter((n: any) => n.type === "platform" && !dismissedBanner.includes(String(n._id)));
    const dismissBanner = async (id: string) => {
        const next = [...dismissedBanner, id]; setDismissedBanner(next); sessionStorage.setItem("dismissedBanners", JSON.stringify(next));
        try { await api.patch(`/notifications/${id}/dismiss`); qc.invalidateQueries({ queryKey: ["tenant_notifications"] }); } catch { /* ignore */ }
    };

    // Sidebar-tab matches (client-side).
    const pageMatches = q.length >= 1
        ? NAV_LINKS.filter(n => (n.label || "").toLowerCase().includes(q.toLowerCase())).slice(0, 6).map(n => ({ type: "Page", id: n.path, label: n.label, sub: n.group, path: n.path }))
        : [];

    // DB search (debounced).
    useEffect(() => {
        if (!searchOpen || q.trim().length < 2) { setResults([]); return; }
        setLoading(true);
        const t = setTimeout(async () => {
            try { const r = await api.get(`/search?q=${encodeURIComponent(q.trim())}`); setResults(Array.isArray(r.data) ? r.data : []); }
            catch { setResults([]); }
            finally { setLoading(false); }
        }, 250);
        return () => clearTimeout(t);
    }, [q, searchOpen]);

    useEffect(() => {
        const onClick = (e: MouseEvent) => { if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false); };
        document.addEventListener("mousedown", onClick);
        return () => document.removeEventListener("mousedown", onClick);
    }, []);

    const all = [...pageMatches, ...results];
    const grouped: Record<string, any[]> = {};
    all.forEach(r => { (grouped[r.type] ||= []).push(r); });

    const go = (r: any) => {
        const path = r.path || TYPE_META[r.type]?.link(r.id) || "#";
        setSearchOpen(false); setQ("");
        navigate(path);
    };
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

    const bannerColor = (lvl: string) => lvl === "warning" ? "bg-amber-500" : lvl === "success" ? "bg-emerald-500" : "bg-[#5C67F2]";

    return (
        <>
        {/* Platform notification banners (from the system owner) — dismissible */}
        {banners.map((n: any) => (
            <div key={n._id} className={`${bannerColor(n.level)} text-white px-4 py-2.5 flex items-center gap-3 text-sm`}>
                <Bell className="w-4 h-4 flex-shrink-0" />
                <span className="font-bold">{n.title}</span>
                <span className="opacity-90 truncate flex-1">{n.message}</span>
                <button onClick={() => dismissBanner(String(n._id))} className="opacity-80 hover:opacity-100 flex-shrink-0"><X className="w-4 h-4" /></button>
            </div>
        ))}
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
                <div className="relative hidden sm:block" ref={searchRef}>
                    <button onClick={() => setSearchOpen(o => !o)} className={`${textSecondary} ${hoverSecondary} transition-colors`} aria-label="Search">
                        <Search className="w-5 h-5" />
                    </button>
                    {searchOpen && (
                        <div className="absolute left-0 mt-3 w-[26rem] max-w-[90vw] bg-white rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.15)] border border-gray-100 z-50 overflow-hidden">
                            <div className="flex items-center gap-2 px-3 border-b border-gray-100">
                                <Search className="w-4 h-4 text-gray-400" />
                                <input
                                    autoFocus value={q} onChange={e => setQ(e.target.value)}
                                    placeholder="Search pages, employees, students, subjects, invoices…"
                                    className="flex-1 h-11 text-sm text-gray-700 outline-none bg-transparent"
                                />
                                {q && <button onClick={() => setQ("")} className="text-gray-300 hover:text-gray-500"><X className="w-4 h-4" /></button>}
                            </div>
                            <div className="max-h-[60vh] overflow-y-auto py-1">
                                {q.trim().length < 1 ? (
                                    <p className="text-xs text-gray-400 px-4 py-6 text-center">Type to search across the school…</p>
                                ) : all.length === 0 ? (
                                    <p className="text-xs text-gray-400 px-4 py-6 text-center">{loading ? "Searching…" : "No matches found."}</p>
                                ) : (
                                    Object.entries(grouped).map(([type, items]) => {
                                        const Icon = TYPE_META[type]?.icon || LayoutGrid;
                                        return (
                                            <div key={type} className="py-1">
                                                <p className="px-4 py-1 text-[10px] font-black uppercase tracking-widest text-gray-400">{type === "Page" ? "Pages" : type + "s"}</p>
                                                {items.map((r: any) => (
                                                    <button key={r.type + r.id} onClick={() => go(r)} className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 text-left">
                                                        <Icon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                                        <span className="min-w-0">
                                                            <span className="block text-sm font-semibold text-gray-700 truncate"><Highlight text={r.label} q={q} /></span>
                                                            {r.sub && <span className="block text-xs text-gray-400 truncate">{r.sub}</span>}
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    )}
                </div>
                <button
                    onClick={toggleFullscreen}
                    className={`hidden sm:block ${textSecondary} ${hoverSecondary} transition-colors`}
                >
                    <Maximize className="w-5 h-5" />
                </button>

                {/* Multi-branch: organization users get a Branch Switcher here */}
                <BranchSwitcher />
            </div>

            {/* Right side Actions */}
            <div className="ml-auto flex items-center gap-4">
                {/* Vertical Divider */}
                <div className={`w-[1px] h-8 ${isDark ? 'bg-white/10' : 'bg-gray-100'} mx-2 hidden lg:block`}></div>

                {/* Profile Tools */}
                <div className="flex items-center gap-5 relative">
                    {/* For staff with "both" portal access — jump to the teaching portal */}
                    {typeof window !== "undefined" && localStorage.getItem("can_teacher_portal") === "1" && localStorage.getItem("staff_token") && (
                        <button
                            onClick={() => { localStorage.setItem("active_portal", "staff"); window.location.href = "/"; }}
                            title="Open your Teaching Portal"
                            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-[#5C67F2] hover:bg-[#4a54c4] text-white text-xs font-black uppercase tracking-wide shadow-sm transition-colors">
                            <GraduationCap className="w-4 h-4" /> Teaching Portal
                        </button>
                    )}
                    <button className={`relative ${textSecondary} ${hoverSecondary} transition-colors`}>
                        <MessageSquare className="w-6 h-6" strokeWidth={1.5} />
                    </button>
                    <div className="relative">
                        <button onClick={() => setNotifOpen(o => !o)} className={`relative ${textSecondary} ${hoverSecondary} transition-colors`}>
                            <Bell className="w-6 h-6" strokeWidth={1.5} />
                            {unread > 0 && <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center">{unread}</span>}
                        </button>
                        {notifOpen && (
                            <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden">
                                <div className="px-4 py-3 border-b border-slate-50 flex items-center justify-between">
                                    <span className="font-black text-slate-800 text-sm">Notifications</span>
                                    {notifications.length > 0 && <button onClick={async () => { try { await api.patch("/notifications/read-all"); qc.invalidateQueries({ queryKey: ["tenant_notifications"] }); } catch {} }} className="text-[11px] font-bold text-[#5C67F2]">Mark all read</button>}
                                </div>
                                <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                                    {notifications.length === 0 ? (
                                        <div className="px-4 py-8 text-center text-slate-400 text-xs font-bold">No notifications</div>
                                    ) : notifications.map((n: any) => (
                                        <div key={n._id} className={`px-4 py-3 ${!n.read ? "bg-[#5C67F2]/5" : ""}`}>
                                            <div className="font-bold text-slate-800 text-sm">{n.title || "Notice"}</div>
                                            <div className="text-xs text-slate-500 mt-0.5">{n.message}</div>
                                            <div className="text-[10px] text-slate-400 mt-1">{n.from || "School"} · {n.createdAt ? new Date(n.createdAt).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

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
        </>
    );
}
