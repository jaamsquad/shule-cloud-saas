import { useState, useRef } from "react";
import { 
    Home, Search, User, Mail, Briefcase, 
    Printer, Download, FileText, Loader2, 
    ArrowLeft, CheckCircle2, Sparkles, Building2
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { openPrintDoc } from "@/lib/pdfDoc";

export default function JobLetter() {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
    const [startDate, setStartDate] = useState("1st of Next Month");
    const [assignedTask, setAssignedTask] = useState("");
    const [assignedField, setAssignedField] = useState("");
    const [employmentType, setEmploymentType] = useState("Permanent");
    const [isConfiguring, setIsConfiguring] = useState(false);

    const handleSelect = (employee: any) => {
        setSelectedEmployee(employee);
        setAssignedField(employee.department || "");
        setAssignedTask(employee.designation || "");
        setIsConfiguring(true);
    };

    const { data: staff = [], isLoading } = useQuery({
        queryKey: ["staff"],
        queryFn: async () => {
            const r = await api.get("/staff");
            return r.data;
        },
    });

    // Real school branding (same source the header uses)
    const { data: schoolRaw } = useQuery({
        queryKey: ["theme_settings"],
        queryFn: async () => (await api.get("/theme_settings")).data,
    });
    const school = Array.isArray(schoolRaw) ? schoolRaw[0] : (schoolRaw || {});
    const schoolName = school?.name || school?.instituteName || school?.schoolName || "Your School";
    const schoolAddr = school?.address || school?.location || "";
    const schoolCity = school?.city || school?.county || "";
    const schoolEmail = school?.email || school?.contactEmail || "";
    const schoolPhone = school?.phone || school?.contactPhone || school?.mobile || "";
    const schoolLogo = school?.logo || school?.schoolLogo || school?.image || "";

    const filteredStaff = staff.filter((s: any) => {
        const name = (s.firstName ? `${s.firstName} ${s.lastName}` : (s.employeeName || s.name || '')).toLowerCase();
        return name.includes(searchTerm.toLowerCase()) || s.employeeId?.toLowerCase().includes(searchTerm.toLowerCase());
    });

    const printRef = useRef<HTMLDivElement>(null);

    const printInNewWindow = () => {
        const content = printRef.current;
        if (!content) return;
        const win = openPrintDoc();
        if (!win) return;
        const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
            .map(el => el.outerHTML).join('\n');
        win.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8" />
                <title>Job Offer Letter</title>
                ${styles}
                <style>
                    @page { size: A4 portrait; margin: 15mm 20mm; }
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; padding: 24px; background: white; }
                    * { box-sizing: border-box; }
                </style>
            </head>
            <body>${content.innerHTML}</body>
            </html>
        `);
        win.document.close();
        win.focus();
        setTimeout(() => { win.print(); }, 800);
    };

    const today = new Date().toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    return (
        <div className="flex-1 bg-[#f4f7f6] min-h-screen flex flex-col print:bg-white">
            {/* Breadcrumb Header - Hide on Print */}
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center shadow-sm z-10 m-4 rounded-xl print:hidden">
                <span className="font-bold text-gray-800 text-lg mr-2">Employees</span>
                <span className="text-gray-300 mx-2">|</span>
                <Home className="w-4 h-4 text-gray-500 mr-2" />
                <span className="text-gray-500 font-medium">- Job Offer Letter</span>
            </div>

            <div className="p-6 flex-1 flex flex-col items-center">
                
                {/* Search Area - Hide on Print */}
                {!selectedEmployee && (
                    <div className="w-full max-w-xl mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500 print:hidden">
                        <div className="text-center mb-8">
                            <div className="w-12 h-12 bg-[#5C67F2] rounded-2xl flex items-center justify-center text-white mx-auto mb-4 shadow-lg shadow-indigo-100">
                                <FileText className="w-6 h-6" />
                            </div>
                            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Generate Job Letter</h2>
                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Search and select an employee node</p>
                        </div>

                        <div className="relative group mb-6">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-[#5C67F2] transition-colors" />
                            <input 
                                type="text" 
                                placeholder="Search by name or Employee ID..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full h-12 pl-12 pr-6 bg-white border-2 border-slate-50 rounded-2xl focus:outline-none focus:border-[#5C67F2] shadow-md shadow-indigo-100/10 text-slate-700 font-bold text-sm transition-all"
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                            {isLoading ? (
                                <div className="py-10 flex justify-center">
                                    <Loader2 className="w-8 h-8 animate-spin text-[#5C67F2]" />
                                </div>
                            ) : (
                                filteredStaff.slice(0, 5).map((employee: any) => (
                                    <button 
                                        key={employee._id}
                                        onClick={() => handleSelect(employee)}
                                        className="p-3 bg-white rounded-xl border border-gray-100 flex items-center gap-4 hover:border-[#5C67F2] hover:shadow-md transition-all text-left group"
                                    >
                                        <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 group-hover:bg-[#5C67F2] group-hover:text-white transition-all">
                                            <User className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1 overflow-hidden">
                                            <p className="font-bold text-slate-700 text-sm truncate">
                                                {employee.firstName ? `${employee.firstName} ${employee.lastName}` : (employee.employeeName || employee.name)}
                                            </p>
                                            <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest truncate">
                                                {employee.designation || 'Staff'} • {employee.employeeId || 'No ID'}
                                            </p>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* Configuration Step */}
                {selectedEmployee && isConfiguring && (
                    <div className="w-full max-w-xl mt-8 animate-in zoom-in-95 fade-in duration-500 print:hidden">
                        <button 
                            onClick={() => setSelectedEmployee(null)}
                            className="mb-6 px-5 py-1.5 bg-white border border-gray-100 text-slate-400 rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm"
                        >
                            <ArrowLeft className="w-3 h-3" /> Back to Search
                        </button>

                        <div className="bg-white rounded-[2.5rem] shadow-xl shadow-indigo-100/30 border border-gray-100 p-8 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-[#5C67F2]/5 rounded-bl-[8rem] -mr-8 -mt-8"></div>
                            
                            <div className="text-center mb-8 relative z-10">
                                <div className="w-12 h-12 bg-[#5C67F2] rounded-xl flex items-center justify-center text-white mx-auto mb-4 shadow-lg shadow-indigo-100">
                                    <Sparkles className="w-6 h-6" />
                                </div>
                                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Configure Offer</h2>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Refine employment parameters</p>
                            </div>

                            <div className="space-y-6 relative z-10">
                                <div className="relative group">
                                    <div className="absolute -top-3 left-6 bg-[#5C67F2] text-white text-[8px] px-3 py-1 rounded-full font-black tracking-widest z-10 shadow-md uppercase">
                                        Starting Date*
                                    </div>
                                    <input 
                                        type="text" 
                                        placeholder="e.g. 1st September 2024"
                                        value={startDate}
                                        onChange={e => setStartDate(e.target.value)}
                                        className="w-full h-12 px-6 border-2 border-slate-50 rounded-2xl focus:outline-none focus:border-[#5C67F2] text-slate-700 bg-slate-50/50 font-bold text-sm transition-all focus:bg-white"
                                    />
                                </div>

                                <div className="relative group">
                                    <div className="absolute -top-3 left-6 bg-[#868DF4] text-white text-[8px] px-3 py-1 rounded-full font-black tracking-widest z-10 shadow-md uppercase">
                                        Assigned Task / Role*
                                    </div>
                                    <input 
                                        type="text" 
                                        placeholder="e.g. Senior Mathematics Instructor"
                                        value={assignedTask}
                                        onChange={e => setAssignedTask(e.target.value)}
                                        className="w-full h-12 px-6 border-2 border-slate-50 rounded-2xl focus:outline-none focus:border-[#5C67F2] text-slate-700 bg-slate-50/50 font-bold text-sm transition-all focus:bg-white"
                                    />
                                </div>

                                <div className="relative group">
                                    <div className="absolute -top-3 left-6 bg-[#5C67F2] text-white text-[8px] px-3 py-1 rounded-full font-black tracking-widest z-10 shadow-md uppercase">
                                        Assigned Field / Department*
                                    </div>
                                    <input 
                                        type="text" 
                                        placeholder="e.g. Academic Department"
                                        value={assignedField}
                                        onChange={e => setAssignedField(e.target.value)}
                                        className="w-full h-12 px-6 border-2 border-slate-50 rounded-2xl focus:outline-none focus:border-[#5C67F2] text-slate-700 bg-slate-50/50 font-bold text-sm transition-all focus:bg-white"
                                    />
                                </div>

                                <div className="relative group">
                                    <div className="absolute -top-3 left-6 bg-[#868DF4] text-white text-[8px] px-3 py-1 rounded-full font-black tracking-widest z-10 shadow-md uppercase">
                                        Employment Type*
                                    </div>
                                    <select 
                                        value={employmentType}
                                        onChange={e => setEmploymentType(e.target.value)}
                                        className="w-full h-12 px-6 border-2 border-slate-50 rounded-2xl focus:outline-none focus:border-[#5C67F2] text-slate-700 bg-slate-50/50 font-bold text-sm transition-all focus:bg-white cursor-pointer"
                                    >
                                        <option value="Permanent">Permanent</option>
                                        <option value="Contract">Contract</option>
                                        <option value="Internship">Internship</option>
                                    </select>
                                </div>

                                <button 
                                    onClick={() => setIsConfiguring(false)}
                                    className="w-full h-12 bg-[#5C67F2] hover:bg-[#4a54c4] text-white font-black rounded-full shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 transition-all tracking-widest text-xs uppercase hover:scale-[1.02] active:scale-95 mt-4"
                                >
                                    Generate Final Node <CheckCircle2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Letter Preview */}
                {selectedEmployee && !isConfiguring && (
                    <div className="w-full max-w-3xl flex flex-col items-center">
                        {/* Controls - Hide on Print */}
                        <div className="w-full flex justify-between items-center mb-6 print:hidden">
                            <button 
                                onClick={() => setIsConfiguring(true)}
                                className="px-5 py-1.5 bg-white border border-gray-100 text-slate-400 rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm"
                            >
                                <ArrowLeft className="w-3.5 h-3.5" /> Adjust Details
                            </button>
                            <div className="flex gap-2">
                                <button className="px-5 py-1.5 bg-white border border-gray-100 text-slate-400 rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2">
                                    <Download className="w-3.5 h-3.5" /> PDF
                                </button>
                                <button 
                                    onClick={printInNewWindow}
                                    className="px-5 py-1.5 bg-[#5C67F2] text-white rounded-full text-[9px] font-black uppercase tracking-widest shadow-md shadow-indigo-100 hover:bg-[#4a54c4] transition-all flex items-center gap-2"
                                >
                                    <Printer className="w-3.5 h-3.5" /> Print Letter
                                </button>
                            </div>
                        </div>

                        {/* Formal Letter Template */}
                        <div ref={printRef} className="w-full bg-white shadow-xl rounded-[2.5rem] p-12 relative overflow-hidden border border-gray-100">
                            {/* Watermark Decor - Hide on Print */}
                            <div className="absolute top-0 right-0 w-48 h-48 bg-[#5C67F2]/5 rounded-bl-[10rem] -mr-12 -mt-12 print:hidden"></div>
                            
                            {/* Header */}
                            <div className="flex justify-between items-start mb-10 relative z-10">
                                <div>
                                    <div className="flex items-center gap-2.5 mb-3">
                                        <div className="w-12 h-12 bg-[#5C67F2] rounded-xl flex items-center justify-center text-white shadow-md overflow-hidden">
                                            {schoolLogo ? <img src={schoolLogo} alt="" className="w-full h-full object-cover" /> : <Building2 className="w-6 h-6" />}
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-black text-slate-800 tracking-tight">{schoolName}</h2>
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{school?.tagline || school?.motto || "Office of Human Resources"}</p>
                                        </div>
                                    </div>
                                    <div className="text-slate-500 text-[10px] font-medium space-y-0.5">
                                        {schoolAddr && <p>{schoolAddr}</p>}
                                        {schoolCity && <p>{schoolCity}</p>}
                                        {(schoolEmail || schoolPhone) && <p>{[schoolEmail, schoolPhone].filter(Boolean).join(" | ")}</p>}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest mb-1">Ref Number</p>
                                    <p className="text-slate-800 font-bold text-xs">SC/HR/OFFER/{new Date().getFullYear()}/{selectedEmployee._id.slice(-4).toUpperCase()}</p>
                                    <p className="text-slate-800 font-bold text-xs mt-3">{today}</p>
                                </div>
                            </div>

                            {/* Recipient */}
                            <div className="mb-10 relative z-10">
                                <p className="text-slate-800 font-bold text-sm mb-0.5">{selectedEmployee.firstName ? `${selectedEmployee.firstName} ${selectedEmployee.lastName}` : (selectedEmployee.employeeName || selectedEmployee.name)}</p>
                                <p className="text-slate-500 text-[11px]">{selectedEmployee.address || "P.O. BOX ---, Nairobi"}</p>
                                <p className="text-slate-500 text-[11px]">{selectedEmployee.phone || "+254 --- --- ---"}</p>
                            </div>

                            {/* Content */}
                            <div className="relative z-10">
                                <h3 className="text-sm font-black text-slate-800 mb-8 border-b-2 border-slate-100 pb-4 tracking-tight uppercase">
                                    RE: LETTER OF APPOINTMENT - {assignedTask.toUpperCase() || "STAFF MEMBER"}
                                </h3>

                                <div className="text-slate-700 space-y-6 leading-relaxed text-[13px] font-medium text-justify">
                                    <p>Dear {selectedEmployee.lastName || selectedEmployee.firstName || "Personnel"},</p>
                                    
                                    <p>
                                        Following your recent interview and subsequent discussions, we are pleased to offer you an appointment as a 
                                        <span className="font-bold text-slate-900 mx-1">{assignedTask || 'Staff Member'}</span> 
                                        at <span className="font-bold">ShuleCloud Academy</span>. We are confident that your expertise and background will be a valuable asset to our academic community.
                                    </p>

                                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-3">
                                        <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                                            <span className="font-black text-slate-400 uppercase text-[9px] tracking-widest">Effective Start Date</span>
                                            <span className="font-bold text-slate-800 text-xs">{startDate}</span>
                                        </div>
                                        <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                                            <span className="font-black text-slate-400 uppercase text-[9px] tracking-widest">Department Assignment</span>
                                            <span className="font-bold text-slate-800 text-xs">{assignedField || 'General Administration'}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="font-black text-slate-400 uppercase text-[9px] tracking-widest">Employment Status</span>
                                            <span className="font-bold text-slate-800 text-xs">{employmentType} / Full-Time</span>
                                        </div>
                                    </div>

                                    <p>
                                        Your primary responsibilities will include contributing to the {assignedField || 'assigned'} department goals and adhering to the ShuleCloud Code of Conduct. 
                                        Detailed terms and conditions regarding your remuneration, benefits, and job description are enclosed in the comprehensive employment contract.
                                    </p>

                                    <p>
                                        We look forward to welcoming you to the team. Please signify your acceptance of this offer by signing and returning a copy of this letter by end of business this Friday.
                                    </p>
                                </div>

                                {/* Signatures */}
                                <div className="mt-20 flex justify-between items-end">
                                    <div className="text-center">
                                        <div className="w-48 border-b-2 border-slate-200 mb-2"></div>
                                        <p className="text-slate-800 font-bold text-xs uppercase tracking-widest">HR Director</p>
                                        <p className="text-slate-400 text-[10px]">ShuleCloud Academy</p>
                                    </div>
                                    <div className="text-center">
                                        <div className="w-48 border-b-2 border-slate-200 mb-2"></div>
                                        <p className="text-slate-800 font-bold text-xs uppercase tracking-widest">Employee Signature</p>
                                        <p className="text-slate-400 text-[10px]">Date of Acceptance</p>
                                    </div>
                                </div>
                            </div>

                            {/* Footer Decor */}
                            <div className="mt-16 flex items-center gap-2 justify-center print:mt-10">
                                <Sparkles className="w-4 h-4 text-[#5C67F2]" />
                                <span className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em]">Built for Academic Excellence</span>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
