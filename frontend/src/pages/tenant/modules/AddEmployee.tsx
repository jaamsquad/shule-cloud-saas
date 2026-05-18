import { useState } from "react";
import { Home, RefreshCcw, Check, Calendar, LayoutTemplate, Loader2 } from "lucide-react";
import { useItems } from "@/hooks/useItems";
import { useNavigate } from "react-router-dom";

export default function AddEmployee() {
    const navigate = useNavigate();
    const { createItem, isCreating } = useItems("staff");
    const { items: subjects } = useItems("subjects");
    const [showAllFields, setShowAllFields] = useState(false);
    
    const [formData, setFormData] = useState({
        employeeName: "",
        fatherName: "",
        email: "",
        phone: "",
        dob: "",
        gender: "Male",
        designation: "",
        joiningDate: "",
        salary: "",
        address: "",
        specializedSubjects: [] as string[],
        experience: "",
        nationalId: "",
        religion: "",
        education: "",
        bloodGroup: ""
    });

    const toggleSubject = (subjectId: string) => {
        setFormData(prev => ({
            ...prev,
            specializedSubjects: prev.specializedSubjects.includes(subjectId)
                ? prev.specializedSubjects.filter(id => id !== subjectId)
                : [...prev.specializedSubjects, subjectId]
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createItem(formData, {
            onSuccess: () => navigate("/staff")
        });
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    return (
        <div className="flex-1 bg-[#f4f7f6] min-h-screen flex flex-col items-center pb-20">
            {/* Breadcrumb Header */}
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center shadow-sm z-10 m-4 rounded-xl w-[calc(100%-2rem)] relative">
                <span className="font-bold text-gray-800 text-lg mr-2">Employees</span>
                <span className="text-gray-300 mx-2">|</span>
                <span className="text-gray-500 font-medium">
                    - New Staff
                </span>

                <button 
                    type="button"
                    onClick={() => setShowAllFields(!showAllFields)}
                    className={`absolute right-6 top-1/2 -translate-y-1/2 h-8 px-4 ${showAllFields ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-[#ff5e6c] hover:bg-[#e04553]'} text-white text-[10px] font-bold rounded-full shadow-sm flex items-center gap-1 transition-colors`}
                >
                    <LayoutTemplate className="w-3 h-3" /> {showAllFields ? "Show Less" : "Customize / All Fields"}
                </button>
            </div>

            <div className="w-full max-w-5xl px-6 mt-4">
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-10">
                    <div className="text-center mb-10">
                        <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Employee Form</h2>
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
                        {/* 1. Basic Information */}
                        <div>
                            <div className="flex items-center gap-2 mb-8 border-b border-gray-200 pb-2">
                                <div className="w-6 h-6 rounded-full bg-gray-800 text-white flex items-center justify-center text-xs font-bold">1</div>
                                <h3 className="text-gray-800 font-bold text-lg">Basic Information</h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-8">
                                <InputField name="employeeName" value={formData.employeeName} onChange={handleChange} label="Employee Name*" placeholder="Name of Employee" required />
                                <InputField name="phone" value={formData.phone} onChange={handleChange} label="Mobile No for SMS/WhatsApp" placeholder="e.g +44xxxxxxxxxx" color="gray" />
                                <SelectField name="designation" value={formData.designation} onChange={handleChange} label="Employee Role*" placeholder="Select*" required options={['Teacher', 'Admin', 'Staff', 'Accountant']} />

                                <div className="relative">
                                    <div className="absolute -top-3 left-6 bg-gray-400 text-white text-[11px] px-3 py-1 rounded-full font-semibold tracking-wide z-10 shadow-sm">
                                        Picture - Optional
                                    </div>
                                    <div className="w-full h-12 border border-[#5C67F2]/40 rounded-full flex items-center overflow-hidden bg-white px-2">
                                        <button type="button" className="h-8 px-4 bg-gray-200 text-gray-700 text-xs font-bold rounded-full mr-2 hover:bg-gray-300 transition-colors">Choose File</button>
                                        <span className="text-gray-500 text-sm">No file chosen</span>
                                    </div>
                                    <span className="text-[9px] font-bold text-[#FFC165] bg-[#FFC165]/10 px-2 py-0.5 rounded-full absolute -bottom-5 left-6">Max size 100KB</span>
                                </div>

                                <DateField name="joiningDate" value={formData.joiningDate} onChange={handleChange} label="Date of Joining*" required />
                                <InputField name="salary" value={formData.salary} onChange={handleChange} label="Monthly Salary" placeholder="Monthly Salary" color="gray" />
                            </div>
                        </div>

                        {/* Subject Specialization (For Teachers Only) */}
                        {formData.designation === "Teacher" && (
                            <div className="pt-4 animate-in fade-in slide-in-from-top-4 duration-300">
                                <div className="flex items-center gap-2 mb-6 border-b border-gray-200 pb-2">
                                    <div className="w-6 h-6 rounded-full bg-[#5C67F2] text-white flex items-center justify-center text-xs font-bold">★</div>
                                    <h3 className="text-gray-800 font-bold text-lg">Subject Specialization</h3>
                                </div>
                                <p className="text-xs text-gray-500 font-semibold mb-4">Select the curriculum subjects this teacher is specialized in and permitted to teach:</p>
                                
                                {subjects?.length === 0 ? (
                                    <div className="text-sm text-gray-400 bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-6 text-center font-medium">
                                        No subjects have been registered in the system yet. Please create subjects in the Subjects module first.
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                        {subjects?.map((sub: any) => {
                                            const isSelected = formData.specializedSubjects.includes(sub._id);
                                            return (
                                                <button
                                                    key={sub._id}
                                                    type="button"
                                                    onClick={() => toggleSubject(sub._id)}
                                                    className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all select-none h-20 ${
                                                        isSelected 
                                                            ? "border-[#5C67F2] bg-[#5C67F2]/5 text-[#5C67F2] shadow-sm shadow-indigo-100" 
                                                            : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50/50"
                                                    }`}
                                                >
                                                    <span className="font-bold text-xs line-clamp-2 leading-snug">{sub.name || sub.subjectName}</span>
                                                    <span className={`text-[8px] font-black uppercase tracking-widest self-end ${isSelected ? 'text-[#5C67F2]' : 'text-gray-400'}`}>
                                                        {isSelected ? '✓ Assigned' : 'Unassigned'}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 2. Other Information */}
                        {showAllFields && (
                            <div className="pt-4 animate-in fade-in slide-in-from-top-4 duration-500">
                                <div className="flex items-center gap-2 mb-8 border-b border-gray-200 pb-2">
                                    <div className="w-6 h-6 rounded-full bg-gray-800 text-white flex items-center justify-center text-xs font-bold">2</div>
                                    <h3 className="text-gray-800 font-bold text-lg">Other Information</h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-8">
                                    <InputField name="fatherName" value={formData.fatherName} onChange={handleChange} label="Father / Husband Name" placeholder="Father / Husband Name" color="gray" />
                                    <SelectField name="gender" value={formData.gender} onChange={handleChange} label="Gender" placeholder="Select" color="gray" options={['Male', 'Female', 'Other']} />
                                    <InputField name="experience" value={formData.experience} onChange={handleChange} label="Experience" placeholder="Experience" color="gray" />
                                    
                                    <InputField name="nationalId" value={formData.nationalId} onChange={handleChange} label="National ID" placeholder="National ID" color="gray" />
                                    <SelectField name="religion" value={formData.religion} onChange={handleChange} label="Religion" placeholder="Select" color="gray" options={['Islam', 'Christianity', 'Other']} />
                                    <InputField name="email" value={formData.email} onChange={handleChange} label="Email Address" placeholder="Email Address" color="gray" />

                                    <InputField name="education" value={formData.education} onChange={handleChange} label="Education" placeholder="Education" color="gray" />
                                    <SelectField name="bloodGroup" value={formData.bloodGroup} onChange={handleChange} label="Blood Group" placeholder="Select" color="gray" options={['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']} />
                                    <DateField name="dob" value={formData.dob} onChange={handleChange} label="Date of Birth" placeholder="dd/mm/yyyy" color="gray" />
                                    
                                    <div className="lg:col-span-3">
                                        <InputField name="address" value={formData.address} onChange={handleChange} label="Home Address" placeholder="Home Address" color="gray" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex justify-center gap-4 pt-10">
                            <button 
                                type="button" 
                                onClick={() => setFormData({
                                    employeeName: "", fatherName: "", email: "", phone: "", dob: "", 
                                    gender: "Male", designation: "", joiningDate: "", salary: "", address: "",
                                    specializedSubjects: [],
                                    experience: "", nationalId: "", religion: "", education: "", bloodGroup: ""
                                })}
                                className="h-12 px-8 bg-[#FFC165] hover:bg-[#e0a855] text-gray-800 font-bold rounded-full shadow-md flex items-center gap-2 transition-colors"
                            >
                                <RefreshCcw className="w-4 h-4" /> Reset
                            </button>
                            <button 
                                type="submit" 
                                disabled={isCreating}
                                className="h-12 px-8 bg-[#5C67F2] hover:bg-[#4a54c4] text-white font-bold rounded-full shadow-md flex items-center gap-2 transition-colors disabled:opacity-50"
                            >
                                {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} 
                                Submit
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

function InputField({ label, placeholder, required, color = "blue", name, value, onChange }: { label: string, placeholder: string, required?: boolean, color?: "blue" | "purple" | "gray", name?: string, value?: string, onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
    const isReq = label.includes('*') || required;
    const bgClass = isReq ? (color === "purple" ? "bg-[#868DF4]" : "bg-[#5C67F2]") : "bg-gray-400";
    
    return (
        <div className="relative">
            <div className={`absolute -top-3 left-6 ${bgClass} text-white text-[11px] px-3 py-1 rounded-full font-semibold tracking-wide z-10 shadow-sm`}>
                {label}
            </div>
            <input 
                type="text" 
                name={name}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className="w-full h-12 px-6 border border-[#5C67F2]/40 rounded-full focus:outline-none focus:border-[#5C67F2] text-gray-700 placeholder-gray-400 bg-white text-sm"
            />
        </div>
    );
}

function SelectField({ label, placeholder, required, color = "blue", name, value, onChange, options = [] }: { label: string, placeholder: string, required?: boolean, color?: "blue" | "purple" | "gray", name?: string, value?: string, onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void, options?: string[] }) {
    const isReq = label.includes('*') || required;
    const bgClass = isReq ? (color === "purple" ? "bg-[#868DF4]" : "bg-[#5C67F2]") : "bg-gray-400";
    
    return (
        <div className="relative">
            <div className={`absolute -top-3 left-6 ${bgClass} text-white text-[11px] px-3 py-1 rounded-full font-semibold tracking-wide z-10 shadow-sm`}>
                {label}
            </div>
            <select 
                name={name}
                value={value}
                onChange={onChange}
                className="w-full h-12 px-6 border border-[#5C67F2]/40 rounded-full focus:outline-none focus:border-[#5C67F2] text-gray-700 bg-white appearance-none cursor-pointer text-sm"
            >
                <option value="" disabled>{placeholder}</option>
                {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
        </div>
    );
}

function DateField({ label, placeholder, value, onChange, required, color = "blue", name }: { label: string, placeholder?: string, value?: string, onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void, required?: boolean, color?: "blue" | "purple" | "gray", name?: string }) {
    const isReq = label.includes('*') || required;
    const bgClass = isReq ? (color === "purple" ? "bg-[#868DF4]" : "bg-[#5C67F2]") : "bg-gray-400";
    
    return (
        <div className="relative">
            <div className={`absolute -top-3 left-6 ${bgClass} text-white text-[11px] px-3 py-1 rounded-full font-semibold tracking-wide z-10 shadow-sm`}>
                {label}
            </div>
            <div className="relative w-full h-12 border border-[#5C67F2]/40 rounded-full overflow-hidden flex items-center bg-white pr-4">
                <input 
                    type="date" 
                    name={name}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    className="w-full h-full px-6 focus:outline-none text-gray-700 text-sm bg-transparent"
                />
                <Calendar className="w-4 h-4 text-gray-800" />
            </div>
        </div>
    );
}
