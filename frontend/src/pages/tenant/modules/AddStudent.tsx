import { useState } from "react";
import { Home, Settings, Plus, RotateCcw, Check, Download, Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useItems } from "@/hooks/useItems";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";

export default function AddStudent() {
    const navigate = useNavigate();
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
        avatar: ""
    });
    const [showParents, setShowParents] = useState(false);

    const { data: classesData = [] } = useQuery({
        queryKey: ["classes"],
        queryFn: async () => { const r = await api.get("/academics/classes"); return r.data; },
    });
    const classNames = classesData.map((c: any) => c.name || c.levelName).filter(Boolean);

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
            onSuccess: () => {
                toast.success(`Student added with credentials. Pass: ${portalPassword}`);
                navigate("/students");
            }
        });
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
                    <button className="px-4 py-2 bg-[#ff5e5e] text-white text-xs font-bold rounded-md shadow-sm">Customize</button>
                    <button className="px-4 py-2 bg-[#5C67F2] text-white text-xs font-bold rounded-md shadow-sm flex items-center gap-2">
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
                                <SelectField name="studentClass" value={formData.studentClass} onChange={handleChange} label="Select Class*" placeholder="Select*" required options={classNames} />
                                
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
                                    admissionDate: "2026-05-15", discount: "0", phone: "", dob: "", gender: "Male"
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
        </div>
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
