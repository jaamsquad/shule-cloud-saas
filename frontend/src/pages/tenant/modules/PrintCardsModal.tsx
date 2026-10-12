import { useState } from "react";
import { X, Printer, LayoutGrid, Loader2 } from "lucide-react";
import { printAllCards, type PrintLayout } from "./printCards";

// Preset "cards per A4 page" options → the grid layout that achieves them.
// (Card aspect varies, so columns + orientation are what actually control fit.)
const PRESETS: { label: string; per: number; layout: PrintLayout }[] = [
    { label: "1 per page", per: 1, layout: { orientation: "portrait", columns: 1, scale: 1 } },
    { label: "2 per page", per: 2, layout: { orientation: "portrait", columns: 1, scale: 1 } },
    { label: "4 per page", per: 4, layout: { orientation: "portrait", columns: 2, scale: 0.9 } },
    { label: "6 per page", per: 6, layout: { orientation: "portrait", columns: 2, scale: 0.78 } },
    { label: "8 per page", per: 8, layout: { orientation: "landscape", columns: 4, scale: 0.62 } },
    { label: "10 per page", per: 10, layout: { orientation: "portrait", columns: 2, scale: 0.62 } },
];

export default function PrintCardsModal({ open, onClose, selector, total }: {
    open: boolean; onClose: () => void; selector: string; total: number;
}) {
    const [presetIdx, setPresetIdx] = useState(2); // default 4 per page
    const [gap, setGap] = useState(8);
    const [margin, setMargin] = useState(10);
    const [scale, setScale] = useState(0.9);
    const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
    const [columns, setColumns] = useState(2);
    const [advanced, setAdvanced] = useState(false);
    const [isPreparing, setIsPreparing] = useState(false);

    if (!open) return null;

    const choosePreset = (i: number) => {
        setPresetIdx(i);
        const L = PRESETS[i].layout;
        setOrientation(L.orientation || "portrait");
        setColumns(L.columns || 2);
        setScale(L.scale ?? 1);
    };

    const doPrint = async () => {
        setIsPreparing(true);
        try {
            await printAllCards(selector, { orientation, columns, gapMm: gap, marginMm: margin, scale });
        } finally {
            setIsPreparing(false);
            onClose();
        }
    };

    // A4 preview proportions (210×297 portrait). Show a grid of card placeholders.
    const a4W = orientation === "portrait" ? 150 : 210;
    const a4H = orientation === "portrait" ? 212 : 150;
    const per = PRESETS[presetIdx].per;
    const previewCount = Math.min(per, total || per);

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                        <LayoutGrid className="w-5 h-5 text-[#5C67F2]" />
                        <h2 className="font-black text-slate-800">Print Cards — Page Layout</h2>
                    </div>
                    <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
                </div>

                <div className="p-6 grid sm:grid-cols-2 gap-6">
                    {/* Controls */}
                    <div className="space-y-4">
                        <div>
                            <span className="block text-xs font-black text-slate-500 uppercase tracking-wide mb-2">Cards per A4 page</span>
                            <div className="grid grid-cols-3 gap-2">
                                {PRESETS.map((p, i) => (
                                    <button key={p.label} onClick={() => choosePreset(i)}
                                        className={`h-10 rounded-lg text-xs font-bold border transition-colors ${presetIdx === i ? "bg-[#5C67F2] text-white border-[#5C67F2]" : "bg-white text-slate-600 border-slate-200 hover:border-[#5C67F2]"}`}>
                                        {p.per}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button onClick={() => setAdvanced(a => !a)} className="text-xs font-bold text-[#5C67F2]">{advanced ? "Hide" : "Fine-tune"} layout ▾</button>
                        {advanced && (
                            <div className="space-y-3 border-t border-slate-100 pt-3">
                                <Row label="Orientation">
                                    <select value={orientation} onChange={e => setOrientation(e.target.value as any)} className="inp h-9">
                                        <option value="portrait">Portrait</option><option value="landscape">Landscape</option>
                                    </select>
                                </Row>
                                <Row label="Columns">
                                    <input type="number" min={1} max={6} value={columns} onChange={e => setColumns(Math.max(1, Number(e.target.value)))} className="inp h-9 w-20" />
                                </Row>
                                <Row label={`Card size: ${Math.round(scale * 100)}%`}>
                                    <input type="range" min={40} max={120} value={Math.round(scale * 100)} onChange={e => setScale(Number(e.target.value) / 100)} className="w-full" />
                                </Row>
                                <Row label={`Gap: ${gap}mm`}>
                                    <input type="range" min={0} max={20} value={gap} onChange={e => setGap(Number(e.target.value))} className="w-full" />
                                </Row>
                                <Row label={`Margin: ${margin}mm`}>
                                    <input type="range" min={4} max={25} value={margin} onChange={e => setMargin(Number(e.target.value))} className="w-full" />
                                </Row>
                            </div>
                        )}

                        <p className="text-[11px] text-slate-400">{total} card{total === 1 ? "" : "s"} total · ~{Math.ceil((total || 1) / per)} page{Math.ceil((total || 1) / per) === 1 ? "" : "s"}</p>
                    </div>

                    {/* A4 live preview */}
                    <div className="flex flex-col items-center justify-start">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">A4 Preview</span>
                        <div className="bg-white border-2 border-slate-200 rounded-md shadow-inner p-2 grid"
                            style={{ width: a4W, height: a4H, gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: 4 }}>
                            {Array.from({ length: previewCount }).map((_, i) => (
                                <div key={i} className="bg-[#5C67F2]/10 border border-[#5C67F2]/30 rounded flex items-center justify-center text-[8px] font-black text-[#5C67F2]/70" style={{ transform: `scale(${Math.min(1, scale + 0.05)})` }}>ID</div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex gap-2 px-6 py-4 border-t border-slate-100">
                    <button onClick={onClose} disabled={isPreparing} className="h-11 px-5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm disabled:opacity-50">Cancel</button>
                    <button onClick={doPrint} disabled={!total || isPreparing} className="h-11 px-6 rounded-xl text-white font-bold text-sm flex items-center gap-2 ml-auto disabled:opacity-70 bg-[#5C67F2]">
                        {isPreparing ? <><Loader2 className="w-4 h-4 animate-spin" /> Preparing to print…</> : <><Printer className="w-4 h-4" /> Print {total} Card{total === 1 ? "" : "s"}</>}
                    </button>
                </div>
            </div>
        </div>
    );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
    return <div className="flex items-center justify-between gap-3"><span className="text-xs font-bold text-slate-500">{label}</span><div className="flex-1 max-w-[60%]">{children}</div></div>;
}
