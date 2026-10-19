import { useState } from "react";
import { Home, ExternalLink, RotateCw, BookOpenCheck, Cloud } from "lucide-react";
import { KICD_CBC_MATERIALS_URL, KENYA_EDUCATION_CLOUD_URL } from "@/lib/cbcMaterials";

const SOURCES = [
    { key: "kicd", label: "CBC Materials (KICD)", url: KICD_CBC_MATERIALS_URL, icon: BookOpenCheck },
    { key: "kec", label: "Kenya Education Cloud", url: KENYA_EDUCATION_CLOUD_URL, icon: Cloud },
] as const;

// Academic Content -> CBC Materials: KICD's own CBC Materials site and the Kenya
// Education Cloud, shown embedded. We don't mirror or host KICD's content — this
// just frames their official pages, with "Open in new tab" as a fallback in case
// a given page refuses to be embedded.
export default function CbcMaterials() {
    const [sourceKey, setSourceKey] = useState<(typeof SOURCES)[number]["key"]>("kicd");
    const [frameKey, setFrameKey] = useState(0);
    const source = SOURCES.find(s => s.key === sourceKey)!;

    return (
        <div className="flex-1 bg-[#f4f7f6] min-h-screen flex flex-col items-center">
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center shadow-sm z-10 m-4 rounded-xl w-[calc(100%-2rem)]">
                <span className="font-bold text-gray-800 text-lg mr-2">Academic Content</span><span className="text-gray-300 mx-2">|</span><Home className="w-4 h-4 text-gray-500 mr-2" /><span className="text-gray-500 font-medium">- CBC Materials</span>
            </div>
            <div className="p-6 pt-0 w-full max-w-6xl space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex gap-2">
                        {SOURCES.map(s => (
                            <button key={s.key} onClick={() => { setSourceKey(s.key); setFrameKey(k => k + 1); }}
                                className={`h-10 px-4 rounded-full text-sm font-bold flex items-center gap-2 ${sourceKey === s.key ? "bg-[#5C67F2] text-white shadow-sm" : "bg-white border border-gray-200 text-gray-600 hover:border-[#5C67F2]"}`}>
                                <s.icon className="w-4 h-4" />{s.label}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setFrameKey(k => k + 1)} title="Reload" className="w-9 h-9 rounded-lg border border-gray-200 bg-white text-slate-400 hover:text-[#5C67F2] hover:border-[#5C67F2] flex items-center justify-center"><RotateCw className="w-4 h-4" /></button>
                        <a href={source.url} target="_blank" rel="noopener noreferrer" className="h-9 px-3 rounded-lg border border-gray-200 bg-white text-xs font-bold text-slate-500 hover:text-[#5C67F2] hover:border-[#5C67F2] flex items-center gap-1.5"><ExternalLink className="w-3.5 h-3.5" /> Open in new tab</a>
                    </div>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <iframe key={frameKey} src={source.url} title={source.label} className="w-full border-0" style={{ height: "82vh" }} />
                </div>
                <p className="text-[11px] text-slate-400">If the panel above stays blank, the site is blocking embedding — use "Open in new tab" instead.</p>
            </div>
        </div>
    );
}
