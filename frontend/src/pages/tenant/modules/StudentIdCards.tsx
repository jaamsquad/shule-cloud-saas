import { Home, Search, Printer, Settings2, Camera, User, Loader2, QrCode, Barcode, GraduationCap, X, RotateCcw } from "lucide-react";
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

    const [layout, setLayout] = useState<CardLayout>(loadLayout);
    const [showCustomize, setShowCustomize] = useState(false);
    useEffect(() => { localStorage.setItem("studentCardLayout", JSON.stringify(layout)); }, [layout]);
    const setL = <K extends keyof CardLayout>(k: K, v: CardLayout[K]) => setLayout(p => ({ ...p, [k]: v }));
    const setField = (k: keyof CardLayout["fields"], v: boolean) => setLayout(p => ({ ...p, fields: { ...p.fields, [k]: v } }));

    const styles = ["Landscape", "Default", "Classic Navy"];
    const isWide = (s: string) => s === "Landscape" || s === "Classic Navy";
    const pickStyle = (s: string) => { setActiveStyle(s); localStorage.setItem("studentCardStyle", s); };


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
                        <Printer className="w-4 h-4" /> Print All Cards
                    </button>
                </div>

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <Loader2 className="w-12 h-12 animate-spin" style={{ color: layout.accent }} />
                        <p className="text-slate-400 font-bold animate-pulse">Synchronizing student nodes...</p>
                    </div>
                ) : (
                    <div id="id-card-print" className={`grid gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500 ${isWide(activeStyle) ? "grid-cols-1 xl:grid-cols-2" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"}`}>
                        {students && students.length > 0 ? (
                            students.map((student: any) => (
                                <div key={student._id} className="id-card flex justify-center relative group/card">
                                    <button data-no-print onClick={(e) => printSingleCard(e.currentTarget)} title="Print this card"
                                        className="absolute -top-3 -right-1 z-20 w-8 h-8 rounded-full bg-white border border-slate-200 shadow text-slate-500 hover:text-[#5C67F2] flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity print:hidden">
                                        <Printer className="w-4 h-4" />
                                    </button>
                                    <IdCard student={student} onUpload={handleImageUpload} isUploading={uploading} activeStyle={activeStyle} layout={layout} brand={brand} />
                                </div>
                            ))
                        ) : (
                            <div className="col-span-full bg-white p-12 rounded-[2rem] border border-dashed border-gray-300 flex flex-col items-center gap-4 text-center">
                                <User className="w-16 h-16 text-gray-200" />
                                <p className="text-gray-400 font-bold max-w-[200px]">No students found. Add students first to generate ID cards.</p>
                            </div>
                        )}
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
                            <Toggle label="Class" on={layout.fields.class} onChange={v => setField("class", v)} />
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

function IdCard({ student, onUpload, isUploading, activeStyle, layout, brand }: { student: any, onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void, isUploading: boolean, activeStyle: string, layout: CardLayout, brand?: { name: string; logo: string } }) {
    // School name & logo default to the real institution profile (override via layout.schoolName).
    const schoolName = layout.schoolName || brand?.name || "Student Identity Card";
    const schoolLogo = brand?.logo || "";
    const photo = student.avatar || student.photo || student.studentPhoto || student.image || student.passportPhoto;
    const regNo = student.registrationNo || student.admNo || "—";
    const accent = layout.accent;
    // Wallet code = SCW + last 6 of the student _id (deterministic) — scannable for canteen/wallet.
    const walletCode = `SCW${String(student._id || "").slice(-6).toUpperCase()}`;
    const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&margin=0&data=${encodeURIComponent(walletCode)}`;

    // Real Code-128 barcode (matches the ID Card Studio) — encodes the reg number.
    const barSrc = `https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(regNo)}&scale=3&height=10&includetext=false`;

    // Detail rows respecting the configured field toggles.
    const rows: [string, string][] = [];
    if (layout.fields.reg) rows.push(["Reg No", regNo]);
    if (layout.fields.class) rows.push(["Class", student.studentClass || "—"]);
    if (layout.fields.gender) rows.push(["Gender", student.gender || "—"]);
    if (layout.fields.doa) rows.push(["DOA", student.admissionDate || "—"]);

    // ── Classic Navy (the ID Card Studio design, rendered per-student) ────────
    if (activeStyle === "Classic Navy") {
        const NAVY = "#0f2548";
        const walletQr = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=0&data=${encodeURIComponent(`https://shulecloud.com/wallet/${encodeURIComponent(regNo)}`)}`;
        return (
            <div className="flex flex-col gap-4 group">
                {/* FRONT */}
                <div className="w-[520px] bg-white rounded-2xl shadow-2xl overflow-hidden relative">
                    {layout.showPhoto && (
                        <label className="absolute top-3 right-3 cursor-pointer z-20"><input type="file" className="hidden" onChange={onUpload} accept="image/*" /><div className="w-8 h-8 bg-white/90 rounded-lg border border-gray-100 shadow-sm flex items-center justify-center" style={{ color: NAVY }}><Camera className="w-4 h-4" /></div></label>
                    )}
                    {/* Header */}
                    <div className="flex items-center gap-3 px-5 py-3">
                        {schoolLogo
                            ? <img src={schoolLogo} alt="" className="w-9 h-9 rounded-full object-contain bg-white border border-slate-100" />
                            : <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-black text-base" style={{ background: NAVY }}>{(schoolName || student.studentClass || "S")[0]}</div>}
                        <div className="flex-1">
                            <div className="font-black text-[15px] leading-tight" style={{ color: NAVY }}>{schoolName}</div>
                            <div className="text-[9px] font-bold tracking-wider text-slate-500">{(student.studentClass || layout.cardTitle).toUpperCase()}</div>
                        </div>
                        <span className="text-[10px] font-black text-white px-2.5 py-1 rounded-full" style={{ background: NAVY }}>{student.admissionDate ? String(student.admissionDate).slice(0, 4) : new Date().getFullYear()}</span>
                    </div>
                    {/* Navy body */}
                    <div className="flex gap-4 px-5 py-4 text-white" style={{ background: NAVY }}>
                        {layout.showPhoto && (
                            <div className={`w-[100px] h-[124px] flex items-center justify-center text-[9px] font-black overflow-hidden ${layout.roundedPhoto ? "rounded-2xl" : "rounded-lg"}`} style={{ background: "#1c3a63", color: "#5b7aa8" }}>
                                {isUploading ? <Loader2 className="w-7 h-7 animate-spin text-white" /> : photo ? <img src={photo} alt="" className="w-full h-full object-cover" /> : "PHOTO"}
                            </div>
                        )}
                        <div className="flex-1">
                            <div className="text-[19px] font-black leading-tight">{student.studentName || "Student"}</div>
                            <div className="text-[12px] mb-3" style={{ color: "#9db6da" }}>{student.studentClass || ""}{student.gender ? ` · ${student.gender}` : ""}</div>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                                {rows.map(([l, v]) => (
                                    <div key={l}><div className="text-[8px] font-bold tracking-wide uppercase" style={{ color: "#6f8db8" }}>{l}</div><div className="text-[12px] font-black">{v}</div></div>
                                ))}
                            </div>
                        </div>
                    </div>
                    {/* Strip: barcode + chip */}
                    <div className="flex items-center gap-3 px-5 bg-white" style={{ height: 48 }}>
                        {layout.showBarcode ? <img src={barSrc} alt="barcode" className="h-7" /> : <div className="flex-1" />}
                        <span className="text-[10px] tracking-widest font-bold text-slate-500">{String(regNo).replace(/\W/g, "")}</span>
                        <div className="ml-auto w-8 h-6 rounded" style={{ background: "linear-gradient(135deg,#e8b94a,#c8902a)" }} />
                    </div>
                </div>

                {/* BACK */}
                {layout.showQr && (
                    <div className="w-[520px] h-[200px] rounded-2xl shadow-2xl flex flex-col items-center justify-center text-white" style={{ background: NAVY }}>
                        <div className="text-[12px] font-black tracking-wider mb-3" style={{ color: "#9db6da" }}>SCAN FOR STUDENT WALLET</div>
                        <img src={walletQr} alt="wallet QR" className="w-[100px] h-[100px] bg-white p-2 rounded-lg" />
                        <div className="mt-3 text-[12px] tracking-widest" style={{ color: "#cbd5e1" }}>{regNo}</div>
                    </div>
                )}
            </div>
        );
    }

    if (activeStyle === "Landscape") {
        return (
            <div className="w-[520px] h-[330px] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden relative flex group">
                {layout.showPhoto && (
                    <label className="absolute top-3 right-3 cursor-pointer z-20"><input type="file" className="hidden" onChange={onUpload} accept="image/*" /><div className="w-9 h-9 bg-white/80 rounded-xl border border-gray-100 shadow-sm flex items-center justify-center" style={{ color: accent }}><Camera className="w-4 h-4" /></div></label>
                )}
                {/* Left colored panel */}
                <div className="w-[185px] flex flex-col items-center justify-center p-5 relative" style={{ background: `linear-gradient(to bottom, ${accent}, #0A1B3F)` }}>
                    <div className="absolute -right-5 top-0 bottom-0 w-10 bg-white/10 -skew-x-12 pointer-events-none" />
                    {layout.showPhoto && (
                        <div className={`w-28 h-28 border-4 border-white/80 shadow-lg overflow-hidden flex items-center justify-center bg-white/10 ${layout.roundedPhoto ? "rounded-full" : "rounded-2xl"}`}>
                            {isUploading ? <Loader2 className="w-8 h-8 animate-spin text-white" /> : photo ? <img src={photo} alt="" className="w-full h-full object-cover" /> : <GraduationCap className="w-12 h-12 text-white/70" />}
                        </div>
                    )}
                    <p className="text-white font-black text-[11px] uppercase tracking-widest mt-3 text-center leading-tight">{student.studentClass || "Student"}</p>
                </div>
                {/* Right info */}
                <div className="flex-1 p-6 flex flex-col">
                    {layout.schoolName && <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{layout.schoolName}</div>}
                    <div className="flex items-center gap-2 mb-1"><GraduationCap className="w-4 h-4" style={{ color: accent }} /><span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: accent }}>{layout.cardTitle}</span></div>
                    <h3 className="font-black text-slate-900 text-xl leading-tight">{student.studentName || "Student"}</h3>
                    <div className="mt-4 space-y-2 text-xs flex-1">
                        {rows.map(([k, v]) => (
                            <div key={k} className="flex items-center"><span className="w-24 text-slate-400 font-bold uppercase text-[9px] tracking-wide">{k}</span><span className="font-bold text-slate-800">→ {v}</span></div>
                        ))}
                    </div>
                    <div className="flex items-end justify-between mt-2">
                        {layout.showBarcode ? (
                            <div className="flex flex-col"><Barcode className="h-9 w-36 text-slate-800" /><span className="text-[8px] font-black text-slate-400 tracking-[0.2em] mt-0.5">{regNo}</span></div>
                        ) : <div />}
                        {layout.showQr && (
                            <div className="bg-white border border-slate-100 p-1 rounded flex flex-col items-center"><img src={qrSrc} alt="wallet QR" className="w-12 h-12" /><span className="text-[6px] font-black text-slate-400 tracking-widest">{walletCode}</span></div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-[340px] h-[520px] bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden relative flex flex-col items-center group">
            {/* Background Pattern - Academic Icons */}
            <div className="absolute inset-0 opacity-[0.04] pointer-events-none select-none overflow-hidden">
                <svg width="100%" height="100%" className="text-gray-900">
                    <pattern id="academic-pattern" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
                        <path d="M20 20 L40 20 L30 10 Z" fill="currentColor" />
                        <rect x="60" y="60" width="15" height="15" fill="currentColor" />
                        <circle cx="20" cy="80" r="8" fill="currentColor" />
                        <path d="M70 20 Q 80 10, 90 20 T 110 20" stroke="currentColor" fill="none" strokeWidth="2" />
                    </pattern>
                    <rect width="100%" height="100%" fill="url(#academic-pattern)" />
                </svg>
            </div>

            <div className="flex flex-col items-center pt-8 relative z-10 w-full h-full">
                {layout.schoolName && <div className="absolute top-3 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] z-20">{layout.schoolName}</div>}
                {/* Image Upload Label */}
                {layout.showPhoto && (
                    <label className="absolute top-4 cursor-pointer hover:scale-110 transition-transform">
                        <input type="file" className="hidden" onChange={onUpload} accept="image/*" />
                        <div className="w-10 h-10 bg-white/80 backdrop-blur-sm rounded-xl border border-gray-100 shadow-sm flex items-center justify-center" style={{ color: accent }}>
                            <Camera className="w-5 h-5" />
                        </div>
                    </label>
                )}

                {/* Avatar with Ring */}
                {layout.showPhoto && (
                    <div className="relative mt-4 mb-6">
                        <div className={`w-36 h-36 bg-gray-50 flex items-center justify-center border-[8px] border-white shadow-xl overflow-hidden ring-1 ring-gray-100 ${layout.roundedPhoto ? "rounded-full" : "rounded-3xl"}`}>
                            {isUploading ? (
                                <Loader2 className="w-10 h-10 animate-spin" style={{ color: accent }} />
                            ) : photo ? (
                                <img src={photo} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-[#1e293b] flex flex-col items-center pt-8">
                                    <div className="w-12 h-12 bg-[#fcd34d] rounded-full"></div>
                                    <div className="w-24 h-16 mt-2 rounded-t-[3rem]" style={{ background: accent }}></div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Barcode Area */}
                {layout.showBarcode && (
                    <div className="w-56 h-14 bg-white/50 backdrop-blur-[2px] border border-gray-100 rounded-2xl flex flex-col items-center justify-center p-2 mb-4 group-hover:bg-white transition-colors">
                        <Barcode className="w-full h-8 text-gray-800" />
                        <span className="text-[10px] font-black text-gray-400 tracking-[0.3em] mt-1">{regNo}</span>
                    </div>
                )}

                <h3 className="font-black text-slate-900 text-lg uppercase tracking-wider mb-8 text-center px-4">
                    {(student.studentName || "Student").split(' ').map((n: string, i: number) => (
                        <span key={i} style={i === 1 ? { color: accent } : {}}>{n} </span>
                    ))}
                </h3>

                {/* Card Footer Details */}
                <div className="w-full px-10 mt-auto pb-10 flex justify-between items-end relative">
                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 pb-1 border-b-2 border-slate-900">
                            <GraduationCap className="w-5 h-5 text-slate-900" />
                            <span className="font-black text-slate-900 text-sm tracking-widest">{layout.cardTitle.toUpperCase()}</span>
                        </div>

                        <div className="space-y-1.5 font-bold">
                            {rows.map(([k, v]) => (
                                <div key={k} className="flex items-center gap-2 text-xs text-slate-500">
                                    <span className="w-10">{k === "Reg No" ? "ID" : k}</span>
                                    <span className="text-slate-400">→</span>
                                    <span className="text-slate-900">{v}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* QR Code (wallet — scannable at canteen) */}
                    {layout.showQr && (
                        <div className="w-20 h-20 bg-white rounded-2xl border-2 border-slate-900 p-1.5 shadow-lg transform rotate-3 hover:rotate-0 transition-transform">
                            <img src={qrSrc} alt="wallet QR" className="w-full h-full" />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
