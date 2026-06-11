import { useState, useEffect } from "react";
import { Home, Plus, RotateCcw, Check, Loader2, ArrowLeft } from "lucide-react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useItems } from "@/hooks/useItems";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

export default function EditStudent() {
    const navigate = useNavigate();
    const { id } = useParams();
    const { updateItem, isUpdating } = useItems("students");

    const { data: student, isLoading } = useQuery({
        queryKey: ["student", id],
        queryFn: async () => {
            const r = await api.get("/students");
            return (r.data as any[]).find((s: any) => s._id === id);
        },
    });

    const { data: classes = [] } = useQuery({
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

    const classNames = classes.map((c: any) => c.name || c.levelName).filter(Boolean);

    const [formData, setFormData] = useState({
        studentName: "",
        registrationNo: "",
        studentClass: "",
        admissionDate: "",
        discount: "0",
        phone: "",
        dob: "",
        gender: "Male",
        birthFormId: "",
        orphan: "",
        cast: "",
        osc: "",
        identificationMark: "",
        previousSchool: "",
        religion: "",
        bloodGroup: "",
        previousId: "",
        family: "",
        disease: "",
        additionalNote: "",
        totalSiblings: "",
        address: "",
        fatherName: "",
        fatherNationalId: "",
        fatherOccupation: "",
        fatherEducation: "",
        fatherPhone: "",
        fatherProfession: "",
        fatherIncome: "",
        motherName: "",
        motherNationalId: "",
        motherOccupation: "",
        motherEducation: "",
        motherPhone: "",
        motherProfession: "",
        motherIncome: "",
        avatar: "",
        transportZone: "",
    });
    const [showParents, setShowParents] = useState(false);

    useEffect(() => {
        if (student) {
            setFormData({
                studentName: student.studentName || student.name || "",
                registrationNo: student.registrationNo || "",
                studentClass: student.studentClass || "",
                admissionDate: student.admissionDate || "",
                discount: student.discount || "0",
                phone: student.phone || "",
                dob: student.dob || "",
                gender: student.gender || "Male",
                birthFormId: student.birthFormId || "",
                orphan: student.orphan || "",
                cast: student.cast || "",
                osc: student.osc || "",
                identificationMark: student.identificationMark || "",
                previousSchool: student.previousSchool || "",
                religion: student.religion || "",
                bloodGroup: student.bloodGroup || "",
                previousId: student.previousId || "",
                family: student.family || "",
                disease: student.disease || "",
                additionalNote: student.additionalNote || "",
                totalSiblings: student.totalSiblings || "",
                address: student.address || "",
                fatherName: student.fatherName || "",
                fatherNationalId: student.fatherNationalId || "",
                fatherOccupation: student.fatherOccupation || "",
                fatherEducation: student.fatherEducation || "",
                fatherPhone: student.fatherPhone || "",
                fatherProfession: student.fatherProfession || "",
                fatherIncome: student.fatherIncome || "",
                motherName: student.motherName || "",
                motherNationalId: student.motherNationalId || "",
                motherOccupation: student.motherOccupation || "",
                motherEducation: student.motherEducation || "",
                motherPhone: student.motherPhone || "",
                motherProfession: student.motherProfession || "",
                motherIncome: student.motherIncome || "",
                avatar: student.avatar || "",
                transportZone: student.transportZone || "",
            });
            if (student.fatherName || student.motherName) setShowParents(true);
        }
    }, [student]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        updateItem({ id: id!, data: formData }, {
            onSuccess: () => navigate("/students")
        } as any);
    };

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-[#f4f7f6]">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 animate-spin text-[#5C67F2] mx-auto mb-3" />
                    <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest">Loading Student Data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 bg-[#f4f7f6] min-h-screen flex flex-col">
            {/* Breadcrumb */}
            <div className="bg-white border-b border-gray-100 px-5 py-3 flex items-center shadow-sm z-10 m-4 rounded-xl">
                <span className="font-bold text-gray-800 text-sm mr-2">Students</span>
                <span className="text-gray-300 mx-2">|</span>
                <Home className="w-3.5 h-3.5 text-gray-500 mr-1.5" />
                <span className="text-gray-500 font-medium text-sm">- Edit Student</span>
            </div>

            <div className="px-6 pb-6">
                <button 
                    onClick={() => navigate("/students")}
                    className="mb-4 px-4 py-1 bg-white border border-gray-100 text-slate-400 rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-1.5 shadow-sm"
                >
                    <ArrowLeft className="w-3 h-3" /> Back to Students
                </button>

                <div className="max-w-[1000px] mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-8 relative">
                    <div className="text-center mb-8">
                        <h2 className="text-xl font-black text-gray-800 tracking-tight">Edit Student Record</h2>
                        <div className="flex items-center justify-center gap-4 mt-2 text-xs">
                            <div className="flex items-center gap-1.5 text-[#5C67F2] font-bold">
                                <div className="w-3 h-1.5 bg-[#5C67F2] rounded-full"></div>
                                Required*
                            </div>
                            <div className="flex items-center gap-1.5 text-gray-400 font-bold">
                                <div className="w-3 h-1.5 bg-gray-300 rounded-full"></div>
                                Optional
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* Section 1: Student Information */}
                        <div>
                            <h3 className="flex items-center gap-2 font-bold text-gray-800 text-sm mb-5">
                                <div className="w-5 h-5 rounded-full bg-gray-800 text-white flex items-center justify-center text-[10px]">1</div>
                                Student Information
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                <InputField name="studentName" value={formData.studentName} onChange={handleChange} label="Student Name*" placeholder="Name of Student" required />
                                <InputField name="registrationNo" value={formData.registrationNo} onChange={handleChange} label="Registration No*" placeholder="Registration No" required />
                                {/* Class is managed via the Enrollment system (preserves history). */}
                                <div className="relative">
                                    <div className="absolute -top-3 left-6 bg-indigo-500 text-white text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-widest z-10 shadow-sm">Class</div>
                                    <Link to="/academic-system/enroll"
                                        className="w-full h-12 px-6 border border-dashed border-[#5C67F2]/40 rounded-full bg-[#5C67F2]/5 flex items-center justify-between text-sm font-bold text-[#5C67F2] hover:bg-[#5C67F2]/10 transition-colors">
                                        <span>{formData.studentClass || "Manage via Enrollment"}</span>
                                        <span className="text-[10px] uppercase tracking-widest">Enroll →</span>
                                    </Link>
                                </div>
                                <InputField name="admissionDate" value={formData.admissionDate} onChange={handleChange} label="Date of Admission*" placeholder="dd/mm/yyyy" required isDate />
                                <InputField name="discount" value={formData.discount} onChange={handleChange} label="Discount In Fee" placeholder="In %" />
                                <div className="relative">
                                    <div className="absolute -top-3 left-6 bg-indigo-500 text-white text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-widest z-10 shadow-sm border border-white/20">
                                        Student Photo
                                    </div>
                                    <div className="flex items-center gap-4 mt-2">
                                        <div className="w-11 h-11 rounded-full border-2 border-[#5C67F2]/20 overflow-hidden bg-slate-50 flex items-center justify-center shrink-0 shadow-inner">
                                            {formData.avatar ? (
                                                <img src={formData.avatar} alt="Student" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="text-[#5C67F2] font-black text-[10px] uppercase tracking-tighter opacity-30">IMG</div>
                                            )}
                                        </div>
                                        <label className="flex-1 h-11 border border-gray-200 rounded-full flex items-center px-4 bg-white cursor-pointer hover:border-[#5C67F2] transition-colors group">
                                            <span className="text-[11px] text-gray-400 group-hover:text-[#5C67F2] font-bold">
                                                {formData.avatar ? 'Update Photo' : 'Choose Photo...'}
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
                                <div className="lg:col-start-3">
                                    <InputField name="phone" value={formData.phone} onChange={handleChange} label="Mobile No." placeholder="e.g +254xxxxxxxxx" />
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

                        {/* Section 2: Other Information */}
                        <div>
                            <h3 className="flex items-center gap-2 font-bold text-gray-800 text-sm mb-5">
                                <div className="w-5 h-5 rounded-full bg-gray-800 text-white flex items-center justify-center text-[10px]">2</div>
                                Other Information
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                <InputField name="dob" value={formData.dob} onChange={handleChange} label="Date Of Birth" placeholder="dd/mm/yyyy" isDate />
                                <InputField name="birthFormId" value={formData.birthFormId} onChange={handleChange} label="Birth Form ID / NIC" placeholder="Birth Form ID" />
                                <SelectField name="orphan" value={formData.orphan} onChange={handleChange} label="Orphan Student" placeholder="Select" options={['Yes', 'No']} />
                                <SelectField name="gender" value={formData.gender} onChange={handleChange} label="Gender" placeholder="Gender" options={['Male', 'Female', 'Other']} />
                                <InputField name="cast" value={formData.cast} onChange={handleChange} label="Cast" placeholder="Cast" />
                                <SelectField name="osc" value={formData.osc} onChange={handleChange} label="OSC" placeholder="Select" options={['Yes', 'No']} />
                                <InputField name="identificationMark" value={formData.identificationMark} onChange={handleChange} label="Identification Mark" placeholder="Any Identification Mark?" />
                                <InputField name="previousSchool" value={formData.previousSchool} onChange={handleChange} label="Previous School" placeholder="Previous School" />
                                <SelectField name="religion" value={formData.religion} onChange={handleChange} label="Religion" placeholder="Religion" options={['Islam', 'Christianity', 'Other']} />
                                <SelectField name="bloodGroup" value={formData.bloodGroup} onChange={handleChange} label="Blood Group" placeholder="Blood Group" options={['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']} />
                                <InputField name="previousId" value={formData.previousId} onChange={handleChange} label="Previous ID / Roll No" placeholder="Previous ID" />
                                <InputField name="disease" value={formData.disease} onChange={handleChange} label="Disease If Any?" placeholder="Disease If Any?" />
                                <InputField name="additionalNote" value={formData.additionalNote} onChange={handleChange} label="Additional Note" placeholder="Any Additional Note" />
                                <InputField name="totalSiblings" value={formData.totalSiblings} onChange={handleChange} label="Total Siblings" placeholder="Total Siblings" />
                                <InputField name="address" value={formData.address} onChange={handleChange} label="Address" placeholder="Address" />
                                <div className="flex items-end">
                                    <button 
                                        type="button" 
                                        onClick={() => setShowParents(!showParents)}
                                        className={`h-10 px-5 ${showParents ? 'bg-gray-500' : 'bg-[#FF9A5A] hover:bg-[#FF8A40]'} text-white rounded-full text-[10px] font-black uppercase tracking-widest transition-all shadow-sm flex items-center gap-2`}
                                    >
                                        <Plus className={`w-3.5 h-3.5 transition-transform duration-300 ${showParents ? 'rotate-45' : ''}`} /> 
                                        {showParents ? 'Hide Parents' : 'Add Parents'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {showParents && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">
                                <hr className="border-gray-100" />
                                {/* Section 3: Father */}
                                <div>
                                    <h3 className="flex items-center gap-2 font-bold text-gray-800 text-sm mb-5">
                                        <div className="w-5 h-5 rounded-full bg-gray-800 text-white flex items-center justify-center text-[10px]">3</div>
                                        Father/Guardian Information
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                        <InputField name="fatherName" value={formData.fatherName} onChange={handleChange} label="Father Name" placeholder="Father Name" />
                                        <InputField name="fatherNationalId" value={formData.fatherNationalId} onChange={handleChange} label="Father National ID" placeholder="National ID" />
                                        <InputField name="fatherOccupation" value={formData.fatherOccupation} onChange={handleChange} label="Occupation" placeholder="Occupation" />
                                        <InputField name="fatherEducation" value={formData.fatherEducation} onChange={handleChange} label="Education" placeholder="Education" />
                                        <InputField name="fatherPhone" value={formData.fatherPhone} onChange={handleChange} label="Mobile No" placeholder="Mobile No" />
                                        <InputField name="fatherProfession" value={formData.fatherProfession} onChange={handleChange} label="Profession" placeholder="Profession" />
                                        <InputField name="fatherIncome" value={formData.fatherIncome} onChange={handleChange} label="Income" placeholder="Income" />
                                    </div>
                                </div>

                                <hr className="border-gray-100" />

                                {/* Section 4: Mother */}
                                <div>
                                    <h3 className="flex items-center gap-2 font-bold text-gray-800 text-sm mb-5">
                                        <div className="w-5 h-5 rounded-full bg-gray-800 text-white flex items-center justify-center text-[10px]">4</div>
                                        Mother Information
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                        <InputField name="motherName" value={formData.motherName} onChange={handleChange} label="Mother Name" placeholder="Mother Name" />
                                        <InputField name="motherNationalId" value={formData.motherNationalId} onChange={handleChange} label="Mother National ID" placeholder="National ID" />
                                        <InputField name="motherOccupation" value={formData.motherOccupation} onChange={handleChange} label="Occupation" placeholder="Occupation" />
                                        <InputField name="motherEducation" value={formData.motherEducation} onChange={handleChange} label="Education" placeholder="Education" />
                                        <InputField name="motherPhone" value={formData.motherPhone} onChange={handleChange} label="Mobile No" placeholder="Mobile No" />
                                        <InputField name="motherProfession" value={formData.motherProfession} onChange={handleChange} label="Profession" placeholder="Profession" />
                                        <InputField name="motherIncome" value={formData.motherIncome} onChange={handleChange} label="Income" placeholder="Income" />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-center gap-3 pt-6 border-t border-gray-100">
                            <button 
                                type="button" 
                                onClick={() => navigate("/students")}
                                className="h-10 px-8 bg-slate-100 text-slate-500 font-black rounded-full text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center gap-2"
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit" 
                                disabled={isUpdating}
                                className="h-10 px-10 bg-[#5C67F2] hover:bg-[#4a54c4] text-white font-black rounded-full shadow-lg shadow-indigo-200 flex items-center gap-2 transition-all disabled:opacity-50 text-[10px] uppercase tracking-widest"
                            >
                                {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} 
                                Save Changes
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

function InputField({ label, placeholder, required, isDate, name, value, onChange }: { label: string, placeholder: string, required?: boolean, isDate?: boolean, name?: string, value?: string, onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
    const isReq = label.includes('*') || required;
    const colorClass = isReq ? "bg-[#5C67F2]" : "bg-gray-400";
    return (
        <div className="relative">
            <div className={`absolute -top-3 left-5 ${colorClass} text-white text-[8px] px-2.5 py-0.5 rounded-full font-black tracking-widest z-10 shadow-sm uppercase`}>
                {label}
            </div>
            <input 
                type={isDate ? "date" : "text"} 
                name={name}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className="w-full h-10 px-5 border border-gray-200 rounded-full focus:outline-none focus:border-[#5C67F2] text-gray-700 placeholder-gray-400 bg-white text-xs font-medium"
            />
        </div>
    );
}

function SelectField({ label, placeholder, required, name, value, onChange, options = [] }: { label: string, placeholder: string, required?: boolean, name?: string, value?: string, onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void, options?: string[] }) {
    const isReq = label.includes('*') || required;
    const colorClass = isReq ? "bg-[#5C67F2]" : "bg-gray-400";
    return (
        <div className="relative">
            <div className={`absolute -top-3 left-5 ${colorClass} text-white text-[8px] px-2.5 py-0.5 rounded-full font-black tracking-widest z-10 shadow-sm uppercase`}>
                {label}
            </div>
            <select 
                name={name}
                value={value}
                onChange={onChange}
                className="w-full h-10 px-5 border border-gray-200 rounded-full focus:outline-none focus:border-[#5C67F2] text-gray-700 bg-white appearance-none cursor-pointer text-xs font-medium"
            >
                <option value="" disabled>{placeholder}</option>
                {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
        </div>
    );
}
