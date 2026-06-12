import { useState, useEffect } from "react";
import { 
    Home, Plus, Search, Bus, User, Shield, CreditCard, 
    Edit2, Trash2, Check, Loader2, FileText, ArrowRight, 
    Sparkles, RefreshCw, X, Download
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";
import { useNavigate, useParams } from "react-router-dom";

export default function TransportManagement({ tab }: { tab: "zones" | "new" | "edit" | "assign" | "report" | "buses" | "new-bus" | "edit-bus" }) {
    const navigate = useNavigate();
    const { id } = useParams();
    const queryClient = useQueryClient();

    // Fetch transport zones
    const { data: zones = [], isLoading: loadingZones } = useQuery({
        queryKey: ["transport_zones"],
        queryFn: async () => {
            const r = await api.get("/transport_zones");
            return r.data || [];
        }
    });

    // Fetch buses
    const { data: buses = [], isLoading: loadingBuses } = useQuery({
        queryKey: ["buses"],
        queryFn: async () => {
            const r = await api.get("/buses");
            return r.data || [];
        }
    });

    // Fetch students
    const { data: students = [], isLoading: loadingStudents } = useQuery({
        queryKey: ["all_students"],
        queryFn: async () => {
            const r = await api.get("/students");
            return r.data || [];
        }
    });

    // Fetch staff (employees)
    const { data: staff = [], isLoading: loadingStaff } = useQuery({
        queryKey: ["staff"],
        queryFn: async () => {
            const r = await api.get("/staff");
            return r.data || [];
        }
    });

    // Drivers / co-drivers = staff whose designation or roles include Driver / Bus Attendant.
    const hasRole = (s: any, re: RegExp) => re.test(String(s.designation || "")) || (Array.isArray(s.roles) && s.roles.some((r: string) => re.test(r)));
    const drivers = staff.filter((s: any) => hasRole(s, /(^|\s)driver$/i) || hasRole(s, /^driver/i) && !hasRole(s, /co.?driver/i));
    const coDrivers = staff.filter((s: any) => hasRole(s, /co.?driver|bus attendant/i));

    // Local form state for zone
    const [zoneForm, setZoneForm] = useState({
        name: "",
        fee: "",
        driver: "",
        coDriver: "",
        busNo: ""
    });

    // Local form state for bus
    const [busForm, setBusForm] = useState({
        plateNo: "",
        model: "",
        capacity: "",
        driver: "",
        coDriver: ""
    });

    // Local state for assignment
    const [assignState, setAssignState] = useState({
        studentId: "",
        zoneName: ""
    });

    const [searchStudentTerm, setSearchStudentTerm] = useState("");
    const [dropdownOpen, setDropdownOpen] = useState(false);

    // Populate zone form when editing
    useEffect(() => {
        if (tab === "edit" && id && zones.length > 0) {
            const z = zones.find((item: any) => item._id === id);
            if (z) {
                setZoneForm({
                    name: z.name || "",
                    fee: z.fee?.toString() || "",
                    driver: z.driver || "",
                    coDriver: z.coDriver || "",
                    busNo: z.busNo || ""
                });
            }
        } else {
            setZoneForm({ name: "", fee: "", driver: "", coDriver: "", busNo: "" });
        }
    }, [tab, id, zones]);

    // Populate bus form when editing
    useEffect(() => {
        if (tab === "edit-bus" && id && buses.length > 0) {
            const b = buses.find((item: any) => item._id === id);
            if (b) {
                setBusForm({
                    plateNo: b.plateNo || "",
                    model: b.model || "",
                    capacity: b.capacity?.toString() || "",
                    driver: b.driver || "",
                    coDriver: b.coDriver || ""
                });
            }
        } else {
            setBusForm({ plateNo: "", model: "", capacity: "", driver: "", coDriver: "" });
        }
    }, [tab, id, buses]);

    // Save zone (create / edit)
    const saveZoneMutation = useMutation({
        mutationFn: async (payload: any) => {
            if (tab === "edit" && id) {
                return api.patch(`/transport_zones/${id}`, payload);
            } else {
                return api.post("/transport_zones", payload);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["transport_zones"] });
            toast.success(tab === "edit" ? "Transport zone updated" : "New transport zone created");
            navigate("/transport/zones");
        },
        onError: (err: any) => toast.error(err?.response?.data?.message || "Failed to save zone")
    });

    // Delete zone
    const deleteZoneMutation = useMutation({
        mutationFn: async (zoneId: string) => api.delete(`/transport_zones/${zoneId}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["transport_zones"] });
            toast.success("Transport zone deleted");
        }
    });

    // Save bus (create / edit)
    const saveBusMutation = useMutation({
        mutationFn: async (payload: any) => {
            if (tab === "edit-bus" && id) {
                return api.patch(`/buses/${id}`, payload);
            } else {
                return api.post("/buses", payload);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["buses"] });
            toast.success(tab === "edit-bus" ? "Bus updated successfully" : "New bus added successfully");
            navigate("/transport/buses");
        },
        onError: (err: any) => toast.error(err?.response?.data?.message || "Failed to save bus")
    });

    // Delete bus
    const deleteBusMutation = useMutation({
        mutationFn: async (busId: string) => api.delete(`/buses/${busId}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["buses"] });
            toast.success("Bus deleted successfully");
        }
    });

    // Assign student zone
    const assignStudentMutation = useMutation({
        mutationFn: async ({ studentId, zoneName }: { studentId: string, zoneName: string }) => {
            const student = students.find((s: any) => s._id === studentId);
            if (!student) throw new Error("Student not found");
            return api.patch(`/students/${studentId}`, { ...student, transportZone: zoneName });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["all_students"] });
            toast.success("Student transport zone updated successfully");
            setAssignState({ studentId: "", zoneName: "" });
            setSearchStudentTerm("");
        },
        onError: (err: any) => toast.error(err?.message || "Failed to assign student")
    });

    // Remove student zone
    const removeStudentZoneMutation = useMutation({
        mutationFn: async (studentId: string) => {
            const student = students.find((s: any) => s._id === studentId);
            if (!student) throw new Error("Student not found");
            return api.patch(`/students/${studentId}`, { ...student, transportZone: "" });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["all_students"] });
            toast.success("Student removed from transport zone");
        }
    });

    const handleSaveZone = (e: React.FormEvent) => {
        e.preventDefault();
        if (!zoneForm.name || !zoneForm.fee) {
            toast.error("Zone name and fee are required");
            return;
        }
        saveZoneMutation.mutate(zoneForm);
    };

    const handleSaveBus = (e: React.FormEvent) => {
        e.preventDefault();
        if (!busForm.plateNo) {
            toast.error("Bus plate number is required");
            return;
        }
        saveBusMutation.mutate(busForm);
    };

    const handleAssign = (e: React.FormEvent) => {
        e.preventDefault();
        if (!assignState.studentId) {
            toast.error("Please select a student");
            return;
        }
        assignStudentMutation.mutate({
            studentId: assignState.studentId,
            zoneName: assignState.zoneName
        });
    };

    const activeStudents = students.filter((s: any) => s.transportZone);
    const unassignedStudents = students.filter((s: any) => !s.transportZone);

    const filteredUnassigned = unassignedStudents.filter((s: any) => 
        (s.studentName || `${s.firstName} ${s.lastName}`)?.toLowerCase().includes(searchStudentTerm.toLowerCase()) ||
        s.registrationNo?.toLowerCase().includes(searchStudentTerm.toLowerCase())
    );

    return (
        <div className="flex-1 bg-[#F8FAFC] min-h-screen flex flex-col font-sans">
            {/* Breadcrumb */}
            <div className="bg-white border-b border-gray-100 px-5 py-3 flex items-center shadow-sm z-10 m-4 rounded-xl">
                <span className="font-bold text-gray-800 text-sm mr-2">Transport</span>
                <span className="text-gray-300 mx-2">|</span>
                <Home className="w-3.5 h-3.5 text-gray-500 mr-1.5" />
                <span className="text-gray-500 font-medium text-sm">
                    {tab === "zones" && "- Transport Zones"}
                    {tab === "new" && "- New Zone"}
                    {tab === "edit" && "- Edit Zone"}
                    {tab === "buses" && "- Buses List"}
                    {tab === "new-bus" && "- New Bus"}
                    {tab === "edit-bus" && "- Edit Bus"}
                    {tab === "assign" && "- Assign Student"}
                    {tab === "report" && "- Route & Driver Report"}
                </span>
            </div>

            <div className="max-w-7xl mx-auto w-full px-4 lg:px-8 space-y-8 pb-20">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-1">
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase flex items-center gap-2.5">
                            Transport Management <Bus className="w-6 h-6 text-[#5C67F2]" />
                        </h1>
                        <p className="text-slate-500 font-bold text-xs flex items-center gap-2 uppercase tracking-widest">
                            <Sparkles className="w-4 h-4 text-emerald-500 animate-pulse" /> Manage routes, zones, driver assignments & student logs.
                        </p>
                    </div>
                    {(tab === "buses" || tab === "new-bus" || tab === "edit-bus") ? (
                        tab !== "new-bus" && (
                            <button 
                                onClick={() => navigate("/transport/buses/new")}
                                className="flex items-center justify-center gap-2 px-8 py-3.5 bg-[#5C67F2] hover:bg-[#4a54c4] text-white font-black rounded-2xl shadow-xl shadow-indigo-100 transition-all transform active:scale-95 text-xs uppercase tracking-widest"
                            >
                                <Plus className="w-4 h-4" /> Add New Bus
                            </button>
                        )
                    ) : (
                        tab !== "new" && tab !== "edit" && (
                            <button 
                                onClick={() => navigate("/transport/zones/new")}
                                className="flex items-center justify-center gap-2 px-8 py-3.5 bg-[#5C67F2] hover:bg-[#4a54c4] text-white font-black rounded-2xl shadow-xl shadow-indigo-100 transition-all transform active:scale-95 text-xs uppercase tracking-widest"
                            >
                                <Plus className="w-4 h-4" /> Add New Zone
                            </button>
                        )
                    )}
                </div>

                {/* Subpage Tabs Navigation */}
                <div className="flex bg-white rounded-[1.5rem] border border-slate-100 p-2 shadow-sm gap-2 w-fit">
                    <button 
                        onClick={() => navigate("/transport/zones")}
                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${tab === "zones" || tab === "new" || tab === "edit" ? "bg-[#5C67F2] text-white" : "text-slate-500 hover:bg-slate-50"}`}
                    >
                        Zones List
                    </button>
                    <button 
                        onClick={() => navigate("/transport/buses")}
                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${tab === "buses" || tab === "new-bus" || tab === "edit-bus" ? "bg-[#5C67F2] text-white" : "text-slate-500 hover:bg-slate-50"}`}
                    >
                        Buses List
                    </button>
                    <button 
                        onClick={() => navigate("/transport/assign")}
                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${tab === "assign" ? "bg-[#5C67F2] text-white" : "text-slate-500 hover:bg-slate-50"}`}
                    >
                        Assign Students
                    </button>
                    <button 
                        onClick={() => navigate("/transport/report")}
                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${tab === "report" ? "bg-[#5C67F2] text-white" : "text-slate-500 hover:bg-slate-50"}`}
                    >
                        Route Report
                    </button>
                </div>

                {/* Main Content Area */}
                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden p-8 lg:p-10">
                    
                    {/* ZONES LIST VIEW */}
                    {tab === "zones" && (
                        <div className="space-y-6">
                            {loadingZones ? (
                                <div className="flex justify-center py-20">
                                    <Loader2 className="w-10 h-10 animate-spin text-[#5C67F2]" />
                                </div>
                            ) : zones.length > 0 ? (
                                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wide">
                                                <th className="text-left px-5 py-3 font-black">Zone</th>
                                                <th className="text-left px-3 py-3 font-black">Fee / Term</th>
                                                <th className="text-left px-3 py-3 font-black">Driver</th>
                                                <th className="text-left px-3 py-3 font-black">Co-Driver</th>
                                                <th className="text-left px-3 py-3 font-black">Bus No</th>
                                                <th className="text-center px-3 py-3 font-black">Students</th>
                                                <th className="text-right px-5 py-3 font-black">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {zones.map((zone: any) => {
                                                const assignedCount = students.filter((s: any) => s.transportZone === zone.name).length;
                                                return (
                                                    <tr key={zone._id} className="border-b border-slate-50 hover:bg-slate-50/50">
                                                        <td className="px-5 py-3 font-bold text-slate-700 uppercase">{zone.name}</td>
                                                        <td className="px-3 py-3 text-slate-600">KES {parseFloat(zone.fee || 0).toLocaleString()}</td>
                                                        <td className="px-3 py-3 text-slate-500">{zone.driver || "—"}</td>
                                                        <td className="px-3 py-3 text-slate-500">{zone.coDriver || "—"}</td>
                                                        <td className="px-3 py-3 text-slate-500">{zone.busNo || "—"}</td>
                                                        <td className="px-3 py-3 text-center"><span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-black">{assignedCount}</span></td>
                                                        <td className="px-5 py-3">
                                                            <div className="flex items-center justify-end gap-1.5">
                                                                <button onClick={() => navigate(`/transport/zones/edit/${zone._id}`)} title="Edit" className="w-8 h-8 rounded-lg border border-slate-200 text-slate-500 hover:text-[#5C67F2] flex items-center justify-center"><Edit2 className="w-4 h-4" /></button>
                                                                <button onClick={() => { if (confirm("Delete this transport zone?")) deleteZoneMutation.mutate(zone._id); }} title="Delete" className="w-8 h-8 rounded-lg border border-slate-200 text-slate-500 hover:text-rose-500 flex items-center justify-center"><Trash2 className="w-4 h-4" /></button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center py-20 text-slate-400 flex flex-col items-center justify-center gap-4 border border-dashed border-slate-200 rounded-[2rem]">
                                    <Bus className="w-12 h-12 text-slate-300" />
                                    <div>
                                        <h4 className="font-black text-slate-700 uppercase tracking-wider">No Transport Zones Defined</h4>
                                        <p className="text-xs font-bold text-slate-400 mt-1 uppercase">Click Add New Zone to register transport zones.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* NEW / EDIT ZONE FORM */}
                    {(tab === "new" || tab === "edit") && (
                        <form onSubmit={handleSaveZone} className="max-w-xl mx-auto space-y-6">
                            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2 mb-6">
                                {tab === "edit" ? "Edit Transport Zone" : "Create Transport Zone"}
                                <div className="h-1.5 w-1.5 bg-[#5C67F2] rounded-full"></div>
                            </h2>

                            <div className="relative group">
                                <div className="absolute -top-3 left-6 bg-[#5C67F2] text-white text-[8px] px-2.5 py-0.5 rounded-full font-black tracking-widest z-10 shadow-sm uppercase">Zone Name*</div>
                                <input 
                                    type="text" 
                                    value={zoneForm.name}
                                    onChange={(e) => setZoneForm({...zoneForm, name: e.target.value})}
                                    placeholder="e.g. Kitengela / Zone A"
                                    className="w-full h-12 px-6 border border-slate-200 rounded-2xl focus:outline-none focus:border-[#5C67F2] text-slate-700 font-bold text-xs bg-white shadow-sm"
                                />
                            </div>

                            <div className="relative group">
                                <div className="absolute -top-3 left-6 bg-[#5C67F2] text-white text-[8px] px-2.5 py-0.5 rounded-full font-black tracking-widest z-10 shadow-sm uppercase">Transport Fee (KES)*</div>
                                <input 
                                    type="number" 
                                    value={zoneForm.fee}
                                    onChange={(e) => setZoneForm({...zoneForm, fee: e.target.value})}
                                    placeholder="e.g. 5000"
                                    className="w-full h-12 px-6 border border-slate-200 rounded-2xl focus:outline-none focus:border-[#5C67F2] text-slate-700 font-bold text-xs bg-white shadow-sm"
                                />
                            </div>

                            <div className="relative group">
                                <div className="absolute -top-3 left-6 bg-[#5C67F2] text-white text-[8px] px-2.5 py-0.5 rounded-full font-black tracking-widest z-10 shadow-sm uppercase">Assign Bus (Loads Driver & Co-Driver)*</div>
                                <select 
                                    value={zoneForm.busNo}
                                    onChange={(e) => {
                                        const selectedBus = buses.find((b: any) => b.plateNo === e.target.value);
                                        setZoneForm({
                                            ...zoneForm,
                                            busNo: e.target.value,
                                            driver: selectedBus?.driver || "",
                                            coDriver: selectedBus?.coDriver || ""
                                        });
                                    }}
                                    className="w-full h-12 px-6 border border-slate-200 rounded-2xl focus:outline-none focus:border-[#5C67F2] text-slate-700 font-bold text-xs bg-white shadow-sm appearance-none"
                                >
                                    <option value="">-- Select Bus --</option>
                                    {buses.map((b: any) => (
                                        <option key={b._id} value={b.plateNo}>{b.plateNo} ({b.model || 'No Model'})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="relative group">
                                <div className="absolute -top-3 left-6 bg-slate-400 text-white text-[8px] px-2.5 py-0.5 rounded-full font-black tracking-widest z-10 shadow-sm uppercase">Driver Name (Manual Override)</div>
                                <select 
                                    value={zoneForm.driver}
                                    onChange={(e) => setZoneForm({...zoneForm, driver: e.target.value})}
                                    className="w-full h-12 px-6 border border-slate-200 rounded-2xl focus:outline-none focus:border-[#5C67F2] text-slate-700 font-bold text-xs bg-white shadow-sm appearance-none"
                                >
                                    <option value="">-- Select Driver --</option>
                                    {drivers.map((d: any) => (
                                        <option key={d._id} value={d.name || d.employeeName}>{d.name || d.employeeName}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="relative group">
                                <div className="absolute -top-3 left-6 bg-slate-400 text-white text-[8px] px-2.5 py-0.5 rounded-full font-black tracking-widest z-10 shadow-sm uppercase">Co-Driver Name (Manual Override)</div>
                                <select 
                                    value={zoneForm.coDriver}
                                    onChange={(e) => setZoneForm({...zoneForm, coDriver: e.target.value})}
                                    className="w-full h-12 px-6 border border-slate-200 rounded-2xl focus:outline-none focus:border-[#5C67F2] text-slate-700 font-bold text-xs bg-white shadow-sm appearance-none"
                                >
                                    <option value="">-- Select Co-Driver --</option>
                                    {coDrivers.map((cd: any) => (
                                        <option key={cd._id} value={cd.name || cd.employeeName}>{cd.name || cd.employeeName}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <button 
                                    type="button" 
                                    onClick={() => navigate("/transport/zones")}
                                    className="px-8 h-12 border border-slate-100 text-slate-400 hover:bg-slate-50 font-black rounded-2xl text-[10px] uppercase tracking-widest transition-all"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={saveZoneMutation.isPending}
                                    className="px-10 h-12 bg-[#5C67F2] hover:bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest transition-all disabled:opacity-50"
                                >
                                    {saveZoneMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                    Save Zone
                                </button>
                            </div>
                        </form>
                    )}

                    {/* BUSES LIST VIEW */}
                    {tab === "buses" && (
                        <div className="space-y-6">
                            {loadingBuses ? (
                                <div className="flex justify-center py-20">
                                    <Loader2 className="w-10 h-10 animate-spin text-[#5C67F2]" />
                                </div>
                            ) : buses.length > 0 ? (
                                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wide">
                                                <th className="text-left px-5 py-3 font-black">Plate No</th>
                                                <th className="text-left px-3 py-3 font-black">Model / Make</th>
                                                <th className="text-left px-3 py-3 font-black">Driver</th>
                                                <th className="text-left px-3 py-3 font-black">Co-Driver</th>
                                                <th className="text-center px-3 py-3 font-black">Capacity</th>
                                                <th className="text-right px-5 py-3 font-black">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {buses.map((bus: any) => (
                                                <tr key={bus._id} className="border-b border-slate-50 hover:bg-slate-50/50">
                                                    <td className="px-5 py-3 font-bold text-slate-700 uppercase">{bus.plateNo}</td>
                                                    <td className="px-3 py-3 text-slate-500">{bus.model || "—"}</td>
                                                    <td className="px-3 py-3 text-slate-500">{bus.driver || "—"}</td>
                                                    <td className="px-3 py-3 text-slate-500">{bus.coDriver || "—"}</td>
                                                    <td className="px-3 py-3 text-center text-slate-600">{bus.capacity ? `${bus.capacity}` : "—"}</td>
                                                    <td className="px-5 py-3">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            <button onClick={() => navigate(`/transport/buses/edit/${bus._id}`)} title="Edit" className="w-8 h-8 rounded-lg border border-slate-200 text-slate-500 hover:text-[#5C67F2] flex items-center justify-center"><Edit2 className="w-4 h-4" /></button>
                                                            <button onClick={() => { if (confirm("Delete this bus?")) deleteBusMutation.mutate(bus._id); }} title="Delete" className="w-8 h-8 rounded-lg border border-slate-200 text-slate-500 hover:text-rose-500 flex items-center justify-center"><Trash2 className="w-4 h-4" /></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center py-20 text-slate-400 flex flex-col items-center justify-center gap-4 border border-dashed border-slate-200 rounded-[2rem]">
                                    <Bus className="w-12 h-12 text-slate-300" />
                                    <div>
                                        <h4 className="font-black text-slate-700 uppercase tracking-wider">No Buses Registered</h4>
                                        <p className="text-xs font-bold text-slate-400 mt-1 uppercase">Click Add New Bus to register a transport vehicle.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* NEW / EDIT BUS FORM */}
                    {(tab === "new-bus" || tab === "edit-bus") && (
                        <form onSubmit={handleSaveBus} className="max-w-xl mx-auto space-y-6">
                            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2 mb-6">
                                {tab === "edit-bus" ? "Edit Bus Record" : "Add New Bus"}
                                <div className="h-1.5 w-1.5 bg-[#5C67F2] rounded-full"></div>
                            </h2>

                            <div className="relative group">
                                <div className="absolute -top-3 left-6 bg-[#5C67F2] text-white text-[8px] px-2.5 py-0.5 rounded-full font-black tracking-widest z-10 shadow-sm uppercase">Bus Plate No*</div>
                                <input 
                                    type="text" 
                                    value={busForm.plateNo}
                                    onChange={(e) => setBusForm({...busForm, plateNo: e.target.value})}
                                    placeholder="e.g. KCA 123X / Bus No 5"
                                    className="w-full h-12 px-6 border border-slate-200 rounded-2xl focus:outline-none focus:border-[#5C67F2] text-slate-700 font-bold text-xs bg-white shadow-sm"
                                />
                            </div>

                            <div className="relative group">
                                <div className="absolute -top-3 left-6 bg-[#5C67F2] text-white text-[8px] px-2.5 py-0.5 rounded-full font-black tracking-widest z-10 shadow-sm uppercase">Model / Make</div>
                                <input 
                                    type="text" 
                                    value={busForm.model}
                                    onChange={(e) => setBusForm({...busForm, model: e.target.value})}
                                    placeholder="e.g. Isuzu FRR 33-seater"
                                    className="w-full h-12 px-6 border border-slate-200 rounded-2xl focus:outline-none focus:border-[#5C67F2] text-slate-700 font-bold text-xs bg-white shadow-sm"
                                />
                            </div>

                            <div className="relative group">
                                <div className="absolute -top-3 left-6 bg-slate-400 text-white text-[8px] px-2.5 py-0.5 rounded-full font-black tracking-widest z-10 shadow-sm uppercase">Seating Capacity</div>
                                <input 
                                    type="number" 
                                    value={busForm.capacity}
                                    onChange={(e) => setBusForm({...busForm, capacity: e.target.value})}
                                    placeholder="e.g. 33"
                                    className="w-full h-12 px-6 border border-slate-200 rounded-2xl focus:outline-none focus:border-[#5C67F2] text-slate-700 font-bold text-xs bg-white shadow-sm"
                                />
                            </div>

                            <div className="relative group">
                                <div className="absolute -top-3 left-6 bg-[#5C67F2] text-white text-[8px] px-2.5 py-0.5 rounded-full font-black tracking-widest z-10 shadow-sm uppercase">Select Driver*</div>
                                <select 
                                    value={busForm.driver}
                                    onChange={(e) => setBusForm({...busForm, driver: e.target.value})}
                                    className="w-full h-12 px-6 border border-slate-200 rounded-2xl focus:outline-none focus:border-[#5C67F2] text-slate-700 font-bold text-xs bg-white shadow-sm appearance-none animate-in fade-in"
                                >
                                    <option value="">-- Choose Driver --</option>
                                    {drivers.map((d: any) => (
                                        <option key={d._id} value={d.name || d.employeeName}>{d.name || d.employeeName}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="relative group">
                                <div className="absolute -top-3 left-6 bg-[#5C67F2] text-white text-[8px] px-2.5 py-0.5 rounded-full font-black tracking-widest z-10 shadow-sm uppercase">Select Co-Driver*</div>
                                <select 
                                    value={busForm.coDriver}
                                    onChange={(e) => setBusForm({...busForm, coDriver: e.target.value})}
                                    className="w-full h-12 px-6 border border-slate-200 rounded-2xl focus:outline-none focus:border-[#5C67F2] text-slate-700 font-bold text-xs bg-white shadow-sm appearance-none animate-in fade-in"
                                >
                                    <option value="">-- Choose Co-Driver --</option>
                                    {coDrivers.map((cd: any) => (
                                        <option key={cd._id} value={cd.name || cd.employeeName}>{cd.name || cd.employeeName}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <button 
                                    type="button" 
                                    onClick={() => navigate("/transport/buses")}
                                    className="px-8 h-12 border border-slate-100 text-slate-400 hover:bg-slate-50 font-black rounded-2xl text-[10px] uppercase tracking-widest transition-all"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={saveBusMutation.isPending}
                                    className="px-10 h-12 bg-[#5C67F2] hover:bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest transition-all disabled:opacity-50"
                                >
                                    {saveBusMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                    Save Bus
                                </button>
                            </div>
                        </form>
                    )}

                    {/* ASSIGN STUDENT VIEW */}
                    {tab === "assign" && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                            {/* Assignment form */}
                            <form onSubmit={handleAssign} className="space-y-6">
                                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2 mb-6">
                                    Assign Student to Zone
                                    <div className="h-1.5 w-1.5 bg-[#5C67F2] rounded-full"></div>
                                </h2>

                                <div className="relative group">
                                    <div className="absolute -top-3 left-6 bg-[#5C67F2] text-white text-[8px] px-2.5 py-0.5 rounded-full font-black tracking-widest z-10 shadow-sm uppercase">Select Transport Zone*</div>
                                    <select 
                                        value={assignState.zoneName}
                                        onChange={(e) => setAssignState({...assignState, zoneName: e.target.value})}
                                        className="w-full h-12 px-6 border border-slate-200 rounded-2xl focus:outline-none focus:border-[#5C67F2] text-slate-700 font-bold text-xs bg-white shadow-sm appearance-none"
                                    >
                                        <option value="">-- Select Transport Zone --</option>
                                        {zones.map((z: any) => (
                                            <option key={z._id} value={z.name}>{z.name} (KES {z.fee})</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="relative group">
                                    <div className="absolute -top-3 left-6 bg-[#5C67F2] text-white text-[8px] px-2.5 py-0.5 rounded-full font-black tracking-widest z-10 shadow-sm uppercase">Select Student*</div>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="Search student by name or Reg No..."
                                            value={searchStudentTerm}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setSearchStudentTerm(val);
                                                setDropdownOpen(true);
                                                if (!val) {
                                                    setAssignState({ ...assignState, studentId: "" });
                                                }
                                            }}
                                            onFocus={() => setDropdownOpen(true)}
                                            className="w-full h-12 pl-6 pr-10 border border-slate-200 rounded-2xl focus:outline-none focus:border-[#5C67F2] text-slate-700 font-bold text-xs bg-white shadow-sm"
                                        />
                                        <Search className="w-4 h-4 text-slate-405 absolute right-4 top-1/2 -translate-y-1/2" />
                                        
                                        {dropdownOpen && (
                                            <>
                                                <div 
                                                    className="fixed inset-0 z-10" 
                                                    onClick={() => setDropdownOpen(false)}
                                                />
                                                <div className="absolute left-0 right-0 mt-2 max-h-60 overflow-y-auto bg-white border border-slate-100 rounded-2xl shadow-xl z-20 divide-y divide-slate-100 animate-in fade-in slide-in-from-top-2 duration-150">
                                                    {students.filter((s: any) => 
                                                        (s.studentName || `${s.firstName} ${s.lastName}`)?.toLowerCase().includes(searchStudentTerm.toLowerCase()) ||
                                                        s.registrationNo?.toLowerCase().includes(searchStudentTerm.toLowerCase())
                                                    ).length > 0 ? (
                                                        students.filter((s: any) => 
                                                            (s.studentName || `${s.firstName} ${s.lastName}`)?.toLowerCase().includes(searchStudentTerm.toLowerCase()) ||
                                                            s.registrationNo?.toLowerCase().includes(searchStudentTerm.toLowerCase())
                                                        ).map((s: any) => (
                                                            <button
                                                                key={s._id}
                                                                type="button"
                                                                onClick={() => {
                                                                    setAssignState({ ...assignState, studentId: s._id });
                                                                    setSearchStudentTerm(s.studentName || `${s.firstName} ${s.lastName}`);
                                                                    setDropdownOpen(false);
                                                                }}
                                                                className="w-full text-left px-5 py-3 hover:bg-slate-50 flex flex-col transition-colors"
                                                            >
                                                                <span className="text-xs font-black text-slate-700 uppercase">
                                                                    {s.studentName || `${s.firstName} ${s.lastName}`}
                                                                </span>
                                                                <span className="text-[9px] font-bold text-slate-400 mt-1 uppercase">
                                                                    Class: {s.studentClass || "No Class"} · Reg: {s.registrationNo || "N/A"} {s.transportZone ? `· Zone: ${s.transportZone}` : ""}
                                                                </span>
                                                            </button>
                                                        ))
                                                    ) : (
                                                        <div className="px-5 py-4 text-center text-xs text-slate-400 font-bold uppercase tracking-wider">
                                                            No matching students found
                                                        </div>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <button 
                                    type="submit" 
                                    disabled={assignStudentMutation.isPending || !assignState.studentId}
                                    className="w-full h-12 bg-[#5C67F2] hover:bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest transition-all disabled:opacity-50"
                                >
                                    {assignStudentMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                    Confirm Assignment
                                </button>
                            </form>

                            {/* List of currently assigned student logs */}
                            <div className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Assigned Students ({activeStudents.length})</h3>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Interactive Logs</span>
                                </div>
                                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar border border-slate-100 p-4 rounded-3xl bg-slate-50/50">
                                    {activeStudents.length > 0 ? (
                                        activeStudents.map((s: any) => (
                                            <div key={s._id} className="flex justify-between items-center bg-white p-3 rounded-2xl border border-slate-100 shadow-sm animate-in fade-in duration-200">
                                                <div>
                                                    <h4 className="text-xs font-black text-slate-800 uppercase leading-none">{s.studentName || `${s.firstName} ${s.lastName}`}</h4>
                                                    <p className="text-[9px] font-bold text-slate-400 mt-1.5 uppercase">Class: {s.studentClass || "No Class"} · Zone: {s.transportZone}</p>
                                                </div>
                                                <button
                                                    onClick={() => removeStudentZoneMutation.mutate(s._id)}
                                                    className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors text-[10px] font-bold uppercase tracking-wider"
                                                    title="Deassign Student"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-center text-xs text-slate-400 py-10 uppercase font-bold tracking-wider">No students assigned to transport zones yet.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* REPORT VIEW PAGE */}
                    {tab === "report" && (
                        <div className="space-y-10">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
                                <div>
                                    <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Driver & Route Student Report</h2>
                                    <p className="text-slate-400 font-bold text-[10px] uppercase tracking-wider mt-1">Shows complete bus logs detailing which driver is going with which students.</p>
                                </div>
                                <button className="h-11 px-6 bg-white border border-slate-100 hover:bg-slate-50 text-slate-600 rounded-xl flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest shadow-sm">
                                    <Download className="w-4 h-4" /> Download PDF / Excel
                                </button>
                            </div>

                            {zones.length > 0 ? (
                                <div className="space-y-8">
                                    {zones.map((zone: any) => {
                                        const zoneStudents = students.filter((s: any) => s.transportZone === zone.name);
                                        return (
                                            <div key={zone._id} className="border border-slate-100 rounded-[2rem] overflow-hidden shadow-sm">
                                                {/* Route Title & Driver Banner */}
                                                <div className="bg-slate-50 p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                    <div>
                                                        <span className="text-[10px] font-black uppercase tracking-wider text-indigo-500 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full">
                                                            Route / Zone
                                                        </span>
                                                        <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight mt-2.5">{zone.name}</h3>
                                                    </div>
                                                    
                                                    {/* Crew Assignment Details */}
                                                    <div className="grid grid-cols-3 gap-6 bg-white border border-slate-100 p-4 rounded-2xl shadow-sm shrink-0">
                                                        <div>
                                                            <span className="block text-[8px] font-black text-slate-450 uppercase tracking-wider text-slate-400">Driver</span>
                                                            <span className="text-xs font-black text-slate-700 uppercase">{zone.driver || "No driver"}</span>
                                                        </div>
                                                        <div>
                                                            <span className="block text-[8px] font-black text-slate-450 uppercase tracking-wider text-slate-400">Co-Driver</span>
                                                            <span className="text-xs font-black text-slate-700 uppercase">{zone.coDriver || "No co-driver"}</span>
                                                        </div>
                                                        <div>
                                                            <span className="block text-[8px] font-black text-slate-450 uppercase tracking-wider text-slate-400">Bus / Vehicle</span>
                                                            <span className="text-xs font-black text-slate-700 uppercase">{zone.busNo || "No bus"}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Students Grid */}
                                                <div className="p-6 bg-white">
                                                    {zoneStudents.length > 0 ? (
                                                        <div className="overflow-x-auto">
                                                            <table className="w-full text-left border-collapse">
                                                                <thead>
                                                                    <tr className="border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                                        <th className="pb-3 pr-4">Student Name</th>
                                                                        <th className="pb-3 px-4">Adm No</th>
                                                                        <th className="pb-3 px-4">Class</th>
                                                                        <th className="pb-3 px-4">Phone / Contact</th>
                                                                        <th className="pb-3 pl-4 text-right">Termly Fee</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {zoneStudents.map((s: any) => (
                                                                        <tr key={s._id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/30 transition-colors">
                                                                            <td className="py-3.5 pr-4 text-xs font-black text-slate-700 uppercase">{s.studentName || `${s.firstName} ${s.lastName}`}</td>
                                                                            <td className="py-3.5 px-4 text-xs font-bold text-slate-500 uppercase">{s.registrationNo || "N/A"}</td>
                                                                            <td className="py-3.5 px-4">
                                                                                <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-[10px] font-bold text-slate-600 uppercase">
                                                                                    {s.studentClass || "Unassigned"}
                                                                                </span>
                                                                            </td>
                                                                            <td className="py-3.5 px-4 text-xs font-bold text-slate-500">{s.phone || "N/A"}</td>
                                                                            <td className="py-3.5 pl-4 text-right text-xs font-black text-slate-700">KES {parseFloat(zone.fee || 0).toLocaleString()}</td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    ) : (
                                                        <p className="text-center py-8 text-xs text-slate-400 font-bold uppercase tracking-wider">No students assigned to this route / driver.</p>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-center py-20 text-xs text-slate-400 font-bold uppercase tracking-widest border border-dashed border-slate-200 rounded-3xl">No routes configured yet. Setup zones and assignments first.</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
