import { useMemo, useState } from "react";
import { Home, Plus, Pencil, Trash2, Check, X, Loader2, Search, Link2, FileText, Video, Download, ExternalLink, File, BookOpen, ArrowUpDown, SlidersHorizontal, GraduationCap } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { toast } from "sonner";
import { API_ORIGIN } from "@/lib/config";

const TYPES = [
    { key: "Notes",       icon: FileText,     color: "text-blue-600",   bg: "bg-blue-50" },
    { key: "Worksheet",   icon: File,         color: "text-indigo-600", bg: "bg-indigo-50" },
    { key: "Video",       icon: Video,        color: "text-rose-600",   bg: "bg-rose-50" },
    { key: "External Link", icon: Link2,      color: "text-emerald-600",bg: "bg-emerald-50" },
    { key: "Document",    icon: Download,     color: "text-amber-600",  bg: "bg-amber-50" },    { key: "Lesson Page", icon: BookOpen,    color: "text-violet-600", bg: "bg-violet-50" },    { key: "Other",       icon: ExternalLink, color: "text-slate-600",  bg: "bg-slate-50" },
];

const emptyForm = { title: "", type: "Notes", subjectId: "", subjectName: "", classId: "", className: "", url: "", description: "", isPublic: true };

const SORTS = [
    { key: "newest", label: "Newest first" },
    { key: "oldest", label: "Oldest first" },
    { key: "title", label: "Title A–Z" },
];

export default function NotesResources() {
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState("ALL");
    const [classFilter, setClassFilter] = useState("ALL");
    const [subjectFilter, setSubjectFilter] = useState("ALL");
    const [sortBy, setSortBy] = useState("newest");
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

    // Owner-uploaded, shared across every school — read-only here (managed in the Owner Portal).
    const { data: globalResources = [] } = useQuery({
        queryKey: ["global_resources"],
        queryFn: async () => { const r = await api.get("/global-resources"); return Array.isArray(r.data) ? r.data : []; },
    });

    const delMut = useMutation({
        mutationFn: (id: string) => api.delete(`/academic_resources/${id}`),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["academic_resources"] }); toast.success("Resource removed"); setConfirmDelete(null); },
    });

    const [videoOpen, setVideoOpen] = useState<{ src: string; title: string } | null>(null);

    // Class/subject filter options — from the subjects/classes catalogue (not just the
    // ones already in use), so an admin can filter even before adding that class's first resource.
    const classOptions = useMemo(() => {
        const seen = new Set<string>(); const out: string[] = [];
        [...classes.map((c: any) => c.name || c.levelName), ...resources.map((r: any) => r.className)].forEach((n: any) => {
            const v = String(n || "").trim(); if (v && !seen.has(v)) { seen.add(v); out.push(v); }
        });
        return out.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    }, [classes, resources]);
    const subjectOptions = useMemo(() => {
        const seen = new Set<string>(); const out: string[] = [];
        [...subjects.map((s: any) => s.name || s.subjectName), ...resources.map((r: any) => r.subjectName)].forEach((n: any) => {
            const v = String(n || "").trim(); if (v && !seen.has(v)) { seen.add(v); out.push(v); }
        });
        return out.sort((a, b) => a.localeCompare(b));
    }, [subjects, resources]);

    const filtered = useMemo(() => {
        const rows = resources.filter((r: any) => {
            const matchQ = !search || (r.title || "").toLowerCase().includes(search.toLowerCase()) || (r.subjectName || "").toLowerCase().includes(search.toLowerCase());
            const matchT = typeFilter === "ALL" || r.type === typeFilter;
            const matchC = classFilter === "ALL" || (r.className || "") === classFilter;
            const matchS = subjectFilter === "ALL" || (r.subjectName || "") === subjectFilter;
            return matchQ && matchT && matchC && matchS;
        });
        const sorted = [...rows];
        if (sortBy === "title") sorted.sort((a, b) => String(a.title || "").localeCompare(String(b.title || "")));
        else if (sortBy === "oldest") sorted.sort((a, b) => String(a.createdAt || a._id || "").localeCompare(String(b.createdAt || b._id || "")));
        else sorted.sort((a, b) => String(b.createdAt || b._id || "").localeCompare(String(a.createdAt || a._id || "")));
        return sorted;
    }, [resources, search, typeFilter, classFilter, subjectFilter, sortBy]);

    const activeFilterCount = [typeFilter !== "ALL", classFilter !== "ALL", subjectFilter !== "ALL"].filter(Boolean).length;
    const clearFilters = () => { setTypeFilter("ALL"); setClassFilter("ALL"); setSubjectFilter("ALL"); setSearch(""); };

    const getVideoEmbedUrl = (url: string) => {
        if (!url) return "";
        const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([\w-]{11})/i);
        if (yt) return `https://www.youtube.com/embed/${yt[1]}?rel=0&modestbranding=1`;
        return url;
    };

    const getTypeConfig = (type: string) => TYPES.find(t => t.key === type) || TYPES[TYPES.length - 1];


    return (
        <div className="flex-1 min-h-screen bg-slate-50 text-slate-700 flex flex-col pb-20 font-sans">
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-2 text-sm">
                    <Home className="w-4 h-4 text-[#5C67F2]" /><span className="text-gray-300">/</span>
                    <span className="font-bold text-gray-600">Academics</span><span className="text-gray-300">/</span>
                    <span className="font-black text-[#5C67F2]">Notes & Resources</span>
                </div>
                <button onClick={() => navigate("/academics/resources/new")}
                    className="h-10 px-5 bg-[#5C67F2] hover:bg-indigo-600 text-white font-black text-xs uppercase tracking-widest rounded-xl flex items-center gap-2 shadow-md shadow-indigo-100">
                    <Plus className="w-4 h-4" /> Create Lesson Page
                </button>
            </div>

            <div className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
                <div className="mb-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400">Lesson Library</p>
                            <h1 className="text-2xl font-semibold text-slate-900 mt-1">Notes & Resources</h1>
                            <p className="text-slate-500 text-sm mt-2">Share teaching content, lesson pages, worksheets, and videos in one place.</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <button onClick={() => setTypeFilter("ALL")} className={`px-4 py-2 rounded-full text-[10px] font-semibold uppercase tracking-wide border transition-all ${typeFilter === "ALL" ? "bg-[#5C67F2] text-white border-[#5C67F2]" : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"}`}>
                                All ({resources.length})
                            </button>
                            {TYPES.map(t => {
                                const count = resources.filter((r: any) => r.type === t.key).length;
                                return (
                                    <button key={t.key} onClick={() => setTypeFilter(t.key)} className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[10px] font-semibold uppercase tracking-wide border transition-all ${typeFilter === t.key ? `${t.bg} ${t.color} border-current` : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"}`}>
                                        <t.icon className="w-3 h-3" />{t.key} ({count})
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="mt-6 flex flex-col gap-3">
                        <div className="relative w-full">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search title or subject..."
                                className="w-full h-11 pl-12 pr-4 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#5C67F2] text-sm font-semibold text-slate-700" />
                        </div>
                        <div className="flex flex-wrap items-center gap-2.5">
                            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                            <select value={classFilter} onChange={e => setClassFilter(e.target.value)} className="h-10 pl-3 pr-8 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 focus:outline-none focus:border-[#5C67F2]">
                                <option value="ALL">All classes</option>
                                {classOptions.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <select value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)} className="h-10 pl-3 pr-8 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 focus:outline-none focus:border-[#5C67F2]">
                                <option value="ALL">All subjects</option>
                                {subjectOptions.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <div className="flex items-center gap-1.5 ml-1">
                                <ArrowUpDown className="w-3.5 h-3.5 text-slate-300" />
                                <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="h-10 pl-2 pr-7 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 focus:outline-none focus:border-[#5C67F2]">
                                    {SORTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                                </select>
                            </div>
                            {activeFilterCount > 0 && (
                                <button onClick={clearFilters} className="h-10 px-3 rounded-xl text-xs font-bold text-rose-500 hover:bg-rose-50 flex items-center gap-1"><X className="w-3.5 h-3.5" /> Clear filters</button>
                            )}
                            <div className="ml-auto text-[11px] font-black uppercase tracking-[0.25em] text-slate-400">{filtered.length} item{filtered.length === 1 ? "" : "s"} showing</div>
                        </div>
                    </div>
                </div>

                {globalResources.length > 0 && (
                    <div className="mb-8 rounded-3xl border border-indigo-100 bg-indigo-50/40 p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <GraduationCap className="w-5 h-5 text-indigo-600" />
                            <h2 className="font-black text-slate-800">ShuleCloud Library</h2>
                            <span className="text-xs font-bold text-slate-400">— shared by ShuleCloud, available to every school</span>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                            {globalResources.map((r: any) => (
                                <div key={r._id} className="bg-white rounded-2xl border border-indigo-100 p-4">
                                    <p className="text-sm font-black text-slate-800 truncate">{r.title}</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{r.type}{r.subjectName ? ` · ${r.subjectName}` : ""}{r.className ? ` · ${r.className}` : " · All grades"}</p>
                                    {r.description && <p className="text-xs text-slate-500 mt-2 line-clamp-2">{r.description}</p>}
                                    <div className="mt-3 flex flex-wrap gap-3">
                                        {r.fileUrl ? (
                                            <a href={`${API_ORIGIN}${r.fileUrl}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[11px] font-black text-indigo-600 uppercase"><Download className="w-3.5 h-3.5" /> View / Download</a>
                                        ) : r.url ? (
                                            <a href={r.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[11px] font-black text-indigo-600 uppercase"><ExternalLink className="w-3.5 h-3.5" /> Open</a>
                                        ) : null}
                                        {r.videoUrl && (
                                            <button onClick={() => setVideoOpen({ src: getVideoEmbedUrl(r.videoUrl), title: r.title })} className="inline-flex items-center gap-1.5 text-[11px] font-black text-indigo-600 uppercase"><Video className="w-3.5 h-3.5" /> Watch</button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {isLoading ? (
                    <div className="flex items-center justify-center h-40 gap-2 text-slate-400 text-xs font-bold uppercase"><Loader2 className="w-5 h-5 animate-spin text-[#5C67F2]" />Loading lesson pages...</div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 gap-3 text-slate-300 text-xs font-bold uppercase rounded-[2rem] border border-dashed border-slate-200 bg-white/70">
                        <FileText className="w-8 h-8" />
                        {resources.length === 0 ? "No lesson pages yet" : "Nothing matches these filters"}
                        {resources.length > 0 && activeFilterCount + (search ? 1 : 0) > 0 && (
                            <button onClick={clearFilters} className="normal-case text-[11px] font-bold text-[#5C67F2] hover:underline">Clear filters</button>
                        )}
                    </div>
                ) : (
                    <div className="grid gap-5 xl:grid-cols-2">
                        {filtered.map((res: any) => {
                            const tc = getTypeConfig(res.type);
                            const embed = res.videoUrl ? getVideoEmbedUrl(res.videoUrl) : null;
                            return (
                                <div key={res._id} className="bg-white rounded-3xl border border-slate-200 shadow-[0_1px_2px_rgba(15,23,42,0.04)] overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all">
                                    <div className={`px-5 py-4 border-b ${tc.bg}`}>
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-start gap-3">
                                                <div className={`w-10 h-10 rounded-2xl ${tc.bg} flex items-center justify-center flex-shrink-0 border border-white/80`}>
                                                    <tc.icon className={`w-5 h-5 ${tc.color}`} />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-black text-slate-800 truncate">{res.title}</p>
                                                    <div className="flex flex-wrap items-center gap-2 mt-1 text-[9px]">
                                                        <span className={`px-2 py-0.5 rounded-lg font-black uppercase ${tc.bg} ${tc.color}`}>{res.type}</span>
                                                        {res.subjectName && <span className="text-slate-500 truncate">{res.subjectName}</span>}
                                                        {res.className && <span className="text-slate-500">· {res.className}</span>}
                                                    </div>
                                                </div>
                                            </div>
                                            {res.isPublic === false && <span className="text-[8px] text-amber-600 font-black uppercase">Staff only</span>}
                                        </div>
                                    </div>
                                    <div className="p-5 space-y-3">
                                        {res.introduction && <p className="text-sm text-slate-600 line-clamp-3">{res.introduction}</p>}
                                        {res.objectives && <p className="text-[11px] text-slate-500"><span className="font-black text-slate-700">Objectives:</span> {res.objectives}</p>}
                                        {res.lessonNotes && <p className="text-[11px] text-slate-500 line-clamp-3">{res.lessonNotes}</p>}
                                        <div className="flex flex-wrap gap-2 pt-1">
                                            {res.assignment && <span className="px-2 py-1 rounded-full text-[9px] font-black uppercase bg-amber-50 text-amber-700">Assignment</span>}
                                            {res.quizAvailable && <span className="px-2 py-1 rounded-full text-[9px] font-black uppercase bg-emerald-50 text-emerald-700">Quiz available</span>}
                                            {res.videoUrl && <span className="px-2 py-1 rounded-full text-[9px] font-black uppercase bg-rose-50 text-rose-700">Video</span>}
                                        </div>
                                        <div className="flex flex-wrap gap-2 pt-2">
                                            {res.fileData ? (
                                                <a href={res.fileData} target="_blank" rel="noopener noreferrer" download={res.fileName}
                                                    className="inline-flex items-center gap-1.5 text-[10px] font-black text-[#5C67F2] hover:underline uppercase tracking-wide">
                                                    <Download className="w-3.5 h-3.5" /> {res.fileName ? "View / Download" : "Open File"}
                                                </a>
                                            ) : res.url ? (
                                                <a href={res.url} target="_blank" rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1.5 text-[10px] font-black text-[#5C67F2] hover:underline uppercase tracking-wide">
                                                    <ExternalLink className="w-3.5 h-3.5" /> Open Resource
                                                </a>
                                            ) : null}
                                            {embed && (
                                                <button onClick={() => setVideoOpen({ src: embed, title: res.title })} className="inline-flex items-center gap-1.5 text-[10px] font-black text-[#5C67F2] hover:underline uppercase tracking-wide">
                                                    <Video className="w-3.5 h-3.5" /> Watch Video
                                                </button>
                                            )}
                                        </div>
                                        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                                            <span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.25em]">Ready to teach</span>
                                            <div className="flex gap-1.5">
                                                <button onClick={() => navigate(`/academics/resources/${res._id}/edit`)} className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-amber-50 text-slate-400 hover:text-amber-500 flex items-center justify-center border border-slate-100 transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                                                {confirmDelete === res._id ? (
                                                    <><button onClick={() => delMut.mutate(res._id)} className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center"><Check className="w-3.5 h-3.5" /></button>
                                                    <button onClick={() => setConfirmDelete(null)} className="w-8 h-8 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center"><X className="w-3.5 h-3.5" /></button></>
                                                ) : (
                                                    <button onClick={() => setConfirmDelete(res._id)} className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-500 flex items-center justify-center border border-slate-100 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
            {videoOpen && (
                <div className="fixed inset-0 bg-black/70 z-[200] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl overflow-hidden w-full max-w-4xl shadow-2xl">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                            <div>
                                <p className="text-sm font-bold text-slate-900 truncate">{videoOpen.title}</p>
                                <p className="text-[10px] text-slate-400">Lesson video</p>
                            </div>
                            <button onClick={() => setVideoOpen(null)} className="w-9 h-9 rounded-xl bg-slate-100 text-slate-500 hover:text-slate-900">×</button>
                        </div>
                        <div className="aspect-[16/9] bg-black">
                            <iframe title={videoOpen.title} src={videoOpen.src} className="w-full h-full" allowFullScreen style={{ border: 0 }} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
