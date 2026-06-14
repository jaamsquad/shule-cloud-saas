import { useState } from "react";
import { Home, Plus, Pencil, Trash2, Check, X, Loader2, Search, Link2, FileText, Video, Download, ExternalLink, File } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { toast } from "sonner";

const TYPES = [
    { key: "Notes",       icon: FileText,     color: "text-blue-600",   bg: "bg-blue-50" },
    { key: "Worksheet",   icon: File,         color: "text-indigo-600", bg: "bg-indigo-50" },
    { key: "Video",       icon: Video,        color: "text-rose-600",   bg: "bg-rose-50" },
    { key: "External Link", icon: Link2,      color: "text-emerald-600",bg: "bg-emerald-50" },
    { key: "Document",    icon: Download,     color: "text-amber-600",  bg: "bg-amber-50" },
    { key: "Other",       icon: ExternalLink, color: "text-slate-600",  bg: "bg-slate-50" },
];

const emptyForm = { title: "", type: "Notes", subjectId: "", subjectName: "", classId: "", className: "", url: "", description: "", isPublic: true };

export default function NotesResources() {
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState("ALL");
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    const navigate = useNavigate();
    const qc = useQueryClient();

    const { data: resources = [], isLoading } = useQuery({
        queryKey: ["academic_resources"],
        queryFn: async () => {
            const r = await api.get("/academic_resources");
            return Array.isArray(r.data) ? r.data : [];
        },
    });

    const { data: subjects = [] } = useQuery({
        queryKey: ["subjects"],
        queryFn: async () => { const r = await api.get("/subjects"); return Array.isArray(r.data) ? r.data : []; },
    });

    const { data: classes = [] } = useQuery({
        queryKey: ["classes"],
        queryFn: async () => { const r = await api.get("/classes"); return Array.isArray(r.data) ? r.data : []; },
    });

    const delMut = useMutation({
        mutationFn: (id: string) => api.delete(`/academic_resources/${id}`),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["academic_resources"] }); toast.success("Resource removed"); setConfirmDelete(null); },
    });

    const filtered = resources.filter((r: any) => {
        const matchQ = !search || (r.title || "").toLowerCase().includes(search.toLowerCase()) || (r.subjectName || "").toLowerCase().includes(search.toLowerCase());
        const matchT = typeFilter === "ALL" || r.type === typeFilter;
        return matchQ && matchT;
    });

    const getTypeConfig = (type: string) => TYPES.find(t => t.key === type) || TYPES[TYPES.length - 1];


    return (
        <div className="flex-1 bg-[#F8FAFC] min-h-screen flex flex-col pb-20 font-sans">
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-2 text-sm">
                    <Home className="w-4 h-4 text-[#5C67F2]" /><span className="text-gray-300">/</span>
                    <span className="font-bold text-gray-600">Academics</span><span className="text-gray-300">/</span>
                    <span className="font-black text-[#5C67F2]">Notes & Resources</span>
                </div>
                <button onClick={() => navigate("/academics/resources/new")}
                    className="h-10 px-5 bg-[#5C67F2] hover:bg-indigo-600 text-white font-black text-xs uppercase tracking-widest rounded-xl flex items-center gap-2 shadow-md shadow-indigo-100">
                    <Plus className="w-4 h-4" /> Upload Resource
                </button>
            </div>

            <div className="flex-1 max-w-7xl mx-auto w-full px-6 pt-8">
                <div className="mb-6">
                    <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Notes & Resources</h1>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-1">Share notes, worksheets, videos, and external links with students and staff</p>
                </div>

                {/* Stats by type */}
                <div className="flex gap-2 mb-6 flex-wrap">
                    <button onClick={() => setTypeFilter("ALL")} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wide border transition-all ${typeFilter === "ALL" ? "bg-[#5C67F2] text-white border-[#5C67F2]" : "bg-white text-slate-500 border-slate-100 hover:border-slate-200"}`}>
                        All ({resources.length})
                    </button>
                    {TYPES.map(t => {
                        const count = resources.filter((r: any) => r.type === t.key).length;
                        return (
                            <button key={t.key} onClick={() => setTypeFilter(t.key)} className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wide border transition-all ${typeFilter === t.key ? `${t.bg} ${t.color} border-current` : "bg-white text-slate-500 border-slate-100 hover:border-slate-200"}`}>
                                <t.icon className="w-3 h-3" />{t.key} ({count})
                            </button>
                        );
                    })}
                </div>

                <div className="relative mb-6 max-w-sm">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search title or subject..."
                        className="w-full h-11 pl-12 pr-4 bg-white border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700 shadow-sm" />
                </div>

                {/* Resource cards grid */}
                {isLoading ? (
                    <div className="flex items-center justify-center h-40 gap-2 text-slate-400 text-xs font-bold uppercase"><Loader2 className="w-5 h-5 animate-spin text-[#5C67F2]" />Loading...</div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 gap-2 text-slate-300 text-xs font-bold uppercase"><FileText className="w-8 h-8" />No resources found</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {filtered.map((res: any) => {
                            const tc = getTypeConfig(res.type);
                            return (
                                <div key={res._id} className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-5 flex flex-col gap-3 hover:shadow-md hover:border-slate-200 transition-all">
                                    <div className="flex items-start gap-3">
                                        <div className={`w-10 h-10 rounded-2xl ${tc.bg} flex items-center justify-center flex-shrink-0`}>
                                            <tc.icon className={`w-5 h-5 ${tc.color}`} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-black text-slate-800 truncate">{res.title}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase ${tc.bg} ${tc.color}`}>{res.type}</span>
                                                {res.subjectName && <span className="text-[9px] text-slate-400 font-bold truncate">{res.subjectName}</span>}
                                                {res.className && <span className="text-[9px] text-slate-400 font-bold">· {res.className}</span>}
                                            </div>
                                        </div>
                                    </div>
                                    {res.description && <p className="text-[10px] text-slate-500 font-medium leading-relaxed">{res.description}</p>}
                                    <div className="flex items-center justify-between mt-auto pt-2 border-t border-slate-50">
                                        {res.fileData ? (
                                            <a href={res.fileData} target="_blank" rel="noopener noreferrer" download={res.fileName}
                                                className="flex items-center gap-1.5 text-[10px] font-black text-[#5C67F2] hover:underline uppercase tracking-wide">
                                                <Download className="w-3.5 h-3.5" /> {res.fileName ? "View / Download" : "Open File"}
                                            </a>
                                        ) : res.url ? (
                                            <a href={res.url} target="_blank" rel="noopener noreferrer"
                                                className="flex items-center gap-1.5 text-[10px] font-black text-[#5C67F2] hover:underline uppercase tracking-wide">
                                                <ExternalLink className="w-3.5 h-3.5" /> Open Resource
                                            </a>
                                        ) : <span className="text-[9px] text-slate-300 font-bold uppercase">No link</span>}
                                        {res.isPublic === false && <span className="text-[8px] text-amber-500 font-black uppercase">Staff only</span>}
                                        <div className="flex gap-1.5">
                                            <button onClick={() => navigate(`/academics/resources/${res._id}/edit`)} className="w-7 h-7 rounded-xl bg-slate-50 hover:bg-amber-50 text-slate-400 hover:text-amber-500 flex items-center justify-center border border-slate-100 transition-colors"><Pencil className="w-3 h-3" /></button>
                                            {confirmDelete === res._id ? (
                                                <><button onClick={() => delMut.mutate(res._id)} className="w-7 h-7 rounded-xl bg-rose-500 text-white flex items-center justify-center"><Check className="w-3 h-3" /></button>
                                                <button onClick={() => setConfirmDelete(null)} className="w-7 h-7 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center"><X className="w-3 h-3" /></button></>
                                            ) : (
                                                <button onClick={() => setConfirmDelete(res._id)} className="w-7 h-7 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-500 flex items-center justify-center border border-slate-100 transition-colors"><Trash2 className="w-3 h-3" /></button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

        </div>
    );
}
