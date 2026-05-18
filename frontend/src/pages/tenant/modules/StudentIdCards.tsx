import { Home, Search, Printer, Settings2, Camera, User, Loader2, QrCode, Barcode, GraduationCap } from "lucide-react";
import { useState } from "react";
import { useItems } from "@/hooks/useItems";
import { toast } from "sonner";

export default function StudentIdCards() {
    const [activeStyle, setActiveStyle] = useState("Default");
    const { items: students, isLoading, updateItem } = useItems("students");
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);

    const styles = ["Default", "Style 1", "Style 2", "Style 3", "Style 4"];
    
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
                        <p className="text-slate-400 font-bold animate-pulse">Synchronizing student nodes...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-12 animate-in fade-in slide-in-from-bottom-4 duration-500 print:block print:gap-0">
                        {students && students.length > 0 ? (
                            students.map((student: any) => (
                                <div key={student._id} className="print:mb-8 print:break-inside-avoid flex justify-center">
                                    <IdCard student={student} onUpload={handleImageUpload} isUploading={uploading} />
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
        </div>
    );
}

function IdCard({ student, onUpload, isUploading }: { student: any, onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void, isUploading: boolean }) {
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
                {/* Image Upload Label */}
                <label className="absolute top-4 cursor-pointer hover:scale-110 transition-transform">
                    <input type="file" className="hidden" onChange={onUpload} accept="image/*" />
                    <div className="w-10 h-10 bg-white/80 backdrop-blur-sm rounded-xl border border-gray-100 shadow-sm flex items-center justify-center text-[#5C67F2]">
                        <Camera className="w-5 h-5" />
                    </div>
                </label>

                {/* Avatar with Ring */}
                <div className="relative mt-4 mb-6">
                    <div className="w-36 h-36 bg-gray-50 rounded-full flex items-center justify-center border-[8px] border-white shadow-xl overflow-hidden ring-1 ring-gray-100">
                        {isUploading ? (
                            <Loader2 className="w-10 h-10 animate-spin text-[#5C67F2]" />
                        ) : student.avatar ? (
                            <img src={student.avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-[#1e293b] flex flex-col items-center pt-8">
                                <div className="w-12 h-12 bg-[#fcd34d] rounded-full"></div>
                                <div className="w-24 h-16 bg-[#5C67F2] mt-2 rounded-t-[3rem]"></div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Barcode Area */}
                <div className="w-56 h-14 bg-white/50 backdrop-blur-[2px] border border-gray-100 rounded-2xl flex flex-col items-center justify-center p-2 mb-4 group-hover:bg-white transition-colors">
                    <Barcode className="w-full h-8 text-gray-800" />
                    <span className="text-[10px] font-black text-gray-400 tracking-[0.3em] mt-1">{student.registrationNo}</span>
                </div>

                <h3 className="font-black text-slate-900 text-lg uppercase tracking-wider mb-8 text-center px-4">
                    {student.studentName.split(' ').map((n: string, i: number) => (
                        <span key={i} className={i === 1 ? 'text-[#5C67F2]' : ''}>{n} </span>
                    ))}
                </h3>

                {/* Card Footer Details */}
                <div className="w-full px-10 mt-auto pb-10 flex justify-between items-end relative">
                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 pb-1 border-b-2 border-slate-900">
                            <GraduationCap className="w-5 h-5 text-slate-900" />
                            <span className="font-black text-slate-900 text-sm tracking-widest">STUDENT</span>
                        </div>
                        
                        <div className="space-y-1.5 font-bold">
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                <span className="w-10">ID</span> 
                                <span className="text-slate-400">→</span> 
                                <span className="text-slate-900">{student.registrationNo}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                <span className="w-10">Class</span> 
                                <span className="text-slate-400">→</span> 
                                <span className="text-slate-900">{student.studentClass}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                <span className="w-10">DOA</span> 
                                <span className="text-slate-400">→</span> 
                                <span className="text-slate-900">{student.admissionDate}</span>
                            </div>
                        </div>
                    </div>

                    {/* QR Code */}
                    <div className="w-20 h-20 bg-white rounded-2xl border-2 border-slate-900 p-2 shadow-lg transform rotate-3 hover:rotate-0 transition-transform">
                        <QrCode className="w-full h-full text-slate-900" />
                    </div>
                </div>
            </div>
        </div>
    );
}
