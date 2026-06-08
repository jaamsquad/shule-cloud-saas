import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function Logout() {
    const navigate = useNavigate();

    useEffect(() => {
        // Clear ALL auth tokens and user data
        const keysToRemove = [
            "auth_token", "refresh_token", "user", "tenant",
            "staff_portal_token", "staff_portal_info",
            "student_token", "student_info",
            "parent_token", "parent_info",
        ];
        keysToRemove.forEach(k => localStorage.removeItem(k));

        toast.success("You have been logged out successfully");

        // Small delay so the toast is visible
        setTimeout(() => navigate("/login", { replace: true }), 300);
    }, [navigate]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#f0f2ff] font-sans">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-xl p-10 flex flex-col items-center gap-4 text-center max-w-xs w-full">
                <Loader2 className="w-10 h-10 animate-spin text-[#5C67F2]" />
                <p className="font-black text-slate-800 text-lg">Logging out...</p>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">Clearing session data</p>
            </div>
        </div>
    );
}
