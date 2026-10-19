import { useQuery } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { PageTitle, PanelCard } from "../../PortalShell";
import { staffRootApi } from "../staffApi";
import { CBC_MATERIAL_HUBS, CBC_MATERIAL_PRE_PRIMARY, CBC_MATERIAL_GRADES, offeredGrades, offersPrePrimary } from "@/lib/cbcMaterials";

const LinkCard = ({ label, url }: { label: string; url: string }) => (
    <a href={url} target="_blank" rel="noopener noreferrer"
        className="flex items-center justify-between gap-3 bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4 hover:border-[#5C67F2] hover:shadow-md transition-all group">
        <span className="text-sm font-bold text-slate-700 group-hover:text-[#5C67F2]">{label}</span>
        <ExternalLink className="w-4 h-4 text-slate-300 group-hover:text-[#5C67F2] shrink-0" />
    </a>
);

// Teacher portal — same curated directory of KICD's official CBC materials as the
// admin page, filtered to the grades this school actually offers.
export default function StaffCbcMaterials() {
    const { data: classes = [] } = useQuery<any[]>({ queryKey: ["staff_v2_classes"], queryFn: async () => (await staffRootApi.get("/v2/classes")).data || [], retry: false });
    const grades = offeredGrades(classes);
    const hasPrePrimary = offersPrePrimary(classes);
    const gradeLinks = CBC_MATERIAL_GRADES.filter(g => !g.grades || g.grades.some(n => grades.has(n)));

    return (
        <>
            <PageTitle title="CBC Materials" />
            <PanelCard title="Resource Hubs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {CBC_MATERIAL_HUBS.map(h => <LinkCard key={h.url} {...h} />)}
                </div>
                <p className="text-[11px] text-slate-400 mt-3">Official KICD curriculum designs &amp; approved course materials (kicd.ac.ke). Links open in a new tab.</p>
            </PanelCard>

            {hasPrePrimary && (
                <PanelCard title="Pre-Primary">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><LinkCard {...CBC_MATERIAL_PRE_PRIMARY} /></div>
                </PanelCard>
            )}

            <PanelCard title="Curriculum Designs by Grade">
                {gradeLinks.length === 0 ? (
                    <div className="py-10 text-center text-slate-400 text-sm font-semibold">No Grade-named classes set up yet — browse all designs via the hubs above.</div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {gradeLinks.map(g => <LinkCard key={g.url} {...g} />)}
                    </div>
                )}
            </PanelCard>
        </>
    );
}
