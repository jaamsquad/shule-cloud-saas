import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2, FileText, Eye, Download, ExternalLink, Link2, Video, File } from "lucide-react";
import { PageTitle, PanelCard } from "../../PortalShell";
import FileViewer from "../../FileViewer";
import type { StaffCtx } from "../StaffLayout";

const ICON: Record<string, any> = { Notes: FileText, Worksheet: File, Video, "External Link": Link2, Document: Download, "Lesson Page": Video, Other: ExternalLink };

export default function StaffResources() {
    const { api } = useOutletContext<StaffCtx>();
    const [viewing, setViewing] = useState<{ src: string; name?: string } | null>(null);
    const [videoOpen, setVideoOpen] = useState<{ src: string; title: string } | null>(null);
    const [search, setSearch] = useState("");

    const { data: resources = [], isLoading } = useQuery({
        queryKey: ["staff_shared_resources"],
        queryFn: async () => { const r = await api.get("/staff-portal/resources"); return Array.isArray(r.data) ? r.data : []; },
    });

    const filtered = resources.filter((r: any) => !search || (r.title || "").toLowerCase().includes(search.toLowerCase()) || (r.subjectName || "").toLowerCase().includes(search.toLowerCase()));

    return (
        <>
            <PageTitle title="Notes & Resources" subtitle="Shared lesson pages and teaching materials for your subjects" />
            <PanelCard>
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search title or subject…"
                        className="w-full md:max-w-sm h-11 px-4 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:border-[#5C67F2]" />
                    <div className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400">{filtered.length} shared items</div>
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center h-32 text-slate-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 gap-2 text-slate-300 text-xs font-bold uppercase"><FileText className="w-8 h-8" />No resources for your subjects yet</div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {filtered.map((r: any) => {
                            const Icon = ICON[r.type] || FileText;
                            return (
                                <div key={r._id} className="bg-white rounded-[1.5rem] border border-slate-200/70 shadow-sm p-5 flex flex-col gap-3">
                                    <div className="flex items-start gap-3">
                                        <div className="w-11 h-11 rounded-2xl bg-[#5C67F2]/10 flex items-center justify-center text-[#5C67F2] flex-shrink-0"><Icon className="w-5 h-5" /></div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-black text-slate-800 truncate">{r.title}</p>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase">{r.type}{r.subjectName ? ` · ${r.subjectName}` : ""}{r.className ? ` · ${r.className}` : ""}{r.isPublic === false ? " · Staff only" : ""}</p>
                                        </div>
                                    </div>
                                    {r.description && <p className="text-[11px] text-slate-500">{r.description}</p>}
                                    {(r.introduction || r.objectives) && (
                                        <div className="space-y-1 text-[10px] text-slate-500">
                                            {r.introduction && <p><span className="font-black">Intro:</span> {r.introduction}</p>}
                                            {r.objectives && <p><span className="font-black">Objectives:</span> {r.objectives}</p>}
                                        </div>
                                    )}
                                    {r.lessonNotes && <p className="text-[11px] text-slate-500 line-clamp-3">{r.lessonNotes}</p>}
                                    <div className="flex flex-wrap gap-2">
                                        {r.assignment && <span className="px-2 py-1 rounded-full bg-amber-50 text-amber-700 text-[10px] font-black uppercase">Assignment</span>}
                                        {r.quizAvailable && <span className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase">Quiz available</span>}
                                        {r.videoUrl && <span className="px-2 py-1 rounded-full bg-rose-50 text-rose-700 text-[10px] font-black uppercase">Video</span>}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-3 pt-1">
                                        {r.fileData ? (
                                            /(image|pdf)/i.test(r.fileType || "") || /\.(pdf|jpe?g|png|gif|webp)$/i.test(r.fileName || "")
                                                ? <button onClick={() => setViewing({ src: r.fileData, name: r.fileName })} className="inline-flex items-center gap-1.5 text-[11px] font-black text-[#5C67F2] uppercase"><Eye className="w-3.5 h-3.5" /> View</button>
                                                : <a href={r.fileData} download={r.fileName} className="inline-flex items-center gap-1.5 text-[11px] font-black text-[#5C67F2] uppercase"><Download className="w-3.5 h-3.5" /> Download</a>
                                        ) : r.url ? (
                                            <a href={r.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[11px] font-black text-[#5C67F2] uppercase"><ExternalLink className="w-3.5 h-3.5" /> Open</a>
                                        ) : <span className="text-[10px] text-slate-300 font-bold uppercase">No file</span>}
                                        {r.videoUrl && (
                                            <button onClick={() => setVideoOpen({ src: r.videoUrl, title: r.title })} className="inline-flex items-center gap-1.5 text-[11px] font-black text-[#5C67F2] uppercase"><Video className="w-3.5 h-3.5" /> Play</button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </PanelCard>
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
                            <iframe title={videoOpen.title} src={videoOpen.src} className="w-full h-full" allowFullScreen style={{ border: 0 }} />
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
