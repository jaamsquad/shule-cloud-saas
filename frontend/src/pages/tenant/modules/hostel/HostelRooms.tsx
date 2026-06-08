import { useState } from "react";
import { Home, Plus, Pencil, Trash2, Check, X, Loader2, Building2, Search } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";

const emptyHostel = { name: "", block: "", totalFloors: "1", capacity: "", gender: "Mixed", description: "", isActive: true };
const emptyRoom = { hostelId: "", hostelName: "", roomNumber: "", floor: "1", type: "Double", capacity: "2", gender: "Mixed", amenities: "", isActive: true };

export default function HostelRooms() {
    const [activeTab, setActiveTab] = useState<"hostels" | "rooms">("hostels");
    const [hostelForm, setHostelForm] = useState(emptyHostel);
    const [roomForm, setRoomForm] = useState(emptyRoom);
    const [hostelEditId, setHostelEditId] = useState<string | null>(null);
    const [roomEditId, setRoomEditId] = useState<string | null>(null);
    const [showHostelModal, setShowHostelModal] = useState(false);
    const [showRoomModal, setShowRoomModal] = useState(false);
    const [search, setSearch] = useState("");
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    const qc = useQueryClient();

    const { data: hostels = [], isLoading: loadH } = useQuery({ queryKey: ["hostels"], queryFn: async () => { const r = await api.get("/hostels"); return Array.isArray(r.data) ? r.data : []; } });
    const { data: rooms = [], isLoading: loadR } = useQuery({ queryKey: ["hostel_rooms"], queryFn: async () => { const r = await api.get("/hostel_rooms"); return Array.isArray(r.data) ? r.data : []; } });

    const hostelMut = useMutation({
        mutationFn: (p: any) => hostelEditId ? api.patch(`/hostels/${hostelEditId}`, p) : api.post("/hostels", p),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["hostels"] }); qc.invalidateQueries({ queryKey: ["hostel_stats"] }); toast.success(hostelEditId ? "Hostel updated" : "Hostel block added"); setShowHostelModal(false); setHostelForm(emptyHostel); setHostelEditId(null); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });

    const roomMut = useMutation({
        mutationFn: (p: any) => roomEditId ? api.patch(`/hostel_rooms/${roomEditId}`, p) : api.post("/hostel_rooms", p),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["hostel_rooms"] }); qc.invalidateQueries({ queryKey: ["hostel_stats"] }); toast.success(roomEditId ? "Room updated" : "Room added"); setShowRoomModal(false); setRoomForm(emptyRoom); setRoomEditId(null); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });

    const delMut = useMutation({
        mutationFn: ({ id, col }: { id: string; col: string }) => api.delete(`/${col}/${id}`),
        onSuccess: (_: any, { col }: any) => { qc.invalidateQueries({ queryKey: [col === "hostels" ? "hostels" : "hostel_rooms"] }); toast.success("Deleted"); setConfirmDelete(null); },
    });

    const filteredRooms = rooms.filter((r: any) => !search || (r.roomNumber || "").toLowerCase().includes(search.toLowerCase()) || (r.hostelName || "").toLowerCase().includes(search.toLowerCase()));

    const ROOM_COLORS: Record<string, string> = { Single: "bg-blue-50 text-blue-600", Double: "bg-indigo-50 text-indigo-600", Triple: "bg-purple-50 text-purple-600", Dormitory: "bg-amber-50 text-amber-600" };

    return (
        <div className="flex-1 bg-[#F8FAFC] min-h-screen flex flex-col pb-20 font-sans">
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-2 text-sm">
                    <Home className="w-4 h-4 text-[#5C67F2]" /><span className="text-gray-300">/</span>
                    <span className="font-bold text-gray-600">Hostel</span><span className="text-gray-300">/</span>
                    <span className="font-black text-[#5C67F2]">Rooms & Blocks</span>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => { setHostelEditId(null); setHostelForm(emptyHostel); setShowHostelModal(true); }} className="h-9 px-4 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-black text-xs uppercase tracking-widest rounded-xl flex items-center gap-2">
                        <Plus className="w-3.5 h-3.5" /> New Block
                    </button>
                    <button onClick={() => { setRoomEditId(null); setRoomForm(emptyRoom); setShowRoomModal(true); }} className="h-9 px-4 bg-[#5C67F2] hover:bg-indigo-600 text-white font-black text-xs uppercase tracking-widest rounded-xl flex items-center gap-2 shadow-md shadow-indigo-100">
                        <Plus className="w-3.5 h-3.5" /> New Room
                    </button>
                </div>
            </div>

            <div className="flex-1 max-w-7xl mx-auto w-full px-6 pt-8">
                <div className="mb-6"><h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Rooms & Hostel Blocks</h1>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-1">Manage hostel buildings, floors, and individual rooms</p></div>

                <div className="flex gap-2 mb-6">
                    {[{ key: "hostels", label: `Hostel Blocks (${hostels.length})` }, { key: "rooms", label: `Rooms (${rooms.length})` }].map(t => (
                        <button key={t.key} onClick={() => setActiveTab(t.key as any)} className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wide border transition-all ${activeTab === t.key ? "bg-[#5C67F2] text-white border-[#5C67F2]" : "bg-white text-slate-500 border-slate-100 hover:border-slate-200"}`}>{t.label}</button>
                    ))}
                </div>

                {/* Hostel blocks tab */}
                {activeTab === "hostels" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {loadH ? <div className="col-span-full flex items-center justify-center h-32 gap-2 text-slate-400 text-xs font-bold uppercase"><Loader2 className="w-5 h-5 animate-spin text-[#5C67F2]" />Loading...</div>
                        : hostels.length === 0 ? <div className="col-span-full flex flex-col items-center justify-center h-32 gap-2 text-slate-300 text-xs font-bold uppercase"><Building2 className="w-8 h-8" />No hostel blocks yet</div>
                        : hostels.map((h: any) => (
                            <div key={h._id} className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center"><Building2 className="w-5 h-5 text-[#5C67F2]" /></div>
                                        <div>
                                            <p className="font-black text-slate-800">{h.name}</p>
                                            {h.block && <p className="text-[9px] text-slate-400 font-bold uppercase">Block: {h.block}</p>}
                                        </div>
                                    </div>
                                    <div className="flex gap-1.5">
                                        <button onClick={() => { setHostelEditId(h._id); setHostelForm({ name: h.name, block: h.block || "", totalFloors: String(h.totalFloors || 1), capacity: String(h.capacity || ""), gender: h.gender || "Mixed", description: h.description || "", isActive: h.isActive !== false }); setShowHostelModal(true); }} className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-amber-50 text-slate-400 hover:text-amber-500 flex items-center justify-center border border-slate-100"><Pencil className="w-3.5 h-3.5" /></button>
                                        {confirmDelete === h._id ? (<><button onClick={() => delMut.mutate({ id: h._id, col: "hostels" })} className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center"><Check className="w-3.5 h-3.5" /></button><button onClick={() => setConfirmDelete(null)} className="w-8 h-8 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center"><X className="w-3.5 h-3.5" /></button></>) : (<button onClick={() => setConfirmDelete(h._id)} className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-500 flex items-center justify-center border border-slate-100"><Trash2 className="w-3.5 h-3.5" /></button>)}
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-center">
                                    {[{ label: "Floors", value: h.totalFloors || 1 }, { label: "Capacity", value: h.capacity || "—" }, { label: "Gender", value: h.gender || "Mixed" }].map(s => (
                                        <div key={s.label} className="bg-slate-50 rounded-xl p-2">
                                            <p className="text-[8px] text-slate-400 font-black uppercase">{s.label}</p>
                                            <p className="text-xs font-black text-slate-700 mt-0.5">{s.value}</p>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-3 text-[9px] font-black text-slate-500 uppercase">
                                    {rooms.filter((r: any) => r.hostelId === h._id).length} rooms · {h.isActive !== false ? <span className="text-emerald-600">Active</span> : <span className="text-slate-400">Inactive</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Rooms tab */}
                {activeTab === "rooms" && (
                    <>
                        <div className="relative mb-4 max-w-sm">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search room number or hostel..." className="w-full h-11 pl-12 pr-4 bg-white border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700 shadow-sm" />
                        </div>
                        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-6">
                            {loadR ? <div className="flex items-center justify-center h-32 gap-2 text-slate-400 text-xs font-bold uppercase"><Loader2 className="w-5 h-5 animate-spin text-[#5C67F2]" />Loading...</div>
                            : filteredRooms.length === 0 ? <div className="flex flex-col items-center justify-center h-32 gap-2 text-slate-300 text-xs font-bold uppercase"><Building2 className="w-8 h-8" />No rooms found</div>
                            : <div className="overflow-x-auto"><table className="w-full text-left border-collapse text-xs">
                                <thead><tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                                    {["Room No", "Hostel / Block", "Floor", "Type", "Capacity", "Gender", "Status", "Actions"].map(h => <th key={h} className="py-4 px-4">{h}</th>)}
                                </tr></thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredRooms.map((r: any) => (
                                        <tr key={r._id} className="hover:bg-slate-50/50">
                                            <td className="py-3 px-4 font-black text-slate-800">Room {r.roomNumber}</td>
                                            <td className="py-3 px-4 font-bold text-slate-600">{r.hostelName || "—"}</td>
                                            <td className="py-3 px-4 font-bold text-slate-500">Floor {r.floor || 1}</td>
                                            <td className="py-3 px-4"><span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase ${ROOM_COLORS[r.type] || "bg-slate-100 text-slate-500"}`}>{r.type}</span></td>
                                            <td className="py-3 px-4 text-center font-black text-slate-800">{r.capacity || "—"}</td>
                                            <td className="py-3 px-4 font-bold text-slate-600">{r.gender || "Mixed"}</td>
                                            <td className="py-3 px-4"><span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase ${r.isActive !== false ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"}`}>{r.isActive !== false ? "Active" : "Inactive"}</span></td>
                                            <td className="py-3 px-4">
                                                <div className="flex gap-1.5">
                                                    <button onClick={() => { setRoomEditId(r._id); setRoomForm({ hostelId: r.hostelId || "", hostelName: r.hostelName || "", roomNumber: r.roomNumber, floor: String(r.floor || 1), type: r.type || "Double", capacity: String(r.capacity || 2), gender: r.gender || "Mixed", amenities: r.amenities || "", isActive: r.isActive !== false }); setShowRoomModal(true); }} className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-amber-50 text-slate-400 hover:text-amber-500 flex items-center justify-center border border-slate-100"><Pencil className="w-3.5 h-3.5" /></button>
                                                    {confirmDelete === r._id ? (<><button onClick={() => delMut.mutate({ id: r._id, col: "hostel_rooms" })} className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center"><Check className="w-3.5 h-3.5" /></button><button onClick={() => setConfirmDelete(null)} className="w-8 h-8 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center"><X className="w-3.5 h-3.5" /></button></>) : (<button onClick={() => setConfirmDelete(r._id)} className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-500 flex items-center justify-center border border-slate-100"><Trash2 className="w-3.5 h-3.5" /></button>)}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table></div>}
                        </div>
                    </>
                )}
            </div>

            {/* Hostel Block Modal */}
            {showHostelModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white max-w-lg w-full rounded-[2.5rem] border border-slate-100 shadow-2xl relative">
                        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-t-[2.5rem]" />
                        <div className="p-8">
                            <div className="flex items-center justify-between mb-6"><h3 className="text-lg font-black text-slate-900 uppercase">{hostelEditId ? "Edit" : "Add"} Hostel Block</h3><button onClick={() => setShowHostelModal(false)} className="text-slate-400 hover:text-rose-500"><X className="w-5 h-5" /></button></div>
                            <div className="grid grid-cols-2 gap-5">
                                {[{ label: "Block Name*", field: "name", col: 2 }, { label: "Block Letter/Code", field: "block" }, { label: "Total Floors", field: "totalFloors", type: "number" }, { label: "Total Capacity (beds)", field: "capacity", type: "number" }].map((f: any) => (
                                    <div key={f.field} className={`relative ${f.col === 2 ? "col-span-2" : ""}`}>
                                        <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">{f.label}</div>
                                        <input type={f.type || "text"} value={(hostelForm as any)[f.field]} onChange={e => setHostelForm({ ...hostelForm, [f.field]: e.target.value })} className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700" />
                                    </div>
                                ))}
                                <div className="relative">
                                    <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Gender</div>
                                    <select value={hostelForm.gender} onChange={e => setHostelForm({ ...hostelForm, gender: e.target.value })} className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700">
                                        {["Male", "Female", "Mixed"].map(g => <option key={g}>{g}</option>)}
                                    </select>
                                </div>
                                <div className="relative">
                                    <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Description</div>
                                    <input type="text" value={hostelForm.description} onChange={e => setHostelForm({ ...hostelForm, description: e.target.value })} className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700" />
                                </div>
                                <div className="col-span-2 flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Active</span>
                                    <button onClick={() => setHostelForm({ ...hostelForm, isActive: !hostelForm.isActive })} className={`w-11 h-6 rounded-full transition-all relative ${hostelForm.isActive ? "bg-[#5C67F2]" : "bg-slate-200"}`}><div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${hostelForm.isActive ? "right-0.5" : "left-0.5"}`} /></button>
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button onClick={() => setShowHostelModal(false)} className="px-6 py-2.5 hover:bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded-xl">Cancel</button>
                                <button onClick={() => { if (!hostelForm.name.trim()) { toast.error("Name required"); return; } hostelMut.mutate({ ...hostelForm, totalFloors: Number(hostelForm.totalFloors) || 1, capacity: Number(hostelForm.capacity) || 0 }); }} disabled={hostelMut.isPending} className="px-6 py-2.5 bg-[#5C67F2] hover:bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-100">
                                    {hostelMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}{hostelEditId ? "Save" : "Add Block"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Room Modal */}
            {showRoomModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white max-w-lg w-full rounded-[2.5rem] border border-slate-100 shadow-2xl relative">
                        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 rounded-t-[2.5rem]" />
                        <div className="p-8">
                            <div className="flex items-center justify-between mb-6"><h3 className="text-lg font-black text-slate-900 uppercase">{roomEditId ? "Edit" : "Add"} Room</h3><button onClick={() => setShowRoomModal(false)} className="text-slate-400 hover:text-rose-500"><X className="w-5 h-5" /></button></div>
                            <div className="grid grid-cols-2 gap-5">
                                <div className="relative col-span-2">
                                    <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Hostel Block</div>
                                    <select value={roomForm.hostelId} onChange={e => { const h = hostels.find((h: any) => h._id === e.target.value); setRoomForm({ ...roomForm, hostelId: e.target.value, hostelName: h?.name || "" }); }} className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700">
                                        <option value="">— Select Hostel Block —</option>
                                        {hostels.map((h: any) => <option key={h._id} value={h._id}>{h.name}</option>)}
                                    </select>
                                </div>
                                {[{ label: "Room Number*", field: "roomNumber" }, { label: "Floor", field: "floor", type: "number" }, { label: "Capacity (beds)", field: "capacity", type: "number" }].map((f: any) => (
                                    <div key={f.field} className="relative">
                                        <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">{f.label}</div>
                                        <input type={f.type || "text"} value={(roomForm as any)[f.field]} onChange={e => setRoomForm({ ...roomForm, [f.field]: e.target.value })} className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700" />
                                    </div>
                                ))}
                                <div className="relative">
                                    <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Room Type</div>
                                    <select value={roomForm.type} onChange={e => setRoomForm({ ...roomForm, type: e.target.value })} className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700">
                                        {["Single", "Double", "Triple", "Quad", "Dormitory"].map(t => <option key={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div className="relative">
                                    <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Gender</div>
                                    <select value={roomForm.gender} onChange={e => setRoomForm({ ...roomForm, gender: e.target.value })} className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700">
                                        {["Male", "Female", "Mixed"].map(g => <option key={g}>{g}</option>)}
                                    </select>
                                </div>
                                <div className="relative col-span-2">
                                    <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Amenities (e.g. AC, WiFi)</div>
                                    <input type="text" value={roomForm.amenities} onChange={e => setRoomForm({ ...roomForm, amenities: e.target.value })} placeholder="e.g. WiFi, AC, Attached Bathroom" className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700" />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button onClick={() => setShowRoomModal(false)} className="px-6 py-2.5 hover:bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded-xl">Cancel</button>
                                <button onClick={() => { if (!roomForm.roomNumber.trim()) { toast.error("Room number required"); return; } roomMut.mutate({ ...roomForm, floor: Number(roomForm.floor) || 1, capacity: Number(roomForm.capacity) || 2 }); }} disabled={roomMut.isPending} className="px-6 py-2.5 bg-[#5C67F2] hover:bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-100">
                                    {roomMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}{roomEditId ? "Save" : "Add Room"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
