import { useState } from "react";
import { Home, Search, Check, X, Loader2, Bed, User, RefreshCw, AlertTriangle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";

export default function RoomAllocation() {
    const qc = useQueryClient();
    const [tab, setTab] = useState<"allocate" | "current">("allocate");
    const [studentSearch, setStudentSearch] = useState("");
    const [selectedStudent, setSelectedStudent] = useState<any>(null);
    const [selectedBed, setSelectedBed] = useState<any>(null);
    const [selectedRoom, setSelectedRoom] = useState("");
    const [fee, setFee] = useState("");
    const [notes, setNotes] = useState("");
    const [searchFilter, setSearchFilter] = useState("");
    const [confirmVacate, setConfirmVacate] = useState<string | null>(null);

    const { data: students = [] } = useQuery({ queryKey: ["students"], queryFn: async () => { const r = await api.get("/students"); return Array.isArray(r.data) ? r.data : []; } });
    const { data: rooms = [] } = useQuery({ queryKey: ["hostel_rooms"], queryFn: async () => { const r = await api.get("/hostel_rooms"); return Array.isArray(r.data) ? r.data : []; } });
    const { data: beds = [] } = useQuery({ queryKey: ["hostel_beds", selectedRoom], queryFn: async () => { if (!selectedRoom) return []; const r = await api.get(`/hostel_beds?roomId=${selectedRoom}`); return Array.isArray(r.data) ? r.data : []; }, enabled: !!selectedRoom });
    const { data: allocations = [], isLoading: loadA, refetch } = useQuery({ queryKey: ["hostel_allocations"], queryFn: async () => { const r = await api.get("/hostel_allocations?status=Active"); return Array.isArray(r.data) ? r.data : []; } });

    const allocMut = useMutation({
        mutationFn: (p: any) => api.post("/hostel/allocate", p),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["hostel_allocations"] }); qc.invalidateQueries({ queryKey: ["hostel_beds"] }); qc.invalidateQueries({ queryKey: ["hostel_stats"] });
            toast.success(`${selectedStudent?.studentName} allocated to Bed ${selectedBed?.bedNumber}`);
            setSelectedStudent(null); setSelectedBed(null); setStudentSearch(""); setSelectedRoom(""); setFee(""); setNotes("");
            setTab("current");
        },
        onError: (e: any) => toast.error(e.response?.data?.message || "Allocation failed"),
    });

    const vacateMut = useMutation({
        mutationFn: (id: string) => api.patch(`/hostel/allocate/${id}/vacate`, {}),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["hostel_allocations"] }); qc.invalidateQueries({ queryKey: ["hostel_beds"] }); qc.invalidateQueries({ queryKey: ["hostel_stats"] }); toast.success("Student vacated and bed freed"); setConfirmVacate(null); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });

    const filteredStudents = studentSearch.length >= 2 ? students.filter((s: any) => (s.studentName || `${s.firstName || ""} ${s.lastName || ""}`).toLowerCase().includes(studentSearch.toLowerCase()) || (s.registrationNo || "").toLowerCase().includes(studentSearch.toLowerCase())) : [];
    const availableBeds = beds.filter((b: any) => !b.isOccupied);
    const room = rooms.find((r: any) => r._id === selectedRoom);
    const filteredAllocs = searchFilter ? allocations.filter((a: any) => (a.studentName || "").toLowerCase().includes(searchFilter.toLowerCase()) || (a.roomNumber || "").includes(searchFilter)) : allocations;

    return (
        <div className="flex-1 bg-[#F8FAFC] min-h-screen flex flex-col pb-20 font-sans">
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-2 text-sm">
                    <Home className="w-4 h-4 text-[#5C67F2]" /><span className="text-gray-300">/</span>
                    <span className="font-bold text-gray-600">Hostel</span><span className="text-gray-300">/</span>
                    <span className="font-black text-[#5C67F2]">Room Allocation</span>
                </div>
            </div>

            <div className="flex-1 max-w-6xl mx-auto w-full px-6 pt-8">
                <div className="mb-6"><h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Room Allocation</h1>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-1">Assign students to beds and manage hostel residents</p></div>

                <div className="flex gap-2 mb-6">
                    {[{ key: "allocate", label: "Allocate Bed" }, { key: "current", label: `Current Residents (${allocations.length})` }].map(t => (
                        <button key={t.key} onClick={() => setTab(t.key as any)} className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wide border transition-all ${tab === t.key ? "bg-[#5C67F2] text-white border-[#5C67F2]" : "bg-white text-slate-500 border-slate-100 hover:border-slate-200"}`}>{t.label}</button>
                    ))}
                </div>

                {/* Allocate tab */}
                {tab === "allocate" && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            {/* Student search */}
                            <div className="bg-white p-7 rounded-[2rem] border border-slate-100 shadow-sm relative">
                                <div className="absolute -top-3 left-6 bg-[#5C67F2] text-white text-[9px] px-3 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Select Student*</div>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                    <input type="text" value={studentSearch} onChange={e => { setStudentSearch(e.target.value); if (selectedStudent) setSelectedStudent(null); }} placeholder="Type student name or admission no..." className="w-full h-11 pl-12 pr-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700" />
                                </div>
                                {filteredStudents.length > 0 && !selectedStudent && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-slate-100 shadow-xl z-50 overflow-hidden max-h-52 overflow-y-auto">
                                        {filteredStudents.map((s: any) => { const name = s.studentName || `${s.firstName || ""} ${s.lastName || ""}`; return <div key={s._id} onClick={() => { setSelectedStudent(s); setStudentSearch(name); }} className="px-4 py-3 hover:bg-slate-50 cursor-pointer border-b border-slate-50"><p className="text-xs font-black text-slate-700 uppercase">{name}</p><p className="text-[9px] text-slate-400 font-bold uppercase">{s.registrationNo} · {s.studentClass || s.currentClass}</p></div>; })}
                                    </div>
                                )}
                                {selectedStudent && <div className="mt-3 flex items-center gap-3 p-3 bg-indigo-50 rounded-2xl border border-indigo-100">
                                    <div className="w-9 h-9 rounded-xl bg-[#5C67F2] flex items-center justify-center text-white font-black text-sm">{(selectedStudent.studentName || "?")[0]}</div>
                                    <div><p className="text-xs font-black text-slate-800">{selectedStudent.studentName || `${selectedStudent.firstName} ${selectedStudent.lastName}`}</p><p className="text-[9px] text-slate-500 font-bold uppercase">{selectedStudent.registrationNo} · {selectedStudent.studentClass}</p></div>
                                    <button onClick={() => { setSelectedStudent(null); setStudentSearch(""); }} className="ml-auto text-slate-300 hover:text-rose-500"><X className="w-4 h-4" /></button>
                                </div>}
                            </div>

                            {/* Room + bed selector */}
                            <div className="bg-white p-7 rounded-[2rem] border border-slate-100 shadow-sm space-y-5">
                                <div className="relative">
                                    <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Select Room*</div>
                                    <select value={selectedRoom} onChange={e => { setSelectedRoom(e.target.value); setSelectedBed(null); }} className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700">
                                        <option value="">— Select Room —</option>
                                        {rooms.map((r: any) => <option key={r._id} value={r._id}>{r.hostelName} · Room {r.roomNumber} ({r.type})</option>)}
                                    </select>
                                </div>
                                {selectedRoom && (
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Available Beds ({availableBeds.length})</p>
                                        {availableBeds.length === 0 ? <p className="text-slate-400 text-xs font-bold uppercase text-center py-4 flex items-center gap-2 justify-center"><AlertTriangle className="w-4 h-4 text-amber-500" />Room is full — no available beds</p>
                                        : <div className="grid grid-cols-4 gap-2">
                                            {availableBeds.map((b: any) => (
                                                <button key={b._id} onClick={() => setSelectedBed(selectedBed?._id === b._id ? null : b)}
                                                    className={`flex flex-col items-center gap-1 p-3 rounded-2xl border-2 transition-all ${selectedBed?._id === b._id ? "border-[#5C67F2] bg-indigo-50" : "border-slate-100 bg-slate-50 hover:border-indigo-200"}`}>
                                                    <Bed className={`w-5 h-5 ${selectedBed?._id === b._id ? "text-[#5C67F2]" : "text-slate-400"}`} />
                                                    <span className="text-[9px] font-black uppercase">{b.bedNumber}</span>
                                                </button>
                                            ))}
                                        </div>}
                                    </div>
                                )}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="relative">
                                        <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Hostel Fee (KSh)</div>
                                        <input type="number" value={fee} onChange={e => setFee(e.target.value)} placeholder="0" className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700" />
                                    </div>
                                    <div className="relative">
                                        <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Notes</div>
                                        <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional..." className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700" />
                                    </div>
                                </div>
                                <button onClick={() => {
                                    if (!selectedStudent || !selectedBed) { toast.error("Select student and bed"); return; }
                                    const r = rooms.find((r: any) => r._id === selectedRoom);
                                    allocMut.mutate({ studentId: selectedStudent._id, studentName: selectedStudent.studentName || `${selectedStudent.firstName} ${selectedStudent.lastName}`, admissionNo: selectedStudent.registrationNo || "", studentClass: selectedStudent.studentClass || "", bedId: selectedBed._id, roomId: selectedRoom, roomNumber: r?.roomNumber || "", hostelId: r?.hostelId || "", hostelName: r?.hostelName || "", fee: Number(fee) || 0, notes });
                                }} disabled={allocMut.isPending || !selectedStudent || !selectedBed}
                                    className="w-full h-12 bg-[#5C67F2] hover:bg-indigo-600 disabled:opacity-40 text-white font-black text-xs uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 transition-all">
                                    {allocMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                    Confirm Allocation
                                </button>
                            </div>
                        </div>

                        {/* Summary panel */}
                        <div className="bg-white p-7 rounded-[2rem] border border-slate-100 shadow-sm">
                            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-4">Allocation Summary</h3>
                            {selectedStudent && selectedBed ? (
                                <div className="space-y-4">
                                    {[
                                        { label: "Student", value: selectedStudent.studentName || `${selectedStudent.firstName} ${selectedStudent.lastName}` },
                                        { label: "Admission No", value: selectedStudent.registrationNo || "—" },
                                        { label: "Class", value: selectedStudent.studentClass || "—" },
                                        { label: "Room", value: room ? `${room.hostelName} · Room ${room.roomNumber}` : "—" },
                                        { label: "Bed", value: `Bed ${selectedBed.bedNumber}` },
                                        { label: "Fee", value: fee ? `KSh ${Number(fee).toLocaleString()}` : "Not set" },
                                    ].map(f => (
                                        <div key={f.label} className="flex justify-between border-b border-slate-50 pb-2">
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{f.label}</span>
                                            <span className="text-xs font-black text-slate-800">{f.value}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-slate-300 text-xs font-bold uppercase text-center py-12">Select student and bed to see summary</p>
                            )}
                        </div>
                    </div>
                )}

                {/* Current residents tab */}
                {tab === "current" && (
                    <>
                        <div className="flex gap-4 mb-4">
                            <div className="relative flex-1 max-w-sm">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input value={searchFilter} onChange={e => setSearchFilter(e.target.value)} placeholder="Search student or room..." className="w-full h-11 pl-12 pr-4 bg-white border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700 shadow-sm" />
                            </div>
                            <button onClick={() => refetch()} className="p-3 bg-white border border-slate-100 rounded-xl shadow-sm hover:bg-slate-50"><RefreshCw className="w-4 h-4 text-slate-500" /></button>
                        </div>
                        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-6">
                            {loadA ? <div className="flex items-center justify-center h-32 gap-2 text-slate-400 text-xs font-bold uppercase"><Loader2 className="w-5 h-5 animate-spin text-[#5C67F2]" />Loading...</div>
                            : filteredAllocs.length === 0 ? <div className="flex flex-col items-center justify-center h-32 gap-2 text-slate-300 text-xs font-bold uppercase"><User className="w-8 h-8" />No active allocations</div>
                            : <div className="overflow-x-auto"><table className="w-full text-left border-collapse text-xs">
                                <thead><tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                                    {["Student", "Adm No", "Class", "Hostel", "Room", "Bed", "Since", "Fee", "Actions"].map(h => <th key={h} className="py-4 px-4">{h}</th>)}
                                </tr></thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredAllocs.map((a: any) => (
                                        <tr key={a._id} className="hover:bg-slate-50/50">
                                            <td className="py-3 px-4 font-black text-slate-800">{a.studentName}</td>
                                            <td className="py-3 px-4 font-bold text-slate-500">{a.admissionNo || "—"}</td>
                                            <td className="py-3 px-4 font-bold text-slate-600">{a.studentClass || "—"}</td>
                                            <td className="py-3 px-4 font-bold text-slate-600">{a.hostelName || "—"}</td>
                                            <td className="py-3 px-4 font-bold text-slate-800">Room {a.roomNumber}</td>
                                            <td className="py-3 px-4 font-bold text-slate-800">Bed {a.bedNumber}</td>
                                            <td className="py-3 px-4 font-bold text-slate-500">{a.allocationDate || "—"}</td>
                                            <td className="py-3 px-4 font-bold text-[#5C67F2]">{a.fee ? `KSh ${Number(a.fee).toLocaleString()}` : "—"}</td>
                                            <td className="py-3 px-4">
                                                {confirmVacate === a._id ? (
                                                    <div className="flex gap-1"><button onClick={() => vacateMut.mutate(a._id)} className="h-8 px-3 bg-rose-500 text-white font-black text-[9px] uppercase rounded-xl flex items-center gap-1">{vacateMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}Confirm</button><button onClick={() => setConfirmVacate(null)} className="h-8 px-3 bg-slate-100 text-slate-500 font-black text-[9px] uppercase rounded-xl">Cancel</button></div>
                                                ) : (
                                                    <button onClick={() => setConfirmVacate(a._id)} className="h-8 px-3 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 font-black text-[9px] uppercase rounded-xl transition-colors">Vacate</button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table></div>}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
