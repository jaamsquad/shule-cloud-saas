import { useNavigate } from "react-router-dom";
import { ShieldX, Home, ArrowLeft } from "lucide-react";
import { usePermissions } from "@/contexts/PermissionsContext";

export default function AccessDenied() {
    const navigate = useNavigate();
    const { role, isTeacher } = usePermissions();

    return (
        <div className="flex-1 flex flex-col items-center justify-center bg-[#F8FAFC] min-h-screen font-sans p-6">
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl p-10 max-w-md w-full text-center">
                <div className="w-20 h-20 bg-rose-50 rounded-3xl flex items-center justify-center mx-auto mb-5 border-2 border-rose-100">
                    <ShieldX className="w-10 h-10 text-rose-500" />
                </div>
                <h1 className="text-2xl font-black text-slate-900 mb-2">Access Denied</h1>
                <p className="text-slate-500 text-sm font-bold mb-1">
                    You don't have permission to view this page.
                </p>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-6">
                    Role: <span className="text-[#5C67F2]">{role?.replace("_", " ").toUpperCase()}</span>
                </p>
                <p className="text-slate-400 text-[10px] font-bold mb-8 leading-relaxed">
                    {isTeacher
                        ? "Ask your school administrator to grant you access to this module via Roles & Permissions."
                        : "Contact your system administrator if you need access to this section."}
                </p>
                <div className="flex gap-3 justify-center">
                    <button onClick={() => navigate(-1)}
                        className="h-11 px-6 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-black text-xs uppercase tracking-widest rounded-2xl flex items-center gap-2 transition-all">
                        <ArrowLeft className="w-4 h-4" /> Go Back
                    </button>
                    <button onClick={() => navigate("/dashboard")}
                        className="h-11 px-6 bg-[#5C67F2] hover:bg-indigo-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl flex items-center gap-2 shadow-md shadow-indigo-100 transition-all">
                        <Home className="w-4 h-4" /> My Dashboard
                    </button>
                </div>
            </div>
        </div>
    );
}
