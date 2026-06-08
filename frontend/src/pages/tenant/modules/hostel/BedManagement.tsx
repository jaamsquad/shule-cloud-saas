import { useState } from "react";
import { Home, Plus, Bed, Check, X, Loader2, RefreshCw } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";

export default function BedManagement() {
    const [selectedRoom, setSelectedRoom] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ roomId: "", roomNumber: "", hostelId: "", hostelName: "", bedNumber: "", isOccupied: false });
    const [editId, setEditId] = useState<string | null>(null);
    const qc = useQueryClient();

    const { data: rooms = [] } = useQuery({ queryKey: ["hostel_rooms"], queryFn: async () => { const r = await api.get("/hostel_rooms"); return Array.isArray(r.data) ? r.data : []; } });
    const { data: beds = [], isLoading, refetch } = useQuery({ queryKey: ["hostel_beds", selectedRoom], queryFn: async () => { const url = selectedRoom ? `/hostel_beds?roomId=${selectedRoom}` : "/hostel_beds"; const r = await api.get(url); return Array.isArray(r.data) ? r.data : []; } });

    const saveMut = useMutation({
        mutationFn: (p: any) => editId ? api.patch(`/hostel_beds/${editId}`, p) : api.post("/hostel_beds", p),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["hostel_beds"] }); qc.invalidateQueries({ queryKey: ["hostel_stats"] }); toast.success(editId ? "Bed updated" : "Bed added"); setShowModal(false); setEditId(null); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });

    const bulkCreateMut = useMutation({
        mutationFn: async ({ roomId, roomNumber, hostelId, hostelName, count }: any) => {
            const existing = beds.filter((b: any) => b.roomId === roomId).length;
            const newBeds = Array.from({ length: count }, (_, i) => ({ roomId, roomNumber, hostelId, hostelName, bedNumber: String(existing + i + 1), isOccupied: false, createdAt: new Date() }));
            return api.post("/hostel_beds/bulk", { items: newBeds });
        },
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["hostel_beds"] }); qc.invalidateQueries({ queryKey: ["hostel_stats"] }); toast.success("Beds created"); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed to create beds"),
    });

    const [bulkCount, setBulkCount] = useState("1");

    const filteredBeds = selectedRoom ? beds.filter((b: any) => b.roomId === selectedRoom) : beds;
    const room = rooms.find((r: any) => r._id === selectedRoom);

    const occupied = filteredBeds.filter((b: any) => b.isOccupied).length;
    const available = filteredBeds.length - occupied;

    return (
        <div className="flex-1 bg-[#F8FAFC] min-h-screen flex flex-col pb-20 font-sans">
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-2 text-sm">
                    <Home className="w-4 h-4 text-[#5C67F2]" /><span className="text-gray-300">/</span>
                    <span className="font-bold text-gray-600">Hostel</span><span className="text-gray-300">/</span>
                    <span className="font-black text-[#5C67F2]">Bed Management</span>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => refetch()} className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50"><RefreshCw className="w-4 h-4 text-slate-500" /></button>
                    <button onClick={() => { setEditId(null); setForm({ roomId: selectedRoom, roomNumber: room?.roomNumber || "", hostelId: room?.hostelId || "", hostelName: room?.hostelName || "", bedNumber: String(filteredBeds.length + 1), isOccupied: false }); setShowModal(true); }} className="h-10 px-5 bg-[#5C67F2] hover:bg-indigo-600 text-white font-black text-xs uppercase tracking-widest rounded-xl flex items-center gap-2 shadow-md shadow-indigo-100">
                        <Plus className="w-4 h-4" /> Add Bed
                    </button>
                </div>
            </div>

            <div className="flex-1 max-w-7xl mx-auto w-full px-6 pt-8">
                <div className="mb-6"><h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Bed Management</h1>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-1">View and manage individual beds per room — track occupancy in real-time</p></div>

                <div className="flex flex-wrap gap-4 items-end mb-6">
                    <div className="relative w-72">
                        <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Filter by Room</div>
                        <select value={selectedRoom} onChange={e => setSelectedRoom(e.target.value)} className="w-full h-11 px-4 bg-white border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700 shadow-sm">
                            <option value="">— All Rooms —</option>
                            {rooms.map((r: any) => <option key={r._id} value={r._id}>{r.hostelName} · Room {r.roomNumber}</option>)}
                        </select>
                    </div>
                    {selectedRoom && room && (
                        <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-100 rounded-2xl px-4 py-2">
                            <p className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">Bulk Add Beds:</p>
                            <input type="number" value={bulkCount} onChange={e => setBulkCount(e.target.value)} min="1" max="50" className="w-16 h-8 px-3 bg-white border border-indigo-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none" />
                            <button onClick={() => bulkCreateMut.mutate({ roomId: selectedRoom, roomNumber: room.roomNumber, hostelId: room.hostelId, hostelName: room.hostelName, count: Number(bulkCount) || 1 })} disabled={bulkCreateMut.isPending} className="h-8 px-4 bg-indigo-600 text-white font-black text-[9px] uppercase rounded-xl flex items-center gap-1 hover:bg-indigo-700 transition-colors">
                                {bulkCreateMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}Add {bulkCount}
                            </button>
                        </div>
                    )}
                </div>

                {/* Stats */}
                {filteredBeds.length > 0 && (
                    <div className="grid grid-cols-3 gap-4 mb-6">
                        {[{ label: "Total Beds", value: filteredBeds.length, color: "text-[#5C67F2]" }, { label: "Occupied", value: occupied, color: "text-rose-600" }, { label: "Available", value: available, color: "text-emerald-600" }].map(s => (
                            <div key={s.label} className="bg-white p-4 rounded-[1.5rem] border border-slate-100 shadow-sm text-center">
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{s.label}</p>
                                <p className={`text-2xl font-black mt-1 ${s.color}`}>{s.value}</p>
                            </div>
                        ))}
                    </div>
                )}

                {/* Bed Grid */}
                {isLoading ? <div className="flex items-center justify-center h-40 gap-2 text-slate-400 text-xs font-bold uppercase"><Loader2 className="w-5 h-5 animate-spin text-[#5C67F2]" />Loading...</div>
                : filteredBeds.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 gap-3 text-slate-300 text-xs font-bold uppercase bg-white rounded-[2rem] border border-slate-100 shadow-sm">
                        <Bed className="w-10 h-10" />
                        {selectedRoom ? `No beds in this room yet — use "Add Bed" or "Bulk Add" above` : "Select a room or add beds"}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {filteredBeds.map((bed: any) => (
                            <div key={bed._id} onClick={() => { setEditId(bed._id); setForm({ roomId: bed.roomId || "", roomNumber: bed.roomNumber || "", hostelId: bed.hostelId || "", hostelName: bed.hostelName || "", bedNumber: bed.bedNumber, isOccupied: bed.isOccupied || false }); setShowModal(true); }}
                                className={`relative group rounded-2xl p-4 border-2 cursor-pointer transition-all hover:shadow-md ${bed.isOccupied ? "bg-rose-50 border-rose-200" : "bg-emerald-50 border-emerald-200 hover:border-emerald-300"}`}>
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2 ${bed.isOccupied ? "bg-rose-100" : "bg-emerald-100"}`}>
                                    <Bed className={`w-5 h-5 ${bed.isOccupied ? "text-rose-500" : "text-emerald-600"}`} />
                                </div>
                                <p className="text-center text-[10px] font-black text-slate-800 uppercase">Bed {bed.bedNumber}</p>
                                {bed.roomNumber && <p className="text-center text-[8px] text-slate-400 font-bold">Rm {bed.roomNumber}</p>}
                                <span className={`absolute top-2 right-2 w-2.5 h-2.5 rounded-full ${bed.isOccupied ? "bg-rose-400" : "bg-emerald-400"}`} />
                                {bed.isOccupied && bed.studentName && (
                                    <p className="text-center text-[8px] text-rose-600 font-black mt-1 truncate">{bed.studentName}</p>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                <div className="flex items-center gap-4 mt-4 text-[10px] font-black uppercase tracking-widest">
                    <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-emerald-400" /><span className="text-slate-500">Available</span></div>
                    <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-rose-400" /><span className="text-slate-500">Occupied</span></div>
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white max-w-sm w-full rounded-[2.5rem] border border-slate-100 shadow-2xl relative">
                        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-t-[2.5rem]" />
                        <div className="p-8">
                            <div className="flex items-center justify-between mb-6"><h3 className="text-lg font-black text-slate-900 uppercase">{editId ? "Edit Bed" : "Add Bed"}</h3><button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-rose-500"><X className="w-5 h-5" /></button></div>
                            <div className="space-y-5">
                                <div className="relative">
                                    <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Room</div>
                                    <select value={form.roomId} onChange={e => { const r = rooms.find((r: any) => r._id === e.target.value); setForm({ ...form, roomId: e.target.value, roomNumber: r?.roomNumber || "", hostelId: r?.hostelId || "", hostelName: r?.hostelName || "" }); }} className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700">
                                        <option value="">— Select Room —</option>
                                        {rooms.map((r: any) => <option key={r._id} value={r._id}>{r.hostelName} · Room {r.roomNumber}</option>)}
                                    </select>
                                </div>
                                <div className="relative">
                                    <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Bed Number*</div>
                                    <input type="text" value={form.bedNumber} onChange={e => setForm({ ...form, bedNumber: e.target.value })} placeholder="e.g. 1, A, Top" className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700" />
                                </div>
                                {editId && (
                                    <div className="flex items-center justify-between bg-slate-50 rounded-2xl px-4 py-3 border border-slate-100">
                                        <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Mark as Occupied</span>
                                        <button onClick={() => setForm({ ...form, isOccupied: !form.isOccupied })} className={`w-11 h-6 rounded-full transition-all relative ${form.isOccupied ? "bg-rose-500" : "bg-emerald-400"}`}><div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${form.isOccupied ? "right-0.5" : "left-0.5"}`} /></button>
                                    </div>
                                )}
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button onClick={() => setShowModal(false)} className="px-6 py-2.5 hover:bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded-xl">Cancel</button>
                                <button onClick={() => { if (!form.bedNumber.trim()) { toast.error("Bed number required"); return; } saveMut.mutate(form); }} disabled={saveMut.isPending} className="px-6 py-2.5 bg-[#5C67F2] hover:bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-100">
                                    {saveMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}{editId ? "Save" : "Add Bed"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
