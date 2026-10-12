import { Home, Search, Printer, Settings2, Camera, User, Loader2, GraduationCap, X, RotateCcw } from "lucide-react";
import { printSingleCard, countCards } from "./printCards";
import PrintCardsModal from "./PrintCardsModal";
import { useState, useEffect } from "react";
import { useItems } from "@/hooks/useItems";
import { toast } from "sonner";
import { useSchoolBrand } from "@/lib/printDoc";

// ── Layout config (persisted, applied live to the cards) ──────────────────────
type CardLayout = {
    accent: string;          // primary/accent colour
    schoolName: string;      // header text
    cardTitle: string;       // small caps title (e.g. STUDENT IDENTITY CARD)
    showPhoto: boolean;
    showQr: boolean;
    showBarcode: boolean;
    fields: { reg: boolean; class: boolean; gender: boolean; doa: boolean };
    roundedPhoto: boolean;   // circular vs squared avatar
};

const DEFAULT_LAYOUT: CardLayout = {
    accent: "#5C67F2",
    schoolName: "",
    cardTitle: "Student Identity Card",
    showPhoto: true,
    showQr: true,
    showBarcode: true,
    fields: { reg: true, class: true, gender: true, doa: true },
    roundedPhoto: true,
};

const loadLayout = (): CardLayout => {
    try {
        const raw = localStorage.getItem("studentCardLayout");
        if (!raw) return { ...DEFAULT_LAYOUT };
        return { ...DEFAULT_LAYOUT, ...JSON.parse(raw), fields: { ...DEFAULT_LAYOUT.fields, ...(JSON.parse(raw).fields || {}) } };
    } catch { return { ...DEFAULT_LAYOUT }; }
};

export default function StudentIdCards() {
    const [activeStyle, setActiveStyle] = useState(() => localStorage.getItem("studentCardStyle") || "Landscape");
    const { items: students, isLoading, updateItem } = useItems("students");
    const brand = useSchoolBrand();
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [printModal, setPrintModal] = useState(false);
    const [search, setSearch] = useState("");
    // Filter the cards shown (and therefore printed) by name / student ID / class.
    const visibleStudents = (students || []).filter((s: any) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return [s.studentName, s.name, `${s.firstName || ""} ${s.lastName || ""}`, s.registrationNo, s.admNo, s.studentClass, s.currentClass, s.className]
            .filter(Boolean).some((v: any) => String(v).toLowerCase().includes(q));
    });

    const [layout, setLayout] = useState<CardLayout>(loadLayout);
    const [showCustomize, setShowCustomize] = useState(false);
    useEffect(() => { localStorage.setItem("studentCardLayout", JSON.stringify(layout)); }, [layout]);
    const setL = <K extends keyof CardLayout>(k: K, v: CardLayout[K]) => setLayout(p => ({ ...p, [k]: v }));
    const setField = (k: keyof CardLayout["fields"], v: boolean) => setLayout(p => ({ ...p, fields: { ...p.fields, [k]: v } }));

    const styles = ["Landscape", "Default", "Classic Navy", "Modern", "Minimal"];
    const isWide = (s: string) => s !== "Default";
    const pickStyle = (s: string) => { setActiveStyle(s); localStorage.setItem("studentCardStyle", s); };
    const [printingCardId, setPrintingCardId] = useState<string | null>(null);
    const handlePrintSingle = async (studentId: string, el: HTMLElement) => {
        setPrintingCardId(studentId);
        try { await printSingleCard(el); } finally { setPrintingCardId(null); }
    };

    // The card itself (.id-card) is sized to the real physical CR80 ID card dimensions so it
    // prints at exactly normal ID card size. On screen that's quite small, so each card is
    // magnified with a CSS transform for comfortable browsing — the wrapper around it reserves
    // exactly that magnified footprint (via calc()) so cards never overlap, and printCards.ts
    // clones only the un-scaled .id-card node, so none of this ever reaches the printed page.
    // Kept modest (not huge) so a row of cards still fits a normal laptop screen without
    // forcing the whole page to scroll sideways — the grid also carries its own horizontal
    // scroll as a safety net for narrower screens.
    const SCREEN_SCALE = 1.6;
    const WRAPPER_SIZE: Record<string, { w: string; h: string }> = {
        Landscape: { w: `calc(85.6mm * ${SCREEN_SCALE})`, h: `calc(54mm * ${SCREEN_SCALE})` },
        "Classic Navy": { w: `calc(85.6mm * ${SCREEN_SCALE})`, h: `calc(111mm * ${SCREEN_SCALE})` }, // front + 3mm gap + back
        Modern: { w: `calc(85.6mm * ${SCREEN_SCALE})`, h: `calc(54mm * ${SCREEN_SCALE})` },
        Minimal: { w: `calc(85.6mm * ${SCREEN_SCALE})`, h: `calc(54mm * ${SCREEN_SCALE})` },
        Default: { w: `calc(54mm * ${SCREEN_SCALE})`, h: `calc(85.6mm * ${SCREEN_SCALE})` },
    };


    const selectedStudent = students?.find((s: any) => s._id === selectedStudentId) || students?.[0];

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !selectedStudent) return;

        setUploading(true);
        // Simulate upload/Base64 for now
        const reader = new FileReader();
        reader.onloadend = async () => {
            try {
                await updateItem({ id: selectedStudent._id, avatar: reader.result });
                toast.success("Profile picture updated!");
            } catch (err) {
                toast.error("Upload failed");
            } finally {
                setUploading(false);
            }
        };
        reader.readAsDataURL(file);
    };

    return (
        <div className="flex-1 bg-[#f4f7f6] min-h-screen flex flex-col">
            {/* Header Area */}
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center shadow-sm z-10 m-4 rounded-xl flex-wrap gap-4">
                <div className="flex items-center flex-1">
                    <span className="font-bold text-gray-800 text-lg mr-2">Students</span>
                    <span className="text-gray-300 mx-2">|</span>
                    <Home className="w-4 h-4 text-gray-500 mr-2" />
                    <span className="text-gray-500 font-medium">
                        - Student ID Cards
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowCustomize(true)}
                        className="h-9 px-4 flex items-center gap-2 border rounded-md transition-colors text-sm font-bold"
                        style={{ borderColor: layout.accent, color: layout.accent, background: `${layout.accent}10` }}
                    >
                        <Settings2 className="w-4 h-4" /> Customize Layout
                    </button>
                </div>
            </div>

            <div className="px-6 pb-6">
                {/* Style Selector */}
                <div className="flex gap-4 mb-8 overflow-x-auto pb-2 print:hidden">
                    {styles.map(s => (
                        <button
                            key={s}
                            onClick={() => pickStyle(s)}
                            className={`h-10 px-6 rounded-xl font-bold text-sm shadow-sm border whitespace-nowrap transition-all flex items-center gap-2`}
                            style={activeStyle === s
                                ? { background: layout.accent, color: "#fff", borderColor: layout.accent }
                                : { background: "#fff", color: "#475569", borderColor: "#e5e7eb" }}
                        >
                            {activeStyle !== s && <div className="w-1.5 h-4 rounded-full opacity-60" style={{ background: layout.accent }}></div>}
                            {s}
                        </button>
                    ))}

                    <button
                        onClick={() => setPrintModal(true)}
                        className="h-10 px-6 rounded-xl font-bold text-sm bg-[#FF9A5A] text-white shadow-lg shadow-orange-100 flex items-center gap-2 ml-auto hover:scale-105 transition-all"
                    >
                        <Printer className="w-4 h-4" /> Print {search ? "Filtered" : "All"} Cards
                    </button>
                </div>

                {/* Search — filter by name, student ID or class to print specific cards */}
                <div className="flex items-center gap-2 mb-6 print:hidden">
                    <div className="relative flex-1 max-w-md">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, student ID or class…"
                            className="w-full h-10 pl-9 pr-9 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#5C67F2]" />
                        {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>}
                    </div>
                    {search && <span className="text-xs font-bold text-slate-400">{visibleStudents.length} match{visibleStudents.length === 1 ? "" : "es"}</span>}
                </div>

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <Loader2 className="w-12 h-12 animate-spin" style={{ color: layout.accent }} />
                        <p className="text-slate-400 font-bold animate-pulse">Synchronizing student nodes...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto pb-2">
                    <div id="id-card-print" className={`grid gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500 w-max min-w-full ${isWide(activeStyle) ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"}`}>
                        {visibleStudents.length > 0 ? (
                            visibleStudents.map((student: any) => (
                                <div key={student._id} className="relative print:contents" style={{ width: WRAPPER_SIZE[activeStyle].w, height: WRAPPER_SIZE[activeStyle].h }}>
                                    <div style={{ transform: `scale(${SCREEN_SCALE})`, transformOrigin: "top left" }} className="print:!transform-none">
                                        <div className="id-card relative group/card">
                                            <button data-no-print disabled={printingCardId === student._id} onClick={(e) => handlePrintSingle(student._id, e.currentTarget)} title="Print this card"
                                                className={`absolute -top-3 -right-1 z-20 w-8 h-8 rounded-full bg-white border border-slate-200 shadow text-slate-500 hover:text-[#5C67F2] flex items-center justify-center transition-opacity print:hidden ${printingCardId === student._id ? "opacity-100" : "opacity-0 group-hover/card:opacity-100"}`}>
                                                {printingCardId === student._id ? <Loader2 className="w-4 h-4 animate-spin text-[#5C67F2]" /> : <Printer className="w-4 h-4" />}
                                            </button>
                                            <IdCard student={student} onUpload={handleImageUpload} isUploading={uploading} activeStyle={activeStyle} layout={layout} brand={brand} />
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="col-span-full bg-white p-12 rounded-[2rem] border border-dashed border-gray-300 flex flex-col items-center gap-4 text-center">
                                <User className="w-16 h-16 text-gray-200" />
                                <p className="text-gray-400 font-bold max-w-[200px]">No students found. Add students first to generate ID cards.</p>
                            </div>
                        )}
                    </div>
                    </div>
                )}
            </div>

            {showCustomize && (
                <CustomizePanel
                    layout={layout}
                    setL={setL}
                    setField={setField}
                    onReset={() => setLayout({ ...DEFAULT_LAYOUT })}
                    onClose={() => { setShowCustomize(false); toast.success("Layout applied"); }}
                />
            )}
            <PrintCardsModal open={printModal} onClose={() => setPrintModal(false)} selector=".id-card" total={countCards(".id-card")} />
        </div>
    );
}

// ── Customize Layout slide-over panel ─────────────────────────────────────────
function CustomizePanel({ layout, setL, setField, onReset, onClose }: {
    layout: CardLayout;
    setL: <K extends keyof CardLayout>(k: K, v: CardLayout[K]) => void;
    setField: (k: keyof CardLayout["fields"], v: boolean) => void;
    onReset: () => void;
    onClose: () => void;
}) {
    const Toggle = ({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) => (
        <button onClick={() => onChange(!on)} className="w-full flex items-center justify-between py-2.5 group">
            <span className="text-sm font-bold text-slate-700">{label}</span>
            <span className={`w-11 h-6 rounded-full p-0.5 transition-colors ${on ? "" : "bg-slate-200"}`} style={on ? { background: layout.accent } : {}}>
                <span className={`block w-5 h-5 bg-white rounded-full shadow transition-transform ${on ? "translate-x-5" : ""}`} />
            </span>
        </button>
    );
    const swatches = ["#5C67F2", "#0f2548", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#0f172a"];

    return (
        <div className="fixed inset-0 z-50 flex justify-end print:hidden">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-[380px] h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white" style={{ background: layout.accent }}><Settings2 className="w-4 h-4" /></div>
                    <div className="flex-1"><h2 className="font-black text-slate-800">Customize Layout</h2><p className="text-[11px] text-slate-400">Changes apply to the cards live</p></div>
                    <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500"><X className="w-4 h-4" /></button>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
                    {/* Accent colour */}
                    <div>
                        <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2">Accent Colour</label>
                        <div className="flex flex-wrap gap-2">
                            {swatches.map(c => (
                                <button key={c} onClick={() => setL("accent", c)}
                                    className={`w-8 h-8 rounded-full border-2 transition-transform ${layout.accent === c ? "scale-110 border-slate-900" : "border-white"}`}
                                    style={{ background: c }} />
                            ))}
                            <label className="w-8 h-8 rounded-full border border-dashed border-slate-300 flex items-center justify-center cursor-pointer overflow-hidden">
                                <input type="color" value={layout.accent} onChange={e => setL("accent", e.target.value)} className="w-10 h-10 cursor-pointer" />
                            </label>
                        </div>
                    </div>

                    {/* Text */}
                    <div className="space-y-3">
                        <div>
                            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1">Card Title</label>
                            <input value={layout.cardTitle} onChange={e => setL("cardTitle", e.target.value)} placeholder="Student Identity Card"
                                className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-slate-400" />
                        </div>
                        <div>
                            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1">School / Header (optional)</label>
                            <input value={layout.schoolName} onChange={e => setL("schoolName", e.target.value)} placeholder="Leave blank to hide"
                                className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-slate-400" />
                        </div>
                    </div>

                    {/* Elements */}
                    <div>
                        <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1">Elements</label>
                        <div className="divide-y divide-slate-50">
                            <Toggle label="Student photo" on={layout.showPhoto} onChange={v => setL("showPhoto", v)} />
                            <Toggle label="Circular photo" on={layout.roundedPhoto} onChange={v => setL("roundedPhoto", v)} />
                            <Toggle label="Wallet QR code" on={layout.showQr} onChange={v => setL("showQr", v)} />
                            <Toggle label="Barcode" on={layout.showBarcode} onChange={v => setL("showBarcode", v)} />
                        </div>
                    </div>

                    {/* Fields */}
                    <div>
                        <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1">Detail Fields</label>
                        <div className="divide-y divide-slate-50">
                            <Toggle label="Registration No." on={layout.fields.reg} onChange={v => setField("reg", v)} />
                            <Toggle label="Gender" on={layout.fields.gender} onChange={v => setField("gender", v)} />
                            <Toggle label="Date of Admission" on={layout.fields.doa} onChange={v => setField("doa", v)} />
                        </div>
                    </div>
                </div>

                <div className="px-5 py-4 border-t border-slate-100 flex gap-2">
                    <button onClick={onReset} className="h-11 px-4 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm flex items-center gap-2 hover:bg-slate-50">
                        <RotateCcw className="w-4 h-4" /> Reset
                    </button>
                    <button onClick={onClose} className="flex-1 h-11 rounded-xl text-white font-black text-sm" style={{ background: layout.accent }}>
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}

// Real CR80 card dimensions (the worldwide standard ID/bank-card size) — printing at
// these physical sizes, rather than arbitrary pixel boxes, is what makes a card come
// out of the printer as a normal ID card instead of an oversized sheet of paper.
const CR80_LANDSCAPE = { width: "85.6mm", height: "54mm" };
const CR80_PORTRAIT = { width: "54mm", height: "85.6mm" };

function IdCard({ student, onUpload, isUploading, activeStyle, layout, brand }: { student: any, onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void, isUploading: boolean, activeStyle: string, layout: CardLayout, brand?: { name: string; logo: string } }) {
    // School name & logo default to the real institution profile (override via layout.schoolName).
    const schoolName = layout.schoolName || brand?.name || "School";
    const schoolLogo = brand?.logo || "";
    const photo = student.avatar || student.photo || student.studentPhoto || student.image || student.passportPhoto;
    const regNo = student.registrationNo || student.admNo || "—";
    const studentName = student.studentName || student.name || `${student.firstName || ""} ${student.lastName || ""}`.trim() || "Student";
    const accent = layout.accent;
    // Wallet code = SCW + last 6 of the student _id (deterministic) — scannable for canteen/wallet.
    const walletCode = `SCW${String(student._id || "").slice(-6).toUpperCase()}`;
    const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&margin=0&data=${encodeURIComponent(walletCode)}`;

    // Real Code-128 barcode (matches the ID Card Studio) — encodes the reg number.
    const barSrc = `https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(regNo)}&scale=2&height=8&includetext=false`;

    // Detail rows respecting the configured field toggles.
    const rows: [string, string][] = [];
    if (layout.fields.reg) rows.push(["Reg No", regNo]);
    // Class is intentionally never shown on student ID cards.
    if (layout.fields.gender) rows.push(["Gender", student.gender || "—"]);
    if (layout.fields.doa) rows.push(["DOA", student.admissionDate || "—"]);

    const CameraBtn = () => layout.showPhoto ? (
        <label data-no-print className="absolute top-[2mm] right-[2mm] cursor-pointer z-20 print:hidden">
            <input type="file" className="hidden" onChange={onUpload} accept="image/*" />
            <div className="w-[6mm] h-[6mm] bg-white/90 rounded-md border border-gray-200 shadow-sm flex items-center justify-center" style={{ color: accent }}><Camera style={{ width: "3.2mm", height: "3.2mm" }} /></div>
        </label>
    ) : null;

    const SchoolLogo = ({ size = "7mm", onDark = false }: { size?: string; onDark?: boolean }) => schoolLogo ? (
        <img src={schoolLogo} alt="" className="object-contain bg-white rounded-full border border-slate-100 flex-shrink-0" style={{ width: size, height: size }} />
    ) : (
        <div className="rounded-full flex items-center justify-center font-black flex-shrink-0" style={{ width: size, height: size, background: onDark ? "rgba(255,255,255,0.15)" : accent, color: "#fff", fontSize: "2.6mm" }}>{(schoolName || "S")[0]}</div>
    );

    // ── Classic Navy (CR80 landscape, front + back) ────────────────────────────
    if (activeStyle === "Classic Navy") {
        const NAVY = accent;
        const walletQr = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=0&data=${encodeURIComponent(`https://shulecloud.com/wallet/${encodeURIComponent(regNo)}`)}`;
        return (
            <div className="flex flex-col gap-[3mm] group">
                {/* FRONT */}
                <div className="bg-white rounded-[2mm] shadow-xl overflow-hidden relative flex flex-col" style={CR80_LANDSCAPE}>
                    <CameraBtn />
                    {/* Header */}
                    <div className="flex items-center gap-[1.5mm] px-[3mm] pt-[2mm] pb-[1mm]">
                        <SchoolLogo size="6mm" />
                        <div className="flex-1 min-w-0">
                            <div className="font-black leading-tight truncate" style={{ color: NAVY, fontSize: "3mm" }}>{schoolName}</div>
                            <div className="font-bold tracking-wider text-slate-500 truncate" style={{ fontSize: "1.9mm" }}>{layout.cardTitle.toUpperCase()}</div>
                        </div>
                        <span className="font-black text-white rounded-full flex-shrink-0" style={{ background: NAVY, fontSize: "1.9mm", padding: "0.6mm 1.8mm" }}>{student.admissionDate ? String(student.admissionDate).slice(0, 4) : new Date().getFullYear()}</span>
                    </div>
                    {/* Navy body */}
                    <div className="flex gap-[2.5mm] px-[3mm] py-[2mm] text-white flex-1 min-h-0" style={{ background: NAVY }}>
                        {layout.showPhoto && (
                            <div className={`flex items-center justify-center font-black overflow-hidden flex-shrink-0 ${layout.roundedPhoto ? "rounded-[1.5mm]" : "rounded-[1mm]"}`} style={{ width: "16mm", height: "20mm", background: "#1c3a63", color: "#5b7aa8", fontSize: "2mm" }}>
                                {isUploading ? <Loader2 className="animate-spin text-white" style={{ width: "5mm", height: "5mm" }} /> : photo ? <img src={photo} alt="" className="w-full h-full object-cover" /> : "PHOTO"}
                            </div>
                        )}
                        <div className="flex-1 min-w-0" style={{ color: "#ffffff" }}>
                            <div className="font-black leading-tight truncate" style={{ color: "#ffffff", fontSize: "3.4mm" }}>{studentName}</div>
                            <div className="mb-[1.5mm]" style={{ color: "#dbe7f5", fontSize: "2.2mm" }}>{student.gender || ""}</div>
                            <div className="grid grid-cols-2 gap-x-[2mm] gap-y-[1mm]">
                                {rows.map(([l, v]) => (
                                    <div key={l} className="min-w-0"><div className="font-bold tracking-wide uppercase truncate" style={{ color: "#c7d6ea", fontSize: "1.7mm" }}>{l}</div><div className="font-black truncate" style={{ color: "#ffffff", fontSize: "2.2mm" }}>{v}</div></div>
                                ))}
                            </div>
                        </div>
                    </div>
                    {/* Strip: barcode + chip */}
                    <div className="flex items-center gap-[1.5mm] px-[3mm] bg-white flex-shrink-0" style={{ height: "7mm" }}>
                        {layout.showBarcode ? <img src={barSrc} alt="barcode" style={{ height: "4mm" }} /> : <div className="flex-1" />}
                        <span className="tracking-widest font-bold text-slate-500 truncate" style={{ fontSize: "1.7mm" }}>{String(regNo).replace(/\W/g, "")}</span>
                        <div className="ml-auto rounded flex-shrink-0" style={{ width: "5mm", height: "3.5mm", background: "linear-gradient(135deg,#e8b94a,#c8902a)" }} />
                    </div>
                </div>

                {/* BACK */}
                {layout.showQr && (
                    <div className="rounded-[2mm] shadow-xl flex flex-col items-center justify-center text-white" style={{ ...CR80_LANDSCAPE, background: NAVY }}>
                        <div className="font-black tracking-wider" style={{ color: "#9db6da", fontSize: "2.2mm", marginBottom: "1.5mm" }}>SCAN FOR STUDENT WALLET</div>
                        <img src={walletQr} alt="wallet QR" className="bg-white rounded" style={{ width: "16mm", height: "16mm", padding: "1mm" }} />
                        <div style={{ color: "#cbd5e1", fontSize: "2mm", marginTop: "1.5mm", letterSpacing: "0.1em" }}>{regNo}</div>
                    </div>
                )}
            </div>
        );
    }

    // ── Landscape (CR80 landscape, coloured side panel) ────────────────────────
    if (activeStyle === "Landscape") {
        return (
            <div className="bg-white rounded-[2mm] shadow-xl border border-gray-100 overflow-hidden relative flex group" style={CR80_LANDSCAPE}>
                <CameraBtn />
                {/* Left colored panel */}
                <div className="flex flex-col items-center justify-center relative flex-shrink-0" style={{ width: "28mm", background: `linear-gradient(to bottom, ${accent}, #0A1B3F)`, padding: "2mm" }}>
                    <div className="absolute -right-[1.5mm] top-0 bottom-0 w-[2.5mm] bg-white/10 -skew-x-12 pointer-events-none" />
                    {layout.showPhoto && (
                        <div className={`border-white/80 shadow-lg overflow-hidden flex items-center justify-center bg-white/10 ${layout.roundedPhoto ? "rounded-full" : "rounded-[1.5mm]"}`} style={{ width: "17mm", height: "17mm", borderWidth: "0.6mm" }}>
                            {isUploading ? <Loader2 className="animate-spin text-white" style={{ width: "5mm", height: "5mm" }} /> : photo ? <img src={photo} alt="" className="w-full h-full object-cover" /> : <GraduationCap className="text-white/70" style={{ width: "7mm", height: "7mm" }} />}
                        </div>
                    )}
                    <p className="text-white font-black uppercase tracking-widest text-center leading-tight" style={{ fontSize: "1.9mm", marginTop: "1.5mm" }}>{layout.cardTitle || "Student"}</p>
                </div>
                {/* Right info */}
                <div className="flex-1 min-w-0 flex flex-col" style={{ padding: "2.5mm 3mm" }}>
                    <div className="flex items-center gap-[1.5mm]" style={{ marginBottom: "1mm" }}>
                        <SchoolLogo size="5.5mm" />
                        <div className="min-w-0">
                            <div className="font-black text-slate-800 truncate leading-tight" style={{ fontSize: "2.6mm" }}>{schoolName}</div>
                            <div className="font-black uppercase tracking-[0.15em] truncate" style={{ color: accent, fontSize: "1.7mm" }}>{layout.cardTitle}</div>
                        </div>
                    </div>
                    <h3 className="font-black text-slate-900 leading-tight truncate" style={{ fontSize: "3.6mm" }}>{studentName}</h3>
                    <div className="flex-1 min-h-0" style={{ marginTop: "1.5mm" }}>
                        {rows.map(([k, v]) => (
                            <div key={k} className="flex items-center" style={{ fontSize: "2mm", marginBottom: "0.8mm" }}>
                                <span className="text-slate-400 font-bold uppercase flex-shrink-0" style={{ width: "13mm", fontSize: "1.6mm" }}>{k}</span>
                                <span className="font-bold text-slate-800 truncate">→ {v}</span>
                            </div>
                        ))}
                    </div>
                    <div className="flex items-end justify-between" style={{ marginTop: "1mm" }}>
                        {layout.showBarcode ? (
                            <div className="flex flex-col min-w-0"><img src={barSrc} alt="barcode" style={{ height: "5mm", maxWidth: "22mm" }} /><span className="font-black text-slate-400 tracking-[0.15em] truncate" style={{ fontSize: "1.4mm", marginTop: "0.3mm" }}>{regNo}</span></div>
                        ) : <div />}
                        {layout.showQr && (
                            <div className="bg-white border border-slate-100 rounded flex flex-col items-center flex-shrink-0" style={{ padding: "0.6mm" }}>
                                <img src={qrSrc} alt="wallet QR" style={{ width: "8mm", height: "8mm" }} />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // ── Modern (CR80 landscape, top colour banner with overlapping photo) ──────
    if (activeStyle === "Modern") {
        return (
            <div className="bg-white rounded-[2mm] shadow-xl border border-gray-100 overflow-hidden relative flex flex-col group" style={CR80_LANDSCAPE}>
                <CameraBtn />
                {/* Top banner */}
                <div className="flex items-center gap-[1.5mm] flex-shrink-0" style={{ height: "16mm", background: `linear-gradient(135deg, ${accent}, #0A1B3F)`, padding: "0 3mm" }}>
                    <SchoolLogo size="6.5mm" onDark />
                    <div className="min-w-0 flex-1">
                        <div className="font-black text-white truncate leading-tight" style={{ fontSize: "2.8mm" }}>{schoolName}</div>
                        <div className="font-bold uppercase tracking-[0.15em] truncate" style={{ color: "rgba(255,255,255,0.75)", fontSize: "1.6mm" }}>{layout.cardTitle}</div>
                    </div>
                </div>
                {/* Body: photo overlapping the banner, info to the right */}
                <div className="flex-1 min-h-0 flex" style={{ padding: "0 3mm 2mm" }}>
                    {layout.showPhoto && (
                        <div className={`bg-gray-50 border-white shadow-md overflow-hidden flex items-center justify-center flex-shrink-0 ring-1 ring-gray-100 ${layout.roundedPhoto ? "rounded-full" : "rounded-[1.5mm]"}`} style={{ width: "18mm", height: "18mm", borderWidth: "0.8mm", marginTop: "-9mm" }}>
                            {isUploading ? <Loader2 className="animate-spin" style={{ width: "5mm", height: "5mm", color: accent }} /> : photo ? <img src={photo} alt="" className="w-full h-full object-cover" /> : <GraduationCap style={{ width: "7mm", height: "7mm", color: accent, opacity: 0.4 }} />}
                        </div>
                    )}
                    <div className="flex-1 min-w-0" style={{ marginTop: "2mm", marginLeft: "2.5mm" }}>
                        <h3 className="font-black text-slate-900 leading-tight truncate" style={{ fontSize: "3.4mm" }}>{studentName}</h3>
                        <div className="grid grid-cols-2 gap-x-[2mm]" style={{ marginTop: "1.2mm" }}>
                            {rows.map(([k, v]) => (
                                <div key={k} className="min-w-0" style={{ marginBottom: "0.6mm" }}>
                                    <div className="font-bold uppercase text-slate-400 truncate" style={{ fontSize: "1.5mm" }}>{k}</div>
                                    <div className="font-black text-slate-800 truncate" style={{ fontSize: "2mm" }}>{v}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                {/* Footer strip */}
                <div className="flex items-center justify-between flex-shrink-0" style={{ padding: "0 3mm", height: "7mm", borderTop: "0.3mm solid #f1f5f9" }}>
                    {layout.showBarcode ? <img src={barSrc} alt="barcode" style={{ height: "4.5mm", maxWidth: "24mm" }} /> : <div />}
                    {layout.showQr && <img src={qrSrc} alt="wallet QR" style={{ width: "6.5mm", height: "6.5mm" }} />}
                </div>
            </div>
        );
    }

    // ── Minimal (CR80 landscape, clean with a thin accent bar) ─────────────────
    if (activeStyle === "Minimal") {
        return (
            <div className="bg-white rounded-[1.5mm] shadow-xl border border-gray-100 overflow-hidden relative flex group" style={CR80_LANDSCAPE}>
                <CameraBtn />
                <div className="flex-shrink-0" style={{ width: "1.8mm", background: accent }} />
                <div className="flex-1 min-w-0 flex flex-col" style={{ padding: "2.5mm" }}>
                    <div className="flex items-center gap-[1.2mm]" style={{ marginBottom: "2mm" }}>
                        <SchoolLogo size="5mm" />
                        <div className="font-bold uppercase tracking-[0.15em] text-slate-400 truncate" style={{ fontSize: "1.5mm" }}>{schoolName}</div>
                    </div>
                    <div className="flex items-center flex-1 min-h-0" style={{ gap: "3mm" }}>
                        {layout.showPhoto && (
                            <div className={`bg-gray-50 flex items-center justify-center overflow-hidden flex-shrink-0 ring-1 ring-gray-100 ${layout.roundedPhoto ? "rounded-full" : "rounded-[1mm]"}`} style={{ width: "15mm", height: "15mm" }}>
                                {isUploading ? <Loader2 className="animate-spin" style={{ width: "4mm", height: "4mm", color: accent }} /> : photo ? <img src={photo} alt="" className="w-full h-full object-cover" /> : <GraduationCap style={{ width: "6mm", height: "6mm", color: accent, opacity: 0.4 }} />}
                            </div>
                        )}
                        <div className="min-w-0 flex-1">
                            <h3 className="font-black text-slate-900 leading-tight truncate" style={{ fontSize: "3.2mm" }}>{studentName}</h3>
                            <div style={{ marginTop: "1.2mm" }}>
                                {rows.map(([k, v]) => (
                                    <div key={k} className="flex items-baseline gap-[1mm]" style={{ fontSize: "1.9mm", marginBottom: "0.5mm" }}>
                                        <span className="text-slate-400 font-medium flex-shrink-0">{k}</span>
                                        <span className="font-bold text-slate-800 truncate">{v}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        {layout.showQr && (
                            <div className="flex-shrink-0">
                                <img src={qrSrc} alt="wallet QR" style={{ width: "9mm", height: "9mm" }} />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // ── Default (CR80 portrait badge) ───────────────────────────────────────────
    return (
        <div className="bg-white rounded-[3mm] shadow-xl border border-gray-100 overflow-hidden relative flex flex-col items-center group" style={CR80_PORTRAIT}>
            {/* Header strip with logo + school name */}
            <div className="w-full flex items-center justify-center gap-[1.2mm] flex-shrink-0" style={{ padding: "2mm 2mm 0" }}>
                <SchoolLogo size="5mm" />
                <div className="font-black text-slate-500 uppercase tracking-[0.15em] truncate" style={{ fontSize: "1.7mm" }}>{schoolName}</div>
            </div>
            <CameraBtn />

            {/* Avatar with Ring */}
            {layout.showPhoto && (
                <div className="relative flex-shrink-0" style={{ marginTop: "2mm" }}>
                    <div className={`bg-gray-50 flex items-center justify-center shadow-md overflow-hidden ring-1 ring-gray-100 ${layout.roundedPhoto ? "rounded-full" : "rounded-[2mm]"}`} style={{ width: "22mm", height: "22mm", border: "1.2mm solid white", boxShadow: "0 0 0 0.3mm #e5e7eb" }}>
                        {isUploading ? (
                            <Loader2 className="animate-spin" style={{ width: "6mm", height: "6mm", color: accent }} />
                        ) : photo ? (
                            <img src={photo} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <GraduationCap style={{ width: "9mm", height: "9mm", color: accent, opacity: 0.4 }} />
                        )}
                    </div>
                </div>
            )}

            <h3 className="font-black text-slate-900 uppercase tracking-wide text-center flex-shrink-0" style={{ fontSize: "3mm", marginTop: "1.5mm", padding: "0 2mm" }}>
                {studentName.split(' ').map((n: string, i: number) => (
                    <span key={i} style={i === 1 ? { color: accent } : {}}>{n} </span>
                ))}
            </h3>
            <div className="font-black uppercase tracking-widest flex-shrink-0" style={{ color: accent, fontSize: "1.8mm", marginTop: "0.5mm" }}>{layout.cardTitle}</div>

            {/* Card Footer Details */}
            <div className="w-full flex-1 min-h-0 flex flex-col items-center justify-end" style={{ padding: "1.5mm 3mm 2.5mm" }}>
                <div className="w-full" style={{ marginBottom: "1.5mm" }}>
                    {rows.map(([k, v]) => (
                        <div key={k} className="flex items-center justify-center gap-[1mm] text-slate-600 font-bold" style={{ fontSize: "1.9mm", marginBottom: "0.4mm" }}>
                            <span className="text-slate-400">{k === "Reg No" ? "ID" : k}</span><span className="text-slate-300">·</span><span className="text-slate-900">{v}</span>
                        </div>
                    ))}
                </div>
                <div className="flex items-center justify-center gap-[2mm] w-full">
                    {layout.showBarcode && <img src={barSrc} alt="barcode" style={{ height: "4.5mm", maxWidth: "20mm" }} />}
                    {layout.showQr && (
                        <div className="bg-white rounded border border-slate-900 flex-shrink-0" style={{ padding: "0.5mm" }}>
                            <img src={qrSrc} alt="wallet QR" style={{ width: "7mm", height: "7mm" }} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
