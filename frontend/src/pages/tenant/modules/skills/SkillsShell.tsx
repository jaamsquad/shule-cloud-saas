import { Home, ListChecks, Settings2, FileText } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

const TABS = [
    { path: "/exams/skills/setup", l: "1 · Skills setup", i: Settings2 },
    { path: "/exams/skills/assess", l: "2 · Assess learners", i: ListChecks },
    { path: "/exams/skills/print", l: "3 · Print reports", i: FileText },
] as const;

// Shared header + tab navigation for the three Skill-Based Reports pages — each tab is a
// real route (/exams/skills/setup, /assess, /print), not a client-side state switch, so
// every step is its own page (bookmarkable, back-button-friendly).
export default function SkillsShell({ children }: { children: React.ReactNode }) {
    const navigate = useNavigate();
    const { pathname } = useLocation();
    return (
        <div className="flex-1 bg-[#f4f7f6] min-h-screen flex flex-col items-center">
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center shadow-sm z-10 m-4 rounded-xl w-[calc(100%-2rem)]">
                <span className="font-bold text-gray-800 text-lg mr-2">Exams</span><span className="text-gray-300 mx-2">|</span><Home className="w-4 h-4 text-gray-500 mr-2" /><span className="text-gray-500 font-medium">- Skill-Based Reports</span>
            </div>
            <div className="p-6 pt-0 w-full space-y-5">
                <div className="flex flex-wrap gap-2">
                    {TABS.map(t => (
                        <button key={t.path} onClick={() => navigate(t.path)} className={`h-10 px-4 rounded-full text-sm font-bold flex items-center gap-2 ${pathname === t.path ? "bg-[#5C67F2] text-white shadow-sm" : "bg-white border border-gray-200 text-gray-600 hover:border-[#5C67F2]"}`}>
                            <t.i className="w-4 h-4" />{t.l}
                        </button>
                    ))}
                </div>
                {children}
            </div>
        </div>
    );
}
