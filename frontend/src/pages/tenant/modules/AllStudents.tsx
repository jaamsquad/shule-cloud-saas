import { useState } from "react";
import { Home, Plus, Search, Edit, Trash2, User, Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useItems } from "@/hooks/useItems";

export default function AllStudents() {
    const navigate = useNavigate();
    const { items: students, isLoading, deleteItem } = useItems("students");
    const [searchTerm, setSearchTerm] = useState("");

    const filtered = students.filter((s: any) => {
        const name = (s.studentName || s.name || "").toLowerCase();
        const reg = (s.registrationNo || "").toLowerCase();
        return name.includes(searchTerm.toLowerCase()) || reg.includes(searchTerm.toLowerCase());
    });

    return (
        <div className="flex-1 bg-[#f4f7f6] min-h-screen flex flex-col items-center">
            {/* Breadcrumb */}
            <div className="bg-white border-b border-gray-100 px-5 py-3 flex items-center shadow-sm z-10 m-4 rounded-xl w-[calc(100%-2rem)]">
                <span className="font-bold text-gray-800 text-sm mr-2">Students</span>
                <span className="text-gray-300 mx-2">|</span>
                <Home className="w-3.5 h-3.5 text-gray-500 mr-1.5" />
                <span className="text-gray-500 font-medium text-sm">- All Students</span>
            </div>

            <div className="p-6 pt-0 w-full mt-4">
                {/* Search */}
                <div className="flex justify-end mb-6">
                    <div className="relative">
                        <input 
                            type="text" 
                            placeholder="Search"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="h-10 pl-10 pr-4 border border-gray-200 rounded-lg focus:outline-none focus:border-[#5C67F2] text-sm bg-white"
                        />
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    </div>
                </div>

                {/* Grid */}
                <div className="flex gap-5 flex-wrap justify-center lg:justify-start pl-4">
                    {isLoading ? (
                        <div className="w-full flex justify-center py-20">
                            <Loader2 className="w-10 h-10 animate-spin text-[#5C67F2]" />
                        </div>
                    ) : (
                        filtered.map((student: any) => (
                            <div key={student._id} className="w-52 bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col items-center relative hover:shadow-md transition-shadow">
                                <div className="w-16 h-16 bg-gray-100 rounded-full border-4 border-[#868DF4]/20 flex items-center justify-center overflow-hidden mb-3 text-[#5C67F2]">
                                    <User className="w-8 h-8" />
                                </div>
                                
                                <p className="text-[9px] font-bold text-gray-400 mb-0.5">{student.registrationNo || '—'}</p>
                                <h3 className="font-bold text-gray-800 text-xs tracking-tight mb-1 text-center">{student.studentName || student.name}</h3>
                                <p className="text-[8px] font-black text-[#5C67F2] uppercase tracking-widest mb-3">{student.studentClass || '—'}</p>

                                <div className="flex gap-2">
                                    <Link to={`/students/report/${student._id}`} className="w-7 h-7 rounded-full bg-[#868DF4] hover:bg-[#5C67F2] text-white flex items-center justify-center transition-colors shadow-sm">
                                        <Search className="w-3.5 h-3.5" />
                                    </Link>
                                    <button 
                                        onClick={() => navigate(`/students/edit/${student._id}`)}
                                        className="w-7 h-7 rounded-full bg-[#5C67F2] hover:bg-[#4a54c4] text-white flex items-center justify-center transition-colors shadow-sm"
                                    >
                                        <Edit className="w-3.5 h-3.5" />
                                    </button>
                                    <button 
                                        onClick={() => { if(confirm("Delete this student?")) deleteItem(student._id); }}
                                        className="w-7 h-7 rounded-full bg-[#ff5e6c] hover:bg-[#e04553] text-white flex items-center justify-center transition-colors shadow-sm"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}

                    {/* Add New */}
                    <Link to="/students/new" className="w-52 bg-white rounded-2xl shadow-sm border border-dashed border-[#5C67F2]/40 hover:border-[#5C67F2] p-5 flex flex-col items-center justify-center cursor-pointer transition-colors group min-h-[200px]">
                        <div className="w-12 h-12 rounded-full bg-blue-50 group-hover:bg-blue-100 flex items-center justify-center mb-3 transition-colors">
                            <Plus className="w-6 h-6 text-[#5C67F2]" />
                        </div>
                        <h3 className="font-bold text-[#5C67F2] text-xs">Add New</h3>
                    </Link>
                </div>
            </div>
        </div>
    );
}
