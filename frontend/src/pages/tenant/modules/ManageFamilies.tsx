import { Home, Search, Users, UserPlus, Filter, MoreVertical, MapPin, GraduationCap } from "lucide-react";
import { useState } from "react";
import { useItems } from "@/hooks/useItems";
import { useNavigate } from "react-router-dom";

export default function ManageFamilies() {
    const [searchTerm, setSearchTerm] = useState("");
    const { items: families, isLoading } = useItems("families");
    const navigate = useNavigate();

    const stats = [
        { label: "Total Families", value: families?.length || "0", icon: Users, color: "bg-[#5C67F2]" },
        { label: "Total Students", value: "---", icon: GraduationCap, color: "bg-[#FF9A5A]" },
        { label: "Active Guardians", value: "---", icon: UserPlus, color: "bg-[#4ADE80]" },
        { label: "Reach Rate", value: "98%", icon: Filter, color: "bg-[#FACC15]" },
    ];

    return (
        <div className="flex-1 bg-[#f4f7f6] min-h-screen flex flex-col">
            {/* Header Area */}
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center shadow-sm z-10 m-4 rounded-xl flex-wrap gap-4">
                <div className="flex items-center flex-1">
                    <span className="font-bold text-gray-800 text-lg mr-2">Students</span>
                    <span className="text-gray-300 mx-2">|</span>
                    <Home className="w-4 h-4 text-gray-500 mr-2" />
                    <span className="text-gray-500 font-medium">
                        - Manage Families
                    </span>
                </div>
                
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <input 
                            type="text" 
                            placeholder="Search families..." 
                            className="h-10 pl-10 pr-4 bg-gray-50 border border-gray-200 rounded-full text-sm focus:outline-none focus:border-[#5C67F2] w-64 transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    </div>
                    <button 
                        onClick={() => navigate("/students/families/new")}
                        className="h-10 px-6 bg-[#5C67F2] hover:bg-[#4a54c4] text-white text-sm font-bold rounded-full shadow-lg shadow-indigo-100 flex items-center gap-2 transition-all"
                    >
                        <UserPlus className="w-4 h-4" /> Create Family
                    </button>
                </div>
            </div>

            <div className="px-6 pb-6 space-y-6">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {stats.map((stat, i) => (
                        <div key={i} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between group hover:shadow-md transition-all">
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{stat.label}</p>
                                <p className="text-2xl font-black text-gray-800">{stat.value}</p>
                            </div>
                            <div className={`w-12 h-12 ${stat.color} rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform`}>
                                <stat.icon className="w-6 h-6" />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Main Content Area */}
                <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
                        <div>
                            <h3 className="text-lg font-bold text-gray-800">Family Directory</h3>
                            <p className="text-xs text-gray-400 font-medium mt-1">Manage parental links and guardianship nodes</p>
                        </div>
                        <button className="p-2 hover:bg-white rounded-xl transition-colors border border-transparent hover:border-gray-100">
                            <Filter className="w-5 h-5 text-gray-400" />
                        </button>
                    </div>

                    <div className="p-4 overflow-x-auto">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-4">
                                <div className="w-12 h-12 border-4 border-[#5C67F2] border-t-transparent rounded-full animate-spin"></div>
                                <p className="text-gray-400 font-bold">Synchronizing family nodes...</p>
                            </div>
                        ) : !families || families.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-24 text-center">
                                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                                    <Users className="w-10 h-10 text-gray-200" />
                                </div>
                                <h4 className="text-xl font-bold text-gray-800 mb-2">No Families Found</h4>
                                <p className="text-gray-400 max-w-xs mx-auto text-sm">Start by creating a new family node to link students and guardians.</p>
                                <button 
                                    onClick={() => navigate("/students/families/new")}
                                    className="mt-8 px-8 py-3 bg-[#5C67F2] text-white rounded-full font-bold text-sm shadow-xl shadow-indigo-100 hover:scale-105 transition-all"
                                >
                                    + Add First Family
                                </button>
                            </div>
                        ) : (
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="text-[11px] font-black text-gray-400 uppercase tracking-[0.1em] border-b border-gray-50">
                                        <th className="px-6 py-4">Family Node</th>
                                        <th className="px-6 py-4">Linked Guardians</th>
                                        <th className="px-6 py-4">Linked Students</th>
                                        <th className="px-6 py-4">Address</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {families.map((family: any) => (
                                        <tr key={family._id} className="group hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-[#5C67F2] font-bold">
                                                        {family.familyName?.charAt(0) || "F"}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-gray-800 text-sm">{family.familyName || "Unnamed Family"}</p>
                                                        <p className="text-[10px] text-gray-400 font-medium">ID: {family._id.slice(-8).toUpperCase()}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="flex -space-x-2">
                                                        {[1, 2].map((_, i) => (
                                                            <div key={i} className="w-7 h-7 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center overflow-hidden">
                                                                <div className="w-full h-full bg-[#1e293b] flex flex-col items-center pt-1.5 scale-75">
                                                                    <div className="w-2 h-2 bg-[#fcd34d] rounded-full"></div>
                                                                    <div className="w-4 h-3 bg-[#5C67F2] mt-0.5 rounded-t-full"></div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <span className="text-xs font-bold text-gray-600">2 Nodes</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-6">
                                                <div className="flex items-center gap-2">
                                                    <div className="px-3 py-1 bg-green-50 text-green-600 rounded-full text-[10px] font-black border border-green-100">
                                                        3 STUDENTS
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-6">
                                                <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                                                    <MapPin className="w-3.5 h-3.5 text-gray-300" />
                                                    {family.address || "No address set"}
                                                </div>
                                            </td>
                                            <td className="px-6 py-6 text-right">
                                                <button className="p-2 hover:bg-white rounded-xl transition-colors border border-transparent hover:border-gray-100 group-hover:shadow-sm">
                                                    <MoreVertical className="w-5 h-5 text-gray-400" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
