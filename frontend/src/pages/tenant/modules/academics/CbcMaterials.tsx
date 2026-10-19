import { useQuery } from "@tanstack/react-query";
import { Home, ExternalLink, BookOpenCheck, GraduationCap, Baby } from "lucide-react";
import api from "@/lib/api";
import { CBC_MATERIAL_HUBS, CBC_MATERIAL_PRE_PRIMARY, CBC_MATERIAL_GRADES, offeredGrades, offersPrePrimary } from "@/lib/cbcMaterials";

const LinkCard = ({ label, url }: { label: string; url: string }) => (
    <a href={url} target="_blank" rel="noopener noreferrer"
        className="flex items-center justify-between gap-3 bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 hover:border-[#5C67F2] hover:shadow-md transition-all group">
        <span className="text-sm font-bold text-slate-700 group-hover:text-[#5C67F2]">{label}</span>
        <ExternalLink className="w-4 h-4 text-slate-300 group-hover:text-[#5C67F2] shrink-0" />
    </a>
);

// Academic Content -> CBC Materials: a curated directory of KICD's official CBC
// curriculum designs & approved materials (kicd.ac.ke), filtered to the grades this
// school actually offers so staff aren't scrolling past levels that don't apply here.
export default function CbcMaterials() {
    const { data: classes = [] } = useQuery<any[]>({ queryKey: ["v2_classes"], queryFn: async () => (await api.get("/v2/classes")).data || [] });
    const grades = offeredGrades(classes);
    const hasPrePrimary = offersPrePrimary(classes);
    const gradeLinks = CBC_MATERIAL_GRADES.filter(g => !g.grades || g.grades.some(n => grades.has(n)));

    return (
        <div className="flex-1 bg-[#f4f7f6] min-h-screen flex flex-col items-center">
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center shadow-sm z-10 m-4 rounded-xl w-[calc(100%-2rem)]">
                <span className="font-bold text-gray-800 text-lg mr-2">Academic Content</span><span className="text-gray-300 mx-2">|</span><Home className="w-4 h-4 text-gray-500 mr-2" /><span className="text-gray-500 font-medium">- CBC Materials</span>
            </div>
            <div className="p-6 pt-0 w-full max-w-5xl space-y-6">
                <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 text-xs text-indigo-700 font-medium">
                    Official Competency-Based Curriculum (CBC) resources from the Kenya Institute of Curriculum Development (KICD) — curriculum designs, approved course materials and more. Each link opens kicd.ac.ke in a new tab; if KICD has moved a specific page, use "CBC Materials Home" to browse from there.
                </div>

                <div>
                    <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2"><BookOpenCheck className="w-4 h-4 text-[#5C67F2]" /> Resource Hubs</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {CBC_MATERIAL_HUBS.map(h => <LinkCard key={h.url} {...h} />)}
                    </div>
                </div>

                {hasPrePrimary && (
                    <div>
                        <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2"><Baby className="w-4 h-4 text-[#5C67F2]" /> Pre-Primary</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <LinkCard {...CBC_MATERIAL_PRE_PRIMARY} />
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
                            {gradeLinks.map(g => <LinkCard key={g.url} {...g} />)}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
