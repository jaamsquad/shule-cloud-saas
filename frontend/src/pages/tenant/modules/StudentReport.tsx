import { useParams } from "react-router-dom";
import { Home, FileText, BookOpen, Search, Loader2 } from "lucide-react";
import { useItems } from "@/hooks/useItems";

export default function StudentReport() {
    const { id } = useParams();
    const { items: students, isLoading } = useItems("students");
    
    const student = students?.find((s: any) => s._id === id || s.registrationNo === id);

    if (isLoading) {
        return (
            <div className="flex-1 bg-[#f4f7f6] min-h-screen flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-12 h-12 animate-spin text-[#5C67F2]" />
                    <p className="text-slate-400 font-bold animate-pulse">Fetching student records...</p>
                </div>
            </div>
        );
    }

    if (!student) {
        return (
            <div className="flex-1 bg-[#f4f7f6] min-h-screen flex items-center justify-center">
                <div className="bg-white p-12 rounded-[2rem] shadow-xl text-center space-y-4 border border-gray-100">
                    <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto">
                        <Search className="w-10 h-10 text-rose-500" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-800">Student Not Found</h2>
                    <p className="text-slate-500 max-w-xs">We couldn't find a student with ID: <span className="font-bold text-[#5C67F2]">{id}</span></p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 bg-[#f4f7f6] min-h-screen flex flex-col items-center">
            {/* Breadcrumb Header */}
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm z-10 m-4 rounded-xl w-[calc(100%-2rem)]">
                <div className="flex items-center">
                    <span className="font-bold text-gray-800 text-lg mr-2">Students</span>
                    <span className="text-gray-300 mx-2">|</span>
                    <Home className="w-4 h-4 text-gray-500 mr-2" />
                    <span className="text-gray-500 font-medium">
                        - Student Report
                    </span>
                </div>
                <button className="h-9 px-5 bg-[#868DF4] hover:bg-[#5C67F2] text-white text-[11px] font-bold rounded-full shadow-sm flex items-center gap-2 transition-colors">
                    <FileText className="w-3.5 h-3.5" /> Get PDF
                </button>
            </div>

            <div className="p-6 pt-0 w-full mt-4 flex flex-col lg:flex-row gap-6">
                
                {/* Left Column - Profile Details */}
                <div className="w-full lg:w-[340px] flex-shrink-0 flex flex-col gap-6">
                    {/* Top Profile Card */}
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 flex flex-col items-center text-center">
                        <div className="w-32 h-32 bg-gray-100 rounded-full border-[6px] border-[#868DF4]/10 flex items-center justify-center overflow-hidden mb-6">
                            <div className="w-full h-full bg-[#1e293b] flex flex-col items-center pt-5 relative">
                                <div className="w-10 h-10 bg-[#fcd34d] rounded-full"></div>
                                <div className="w-20 h-16 bg-[#5C67F2] mt-2 rounded-t-[2rem] relative">
                                </div>
                            </div>
                        </div>
                        <h2 className="text-xl font-bold text-[#868DF4]">{student.studentName}</h2>
                    </div>

                    {/* Details List */}
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 space-y-4">
                        <DetailRow label="Registration No" value={student.registrationNo} />
                        <DetailRow label="Date Of Admission" value={student.admissionDate} />
                        <DetailRow label="Class" value={student.studentClass} />
                        <DetailRow label="Family" value={student.family || ""} />
                        <DetailRow label="Discount in Fee" value={`${student.discount}%`} />
                    </div>

                    {/* Extended Details List */}
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 space-y-4">
                        <DetailRow label="Date Of Birth" value={student.dob} />
                        <DetailRow label="Gender" value={student.gender} />
                        <DetailRow label="Any Identification Mark?" value={student.idMark} />
                        <DetailRow label="Blood Group" value={student.bloodGroup} />
                        <DetailRow label="Disease If Any?" value={student.disease} />
                        <DetailRow label="Student Birth Form ID / NIC" value={student.nationalId} />
                        <DetailRow label="Cast" value={student.cast} />
                        <DetailRow label="Previous School" value={student.previousSchool} />
                        <DetailRow label="Previous ID / Board Roll No" value={student.previousRollNo} />
                        <DetailRow label="Any Additional Note" value={student.additionalNote} />
                        <DetailRow label="Orphan Student" value={student.orphan} />
                        <DetailRow label="OSC" value={student.osc} />
                        <DetailRow label="Religion" value={student.religion} />
                        <DetailRow label="Total Siblings" value={student.totalSiblings || "0"} />
                    </div>

                    {/* Parent Details List */}
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 space-y-4">
                        <DetailRow label="Father Name" value={student.fatherName} />
                        <DetailRow label="Mother Name" value={student.motherName} />
                        <DetailRow label="Address" value={student.address} />
                    </div>
                </div>

                {/* Right Column - Reports Grid */}
                <div className="flex-1 grid grid-cols-1 xl:grid-cols-2 gap-6">
                    
                    {/* 1 Attendance Report */}
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 flex flex-col">
                        <div className="flex items-center gap-2 mb-6">
                            <div className="w-6 h-6 rounded-full bg-[#868DF4] text-white flex items-center justify-center text-xs font-bold">1</div>
                            <h3 className="text-[#868DF4] font-bold">Attendance Report</h3>
                        </div>
                        
                        <div className="flex justify-center gap-6 mb-8">
                            {/* Overall Circle */}
                            <div className="flex flex-col items-center">
                                <div className="w-20 h-20 rounded-full border-[6px] border-[#ff5e6c]/20 flex flex-col items-center justify-center relative">
                                    <span className="text-[#ff5e6c] font-bold text-lg leading-tight">0%</span>
                                    <span className="text-[9px] text-[#ff5e6c] font-bold">Overall</span>
                                </div>
                                <div className="mt-4 border border-gray-200 rounded-full px-3 py-1 text-[8px] font-bold text-gray-400 flex items-center gap-1">
                                    <span className="text-[#6b8cff]">Today</span> <span className="text-gray-300">-&gt;</span> NOT MARKED
                                </div>
                            </div>
                            
                            {/* Month Circle */}
                            <div className="flex flex-col items-center">
                                <div className="w-20 h-20 rounded-full border-[6px] border-[#ff5e6c]/20 flex flex-col items-center justify-center relative">
                                    <span className="text-[#ff5e6c] font-bold text-lg leading-tight">0%</span>
                                    <span className="text-[9px] text-[#ff5e6c] font-bold text-center">May 2026</span>
                                </div>
                                <div className="mt-4 border border-gray-200 rounded-full px-3 py-1 text-[8px] font-bold text-gray-400 flex items-center gap-1">
                                    <span className="text-[#6b8cff]">Yesterday</span> <span className="text-gray-300">-&gt;</span> NOT MARKED
                                </div>
                            </div>
                        </div>

                        {/* Cards */}
                        <div className="flex gap-2 mt-auto">
                            <div className="flex-1 bg-[#6b8cff] rounded-2xl p-4 text-white flex justify-between">
                                <div>
                                    <p className="text-[10px] font-bold tracking-widest mb-2">PRESENTS</p>
                                    <p className="text-2xl font-bold">-</p>
                                    <p className="text-[9px] opacity-80 mt-1">This Month</p>
                                </div>
                                <div className="text-2xl font-bold opacity-80">0</div>
                            </div>
                            <div className="flex-1 bg-[#868DF4] rounded-2xl p-4 text-white flex justify-between">
                                <div>
                                    <p className="text-[10px] font-bold tracking-widest mb-2">LEAVES</p>
                                    <p className="text-2xl font-bold">-</p>
                                    <p className="text-[9px] opacity-80 mt-1">This Month</p>
                                </div>
                                <div className="text-2xl font-bold opacity-80">0</div>
                            </div>
                            <div className="flex-1 bg-[#ff5e6c] rounded-2xl p-4 text-white flex justify-between">
                                <div>
                                    <p className="text-[10px] font-bold tracking-widest mb-2">ABSENTS</p>
                                    <p className="text-2xl font-bold">-</p>
                                    <p className="text-[9px] opacity-80 mt-1">This Month</p>
                                </div>
                                <div className="text-2xl font-bold opacity-80">0</div>
                            </div>
                        </div>
                    </div>

                    {/* 3 Examination Report */}
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 flex flex-col">
                        <div className="flex items-center gap-2 mb-6">
                            <div className="w-6 h-6 rounded-full bg-[#868DF4] text-white flex items-center justify-center text-xs font-bold">3</div>
                            <h3 className="text-[#868DF4] font-bold">Examination Report</h3>
                        </div>
                        <div className="flex-1 flex flex-col items-center justify-center text-center pb-8">
                            <div className="w-32 h-32 bg-indigo-50/50 rounded-full flex items-center justify-center mb-4 relative">
                                <Search className="w-12 h-12 text-[#868DF4] opacity-50" />
                            </div>
                            <p className="font-bold text-[#868DF4]">No Record Found.</p>
                        </div>
                    </div>

                    {/* 2 Class Tests Report */}
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 flex flex-col">
                        <div className="flex items-center gap-2 mb-6">
                            <div className="w-6 h-6 rounded-full bg-[#868DF4] text-white flex items-center justify-center text-xs font-bold">2</div>
                            <h3 className="text-[#ff5e6c] font-bold">Class Tests Report</h3>
                        </div>
                        
                        <div className="flex justify-between items-center bg-gray-50/50 rounded-2xl p-6 border border-gray-100">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <BookOpen className="w-4 h-4 text-[#868DF4]" />
                                    <h4 className="font-bold text-gray-700">English</h4>
                                </div>
                                <p className="text-[#868DF4] font-bold text-sm mb-4">0%</p>
                                
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-[9px] font-bold text-gray-500 uppercase">
                                        <div className="w-2 h-2 rounded-full bg-[#ff5e6c]"></div> TOTAL CLASS TESTS (0)
                                    </div>
                                    <div className="flex items-center gap-2 text-[9px] font-bold text-gray-500 uppercase">
                                        <div className="w-2 h-2 rounded-full bg-[#868DF4]"></div> TOTAL MARKS (0)
                                    </div>
                                    <div className="flex items-center gap-2 text-[9px] font-bold text-gray-500 uppercase">
                                        <div className="w-2 h-2 rounded-full bg-[#6b8cff]"></div> OBTAINED MARKS (0)
                                    </div>
                                </div>
                            </div>
                            
                            <div className="w-24 h-24 rounded-full border-4 border-gray-200 border-l-gray-300 flex flex-col items-center justify-center -rotate-45">
                                <div className="rotate-45 flex flex-col items-center">
                                    <span className="text-gray-800 font-bold text-xl leading-tight">0%</span>
                                    <span className="text-[10px] font-bold text-gray-400">score</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 4 Fee Report */}
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 flex flex-col">
                        <div className="flex items-center gap-2 mb-6">
                            <div className="w-6 h-6 rounded-full bg-[#868DF4] text-white flex items-center justify-center text-xs font-bold">4</div>
                            <h3 className="text-[#868DF4] font-bold">Fee Report</h3>
                        </div>
                        <div className="flex-1 flex flex-col items-center justify-center text-center pb-8">
                            <div className="w-32 h-32 bg-indigo-50/50 rounded-full flex items-center justify-center mb-4 relative">
                                <Search className="w-12 h-12 text-[#868DF4] opacity-50" />
                            </div>
                            <p className="font-bold text-[#868DF4]">No Record Found.</p>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}

function DetailRow({ label, value }: { label: string, value: string }) {
    return (
        <div className="mb-3 last:mb-0">
            <p className="text-[11px] font-bold text-[#a0a8be] mb-0.5 tracking-wide">{label}</p>
            {value ? (
                <div className="flex items-center gap-1.5">
                    <span className="text-gray-300 font-bold">↳</span>
                    <span className="font-bold text-[#3B54A6] text-sm">{value}</span>
                </div>
            ) : (
                <div className="flex items-center gap-1.5">
                    <span className="text-gray-300 font-bold">↳</span>
                </div>
            )}
        </div>
    );
}
