import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Home, ExternalLink, BookOpenCheck, GraduationCap, Baby, RotateCw } from "lucide-react";
import api from "@/lib/api";
import { CBC_MATERIAL_HUBS, CBC_MATERIAL_PRE_PRIMARY, CBC_MATERIAL_GRADES, offeredGrades, offersPrePrimary } from "@/lib/cbcMaterials";

const LinkCard = ({ label, url, active, onOpen }: { label: string; url: string; active: boolean; onOpen: () => void }) => (
    <div className={`flex items-center justify-between gap-2 bg-white rounded-2xl border shadow-sm px-5 py-4 transition-all ${active ? "border-[#5C67F2] ring-1 ring-[#5C67F2]/30" : "border-gray-100 hover:border-[#5C67F2] hover:shadow-md"}`}>
        <button onClick={onOpen} className="text-sm font-bold text-slate-700 hover:text-[#5C67F2] text-left flex-1">{label}</button>
        <a href={url} target="_blank" rel="noopener noreferrer" title="Open in a new tab" className="text-slate-300 hover:text-[#5C67F2] shrink-0"><ExternalLink className="w-4 h-4" /></a>
    </div>
);

// Academic Content -> CBC Materials: a curated directory of KICD's official CBC
// curriculum designs & approved materials (kicd.ac.ke), filtered to the grades this
// school actually offers. The chosen page is shown embedded below (iframe); if KICD
// blocks embedding for a given page, "Open in a new tab" always works as a fallback.
export default function CbcMaterials() {
    const { data: classes = [] } = useQuery<any[]>({ queryKey: ["v2_classes"], queryFn: async () => (await api.get("/v2/classes")).data || [] });
    const grades = offeredGrades(classes);
    const hasPrePrimary = offersPrePrimary(classes);
    const gradeLinks = CBC_MATERIAL_GRADES.filter(g => !g.grades || g.grades.some(n => grades.has(n)));

    const [current, setCurrent] = useState(CBC_MATERIAL_HUBS[0]);
    const [frameKey, setFrameKey] = useState(0);

    return (
        <div className="flex-1 bg-[#f4f7f6] min-h-screen flex flex-col items-center">
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center shadow-sm z-10 m-4 rounded-xl w-[calc(100%-2rem)]">
                <span className="font-bold text-gray-800 text-lg mr-2">Academic Content</span><span className="text-gray-300 mx-2">|</span><Home className="w-4 h-4 text-gray-500 mr-2" /><span className="text-gray-500 font-medium">- CBC Materials</span>
            </div>
            <div className="p-6 pt-0 w-full max-w-5xl space-y-6">
                <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 text-xs text-indigo-700 font-medium">
                    Official Competency-Based Curriculum (CBC) resources from the Kenya Institute of Curriculum Development (KICD). Click a link to view it below — use "Open in a new tab" if KICD's site doesn't allow embedding a particular page.
                </div>

                <div>
                    <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2"><BookOpenCheck className="w-4 h-4 text-[#5C67F2]" /> Resource Hubs</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {CBC_MATERIAL_HUBS.map(h => <LinkCard key={h.url} {...h} active={current.url === h.url} onOpen={() => { setCurrent(h); setFrameKey(k => k + 1); }} />)}
                    </div>
                </div>

                {hasPrePrimary && (
                    <div>
                        <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2"><Baby className="w-4 h-4 text-[#5C67F2]" /> Pre-Primary</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <LinkCard {...CBC_MATERIAL_PRE_PRIMARY} active={current.url === CBC_MATERIAL_PRE_PRIMARY.url} onOpen={() => { setCurrent(CBC_MATERIAL_PRE_PRIMARY); setFrameKey(k => k + 1); }} />
                        </div>
                    </div>
                )}

                <div>
                    <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2"><GraduationCap className="w-4 h-4 text-[#5C67F2]" /> Curriculum Designs by Grade</h2>
                    {gradeLinks.length === 0 ? (
                        <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 py-10 text-center text-slate-400 text-sm font-bold">
                            No Grade-named classes found yet — add your classes under Classes, or browse all designs via the hub links above.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {gradeLinks.map(g => <LinkCard key={g.url} {...g} active={current.url === g.url} onOpen={() => { setCurrent(g); setFrameKey(k => k + 1); }} />)}
                        </div>
                    )}
                </div>

                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider">{current.label}</h2>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setFrameKey(k => k + 1)} title="Reload" className="w-8 h-8 rounded-lg border border-gray-200 bg-white text-slate-400 hover:text-[#5C67F2] hover:border-[#5C67F2] flex items-center justify-center"><RotateCw className="w-3.5 h-3.5" /></button>
                            <a href={current.url} target="_blank" rel="noopener noreferrer" className="h-8 px-3 rounded-lg border border-gray-200 bg-white text-xs font-bold text-slate-500 hover:text-[#5C67F2] hover:border-[#5C67F2] flex items-center gap-1.5"><ExternalLink className="w-3.5 h-3.5" /> Open in new tab</a>
                        </div>
                    </div>
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <iframe key={frameKey} src={current.url} title={current.label} className="w-full border-0" style={{ height: "75vh" }} />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-2">
                        If the panel above stays blank, KICD's site is blocking embedding for this page — use "Open in new tab" instead.
                    </p>
                </div>
            </div>
        </div>
    );
}
