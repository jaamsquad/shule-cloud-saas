import { useState } from "react";
import { Home, Plus, Search, Mail, Trash2, Edit, User, Loader2, Table, LayoutGrid, Eye } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useItems } from "@/hooks/useItems";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";

export default function AllEmployees() {
    const navigate = useNavigate();
    const { items: staff, isLoading, deleteItem, updateItem } = useItems("staff");
    const { items: subjects } = useItems("subjects");

    // Fetch dynamic roles from DB
    const { data: dbRoles = [] } = useQuery<any[]>({
        queryKey: ["roles_list"],
        queryFn: async () => (await api.get("/roles")).data || [],
    });
    const roleOptions: string[] = dbRoles.length > 0
        ? dbRoles.map((r: any) => r.name)
        : ["Teacher","Admin","Staff","Accountant","Principal","Librarian","Transport Manager","Hostel Warden","Head of Department","Deputy Principal","Exam Director","HR Officer","ICT Officer","Bus Driver","Security","Other"];
    
    const [view, setView] = useState<"cards" | "list">("cards");
    const [editingEmployee, setEditingEmployee] = useState<any>(null);
    const [editForm, setEditForm] = useState<any>({
        employeeName: "",
        designation: "",
        phone: "",
        joiningDate: "",
        salary: "",
        address: "",
        fatherName: "",
        gender: "Male",
        experience: "",
        nationalId: "",
        religion: "",
        email: "",
        education: "",
        bloodGroup: "",
        dob: "",
        specializedSubjects: [],
        // Statutory & Bank Accounts details
        kraPin: "",
        nssfNo: "",
        nhifNo: "",
        bankName: "",
        bankBranch: "",
        accountNo: ""
    });

    const handleEditClick = (employee: any) => {
        setEditingEmployee(employee);
        setEditForm({
            employeeName: employee.employeeName || employee.name || "",
            designation: employee.designation || "",
            phone: employee.phone || "",
            joiningDate: employee.joiningDate || "",
            salary: employee.salary || "",
            address: employee.address || "",
            fatherName: employee.fatherName || "",
            gender: employee.gender || "Male",
            experience: employee.experience || "",
            nationalId: employee.nationalId || "",
            religion: employee.religion || "",
            email: employee.email || "",
            education: employee.education || "",
            bloodGroup: employee.bloodGroup || "",
            dob: employee.dob || "",
            specializedSubjects: employee.specializedSubjects || [],
            kraPin: employee.kraPin || "",
            nssfNo: employee.nssfNo || "",
            nhifNo: employee.nhifNo || "",
            bankName: employee.bankName || "",
            bankBranch: employee.bankBranch || "",
            accountNo: employee.accountNo || ""
        });
    };

    const handleSaveEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingEmployee) return;
        try {
            await updateItem({ id: editingEmployee._id, ...editForm, name: editForm.employeeName });
            setEditingEmployee(null);
            toast.success("Employee profile updated successfully!");
        } catch {
            toast.error("Failed to save changes");
        }
    };

    return (
        <div className="flex-1 bg-[#f4f7f6] min-h-screen flex flex-col items-center">
            {/* Breadcrumb Header */}
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center shadow-sm z-10 m-4 rounded-xl w-[calc(100%-2rem)]">
                <span className="font-bold text-gray-800 text-lg mr-2">Employees</span>
                <span className="text-gray-300 mx-2">|</span>
                <Home className="w-4 h-4 text-gray-500 mr-2" />
                <span className="text-gray-500 font-medium">
                    - All Employees
                </span>
            </div>

            <div className="p-6 pt-0 w-full mt-4">
                
                {/* Toolbar: view toggle + search */}
                <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
                    <div className="bg-white border border-gray-100 rounded-xl p-1 flex shadow-sm">
                        <button onClick={() => setView("cards")} className={`px-4 py-2 rounded-lg text-[11px] font-black uppercase tracking-wide inline-flex items-center gap-1.5 ${view === "cards" ? "bg-[#5C67F2] text-white" : "text-slate-400"}`}><LayoutGrid className="w-3.5 h-3.5" /> Cards</button>
                        <button onClick={() => setView("list")} className={`px-4 py-2 rounded-lg text-[11px] font-black uppercase tracking-wide inline-flex items-center gap-1.5 ${view === "list" ? "bg-[#5C67F2] text-white" : "text-slate-400"}`}><Table className="w-3.5 h-3.5" /> List</button>
                    </div>
                    <input type="text" placeholder="Search employee…"
                        className="w-72 h-11 px-5 border border-[#5C67F2]/30 rounded-full focus:outline-none focus:border-[#5C67F2] text-gray-700 text-sm bg-white" />
                </div>

                {/* ── LIST (Excel-style) view ─────────────────────────────── */}
                {view === "list" ? (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                            <p className="text-xs font-black text-slate-400 uppercase">{staff.length} Employees</p>
                            <Link to="/staff/new" className="inline-flex items-center gap-1.5 text-xs font-bold bg-[#5C67F2] text-white px-4 py-2 rounded-lg"><Plus className="w-4 h-4" /> Add New</Link>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wide">
                                        <th className="text-left px-5 py-3 font-black">Name</th>
                                        <th className="text-left px-3 py-3 font-black">Designation</th>
                                        <th className="text-left px-3 py-3 font-black">Email</th>
                                        <th className="text-left px-3 py-3 font-black">Phone</th>
                                        <th className="text-right px-5 py-3 font-black">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {isLoading ? (
                                        <tr><td colSpan={5} className="py-10 text-center"><Loader2 className="w-6 h-6 animate-spin text-[#5C67F2] mx-auto" /></td></tr>
                                    ) : staff.length === 0 ? (
                                        <tr><td colSpan={5} className="py-10 text-center text-slate-400">No employees yet.</td></tr>
                                    ) : staff.map((employee: any) => (
                                        <tr key={employee._id} className="border-b border-slate-50 hover:bg-slate-50/50">
                                            <td className="px-5 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-[#868DF4]/15 flex items-center justify-center text-[#5C67F2]"><User className="w-4 h-4" /></div>
                                                    <span className="font-bold text-slate-700">{employee.name || employee.employeeName}</span>
                                                </div>
                                            </td>
                                            <td className="px-3 py-3 text-slate-500">{employee.designation || "Staff"}</td>
                                            <td className="px-3 py-3 text-slate-500">{employee.email || "—"}</td>
                                            <td className="px-3 py-3 text-slate-500">{employee.phone || "—"}</td>
                                            <td className="px-5 py-3">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <Link to={`/staff/profile/${employee._id}`} title="View" className="w-8 h-8 rounded-lg border border-slate-200 text-slate-500 hover:text-[#5C67F2] flex items-center justify-center"><Eye className="w-4 h-4" /></Link>
                                                    <button onClick={() => navigate(`/staff/edit/${employee._id}`)} title="Edit" className="w-8 h-8 rounded-lg border border-slate-200 text-slate-500 hover:text-[#5C67F2] flex items-center justify-center"><Edit className="w-4 h-4" /></button>
                                                    <button onClick={() => { if (confirm("Delete this employee?")) deleteItem(employee._id); }} title="Delete" className="w-8 h-8 rounded-lg border border-slate-200 text-slate-500 hover:text-rose-500 flex items-center justify-center"><Trash2 className="w-4 h-4" /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                /* ── CARDS view ───────────────────────────────────────────── */
                <div className="flex gap-6 flex-wrap justify-center lg:justify-start pl-8">

                    {isLoading ? (
                        <div className="w-full flex justify-center py-20">
                            <Loader2 className="w-12 h-12 animate-spin text-[#5C67F2]" />
                        </div>
                    ) : (
                        staff.map((employee: any) => (
                            <div key={employee._id} className="w-56 h-64 bg-white rounded-3xl shadow-sm border border-gray-100 p-6 flex flex-col items-center justify-center relative hover:shadow-md transition-shadow">
                                <div className="w-20 h-20 bg-gray-100 rounded-full border-4 border-[#868DF4]/20 flex items-center justify-center overflow-hidden mb-4 relative z-10 text-[#5C67F2]">
                                    <User className="w-10 h-10" />
                                </div>
                                
                                <h3 className="font-bold text-gray-800 text-sm tracking-tight text-center">{employee.name || employee.employeeName}</h3>
                                <p className="text-xs text-gray-500 font-medium mb-6">{employee.designation || 'Staff'}</p>

                                <div className="flex gap-2">
                                    <Link 
                                        to={`/staff/profile/${employee._id}`}
                                        className="w-8 h-8 rounded-full bg-[#868DF4] hover:bg-[#5C67F2] text-white flex items-center justify-center transition-colors shadow-sm"
                                    >
                                        <Search className="w-4 h-4" />
                                    </Link>
                                    <button
                                        onClick={() => navigate(`/staff/edit/${employee._id}`)}
                                        className="w-8 h-8 rounded-full bg-[#868DF4] hover:bg-[#5C67F2] text-white flex items-center justify-center transition-colors shadow-sm"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button 
                                        onClick={() => {
                                            if (confirm("Are you sure you want to delete this employee?")) {
                                                deleteItem(employee._id);
                                            }
                                        }}
                                        className="w-8 h-8 rounded-full bg-[#ff5e6c] hover:bg-[#e04553] text-white flex items-center justify-center transition-colors shadow-sm"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}

                    {/* Add New Card */}
                    <Link to="/staff/new" className="w-56 h-64 bg-white rounded-3xl shadow-sm border border-dashed border-[#5C67F2]/40 hover:border-[#5C67F2] p-6 flex flex-col items-center justify-center cursor-pointer transition-colors group">
                        <div className="w-16 h-16 rounded-full bg-blue-50 group-hover:bg-blue-100 flex items-center justify-center mb-4 transition-colors relative">
                            <User className="w-8 h-8 text-[#5C67F2]" strokeWidth={1.5} />
                            <Plus className="w-5 h-5 text-[#5C67F2] absolute -top-1 -right-1" strokeWidth={3} />
                        </div>
                        <h3 className="font-bold text-[#5C67F2] text-sm tracking-wide">Add New</h3>
                    </Link>

                </div>
                )}

            </div>

            {/* ── Edit Employee Modal ─────────────────────────────────── */}
            {editingEmployee && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl my-8">
                        <div className="px-6 py-4 border-b border-gray-55 flex items-center justify-between bg-gray-50/50">
                            <h3 className="font-bold text-gray-900 flex items-center gap-2 text-base">
                                <User className="w-5 h-5 text-[#5C67F2]" /> Edit Employee Profile
                            </h3>
                            <button onClick={() => setEditingEmployee(null)} className="text-2xl leading-none text-gray-400 hover:text-gray-700">&times;</button>
                        </div>
                        
                        <form onSubmit={handleSaveEdit} className="p-6 space-y-6">
                            <div className="max-h-[70vh] overflow-y-auto pr-2 space-y-6">
                                {/* Basic Section */}
                                <div>
                                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 border-b pb-1">Personal & Contact Info</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Employee Name*</label>
                                            <input type="text" required value={editForm.employeeName} onChange={e => setEditForm({...editForm, employeeName: e.target.value})} className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:border-[#5C67F2] outline-none" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Role/Designation*</label>
                                            <select required value={editForm.designation} onChange={e => setEditForm({...editForm, designation: e.target.value})} className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:border-[#5C67F2] outline-none bg-white">
                                                <option value="">Select Role</option>
                                                {roleOptions.map((r: string) => (
                                                    <option key={r} value={r}>{r}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Mobile No*</label>
                                            <input type="text" required value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:border-[#5C67F2] outline-none" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Email Address*</label>
                                            <input type="email" required value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:border-[#5C67F2] outline-none" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">National ID / Passport*</label>
                                            <input type="text" required value={editForm.nationalId} onChange={e => setEditForm({...editForm, nationalId: e.target.value})} className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:border-[#5C67F2] outline-none" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Date of Birth*</label>
                                            <input type="date" required value={editForm.dob} onChange={e => setEditForm({...editForm, dob: e.target.value})} className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:border-[#5C67F2] outline-none" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Gender*</label>
                                            <select required value={editForm.gender} onChange={e => setEditForm({...editForm, gender: e.target.value})} className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:border-[#5C67F2] outline-none bg-white">
                                                <option value="Male">Male</option>
                                                <option value="Female">Female</option>
                                                <option value="Other">Other</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Date of Joining*</label>
                                            <input type="date" required value={editForm.joiningDate} onChange={e => setEditForm({...editForm, joiningDate: e.target.value})} className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:border-[#5C67F2] outline-none" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Monthly Salary (KES)*</label>
                                            <input type="text" required value={editForm.salary} onChange={e => setEditForm({...editForm, salary: e.target.value})} className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:border-[#5C67F2] outline-none" />
                                        </div>
                                    </div>
                                </div>

                                {/* Statutory & Bank accounts section */}
                                <div>
                                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 border-b pb-1">Statutory & Bank Accounts Details</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">KRA PIN</label>
                                            <input type="text" value={editForm.kraPin} onChange={e => setEditForm({...editForm, kraPin: e.target.value})} className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:border-[#5C67F2] outline-none" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">NSSF Number</label>
                                            <input type="text" value={editForm.nssfNo} onChange={e => setEditForm({...editForm, nssfNo: e.target.value})} className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:border-[#5C67F2] outline-none" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">NHIF Number</label>
                                            <input type="text" value={editForm.nhifNo} onChange={e => setEditForm({...editForm, nhifNo: e.target.value})} className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:border-[#5C67F2] outline-none" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Bank Name</label>
                                            <input type="text" value={editForm.bankName} onChange={e => setEditForm({...editForm, bankName: e.target.value})} className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:border-[#5C67F2] outline-none" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Bank Branch</label>
                                            <input type="text" value={editForm.bankBranch} onChange={e => setEditForm({...editForm, bankBranch: e.target.value})} className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:border-[#5C67F2] outline-none" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Account Number</label>
                                            <input type="text" value={editForm.accountNo} onChange={e => setEditForm({...editForm, accountNo: e.target.value})} className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:border-[#5C67F2] outline-none" />
                                        </div>
                                    </div>
                                </div>

                                {/* Subject Specialization (For Teachers Only) */}
                                {editForm.designation === "Teacher" && (
                                    <div className="pt-2">
                                        <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 border-b pb-1">Subject Specialization</h4>
                                        <p className="text-[11px] text-gray-500 font-semibold mb-3">Select the curriculum subjects this teacher is specialized in and permitted to teach:</p>
                                        {subjects?.length === 0 ? (
                                            <p className="text-xs text-gray-400 italic">No subjects registered yet.</p>
                                        ) : (
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                                {subjects?.map((sub: any) => {
                                                    const isSelected = editForm.specializedSubjects?.includes(sub._id);
                                                    return (
                                                        <button
                                                            key={sub._id}
                                                            type="button"
                                                            onClick={() => {
                                                                const isSel = editForm.specializedSubjects?.includes(sub._id);
                                                                setEditForm({
                                                                    ...editForm,
                                                                    specializedSubjects: isSel
                                                                        ? editForm.specializedSubjects.filter((id: string) => id !== sub._id)
                                                                        : [...(editForm.specializedSubjects || []), sub._id]
                                                                });
                                                            }}
                                                            className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all select-none h-14 ${
                                                                isSelected 
                                                                    ? "border-[#5C67F2] bg-[#5C67F2]/5 text-[#5C67F2]" 
                                                                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50/50"
                                                            }`}
                                                        >
                                                            <span className="font-bold text-[11px] line-clamp-1 leading-snug">{sub.name || sub.subjectName}</span>
                                                            <span className="text-[7.5px] font-black uppercase tracking-wider self-end mt-0.5">
                                                                {isSelected ? '✓ Assigned' : 'Unassigned'}
                                                            </span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Optional Section */}
                                <div>
                                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 border-b pb-1">Additional Details</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Father / Spouse Name</label>
                                            <input type="text" value={editForm.fatherName} onChange={e => setEditForm({...editForm, fatherName: e.target.value})} className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:border-[#5C67F2] outline-none" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Experience</label>
                                            <input type="text" value={editForm.experience} onChange={e => setEditForm({...editForm, experience: e.target.value})} className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:border-[#5C67F2] outline-none" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Religion</label>
                                            <select value={editForm.religion} onChange={e => setEditForm({...editForm, religion: e.target.value})} className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:border-[#5C67F2] outline-none bg-white">
                                                <option value="">Select Religion</option>
                                                <option value="Islam">Islam</option>
                                                <option value="Christianity">Christianity</option>
                                                <option value="Hinduism">Hinduism</option>
                                                <option value="Other">Other</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Education</label>
                                            <input type="text" value={editForm.education} onChange={e => setEditForm({...editForm, education: e.target.value})} className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:border-[#5C67F2] outline-none" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Blood Group</label>
                                            <select value={editForm.bloodGroup} onChange={e => setEditForm({...editForm, bloodGroup: e.target.value})} className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:border-[#5C67F2] outline-none bg-white">
                                                <option value="">Select Blood Group</option>
                                                {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
                                            </select>
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Home Address</label>
                                            <input type="text" value={editForm.address} onChange={e => setEditForm({...editForm, address: e.target.value})} className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:border-[#5C67F2] outline-none" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-50">
                                <button type="button" onClick={() => setEditingEmployee(null)}
                                    className="px-4 py-2 text-sm font-bold text-gray-500 hover:bg-gray-50 rounded-lg">Cancel</button>
                                <button type="submit"
                                    className="bg-[#5C67F2] hover:bg-[#4b54db] text-white px-6 py-2 rounded-lg text-sm font-bold shadow-md">Save Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}
