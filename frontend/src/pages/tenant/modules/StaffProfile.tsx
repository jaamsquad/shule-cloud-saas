import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { 
    User, Mail, Phone, MapPin, Calendar, Briefcase, 
    ArrowLeft, Loader2, Shield, GraduationCap, 
    Edit, Trash2, Camera, Download, FileText
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";

export default function StaffProfile() {
    const { id } = useParams();
    const navigate = useNavigate();

    const { data: employee, isLoading } = useQuery({
        queryKey: ["staff", id],
        queryFn: async () => {
            const r = await api.get(`/staff/${id}`);
            return r.data;
        },
    });

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-[#f4f7f6]">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-[#5C67F2] mx-auto mb-4" />
                    <p className="text-slate-400 font-black uppercase text-xs tracking-widest animate-pulse">Retrieving Personnel Data...</p>
                </div>
            </div>
        );
    }

    if (!employee) {
        return (
            <div className="flex-1 flex items-center justify-center bg-[#f4f7f6]">
                <div className="text-center bg-white p-12 rounded-[3rem] shadow-xl border border-gray-50">
                    <div className="w-20 h-20 bg-red-50 text-red-400 rounded-full flex items-center justify-center mx-auto mb-6">
                        <User className="w-10 h-10" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-800 mb-2">Node Not Found</h2>
                    <p className="text-slate-400 mb-8">The requested staff record does not exist in our nodes.</p>
                    <button onClick={() => navigate("/staff")} className="px-8 py-3 bg-[#5C67F2] text-white rounded-full font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-100 transition-all hover:scale-105">
                        Return to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    const name = employee.firstName ? `${employee.firstName} ${employee.lastName}` : (employee.employeeName || employee.name || 'Unknown Staff');

    return (
        <div className="flex-1 bg-[#f4f7f6] min-h-screen flex flex-col">
            {/* Header / Hero Section */}
            <div className="relative bg-white border-b border-gray-100 p-8 pt-12">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-10">
                    <button 
                        onClick={() => navigate(-1)}
                        className="absolute top-8 left-8 p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl text-slate-400 transition-all"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>

                    <div className="relative">
                        <div className="w-44 h-44 rounded-[3rem] bg-slate-100 border-8 border-white shadow-2xl shadow-indigo-100 overflow-hidden flex items-center justify-center text-[#5C67F2]">
                            <User className="w-20 h-20" strokeWidth={1.5} />
                        </div>
                        <button className="absolute bottom-2 right-2 w-12 h-12 bg-[#5C67F2] text-white rounded-2xl shadow-xl border-4 border-white flex items-center justify-center hover:scale-110 transition-all">
                            <Camera className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="flex-1 text-center md:text-left">
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mb-3">
                            <h1 className="text-4xl font-black text-slate-800 tracking-tight">{name}</h1>
                            <span className="px-4 py-1.5 bg-[#5C67F2]/10 text-[#5C67F2] rounded-full text-[10px] font-black uppercase tracking-widest">
                                {employee.designation || 'Staff Member'}
                            </span>
                        </div>
                        <p className="text-slate-400 font-medium text-lg mb-8 max-w-2xl">
                            Senior member of the {employee.department || 'Administrative'} department with expertise in academic governance.
                        </p>

                        <div className="flex flex-wrap justify-center md:justify-start gap-3">
                            <button className="px-6 py-2.5 bg-[#5C67F2] text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-[#4a54c4] transition-all flex items-center gap-2">
                                <Edit className="w-4 h-4" /> Edit Record
                            </button>
                            <button className="px-6 py-2.5 bg-white border border-gray-100 text-slate-400 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2">
                                <Download className="w-4 h-4" /> Download Dossier
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-8 max-w-6xl mx-auto w-full">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Contact & Bio */}
                    <div className="space-y-8">
                        <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-50">
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-3">
                                <span className="w-1.5 h-6 bg-[#5C67F2] rounded-full"></span>
                                Contact Intel
                            </h3>
                            <div className="space-y-6">
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-[#5C67F2] shrink-0">
                                        <Mail className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Email Address</p>
                                        <p className="text-slate-700 font-bold">{employee.email || 'not-assigned@shulecloud.com'}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-green-500 shrink-0">
                                        <Phone className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Phone Number</p>
                                        <p className="text-slate-700 font-bold">{employee.phone || '+254 --- --- ---'}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-500 shrink-0">
                                        <MapPin className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Physical Residency</p>
                                        <p className="text-slate-700 font-bold">{employee.address || 'Nairobi, Kenya'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-[#5C67F2] rounded-[2.5rem] p-8 shadow-2xl shadow-indigo-200 text-white relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-bl-[8rem] -mr-8 -mt-8"></div>
                            <Shield className="w-10 h-10 mb-6 opacity-80" />
                            <h3 className="text-xl font-black mb-2 tracking-tight">Security Access</h3>
                            <p className="text-white/70 text-xs font-medium mb-6 leading-relaxed">
                                This personnel record is verified and active. Access is restricted to HR and Academic leads.
                            </p>
                            <div className="py-3 px-6 bg-white/10 rounded-2xl border border-white/10 inline-block text-[10px] font-black uppercase tracking-widest">
                                Role: {employee.role || 'Personnel'}
                            </div>
                        </div>
                    </div>

                    {/* Middle/Right Column: Details */}
                    <div className="lg:col-span-2 space-y-8">
                        <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-50 grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div>
                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-3">
                                    <span className="w-1.5 h-6 bg-orange-400 rounded-full"></span>
                                    Professional Profile
                                </h3>
                                <div className="space-y-6">
                                    <div className="flex items-center gap-4">
                                        <Briefcase className="w-5 h-5 text-slate-300" />
                                        <div>
                                            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Employee ID</p>
                                            <p className="text-slate-700 font-bold">{employee.employeeId || 'SC-STAFF-001'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <Calendar className="w-5 h-5 text-slate-300" />
                                        <div>
                                            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Join Date</p>
                                            <p className="text-slate-700 font-bold">{employee.joinDate ? new Date(employee.joinDate).toLocaleDateString() : 'Jan 12, 2024'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <GraduationCap className="w-5 h-5 text-slate-300" />
                                        <div>
                                            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Academic Status</p>
                                            <p className="text-slate-700 font-bold">{employee.isTeachingStaff ? 'Certified Instructor' : 'Administrative Lead'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-3">
                                    <span className="w-1.5 h-6 bg-green-400 rounded-full"></span>
                                    System Metadata
                                </h3>
                                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Database Node</span>
                                        <span className="text-[10px] font-mono text-slate-500">{employee._id?.slice(-8)}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Portal Login</span>
                                        <span className="px-2 py-0.5 bg-green-100 text-green-600 rounded-md text-[9px] font-black uppercase tracking-widest">Active</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Last Activity</span>
                                        <span className="text-[10px] font-bold text-slate-600">Today, 09:42 AM</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Assignments / Recent Work */}
                        <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-50">
                            <div className="flex justify-between items-center mb-8">
                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-3">
                                    <span className="w-1.5 h-6 bg-indigo-400 rounded-full"></span>
                                    Academic Portfolio
                                </h3>
                                <button className="text-[10px] font-black text-[#5C67F2] uppercase tracking-widest hover:underline">View All Documents</button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-4 border border-slate-50 bg-slate-50/30 rounded-2xl flex items-center gap-4 group cursor-pointer hover:bg-white hover:border-slate-100 transition-all">
                                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-400 group-hover:text-[#5C67F2] transition-colors">
                                        <FileText className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-bold text-slate-700">Contract Agreement.pdf</p>
                                        <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Verified • 2.4 MB</p>
                                    </div>
                                </div>
                                <div className="p-4 border border-slate-50 bg-slate-50/30 rounded-2xl flex items-center gap-4 group cursor-pointer hover:bg-white hover:border-slate-100 transition-all">
                                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-400 group-hover:text-orange-400 transition-colors">
                                        <FileText className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-bold text-slate-700">Academic CV_2024.pdf</p>
                                        <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Verified • 1.1 MB</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
