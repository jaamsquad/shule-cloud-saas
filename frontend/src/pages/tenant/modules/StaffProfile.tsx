import { useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    User, Mail, Phone, MapPin, Calendar, Briefcase,
    ArrowLeft, Loader2, Shield, GraduationCap,
    Edit, Camera, Download, BookOpen, School,
    CreditCard, Hash, UserCheck, Key, ChevronRight, Printer
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import { openPrintDoc } from "@/lib/pdfDoc";

export default function StaffProfile() {
    const { id } = useParams();
    const navigate = useNavigate();
    const qc = useQueryClient();
    const photoInputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);

    // ── Queries ────────────────────────────────────────────────────────────────
    const { data: employee, isLoading } = useQuery({
        queryKey: ["staff_profile", id],
        queryFn: async () => (await api.get(`/staff/${id}`)).data,
        enabled: !!id,
    });

    const { data: classes = [] } = useQuery<any[]>({
        queryKey: ["classes"],
        queryFn: async () => (await api.get("/academics/classes")).data || [],
    });

    const { data: subjects = [] } = useQuery<any[]>({
        queryKey: ["subjects"],
        queryFn: async () => (await api.get("/subjects")).data || [],
    });

    const { data: tenantProfile } = useQuery<any>({
        queryKey: ["tenant_profile_global"],
        queryFn: async () => { const r = await api.get("/auth/tenant/profile"); return Array.isArray(r.data) ? r.data[0] : r.data; },
    });

    // Departments this staff belongs to (and their role in each).
    const { data: departments = [] } = useQuery<any[]>({
        queryKey: ["staff_departments"],
        queryFn: async () => { const r = await api.get("/departments"); return Array.isArray(r.data) ? r.data : []; },
    });

    // ── Photo upload ──────────────────────────────────────────────────────────
    const photoMut = useMutation({
        mutationFn: (avatar: string) => api.patch(`/staff/${id}`, { avatar }),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["staff_profile", id] }); qc.invalidateQueries({ queryKey: ["staff"] }); toast.success("Photo updated"); },
        onError: () => toast.error("Failed to update photo"),
    });

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 500 * 1024) { toast.error("Photo must be under 500 KB"); return; }
        setUploading(true);
        const reader = new FileReader();
        reader.onloadend = () => { photoMut.mutate(reader.result as string); setUploading(false); };
        reader.readAsDataURL(file);
    };

    // ── Download / Print dossier ──────────────────────────────────────────────
    const handleDownload = () => {
        if (!employee) return;
        const win = openPrintDoc();
        if (!win) { toast.error("Allow popups to print"); return; }
        const name = employee.employeeName || employee.name || "Staff";
        const schoolName = tenantProfile?.name || tenantProfile?.instituteName || "School";
        const assignments: any[] = employee.subjectAssignments || [];
        const grouped: Record<string, string[]> = {};
        assignments.forEach((a: any) => {
            if (!grouped[a.subjectName]) grouped[a.subjectName] = [];
            if (a.className) grouped[a.subjectName].push(a.className);
        });
        const classTeacher = classes.find((c: any) => c.classTeacherId === employee._id);

        win.document.write(`<!DOCTYPE html><html><head><title>Staff Dossier — ${name}</title>
        <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:Arial,sans-serif;padding:40px;color:#1e293b;max-width:800px;margin:0 auto}
        .header{display:flex;align-items:center;gap:20px;border-bottom:3px solid #5C67F2;padding-bottom:20px;margin-bottom:30px}
        .logo{height:56px;object-fit:contain}
        .school{font-size:22px;font-weight:900;color:#5C67F2;text-transform:uppercase}
        .sub{font-size:11px;color:#94a3b8;margin-top:4px}
        .title{text-align:center;font-size:16px;font-weight:900;text-transform:uppercase;letter-spacing:3px;margin:20px 0;color:#334155}
        .photo-name{display:flex;align-items:center;gap:20px;background:#f8fafc;padding:20px;border-radius:12px;margin-bottom:24px}
        .photo{width:80px;height:80px;border-radius:50%;object-fit:cover;border:3px solid #5C67F2}
        .photo-placeholder{width:80px;height:80px;border-radius:50%;background:#e0e7ff;display:flex;align-items:center;justify-content:center;font-size:32px;font-weight:900;color:#5C67F2;border:3px solid #5C67F2}
        h2{font-size:22px;font-weight:900;color:#1e293b}
        .badge{background:#eef0fe;color:#5C67F2;padding:4px 12px;border-radius:20px;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:1px;display:inline-block;margin-top:6px}
        .section{margin-bottom:24px}
        .section-title{font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:2px;color:#94a3b8;border-bottom:1px solid #e2e8f0;padding-bottom:8px;margin-bottom:14px}
        .grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
        .field label{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;display:block;margin-bottom:3px}
        .field span{font-size:13px;font-weight:700;color:#1e293b}
        .subject-row{display:flex;align-items:center;gap:8px;margin-bottom:8px}
        .subject-chip{background:#eef0fe;color:#5C67F2;padding:3px 10px;border-radius:20px;font-size:10px;font-weight:900}
        .class-chip{background:#f0fdf4;color:#15803d;padding:3px 10px;border-radius:20px;font-size:10px;font-weight:700;border:1px solid #bbf7d0}
        .sig{display:grid;grid-template-columns:1fr 1fr 1fr;gap:32px;margin-top:60px}
        .sig-box{text-align:center;border-top:1px dashed #94a3b8;padding-top:6px;font-size:9px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px}
        .footer{text-align:center;margin-top:40px;font-size:9px;color:#94a3b8;border-top:1px dashed #e2e8f0;padding-top:12px}
        @media print{@page{margin:15mm}}
        </style></head><body>
        <div class="header">
            ${tenantProfile?.logo ? `<img src="${tenantProfile.logo}" class="logo"/>` : ""}
            <div><div class="school">${schoolName}</div><div class="sub">Official Staff Dossier</div></div>
        </div>
        <div class="title">Staff Personnel Dossier</div>
        <div class="photo-name">
            ${employee.avatar ? `<img src="${employee.avatar}" class="photo"/>` : `<div class="photo-placeholder">${name.charAt(0)}</div>`}
            <div>
                <h2>${name}</h2>
                <span class="badge">${employee.designation || employee.role || "Staff"}</span>
            </div>
        </div>
        <div class="section">
            <div class="section-title">Contact Information</div>
            <div class="grid">
                <div class="field"><label>Email</label><span>${employee.email || "—"}</span></div>
                <div class="field"><label>Phone</label><span>${employee.phone || "—"}</span></div>
                <div class="field"><label>Address</label><span>${employee.address || "—"}</span></div>
                <div class="field"><label>National ID</label><span>${employee.nationalId || "—"}</span></div>
            </div>
        </div>
        <div class="section">
            <div class="section-title">Professional Information</div>
            <div class="grid">
                <div class="field"><label>Employee ID</label><span>${employee.employeeId || employee._id?.slice(-8) || "—"}</span></div>
                <div class="field"><label>Department</label><span>${employee.department || "—"}</span></div>
                <div class="field"><label>Joining Date</label><span>${employee.joiningDate ? new Date(employee.joiningDate).toLocaleDateString("en-GB", { day:"numeric",month:"long",year:"numeric" }) : "—"}</span></div>
                <div class="field"><label>Salary</label><span>KES ${Number(employee.salary || 0).toLocaleString()}/month</span></div>
                <div class="field"><label>KRA PIN</label><span>${employee.kraPin || "—"}</span></div>
                <div class="field"><label>NSSF No.</label><span>${employee.nssfNo || "—"}</span></div>
                <div class="field"><label>NHIF No.</label><span>${employee.nhifNo || "—"}</span></div>
                <div class="field"><label>Bank</label><span>${employee.bankName ? `${employee.bankName} — ${employee.accountNo || ""}` : "—"}</span></div>
            </div>
        </div>
        ${Object.keys(grouped).length > 0 ? `
        <div class="section">
            <div class="section-title">Subject Assignments</div>
            ${Object.entries(grouped).map(([sub, cls]) => `
                <div class="subject-row">
                    <span class="subject-chip">${sub}</span>
                    ${cls.length > 0 ? "→ " + cls.map(c => `<span class="class-chip">${c}</span>`).join(" ") : ""}
                </div>
            `).join("")}
        </div>` : ""}
        ${classTeacher ? `<div class="section"><div class="section-title">Class Teacher</div><p style="font-weight:700;color:#15803d">Class teacher of: ${classTeacher.levelName || classTeacher.name}</p></div>` : ""}
        <div class="sig">
            <div class="sig-box">Principal / Head</div>
            <div class="sig-box">HR Officer</div>
            <div class="sig-box">Employee Signature</div>
        </div>
        <div class="footer">Generated by ShuleCloud ERP · ${schoolName} · ${new Date().toLocaleDateString("en-GB", { day:"numeric",month:"long",year:"numeric" })}</div>
        <script>window.onload=()=>window.print()</script>
        </body></html>`);
        win.document.close();
    };

    // ── States ────────────────────────────────────────────────────────────────
    if (isLoading) return (
        <div className="flex-1 flex items-center justify-center bg-[#f4f7f6]">
            <div className="text-center"><Loader2 className="w-10 h-10 animate-spin text-[#5C67F2] mx-auto mb-3" /><p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Loading…</p></div>
        </div>
    );

    if (!employee) return (
        <div className="flex-1 flex items-center justify-center bg-[#f4f7f6]">
            <div className="text-center bg-white p-12 rounded-[2.5rem] shadow-xl">
                <User className="w-14 h-14 text-red-300 mx-auto mb-4" />
                <h2 className="text-2xl font-black text-slate-800 mb-2">Staff Not Found</h2>
                <p className="text-slate-400 mb-6">No staff record with this ID.</p>
                <button onClick={() => navigate("/staff")} className="px-6 py-2.5 bg-[#5C67F2] text-white rounded-xl font-black text-xs uppercase tracking-widest">Back to Employees</button>
            </div>
        </div>
    );

    // ── Derived data ──────────────────────────────────────────────────────────
    const name = employee.employeeName || employee.name || `${employee.firstName || ""} ${employee.lastName || ""}`.trim() || "Unknown";
    const photo = employee.avatar || employee.photo || null;
    const classTeacher = classes.find((c: any) => c.classTeacherId === employee._id);
    const assignments: any[] = employee.subjectAssignments || [];
    const grouped: Record<string, string[]> = {};
    assignments.forEach((a: any) => { if (!grouped[a.subjectName]) grouped[a.subjectName] = []; if (a.className) grouped[a.subjectName].push(a.className); });
    const hasPortal = !!employee.portalUsername;
    // Departments this staff heads or belongs to.
    const myDepartments = departments.filter((d: any) => String(d.headOfDepartment) === String(employee._id))
        .map((d: any) => ({ name: d.name, role: "Head of Department", isHead: true }))
        // (membership-based roles are shown from the department members endpoint elsewhere;
        //  here we surface headship + any department name recorded on the staff record)
        .concat(employee.department && !departments.some((d: any) => String(d.headOfDepartment) === String(employee._id) && d.name === employee.department)
            ? [{ name: employee.department, role: employee.designation || "Member", isHead: false }] : []);

    const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "—";

    const InfoRow = ({ icon: Icon, label, value, color = "text-gray-400" }: any) => (
        <div className="flex items-start gap-3">
            <div className={`w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0 ${color}`}>
                <Icon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">{label}</p>
                <p className="text-sm font-bold text-gray-800 truncate">{value || "—"}</p>
            </div>
        </div>
    );

    return (
        <div className="flex-1 bg-[#f4f7f6] min-h-screen flex flex-col pb-10">

            {/* ── Hero ─────────────────────────────────────────────── */}
            <div className="bg-white border-b border-gray-100 shadow-sm">
                <div className="max-w-5xl mx-auto px-4 sm:px-8 py-6">
                    {/* Back */}
                    <button onClick={() => navigate(-1)}
                        className="flex items-center gap-1.5 text-gray-400 hover:text-[#5C67F2] text-xs font-bold mb-5 transition-colors">
                        <ArrowLeft className="w-4 h-4" /> All Employees
                    </button>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                        {/* Photo */}
                        <div className="relative flex-shrink-0">
                            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-indigo-50 border-4 border-white shadow-xl overflow-hidden">
                                {photo ? (
                                    <img src={photo} alt={name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-[#5C67F2] font-black text-4xl">{name.charAt(0)}</div>
                                )}
                            </div>
                            <button onClick={() => photoInputRef.current?.click()}
                                disabled={uploading}
                                className="absolute -bottom-1 -right-1 w-9 h-9 bg-[#5C67F2] text-white rounded-xl shadow-md border-2 border-white flex items-center justify-center hover:bg-[#4a54c4] transition-all">
                                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                            </button>
                            <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                        </div>

                        {/* Name + actions */}
                        <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                <h1 className="text-2xl sm:text-3xl font-black text-gray-900">{name}</h1>
                                <span className="px-3 py-1 bg-[#5C67F2]/10 text-[#5C67F2] rounded-full text-[10px] font-black uppercase tracking-widest">
                                    {employee.designation || employee.role || "Staff"}
                                </span>
                                {hasPortal && (
                                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full text-[9px] font-black uppercase border border-emerald-200">Portal Active</span>
                                )}
                            </div>
                            <p className="text-sm text-gray-400 font-medium mb-4">
                                {employee.department ? `${employee.department} Department` : ""}
                                {employee.education ? ` · ${employee.education}` : ""}
                            </p>
                            <div className="flex flex-wrap gap-2">
                                <button onClick={() => navigate(`/staff/edit/${id}`)}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-[#5C67F2] hover:bg-[#4a54c4] text-white font-black text-xs uppercase rounded-xl shadow-sm transition-all">
                                    <Edit className="w-3.5 h-3.5" /> Edit Record
                                </button>
                                <button onClick={handleDownload}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 text-gray-600 font-black text-xs uppercase rounded-xl hover:bg-gray-50 transition-all">
                                    <Printer className="w-3.5 h-3.5" /> Print Dossier
                                </button>
                                <button onClick={() => navigate(`/staff/login`)}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 text-gray-600 font-black text-xs uppercase rounded-xl hover:bg-gray-50 transition-all">
                                    <Key className="w-3.5 h-3.5" /> Portal Login
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Quick stats strip */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
                        {[
                            { label: "Subjects Taught", value: Object.keys(grouped).length, color: "text-[#5C67F2]" },
                            { label: "Classes", value: Array.from(new Set(assignments.map((a: any) => a.className).filter(Boolean))).length, color: "text-emerald-600" },
                            { label: "Departments", value: myDepartments.length, color: "text-teal-600" },
                            { label: "Class Teacher", value: classTeacher ? "Yes" : "No", color: classTeacher ? "text-amber-600" : "text-slate-400" },
                        ].map(s => (
                            <div key={s.label} className="bg-slate-50 rounded-2xl p-4 text-center">
                                <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{s.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Content ───────────────────────────────────────────── */}
            <div className="max-w-5xl mx-auto w-full px-4 sm:px-8 pt-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                    {/* Left column */}
                    <div className="space-y-5">
                        {/* Contact */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                                <span className="w-1 h-4 bg-[#5C67F2] rounded-full" /> Contact
                            </h3>
                            <div className="space-y-4">
                                <InfoRow icon={Mail}   label="Email"   value={employee.email}   color="text-[#5C67F2]" />
                                <InfoRow icon={Phone}  label="Phone"   value={employee.phone}   color="text-emerald-500" />
                                <InfoRow icon={MapPin} label="Address" value={employee.address} color="text-orange-500" />
                                {employee.nationalId && <InfoRow icon={CreditCard} label="National ID" value={employee.nationalId} color="text-gray-500" />}
                            </div>
                        </div>

                        {/* Banking */}
                        {(employee.bankName || employee.kraPin) && (
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                                    <span className="w-1 h-4 bg-amber-400 rounded-full" /> Banking & Statutory
                                </h3>
                                <div className="space-y-3">
                                    {employee.bankName && <InfoRow icon={CreditCard} label="Bank" value={`${employee.bankName}${employee.bankBranch ? ` — ${employee.bankBranch}` : ""}`} color="text-amber-500" />}
                                    {employee.accountNo && <InfoRow icon={Hash} label="Account No." value={employee.accountNo} color="text-gray-400" />}
                                    {employee.kraPin && <InfoRow icon={Hash} label="KRA PIN" value={employee.kraPin} color="text-gray-400" />}
                                    {employee.nssfNo && <InfoRow icon={Hash} label="NSSF No." value={employee.nssfNo} color="text-gray-400" />}
                                    {employee.nhifNo && <InfoRow icon={Hash} label="NHIF No." value={employee.nhifNo} color="text-gray-400" />}
                                </div>
                            </div>
                        )}

                        {/* Security */}
                        <div className="bg-gradient-to-br from-[#5C67F2] to-indigo-700 rounded-2xl p-5 text-white">
                            <Shield className="w-8 h-8 mb-3 opacity-80" />
                            <h3 className="font-black mb-1">System Access</h3>
                            <div className="space-y-2 mt-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] text-white/60 font-bold uppercase">Role</span>
                                    <span className="text-[10px] font-black bg-white/15 px-2 py-0.5 rounded-full">{employee.designation || employee.role || "Staff"}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] text-white/60 font-bold uppercase">Portal</span>
                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${hasPortal ? "bg-emerald-400/30 text-emerald-200" : "bg-white/10 text-white/40"}`}>
                                        {hasPortal ? `@${employee.portalUsername}` : "Not set"}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] text-white/60 font-bold uppercase">ID</span>
                                    <span className="text-[10px] font-mono text-white/70">{employee._id?.slice(-10)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right columns */}
                    <div className="lg:col-span-2 space-y-5">
                        {/* Professional details */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                                <span className="w-1 h-4 bg-orange-400 rounded-full" /> Professional Profile
                            </h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                {[
                                    { icon: Briefcase,     label: "Employee ID",    value: employee.employeeId || `SC-${employee._id?.slice(-6).toUpperCase()}` },
                                    { icon: Calendar,      label: "Joined",         value: fmtDate(employee.joiningDate || employee.joinDate) },
                                    { icon: GraduationCap, label: "Education",      value: employee.education },
                                    { icon: Hash,          label: "Experience",     value: employee.experience },
                                    { icon: UserCheck,     label: "Blood Group",    value: employee.bloodGroup },
                                    { icon: User,          label: "Gender",         value: employee.gender },
                                ].filter(r => r.value).map(r => (
                                    <div key={r.label} className="bg-gray-50 rounded-xl p-3">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-0.5">{r.label}</p>
                                        <p className="text-sm font-bold text-gray-800">{r.value}</p>
                                    </div>
                                ))}
                                {employee.salary && (
                                    <div className="bg-emerald-50 rounded-xl p-3">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-emerald-400 mb-0.5">Monthly Salary</p>
                                        <p className="text-sm font-bold text-emerald-700">KES {Number(employee.salary).toLocaleString()}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Teaching assignments */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                                    <span className="w-1 h-4 bg-indigo-400 rounded-full" /> Teaching Assignments
                                </h3>
                                <button onClick={() => navigate("/staff/teachers")}
                                    className="flex items-center gap-1 text-[10px] font-black text-[#5C67F2] hover:underline">
                                    Manage <ChevronRight className="w-3 h-3" />
                                </button>
                            </div>

                            {/* Class teacher */}
                            {classTeacher && (
                                <div className="flex items-center gap-3 mb-3 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                                    <School className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                                    <div>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-emerald-500">Homeroom Class Teacher</p>
                                        <p className="text-sm font-black text-emerald-800">{classTeacher.levelName || classTeacher.name}</p>
                                    </div>
                                </div>
                            )}

                            {/* Subject assignments */}
                            {Object.keys(grouped).length > 0 ? (
                                <div className="space-y-2">
                                    {Object.entries(grouped).map(([subName, clsList]) => (
                                        <div key={subName} className="flex items-center gap-2 flex-wrap px-3 py-2.5 bg-indigo-50/60 border border-indigo-100 rounded-xl">
                                            <span className="text-[11px] font-black text-[#5C67F2] bg-white border border-indigo-200 px-2.5 py-0.5 rounded-full flex-shrink-0">
                                                <BookOpen className="w-2.5 h-2.5 inline mr-1" />{subName}
                                            </span>
                                            {clsList.length > 0 && (
                                                <>
                                                    <ChevronRight className="w-3 h-3 text-indigo-300" />
                                                    {clsList.map(cn => (
                                                        <span key={cn} className="text-[10px] font-bold text-gray-600 bg-white border border-gray-200 px-2 py-0.5 rounded-full">{cn}</span>
                                                    ))}
                                                </>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                    <BookOpen className="w-6 h-6 text-gray-300 mx-auto mb-2" />
                                    <p className="text-xs text-gray-400 font-bold">No subject assignments yet</p>
                                    <button onClick={() => navigate("/staff/teachers")}
                                        className="mt-2 text-[10px] font-black text-[#5C67F2] hover:underline">
                                        Assign subjects →
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Departments */}
                        {myDepartments.length > 0 && (
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                                    <span className="w-1 h-4 bg-teal-400 rounded-full" /> Departments
                                </h3>
                                <div className="space-y-2">
                                    {myDepartments.map((d: any, i: number) => (
                                        <div key={i} className="flex items-center justify-between px-4 py-3 bg-teal-50/60 border border-teal-100 rounded-xl">
                                            <div className="flex items-center gap-2">
                                                <School className="w-4 h-4 text-teal-600" />
                                                <span className="text-sm font-black text-teal-800">{d.name}</span>
                                            </div>
                                            <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${d.isHead ? "bg-amber-100 text-amber-700" : "bg-white text-teal-600 border border-teal-200"}`}>{d.role}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Additional personal info */}
                        {(employee.fatherName || employee.religion || employee.bloodGroup) && (
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                                    <span className="w-1 h-4 bg-purple-400 rounded-full" /> Personal Details
                                </h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {[
                                        { label: "Father / Spouse", value: employee.fatherName },
                                        { label: "Religion",        value: employee.religion },
                                        { label: "Blood Group",     value: employee.bloodGroup },
                                        { label: "Date of Birth",   value: fmtDate(employee.dob) },
                                    ].filter(r => r.value && r.value !== "—").map(r => (
                                        <div key={r.label} className="bg-gray-50 rounded-xl p-3">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-0.5">{r.label}</p>
                                            <p className="text-sm font-bold text-gray-800">{r.value}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
