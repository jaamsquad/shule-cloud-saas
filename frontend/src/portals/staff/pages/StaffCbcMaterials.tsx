import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, RotateCw } from "lucide-react";
import { PageTitle, PanelCard } from "../../PortalShell";
import { staffRootApi } from "../staffApi";
import { CBC_MATERIAL_HUBS, CBC_MATERIAL_PRE_PRIMARY, CBC_MATERIAL_GRADES, offeredGrades, offersPrePrimary } from "@/lib/cbcMaterials";

const LinkCard = ({ label, url, active, onOpen }: { label: string; url: string; active: boolean; onOpen: () => void }) => (
    <div className={`flex items-center justify-between gap-2 bg-white rounded-2xl border shadow-sm px-5 py-4 transition-all ${active ? "border-[#5C67F2] ring-1 ring-[#5C67F2]/30" : "border-slate-100 hover:border-[#5C67F2] hover:shadow-md"}`}>
        <button onClick={onOpen} className="text-sm font-bold text-slate-700 hover:text-[#5C67F2] text-left flex-1">{label}</button>
        <a href={url} target="_blank" rel="noopener noreferrer" title="Open in a new tab" className="text-slate-300 hover:text-[#5C67F2] shrink-0"><ExternalLink className="w-4 h-4" /></a>
    </div>
);

// Teacher portal — same curated directory of KICD's official CBC materials as the
// admin page, filtered to the grades this school actually offers, shown embedded.
export default function StaffCbcMaterials() {
    const { data: classes = [] } = useQuery<any[]>({ queryKey: ["staff_v2_classes"], queryFn: async () => (await staffRootApi.get("/v2/classes")).data || [], retry: false });
    const grades = offeredGrades(classes);
    const hasPrePrimary = offersPrePrimary(classes);
    const gradeLinks = CBC_MATERIAL_GRADES.filter(g => !g.grades || g.grades.some(n => grades.has(n)));

    const [current, setCurrent] = useState(CBC_MATERIAL_HUBS[0]);
    const [frameKey, setFrameKey] = useState(0);
    const open = (link: { label: string; url: string }) => { setCurrent(link); setFrameKey(k => k + 1); };

    return (
        <>
            <PageTitle title="CBC Materials" />
            <PanelCard title="Resource Hubs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {CBC_MATERIAL_HUBS.map(h => <LinkCard key={h.url} {...h} active={current.url === h.url} onOpen={() => open(h)} />)}
                </div>
                <p className="text-[11px] text-slate-400 mt-3">Official KICD curriculum designs &amp; approved course materials (kicd.ac.ke) — click a link to view it below.</p>
            </PanelCard>

            {hasPrePrimary && (
                <PanelCard title="Pre-Primary">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><LinkCard {...CBC_MATERIAL_PRE_PRIMARY} active={current.url === CBC_MATERIAL_PRE_PRIMARY.url} onOpen={() => open(CBC_MATERIAL_PRE_PRIMARY)} /></div>
                </PanelCard>
            )}

            <PanelCard title="Curriculum Designs by Grade">
                {gradeLinks.length === 0 ? (
                    <div className="py-10 text-center text-slate-400 text-sm font-semibold">No Grade-named classes set up yet — browse all designs via the hubs above.</div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {gradeLinks.map(g => <LinkCard key={g.url} {...g} active={current.url === g.url} onOpen={() => open(g)} />)}
                    </div>
                )}
            </PanelCard>

            <PanelCard title={current.label} action={
                <div className="flex items-center gap-2">
                    <button onClick={() => setFrameKey(k => k + 1)} title="Reload" className="w-7 h-7 rounded-lg bg-white/15 hover:bg-white/25 text-white flex items-center justify-center"><RotateCw className="w-3.5 h-3.5" /></button>
                    <a href={current.url} target="_blank" rel="noopener noreferrer" className="h-7 px-3 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-bold flex items-center gap-1.5"><ExternalLink className="w-3.5 h-3.5" /> New tab</a>
                </div>
            }>
                <div className="rounded-xl border border-slate-100 overflow-hidden">
                    <iframe key={frameKey} src={current.url} title={current.label} className="w-full border-0" style={{ height: "70vh" }} />
                </div>
                <p className="text-[11px] text-slate-400 mt-2">If the panel above stays blank, KICD's site is blocking embedding for this page — use "New tab" instead.</p>
            </PanelCard>
        </>
    );
}
