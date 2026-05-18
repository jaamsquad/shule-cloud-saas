import { Home, Save, Mail, ChevronDown, Search, Eye, EyeOff, Lock, User as UserIcon, Loader2, RefreshCcw, Key } from "lucide-react";
import { useState, useEffect } from "react";
import { useItems } from "@/hooks/useItems";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";

function generatePassword(regNo: string): string {
    const cleanReg = regNo?.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || "student";
    return `shule@${cleanReg}`;
}

function generateUsername(regNo: string, name: string): string {
    if (regNo) return regNo;
    return name.toLowerCase().replace(/\s+/g, ".").slice(0, 15);
}

export default function ManageLogin() {
    const queryClient = useQueryClient();
    const { items: students, isLoading } = useItems("students");
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedClass, setSelectedClass] = useState("all");
    const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

    const { data: classes = [] } = useQuery({
        queryKey: ["classes"],
        queryFn: async () => { const r = await api.get("/academics/classes"); return r.data; },
    });
    const classNames = classes.map((c: any) => c.name || c.levelName).filter(Boolean);

    const filteredStudents = students?.filter((s: any) => {
        const matchesClass = selectedClass === "all" || s.studentClass === selectedClass;
        const matchesSearch = s.studentName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             s.registrationNo.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesClass && matchesSearch;
    });

    const togglePassword = (id: string) => {
        setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }));
    };

    // Auto-generate credentials for students without them
    const generateMutation = useMutation({
        mutationFn: async (student: any) => {
            const username = generateUsername(student.registrationNo, student.studentName);
            const password = generatePassword(student.registrationNo);
            return api.patch(`/students/${student._id}`, {
                portalUsername: username,
                portalPassword: password,
                credentialsGenerated: true,
                lastPasswordReset: new Date().toISOString(),
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["students"] });
            toast.success("Credentials generated!");
        },
        onError: () => toast.error("Failed to generate credentials"),
    });

    // Reset password for a student
    const resetMutation = useMutation({
        mutationFn: async (student: any) => {
            const newPassword = generatePassword(student.registrationNo);
            return api.patch(`/students/${student._id}`, {
                portalPassword: newPassword,
                lastPasswordReset: new Date().toISOString(),
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["students"] });
            toast.success("Password reset successfully!");
        },
        onError: () => toast.error("Failed to reset password"),
    });

    // Bulk generate for all students without credentials
    const handleBulkGenerate = () => {
        const ungenerated = students.filter((s: any) => !s.portalUsername);
        if (ungenerated.length === 0) {
            toast.info("All students already have credentials");
            return;
        }
        ungenerated.forEach((s: any) => generateMutation.mutate(s));
        toast.success(`Generating credentials for ${ungenerated.length} students...`);
    };

    return (
        <div className="flex-1 bg-[#f4f7f6] min-h-screen flex flex-col">
            {/* Breadcrumb */}
            <div className="bg-white border-b border-gray-100 px-5 py-3 flex items-center shadow-sm z-10 m-4 rounded-xl">
                <span className="font-bold text-gray-800 text-sm mr-2">Students</span>
                <span className="text-gray-300 mx-2">|</span>
                <Home className="w-3.5 h-3.5 text-gray-500 mr-1.5" />
                <span className="text-gray-500 font-medium text-sm">- Manage Login</span>
            </div>

            <div className="p-6 pt-0 flex gap-5 items-start flex-wrap lg:flex-nowrap">
                {/* Search Sidebar */}
                <div className="w-full lg:w-64 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex-shrink-0 mt-4">
                    <h3 className="text-sm font-black text-center text-slate-800 mb-6 flex items-center justify-center gap-2">
                        <Search className="w-4 h-4 text-[#5C67F2]" />
                        Search
                    </h3>
                    
                    <div className="space-y-6">
                        <div className="relative">
                            <div className="absolute -top-3 left-5 bg-[#868DF4] text-white text-[8px] px-2.5 py-0.5 rounded-full font-black tracking-widest z-10 shadow-sm uppercase">
                                Search Student*
                            </div>
                            <input 
                                type="text" 
                                placeholder="Name or Registration..."
                                className="w-full h-10 px-5 border border-[#5C67F2]/20 rounded-full focus:outline-none focus:border-[#5C67F2] text-slate-700 placeholder-slate-300 bg-white text-xs font-bold shadow-sm"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className="relative">
                            <div className="absolute -top-3 left-5 bg-[#5C67F2] text-white text-[8px] px-2.5 py-0.5 rounded-full font-black tracking-widest z-10 shadow-sm uppercase">
                                Select Class*
                            </div>
                            <select 
                                value={selectedClass}
                                onChange={(e) => setSelectedClass(e.target.value)}
                                className="w-full h-10 px-5 border border-[#5C67F2]/20 rounded-full focus:outline-none focus:border-[#5C67F2] text-slate-700 bg-white appearance-none cursor-pointer text-xs font-black shadow-sm"
                            >
                                <option value="all">All Classes</option>
                                {classNames.map((c: string) => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                            <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none">
                                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                            </div>
                        </div>

                        <div className="text-center pt-1 space-y-3">
                            <button 
                                onClick={() => { setSearchTerm(""); setSelectedClass("all"); }}
                                className="text-[#5C67F2] font-black text-[9px] uppercase tracking-widest hover:text-[#4a54c4] transition-colors"
                            >
                                or, Reload All
                            </button>
                            <div className="border-t border-slate-50 pt-3">
                                <button 
                                    onClick={handleBulkGenerate}
                                    className="w-full h-9 bg-[#5C67F2] hover:bg-[#4a54c4] text-white rounded-full text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-100 transition-all"
                                >
                                    <Key className="w-3 h-3" /> Generate All
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Table */}
                <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mt-4 overflow-x-auto min-w-[500px]">
                    <div className="overflow-hidden rounded-xl border border-slate-50 mb-4 shadow-sm">
                        <table className="w-full text-xs text-left">
                            <thead className="bg-slate-50 text-slate-400">
                                <tr>
                                    <th className="px-4 py-3 font-black uppercase text-[9px] tracking-widest">ID</th>
                                    <th className="px-4 py-3 font-black uppercase text-[9px] tracking-widest">Student Name</th>
                                    <th className="px-4 py-3 font-black uppercase text-[9px] tracking-widest text-center">Class</th>
                                    <th className="px-4 py-3 font-black uppercase text-[9px] tracking-widest text-center">Portal Username</th>
                                    <th className="px-4 py-3 font-black uppercase text-[9px] tracking-widest text-center">Password</th>
                                    <th className="px-4 py-3 font-black uppercase text-[9px] tracking-widest text-center">Status</th>
                                    <th className="px-4 py-3 font-black uppercase text-[9px] tracking-widest text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-16 text-center">
                                            <div className="flex flex-col items-center gap-2">
                                                <Loader2 className="w-8 h-8 animate-spin text-[#5C67F2]" />
                                                <p className="text-slate-400 font-black text-[9px] uppercase tracking-widest animate-pulse">Syncing Credentials...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredStudents && filteredStudents.length > 0 ? (
                                    filteredStudents.map((s: any) => {
                                        const hasCredentials = !!s.portalUsername;
                                        const username = s.portalUsername || generateUsername(s.registrationNo, s.studentName);
                                        const password = s.portalPassword || "—";

                                        return (
                                            <tr key={s._id} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="px-4 py-3 text-slate-400 font-bold">{s.registrationNo}</td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-md bg-[#5C67F2]/10 flex items-center justify-center text-[#5C67F2] font-black text-[9px]">
                                                            {s.gender?.charAt(0) || "S"}
                                                        </div>
                                                        <span className="text-slate-800 font-bold text-xs">{s.studentName}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className="px-2 py-0.5 bg-white border border-slate-100 rounded-full text-[8px] font-black text-slate-500 uppercase">
                                                        {s.studentClass || "—"}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {hasCredentials ? (
                                                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-indigo-50 rounded-lg bg-slate-50 text-slate-800 font-bold text-[10px] shadow-sm">
                                                            <UserIcon className="w-3 h-3 text-indigo-300" />
                                                            {username}
                                                        </div>
                                                    ) : (
                                                        <span className="text-[9px] text-slate-300 font-bold italic">Not generated</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {hasCredentials ? (
                                                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-indigo-50 rounded-lg bg-slate-50 text-slate-800 font-bold text-[10px] shadow-sm">
                                                            <Lock className="w-2.5 h-2.5 text-indigo-300" />
                                                            <span className="tracking-wider">
                                                                {visiblePasswords[s._id] ? password : "••••••••"}
                                                            </span>
                                                            <button 
                                                                onClick={() => togglePassword(s._id)}
                                                                className="text-slate-300 hover:text-[#5C67F2] transition-colors ml-1"
                                                            >
                                                                {visiblePasswords[s._id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <span className="text-[9px] text-slate-300 font-bold italic">—</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {hasCredentials ? (
                                                        <span className="px-2 py-0.5 bg-green-50 text-green-600 rounded-full text-[8px] font-black uppercase tracking-wider">Active</span>
                                                    ) : (
                                                        <span className="px-2 py-0.5 bg-amber-50 text-amber-500 rounded-full text-[8px] font-black uppercase tracking-wider">Pending</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center justify-center gap-1.5 opacity-40 group-hover:opacity-100 transition-opacity">
                                                        {!hasCredentials ? (
                                                            <button 
                                                                onClick={() => generateMutation.mutate(s)}
                                                                disabled={generateMutation.isPending}
                                                                className="h-7 px-3 bg-[#5C67F2] hover:bg-[#4a54c4] text-white rounded-lg text-[8px] font-black uppercase tracking-wider flex items-center gap-1 transition-all shadow-sm"
                                                            >
                                                                <Key className="w-2.5 h-2.5" /> Generate
                                                            </button>
                                                        ) : (
                                                            <>
                                                                <button 
                                                                    onClick={() => resetMutation.mutate(s)}
                                                                    disabled={resetMutation.isPending}
                                                                    className="w-7 h-7 flex items-center justify-center bg-white hover:bg-amber-50 hover:text-amber-600 rounded-lg text-slate-400 border border-slate-100 transition-all shadow-sm"
                                                                    title="Reset Password"
                                                                >
                                                                    <RefreshCcw className="w-3 h-3" />
                                                                </button>
                                                                <button 
                                                                    className="w-7 h-7 flex items-center justify-center bg-white hover:bg-slate-800 hover:text-white rounded-lg text-slate-400 border border-slate-100 transition-all shadow-sm"
                                                                    title="Send Credentials via Email"
                                                                >
                                                                    <Mail className="w-3 h-3" />
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-16 text-center">
                                            <div className="flex flex-col items-center gap-2">
                                                <UserIcon className="w-10 h-10 text-slate-100" />
                                                <p className="text-slate-300 font-black text-[9px] uppercase tracking-widest">No matching students found</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="flex justify-between items-center text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        <div>Showing <span className="text-slate-800">{filteredStudents?.length || 0}</span> students</div>
                        <div className="flex items-center gap-3">
                            <button className="hover:text-slate-800 transition-colors">Previous</button>
                            <div className="w-7 h-7 flex items-center justify-center bg-[#5C67F2] text-white rounded-lg shadow-lg shadow-indigo-100 text-[9px]">1</div>
                            <button className="hover:text-slate-800 transition-colors">Next</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
