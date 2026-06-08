import { useState, useEffect } from "react";
import { 
    Home, Search, Calendar, User, FileText, Plus, Trash2, 
    Sparkles, Loader2, Check, X, CreditCard, BadgePercent
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function GenerateStudentInvoice() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // Student search states
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedStudent, setSelectedStudent] = useState<any>(null);

    // Form states
    const [classId, setClassId] = useState("");
    const [feeStructureId, setFeeStructureId] = useState("");
    const [academicYearId, setAcademicYearId] = useState("");
    const [semesterId, setSemesterId] = useState("");
    const [dueDate, setDueDate] = useState(
        new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    );

    // Custom items and discounts
    const [lineItems, setLineItems] = useState<any[]>([]);
    const [discountType, setDiscountType] = useState<"NONE" | "FIXED" | "PERCENTAGE">("NONE");
    const [discountValue, setDiscountValue] = useState(0);

    // Fetch classes
    const { data: classes = [] } = useQuery({
        queryKey: ["academics_classes"],
        queryFn: async () => {
            const r = await api.get("/academics/classes");
            return r.data || [];
        }
    });

    // Search students
    const { data: students = [], isFetching: isSearching } = useQuery({
        queryKey: ["students_search", searchQuery],
        queryFn: async () => {
            if (!searchQuery || searchQuery.length < 2) return [];
            const r = await api.get(`/students?search=${searchQuery}`);
            return r.data || [];
        }
    });

    // Fetch fee structures
    const { data: structures = [] } = useQuery({
        queryKey: ["fee_structures"],
        queryFn: async () => {
            const r = await api.get("/fee_structures");
            return r.data || [];
        }
    });

    // Academic years & terms from the academic system (v2) — the real source.
    const { data: academicYears = [] } = useQuery({
        queryKey: ["v2_academic_years"],
        queryFn: async () => { const r = await api.get("/v2/academic-years"); return Array.isArray(r.data) ? r.data : (r.data?.data || []); },
    });
    const { data: allTerms = [] } = useQuery({
        queryKey: ["v2_terms"],
        queryFn: async () => { const r = await api.get("/v2/terms"); return Array.isArray(r.data) ? r.data : (r.data?.data || []); },
    });
    const termsForYear = allTerms.filter((t: any) => String(t.academicYearId) === String(academicYearId));

    // Fetch transport zones
    const { data: zones = [] } = useQuery({
        queryKey: ["transport_zones"],
        queryFn: async () => {
            const r = await api.get("/transport_zones");
            return r.data || [];
        }
    });

    useEffect(() => {
        if (!academicYearId && academicYears.length > 0) {
            const y = academicYears.find((y: any) => y.isActive) || academicYears[0];
            setAcademicYearId(String(y._id));
        }
    }, [academicYears, academicYearId]);

    useEffect(() => {
        if (academicYearId && termsForYear.length > 0 && !termsForYear.some((t: any) => String(t._id) === String(semesterId))) {
            const t = termsForYear.find((t: any) => t.isActive) || termsForYear[0];
            setSemesterId(String(t._id));
        }
    }, [academicYearId, allTerms]); // eslint-disable-line

    // Fetch fee particulars
    const { data: feeParticularsArray } = useQuery({
        queryKey: ["all_fee_particulars"],
        queryFn: async () => {
            const r = await api.get('/fee_particulars');
            if (Array.isArray(r.data)) {
                return r.data.flatMap((c: any) => c.particulars || []);
            }
            return r.data?.particulars || [];
        }
    });

    const uniqueParticulars = Array.from(new Map(feeParticularsArray?.map((p: any) => [p.label, p])).values());

    // When student changes, auto-resolve their class
    const handleSelectStudent = (student: any) => {
        setSelectedStudent(student);
        setSearchQuery(student.studentName || `${student.firstName} ${student.lastName}`);

        // Try to match studentClass (string) to one of the fetched classes (by levelName/name)
        if (student.studentClass) {
            const matchedClass = classes.find(
                (c: any) => (c.name || c.levelName || "").toLowerCase() === student.studentClass.toLowerCase()
            );
            if (matchedClass) {
                setClassId(matchedClass._id || matchedClass.id);
            } else {
                setClassId("");
            }
        }
    };

    // Auto-prefill invoice items when structure, student, or zones data resolves
    useEffect(() => {
        if (!feeStructureId) {
            setLineItems([]);
            return;
        }
        const selected = structures.find((s: any) => s._id === feeStructureId || s.id === feeStructureId);
        if (selected) {
            let baseItems: any[] = [];
            if (Array.isArray(selected.items)) {
                baseItems = selected.items;
            } else if (selected.amounts && typeof selected.amounts === 'object') {
                baseItems = Object.entries(selected.amounts).map(([category, amount]) => ({
                    category,
                    amount: parseFloat(amount as string) || 0,
                    description: "",
                    is_required: true
                }));
            }

            const items = baseItems.map((i: any) => {
                let amount = parseFloat(i.amount) || 0;

                // 1. Auto-resolve transport zone fee
                if (i.category === "TRANSPORT" && selectedStudent?.transportZone) {
                    const matchedZone = zones.find((z: any) => z.name === selectedStudent.transportZone);
                    if (matchedZone) {
                        amount = parseFloat(matchedZone.fee) || amount;
                    }
                }

                // 2. Auto-resolve tuition fee per student class amount
                if ((i.category === "TERMLY TUITION FEE" || i.category === "MONTHLY TUITION FEE") && selectedStudent?.studentClass) {
                    const tuitionParticular = uniqueParticulars.find((p: any) => p.label === i.category);
                    if (tuitionParticular && tuitionParticular.classAmounts && tuitionParticular.classAmounts[selectedStudent.studentClass]) {
                        amount = parseFloat(tuitionParticular.classAmounts[selectedStudent.studentClass]) || amount;
                    }
                }

                return {
                    category: i.category,
                    amount,
                    description: i.description || "",
                    is_required: !!i.is_required
                };
            });
            setLineItems(items);

            if (selected.discount_type) {
                setDiscountType(selected.discount_type);
                setDiscountValue(selected.discount_value || 0);
            }
        }
    }, [feeStructureId, selectedStudent, zones, uniqueParticulars, structures]);

    // Add / Remove / Change items
    const handleAddItem = () => {
        const selectedCategories = new Set(lineItems.map((i: any) => i.category));
        const availableParticular = uniqueParticulars.find((p: any) => !selectedCategories.has(p.label)) 
            || uniqueParticulars[0] 
            || { label: 'OTHERS', amount: 0 };

        let amount = parseFloat(availableParticular.amount) || 0;

        // Auto-match for manually added row
        if (availableParticular.label === "TRANSPORT" && selectedStudent?.transportZone) {
            const matchedZone = zones.find((z: any) => z.name === selectedStudent.transportZone);
            if (matchedZone) {
                amount = parseFloat(matchedZone.fee) || amount;
            }
        }
        if ((availableParticular.label === "TERMLY TUITION FEE" || availableParticular.label === "MONTHLY TUITION FEE") && selectedStudent?.studentClass) {
            if (availableParticular.classAmounts && availableParticular.classAmounts[selectedStudent.studentClass]) {
                amount = parseFloat(availableParticular.classAmounts[selectedStudent.studentClass]) || amount;
            }
        }

        setLineItems(prev => [
            ...prev,
            {
                category: availableParticular.label,
                amount,
                description: "",
                is_required: false
            }
        ]);
    };

    const handleRemoveItem = (index: number) => {
        setLineItems(prev => prev.filter((_, idx) => idx !== index));
    };

    const handleItemChange = (index: number, field: string, value: any) => {
        setLineItems(prev => {
            const newItems = [...prev];
            if (field === 'category') {
                const particular = uniqueParticulars.find((p: any) => p.label === value);
                let amount = particular ? (parseFloat(particular.amount) || 0) : 0;
                
                if (value === "TRANSPORT" && selectedStudent?.transportZone) {
                    const matchedZone = zones.find((z: any) => z.name === selectedStudent.transportZone);
                    if (matchedZone) {
                        amount = parseFloat(matchedZone.fee) || amount;
                    }
                }
                if ((value === "TERMLY TUITION FEE" || value === "MONTHLY TUITION FEE") && selectedStudent?.studentClass) {
                    if (particular && particular.classAmounts && particular.classAmounts[selectedStudent.studentClass]) {
                        amount = parseFloat(particular.classAmounts[selectedStudent.studentClass]) || amount;
                    }
                }

                newItems[index] = {
                    ...newItems[index],
                    category: value,
                    amount
                };
            } else {
                newItems[index] = {
                    ...newItems[index],
                    [field]: value
                };
            }
            return newItems;
        });
    };

    // Computations
    const subtotal = lineItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    let discountAmount = 0;
    if (discountType === "FIXED") {
        discountAmount = discountValue;
    } else if (discountType === "PERCENTAGE") {
        discountAmount = (subtotal * discountValue) / 100;
    }
    const totalDue = Math.max(0, subtotal - discountAmount);

    // Create invoice mutation
    const createInvoiceMutation = useMutation({
        mutationFn: async (payload: any) => {
            return api.post("/schools/default/invoices", payload);
        },
        onSuccess: (res: any) => {
            toast.success("Invoice generated successfully!");
            const created = res.data?.data;
            if (created && created._id) {
                navigate(`/fees/invoice/${created._id}`);
            } else {
                navigate("/fees/ledger");
            }
        },
        onError: (err: any) => {
            const msg = err.response?.data?.errors?.[0]?.message || err.response?.data?.message || "Failed to generate invoice";
            toast.error(msg);
        }
    });

    const handleGenerateInvoice = () => {
        if (!selectedStudent) {
            toast.error("Please search and select a student");
            return;
        }
        if (!classId) {
            toast.error("Please select a target class");
            return;
        }
        if (!feeStructureId) {
            toast.error("Please select a base fee structure");
            return;
        }
        if (lineItems.length === 0) {
            toast.error("An invoice must have at least one line item");
            return;
        }

        // Validate duplicates
        const categories = lineItems.map((i: any) => i.category);
        const uniqueCategories = new Set(categories);
        if (categories.length !== uniqueCategories.size) {
            toast.error("Duplicate items are not allowed. Please remove or change duplicate items.");
            return;
        }

        createInvoiceMutation.mutate({
            student_id: selectedStudent._id || selectedStudent.id,
            class_id: classId,
            academic_year_id: academicYearId,
            semester_id: semesterId,
            fee_structure_id: feeStructureId,
            due_date: dueDate,
            override_items: lineItems,
            discount_type: discountType,
            discount_value: discountValue
        });
    };

    return (
        <div className="flex-1 bg-[#F8FAFC] min-h-screen flex flex-col pb-20 font-sans">
            {/* Breadcrumb */}
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-2 text-sm">
                    <Home className="w-4 h-4 text-[#5C67F2]" />
                    <span className="text-gray-300">/</span>
                    <span className="font-bold text-gray-600">Fees</span>
                    <span className="text-gray-300">/</span>
                    <span className="font-black text-[#5C67F2]">Generate Per Student</span>
                </div>
            </div>

            <div className="flex-1 max-w-6xl mx-auto w-full px-6 pt-10">
                {/* Title */}
                <div className="mb-8">
                    <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                        Student Invoice Generator
                    </h1>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-1">Generate a customized fee invoice for an individual student</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Student Selection & Parameters */}
                    <div className="lg:col-span-1 space-y-6">
                        {/* Student Search */}
                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative group">
                            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                                1. Search Student
                            </h3>
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        if (selectedStudent) setSelectedStudent(null);
                                    }}
                                    className="w-full h-11 pl-11 pr-10 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-sm font-medium text-slate-700 transition-colors"
                                    placeholder="Type student name..."
                                />
                                {selectedStudent && (
                                    <button 
                                        onClick={() => {
                                            setSelectedStudent(null);
                                            setSearchQuery("");
                                            setLineItems([]);
                                            setFeeStructureId("");
                                        }}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>

                            {/* Dropdown Suggestions */}
                            {students.length > 0 && searchQuery.length >= 2 && !selectedStudent && (
                                <div className="absolute left-6 right-6 mt-2 bg-white rounded-xl border border-slate-200 shadow-lg z-50 overflow-hidden max-h-60 overflow-y-auto">
                                    {students.map((s: any) => (
                                        <div
                                            key={s._id}
                                            onClick={() => handleSelectStudent(s)}
                                            className="px-4 py-3 hover:bg-indigo-50/50 cursor-pointer flex items-center justify-between transition-colors border-b border-slate-50 last:border-0"
                                        >
                                            <div>
                                                <p className="text-sm font-bold text-slate-800">{s.studentName || `${s.firstName} ${s.lastName}`}</p>
                                                <p className="text-[10px] font-semibold text-slate-400 mt-0.5">{s.registrationNo || s.studentId} · {s.studentClass || "No Class Assigned"}</p>
                                            </div>
                                            <Check className="w-4 h-4 text-slate-300" />
                                        </div>
                                    ))}
                                </div>
                            )}

                            {isSearching && !selectedStudent && (
                                <div className="mt-4 text-xs text-slate-400 flex items-center gap-2">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#5C67F2]" /> Searching students...
                                </div>
                            )}

                            {/* Selected Student Card */}
                            {selectedStudent && (
                                <div className="mt-6 p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 flex flex-col gap-2 animate-in fade-in duration-300">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full bg-[#5C67F2]/10 flex items-center justify-center text-[#5C67F2]">
                                            <User className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-black text-slate-800 uppercase leading-none">{selectedStudent.studentName || `${selectedStudent.firstName} ${selectedStudent.lastName}`}</h4>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Adm: {selectedStudent.registrationNo || selectedStudent.studentId}</p>
                                            <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-[#5C67F2] text-white">
                                                {selectedStudent.studentClass || "No class assigned"}
                                            </span>
                                        </div>
                                    </div>
                                    {selectedStudent.transportZone && (
                                        <div className="mt-2 pt-2 border-t border-indigo-100/50 text-[10px] font-black text-indigo-600 uppercase flex items-center gap-1.5">
                                            <Sparkles className="w-3.5 h-3.5" /> Assigned Zone: {selectedStudent.transportZone}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Invoice Parameters */}
                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-5">
                            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                2. Configure Invoice
                            </h3>

                            {/* Target Class Selector */}
                            <div className="relative group">
                                <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Target Class*</div>
                                <select
                                    value={classId}
                                    onChange={(e) => setClassId(e.target.value)}
                                    className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-[#5C67F2]"
                                >
                                    <option value="">-- Select Class --</option>
                                    {classes.map((c: any) => (
                                        <option key={c._id || c.id} value={c._id || c.id}>
                                            {c.name || c.levelName}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Base Fee Structure */}
                            <div className="relative group">
                                <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Fee Structure*</div>
                                <select
                                    value={feeStructureId}
                                    onChange={(e) => setFeeStructureId(e.target.value)}
                                    className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-[#5C67F2]"
                                >
                                    <option value="">-- Select Fee Structure --</option>
                                    {(() => {
                                        const matchedClass = classes.find((c: any) => (c._id || c.id) === classId);
                                        const selectedClassName = matchedClass?.name || matchedClass?.levelName || "";
                                        
                                        let filtered = structures;
                                        if (selectedClassName) {
                                            const exactMatches = structures.filter((s: any) => 
                                                (s.className || "").toLowerCase() === selectedClassName.toLowerCase()
                                            );
                                            if (exactMatches.length > 0) {
                                                filtered = exactMatches;
                                            }
                                        }

                                        return filtered.map((s: any) => (
                                            <option key={s._id || s.id} value={s._id || s.id}>
                                                {s.className} - {s.term} ({s.year})
                                            </option>
                                        ));
                                    })()}
                                </select>
                            </div>

                            {/* Academic Period */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="relative group">
                                    <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Academic Year*</div>
                                    {academicYears.length === 0 ? (
                                        <a href="/academics/periods" className="flex items-center w-full h-11 px-4 bg-amber-50 border border-amber-200 rounded-xl text-[11px] font-bold text-amber-700">Create one in Learning Periods →</a>
                                    ) : (
                                        <select value={academicYearId} onChange={e => { setAcademicYearId(e.target.value); setSemesterId(""); }}
                                            className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-[#5C67F2]">
                                            {academicYears.map((y: any) => <option key={y._id} value={y._id}>{y.name || `Academic Year ${y.year}`}{y.isActive ? " (Current)" : ""}</option>)}
                                        </select>
                                    )}
                                </div>
                                <div className="relative group">
                                    <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Semester / Term*</div>
                                    <select value={semesterId} onChange={e => setSemesterId(e.target.value)} disabled={termsForYear.length === 0}
                                        className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-[#5C67F2] disabled:bg-slate-100 disabled:text-slate-400">
                                        {termsForYear.length === 0 ? <option value="">No terms for this year</option>
                                            : termsForYear.map((t: any) => <option key={t._id} value={t._id}>{t.name}{t.isActive ? " (Current)" : ""}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Due Date */}
                            <div className="relative group">
                                <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Due Date*</div>
                                <input
                                    type="date"
                                    value={dueDate}
                                    onChange={(e) => setDueDate(e.target.value)}
                                    className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-[#5C67F2]"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Invoice Items & Pricing */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden flex flex-col min-h-[450px]">
                            <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-[#5C67F2] to-indigo-400" />
                            
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                    3. Invoice Items & Particulars
                                </h3>
                                <button
                                    onClick={handleAddItem}
                                    disabled={!feeStructureId}
                                    className="px-3.5 py-1.5 bg-[#5C67F2]/10 hover:bg-[#5C67F2]/20 disabled:opacity-40 disabled:hover:bg-[#5C67F2]/10 text-[#5C67F2] rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all active:scale-95"
                                >
                                    <Plus className="w-3.5 h-3.5" strokeWidth={3} /> Add Item
                                </button>
                            </div>

                            {/* Line Items List */}
                            <div className="space-y-3 flex-1 overflow-y-auto max-h-[380px] pr-2 custom-scrollbar">
                                {lineItems.map((item: any, idx: number) => (
                                    <div key={idx} className="flex gap-3 items-center bg-slate-50 p-3 rounded-2xl border border-slate-100 hover:border-slate-200 transition-all shadow-sm">
                                        {/* Category Select */}
                                        <div className="flex-1">
                                            <select
                                                value={item.category}
                                                onChange={(e) => handleItemChange(idx, 'category', e.target.value)}
                                                className="w-full text-xs font-bold p-2.5 bg-white border border-slate-100 rounded-xl outline-none focus:border-[#5C67F2] text-slate-700"
                                            >
                                                {uniqueParticulars.map((p: any) => {
                                                    const isAlreadySelected = lineItems.some((li: any, liIdx: number) => liIdx !== idx && li.category === p.label);
                                                    return (
                                                        <option key={p.label} value={p.label} disabled={isAlreadySelected}>
                                                            {p.label} {isAlreadySelected ? "(already selected)" : ""}
                                                        </option>
                                                    );
                                                })}
                                                {uniqueParticulars.length === 0 && <option value={item.category}>{item.category}</option>}
                                                <option 
                                                    value="OTHERS" 
                                                    disabled={lineItems.some((li: any, liIdx: number) => liIdx !== idx && li.category === "OTHERS")}
                                                >
                                                    OTHERS
                                                </option>
                                                <option 
                                                    value="ADJUSTMENT" 
                                                    disabled={lineItems.some((li: any, liIdx: number) => liIdx !== idx && li.category === "ADJUSTMENT")}
                                                >
                                                    ADJUSTMENT
                                                </option>
                                            </select>
                                        </div>

                                        {/* Amount Field */}
                                        <div className="w-32 relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">KSh</span>
                                            <input 
                                                type="number" 
                                                value={item.amount}
                                                onChange={(e) => handleItemChange(idx, 'amount', parseFloat(e.target.value))}
                                                className="w-full text-xs p-2.5 pl-10 bg-white border border-slate-100 rounded-xl outline-none focus:border-[#5C67F2] font-black text-slate-700 text-right"
                                                placeholder="Amount"
                                            />
                                        </div>

                                        {/* Delete Button */}
                                        <button 
                                            onClick={() => handleRemoveItem(idx)}
                                            className="p-2.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}

                                {lineItems.length === 0 && (
                                    <div className="text-center py-20 text-slate-400 text-[10px] font-bold uppercase tracking-widest border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-3">
                                        <FileText className="w-10 h-10 text-slate-350" />
                                        {feeStructureId ? "No items in this fee structure. Add some manually." : "Select a base fee structure to populate items"}
                                    </div>
                                )}
                            </div>

                            {/* Discount Configuration */}
                            {feeStructureId && (
                                <div className="mt-6 pt-5 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="relative group">
                                        <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Discount Type</div>
                                        <select
                                            value={discountType}
                                            onChange={(e: any) => {
                                                setDiscountType(e.target.value);
                                                setDiscountValue(0);
                                            }}
                                            className="w-full h-10 px-4 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-[#5C67F2]"
                                        >
                                            <option value="NONE">NO DISCOUNT</option>
                                            <option value="FIXED">FIXED AMOUNT</option>
                                            <option value="PERCENTAGE">PERCENTAGE RATE (%)</option>
                                        </select>
                                    </div>

                                    {discountType !== "NONE" && (
                                        <div className="relative group animate-in slide-in-from-top-2 duration-200">
                                            <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">
                                                {discountType === "FIXED" ? "Discount Amount (KSh)" : "Discount Percent (%)"}
                                            </div>
                                            <input
                                                type="number"
                                                value={discountValue}
                                                onChange={(e) => setDiscountValue(Math.max(0, parseFloat(e.target.value) || 0))}
                                                className="w-full h-10 px-4 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-[#5C67F2]"
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Summary Totals */}
                            <div className="mt-8 bg-slate-100 p-5 rounded-[2rem] border border-slate-200 grid grid-cols-3 gap-4 text-center shadow-inner">
                                <div>
                                    <span className="block text-[10px] text-slate-500 uppercase font-black tracking-wider">Subtotal</span>
                                    <span className="text-sm font-black text-slate-800">KSh {subtotal.toLocaleString()}</span>
                                </div>
                                <div>
                                    <span className="block text-[10px] text-slate-500 uppercase font-black tracking-wider">Discount</span>
                                    <span className="text-sm font-bold text-rose-600">- KSh {discountAmount.toLocaleString()}</span>
                                </div>
                                <div>
                                    <span className="block text-[10px] text-slate-500 uppercase font-black tracking-wider">Total Due</span>
                                    <span className="text-base font-black text-emerald-600">KSh {totalDue.toLocaleString()}</span>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="mt-6 flex justify-end gap-3">
                                <button 
                                    onClick={() => navigate("/fees/ledger")} 
                                    className="px-6 py-3 text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 rounded-xl transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleGenerateInvoice}
                                    disabled={createInvoiceMutation.isPending || !selectedStudent || !classId || !feeStructureId || lineItems.length === 0}
                                    className="px-6 py-3 bg-[#5C67F2] hover:bg-indigo-600 disabled:opacity-40 disabled:hover:bg-[#5C67F2] text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-indigo-100"
                                >
                                    {createInvoiceMutation.isPending ? (
                                        <>
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            Generating...
                                        </>
                                    ) : (
                                        <>
                                            <CreditCard className="w-3.5 h-3.5" />
                                            Generate Invoice
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
