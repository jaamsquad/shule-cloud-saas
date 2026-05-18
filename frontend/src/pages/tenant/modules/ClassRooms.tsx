import { useState } from "react";
import { Plus, Trash2, Home, Loader2, Filter } from "lucide-react";
import { useItems } from "@/hooks/useItems";
import { toast } from "sonner";

export default function ClassRooms() {
    const { items: rooms, isLoading, createItem, deleteItem } = useItems("rooms");
    const { items: classes } = useItems("classes");
    const [formData, setFormData] = useState({ name: "", capacity: 30, type: "CLASSROOM", building: "A", floor: 1 });
    const [filterType, setFilterType] = useState("");
    const [filterBuilding, setFilterBuilding] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [deletingRoomId, setDeletingRoomId] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name) {
            toast.error("Please select a class for the room name");
            return;
        }
        setSubmitting(true);
        try {
            await createItem(formData);
            toast.success("Room added successfully");
            setFormData({ name: "", capacity: 30, type: "CLASSROOM", building: "A", floor: 1 });
        } catch (e) {
            toast.error("Failed to add room");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        setDeletingRoomId(id);
    };

    const confirmDelete = async () => {
        if (!deletingRoomId) return;
        try {
            await deleteItem(deletingRoomId);
            toast.success("Room deleted");
        } catch (e) {
            toast.error("Failed to delete room");
        } finally {
            setDeletingRoomId(null);
        }
    };

    const filteredRooms = rooms?.filter((r: any) => {
        if (filterType && r.type !== filterType) return false;
        if (filterBuilding && r.building !== filterBuilding) return false;
        return true;
    });

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-center justify-between">
                <div className="flex items-center gap-2 text-[#5C67F2] font-semibold">
                    <Filter className="w-4 h-4" />
                    <span className="text-sm">Filter Rooms</span>
                </div>
                <div className="flex gap-4">
                    <select
                        value={filterType}
                        onChange={e => setFilterType(e.target.value)}
                        className="h-10 px-3 border border-gray-200 rounded-lg text-sm bg-white"
                    >
                        <option value="">All Types</option>
                        <option value="CLASSROOM">Classroom</option>
                        <option value="SCIENCE_LAB">Science Lab</option>
                        <option value="COMPUTER_LAB">Computer Lab</option>
                        <option value="HALL">Hall</option>
                        <option value="LIBRARY">Library</option>
                    </select>

                    <select
                        value={filterBuilding}
                        onChange={e => setFilterBuilding(e.target.value)}
                        className="h-10 px-3 border border-gray-200 rounded-lg text-sm bg-white"
                    >
                        <option value="">All Buildings</option>
                        <option value="A">Building A</option>
                        <option value="B">Building B</option>
                        <option value="C">Building C</option>
                        <option value="D">Building D</option>
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Form to add */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-fit space-y-4">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <Plus className="w-5 h-5 text-[#5C67F2]" /> Add Class Room
                    </h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Room Name (Assigned Class)</label>
                            <select required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full h-10 px-3 border border-gray-200 rounded-lg focus:border-[#5C67F2] outline-none text-sm bg-white">
                                <option value="" disabled>Select Class</option>
                                {classes?.map((c: any) => {
                                    const fullClassName = c.levelName ? `${c.levelName} ${c.streamName !== 'General' && c.streamName ? c.streamName : ''}`.trim() : (c.name || "Class");
                                    return <option key={c._id} value={fullClassName}>{fullClassName}</option>;
                                })}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Capacity</label>
                            <input required type="number" value={formData.capacity} onChange={e => setFormData({...formData, capacity: parseInt(e.target.value) || 0})} className="w-full h-10 px-3 border border-gray-200 rounded-lg focus:border-[#5C67F2] outline-none text-sm" />
                        </div>
                        <div>
                            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Room Type</label>
                            <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full h-10 px-3 border border-gray-200 rounded-lg focus:border-[#5C67F2] outline-none text-sm bg-white">
                                <option value="CLASSROOM">Classroom</option>
                                <option value="SCIENCE_LAB">Science Lab</option>
                                <option value="COMPUTER_LAB">Computer Lab</option>
                                <option value="HALL">Hall</option>
                                <option value="LIBRARY">Library</option>
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Building</label>
                                <select value={formData.building} onChange={e => setFormData({...formData, building: e.target.value})} className="w-full h-10 px-3 border border-gray-200 rounded-lg focus:border-[#5C67F2] outline-none text-sm bg-white">
                                    <option value="A">Building A</option>
                                    <option value="B">Building B</option>
                                    <option value="C">Building C</option>
                                    <option value="D">Building D</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Floor</label>
                                <input required type="number" value={formData.floor} onChange={e => setFormData({...formData, floor: parseInt(e.target.value) || 0})} className="w-full h-10 px-3 border border-gray-200 rounded-lg focus:border-[#5C67F2] outline-none text-sm" />
                            </div>
                        </div>
                        <button disabled={submitting} type="submit" className="w-full h-10 bg-[#5C67F2] hover:bg-[#4b54db] text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-70 text-sm">
                            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            Add Room
                        </button>
                    </form>
                </div>

                {/* Grid showing rooms */}
                <div className="lg:col-span-2">
                    {isLoading ? (
                        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#5C67F2]" /></div>
                    ) : filteredRooms?.length === 0 ? (
                        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm">
                            <Home className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-gray-900 font-bold">No Rooms Found</h3>
                            <p className="text-gray-500 text-sm mt-1">Add class rooms or adjust filters to view rooms.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {filteredRooms?.map((r: any) => (
                                <div key={r._id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between group hover:shadow-md transition-shadow relative">
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-start">
                                            <h4 className="font-bold text-gray-900 text-lg">{r.name}</h4>
                                            <span className="text-[10px] font-black tracking-widest uppercase bg-indigo-50 text-[#5C67F2] px-2.5 py-1 rounded-md">
                                                {r.type.replace("_", " ")}
                                            </span>
                                        </div>
                                        <div className="space-y-1 text-sm text-gray-500 font-medium">
                                            <p>Building: <span className="font-bold text-gray-800">{r.building}</span></p>
                                            <p>Floor: <span className="font-bold text-gray-800">{r.floor}</span></p>
                                            <p>Capacity: <span className="font-bold text-gray-800">{r.capacity} pax</span></p>
                                        </div>
                                    </div>
                                    <div className="flex justify-end pt-4 border-t border-gray-50 mt-4">
                                        <button onClick={() => handleDelete(r._id)} className="text-red-400 hover:text-red-600 transition-colors p-1.5 rounded-lg hover:bg-red-50 flex items-center gap-1.5 text-xs font-bold">
                                            <Trash2 className="w-4 h-4" /> Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Delete Confirmation Modal ─────────────────────────────── */}
            {deletingRoomId && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl p-6 text-center space-y-4">
                        <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto">
                            <Trash2 className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="font-bold text-gray-900 text-lg">Confirm Delete</h3>
                            <p className="text-sm text-gray-500 font-medium">Are you sure you want to delete this room? This action cannot be undone.</p>
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button 
                                onClick={() => setDeletingRoomId(null)} 
                                className="flex-1 h-11 rounded-full border border-gray-200 text-sm font-bold text-gray-500 hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={confirmDelete} 
                                className="flex-1 h-11 rounded-full bg-red-500 hover:bg-red-600 text-sm font-bold text-white shadow-md transition-colors"
                            >
                                Yes, Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
