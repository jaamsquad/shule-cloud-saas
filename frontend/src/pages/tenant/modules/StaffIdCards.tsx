import { Home, Search, Printer, Settings2, Camera, User, Loader2, QrCode, Barcode, Briefcase, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useItems } from "@/hooks/useItems";
import { toast } from "sonner";
import { printSingleCard, countCards } from "./printCards";
import PrintCardsModal from "./PrintCardsModal";
import { useSchoolBrand } from "@/lib/printDoc";

type StaffLayout = { accent: string; showPhoto: boolean; roundedPhoto: boolean; showSchoolName: boolean; fields: { id: boolean; department: boolean; joined: boolean; phone: boolean } };
const DEFAULT_STAFF_LAYOUT: StaffLayout = { accent: "#5C67F2", showPhoto: true, roundedPhoto: false, showSchoolName: true, fields: { id: true, department: true, joined: true, phone: false } };
const loadStaffLayout = (): StaffLayout => { try { return { ...DEFAULT_STAFF_LAYOUT, ...JSON.parse(localStorage.getItem("staffCardLayout") || "{}") }; } catch { return DEFAULT_STAFF_LAYOUT; } };

export default function StaffIdCards() {
    const [activeStyle, setActiveStyle] = useState(() => localStorage.getItem("staffCardStyle") || "Landscape");
    const { items: staffMembers, isLoading, updateItem } = useItems("staff");
    const brand = useSchoolBrand();
    const [printModal, setPrintModal] = useState(false);
    const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [search, setSearch] = useState("");
    const [layout, setLayout] = useState<StaffLayout>(loadStaffLayout);
    const [showCustomize, setShowCustomize] = useState(false);
    useEffect(() => { localStorage.setItem("staffCardLayout", JSON.stringify(layout)); }, [layout]);
    const setLA = <K extends keyof StaffLayout>(k: K, v: StaffLayout[K]) => setLayout(p => ({ ...p, [k]: v }));
    const setSField = (k: keyof StaffLayout["fields"], v: boolean) => setLayout(p => ({ ...p, fields: { ...p.fields, [k]: v } }));
    const visibleStaff = (staffMembers || []).filter((s: any) => {
        if (!search.trim()) return true; const q = search.toLowerCase();
        return [s.employeeName, s.name, s.designation, s.role, s.department, s.staffId, s.employeeId].filter(Boolean).some((v: any) => String(v).toLowerCase().includes(q));
    });

    const styles = ["Landscape", "Professional", "Corporate", "Minimal", "Default"];
    const pickStyle = (s: string) => { setActiveStyle(s); localStorage.setItem("staffCardStyle", s); };

    const selectedStaff = staffMembers?.find((s: any) => s._id === selectedStaffId) || staffMembers?.[0];

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !selectedStaff) return;

        setUploading(true);
        // Simulate upload/Base64 for now
        const reader = new FileReader();
        reader.onloadend = async () => {
            try {
                await updateItem({ id: selectedStaff._id, avatar: reader.result });
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
                    <span className="font-bold text-gray-800 text-lg mr-2">Staff</span>
                    <span className="text-gray-300 mx-2">|</span>
                    <Home className="w-4 h-4 text-gray-500 mr-2" />
                    <span className="text-gray-500 font-medium">
                        - Staff ID Cards
                    </span>
                </div>
                
                <div className="flex items-center gap-2">
                    <button onClick={() => setShowCustomize(true)} className="h-9 px-4 flex items-center gap-2 border border-gray-200 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors text-sm font-bold text-gray-600">
                        <Settings2 className="w-4 h-4 text-gray-400" /> Customize Layout
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
                            className={`h-10 px-6 rounded-xl font-bold text-sm shadow-sm border whitespace-nowrap transition-all ${
                                activeStyle === s 
                                    ? "bg-[#5C67F2] text-white border-[#5C67F2]" 
                                    : "bg-white text-gray-600 border-gray-200 hover:border-[#5C67F2] hover:text-[#5C67F2]"
                            } flex items-center gap-2`}
                        >
                            {activeStyle !== s && <div className="w-1.5 h-4 bg-[#5C67F2] rounded-full opacity-60"></div>}
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

                {/* Search — filter by name, role, department or staff ID */}
                <div className="flex items-center gap-2 mb-6 print:hidden">
                    <div className="relative flex-1 max-w-md">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, role, department or staff ID…"
                            className="w-full h-10 pl-9 pr-9 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#5C67F2]" />
                        {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>}
                    </div>
                    {search && <span className="text-xs font-bold text-slate-400">{visibleStaff.length} match{visibleStaff.length === 1 ? "" : "es"}</span>}
                </div>

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <Loader2 className="w-12 h-12 animate-spin text-[#5C67F2]" />
                        <p className="text-slate-400 font-bold animate-pulse">Synchronizing staff nodes...</p>
                    </div>
                ) : (
                    <div id="id-card-print" className={`grid gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500 ${activeStyle === "Landscape" ? "grid-cols-1 xl:grid-cols-2" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"}`}>
                        {visibleStaff.length > 0 ? (
                            visibleStaff.map((staff: any) => (
                                <div key={staff._id} className="id-card flex justify-center relative group/card">
                                    <button data-no-print onClick={(e) => printSingleCard(e.currentTarget)} title="Print this card"
                                        className="absolute -top-3 -right-1 z-20 w-8 h-8 rounded-full bg-white border border-slate-200 shadow text-slate-500 hover:text-[#5C67F2] flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity print:hidden">
                                        <Printer className="w-4 h-4" />
                                    </button>
                                    <IdCard staff={staff} onUpload={handleImageUpload} isUploading={uploading} activeStyle={activeStyle} brand={brand} layout={layout} />
                                </div>
                            ))
                        ) : (
                            <div className="col-span-full bg-white p-12 rounded-[2rem] border border-dashed border-gray-300 flex flex-col items-center gap-4 text-center">
                                <User className="w-16 h-16 text-gray-200" />
                                <p className="text-gray-400 font-bold max-w-[200px]">No staff members found. Add staff first to generate ID cards.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
            <PrintCardsModal open={printModal} onClose={() => setPrintModal(false)} selector=".id-card" total={countCards(".id-card")} />
            {showCustomize && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setShowCustomize(false)} />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4"><h2 className="font-black text-slate-800">Customize Staff Cards</h2><button onClick={() => setShowCustomize(false)}><X className="w-5 h-5 text-slate-400" /></button></div>
                        <div className="space-y-4">
                            <div>
                                <span className="block text-xs font-black text-slate-500 uppercase mb-2">Accent colour</span>
                                <div className="flex items-center gap-2">
                                    {["#5C67F2", "#0f2548", "#0E7490", "#B45309", "#15803d", "#9333ea"].map(c => (
                                        <button key={c} onClick={() => setLA("accent", c)} className={`w-8 h-8 rounded-full border-2 ${layout.accent === c ? "scale-110 border-slate-900" : "border-white"}`} style={{ background: c }} />
                                    ))}
                                    <input type="color" value={layout.accent} onChange={e => setLA("accent", e.target.value)} className="w-9 h-9 cursor-pointer" />
                                </div>
                            </div>
                            <SToggle label="Show photo" on={layout.showPhoto} onChange={v => setLA("showPhoto", v)} />
                            <SToggle label="Rounded photo" on={layout.roundedPhoto} onChange={v => setLA("roundedPhoto", v)} />
                            <SToggle label="Show school name" on={layout.showSchoolName} onChange={v => setLA("showSchoolName", v)} />
                            <div className="border-t border-slate-100 pt-3">
                                <span className="block text-xs font-black text-slate-500 uppercase mb-2">Fields</span>
                                <SToggle label="Staff ID" on={layout.fields.id} onChange={v => setSField("id", v)} />
                                <SToggle label="Department" on={layout.fields.department} onChange={v => setSField("department", v)} />
                                <SToggle label="Joined date" on={layout.fields.joined} onChange={v => setSField("joined", v)} />
                                <SToggle label="Phone" on={layout.fields.phone} onChange={v => setSField("phone", v)} />
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button onClick={() => setLayout({ ...DEFAULT_STAFF_LAYOUT })} className="flex-1 h-10 border border-slate-200 rounded-xl text-sm font-bold text-slate-600">Reset</button>
                                <button onClick={() => { setShowCustomize(false); toast.success("Layout applied"); }} className="flex-1 h-10 rounded-xl text-white font-bold text-sm" style={{ background: layout.accent }}>Done</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function IdCard({ staff, onUpload, isUploading, activeStyle, brand, layout }: { staff: any, onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void, isUploading: boolean, activeStyle: string, brand?: { name: string; logo: string }, layout?: StaffLayout }) {
    const L = layout || DEFAULT_STAFF_LAYOUT;
    const accent = L.accent;
    const schoolName = L.showSchoolName ? (brand?.name || "") : "";
    const schoolLogo = brand?.logo || "";
    const staffNameParts = staff.fullName ? staff.fullName.split(' ') : ['Staff', 'Member'];
    const staffId = staff.employeeId || staff.nationalId || `STF-${staff._id?.substring(0, 5)}`;
    
    // Shared components to avoid repetition
    const UploadButton = () => (
        <label className="absolute top-4 cursor-pointer hover:scale-110 transition-transform z-20">
            <input type="file" className="hidden" onChange={onUpload} accept="image/*" />
            <div className="w-10 h-10 bg-white/80 backdrop-blur-sm rounded-xl border border-gray-100 shadow-sm flex items-center justify-center text-[#5C67F2]">
                <Camera className="w-5 h-5" />
            </div>
        </label>
    );

    const photo = staff.avatar || staff.photo || staff.staffPhoto || staff.image || staff.profilePhoto || staff.passportPhoto;
    const Avatar = ({ className = "w-36 h-36 bg-gray-50 rounded-full flex items-center justify-center border-[8px] border-white shadow-xl overflow-hidden ring-1 ring-gray-100" }) => (
        <div className={className}>
            {isUploading ? (
                <Loader2 className="w-10 h-10 animate-spin text-[#5C67F2]" />
            ) : photo ? (
                <img src={photo} alt="" className="w-full h-full object-cover" />
            ) : (
                <div className="w-full h-full bg-[#1e293b] flex flex-col items-center pt-8">
                    <div className="w-12 h-12 bg-[#fcd34d] rounded-full"></div>
                    <div className="w-24 h-16 bg-[#5C67F2] mt-2 rounded-t-[3rem]"></div>
                </div>
            )}
        </div>
    );

    if (activeStyle === "Professional") {
        return (
            <div className="w-[340px] h-[520px] bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden relative flex flex-col group">
                <UploadButton />
                {/* Header Background */}
                <div className="h-40 bg-[#1e293b] w-full rounded-b-[3rem] absolute top-0 left-0"></div>
                
                <div className="flex flex-col items-center pt-20 relative z-10 w-full h-full">
                    <Avatar className="w-32 h-32 bg-gray-50 rounded-full flex items-center justify-center border-[6px] border-white shadow-lg overflow-hidden" />
                    
                    <h3 className="font-black text-slate-900 text-xl tracking-wide mt-6 text-center px-4">
                        {staff.fullName || "Staff Member"}
                    </h3>
                    <p className="font-bold text-sm tracking-widest uppercase mt-1" style={{ color: accent }}>
                        {staff.designation || staff.role || "Employee"}
                    </p>

                    <div className="w-12 h-1 mt-4 mb-6 rounded-full" style={{ background: accent }}></div>

                    <div className="w-full px-8 space-y-3">
                        {L.fields.department && (
                            <div className="flex justify-between items-center text-sm border-b border-gray-100 pb-2">
                                <span className="text-gray-400 font-medium">Department</span>
                                <span className="font-bold text-slate-800">{staff.department || "STAFF"}</span>
                            </div>
                        )}
                        {L.fields.id && (
                            <div className="flex justify-between items-center text-sm border-b border-gray-100 pb-2">
                                <span className="text-gray-400 font-medium">ID Number</span>
                                <span className="font-bold text-slate-800">{staffId}</span>
                            </div>
                        )}
                        {L.fields.joined && (
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-400 font-medium">Joined</span>
                                <span className="font-bold text-slate-800">{staff.joiningDate || new Date().toLocaleDateString()}</span>
                            </div>
                        )}
                        {L.fields.phone && staff.phone && (
                            <div className="flex justify-between items-center text-sm border-t border-gray-100 pt-2">
                                <span className="text-gray-400 font-medium">Phone</span>
                                <span className="font-bold text-slate-800">{staff.phone}</span>
                            </div>
                        )}
                    </div>

                    <div className="mt-auto pb-8 flex items-center justify-center w-full gap-4 px-8">
                        <Barcode className="h-10 flex-1 text-slate-800" />
                    </div>
                </div>
            </div>
        );
    }

    if (activeStyle === "Minimal") {
        return (
            <div className="w-[340px] h-[520px] bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden relative flex flex-col group p-8">
                <UploadButton />
                
                <div className="flex justify-between items-start mb-8">
                    <Avatar className="w-24 h-24 bg-gray-50 rounded-2xl flex items-center justify-center border-2 border-gray-100 shadow-sm overflow-hidden" />
                    <QrCode className="w-16 h-16 text-slate-900" />
                </div>

                <div className="mt-4">
                    <h3 className="font-bold text-slate-900 text-2xl tracking-tight leading-tight">
                        {staff.fullName || "Staff Member"}
                    </h3>
                    <p className="text-slate-500 font-medium text-sm mt-1 flex items-center gap-2">
                        <Briefcase className="w-4 h-4" /> {staff.designation || staff.role || "Employee"}
                    </p>
                </div>

                <div className="mt-10 space-y-4">
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Employee ID</p>
                        <p className="font-semibold text-slate-900 text-lg mt-0.5">{staffId}</p>
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Department</p>
                        <p className="font-semibold text-slate-900 text-lg mt-0.5">{staff.department || "General Staff"}</p>
                    </div>
                </div>

                <div className="mt-auto pt-8 border-t border-gray-100">
                    <p className="text-[10px] text-gray-400 font-medium leading-relaxed">
                        This card is property of the institution. If found, please return to the administration office.
                    </p>
                </div>
            </div>
        );
    }

    if (activeStyle === "Corporate") {
        return (
            <div className="w-[340px] h-[520px] bg-[#0f172a] rounded-[2rem] shadow-2xl border border-slate-700 overflow-hidden relative flex flex-col items-center group">
                <UploadButton />
                
                {/* Gold Accent */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500 rounded-bl-full opacity-20 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-40 h-40 bg-[#5C67F2] rounded-tr-full opacity-20 pointer-events-none"></div>

                <div className="flex flex-col items-center pt-10 relative z-10 w-full h-full">
                    <Avatar className="w-32 h-32 bg-slate-800 rounded-full flex items-center justify-center border-4 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.3)] overflow-hidden" />
                    
                    <h3 className="font-bold text-white text-xl tracking-wider mt-6 text-center px-4 uppercase">
                        {staff.fullName || "Staff Member"}
                    </h3>
                    
                    <div className="bg-amber-500/10 border border-amber-500/30 text-amber-500 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest mt-3">
                        {staff.designation || staff.role || "Employee"}
                    </div>

                    <div className="w-full px-10 mt-10 space-y-4">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-400 font-medium uppercase text-[10px] tracking-widest">ID N°</span>
                            <span className="font-mono text-white tracking-widest">{staffId}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-400 font-medium uppercase text-[10px] tracking-widest">Dept</span>
                            <span className="font-bold text-slate-200">{staff.department || "STAFF"}</span>
                        </div>
                    </div>

                    <div className="mt-auto pb-8 flex items-center justify-center w-full px-10">
                        <div className="bg-white p-2 rounded-xl">
                            <QrCode className="w-16 h-16 text-slate-900" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (activeStyle === "Landscape") {
        const name = staff.fullName || staff.employeeName || staff.name || "Staff Member";
        return (
            <div className="w-[520px] h-[330px] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden relative flex group">
                <UploadButton />
                {/* Left colored panel */}
                <div className="w-[185px] bg-gradient-to-b from-[#5C67F2] to-[#0A1B3F] flex flex-col items-center justify-center p-5 relative">
                    <div className="absolute -right-5 top-0 bottom-0 w-10 bg-white/10 -skew-x-12 pointer-events-none" />
                    <Avatar className="w-28 h-28 rounded-2xl border-4 border-white/80 shadow-lg overflow-hidden flex items-center justify-center bg-white/10" />
                    <p className="text-white font-black text-[11px] uppercase tracking-widest mt-3 text-center leading-tight">{staff.designation || staff.role || "Staff"}</p>
                </div>
                {/* Right info */}
                <div className="flex-1 p-6 flex flex-col">
                    <div className="flex items-center gap-2 mb-1">
                        {schoolLogo ? <img src={schoolLogo} alt="" className="w-5 h-5 rounded object-contain" /> : <Briefcase className="w-4 h-4 text-[#5C67F2]" />}
                        <span className="text-[10px] font-black text-[#5C67F2] uppercase tracking-[0.2em] truncate">{schoolName || "Staff Identity Card"}</span>
                    </div>
                    <h3 className="font-black text-slate-900 text-xl leading-tight">{name}</h3>
                    <div className="mt-4 space-y-2 text-xs flex-1">
                        {[["ID No", staffId], ["Department", staff.department || "Staff"], ["Joined", staff.joiningDate || new Date().toLocaleDateString()]].map(([k, v]) => (
                            <div key={k} className="flex items-center"><span className="w-24 text-slate-400 font-bold uppercase text-[9px] tracking-wide">{k}</span><span className="font-bold text-slate-800">→ {v}</span></div>
                        ))}
                    </div>
                    <div className="flex items-end justify-between mt-2">
                        <div className="flex flex-col"><Barcode className="h-9 w-36 text-slate-800" /><span className="text-[8px] font-black text-slate-400 tracking-[0.2em] mt-0.5">{staffId}</span></div>
                        <div className="bg-white border border-slate-100 p-1 rounded"><QrCode className="w-12 h-12 text-slate-900" /></div>
                    </div>
                </div>
            </div>
        );
    }

    // Default Style
    return (
        <div className="w-[340px] h-[520px] bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden relative flex flex-col items-center group">
            {/* Background Pattern - Corporate Icons */}
            <div className="absolute inset-0 opacity-[0.04] pointer-events-none select-none overflow-hidden">
                <svg width="100%" height="100%" className="text-gray-900">
                    <pattern id="corporate-pattern" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
                        <path d="M20 20 L40 20 L30 10 Z" fill="currentColor" />
                        <rect x="60" y="60" width="15" height="15" fill="currentColor" />
                        <circle cx="20" cy="80" r="8" fill="currentColor" />
                        <path d="M70 20 Q 80 10, 90 20 T 110 20" stroke="currentColor" fill="none" strokeWidth="2" />
                    </pattern>
                    <rect width="100%" height="100%" fill="url(#corporate-pattern)" />
                </svg>
            </div>
            
            <div className="flex flex-col items-center pt-8 relative z-10 w-full h-full">
                <UploadButton />

                {/* Avatar with Ring */}
                <div className="relative mt-4 mb-6">
                    <Avatar />
                </div>

                {/* Barcode Area */}
                <div className="w-56 h-14 bg-white/50 backdrop-blur-[2px] border border-gray-100 rounded-2xl flex flex-col items-center justify-center p-2 mb-4 group-hover:bg-white transition-colors">
                    <Barcode className="w-full h-8 text-gray-800" />
                    <span className="text-[10px] font-black text-gray-400 tracking-[0.3em] mt-1">{staffId}</span>
                </div>

                <h3 className="font-black text-slate-900 text-lg uppercase tracking-wider mb-8 text-center px-4">
                    {staffNameParts.map((n: string, i: number) => (
                        <span key={i} className={i === 1 ? 'text-[#5C67F2]' : ''}>{n} </span>
                    ))}
                </h3>

                {/* Card Footer Details */}
                <div className="w-full px-10 mt-auto pb-10 flex justify-between items-end relative">
                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 pb-1 border-b-2 border-slate-900">
                            <Briefcase className="w-5 h-5 text-slate-900" />
                            <span className="font-black text-slate-900 text-sm tracking-widest">{staff.department || "STAFF"}</span>
                        </div>
                        
                        <div className="space-y-1.5 font-bold">
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                <span className="w-10">Role</span> 
                                <span className="text-slate-400">→</span> 
                                <span className="text-slate-900 truncate max-w-[80px]">{staff.designation || staff.role || "Employee"}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                <span className="w-10">ID</span> 
                                <span className="text-slate-400">→</span> 
                                <span className="text-slate-900 truncate max-w-[80px]">{staffId}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                <span className="w-10">Joined</span> 
                                <span className="text-slate-400">→</span> 
                                <span className="text-slate-900">{staff.joiningDate || new Date(staff.createdAt || Date.now()).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>

                    {/* QR Code */}
                    <div className="w-20 h-20 bg-white rounded-2xl border-2 border-slate-900 p-2 shadow-lg transform rotate-3 hover:rotate-0 transition-transform flex-shrink-0">
                        <QrCode className="w-full h-full text-slate-900" />
                    </div>
                </div>
            </div>
        </div>
    );
}

function SToggle({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
    return (
        <button type="button" onClick={() => onChange(!on)} className="w-full flex items-center justify-between py-2">
            <span className="text-sm font-bold text-slate-600">{label}</span>
            <span className={`w-11 h-6 rounded-full p-0.5 transition-colors ${on ? "bg-[#5C67F2]" : "bg-slate-200"}`}>
                <span className={`block w-5 h-5 rounded-full bg-white transition-transform ${on ? "translate-x-5" : ""}`} />
            </span>
        </button>
    );
}
