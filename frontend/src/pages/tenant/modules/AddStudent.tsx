import { useState, useRef, useEffect } from "react";
import { Home, Settings, Plus, RotateCcw, Check, Download, Loader2, Upload, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useItems } from "@/hooks/useItems";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";

export default function AddStudent() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { createItem, isCreating } = useItems("students");
    const [formData, setFormData] = useState({
        studentName: "",
        registrationNo: "",
        studentClass: "",
        admissionDate: "2026-05-15",
        discount: "0",
        phone: "",
        dob: "",
        gender: "Male",
        avatar: "",
        transportZone: "",
        boarding: ""   // Boarder | Day Scholar
    });

    // School profile drives the residence options (boarding / day / mixed).
    const { data: schoolProfile } = useQuery({
        queryKey: ["tenant_profile_global"],
        queryFn: async () => (await api.get("/auth/tenant/profile")).data,
    });
    const schoolType = schoolProfile?.schoolType || "Mixed"; // Boarding | Day | Mixed
    const [showParents, setShowParents] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [showQuickAdd, setShowQuickAdd] = useState(false);   // Customize → quick table
    const [isProcessing, setIsProcessing] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { data: classesData = [] } = useQuery({
        queryKey: ["classes"],
        queryFn: async () => { const r = await api.get("/academics/classes"); return r.data; },
    });
    const { data: zones = [] } = useQuery({
        queryKey: ["transport_zones"],
        queryFn: async () => {
            const r = await api.get("/transport_zones");
            return r.data || [];
        },
    });
    const classNames = classesData.map((c: any) => c.name || c.levelName).filter(Boolean);

    // ── V2 enrollment (replaces the old "Select Class") ──────────────────
    const [enroll, setEnroll] = useState({ classId: "", streamId: "" });
    const { data: v2Years = [] } = useQuery<any[]>({ queryKey: ["v2_years_add"], queryFn: async () => (await api.get("/v2/academic-years")).data || [] });
    const { data: v2Classes = [] } = useQuery<any[]>({ queryKey: ["v2_classes_add"], queryFn: async () => (await api.get("/v2/classes")).data || [] });
    const { data: v2Streams = [] } = useQuery<any[]>({
        queryKey: ["v2_streams_add", enroll.classId],
        queryFn: async () => enroll.classId ? (await api.get(`/v2/streams?classId=${enroll.classId}`)).data || [] : [],
        enabled: !!enroll.classId,
    });
    const activeYear = v2Years.find((y: any) => y.isActive) || v2Years[0];
    // All streams (for the Quick Add table — pick class then its streams per row).
    const { data: v2AllStreams = [] } = useQuery<any[]>({ queryKey: ["v2_streams_all"], queryFn: async () => (await api.get("/v2/streams")).data || [] });

    // For single-type schools the residence is fixed; for mixed schools the admin picks.
    useEffect(() => {
        if (formData.boarding) return;
        if (schoolType === "Boarding") setFormData(p => ({ ...p, boarding: "Boarder" }));
        else if (schoolType === "Day") setFormData(p => ({ ...p, boarding: "Day Scholar" }));
    }, [schoolType]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Auto-generate portal credentials
        const cleanReg = formData.registrationNo?.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || "student";
        const portalUsername = formData.registrationNo || formData.studentName.toLowerCase().replace(/\s+/g, ".").slice(0, 15);
        const portalPassword = `shule@${cleanReg}`;

        createItem({
            ...formData,
            portalUsername,
            portalPassword,
            credentialsGenerated: true,
            lastPasswordReset: new Date().toISOString()
        }, {
            onSuccess: async (created: any) => {
                // Enroll the new student into the chosen class/stream via the V2 system.
                const newId = created?._id || created?.id || created?.insertedId;
                if (newId && enroll.classId && enroll.streamId && activeYear?._id) {
                    try {
                        await api.post("/v2/enrollments", {
                            studentId: String(newId), academicYearId: activeYear._id,
                            classId: enroll.classId, streamId: enroll.streamId,
                        });
                    } catch (_) { /* student still created; enrollment can be done later */ }
                }
                toast.success(`Student added with credentials. Pass: ${portalPassword}`);
                navigate("/students");
            }
        });
    };

    // File Import Logics
    const processFile = async (file: File) => {
        setIsProcessing(true);
        const reader = new FileReader();

        reader.onload = async (evt) => {
            try {
                const bstr = evt.target?.result;
                const { read, utils } = await import('xlsx');
                const wb = read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = utils.sheet_to_json(ws);

                if (data.length === 0) {
                    toast.error("The selected file appears to be empty.");
                    setIsProcessing(false);
                    return;
                }

                // Map Excel headers to Student fields
                const formattedItems = data.map((item: any) => {
                    const studentName = item['Student Name'] || item['Name'] || item.name || '';
                    const registrationNo = item['Registration No'] || item['Adm No'] || item.registrationNo || item.admNo || '';
                    const studentClass = item['Class'] || item['Grade'] || item.studentClass || '';
                    
                    const cleanReg = registrationNo.toString().replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || "student";
                    const portalUsername = registrationNo || studentName.toLowerCase().replace(/\s+/g, ".").slice(0, 15);
                    const portalPassword = `shule@${cleanReg}`;

                    const pick = (...keys: string[]) => { for (const k of keys) { if (item[k] !== undefined && item[k] !== null && String(item[k]).trim() !== '') return String(item[k]).trim(); } return ''; };

                    return {
                        studentName,
                        registrationNo: registrationNo.toString(),
                        admNo: pick('Admission No', 'Adm No', 'admNo'),
                        studentClass,
                        gender: pick('Gender', 'gender') || 'Male',
                        dob: pick('Date of Birth', 'DOB', 'dob'),
                        email: pick('Email', 'Student Email', 'email'),
                        phone: pick('Phone', 'Mobile', 'phone'),
                        address: pick('Address', 'Postal Address', 'address'),
                        bloodGroup: pick('Blood Group', 'bloodGroup'),
                        religion: pick('Religion', 'religion'),
                        nationality: pick('Nationality', 'nationality'),
                        previousSchool: pick('Previous School', 'previousSchool'),
                        transportZone: pick('Transport Zone', 'transportZone'),
                        admissionDate: pick('Admission Date', 'admissionDate') || new Date().toISOString().split('T')[0],
                        // Father / Guardian
                        fatherName: pick('Father Name', 'Guardian', 'fatherName'),
                        fatherNationalId: pick('Father National ID', 'Father ID', 'fatherNationalId'),
                        fatherPhone: pick('Father Phone', 'Father Mobile', 'fatherPhone'),
                        fatherOccupation: pick('Father Occupation', 'fatherOccupation'),
                        fatherEmail: pick('Father Email', 'fatherEmail'),
                        // Mother
                        motherName: pick('Mother Name', 'motherName'),
                        motherNationalId: pick('Mother National ID', 'Mother ID', 'motherNationalId'),
                        motherPhone: pick('Mother Phone', 'Mother Mobile', 'motherPhone'),
                        motherOccupation: pick('Mother Occupation', 'motherOccupation'),
                        motherEmail: pick('Mother Email', 'motherEmail'),
                        // General parent contact (used by receipts / result emails)
                        parentEmail: pick('Father Email', 'Mother Email', 'Parent Email'),
                        parentPhone: pick('Father Phone', 'Mother Phone', 'Parent Phone'),
                        status: pick('Status', 'status') || 'Active',
                        balance: Number(item['Balance'] || item.balance) || 0,
                        discount: String(item['Discount'] || item.discount || '0'),
                        avatar: item['Avatar'] || item.avatar || '',
                        portalUsername,
                        portalPassword,
                        credentialsGenerated: true,
                        lastPasswordReset: new Date().toISOString()
                    };
                });

                await api.post("/students/bulk", { items: formattedItems });
                
                toast.success(`Successfully imported ${formattedItems.length} students!`);
                queryClient.invalidateQueries({ queryKey: ["students-list"] });
                setShowImportModal(false);
                navigate("/students");
            } catch (error: any) {
                console.error("Import Error:", error);
                toast.error(error.response?.data?.message || "Failed to process the student list.");
            } finally {
                setIsProcessing(false);
            }
        };

        reader.readAsBinaryString(file);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) processFile(file);
    };

    const downloadSample = async () => {
        try {
            const { utils, writeFile } = await import('xlsx');
            const sampleData = [
                {
                    "Student Name": "John Doe", "Registration No": "BS101", "Admission No": "ADM001", "Class": "1 East",
                    "Gender": "Male", "Date of Birth": "2012-05-10", "Email": "", "Phone": "+254700000000",
                    "Address": "P.O Box 123, Nairobi", "Blood Group": "O+", "Religion": "Christianity", "Nationality": "Kenyan",
                    "Previous School": "Sunrise Academy", "Transport Zone": "Zone A", "Admission Date": "2026-01-05",
                    "Father Name": "Peter Doe", "Father National ID": "12345678", "Father Phone": "+254700000001", "Father Occupation": "Engineer", "Father Email": "peter@example.com",
                    "Mother Name": "Mary Doe", "Mother National ID": "87654321", "Mother Phone": "+254700000002", "Mother Occupation": "Teacher", "Mother Email": "mary@example.com",
                    "Balance": 0, "Discount": "0",
                },
                {
                    "Student Name": "Jane Smith", "Registration No": "BS102", "Admission No": "ADM002", "Class": "1 West",
                    "Gender": "Female", "Date of Birth": "2013-08-15", "Email": "", "Phone": "+254711111111",
                    "Address": "P.O Box 456, Nakuru", "Blood Group": "A+", "Religion": "Islam", "Nationality": "Kenyan",
                    "Previous School": "", "Transport Zone": "", "Admission Date": "2026-01-05",
                    "Father Name": "Ali Smith", "Father National ID": "22334455", "Father Phone": "+254711111112", "Father Occupation": "Trader", "Father Email": "ali@example.com",
                    "Mother Name": "Fatima Smith", "Mother National ID": "55443322", "Mother Phone": "+254711111113", "Mother Occupation": "Nurse", "Mother Email": "fatima@example.com",
                    "Balance": 500, "Discount": "10",
                },
            ];
            const ws = utils.json_to_sheet(sampleData);
            const wb = utils.book_new();
            utils.book_append_sheet(wb, ws, "Students");
            writeFile(wb, "ShuleCloud_Student_Import_Template.xlsx");
            toast.success("Excel template downloaded successfully!");
        } catch (err) {
            toast.error("Failed to generate Excel template");
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) {
            const ext = file.name.split('.').pop()?.toLowerCase();
            if (['xlsx', 'xls', 'csv'].includes(ext || '')) {
                processFile(file);
            } else {
                toast.error("Unsupported file format. Please upload Excel or CSV.");
            }
        }
    };

    return (
        <div className="flex-1 bg-[#f4f7f6] min-h-screen flex flex-col">
            {/* Breadcrumb Header */}
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center shadow-sm z-10 m-4 rounded-xl flex-wrap gap-4">
                <div className="flex items-center flex-1">
                    <span className="font-bold text-gray-800 text-lg mr-2">Students</span>
                    <span className="text-gray-300 mx-2">|</span>
                    <Home className="w-4 h-4 text-gray-500 mr-2" />
                    <span className="text-gray-500 font-medium">
                        - Admission Form
                    </span>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setShowQuickAdd(true)} className="px-4 py-2 bg-[#ff5e5e] text-white text-xs font-bold rounded-md shadow-sm">Customize</button>
                    <button 
                        onClick={() => setShowImportModal(true)}
                        className="px-4 py-2 bg-[#5C67F2] hover:bg-[#4a54c4] text-white text-xs font-bold rounded-md shadow-sm flex items-center gap-2 transition-all"
                    >
                        <Download className="w-3.5 h-3.5" /> Import Students
                    </button>
                </div>
            </div>

            <div className="px-6 pb-6">
                <div className="max-w-[1000px] mx-auto bg-white rounded-3xl shadow-sm border border-gray-100 p-8 relative">
                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Admission Form</h2>
                        <div className="flex items-center justify-center gap-4 mt-2 text-sm">
                            <div className="flex items-center gap-1.5 text-[#5C67F2] font-bold">
                                <div className="w-3.5 h-1.5 bg-[#5C67F2] rounded-full"></div>
                                Required*
                            </div>
                            <div className="flex items-center gap-1.5 text-gray-400 font-bold">
                                <div className="w-3.5 h-1.5 bg-gray-300 rounded-full"></div>
                                Optional
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-10">
                        {/* Section 1 */}
                        <div>
                            <h3 className="flex items-center gap-2 font-bold text-gray-800 mb-6">
                                <div className="w-6 h-6 rounded-full bg-gray-800 text-white flex items-center justify-center text-xs">1</div>
                                Student Information
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <InputField name="studentName" value={formData.studentName} onChange={handleChange} label="Student Name*" placeholder="Name of Student" required />
                                <InputField name="registrationNo" value={formData.registrationNo} onChange={handleChange} label="Last Registration*" placeholder="Registration No" required />
                                {/* Enrollment class (V2) */}
                                <div className="relative">
                                    <div className="absolute -top-3 left-6 bg-indigo-500 text-white text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-widest z-10 shadow-sm">Class *</div>
                                    <select value={enroll.classId} onChange={e => setEnroll({ classId: e.target.value, streamId: "" })}
                                        className="w-full h-12 px-6 border border-gray-200 rounded-full bg-white focus:outline-none focus:border-[#5C67F2] text-sm text-gray-700 font-bold appearance-none cursor-pointer">
                                        <option value="">Select class…</option>
                                        {v2Classes.map((c: any) => <option key={c._id} value={c._id}>{c.name}</option>)}
                                    </select>
                                </div>
                                {/* Stream (depends on class) */}
                                <div className="relative">
                                    <div className="absolute -top-3 left-6 bg-indigo-500 text-white text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-widest z-10 shadow-sm">Stream *</div>
                                    <select value={enroll.streamId} onChange={e => setEnroll(p => ({ ...p, streamId: e.target.value }))} disabled={!enroll.classId}
                                        className="w-full h-12 px-6 border border-gray-200 rounded-full bg-white focus:outline-none focus:border-[#5C67F2] text-sm text-gray-700 font-bold appearance-none cursor-pointer disabled:bg-slate-50 disabled:text-slate-300">
                                        <option value="">{enroll.classId ? "Select stream…" : "Pick class first"}</option>
                                        {v2Streams.map((s: any) => <option key={s._id} value={s._id}>{s.name}</option>)}
                                    </select>
                                </div>
                                
                                <div className="relative">
                                    <div className="absolute -top-3 left-6 bg-indigo-500 text-white text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-widest z-10 shadow-sm border border-white/20">
                                        Student Photo
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full border-2 border-[#5C67F2]/20 overflow-hidden bg-slate-50 flex items-center justify-center shrink-0 shadow-inner">
                                            {formData.avatar ? (
                                                <img src={formData.avatar} alt="Student" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="text-[#5C67F2] font-black text-xs uppercase tracking-tighter opacity-30">IMG</div>
                                            )}
                                        </div>
                                        <label className="flex-1 h-12 border border-gray-200 rounded-full flex items-center px-4 bg-white cursor-pointer hover:border-[#5C67F2] transition-colors group">
                                            <span className="text-xs text-gray-400 group-hover:text-[#5C67F2] font-bold">
                                                {formData.avatar ? 'Change Photo' : 'Choose Photo...'}
                                            </span>
                                            <input 
                                                type="file" 
                                                className="hidden" 
                                                accept="image/*"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        const reader = new FileReader();
                                                        reader.onloadend = () => {
                                                            setFormData({ ...formData, avatar: reader.result as string });
                                                        };
                                                        reader.readAsDataURL(file);
                                                    }
                                                }}
                                            />
                                        </label>
                                    </div>
                                </div>

                                <InputField name="admissionDate" value={formData.admissionDate} onChange={handleChange} label="Date of Admission*" placeholder="15/05/2026" required isDate />
                                <InputField name="discount" value={formData.discount} onChange={handleChange} label="Discount In Fee*" placeholder="In %" required />
                                <div className="md:col-start-3">
                                    <InputField name="phone" value={formData.phone} onChange={handleChange} label="Mobile No. For SMS/WhatsApp" placeholder="e.g +44xxxxxxxxxx" />
                                </div>
                                <div className="col-span-1 md:col-span-2 lg:col-span-3">
                                    <SelectField 
                                        name="transportZone" 
                                        value={formData.transportZone} 
                                        onChange={handleChange} 
                                        label="Transport Zone" 
                                        placeholder="No Transport Zone (Select to Assign)" 
                                        options={zones.map((z: any) => z.name)} 
                                    />
                                </div>
                            </div>
                        </div>

                        <hr className="border-gray-100" />

                        {/* Section 2 */}
                        <div>
                            <h3 className="flex items-center gap-2 font-bold text-gray-800 mb-6">
                                <div className="w-6 h-6 rounded-full bg-gray-800 text-white flex items-center justify-center text-xs">2</div>
                                Other Information
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <InputField name="dob" value={formData.dob} onChange={handleChange} label="Date Of Birth" placeholder="dd/mm/yyyy" isDate />
                                <InputField label="Student Birth Form ID / NIC" placeholder="Student Birth Form ID / NIC" />
                                <SelectField label="Orphan Student" placeholder="Select" options={['Yes', 'No']} />
                                
                                <SelectField name="gender" value={formData.gender} onChange={handleChange} label="Gender" placeholder="Gender" options={['Male', 'Female', 'Other']} />
                                {/* Residence — boarder vs day scholar (driven by School Type in profile) */}
                                <div className="relative">
                                    <div className="absolute -top-3 left-6 bg-[#5C67F2] text-white text-[10px] px-3 py-1 rounded-full font-semibold tracking-wide z-10 shadow-sm">
                                        Residence{schoolType === "Mixed" ? "*" : ""}
                                    </div>
                                    <select
                                        name="boarding" value={formData.boarding} onChange={handleChange}
                                        disabled={schoolType !== "Mixed"}
                                        className="w-full h-12 px-5 border border-gray-300 rounded-full focus:outline-none focus:border-[#5C67F2] text-gray-700 bg-white appearance-none cursor-pointer text-sm disabled:bg-slate-50 disabled:text-slate-500"
                                    >
                                        <option value="" disabled>Select residence</option>
                                        <option value="Boarder">Boarder</option>
                                        <option value="Day Scholar">Day Scholar</option>
                                    </select>
                                    {schoolType !== "Mixed" && (
                                        <p className="text-[9px] text-slate-400 mt-1 ml-6 font-bold">Fixed by school type ({schoolType}). Change it in General Settings → Institute Profile.</p>
                                    )}
                                </div>
                                <InputField label="Cast" placeholder="Cast" />
                                <SelectField label="OSC" placeholder="Select" options={['Yes', 'No']} />
                                
                                <InputField label="Any Identification Mark?" placeholder="Any Identification Mark?" />
                                <InputField label="Previous School" placeholder="Previous School" />
                                <SelectField label="Religion" placeholder="Religion" options={['Islam', 'Christianity', 'Other']} />

                                <SelectField label="Blood Group" placeholder="Blood Group" options={['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']} />
                                <InputField label="Previous ID / Board Roll No" placeholder="Previous ID / Board Roll No" />
                                <SelectField label="Select Family" placeholder="Select" />

                                <InputField label="Disease If Any?" placeholder="Disease If Any?" />
                                <InputField label="Any Additional Note" placeholder="Any Additional Note" />
                                <InputField label="Total Siblings" placeholder="Total Siblings" />

                                <InputField label="Address" placeholder="Address" />
                                <div className="flex items-end">
                                    <button 
                                        type="button" 
                                        onClick={() => setShowParents(!showParents)}
                                        className={`h-12 px-6 ${showParents ? 'bg-gray-500' : 'bg-[#FF9A5A] hover:bg-[#FF8A40]'} text-white rounded-full text-xs font-bold transition-all shadow-sm flex items-center gap-2`}
                                    >
                                        <Plus className={`w-4 h-4 transition-transform duration-300 ${showParents ? 'rotate-45' : ''}`} /> 
                                        {showParents ? 'Hide Parents' : 'Add Parents'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {showParents && (
                            <div className="space-y-10 animate-in fade-in slide-in-from-top-4 duration-500">
                                <hr className="border-gray-100" />
                                {/* Section 3 */}
                                <div>
                                    <h3 className="flex items-center gap-2 font-bold text-gray-800 mb-6">
                                        <div className="w-6 h-6 rounded-full bg-gray-800 text-white flex items-center justify-center text-xs">3</div>
                                        Father/Guardien Information
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        <InputField label="Father Name" placeholder="Father Name" />
                                        <InputField label="Father National ID" placeholder="Father National ID" />
                                        <InputField label="Occupation" placeholder="Occupation" />
                                        <InputField label="Education" placeholder="Education" />
                                        <InputField label="Mobile No" placeholder="Mobile No" />
                                        <InputField label="Profession" placeholder="Profession" />
                                        <div className="lg:col-start-3">
                                            <InputField label="Income" placeholder="Income" />
                                        </div>
                                    </div>
                                </div>

                                <hr className="border-gray-100" />

                                {/* Section 4 */}
                                <div>
                                    <h3 className="flex items-center gap-2 font-bold text-gray-800 mb-6">
                                        <div className="w-6 h-6 rounded-full bg-gray-800 text-white flex items-center justify-center text-xs">4</div>
                                        Mother Information
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        <InputField label="Mother Name" placeholder="Mother Name" />
                                        <InputField label="Mother National ID" placeholder="Mother National ID" />
                                        <InputField label="Occupation" placeholder="Occupation" />
                                        <InputField label="Education" placeholder="Education" />
                                        <InputField label="Mobile No" placeholder="Mobile No" />
                                        <InputField label="Profession" placeholder="Profession" />
                                        <div className="lg:col-start-3">
                                            <InputField label="Income" placeholder="Income" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-center gap-4 pt-6 border-t border-gray-100">
                            <button 
                                type="button" 
                                onClick={() => setFormData({
                                    studentName: "", registrationNo: "", studentClass: "",
                                    admissionDate: "2026-05-15", discount: "0", phone: "", dob: "", gender: "Male",
                                    avatar: "", transportZone: "",
                                    boarding: schoolType === "Boarding" ? "Boarder" : schoolType === "Day" ? "Day Scholar" : ""
                                })}
                                className="h-12 px-8 bg-[#FFC165] hover:bg-[#e0a855] text-gray-800 font-bold rounded-full shadow-sm flex items-center gap-2 transition-colors"
                            >
                                <RotateCcw className="w-4 h-4" /> Reset
                            </button>
                            <button 
                                type="submit" 
                                disabled={isCreating}
                                className="h-12 px-10 bg-[#5C67F2] hover:bg-[#4a54c4] text-white font-bold rounded-full shadow-lg shadow-indigo-200 flex items-center gap-2 transition-all disabled:opacity-50"
                            >
                                {isCreating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />} 
                                Submit
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Import Students Dialog */}
            <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
                <DialogContent className="p-0 border-none overflow-hidden rounded-[24px] max-w-2xl shadow-2xl bg-white">
                    <DialogHeader className="bg-gradient-to-r from-[#5C67F2] to-[#7A85F7] p-6 text-white flex flex-row items-center justify-between space-y-0">
                        <div className="flex flex-col">
                            <DialogTitle className="text-xl font-bold tracking-tight">Bulk Student Import</DialogTitle>
                            <DialogDescription className="text-indigo-100 text-xs mt-1">
                                Upload a CSV or Excel spreadsheet of student admission details.
                            </DialogDescription>
                        </div>
                        <button 
                            onClick={() => setShowImportModal(false)}
                            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all shadow-sm"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </DialogHeader>

                    <div className="p-6 space-y-6">
                        {/* Drag and Drop Zone */}
                        <div
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            className={`border-2 border-dashed rounded-[20px] p-8 text-center transition-all ${
                                isDragging 
                                    ? "border-[#5C67F2] bg-indigo-50/50 scale-[0.98]" 
                                    : "border-gray-200 hover:border-gray-300 bg-slate-50/30"
                            }`}
                        >
                            <div className="max-w-md mx-auto space-y-4">
                                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm border border-slate-100">
                                    <Upload className={`w-8 h-8 ${isDragging ? 'text-[#5C67F2] animate-bounce' : 'text-slate-400'}`} />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-base font-bold text-gray-800">Drag and drop your spreadsheet here</h3>
                                    <p className="text-xs text-gray-400">Supports .xlsx, .xls, and .csv files</p>
                                </div>
                                
                                <div className="pt-2">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileUpload}
                                        accept=".xlsx, .xls, .csv"
                                        className="hidden"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isProcessing}
                                        className="px-6 py-2.5 bg-white border border-gray-200 text-gray-700 text-xs font-bold rounded-full hover:border-[#5C67F2] hover:text-[#5C67F2] transition-colors inline-flex items-center gap-2 shadow-sm disabled:opacity-50"
                                    >
                                        {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                                        {isProcessing ? 'Processing File...' : 'Select File Manually'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Excel Template & Guidelines */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-slate-50 p-5 rounded-2xl border border-gray-100 flex flex-col justify-between">
                                <div className="space-y-1">
                                    <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Excel Template</h4>
                                    <p className="text-[11px] text-gray-400">Download the standard spreadsheet formatting schema to structure your records.</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={downloadSample}
                                    className="mt-4 w-full py-2.5 bg-[#5C67F2] hover:bg-[#4a54c4] text-white text-xs font-bold rounded-full shadow-sm flex items-center justify-center gap-2 transition-all"
                                >
                                    <Download className="w-3.5 h-3.5" /> Download Template
                                </button>
                            </div>

                            <div className="bg-slate-50 p-5 rounded-2xl border border-gray-100 space-y-3">
                                <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Import Guidelines</h4>
                                <ul className="text-[11px] text-gray-500 space-y-2 list-disc list-inside">
                                    <li>Column headers must match the template exactly.</li>
                                    <li>Registration No must be unique.</li>
                                    <li>Class names must match existing class levels.</li>
                                    <li>Date fields must follow YYYY-MM-DD.</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Quick Add table (Customize) — record basic info for many students fast */}
            <QuickAddStudents
                open={showQuickAdd}
                onOpenChange={setShowQuickAdd}
                classes={v2Classes}
                allStreams={v2AllStreams}
                activeYear={activeYear}
                onDone={() => { queryClient.invalidateQueries({ queryKey: ["students"] }); queryClient.invalidateQueries({ queryKey: ["students-list"] }); }}
            />
        </div>
    );
}

// ── Quick Add table ──────────────────────────────────────────────────────────
// A simple grid to capture students' basic info — Name, Class, Stream, Reg/Adm No,
// Gender — and admit them all at once (creates the student + v2 enrollment).
function QuickAddStudents({ open, onOpenChange, classes, allStreams, activeYear, onDone }: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    classes: any[];
    allStreams: any[];
    activeYear: any;
    onDone: () => void;
}) {
    type Row = { name: string; classId: string; streamId: string; reg: string; gender: string };
    const blank = (): Row => ({ name: "", classId: "", streamId: "", reg: "", gender: "Male" });
    const [rows, setRows] = useState<Row[]>([blank(), blank(), blank()]);
    const [saving, setSaving] = useState(false);

    const setRow = (i: number, patch: Partial<Row>) => setRows(rs => rs.map((r, j) => j === i ? { ...r, ...patch } : r));
    const addRow = () => setRows(rs => [...rs, blank()]);
    const removeRow = (i: number) => setRows(rs => rs.length > 1 ? rs.filter((_, j) => j !== i) : rs);
    const streamsFor = (classId: string) => allStreams.filter((s: any) => String(s.classId) === String(classId));

    const save = async () => {
        const filled = rows.filter(r => r.name.trim() && r.classId);
        if (!filled.length) { toast.error("Add at least one student with a name and class."); return; }
        setSaving(true);
        let ok = 0, fail = 0;
        for (const r of filled) {
            try {
                const cls = classes.find((c: any) => String(c._id) === String(r.classId));
                const stream = allStreams.find((s: any) => String(s._id) === String(r.streamId));
                const fullClass = stream ? (stream.fullName || `${cls?.name || ""} ${stream.name}`) : (cls?.name || "");
                const cleanReg = (r.reg || "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase() || "student";
                const portalUsername = r.reg || r.name.toLowerCase().replace(/\s+/g, ".").slice(0, 15);
                const created: any = (await api.post("/students", {
                    studentName: r.name.trim(),
                    registrationNo: r.reg.trim(),
                    admNo: r.reg.trim(),
                    studentClass: fullClass,
                    classId: r.classId,
                    streamId: r.streamId || null,
                    stream: stream?.name || "",
                    streamName: stream?.name || "",
                    gender: r.gender,
                    admissionDate: new Date().toISOString().split("T")[0],
                    status: "Active",
                    portalUsername,
                    portalPassword: `shule@${cleanReg}`,
                    credentialsGenerated: true,
                    lastPasswordReset: new Date().toISOString(),
                })).data;
                const newId = created?._id || created?.id || created?.insertedId;
                if (newId && r.classId && r.streamId && activeYear?._id) {
                    await api.post("/v2/enrollments", { studentId: String(newId), academicYearId: activeYear._id, classId: r.classId, streamId: r.streamId }).catch(() => {});
                }
                ok++;
            } catch { fail++; }
        }
        setSaving(false);
        if (ok) toast.success(`Admitted ${ok} student${ok > 1 ? "s" : ""}${fail ? ` · ${fail} failed` : ""}.`);
        else toast.error("Could not admit students.");
        if (ok) { setRows([blank(), blank(), blank()]); onDone(); onOpenChange(false); }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="p-0 border-none overflow-hidden rounded-[24px] max-w-4xl shadow-2xl bg-white">
                <DialogHeader className="bg-gradient-to-r from-[#5C67F2] to-[#7A85F7] p-6 text-white flex flex-row items-center justify-between space-y-0">
                    <div className="flex flex-col">
                        <DialogTitle className="text-xl font-bold tracking-tight">Quick Add Students</DialogTitle>
                        <DialogDescription className="text-indigo-100 text-xs mt-1">Record basic info — name, class, stream, reg/adm no, gender — and admit them all at once.</DialogDescription>
                    </div>
                    <button onClick={() => onOpenChange(false)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"><X className="w-4 h-4" /></button>
                </DialogHeader>

                <div className="p-5 max-h-[60vh] overflow-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100">
                                <th className="py-2 pr-2 w-8">#</th>
                                <th className="py-2 pr-2">Name *</th>
                                <th className="py-2 pr-2">Reg / Adm No</th>
                                <th className="py-2 pr-2">Class *</th>
                                <th className="py-2 pr-2">Stream</th>
                                <th className="py-2 pr-2">Gender</th>
                                <th className="py-2 w-8"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((r, i) => (
                                <tr key={i} className="border-b border-slate-50">
                                    <td className="py-1.5 pr-2 text-slate-400 font-bold">{i + 1}</td>
                                    <td className="py-1.5 pr-2"><input value={r.name} onChange={e => setRow(i, { name: e.target.value })} placeholder="Student name" className="w-full h-9 px-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#5C67F2]" /></td>
                                    <td className="py-1.5 pr-2"><input value={r.reg} onChange={e => setRow(i, { reg: e.target.value })} placeholder="e.g. BS120" className="w-28 h-9 px-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#5C67F2]" /></td>
                                    <td className="py-1.5 pr-2">
                                        <select value={r.classId} onChange={e => setRow(i, { classId: e.target.value, streamId: "" })} className="w-32 h-9 px-2 rounded-lg border border-slate-200 text-sm bg-white">
                                            <option value="">— Class —</option>
                                            {classes.map((c: any) => <option key={c._id} value={c._id}>{c.name}</option>)}
                                        </select>
                                    </td>
                                    <td className="py-1.5 pr-2">
                                        <select value={r.streamId} onChange={e => setRow(i, { streamId: e.target.value })} disabled={!r.classId} className="w-28 h-9 px-2 rounded-lg border border-slate-200 text-sm bg-white disabled:bg-slate-50">
                                            <option value="">—</option>
                                            {streamsFor(r.classId).map((s: any) => <option key={s._id} value={s._id}>{s.name}</option>)}
                                        </select>
                                    </td>
                                    <td className="py-1.5 pr-2">
                                        <select value={r.gender} onChange={e => setRow(i, { gender: e.target.value })} className="w-24 h-9 px-2 rounded-lg border border-slate-200 text-sm bg-white">
                                            <option>Male</option><option>Female</option>
                                        </select>
                                    </td>
                                    <td className="py-1.5"><button onClick={() => removeRow(i)} className="text-slate-300 hover:text-red-500"><X className="w-4 h-4" /></button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <button onClick={addRow} className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-[#5C67F2] hover:text-[#4a54c4]"><Plus className="w-4 h-4" /> Add row</button>
                </div>

                <div className="p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                    <p className="text-xs text-slate-400 font-bold">{rows.filter(r => r.name.trim() && r.classId).length} ready to admit</p>
                    <div className="flex gap-2">
                        <button onClick={() => onOpenChange(false)} className="h-10 px-4 rounded-xl border border-slate-200 text-sm font-bold text-slate-500">Cancel</button>
                        <button onClick={save} disabled={saving} className="h-10 px-5 rounded-xl bg-[#5C67F2] text-white text-sm font-bold flex items-center gap-1.5 disabled:opacity-50">
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Admit Students
                        </button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function InputField({ label, placeholder, required, isDate, name, value, onChange }: { label: string, placeholder: string, required?: boolean, isDate?: boolean, name?: string, value?: string, onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
    const isReq = label.includes('*') || required;
    const colorClass = isReq ? "bg-[#5C67F2]" : "bg-gray-400";
    return (
        <div className="relative">
            <div className={`absolute -top-3 left-6 ${colorClass} text-white text-[10px] px-3 py-1 rounded-full font-semibold tracking-wide z-10 shadow-sm`}>
                {label}
            </div>
            <input 
                type={isDate ? "date" : "text"} 
                name={name}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className="w-full h-12 px-5 border border-gray-300 rounded-full focus:outline-none focus:border-[#5C67F2] text-gray-700 placeholder-gray-400 bg-white text-sm"
            />
        </div>
    );
}

function SelectField({ label, placeholder, required, name, value, onChange, options = [] }: { label: string, placeholder: string, required?: boolean, name?: string, value?: string, onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void, options?: string[] }) {
    const isReq = label.includes('*') || required;
    const colorClass = isReq ? "bg-[#5C67F2]" : "bg-gray-400";
    return (
        <div className="relative">
            <div className={`absolute -top-3 left-6 ${colorClass} text-white text-[10px] px-3 py-1 rounded-full font-semibold tracking-wide z-10 shadow-sm`}>
                {label}
            </div>
            <select 
                name={name}
                value={value}
                onChange={onChange}
                className="w-full h-12 px-5 border border-gray-300 rounded-full focus:outline-none focus:border-[#5C67F2] text-gray-700 bg-white appearance-none cursor-pointer text-sm"
            >
                <option value="" disabled>{placeholder}</option>
                {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
        </div>
    );
}
