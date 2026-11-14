import { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2, FileText, Eye, Download, ExternalLink, Link2, Video, File, X, Search, Sparkles, BookOpen, Clock3 } from "lucide-react";
import FileViewer from "../../FileViewer";
import type { StaffCtx } from "../StaffLayout";

const TYPE_STYLE: Record<string, { grad: string; icon: any }> = {
    Notes: { grad: "from-violet-400 to-fuchsia-500", icon: FileText },
    Worksheet: { grad: "from-sky-400 to-blue-500", icon: File },
    Video: { grad: "from-rose-400 to-pink-500", icon: Video },
    "External Link": { grad: "from-emerald-400 to-teal-500", icon: Link2 },
    Document: { grad: "from-amber-400 to-orange-500", icon: Download },
    "Lesson Page": { grad: "from-rose-400 to-pink-500", icon: Video },
    Image: { grad: "from-indigo-400 to-violet-500", icon: Eye },
    Diagram: { grad: "from-indigo-400 to-violet-500", icon: Eye },
    Other: { grad: "from-slate-400 to-slate-500", icon: ExternalLink },
};
const styleFor = (type: string) => TYPE_STYLE[type] || TYPE_STYLE.Other;

const getVideoEmbedUrl = (url: string) => {
    if (!url) return "";
    const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([\w-]{11})/i);
    if (yt) return `https://www.youtube.com/embed/${yt[1]}?rel=0&modestbranding=1`;
    const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
    if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
    return url;
};

export default function StaffResources() {
    const { api } = useOutletContext<StaffCtx>();
    const [viewing, setViewing] = useState<{ src: string; name?: string } | null>(null);
    const [videoOpen, setVideoOpen] = useState<{ src: string; title: string } | null>(null);
    const [search, setSearch] = useState("");
    const [classFilter, setClassFilter] = useState("ALL");
    const [subjectFilter, setSubjectFilter] = useState("ALL");

    const { data: resources = [], isLoading } = useQuery({
        queryKey: ["staff_shared_resources"],
        queryFn: async () => { const r = await api.get("/staff-portal/resources"); return Array.isArray(r.data) ? r.data : []; },
    });

    const classOptions = useMemo(() => [...new Set(resources.map((r: any) => String(r.className || "").trim()).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true })), [resources]);
    const subjectOptions = useMemo(() => [...new Set(resources.map((r: any) => String(r.subjectName || "").trim()).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b)), [resources]);

    const filtered = resources.filter((r: any) => {
        const matchQ = !search || (r.title || "").toLowerCase().includes(search.toLowerCase()) || (r.subjectName || "").toLowerCase().includes(search.toLowerCase());
        const matchC = classFilter === "ALL" || (r.className || "") === classFilter;
        const matchS = subjectFilter === "ALL" || (r.subjectName || "") === subjectFilter;
        return matchQ && matchC && matchS;
    });
    const hasFilters = classFilter !== "ALL" || subjectFilter !== "ALL" || !!search;
    const clearFilters = () => { setClassFilter("ALL"); setSubjectFilter("ALL"); setSearch(""); };

    const stats = useMemo(() => {
        const subjects = new Set(resources.map((r: any) => r.subjectName).filter(Boolean)).size;
        const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const thisWeek = resources.filter((r: any) => r.createdAt && new Date(r.createdAt).getTime() >= weekAgo).length;
        return [
            { label: "Shared materials", value: resources.length, icon: Sparkles, bg: "bg-fuchsia-50", fg: "text-fuchsia-500" },
            { label: "Subjects covered", value: subjects, icon: BookOpen, bg: "bg-violet-50", fg: "text-violet-500" },
            { label: "Added this week", value: thisWeek, icon: Clock3, bg: "bg-sky-50", fg: "text-sky-500" },
        ];
    }, [resources]);

    return (
        <>
            <div className="mb-6">
                <p className="text-[11px] font-black uppercase tracking-[0.25em] text-fuchsia-500">Teaching hub</p>
                <h1 className="text-2xl font-black text-slate-800 mt-1">Notes & Resources</h1>
                <p className="text-sm text-slate-400 mt-1">Shared lesson pages and teaching materials for your subjects</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                {stats.map(s => (
                    <div key={s.label} className={`${s.bg} rounded-2xl px-4 py-3.5 flex items-center gap-3`}>
                        <div className={`w-9 h-9 rounded-xl bg-white/70 flex items-center justify-center ${s.fg} flex-shrink-0`}><s.icon className="w-4.5 h-4.5" /></div>
                        <div className="min-w-0">
                            <p className="text-lg font-black text-slate-800 leading-none">{s.value}</p>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mt-1 truncate">{s.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-white rounded-3xl border border-slate-100 shadow-[0_2px_16px_rgba(15,23,42,0.04)] p-5 sm:p-6">
                <div className="flex flex-col gap-3 mb-5">
                    <div className="relative w-full md:max-w-sm">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search title or subject…"
                            className="w-full h-11 pl-11 pr-4 bg-slate-50 border border-transparent rounded-full text-sm focus:outline-none focus:border-fuchsia-300 focus:bg-white transition-colors" />
                    </div>
                    <div className="flex flex-wrap items-center gap-2.5">
                        <select value={classFilter} onChange={e => setClassFilter(e.target.value)} className="h-9 pl-3.5 pr-8 rounded-full border-0 bg-slate-50 text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-fuchsia-200">
                            <option value="ALL">All classes</option>
                            {classOptions.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <select value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)} className="h-9 pl-3.5 pr-8 rounded-full border-0 bg-slate-50 text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-fuchsia-200">
                            <option value="ALL">All subjects</option>
                            {subjectOptions.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        {hasFilters && (
                            <button onClick={clearFilters} className="h-9 px-3 rounded-full text-xs font-bold text-rose-500 hover:bg-rose-50 flex items-center gap-1"><X className="w-3.5 h-3.5" /> Clear</button>
                        )}
                        <div className="ml-auto text-[11px] font-black uppercase tracking-[0.25em] text-slate-400">{filtered.length} shared item{filtered.length === 1 ? "" : "s"}</div>
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center h-32 text-slate-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 gap-2 text-slate-300 text-xs font-bold uppercase">
                        <FileText className="w-8 h-8" />
                        {resources.length === 0 ? "No resources for your subjects yet" : "Nothing matches these filters"}
                        {resources.length > 0 && hasFilters && <button onClick={clearFilters} className="normal-case text-[11px] font-bold text-fuchsia-500 hover:underline">Clear filters</button>}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
                        {filtered.map((r: any) => {
                            const style = styleFor(r.type);
                            const Icon = style.icon;
                            return (
                                <div key={r._id} className="group bg-white rounded-3xl border border-slate-100 shadow-[0_1px_3px_rgba(15,23,42,0.06)] overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all flex flex-col">
                                    <div className={`h-24 bg-gradient-to-br ${style.grad} relative flex items-center justify-center shrink-0`}>
                                        <Icon className="w-9 h-9 text-white/90" strokeWidth={1.75} />
                                        <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-white/25 backdrop-blur-sm text-[9px] font-black text-white uppercase tracking-wide">{r.type}</span>
                                        {r.isPublic === false && <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/25 backdrop-blur-sm text-[9px] font-black text-white uppercase tracking-wide">Staff only</span>}
                                    </div>
                                    <div className="p-5 flex flex-col gap-2 flex-1">
                                        <p className="text-sm font-black text-slate-800 leading-snug line-clamp-2">{r.title}</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">{r.subjectName || "General"}{r.className ? ` · ${r.className}` : ""}{r.isGlobal ? " · ShuleCloud Library" : ""}</p>
                                        {r.description && <p className="text-[11px] text-slate-500 line-clamp-2">{r.description}</p>}
                                        {r.lessonNotes && <p className="text-[11px] text-slate-500 line-clamp-2">{r.lessonNotes}</p>}
                                        {(r.assignment || r.quizAvailable) && (
                                            <div className="flex flex-wrap gap-1.5">
                                                {r.assignment && <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[9px] font-black uppercase">Assignment</span>}
                                                {r.quizAvailable && <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[9px] font-black uppercase">Quiz available</span>}
                                            </div>
                                        )}
                                        <div className="mt-auto pt-3 flex flex-wrap items-center gap-2 border-t border-slate-50">
                                            {r.fileData ? (
                                                /(image|pdf)/i.test(r.fileType || "") || /\.(pdf|jpe?g|png|gif|webp)$/i.test(r.fileName || "")
                                                    ? <button onClick={() => setViewing({ src: r.fileData, name: r.fileName })} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-fuchsia-50 text-fuchsia-600 text-[11px] font-black uppercase hover:bg-fuchsia-100 transition-colors"><Eye className="w-3.5 h-3.5" /> View</button>
                                                    : <a href={r.fileData} download={r.fileName} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-fuchsia-50 text-fuchsia-600 text-[11px] font-black uppercase hover:bg-fuchsia-100 transition-colors"><Download className="w-3.5 h-3.5" /> Download</a>
                                            ) : r.url ? (
                                                <a href={r.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-fuchsia-50 text-fuchsia-600 text-[11px] font-black uppercase hover:bg-fuchsia-100 transition-colors"><ExternalLink className="w-3.5 h-3.5" /> Open</a>
                                            ) : <span className="text-[10px] text-slate-300 font-bold uppercase">No file</span>}
                                            {r.videoUrl && (
                                                <button onClick={() => setVideoOpen({ src: getVideoEmbedUrl(r.videoUrl), title: r.title })} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-rose-50 text-rose-600 text-[11px] font-black uppercase hover:bg-rose-100 transition-colors"><Video className="w-3.5 h-3.5" /> Play</button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
            <FileViewer open={!!viewing} src={viewing?.src} name={viewing?.name} onClose={() => setViewing(null)} />
            {videoOpen && (
                <div className="fixed inset-0 bg-black/70 z-[300] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl overflow-hidden w-full max-w-4xl shadow-2xl">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                            <div>
                                <p className="text-sm font-bold text-slate-900 truncate">{videoOpen.title}</p>
                                <p className="text-[10px] text-slate-400">Lesson video</p>
                            </div>
                            <button onClick={() => setVideoOpen(null)} className="w-9 h-9 rounded-xl bg-slate-100 text-slate-500 hover:text-slate-900">×</button>
                        </div>
                        <div className="aspect-[16/9] bg-black">
                            <iframe title={videoOpen.title} src={videoOpen.src} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen style={{ border: 0 }} />
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
