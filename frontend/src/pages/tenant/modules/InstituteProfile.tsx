import { useState, useEffect, useRef } from "react";
import { Home, Save, Loader2, Camera, ImageIcon, Mail, Phone, MapPin, Globe, ChevronDown } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { prepareTransparentImage } from "@/lib/imageClean";
import api from "@/lib/api";
import { toast } from "sonner";

export default function InstituteProfile() {
    const queryClient = useQueryClient();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { data: profileData, isLoading } = useQuery({
        queryKey: ["tenant_profile_global"],
        queryFn: async () => {
            const r = await api.get("/auth/tenant/profile");
            return r.data;
        },
    });

    const [formData, setFormData] = useState({
        name: "",
        targetLine: "",
        phone: "",
        website: "",
        address: "",
        country: "Kenya",
        logo: "",
        email: "",
        schoolType: "Day",            // Boarding | Day | Mixed
        genderComposition: "Mixed",   // Mixed | Boys | Girls
        schoolLevel: "All",           // All | Junior | Senior
        principalSignature: "", schoolStamp: "", principalName: "", principalTitle: "Principal",
    });

    useEffect(() => {
        if (profileData) {
            setFormData({
                name: profileData.name || "",
                targetLine: profileData.targetLine || "",
                phone: profileData.phone || "",
                website: profileData.website || "",
                address: profileData.address || "",
                country: profileData.country || "Kenya",
                logo: profileData.logo || "",
                email: profileData.email || "",
                schoolType: profileData.schoolType || "Day",
                genderComposition: profileData.genderComposition || "Mixed",
                schoolLevel: profileData.schoolLevel || "All",
                principalSignature: profileData.principalSignature || "", schoolStamp: profileData.schoolStamp || "",
                principalName: profileData.principalName || "", principalTitle: profileData.principalTitle || "Principal",
            });
        }
    }, [profileData]);

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({ ...prev, logo: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const pickImage = (field: "principalSignature" | "schoolStamp") => async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; e.target.value = "";
        if (!file) return;
        try { const url = await prepareTransparentImage(file, field === "schoolStamp" ? 480 : 560); setFormData(prev => ({ ...prev, [field]: url })); }
        catch (err: any) { toast.error(err?.message || "Could not read that image"); }
    };

    const updateMutation = useMutation({
        mutationFn: async (data: any) => {
            const response = await api.patch("/auth/tenant/profile", data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["tenant_profile_global"] });
            queryClient.invalidateQueries({ queryKey: ["class_catalog"] });
            toast.success("Institute profile updated successfully");
        },
        onError: (err: any) => toast.error(err?.response?.data?.message || "Failed to update profile"),
    });

    const handleSave = () => {
        if (!formData.name) {
            toast.error("Institute name is required");
            return;
        }
        updateMutation.mutate(formData);
    };

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-[#f8fafc]">
                <Loader2 className="w-12 h-12 animate-spin text-[#5C67F2]" />
            </div>
        );
    }

    return (
        <div className="flex-1 bg-[#f8fafc] min-h-screen flex flex-col">
            {/* Breadcrumb */}
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center shadow-sm z-10 m-4 rounded-xl">
                <span className="font-bold text-gray-800 text-lg mr-2">General Settings</span>
                <span className="text-gray-300 mx-2">|</span>
                <Home className="w-4 h-4 text-gray-500 mr-2" />
                <span className="text-gray-500 font-medium">
                    - Institute Profile
                </span>
            </div>

            <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Profile Edit Form */}
                <div className="lg:col-span-2 bg-white rounded-[2.5rem] p-10 shadow-xl shadow-slate-100 border border-slate-50">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-black text-slate-800 tracking-tight">Update Profile</h2>
                        <div className="flex items-center justify-center gap-6 mt-3 text-xs">
                            <div className="flex items-center gap-2 text-[#5C67F2] font-black uppercase tracking-widest">
                                <div className="w-3 h-1.5 bg-[#5C67F2] rounded-full"></div>
                                Required*
                            </div>
                            <div className="flex items-center gap-2 text-slate-300 font-black uppercase tracking-widest">
                                <div className="w-3 h-1.5 bg-slate-200 rounded-full"></div>
                                Optional
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
                        {/* Logo Upload Section */}
                        <div className="md:col-span-2 bg-slate-50/50 p-8 rounded-[2rem] border border-dashed border-slate-200 mb-4">
                            <div className="flex flex-col md:flex-row items-center gap-8">
                                <div className="relative">
                                    <div className="absolute -top-3 -left-3 bg-[#5C67F2] text-white text-[9px] px-3 py-1 rounded-full font-black tracking-widest z-10 shadow-lg uppercase">
                                        Institute Logo*
                                    </div>
                                    <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center shadow-2xl border-4 border-white overflow-hidden group">
                                        {formData.logo ? (
                                            <img src={formData.logo} alt="Logo" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="text-center p-4">
                                                <ImageIcon className="w-8 h-8 text-slate-200 mx-auto mb-1" />
                                                <p className="text-[8px] font-black text-slate-300 uppercase leading-tight">Your Logo Here</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex-1 text-center md:text-left">
                                    <input 
                                        type="file" 
                                        ref={fileInputRef} 
                                        onChange={handleLogoChange} 
                                        accept="image/*" 
                                        className="hidden" 
                                    />
                                    <button 
                                        onClick={() => fileInputRef.current?.click()}
                                        className="h-12 px-8 bg-[#5C67F2] hover:bg-[#4a54c4] text-white font-black rounded-2xl shadow-xl shadow-indigo-100 flex items-center gap-3 transition-all text-sm tracking-widest"
                                    >
                                        <Camera className="w-5 h-5" /> CHANGE LOGO
                                    </button>
                                    <p className="text-[10px] text-slate-400 mt-4 font-bold uppercase tracking-wider">Recommended: Square PNG/JPG (Min 512x512px)</p>
                                </div>
                            </div>
                        </div>

                        {/* Name Section */}
                        <ProfileInput 
                            label="Name Of Institute" 
                            value={formData.name} 
                            onChange={(v) => setFormData({ ...formData, name: v })}
                            placeholder="Enter Institute Name"
                            required
                        />

                        {/* Phone Section */}
                        <ProfileInput 
                            label="Phone Number" 
                            value={formData.phone} 
                            onChange={(v) => setFormData({ ...formData, phone: v })}
                            placeholder="e.g. +254 700 000 000"
                            required
                        />

                        {/* Target Line */}
                        <ProfileInput 
                            label="Target Line" 
                            value={formData.targetLine} 
                            onChange={(v) => setFormData({ ...formData, targetLine: v })}
                            placeholder="Your Institute Tagline"
                        />

                        {/* Website */}
                        <ProfileInput 
                            label="Website" 
                            value={formData.website} 
                            onChange={(v) => setFormData({ ...formData, website: v })}
                            placeholder="https://www.yourinstitute.com"
                        />

                        {/* Address */}
                        <ProfileInput 
                            label="Address" 
                            value={formData.address} 
                            onChange={(v) => setFormData({ ...formData, address: v })}
                            placeholder="Physical Address"
                            required
                        />

                        {/* Email Address */}
                        <ProfileInput 
                            label="Email Address" 
                            value={formData.email} 
                            onChange={(v) => setFormData({ ...formData, email: v })}
                            placeholder="info@institute.com"
                        />

                        {/* Country */}
                        <div className="relative">
                            <div className="absolute -top-3 left-6 bg-[#868DF4] text-white text-[9px] px-3 py-1 rounded-full font-black tracking-widest z-10 shadow-sm uppercase">
                                Country*
                            </div>
                            <div className="relative">
                                <select 
                                    value={formData.country}
                                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                                    className="w-full h-16 pl-8 pr-12 border-2 border-slate-100 rounded-3xl focus:outline-none focus:border-[#5C67F2] text-slate-700 font-bold bg-white appearance-none cursor-pointer transition-all"
                                >
                                    <option value="Kenya">Kenya</option>
                                    <option value="Uganda">Uganda</option>
                                    <option value="Tanzania">Tanzania</option>
                                    <option value="Rwanda">Rwanda</option>
                                </select>
                                <ChevronDown className="w-5 h-5 text-slate-300 absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                        </div>

                        {/* School (Boarding) Type */}
                        <ProfileSelect
                            label="School Type"
                            value={formData.schoolType}
                            onChange={(v: string) => setFormData({ ...formData, schoolType: v })}
                            options={[
                                { value: "Boarding", label: "Boarding School" },
                                { value: "Day", label: "Day School" },
                                { value: "Mixed", label: "Mixed (Boarding & Day)" },
                            ]}
                            hint="Controls whether students can be marked as boarders or day scholars."
                        />

                        {/* Gender Composition */}
                        <ProfileSelect
                            label="Gender Composition"
                            value={formData.genderComposition}
                            onChange={(v: string) => setFormData({ ...formData, genderComposition: v })}
                            options={[
                                { value: "Mixed", label: "Mixed (Boys & Girls)" },
                                { value: "Boys", label: "Boys Only" },
                                { value: "Girls", label: "Girls Only" },
                            ]}
                            hint="Used as the default when admitting students."
                        />

                        {/* School Level (CBC Junior / Senior school) */}
                        <ProfileSelect
                            label="School Level"
                            value={formData.schoolLevel}
                            onChange={(v: string) => setFormData({ ...formData, schoolLevel: v })}
                            options={[
                                { value: "All", label: "All levels (Pre-Primary – Senior School)" },
                                { value: "Junior", label: "Junior school (Pre-Primary – Grade 9)" },
                                { value: "Senior", label: "Senior school (Grade 10 – 12)" },
                            ]}
                            hint="Controls which grades show up under Classes → Classes we offer. 8-4-4 Forms always show regardless of this setting."
                        />
                    </div>

                    {/* Signature & stamp — printed on admission letters, certificates and report cards */}
                    <div className="mt-10 pt-8 border-t border-slate-100">
                        <h3 className="text-base font-semibold text-slate-800">Signature &amp; school stamp</h3>
                        <p className="text-sm text-slate-500 mt-1">Upload the principal's / head teacher's signature and the school stamp. They are placed automatically on admission letters, leaving and transfer certificates, and on report cards (printed, generated and emailed).</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-5">
                            {([["principalSignature", "Signature", "Best as a PNG with a transparent background. A photo on white paper also works — the paper is removed for you."], ["schoolStamp", "School stamp", "Round or square stamp, ideally on a transparent background."]] as const).map(([field, label, hint]) => (
                                <div key={field} className="rounded-xl border border-slate-200 p-4">
                                    <div className="text-sm font-medium text-slate-700 mb-2">{label}</div>
                                    <div className="h-28 rounded-lg border border-dashed border-slate-300 flex items-center justify-center" style={{ backgroundImage: "linear-gradient(45deg,#f1f5f9 25%,transparent 25%),linear-gradient(-45deg,#f1f5f9 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#f1f5f9 75%),linear-gradient(-45deg,transparent 75%,#f1f5f9 75%)", backgroundSize: "16px 16px", backgroundPosition: "0 0,0 8px,8px -8px,-8px 0" }}>
                                        {formData[field] ? <img src={formData[field]} alt={label} className="max-h-24 max-w-[90%] object-contain" /> : <span className="text-xs text-slate-400">Nothing uploaded</span>}
                                    </div>
                                    <p className="text-xs text-slate-400 mt-2">{hint}</p>
                                    <div className="flex gap-2 mt-3">
                                        <label className="h-9 px-4 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium flex items-center cursor-pointer">Upload<input type="file" accept="image/*" className="hidden" onChange={pickImage(field)} /></label>
                                        {formData[field] && <button type="button" onClick={() => setFormData(prev => ({ ...prev, [field]: "" }))} className="h-9 px-4 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">Remove</button>}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
                            <div><label className="block text-xs font-medium text-slate-500 mb-1.5">Signatory name (printed under the signature)</label><input value={formData.principalName} onChange={e => setFormData({ ...formData, principalName: e.target.value })} placeholder="e.g. Mrs. Jane Wanjiku" className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-indigo-400" /></div>
                            <div><label className="block text-xs font-medium text-slate-500 mb-1.5">Title</label><select value={formData.principalTitle} onChange={e => setFormData({ ...formData, principalTitle: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm bg-white">{["Principal", "Head Teacher", "Headmaster", "Headmistress", "Director"].map(t => <option key={t}>{t}</option>)}</select></div>
                        </div>
                    </div>

                    <div className="flex justify-center mt-12">
                        <button 
                            onClick={handleSave}
                            disabled={updateMutation.isPending}
                            className="h-14 px-14 bg-[#FFC165] hover:bg-[#e0a855] text-slate-800 font-black rounded-full shadow-2xl shadow-orange-100 flex items-center gap-3 transition-all text-sm tracking-[0.2em] uppercase active:scale-95 disabled:opacity-50"
                        >
                            {updateMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                            SAVE CHANGES
                        </button>
                    </div>
                </div>

                {/* Profile View (Preview) */}
                <div className="lg:col-span-1">
                    <div className="sticky top-4 space-y-6">
                        <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl shadow-slate-200 border border-slate-50 overflow-hidden relative group">
                            <div className="absolute top-4 right-4 bg-emerald-50 text-emerald-500 text-[8px] px-3 py-1 rounded-full font-black uppercase tracking-widest">
                                Profile View
                            </div>
                            
                            <div className="flex flex-col items-center text-center mt-6">
                                <div className="w-32 h-32 bg-indigo-50 rounded-full flex items-center justify-center mb-6 shadow-xl border-4 border-white overflow-hidden ring-8 ring-slate-50/50">
                                    {formData.logo ? (
                                        <img src={formData.logo} alt="Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="text-slate-200 flex flex-col items-center">
                                            <ImageIcon className="w-10 h-10 mb-1" />
                                            <span className="text-[8px] font-black uppercase tracking-widest">No Logo</span>
                                        </div>
                                    )}
                                </div>
                                <h3 className="text-2xl font-black text-slate-800 leading-tight mb-2 uppercase tracking-tighter text-wrap break-words w-full">
                                    {formData.name || 'Your Institute Name'}
                                </h3>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                    {formData.targetLine || 'Institute Target Line'}
                                </p>
                                
                                <div className="w-full h-px bg-slate-50 my-8"></div>
                                
                                <div className="w-full space-y-6">
                                    <InfoItem icon={Phone} label="Phone No" value={formData.phone} />
                                    <InfoItem icon={Mail} label="Email" value={formData.email} />
                                    <InfoItem icon={Globe} label="Website" value={formData.website} />
                                    <InfoItem icon={MapPin} label="Address" value={formData.address} />
                                    <InfoItem icon={Globe} label="Country" value={formData.country} />
                                    <InfoItem icon={Globe} label="School Type" value={{ Boarding: "Boarding School", Day: "Day School", Mixed: "Mixed (Boarding & Day)" }[formData.schoolType] || formData.schoolType} />
                                    <InfoItem icon={Globe} label="Gender" value={{ Mixed: "Mixed (Boys & Girls)", Boys: "Boys Only", Girls: "Girls Only" }[formData.genderComposition] || formData.genderComposition} />
                                    <InfoItem icon={Globe} label="School Level" value={{ All: "All levels", Junior: "Junior school", Senior: "Senior school" }[formData.schoolLevel] || formData.schoolLevel} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ProfileInput({ label, value, onChange, placeholder, required }: any) {
    return (
        <div className="relative group">
            <div className={`absolute -top-3 left-6 text-white text-[9px] px-3 py-1 rounded-full font-black tracking-widest z-10 shadow-sm uppercase transition-all ${required ? 'bg-[#5C67F2]' : 'bg-slate-300 group-focus-within:bg-[#5C67F2]'}`}>
                {label}{required ? '*' : ''}
            </div>
            <input 
                type="text" 
                value={value} 
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full h-16 px-8 border-2 border-slate-100 rounded-3xl focus:outline-none focus:border-[#5C67F2] text-slate-700 font-bold placeholder:text-slate-200 transition-all bg-white"
            />
        </div>
    );
}

function ProfileSelect({ label, value, onChange, options, hint }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; hint?: string }) {
    return (
        <div className="relative">
            <div className="absolute -top-3 left-6 bg-[#868DF4] text-white text-[9px] px-3 py-1 rounded-full font-black tracking-widest z-10 shadow-sm uppercase">
                {label}
            </div>
            <div className="relative">
                <select
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full h-16 pl-8 pr-12 border-2 border-slate-100 rounded-3xl focus:outline-none focus:border-[#5C67F2] text-slate-700 font-bold bg-white appearance-none cursor-pointer transition-all"
                >
                    {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <ChevronDown className="w-5 h-5 text-slate-300 absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            {hint && <p className="text-[10px] text-slate-400 mt-2 ml-6 font-bold">{hint}</p>}
        </div>
    );
}

function InfoItem({ icon: Icon, label, value }: any) {
    return (
        <div className="flex items-start gap-4 group">
            <div className="w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-50 transition-colors">
                <Icon className="w-4 h-4 text-slate-400 group-hover:text-[#5C67F2] transition-colors" />
            </div>
            <div className="text-left">
                <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest leading-none mb-1.5">{label}</p>
                <p className="text-[11px] font-bold text-slate-600 truncate max-w-[180px]">{value || 'Not provided'}</p>
            </div>
        </div>
    );
}
