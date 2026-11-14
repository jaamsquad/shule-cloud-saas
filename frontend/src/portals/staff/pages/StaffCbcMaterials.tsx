import { useState } from "react";
import { ExternalLink, RotateCw, BookOpenCheck, Cloud } from "lucide-react";
import { PageTitle, PanelCard } from "../../PortalShell";
import { KICD_CBC_MATERIALS_URL, KENYA_EDUCATION_CLOUD_URL } from "@/lib/cbcMaterials";

const SOURCES = [
    { key: "kicd", label: "CBC Materials (KICD)", url: KICD_CBC_MATERIALS_URL, icon: BookOpenCheck },
    { key: "kec", label: "Kenya Education Cloud", url: KENYA_EDUCATION_CLOUD_URL, icon: Cloud },
] as const;

// Teacher portal — KICD's own CBC Materials site and the Kenya Education Cloud,
// shown embedded, same as the admin page.
export default function StaffCbcMaterials() {
    const [sourceKey, setSourceKey] = useState<(typeof SOURCES)[number]["key"]>("kicd");
    const [frameKey, setFrameKey] = useState(0);
    const source = SOURCES.find(s => s.key === sourceKey)!;

    return (
        <>
            <PageTitle title="CBC Materials" />
            <PanelCard title={source.label} action={
                <div className="flex items-center gap-2">
                    <button onClick={() => setFrameKey(k => k + 1)} title="Reload" className="w-7 h-7 rounded-lg bg-white/15 hover:bg-white/25 text-white flex items-center justify-center"><RotateCw className="w-3.5 h-3.5" /></button>
                    <a href={source.url} target="_blank" rel="noopener noreferrer" className="h-7 px-3 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-bold flex items-center gap-1.5"><ExternalLink className="w-3.5 h-3.5" /> New tab</a>
                </div>
            }>
                <div className="flex gap-2 mb-3">
                    {SOURCES.map(s => (
                        <button key={s.key} onClick={() => { setSourceKey(s.key); setFrameKey(k => k + 1); }}
                            className={`h-9 px-4 rounded-full text-xs font-bold flex items-center gap-2 ${sourceKey === s.key ? "bg-slate-800 text-white" : "bg-white border border-slate-200 text-slate-600"}`}>
                            <s.icon className="w-3.5 h-3.5" />{s.label}
                        </button>
                    ))}
                </div>
                <div className="rounded-xl border border-slate-100 overflow-hidden">
                    <iframe key={frameKey} src={source.url} title={source.label} className="w-full border-0" style={{ height: "75vh" }} />
                </div>
                <p className="text-[11px] text-slate-400 mt-2">If the panel above stays blank, the site is blocking embedding — use "New tab" instead.</p>
            </PanelCard>
        </>
    );
}
