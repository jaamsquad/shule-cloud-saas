import { useState } from "react";
import { 
    Search, Plus, Briefcase, Mail, Phone, Edit, Trash2, 
    ChevronRight, ArrowLeft, Camera, User, 
    BookOpen, School, Filter, MoreHorizontal, MessageSquare, Download,
    GraduationCap, Globe, ShieldCheck, Hash, UserCheck, Eye, History as HistoryIcon,
    Upload, UserPlus, ChevronDown, CheckCircle, AlertCircle, Info, HeartPulse,
    Settings, Star, LayoutGrid, List
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

export default function Staff() {
    const [view, setView] = useState<"list" | "profile">("list");
    const [selectedMember, setSelectedMember] = useState<any>(null);
    const [search, setSearch] = useState("");
    const [showAdd, setShowAdd] = useState(false);
    
    const queryClient = useQueryClient();

    const { data: staff = [], isLoading } = useQuery({
        queryKey: ["staff-list"],
        queryFn: async () => {
            const r = await api.get("/staff");
            return r.data;
        },
    });

    const createMutation = useMutation({
        mutationFn: (data: any) => api.post("/staff", data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["staff-list"] });
            setShowAdd(false);
            toast.success("Staff member successfully integrated");
        },
    });

    if (view === "profile") {
        return <StaffProfile member={selectedMember} onBack={() => setView("list")} />;
    }

    const filtered = staff.filter((s: any) => 
        (s.name || `${s.firstName || ''} ${s.lastName || ''}`).toLowerCase().includes(search.toLowerCase()) || 
        s.staffNumber?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="flex-1 bg-white overflow-hidden flex flex-col p-6 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-sm bg-gray-50 flex items-center justify-center border border-gray-100 shadow-sm">
                        <UsersIcon className="w-5 h-5 text-gray-400" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                             Staff <Badge variant="secondary" className="bg-sky-500 text-white rounded-full text-[10px] h-5 min-w-[20px] shadow-sm">{staff.length}</Badge>
                        </h1>
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="bg-sky-600 text-white hover:bg-sky-700 border-none gap-2 h-8 px-4 font-bold text-[11px] rounded-sm shadow-sm">
                        <MessageSquare className="w-3.5 h-3.5" /> SMS
                    </Button>
                    <Button onClick={() => setShowAdd(true)} size="sm" variant="outline" className="text-gray-600 font-bold text-[11px] gap-2 h-8 px-4 rounded-sm border-gray-300 shadow-sm">
                        <Plus className="w-3.5 h-3.5" /> Add Staff
                    </Button>
                    <Button size="sm" variant="outline" className="text-gray-600 font-bold text-[11px] gap-2 h-8 px-4 rounded-sm border-gray-300 shadow-sm">
                        <Upload className="w-3.5 h-3.5" /> Import
                    </Button>
                </div>
            </div>

            <div className="flex items-center justify-between py-2 px-1">
                <div className="flex items-center gap-2 text-[13px] text-gray-500">
                    <span>Show</span>
                    <select className="border border-gray-300 rounded-sm px-2 py-1 outline-none font-bold text-gray-700 h-8 shadow-sm">
                        <option>10</option>
                        <option>50</option>
                    </select>
                    <span>entries</span>
                </div>
                
                <div className="flex items-center gap-2">
                   <span className="text-[13px] font-bold text-gray-400 uppercase tracking-tight">Search:</span>
                   <Input 
                        value={search} 
                        onChange={e => setSearch(e.target.value)}
                        className="w-56 h-8 rounded-sm bg-white border-gray-300 shadow-none text-[13px]" 
                    />
                </div>
            </div>

            <div className="border border-gray-100 rounded-sm shadow-sm overflow-x-auto">
                <Table>
                    <TableHeader className="bg-gray-50 text-gray-500">
                        <TableRow className="h-10 hover:bg-gray-50">
                            <TableHead className="w-12 text-center border-r">
                                <Checkbox />
                            </TableHead>
                            <TableHead className="w-12 border-r"></TableHead>
                            <TableHead className="font-bold text-[11px] uppercase h-10 px-6 border-r">Name</TableHead>
                            <TableHead className="font-bold text-[11px] uppercase h-10 px-6 border-r">Role</TableHead>
                            <TableHead className="font-bold text-[11px] uppercase h-10 px-6 border-r">Gender</TableHead>
                            <TableHead className="font-bold text-[11px] uppercase h-10 px-6 border-r">Phone</TableHead>
                            <TableHead className="font-bold text-[11px] uppercase h-10 px-6 border-r">Email</TableHead>
                            <TableHead className="font-bold text-[11px] uppercase h-10 px-6 border-r text-center">Status</TableHead>
                            <TableHead className="font-bold text-[11px] uppercase h-10 px-6 text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={9} className="text-center py-10 opacity-50 text-xs text-gray-400 tracking-widest uppercase italic">Syncing human resource registry...</TableCell></TableRow>
                        ) : filtered.length === 0 ? (
                            <TableRow><TableCell colSpan={9} className="text-center py-10 opacity-50 text-xs font-bold text-gray-400 uppercase tracking-widest">No staff records found</TableCell></TableRow>
                        ) : (
                            filtered.map((s: any) => (
                                <TableRow key={s._id} className="hover:bg-gray-50/50 group border-b border-gray-50 h-14 transition-colors">
                                    <TableCell className="text-center border-r">
                                         <Checkbox />
                                    </TableCell>
                                    <TableCell className="border-r px-2">
                                        <div className="w-8 h-8 rounded-sm overflow-hidden bg-gray-100 border border-gray-100 flex items-center justify-center shrink-0 shadow-sm">
                                            {s.avatar ? <img src={s.avatar} className="w-full h-full object-cover" /> : <User className="w-4 h-4 text-slate-300" />}
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-6 border-r min-w-[200px]">
                                        <span onClick={() => { setSelectedMember(s); setView("profile"); }} className="font-bold text-[#1e293b] hover:text-sky-600 hover:underline cursor-pointer text-[13px]">{s.firstName} {s.lastName}</span>
                                    </TableCell>
                                    <TableCell className="text-[13px] text-gray-500 px-6 border-r font-medium">{s.role || 'Teacher'}</TableCell>
                                    <TableCell className="text-[13px] text-gray-500 px-6 border-r">{s.gender || 'Female'}</TableCell>
                                    <TableCell className="text-[13px] text-gray-500 px-6 border-r font-mono tracking-tighter">{s.phone || '+25479911XXXX'}</TableCell>
                                    <TableCell className="text-[13px] text-gray-500 px-6 border-r font-medium lowercase italic">{s.email || 'protected@email.com'}</TableCell>
                                    <TableCell className="text-center px-6 border-r">
                                        <Badge className="bg-[#10b981] hover:bg-[#059669] text-white font-black text-[9px] uppercase rounded-[2px] px-2 py-0.5 tracking-tighter">
                                            {s.status || 'Active'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right px-6">
                                        <Button onClick={() => { setSelectedMember(s); setView("profile"); }} variant="outline" size="sm" className="h-7 px-3 text-[11px] font-bold text-gray-600 bg-white hover:bg-gray-100 border-gray-300 gap-1.5 rounded-sm shadow-none">
                                            <Eye className="w-3.5 h-3.5" /> View
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className="flex items-center justify-between py-2 px-1 text-[13px] text-gray-400 font-medium bg-white">
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="h-8 shadow-none border-gray-300 rounded-sm font-bold text-gray-500 px-4">Previous</Button>
                    <Button variant="outline" size="sm" className="h-8 w-8 bg-sky-600 text-white shadow-none border-none rounded-sm font-bold">1</Button>
                    <Button variant="outline" size="sm" className="h-8 shadow-none border-gray-300 rounded-sm font-bold text-gray-500 px-4">Next</Button>
                </div>
            </div>

            <Dialog open={showAdd} onOpenChange={setShowAdd}>
                <DialogContent className="p-0 border-0 overflow-hidden rounded-sm max-w-lg shadow-2xl">
                    <DialogHeader className="bg-[#10b981] p-4 text-white flex-row items-center gap-2 space-y-0">
                         <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                            <Plus className="w-4 h-4" />
                         </div>
                         <div className="flex flex-col">
                            <DialogTitle className="text-[15px] font-black uppercase tracking-wider leading-none">Staff Information Registry</DialogTitle>
                            <DialogDescription className="text-white/60 text-[10px] font-medium uppercase tracking-tight mt-1 opacity-100">Capture personnel identifiers and institutional roles</DialogDescription>
                         </div>
                    </DialogHeader>
                    <div className="p-10 space-y-6">
                         <div className="space-y-2">
                             <Input className="h-11 border-gray-200 rounded-sm bg-slate-50/30 font-medium" placeholder="First Middle Last Name" />
                         </div>
                         <div className="space-y-2">
                             <div className="flex items-center justify-between mb-1">
                                 <Label className="text-[10px] font-black text-sky-600 uppercase tracking-widest flex items-center gap-2"><Info className="w-3" /> Learn more about roles and permissions</Label>
                             </div>
                             <select className="w-full h-11 px-3 bg-slate-50/30 border border-gray-200 rounded-sm text-[13px] outline-none font-medium text-gray-400">
                                 <option>Role</option>
                             </select>
                         </div>
                         <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-2">
                                <Label className="text-[11px] font-black text-slate-400 uppercase tracking-tight">Nationality</Label>
                                <select className="w-full h-11 px-3 bg-slate-50/30 border border-gray-200 rounded-sm text-[13px] outline-none font-medium">
                                    <option>Nationality</option>
                                    <option>Kenya</option>
                                </select>
                             </div>
                             <div className="space-y-2">
                                <Label className="text-[11px] font-black text-slate-400 uppercase tracking-tight">Gender</Label>
                                <select className="w-full h-11 px-3 bg-slate-50/30 border border-gray-200 rounded-sm text-[13px] outline-none font-medium text-gray-400">
                                    <option>Select Gender</option>
                                    <option>Male</option>
                                    <option>Female</option>
                                </select>
                             </div>
                             <div className="col-span-2 space-y-2">
                                 <Input className="h-11 border-gray-200 rounded-sm bg-slate-50/30 font-medium" placeholder="Phone" />
                             </div>
                             <div className="col-span-2 space-y-2">
                                 <Input className="h-11 border-gray-200 rounded-sm bg-slate-50/30 font-medium" placeholder="Email" />
                             </div>
                             <div className="space-y-2">
                                <Label className="text-[11px] font-black text-slate-400 uppercase tracking-tight">Serial #</Label>
                                <Input className="h-11 border-gray-200 rounded-sm bg-slate-50/30 font-medium" placeholder="Serial Number" />
                             </div>
                             <div className="space-y-2">
                                <Label className="text-[11px] font-black text-slate-400 uppercase tracking-tight">Status</Label>
                                <select className="w-full h-11 px-3 bg-slate-50/30 border border-gray-200 rounded-sm text-[13px] outline-none font-medium text-gray-400">
                                    <option>Select Status</option>
                                    <option>Active</option>
                                    <option>Inactive</option>
                                </select>
                             </div>
                         </div>
                    </div>
                    <div className="p-6 bg-slate-50 flex gap-4">
                         <Button onClick={() => setShowAdd(false)} variant="outline" className="flex-1 h-10 border-gray-300 font-bold text-slate-600 gap-2"><div className="w-4 h-4 rounded-full border border-slate-600 flex items-center justify-center text-[10px] tracking-tight">/</div> Cancel</Button>
                         <Button className="flex-1 h-10 bg-[#10b981] hover:bg-emerald-600 text-white font-bold gap-2"><CheckCircle className="w-4" /> Save</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function StaffProfile({ member, onBack }: any) {
    const [activeTab, setActiveTab] = useState("details");

    return (
        <div className="flex-1 bg-white overflow-hidden flex flex-col">
             <div className="h-14 bg-white border-b border-gray-100 flex items-center px-8 gap-4 shadow-sm relative z-10">
                <Button onClick={onBack} variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-sky-600 bg-gray-50/50">
                    <ArrowLeft className="w-5" />
                </Button>
                <div className="flex flex-col">
                    <h2 className="text-[16px] font-bold text-sky-900 tracking-tight leading-none mb-1">Staff Profile</h2>
                </div>
                <div className="ml-auto flex gap-2">
                    <Button variant="outline" size="sm" className="h-8 border-sky-600 text-sky-600 font-bold text-[11px] gap-2 px-4 shadow-sm rounded-sm hover:bg-sky-50"><Edit className="w-3.5" /> Edit Details</Button>
                    <Button size="sm" className="h-8 bg-sky-600 text-white border-none hover:bg-sky-700 font-bold text-[11px] gap-2 px-4 shadow-sm rounded-sm"><Mail className="w-3.5" /> Welcome Mail</Button>
                    <Button variant="outline" size="sm" className="h-8 bg-white border-gray-300 text-gray-400 font-bold text-[11px] gap-2 px-4 shadow-sm rounded-sm"><Trash2 className="w-3.5" /> Delete</Button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                <aside className="w-64 bg-slate-50 border-r border-slate-100 flex flex-col shadow-inner">
                    <nav className="flex-1 py-1">
                        {[
                            { id: 'details', label: 'Staff Details', icon: UserCheck },
                            { id: 'subjects', label: 'Staff Subjects', icon: BookOpen },
                            { id: 'classes', label: 'Staff Classes', icon: School },
                        ].map(m => (
                            <button 
                                key={m.id} 
                                onClick={() => setActiveTab(m.id)}
                                className={`w-full flex items-center gap-3 px-8 py-3.5 text-[12px] font-bold transition-all border-l-[3px] ${activeTab === m.id 
                                    ? 'bg-[#10b981] text-white border-none shadow-sm' 
                                    : 'text-slate-500 border-transparent hover:text-slate-800 hover:bg-white/50'
                                }`}
                            >
                                <m.icon className={`w-4 h-4 ${activeTab === m.id ? 'text-white' : 'opacity-30'}`} />
                                {m.label}
                            </button>
                        ))}
                    </nav>
                    <button onClick={onBack} className="w-full flex items-center gap-3 px-8 py-6 text-[12px] font-bold text-slate-400 hover:text-slate-800 border-t border-dashed">
                        <ArrowLeft className="w-4 h-4" /> Go Back
                    </button>
                </aside>

                <main className="flex-1 overflow-y-auto bg-white custom-scrollbar">
                    {activeTab === 'details' && <ProfileDetails member={member} />}
                    {activeTab === 'subjects' && <StaffSubjects />}
                    {activeTab === 'classes' && <StaffClasses />}
                </main>
            </div>
        </div>
    );
}

function ProfileDetails({ member }: any) {
    return (
        <div className="p-12 space-y-12 bg-white">
            <div className="flex gap-16 items-start">
                 <div className="flex flex-col items-center shrink-0">
                    <div className="w-44 h-44 rounded-full border-[1.5px] border-slate-200 p-1 bg-white relative">
                        <div className="w-full h-full rounded-full overflow-hidden border border-slate-200">
                             {member.avatar ? <img src={member.avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-300 text-5xl font-black italic">!</div>}
                        </div>
                    </div>
                    <Button variant="outline" className="mt-4 h-7 border-slate-300 text-slate-500 font-bold text-[10px] uppercase gap-2 px-4 shadow-sm rounded-none"><TableIcon className="w-3 h-3" /> Change Photo</Button>
                 </div>

                 <div className="flex-1 space-y-6">
                    <h2 className="text-3xl font-black text-[#1e293b] tracking-tighter mb-4">{member.firstName} {member.lastName}</h2>
                    
                    <div className="space-y-4 max-w-md">
                        {[
                            { icon: Info, label: 'Gender', value: member.gender || 'Female' },
                            { icon: Globe, label: 'Nationality', value: 'Kenyan', flag: true },
                            { icon: BookmarkIcon, label: 'Type', value: 'Staff' },
                            { icon: UserCheck, label: 'Role', value: member.role || 'Teacher' },
                            { icon: Phone, label: 'Phone', value: member.phone || '+25479911XXXX' },
                            { icon: Mail, label: 'Email', value: member.email || 'protected@email.com' },
                            { icon: CheckCircle, label: 'Status', value: 'Active' },
                            { icon: Hash, label: 'Serial Number', value: '0301' },
                            { icon: FileText, label: 'Profile ID', value: '46887' },
                        ].map((item: any) => (
                            <div key={item.label} className="flex items-center gap-4 py-0.5">
                                 <item.icon className="w-4 h-4 text-[#1e293b]" />
                                 <span className="text-[12px] font-bold text-slate-500 min-w-[120px]">{item.label}:</span>
                                 {item.flag ? <img src="https://flagcdn.com/w20/ke.png" className="w-5" /> : <span className="text-[12px] font-black text-[#1e293b]">{item.value}</span>}
                            </div>
                        ))}
                    </div>
                 </div>
            </div>

            <div className="space-y-6 pt-12 border-t border-slate-100">
                 <h3 className="text-2xl font-black text-slate-800 tracking-tighter">Classes</h3>
                 <div className="border border-slate-100 rounded-sm shadow-sm">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow className="h-10 hover:bg-slate-50 border-b border-slate-100">
                                <TableHead className="font-black text-[10px] uppercase h-10 px-8 text-black">Year</TableHead>
                                <TableHead className="font-black text-[10px] uppercase h-10 px-8 text-black">Name</TableHead>
                                <TableHead className="font-black text-[10px] uppercase h-10 px-8 text-black">Stream</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow className="h-14 border-b border-slate-50">
                                <TableCell className="text-[13px] font-bold text-slate-500 px-8">2018</TableCell>
                                <TableCell className="text-[13px] font-bold text-slate-500 px-8">8-4-4 Form 1</TableCell>
                                <TableCell className="text-[13px] font-bold text-slate-500 px-8">Yellow</TableCell>
                            </TableRow>
                            <TableRow className="h-14">
                                <TableCell className="text-[13px] font-bold text-slate-500 px-8">2018</TableCell>
                                <TableCell className="text-[13px] font-bold text-slate-500 px-8">2-6-6-3 Grade 7</TableCell>
                                <TableCell className="text-[13px] font-bold text-slate-500 px-8">Grey</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                 </div>
            </div>
        </div>
    );
}

function StaffSubjects() {
    return (
        <div className="p-0 flex flex-col h-full bg-white">
             <div className="bg-sky-600 p-4 text-white flex justify-between items-center shadow-md">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-sm flex items-center justify-center">
                        <UsersIcon className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-[16px] font-bold leading-tight">Mary Claires</h2>
                        <p className="text-[10px] opacity-80 font-bold uppercase tracking-tight">Staff • Assigned Classes</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="h-8 bg-white/20 border-white/40 text-white font-bold text-[11px] rounded-sm px-4 flex gap-2"><Plus className="w-3.5" /> Assign Subject</Button>
                    <Button size="sm" variant="outline" className="h-8 bg-white/20 border-white/40 text-white font-bold text-[11px] rounded-sm px-4 flex gap-2"><Settings className="w-3.5" /> Change Year</Button>
                    <Button variant="outline" className="h-8 bg-white/20 border-white/40 text-white text-[11px] font-bold rounded-sm px-4"><ArrowLeft className="w-3.5 mr-2" /> Back</Button>
                </div>
            </div>
            
            <div className="p-12 space-y-8">
                 <h3 className="text-2xl font-black text-slate-700 tracking-tighter">2026 Subject Lessons</h3>
                 <div className="border border-slate-100 rounded-sm shadow-sm">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow className="h-10 hover:bg-slate-50 border-b border-slate-100">
                                <TableHead className="font-black text-[10px] uppercase h-10 px-8 text-black">Year</TableHead>
                                <TableHead className="font-black text-[10px] uppercase h-10 px-8 text-black">Subject</TableHead>
                                <TableHead className="font-black text-[10px] uppercase h-10 px-8 text-black">Class Name</TableHead>
                                <TableHead className="font-black text-[10px] uppercase h-10 px-8 text-black">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow className="h-14">
                                <TableCell className="text-[13px] font-bold text-slate-500 px-8">2017</TableCell>
                                <TableCell className="text-[13px] font-bold text-slate-500 px-8">Kiswahili</TableCell>
                                <TableCell className="text-[13px] font-bold text-slate-500 px-8">2018 Form 1 Grey</TableCell>
                                <TableCell className="px-8">
                                     <Button variant="outline" size="sm" className="h-7 text-[10px] font-bold text-slate-400 border-slate-300 gap-1.5 rounded-sm shadow-sm"><Trash2 className="w-3.5" /> Remove</Button>
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                 </div>
            </div>
        </div>
    );
}

function StaffClasses() {
    return (
        <div className="p-0 flex flex-col h-full bg-white">
             <div className="bg-sky-600 p-4 text-white flex justify-between items-center shadow-md">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-sm flex items-center justify-center">
                        <UsersIcon className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-[16px] font-bold leading-tight">Mary Claires</h2>
                        <p className="text-[10px] opacity-80 font-bold uppercase tracking-tight">Staff • Assigned Classes</p>
                    </div>
                </div>
                <Button variant="outline" className="h-8 bg-white/20 border-white/40 text-white text-[11px] font-bold rounded-sm px-4"><ArrowLeft className="w-3.5 mr-2" /> Back</Button>
            </div>
            
            <div className="p-12 space-y-8">
                 <h3 className="text-2xl font-black text-slate-700 tracking-tighter">Class Teacher Records</h3>
                 <div className="border border-slate-100 rounded-sm shadow-sm border-b-none">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow className="h-10 hover:bg-slate-50 border-b border-slate-100">
                                <TableHead className="font-black text-[10px] uppercase h-10 px-8 text-black">Year</TableHead>
                                <TableHead className="font-black text-[10px] uppercase h-10 px-8 text-black">Name</TableHead>
                                <TableHead className="font-black text-[10px] uppercase h-10 px-8 text-black">Stream</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow className="h-14 border-b border-slate-50">
                                <TableCell className="text-[13px] font-bold text-slate-500 px-8">2018</TableCell>
                                <TableCell className="text-[13px] font-bold text-slate-500 px-8">8-4-4 Form 1</TableCell>
                                <TableCell className="text-[13px] font-bold text-slate-500 px-8">Yellow</TableCell>
                            </TableRow>
                            <TableRow className="h-14">
                                <TableCell className="text-[13px] font-bold text-slate-500 px-8">2018</TableCell>
                                <TableCell className="text-[13px] font-bold text-slate-500 px-8">2-6-6-3 Grade 7</TableCell>
                                <TableCell className="text-[13px] font-bold text-slate-500 px-8">Grey</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                 </div>
            </div>
        </div>
    );
}

function UsersIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function BookmarkIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
    </svg>
  )
}

function TableIcon(props: any) {
    return (
        <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        >
        <path d="M3 3h18v18H3z" />
        <path d="M3 9h18" />
        <path d="M3 15h18" />
        <path d="M9 3v18" />
        <path d="M15 3v18" />
        </svg>
    )
}
