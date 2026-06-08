import { ReactNode, useState } from "react";
import { NavLink } from "react-router-dom";
import { Menu, Search, ChevronDown, LogOut, type LucideIcon } from "lucide-react";

export interface PortalNavItem {
    to: string;
    label: string;
    icon: LucideIcon;
}
export interface PortalNavSection {
    label: string;
    items: PortalNavItem[];
}

export interface PortalUser {
    name: string;
    subtitle?: string;
    photo?: string | null;
}

interface PortalShellProps {
    brandName: string;
    brandCrest?: string | null;
    sections: PortalNavSection[];
    user: PortalUser;
    onLogout: () => void;
    accent?: string;       // sidebar colour (per-portal theme)
    children: ReactNode;
}

// Egerton-style portal chrome: white logo panel + coloured sidebar, gold header.
export default function PortalShell({
    brandName, brandCrest, sections, user, onLogout, accent = "#159a52", children,
}: PortalShellProps) {
    const [open, setOpen] = useState(false);   // mobile drawer
    const [menuOpen, setMenuOpen] = useState(false);

    const initials = user.name
        ?.split(" ")
        .map(w => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase() || "U";

    return (
        <div className="min-h-screen bg-[#eef2f6] font-sans">
            {/* Print rules: drop the chrome, full-width content, keep colours. */}
            <style>{`
                @media print {
                    [data-portal-chrome] { display: none !important; }
                    [data-portal-main] { margin-left: 0 !important; }
                    [data-portal-main] main { padding: 0 !important; }
                    .print\\:hidden { display: none !important; }
                    body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; background: #fff !important; }
                    @page { margin: 12mm; }
                }
            `}</style>

            {/* ── Sidebar ─────────────────────────────────────────────── */}
            <aside
                data-portal-chrome
                style={{ backgroundColor: accent }}
                className={`fixed inset-y-0 left-0 z-40 w-60 flex flex-col shadow-xl transition-transform duration-200
                    ${open ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}
            >
                {/* Logo panel */}
                <div className="h-[68px] bg-white flex items-center gap-3 px-4 border-b border-black/5">
                    {brandCrest ? (
                        <img src={brandCrest} alt={brandName} className="h-11 w-11 object-contain" />
                    ) : (
                        <div className="h-11 w-11 rounded-full flex items-center justify-center text-white font-black" style={{ backgroundColor: accent }}>
                            {brandName[0]}
                        </div>
                    )}
                    <span className="font-black text-sm leading-tight truncate" style={{ color: accent }}>{brandName}</span>
                </div>

                {/* Nav */}
                <nav className="flex-1 overflow-y-auto py-3">
                    {sections.map(section => (
                        <div key={section.label} className="mb-1">
                            <p className="px-5 pt-3 pb-1 text-[10px] font-black uppercase tracking-widest text-white/60">
                                {section.label}
                            </p>
                            {section.items.map(item => (
                                <NavLink
                                    key={item.to}
                                    to={item.to}
                                    end
                                    onClick={() => setOpen(false)}
                                    className={({ isActive }) =>
                                        `flex items-center gap-3 px-5 py-2.5 text-sm font-semibold transition-colors
                                        ${isActive
                                            ? "bg-black/15 text-white border-l-4 border-white"
                                            : "text-white/90 hover:bg-black/10 border-l-4 border-transparent"}`
                                    }
                                >
                                    <item.icon className="w-4 h-4 flex-shrink-0" />
                                    <span className="truncate">{item.label}</span>
                                </NavLink>
                            ))}
                        </div>
                    ))}
                </nav>
            </aside>

            {/* Mobile backdrop */}
            {open && (
                <div data-portal-chrome className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setOpen(false)} />
            )}

            {/* ── Main column ─────────────────────────────────────────── */}
            <div data-portal-main className="md:ml-60 flex flex-col min-h-screen">
                {/* Top header (gold) */}
                <header data-portal-chrome className="h-[68px] sticky top-0 z-20 bg-[#c4a35a] flex items-center gap-3 px-4 shadow-sm">
                    <button
                        onClick={() => setOpen(o => !o)}
                        className="md:hidden text-white p-2 hover:bg-black/10 rounded-lg"
                    >
                        <Menu className="w-5 h-5" />
                    </button>
                    <button className="hidden md:flex text-white p-2 hover:bg-black/10 rounded-lg">
                        <Menu className="w-5 h-5" />
                    </button>

                    <div className="ml-auto flex items-center gap-3">
                        <div className="hidden sm:flex items-center bg-white rounded-md px-3 h-9 w-56 max-w-[40vw]">
                            <input
                                placeholder="Search..."
                                className="flex-1 bg-transparent text-sm text-slate-700 placeholder-slate-400 focus:outline-none"
                            />
                            <Search className="w-4 h-4 text-slate-400" />
                        </div>

                        <div className="relative">
                            <button
                                onClick={() => setMenuOpen(m => !m)}
                                className="flex items-center gap-2 text-white"
                            >
                                {user.photo ? (
                                    <img src={user.photo} className="w-9 h-9 rounded-full object-cover border-2 border-white/40" />
                                ) : (
                                    <span className="w-9 h-9 rounded-full bg-[#7fd0e6] flex items-center justify-center font-black text-[#0f5132] text-sm">
                                        {initials}
                                    </span>
                                )}
                                <span className="hidden sm:block text-sm font-bold max-w-[160px] truncate">{user.name}</span>
                                <ChevronDown className="w-4 h-4" />
                            </button>
                            {menuOpen && (
                                <div className="absolute right-0 mt-2 w-44 bg-white rounded-lg shadow-xl border border-black/5 py-1 z-30">
                                    <div className="px-4 py-2 border-b border-black/5">
                                        <p className="text-xs font-black text-slate-800 truncate">{user.name}</p>
                                        {user.subtitle && <p className="text-[10px] text-slate-500 truncate">{user.subtitle}</p>}
                                    </div>
                                    <button
                                        onClick={onLogout}
                                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 font-semibold"
                                    >
                                        <LogOut className="w-4 h-4" /> Logout
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* Page content */}
                <main className="flex-1 p-4 sm:p-6">{children}</main>
            </div>
        </div>
    );
}

// ── Shared building blocks for portal pages ──────────────────────────────────

export function PageTitle({ title }: { title: string }) {
    return (
        <div className="mb-4">
            <h1 className="text-xl font-bold text-slate-700">{title}</h1>
        </div>
    );
}

/** White card with the gold title strip used across the Egerton portal. */
export function PanelCard({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
    return (
        <div className="bg-white rounded-md shadow-sm border border-black/5 overflow-hidden mb-6">
            <div className="bg-[#c4a35a] px-5 py-3 flex items-center justify-between">
                <h2 className="text-white font-bold text-sm">{title}</h2>
                {action}
            </div>
            <div className="p-5">{children}</div>
        </div>
    );
}

export function Field({ label, value }: { label: string; value?: ReactNode }) {
    return (
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 py-2">
            <span className="text-sm font-bold text-slate-600 sm:w-40 flex-shrink-0">{label}</span>
            <span className="text-sm text-[#b08642] font-semibold break-words">{value ?? "—"}</span>
        </div>
    );
}
