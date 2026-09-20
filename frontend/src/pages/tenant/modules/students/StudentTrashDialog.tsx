import { useState } from "react";
import { Trash2, RotateCcw, Search, X, Loader2, User } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import api from "@/lib/api";

export const STUDENT_TRASH_KEY = ["students-trash"];

// Trash for soft-deleted students: restore one, or delete it permanently.
export default function StudentTrashDialog({ onClose }: { onClose: () => void }) {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState("");

    const { data: trash = [], isLoading } = useQuery<any[]>({
        queryKey: STUDENT_TRASH_KEY,
        queryFn: async () => (await api.get("/students/trash")).data || [],
    });

    const refresh = () => {
        queryClient.invalidateQueries({ queryKey: STUDENT_TRASH_KEY });
        queryClient.invalidateQueries({ queryKey: ["students"] });
    };

    const restore = useMutation({
        mutationFn: (id: string) => api.post(`/students/trash/${id}/restore`),
        onSuccess: () => { refresh(); toast.success("Student restored"); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed to restore student"),
    });

    const purge = useMutation({
        mutationFn: (id: string) => api.delete(`/students/trash/${id}`),
        onSuccess: () => { refresh(); toast.success("Student permanently deleted"); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed to delete student"),
    });

    const nameOf = (s: any) => s.studentName || s.name || `${s.firstName || ""} ${s.lastName || ""}`.trim() || "Unnamed student";
    const q = search.trim().toLowerCase();
    const rows = trash.filter((s: any) => !q || nameOf(s).toLowerCase().includes(q) || String(s.registrationNo || "").toLowerCase().includes(q));
    const busy = restore.isPending || purge.isPending;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-slate-50">
                    <div>
                        <h3 className="font-black text-slate-800 text-lg flex items-center gap-2"><Trash2 className="w-5 h-5 text-rose-500" /> Student Trash</h3>
                        <p className="text-xs font-bold text-slate-500">Deleted students can be restored or permanently deleted</p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center bg-slate-200 hover:bg-slate-300 rounded-full text-slate-600 transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="px-6 pt-4 bg-[#f4f7f6]">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search deleted students..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="h-10 pl-10 pr-4 border border-gray-200 rounded-lg focus:outline-none focus:border-[#5C67F2] text-sm bg-white w-full"
                        />
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    </div>
                </div>

                <div className="p-6 overflow-y-auto flex-1 space-y-3 bg-[#f4f7f6]">
                    {isLoading ? (
                        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-[#5C67F2]" /></div>
                    ) : rows.length === 0 ? (
                        <div className="text-center p-10 bg-white rounded-2xl border border-gray-100">
                            <p className="font-bold text-slate-400">{trash.length === 0 ? "Trash is empty." : "No deleted students match your search."}</p>
                        </div>
                    ) : rows.map((s: any) => (
                        <div key={s._id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4">
                            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden border border-gray-200 text-[#5C67F2] shrink-0">
                                {s.avatar || s.studentPhoto ? (
                                    <img src={s.avatar || s.studentPhoto} alt={nameOf(s)} className="w-full h-full object-cover" />
                                ) : (
                                    <User className="w-5 h-5" />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-slate-800 text-sm truncate">{nameOf(s)}</p>
                                <p className="text-[11px] font-medium text-slate-400 truncate">
                                    {s.registrationNo || "—"} · {s.studentClass || s.statusPrevClass?.studentClass || "No class"} · deleted {s.deletedAt ? formatDistanceToNow(new Date(s.deletedAt), { addSuffix: true }) : ""}{s.deletedBy ? ` by ${s.deletedBy}` : ""}
                                </p>
                            </div>
                            <button
                                onClick={() => restore.mutate(s._id)}
                                disabled={busy}
                                title="Restore"
                                className="h-9 px-3 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-600 text-[11px] font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                            >
                                <RotateCcw className="w-3.5 h-3.5" /> Restore
                            </button>
                            <button
                                onClick={() => { if (confirm(`Permanently delete ${nameOf(s)}? This cannot be undone.`)) purge.mutate(s._id); }}
                                disabled={busy}
                                title="Delete permanently"
                                className="h-9 px-3 rounded-full bg-red-50 hover:bg-red-100 text-red-600 text-[11px] font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                            >
                                <Trash2 className="w-3.5 h-3.5" /> Delete forever
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
