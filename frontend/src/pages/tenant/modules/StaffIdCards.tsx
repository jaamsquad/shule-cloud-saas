import { Home, Search, Printer, Settings2, Camera, User, Loader2, QrCode, Barcode, Briefcase } from "lucide-react";
import { useState } from "react";
import { useItems } from "@/hooks/useItems";
import { toast } from "sonner";

export default function StaffIdCards() {
    const [activeStyle, setActiveStyle] = useState("Default");
    const { items: staffMembers, isLoading, updateItem } = useItems("staff");
    const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);

    const styles = ["Default", "Professional", "Minimal", "Corporate"];
    
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
                    <button className="h-9 px-4 flex items-center gap-2 border border-gray-200 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors text-sm font-bold text-gray-600">
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
                            onClick={() => setActiveStyle(s)}
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
                        onClick={() => window.print()}
                        className="h-10 px-6 rounded-xl font-bold text-sm bg-[#FF9A5A] text-white shadow-lg shadow-orange-100 flex items-center gap-2 ml-auto hover:scale-105 transition-all"
                    >
                        <Printer className="w-4 h-4" /> Print All Cards
                    </button>
                </div>

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <Loader2 className="w-12 h-12 animate-spin text-[#5C67F2]" />
                        <p className="text-slate-400 font-bold animate-pulse">Synchronizing staff nodes...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-12 animate-in fade-in slide-in-from-bottom-4 duration-500 print:block print:gap-0">
                        {staffMembers && staffMembers.length > 0 ? (
                            staffMembers.map((staff: any) => (
                                <div key={staff._id} className="print:mb-8 print:break-inside-avoid flex justify-center">
                                    <IdCard staff={staff} onUpload={handleImageUpload} isUploading={uploading} activeStyle={activeStyle} />
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
        </div>
    );
}

function IdCard({ staff, onUpload, isUploading, activeStyle }: { staff: any, onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void, isUploading: boolean, activeStyle: string }) {
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
                    <p className="text-[#5C67F2] font-bold text-sm tracking-widest uppercase mt-1">
                        {staff.designation || staff.role || "Employee"}
                    </p>

                    <div className="w-12 h-1 bg-[#5C67F2] mt-4 mb-6 rounded-full"></div>

                    <div className="w-full px-8 space-y-3">
                        <div className="flex justify-between items-center text-sm border-b border-gray-100 pb-2">
                            <span className="text-gray-400 font-medium">Department</span>
                            <span className="font-bold text-slate-800">{staff.department || "STAFF"}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm border-b border-gray-100 pb-2">
                            <span className="text-gray-400 font-medium">ID Number</span>
                            <span className="font-bold text-slate-800">{staffId}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-400 font-medium">Joined</span>
                            <span className="font-bold text-slate-800">{staff.joiningDate || new Date().toLocaleDateString()}</span>
                        </div>
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
