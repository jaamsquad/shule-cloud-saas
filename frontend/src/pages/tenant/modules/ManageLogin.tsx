import { Home, Save, Mail, ChevronDown, Search, Eye, EyeOff, Lock, User as UserIcon, Loader2, RefreshCcw, Key, AlertTriangle } from "lucide-react";
import { useState, useEffect } from "react";
import UsernameInput from "@/components/UsernameInput";
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
            // Use the dedicated endpoint that enforces username uniqueness
            return api.patch(`/students/${student._id}/portal-credentials`, {
                portalUsername: username,
                portalPassword: password,
                credentialsGenerated: true,
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["students"] });
            toast.success("Credentials generated!");
        },
        onError: (e: any) => toast.error(e?.response?.data?.message || "Failed to generate credentials"),
    });

    // Reset password for a student
    const resetMutation = useMutation({
        mutationFn: async (student: any) => {
            const newPassword = generatePassword(student.registrationNo);
            return api.patch(`/students/${student._id}/portal-credentials`, {
                portalPassword: newPassword,
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
            <div className="bg-white border-b border-gray-100 px-5 py-3 flex items-center justify-between shadow-sm z-10 m-4 rounded-xl">
                <div className="flex items-center">
                    <span className="font-bold text-gray-800 text-sm mr-2">Students</span>
                    <span className="text-gray-300 mx-2">|</span>
                    <Home className="w-3.5 h-3.5 text-gray-500 mr-1.5" />
                    <span className="text-gray-500 font-medium text-sm">- Manage Login</span>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <a href="/students/parent-login"
                        className="flex items-center gap-2 h-8 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200 font-black text-[10px] uppercase tracking-widest rounded-xl transition-all">
                        Parent Login Mgmt
                    </a>
                    <a href="/login" target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 h-8 px-4 bg-[#5C67F2] hover:bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all shadow-md shadow-indigo-100">
                        <Key className="w-3.5 h-3.5" /> Student Portal ↗
                    </a>
                </div>
            </div>

            <div className="p-6 pt-0 flex flex-col gap-5">
                {/* Top: search bar (horizontal) */}
                <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mt-4">
                    <div className="flex flex-col md:flex-row md:items-end gap-3">
                        <div className="flex items-center gap-2 text-slate-700"><Search className="w-4 h-4 text-[#5C67F2]" /><span className="font-black text-sm">Search</span></div>
                        <div className="flex-1">
                            <label className="block text-[9px] font-black text-[#5C67F2] uppercase tracking-widest mb-1">Search Student</label>
                            <input type="text" placeholder="Name or Registration…" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full h-10 px-4 border border-[#5C67F2]/20 rounded-xl focus:outline-none focus:border-[#5C67F2] text-slate-700 bg-white text-xs font-bold" />
                        </div>
                        <div className="w-full md:w-56">
                            <label className="block text-[9px] font-black text-[#5C67F2] uppercase tracking-widest mb-1">Class</label>
                            <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}
                                className="w-full h-10 px-4 border border-[#5C67F2]/20 rounded-xl focus:outline-none focus:border-[#5C67F2] text-slate-700 bg-white cursor-pointer text-xs font-black">
                                <option value="all">All Classes</option>
                                {classNames.map((c: string) => (<option key={c} value={c}>{c}</option>))}
                            </select>
                        </div>
                        <button onClick={() => { setSearchTerm(""); setSelectedClass("all"); }} className="h-10 px-4 text-[#5C67F2] font-black text-[9px] uppercase tracking-widest hover:text-[#4a54c4]">Reload</button>
                        <button onClick={handleBulkGenerate} className="h-10 px-6 bg-[#5C67F2] hover:bg-[#4a54c4] text-white rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 shadow-md transition-all">
                            <Key className="w-3.5 h-3.5" /> Generate All
                        </button>
                    </div>
                </div>

                {/* Table below */}
                <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-6 overflow-x-auto">
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
                                                <td className="px-4 py-3">
                                                    {hasCredentials ? (
                                                        <UsernameInput
                                                            value={username}
                                                            onChange={() => {}}
                                                            excludeId={s._id}
                                                            excludeType="student"
                                                            placeholder="—"
                                                            className="bg-slate-50 cursor-default"
                                                        />
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
