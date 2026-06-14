import { useState } from "react";
import { Home, Search, Check, X, Loader2, Bed, User, RefreshCw, AlertTriangle, Users } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";

export default function RoomAllocation() {
    const qc = useQueryClient();
    const [tab, setTab] = useState<"allocate" | "current">("allocate");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [classFilter, setClassFilter] = useState("");
    const [streamFilter, setStreamFilter] = useState("");
    const [search, setSearch] = useState("");
    const [modalOpen, setModalOpen] = useState(false);
    const [modalRoomId, setModalRoomId] = useState("");
    const [notes, setNotes] = useState("");
    const [searchFilter, setSearchFilter] = useState("");
    const [confirmVacate, setConfirmVacate] = useState<string | null>(null);

    const { data: students = [] } = useQuery({ queryKey: ["students"], queryFn: async () => { const r = await api.get("/students"); return Array.isArray(r.data) ? r.data : []; } });
    const { data: rooms = [] } = useQuery({ queryKey: ["hostel_rooms"], queryFn: async () => { const r = await api.get("/hostel_rooms"); return Array.isArray(r.data) ? r.data : []; } });
    const { data: allocations = [], isLoading: loadA, refetch } = useQuery({ queryKey: ["hostel_allocations"], queryFn: async () => { const r = await api.get("/hostel_allocations?status=Active"); return Array.isArray(r.data) ? r.data : []; } });
    const { data: modalBeds = [] } = useQuery({ queryKey: ["hostel_beds_modal", modalRoomId], queryFn: async () => modalRoomId ? (await api.get(`/hostel_beds?roomId=${modalRoomId}`)).data || [] : [], enabled: !!modalRoomId });

    const bulkMut = useMutation({
        mutationFn: (p: any) => api.post("/hostel/allocate/bulk", p),
        onSuccess: (res: any) => {
            const d = res.data || {};
            qc.invalidateQueries({ queryKey: ["hostel_allocations"] }); qc.invalidateQueries({ queryKey: ["hostel_stats"] }); qc.invalidateQueries({ queryKey: ["hostel_beds_modal"] });
            toast.success(`${d.allocated ?? 0} allocated${d.skipped ? ` · ${d.skipped} already housed` : ""}${d.noBed ? ` · ${d.noBed} no free bed` : ""}`);
            setSelectedIds(new Set()); setModalOpen(false); setModalRoomId(""); setNotes(""); setTab("current");
        },
        onError: (e: any) => toast.error(e.response?.data?.message || "Allocation failed"),
    });

    const vacateMut = useMutation({
        mutationFn: (id: string) => api.patch(`/hostel/allocate/${id}/vacate`, {}),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["hostel_allocations"] }); qc.invalidateQueries({ queryKey: ["hostel_stats"] }); toast.success("Student vacated and bed freed"); setConfirmVacate(null); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });

    // ── Filters & selection ──────────────────────────────────────────────
    const nameOf = (s: any) => s.studentName || `${s.firstName || ""} ${s.lastName || ""}`.trim();
    const streamOf = (s: any) => s.stream || s.studentStream || "";
    const classes = Array.from(new Set(students.map((s: any) => s.studentClass).filter(Boolean))).sort();
    const streams = Array.from(new Set(students.map(streamOf).filter(Boolean))).sort();
    const allocatedIds = new Set(allocations.map((a: any) => String(a.studentId)));

    const visible = students.filter((s: any) => {
        if (classFilter && s.studentClass !== classFilter) return false;
        if (streamFilter && streamOf(s) !== streamFilter) return false;
        if (search) { const q = search.toLowerCase(); if (!nameOf(s).toLowerCase().includes(q) && !(s.registrationNo || "").toLowerCase().includes(q)) return false; }
        return true;
    });
    const toggle = (id: string) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    const selectable = visible.filter((s: any) => !allocatedIds.has(String(s._id)));
    const allSelected = selectable.length > 0 && selectable.every((s: any) => selectedIds.has(s._id));
    const toggleAll = () => setSelectedIds(prev => { const n = new Set(prev); if (allSelected) selectable.forEach((s: any) => n.delete(s._id)); else selectable.forEach((s: any) => n.add(s._id)); return n; });

    const modalRoom = rooms.find((r: any) => r._id === modalRoomId);
    const modalFree = (modalBeds as any[]).filter((b: any) => !b.isOccupied);
    const roomFee = Number(modalRoom?.fee ?? modalRoom?.hostelFee ?? modalRoom?.rent ?? 0);

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
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-1">Select students, then allocate them to a room & beds</p></div>

                <div className="flex gap-2 mb-6">
                    {[{ key: "allocate", label: "Allocate Bed" }, { key: "current", label: `Current Residents (${allocations.length})` }].map(t => (
                        <button key={t.key} onClick={() => setTab(t.key as any)} className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wide border transition-all ${tab === t.key ? "bg-[#5C67F2] text-white border-[#5C67F2]" : "bg-white text-slate-500 border-slate-100 hover:border-slate-200"}`}>{t.label}</button>
                    ))}
                </div>

                {/* ── Allocate tab: filterable multi-select student list ───────── */}
                {tab === "allocate" && (
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
                        {/* Filters */}
                        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center gap-3">
                            <div className="relative flex-1 min-w-[200px]">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or admission no…" className="w-full h-10 pl-10 pr-4 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-[#5C67F2]" />
                            </div>
                            <select value={classFilter} onChange={e => setClassFilter(e.target.value)} className="h-10 px-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-600 focus:outline-none focus:border-[#5C67F2]">
                                <option value="">All Classes</option>
                                {classes.map((c: any) => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <select value={streamFilter} onChange={e => setStreamFilter(e.target.value)} className="h-10 px-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-600 focus:outline-none focus:border-[#5C67F2]">
                                <option value="">All Streams</option>
                                {streams.map((s: any) => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <span className="text-[10px] font-black text-[#5C67F2] uppercase tracking-widest">{selectedIds.size} selected</span>
                        </div>

                        {/* Student table */}
                        <div className="overflow-x-auto max-h-[55vh] overflow-y-auto">
                            <table className="w-full text-sm">
                                <thead className="sticky top-0 bg-slate-50 z-10">
                                    <tr className="text-slate-500 text-[11px] uppercase tracking-wide">
                                        <th className="px-4 py-3 w-10"><input type="checkbox" checked={allSelected} onChange={toggleAll} className="w-4 h-4 accent-[#5C67F2]" /></th>
                                        <th className="text-left px-3 py-3 font-black">Student</th>
                                        <th className="text-left px-3 py-3 font-black">Adm No</th>
                                        <th className="text-left px-3 py-3 font-black">Class</th>
                                        <th className="text-left px-3 py-3 font-black">Stream</th>
                                        <th className="text-left px-3 py-3 font-black">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {visible.length === 0 ? (
                                        <tr><td colSpan={6} className="py-10 text-center text-slate-400 text-xs font-bold uppercase">No students match the filters</td></tr>
                                    ) : visible.map((s: any) => {
                                        const housed = allocatedIds.has(String(s._id));
                                        const checked = selectedIds.has(s._id);
                                        return (
                                            <tr key={s._id} onClick={() => !housed && toggle(s._id)} className={`border-b border-slate-50 ${housed ? "opacity-50" : "cursor-pointer hover:bg-slate-50/60"} ${checked ? "bg-indigo-50/40" : ""}`}>
                                                <td className="px-4 py-2.5"><input type="checkbox" disabled={housed} checked={checked} onChange={() => toggle(s._id)} onClick={e => e.stopPropagation()} className="w-4 h-4 accent-[#5C67F2]" /></td>
                                                <td className="px-3 py-2.5 font-bold text-slate-700">{nameOf(s)}</td>
                                                <td className="px-3 py-2.5 text-slate-500">{s.registrationNo || "—"}</td>
                                                <td className="px-3 py-2.5 text-slate-500">{s.studentClass || "—"}</td>
                                                <td className="px-3 py-2.5 text-slate-500">{streamOf(s) || "—"}</td>
                                                <td className="px-3 py-2.5">{housed ? <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Housed</span> : <span className="text-[10px] font-bold text-slate-400">Not housed</span>}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Allocate bar */}
                        <div className="p-4 border-t border-slate-100 flex items-center justify-between">
                            <p className="text-xs font-bold text-slate-400">{visible.length} students · {selectable.length} allocatable</p>
                            <button onClick={() => { if (selectedIds.size === 0) { toast.error("Select at least one student"); return; } setModalOpen(true); }}
                                className="h-11 px-6 bg-[#5C67F2] hover:bg-indigo-600 disabled:opacity-40 text-white font-black text-xs uppercase tracking-widest rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-100 transition-all" disabled={selectedIds.size === 0}>
                                <Users className="w-4 h-4" /> Allocate All Selected ({selectedIds.size})
                            </button>
                        </div>
                    </div>
                )}

                {/* ── Current residents tab (unchanged) ───────────────────────── */}
                {tab === "current" && (
                    <>
                        <div className="flex gap-4 mb-4">
                            <div className="relative flex-1 max-w-sm">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input value={searchFilter} onChange={e => setSearchFilter(e.target.value)} placeholder="Search student or room..." className="w-full h-11 pl-12 pr-4 bg-white border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700 shadow-sm" />
                            </div>
                            <button onClick={() => refetch()} className="p-3 bg-white border border-slate-100 rounded-xl shadow-sm hover:bg-slate-50"><RefreshCw className="w-4 h-4 text-slate-500" /></button>
                        </div>
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
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

            {/* ── Allocate modal (simple: room → beds) ─────────────────────── */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setModalOpen(false)}>
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 flex items-center justify-between" style={{ background: "#5C67F2" }}>
                            <div className="text-white"><p className="text-[10px] font-black uppercase tracking-widest opacity-80">Allocate</p><h3 className="font-black">{selectedIds.size} student(s) → a room</h3></div>
                            <button onClick={() => setModalOpen(false)} className="text-white/80 hover:text-white"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6 space-y-5">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Select Room</label>
                                <select value={modalRoomId} onChange={e => setModalRoomId(e.target.value)} className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:border-[#5C67F2]">
                                    <option value="">— Choose a room —</option>
                                    {rooms.map((r: any) => <option key={r._id} value={r._id}>{r.hostelName ? `${r.hostelName} · ` : ""}Room {r.roomNumber || r.name} {r.type ? `(${r.type})` : ""}</option>)}
                                </select>
                            </div>

                            {modalRoomId && (
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 flex items-center gap-2">
                                        <Bed className="w-5 h-5 text-[#5C67F2]" />
                                        <div><p className="text-[9px] font-black text-slate-400 uppercase">Free Beds</p><p className="text-lg font-black text-slate-800">{modalFree.length}</p></div>
                                    </div>
                                    <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 flex items-center gap-2">
                                        <span className="text-[#5C67F2] font-black">KSh</span>
                                        <div><p className="text-[9px] font-black text-slate-400 uppercase">Room Fee</p><p className="text-lg font-black text-slate-800">{roomFee.toLocaleString()}</p></div>
                                    </div>
                                </div>
                            )}

                            {modalRoomId && selectedIds.size > modalFree.length && (
                                <p className="flex items-center gap-2 text-[11px] font-bold text-amber-600"><AlertTriangle className="w-4 h-4" /> Only {modalFree.length} free bed(s) — the rest will be skipped.</p>
                            )}

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Notes (optional)</label>
                                <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional…" className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:border-[#5C67F2]" />
                            </div>

                            <button onClick={() => { if (!modalRoomId) { toast.error("Choose a room"); return; } bulkMut.mutate({ studentIds: Array.from(selectedIds), roomId: modalRoomId, notes }); }}
                                disabled={!modalRoomId || bulkMut.isPending || modalFree.length === 0}
                                className="w-full h-12 bg-[#5C67F2] hover:bg-indigo-600 disabled:opacity-40 text-white font-black text-xs uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 transition-all">
                                {bulkMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                Confirm Allocation
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
