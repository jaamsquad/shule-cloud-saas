import { useState, useRef } from "react";
import { 
    Search, Plus, Briefcase, Mail, Phone, Edit, Trash2, 
    ChevronRight, ArrowLeft, Camera, User, 
    BookOpen, School, Filter, MoreHorizontal, MessageSquare, Download,
    GraduationCap, Globe, ShieldCheck, Hash, UserCheck, Eye, History as HistoryIcon,
    Upload, UserPlus, ChevronDown, CheckCircle, AlertCircle, Info, HeartPulse,
    TrendingUp, Award, Calendar, CreditCard, Lock, FileText, Settings, Scissors
} from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function Students() {
    const [view, setView] = useState<"list" | "add" | "profile" | "waivers" | "import">("list");
    const [selectedStudent, setSelectedStudent] = useState<any>(null);
    const [search, setSearch] = useState("");
    
    const queryClient = useQueryClient();

    const { data: students = [], isLoading } = useQuery({
        queryKey: ["students-list"],
        queryFn: async () => {
            const r = await api.get("/students");
            return r.data;
        },
    });

    const createMutation = useMutation({
        mutationFn: (data: any) => api.post("/students", data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["students-list"] });
            setView("list");
            toast.success("Student admitted successfully");
        },
    });

    if (view === "add") {
        return <StudentForm onBack={() => setView("list")} onSubmit={(data: any) => createMutation.mutate(data)} />;
    }

    if (view === "profile") {
        return <StudentProfile student={selectedStudent} onBack={() => setView("list")} />;
    }

    if (view === "waivers") {
        return <WaiversView onBack={() => setView("list")} />;
    }

    if (view === "import") {
        return <ImportExportView onBack={() => setView("list")} />;
    }

    const filtered = students.filter((s: any) => 
        (s.studentName || s.name || `${s.firstName || ''} ${s.lastName || ''}`).toLowerCase().includes(search.toLowerCase()) || 
        (s.admNo || s.registrationNo || s.admissionNumber || '').toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="flex-1 bg-white overflow-hidden flex flex-col p-6 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-sm bg-gray-50 flex items-center justify-center border border-gray-100 shadow-sm">
                        <GraduationCap className="w-5 h-5 text-gray-400" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                             Students <Badge variant="secondary" className="bg-sky-500 text-white rounded-full text-[10px] h-5 min-w-[20px] shadow-sm">{students.length}</Badge>
                        </h1>
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="bg-sky-600 text-white hover:bg-sky-700 border-none gap-2 h-8 px-4 font-bold text-[11px] rounded-sm shadow-sm">
                        <MessageSquare className="w-3.5 h-3.5" /> SMS
                    </Button>
                    <Button onClick={() => setView("add")} size="sm" variant="outline" className="text-gray-600 font-bold text-[11px] gap-2 h-8 px-4 rounded-sm border-gray-300 shadow-sm">
                        <Plus className="w-3.5 h-3.5" /> Add Student
                    </Button>
                     <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="text-gray-600 font-bold text-[11px] gap-2 h-8 px-4 rounded-sm border-gray-300 shadow-sm">
                            Actions... <ChevronDown className="w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setView("waivers")}>Review Waivers</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setView("import")}>Import / Export</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            <div className="flex items-center justify-between py-2 px-1">
                <div className="flex items-center gap-2 text-[13px] text-gray-500">
                    <span>Show</span>
                    <select className="border border-gray-300 rounded-sm px-2 py-1 outline-none font-bold text-gray-700 h-8 shadow-sm">
                        <option>50</option>
                        <option>10</option>
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
                            <TableHead className="font-bold text-[12px] uppercase h-10 px-6 border-r">Adm. #</TableHead>
                            <TableHead className="font-bold text-[12px] uppercase h-10 px-6 border-r min-w-[200px]">Name</TableHead>
                            <TableHead className="font-bold text-[12px] uppercase h-10 px-6 border-r text-center">Gender</TableHead>
                            <TableHead className="font-bold text-[12px] uppercase h-10 px-6 border-r">Class</TableHead>
                            <TableHead className="font-bold text-[12px] uppercase h-10 px-6 border-r">Mode of Learning</TableHead>
                            <TableHead className="font-bold text-[12px] uppercase h-10 px-6 border-r">Balance</TableHead>
                            <TableHead className="font-bold text-[12px] uppercase h-10 px-6 border-r text-center">Status</TableHead>
                            <TableHead className="font-bold text-[12px] uppercase h-10 px-6 text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={9} className="text-center py-10 opacity-50 text-xs text-gray-400 tracking-widest uppercase">Syncing student registry...</TableCell></TableRow>
                        ) : filtered.length === 0 ? (
                            <TableRow><TableCell colSpan={9} className="text-center py-10 opacity-50 text-xs font-bold text-gray-400 uppercase tracking-widest">No student records found</TableCell></TableRow>
                        ) : (
                            filtered.map((s: any) => (
                                <TableRow key={s._id} className={`hover:bg-gray-50/50 group border-b border-gray-50 h-14 transition-colors ${s.admNo === 'BS0112' ? 'bg-rose-50/30' : ''}`}>
                                    <TableCell className="text-center border-r">
                                         <Checkbox />
                                    </TableCell>
                                    <TableCell className="text-[13px] text-gray-600 font-bold px-6 border-r uppercase tracking-tight">{s.admNo || s.registrationNo || s.admissionNumber || 'BS' + s._id?.slice(-4).toUpperCase()}</TableCell>
                                    <TableCell className="px-6 border-r">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100 border border-gray-100 flex items-center justify-center shrink-0 shadow-sm cursor-pointer hover:border-sky-300 transition-colors">
                                                {s.avatar ? <img src={s.avatar} className="w-full h-full object-cover" /> : <div className="bg-sky-400 w-full h-full flex items-center justify-center text-white font-bold text-[10px]">{s.studentName?.[0] || s.name?.[0] || 'S'}</div>}
                                            </div>
                                            <span onClick={() => { setSelectedStudent(s); setView("profile"); }} className="font-medium text-gray-700 hover:text-sky-600 hover:underline cursor-pointer text-[13px] truncate">{s.studentName || s.name || (s.firstName && s.lastName ? `${s.firstName} ${s.lastName}` : null) || s.fullName || 'Fatuma Waridi'}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-[13px] text-gray-500 text-center px-6 border-r">{s.gender || 'Female'}</TableCell>
                                    <TableCell className="text-[13px] text-gray-600 font-medium px-6 border-r leading-tight">
                                        <span className="text-gray-400 font-bold block text-[10px] uppercase">2018</span>
                                        {s.class || 'Grade 8 Stream3'}
                                    </TableCell>
                                    <TableCell className="text-[13px] text-gray-500 px-6 border-r">{s.mode || 'Boarding'}</TableCell>
                                    <TableCell className="text-[13px] text-gray-800 font-black px-6 border-r">KSH {s.balance?.toLocaleString() || '5,933.00'}</TableCell>
                                    <TableCell className="text-center px-6 border-r">
                                        <Badge className="bg-[#10b981] hover:bg-[#059669] text-white font-black text-[9px] uppercase rounded-[2px] px-2 py-0.5 tracking-tighter">
                                            {s.status || 'Active'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right px-6">
                                        <Button onClick={() => { setSelectedStudent(s); setView("profile"); }} variant="outline" size="sm" className="h-7 px-3 text-[11px] font-bold text-white bg-sky-600 hover:bg-sky-700 border-none gap-1.5 rounded-sm shadow-none">
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
                <p>Showing 1 to {filtered.length} of {students.length} entries</p>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="h-8 shadow-none border-gray-300 rounded-sm font-bold text-gray-500 px-4">Previous</Button>
                    <Button variant="outline" size="sm" className="h-8 w-8 bg-sky-600 text-white shadow-none border-none rounded-sm font-bold">1</Button>
                    <Button variant="outline" size="sm" className="h-8 shadow-none border-gray-300 rounded-sm font-bold text-gray-500 px-4">Next</Button>
                </div>
            </div>
        </div>
    );
}

function StudentForm({ onBack, onSubmit }: any) {
    const [form, setForm] = useState({ 
        firstName: "", middleName: "", lastName: "", nationality: "Kenya", class: "", 
        religion: "", gender: "Male", admDate: "", dob: "", mode: "Day", 
        waiver: "None", status: "Active", health: "",
        parents: [{ name: "", relation: "", nationality: "Kenya", gender: "Male", phone: "", email: "", options: [] }]
    });

    return (
        <div className="flex-1 bg-white flex flex-col overflow-hidden">
            <div className="h-14 bg-white border-b border-gray-200 px-8 flex items-center justify-between shadow-sm sticky top-0 z-20">
                 <div className="flex items-center gap-3">
                    <Button onClick={onBack} variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-sky-600 bg-gray-50/50">
                        <ArrowLeft className="w-5" />
                    </Button>
                    <h2 className="text-[17px] font-bold text-sky-900 tracking-tight">New Student Admission</h2>
                 </div>
                 <div className="flex gap-3">
                     <Button onClick={onBack} variant="outline" className="h-9 px-6 font-bold text-[12px] text-gray-500 border-gray-300 rounded-sm">Cancel</Button>
                     <Button onClick={() => onSubmit(form)} className="h-9 px-8 font-bold text-[12px] bg-[#10b981] hover:bg-emerald-600 text-white rounded-sm shadow-sm flex gap-2"><CheckCircle className="w-4" /> Save Record</Button>
                 </div>
            </div>

            <div className="flex-1 overflow-y-auto p-10 space-y-12 max-w-7xl mx-auto w-full custom-scrollbar">
                <section className="space-y-6">
                    <div className="flex items-center gap-2 border-b border-slate-50 pb-3">
                         <div className="w-1.5 h-4 bg-sky-500 rounded-full" />
                         <h3 className="text-sky-700 font-bold text-[15px] uppercase tracking-wider">Student Details</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-x-8 gap-y-6">
                         <div className="md:col-span-12 space-y-2">
                             <Label className="text-[11px] font-bold text-gray-400 uppercase tracking-tight">First Middle Last Name</Label>
                             <Input className="h-11 border-gray-200 rounded-sm bg-slate-50/30 focus-visible:ring-sky-500 font-medium" placeholder="Fatuma Waridi" />
                         </div>
                         <div className="md:col-span-4 space-y-2">
                             <Label className="text-[11px] font-bold text-gray-400 uppercase tracking-tight">Nationality</Label>
                             <select className="w-full h-11 px-3 bg-slate-50/30 border border-gray-200 rounded-sm text-[13px] outline-none font-medium text-gray-400">
                                 <option>Kenya</option>
                             </select>
                         </div>
                         <div className="md:col-span-4 space-y-2">
                             <Label className="text-[11px] font-bold text-gray-400 uppercase tracking-tight">Select Class</Label>
                             <select className="w-full h-11 px-3 bg-slate-50/30 border border-gray-200 rounded-sm text-[13px] outline-none font-medium text-gray-400">
                                 <option>Select Class</option>
                             </select>
                         </div>
                         <div className="md:col-span-4 space-y-2">
                             <Label className="text-[11px] font-bold text-gray-400 uppercase tracking-tight">Adm. Date</Label>
                             <Input type="date" className="h-11 border-gray-200 rounded-sm bg-slate-50/30 font-medium" />
                         </div>
                    </div>
                </section>

                <section className="space-y-6 bg-slate-50/30 p-8 rounded-sm border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-2 border-b border-white pb-3">
                         <div className="w-1.5 h-4 bg-emerald-500 rounded-full" />
                         <h3 className="text-emerald-700 font-bold text-[15px] uppercase tracking-wider">Parent/Guardian Details</h3>
                    </div>
                    <div className="p-10 text-center opacity-30 text-xs font-black uppercase italic tracking-widest">Parent Registry Governance Section</div>
                </section>
            </div>
        </div>
    );
}

function StudentProfile({ student, onBack }: any) {
    const [activeTab, setActiveTab] = useState("details");

    const performanceData = [
        { name: 'CAT 1', student: 78, class: 65, level: 70 },
        { name: 'CAT 2', student: 82, class: 68, level: 72 },
        { name: 'Mid Term', student: 75, class: 62, level: 68 },
        { name: 'End Term', student: 88, class: 70, level: 75 },
    ];

    return (
        <div className="flex-1 bg-white overflow-hidden flex flex-col">
             <div className="h-14 bg-white border-b border-gray-100 flex items-center px-8 gap-4 shadow-sm relative z-10">
                <Button onClick={onBack} variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-sky-600 bg-gray-50/50">
                    <ArrowLeft className="w-5" />
                </Button>
                <div className="flex flex-col">
                    <h2 className="text-[16px] font-bold text-sky-900 tracking-tight leading-none mb-1">Student Profile</h2>
                </div>
                <div className="ml-auto flex gap-2">
                    <Button variant="outline" size="sm" className="h-8 bg-sky-600 text-white border-none hover:bg-sky-700 font-bold text-[11px] gap-2 px-4 shadow-sm rounded-sm"><Edit className="w-3.5" /> Edit Details</Button>
                    <Button variant="outline" size="sm" className="h-8 bg-white border-gray-300 text-gray-400 font-bold text-[11px] gap-2 px-4 shadow-sm rounded-sm"><Trash2 className="w-3.5" /> Delete</Button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                <aside className="w-64 bg-slate-50 border-r border-slate-100 flex flex-col shadow-inner">
                    <nav className="flex-1 py-1">
                        {[
                            { id: 'details', label: 'Student Details', icon: UserCheck },
                            { id: 'trends', label: 'Performance Trends', icon: TrendingUp },
                            { id: 'academics', label: 'Student Academics', icon: GraduationCap },
                            { id: 'subjects', label: 'Student Subjects', icon: BookOpen },
                            { id: 'classes', label: 'Student Classes', icon: School },
                            { id: 'parents', label: 'Student Parents', icon: UserPlus },
                            { id: 'statement', label: 'Student Statement', icon: FileText },
                            { id: 'invoices', label: 'Invoice Items', icon: CreditCard },
                        ].map(m => (
                            <button 
                                key={m.id} 
                                onClick={() => setActiveTab(m.id)}
                                className={`w-full flex items-center gap-3 px-8 py-3 text-[12px] font-bold transition-all border-l-[3px] ${activeTab === m.id 
                                    ? 'bg-[#10b981] text-white border-none shadow-sm' 
                                    : 'text-slate-500 border-transparent hover:text-slate-800 hover:bg-white/50'
                                }`}
                            >
                                <m.icon className={`w-4 h-4 ${activeTab === m.id ? 'text-white' : 'opacity-30'}`} />
                                {m.label}
                            </button>
                        ))}
                    </nav>
                </aside>

                <main className="flex-1 overflow-y-auto bg-white custom-scrollbar">
                    {activeTab === 'details' && <ProfileDetails student={student} chartData={performanceData} />}
                    {activeTab === 'trends' && <PerformanceTrends data={performanceData} />}
                    {activeTab === 'parents' && <StudentParents student={student} />}
                    {activeTab === 'statement' && <StudentStatement student={student} />}
                    {activeTab === 'invoices' && <StudentInvoices student={student} />}
                </main>
            </div>
        </div>
    );
}

function StudentParents({ student }: any) {
    return (
        <div className="p-0 flex flex-col h-full bg-white">
             <div className="bg-sky-600 p-4 text-white flex justify-between items-center shadow-md">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center overflow-hidden border-2 border-white/20">
                         {student.avatar ? <img src={student.avatar} className="w-full h-full object-cover" /> : <User className="w-6 h-6" />}
                    </div>
                    <div>
                        <h2 className="text-xl font-bold leading-tight">{student.name || 'John Doe'}</h2>
                        <p className="text-[11px] opacity-80 font-bold uppercase tracking-tight">Adm. #: {student.admNo || 'BS2068'} • Parents & Sponsors</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="h-8 bg-sky-600 border-white/40 text-white font-bold text-[11px] rounded-sm px-4 flex gap-2"><Plus className="w-3.5" /> Add Parent</Button>
                    <Button size="sm" variant="outline" className="h-8 bg-sky-600 border-white/40 text-white font-bold text-[11px] rounded-sm px-4 flex gap-2"><Plus className="w-3.5" /> Assign Parent</Button>
                    <Button variant="outline" className="h-8 bg-white/20 border-white/40 text-white text-[11px] font-bold rounded-sm px-4">Back</Button>
                </div>
            </div>
            
            <div className="p-12 space-y-8">
                 <h3 className="text-2xl font-black text-slate-700 tracking-tighter">Parents</h3>
                 <div className="border border-slate-100 rounded-sm shadow-sm">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow className="h-10 hover:bg-slate-50 border-b border-slate-100 text-black">
                                <TableHead className="font-black text-[10px] uppercase h-10 px-8">Name</TableHead>
                                <TableHead className="font-black text-[10px] uppercase h-10 px-8">Role</TableHead>
                                <TableHead className="font-black text-[10px] uppercase h-10 px-8">Relationship</TableHead>
                                <TableHead className="font-black text-[10px] uppercase h-10 px-8">Phone</TableHead>
                                <TableHead className="font-black text-[10px] uppercase h-10 px-8">Email</TableHead>
                                <TableHead className="font-black text-[10px] uppercase h-10 px-8">Options</TableHead>
                                <TableHead className="font-black text-[10px] uppercase h-10 px-8">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow className="h-14">
                                <TableCell className="text-[13px] font-bold text-slate-500 px-8">Mat Doe</TableCell>
                                <TableCell className="text-[13px] font-bold text-slate-500 px-8">Parent</TableCell>
                                <TableCell className="text-[13px] font-bold text-slate-500 px-8">father</TableCell>
                                <TableCell className="text-[13px] font-bold text-slate-500 px-8 font-mono tracking-tighter">+25479933XXXX</TableCell>
                                <TableCell className="text-[13px] font-bold text-slate-500 px-8 lowercase italic">protected@email.com</TableCell>
                                <TableCell className="px-8 space-y-1">
                                    <div className="flex items-center gap-2 scale-75 -ml-2"><Checkbox checked /> <span className="text-[10px] font-black uppercase text-slate-500">Residence</span></div>
                                    <div className="flex items-center gap-2 scale-75 -ml-2"><Checkbox checked /> <span className="text-[10px] font-black uppercase text-slate-500">Notifiable</span></div>
                                    <div className="flex items-center gap-2 scale-75 -ml-2"><Checkbox checked /> <span className="text-[10px] font-black uppercase text-slate-500">Payer</span></div>
                                </TableCell>
                                <TableCell className="px-8">
                                     <div className="flex gap-2">
                                         <Button variant="outline" size="sm" className="h-7 text-[10px] font-bold text-slate-400 border-slate-300 gap-1.5 rounded-sm shadow-sm"><FileText className="w-3.5" /> View</Button>
                                         <Button variant="outline" size="sm" className="h-7 text-[10px] font-bold text-slate-400 border-slate-300 gap-1.5 rounded-sm shadow-sm"><Trash2 className="w-3.5" /> Remove</Button>
                                     </div>
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                 </div>
            </div>
        </div>
    );
}

function StudentStatement({ student }: any) {
    return (
        <div className="p-0 flex flex-col h-full bg-white">
             <div className="bg-sky-600 p-4 text-white flex justify-between items-center shadow-md">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center overflow-hidden border-2 border-white/20">
                         {student.avatar ? <img src={student.avatar} className="w-full h-full object-cover" /> : <User className="w-6 h-6" />}
                    </div>
                    <div>
                        <h2 className="text-xl font-bold leading-tight">{student.name || 'John Doe'}</h2>
                        <p className="text-[11px] opacity-80 font-bold uppercase tracking-tight">Adm. #: {student.admNo || 'BS2068'}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="h-8 bg-sky-600 border-white/40 text-white font-bold text-[11px] rounded-sm px-4 flex gap-2">Mail Statement</Button>
                    <Button size="sm" variant="outline" className="h-8 bg-sky-600 border-white/40 text-white font-bold text-[11px] rounded-sm px-4 flex gap-2">Print Statement</Button>
                    <Button size="sm" variant="outline" className="h-8 bg-sky-600 border-white/40 text-white font-bold text-[11px] rounded-sm px-4 flex gap-2">Download Statement</Button>
                    <Button variant="outline" className="h-8 bg-white/20 border-white/40 text-white text-[11px] font-bold rounded-sm px-4">Back</Button>
                </div>
            </div>
            
            <div className="p-12 space-y-8">
                 <div className="flex justify-between items-center">
                    <h3 className="text-2xl font-black text-slate-700 tracking-tighter">Student Statement</h3>
                    <div className="flex gap-2">
                         <Button variant="outline" size="sm" className="h-8 border-gray-300 text-gray-400 font-bold text-[11px] px-4 rounded-sm">Journals</Button>
                         <Button variant="outline" size="sm" className="h-8 border-gray-300 text-gray-400 font-bold text-[11px] px-4 rounded-sm">Fix</Button>
                    </div>
                 </div>
                 <div className="border border-slate-100 rounded-sm shadow-sm">
                    <Table>
                        <TableHeader className="bg-slate-100">
                            <TableRow className="h-10 hover:bg-slate-100 border-b border-white text-black">
                                <TableHead className="font-black text-[10px] uppercase h-10 px-6">Date</TableHead>
                                <TableHead className="font-black text-[10px] uppercase h-10 px-6">Type</TableHead>
                                <TableHead className="font-black text-[10px] uppercase h-10 px-6">Reference</TableHead>
                                <TableHead className="font-black text-[10px] uppercase h-10 px-6">Summary</TableHead>
                                <TableHead className="font-black text-[10px] uppercase h-10 px-6 text-right">Debit</TableHead>
                                <TableHead className="font-black text-[10px] uppercase h-10 px-6 text-right">Credit</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow className="h-14 font-medium text-[13px] text-gray-600">
                                <TableCell className="px-6">2021-03-21</TableCell>
                                <TableCell className="px-6">-</TableCell>
                                <TableCell className="px-6">-</TableCell>
                                <TableCell className="px-6 font-bold">Balance Brought Forward</TableCell>
                                <TableCell className="px-6 text-right font-black">0.00</TableCell>
                                <TableCell className="px-6 text-right font-black">0.00</TableCell>
                            </TableRow>
                        </TableBody>
                        <tfoot className="bg-slate-50 border-t-2 border-slate-100">
                            <tr className="h-14">
                                <td colSpan={5} className="text-right px-6 text-[13px] font-black text-gray-400 uppercase tracking-widest">Running Balance</td>
                                <td className="text-right px-6 text-[13px] font-black text-rose-500">0.00</td>
                            </tr>
                        </tfoot>
                    </Table>
                 </div>
            </div>
        </div>
    );
}

function StudentInvoices({ student }: any) {
    return (
        <div className="p-0 flex flex-col h-full bg-white">
             <div className="bg-sky-600 p-4 text-white flex justify-between items-center shadow-md">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center overflow-hidden border-2 border-white/20">
                         {student.avatar ? <img src={student.avatar} className="w-full h-full object-cover" /> : <User className="w-6 h-6" />}
                    </div>
                    <div>
                        <h2 className="text-xl font-bold leading-tight">{student.name || 'John Doe'}</h2>
                        <p className="text-[11px] opacity-80 font-bold uppercase tracking-tight">Adm. #: {student.admNo || 'BS2068'}</p>
                    </div>
                </div>
                <Button variant="outline" className="h-8 bg-white/20 border-white/40 text-white text-[11px] font-bold rounded-sm px-4">Back</Button>
            </div>
            
            <div className="p-12 space-y-10">
                 <div className="flex justify-between items-center">
                    <h3 className="text-2xl font-black text-[#1e293b] tracking-tighter">2026 Invoice Items</h3>
                    <Button size="sm" variant="outline" className="h-8 bg-sky-600 text-white border-none font-bold text-[11px] px-4 rounded-sm flex gap-2"><Settings className="w-3.5" /> Change Year</Button>
                 </div>
                 <div className="space-y-4 max-w-sm">
                      {[
                        { id: '4108', label: 'Transport Fees' },
                        { id: '4106', label: 'Lunch Fees' },
                        { id: '4107', label: 'Boarding Fees' },
                        { id: '4104', label: 'Computer Fees' },
                      ].map(item => (
                          <div key={item.id} className="flex items-center gap-4 p-1 hover:bg-slate-50 transition-colors cursor-pointer group rounded-sm">
                               <Checkbox />
                               <span className="text-[13px] font-bold text-slate-600 group-hover:text-sky-600 tracking-tight"><span className="text-slate-400 mr-2">{item.id}</span> {item.label}</span>
                          </div>
                      ))}
                 </div>
            </div>
        </div>
    );
}

function WaiversView({ onBack }: any) {
    const [showAdd, setShowAdd] = useState(false);
    return (
        <div className="flex-1 bg-white p-12 space-y-12">
            <div className="flex justify-between items-center border-b border-gray-50 pb-6">
                <h2 className="text-2xl font-black text-slate-800 tracking-tighter flex items-center gap-3">
                    <Scissors className="w-6 h-6 text-slate-400" /> Waivers/Discounts <Badge variant="secondary" className="bg-sky-500 text-white rounded-full text-[10px] h-5 min-w-[20px] shadow-sm ml-2">0</Badge>
                </h2>
                <div className="flex gap-2">
                    <Button onClick={() => setShowAdd(true)} size="sm" variant="outline" className="text-gray-600 font-bold text-[11px] gap-2 h-8 px-4 rounded-sm border-gray-300 shadow-sm"><Plus className="w-3.5" /> Add Waiver</Button>
                    <Button onClick={onBack} variant="outline" className="h-8 border-gray-300 text-gray-500 font-bold text-[11px] px-4 rounded-sm">Back</Button>
                </div>
            </div>
            
            <div className="space-y-4">
                 <p className="text-[13px] font-bold text-slate-400">Apply waivers/discounts to specified students automatically during billing.</p>
                 <div className="py-20 text-center opacity-30 text-[11px] font-black uppercase tracking-[0.3em] italic">No records found</div>
            </div>

            <Dialog open={showAdd} onOpenChange={setShowAdd}>
                <DialogContent className="p-0 border-0 overflow-hidden rounded-sm max-w-md shadow-2xl">
                    <DialogHeader className="bg-[#10b981] p-4 text-white flex-row items-center gap-2 space-y-0">
                         <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                            <Plus className="w-4 h-4" />
                         </div>
                         <div className="flex flex-col">
                            <DialogTitle className="text-[15px] font-black uppercase tracking-wider leading-none">Waiver Information Registry</DialogTitle>
                            <DialogDescription className="text-white/60 text-[10px] font-medium uppercase tracking-tight mt-1 opacity-100">Capture financial concessions and institutional discount parameters</DialogDescription>
                         </div>
                    </DialogHeader>
                    <div className="p-8 space-y-6">
                         <div className="space-y-2">
                             <Input className="h-11 border-gray-200 rounded-sm bg-slate-50/30 font-medium" placeholder="Name" />
                         </div>
                         <div className="space-y-2">
                             <select className="w-full h-11 px-3 bg-slate-50/30 border border-gray-200 rounded-sm text-[13px] outline-none font-medium text-gray-400">
                                 <option>Select type</option>
                             </select>
                         </div>
                         <div className="space-y-2">
                             <Input className="h-11 border-gray-200 rounded-sm bg-slate-50/30 font-medium" placeholder="Amount" />
                         </div>
                         <div className="space-y-2">
                             <Label className="text-[11px] font-black text-slate-400 uppercase tracking-tight">Vote head(s) to apply waiver/discount</Label>
                             <Input className="h-11 border-gray-200 rounded-sm bg-slate-50/30 font-medium" />
                         </div>
                         <div className="space-y-2">
                             <Label className="text-[11px] font-black text-slate-400 uppercase tracking-tight">Waiver/discount account</Label>
                             <select className="w-full h-11 px-3 bg-slate-50/30 border border-gray-200 rounded-sm text-[13px] outline-none font-medium text-gray-400">
                                 <option>Vote Heads</option>
                             </select>
                         </div>
                         <div className="space-y-2">
                             <Label className="text-[11px] font-black text-slate-400 uppercase tracking-tight">Invoice Item Description</Label>
                             <textarea className="w-full min-h-[80px] p-4 bg-slate-50/30 border border-gray-200 rounded-sm text-[13px] outline-none font-medium" placeholder="Description" />
                         </div>
                    </div>
                    <div className="p-6 bg-slate-50 flex gap-4 border-t border-slate-100">
                         <Button className="flex-1 h-10 bg-[#10b981] hover:bg-emerald-600 text-white font-bold gap-2"><CheckCircle className="w-4" /> Save</Button>
                         <Button onClick={() => setShowAdd(false)} variant="outline" className="flex-1 h-10 border-gray-300 font-bold text-slate-600 gap-2">Cancel</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function ImportExportView({ onBack }: any) {
    const queryClient = useQueryClient();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

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

                    return {
                        studentName,
                        registrationNo: registrationNo.toString(),
                        studentClass,
                        gender: item['Gender'] || item.gender || 'Male',
                        fatherName: item['Father Name'] || item['Guardian'] || item.fatherName || '',
                        admissionDate: item['Admission Date'] || item.admissionDate || new Date().toISOString().split('T')[0],
                        status: item['Status'] || item.status || 'Active',
                        balance: Number(item['Balance'] || item.balance) || 0,
                        discount: String(item['Discount'] || item.discount || '0'),
                        phone: item['Phone'] || item.phone || '',
                        dob: item['DOB'] || item['Date of Birth'] || item.dob || '',
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
                onBack();
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
                { "Student Name": "John Doe", "Registration No": "BS101", "Class": "1 East", "Gender": "Male", "Father Name": "Peter Doe", "Balance": 0, "Discount": "0", "Phone": "+254700000000", "DOB": "2012-05-10" },
                { "Student Name": "Jane Smith", "Registration No": "BS102", "Class": "1 West", "Gender": "Female", "Father Name": "Mary Smith", "Balance": 500, "Discount": "10", "Phone": "+254711111111", "DOB": "2013-08-15" }
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
        <div className="flex-1 bg-white p-12 space-y-12 animate-in fade-in duration-500">
            <div className="flex justify-between items-center border-b border-gray-50 pb-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-[#5C67F2]">
                        <Upload className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 tracking-tighter">Bulk Student Import</h2>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Excel & CSV Format Supported</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button 
                        onClick={downloadSample}
                        size="sm" 
                        variant="outline" 
                        className="text-slate-600 font-bold text-[11px] gap-2 h-9 px-6 rounded-xl border-slate-200 shadow-sm flex items-center"
                    >
                        <Download className="w-4 h-4" /> Download Sample
                    </Button>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileUpload} 
                        accept=".xlsx, .xls, .csv" 
                        className="hidden" 
                    />
                    <Button 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isProcessing}
                        size="sm" 
                        className="bg-[#5C67F2] hover:bg-[#4a54c4] text-white font-bold text-[11px] gap-2 h-9 px-8 rounded-xl shadow-lg shadow-indigo-100 flex items-center"
                    >
                        {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        {isProcessing ? 'Processing...' : 'Upload List'}
                    </Button>
                    <Button onClick={onBack} variant="ghost" className="h-9 px-6 text-gray-400 font-bold text-[11px] hover:text-slate-800">
                        Cancel
                    </Button>
                </div>
            </div>
            
            <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-[2rem] p-12 text-center transition-all duration-200 ${
                    isDragging 
                        ? 'border-[#5C67F2] bg-indigo-50/20 scale-[0.99]' 
                        : 'border-slate-100 bg-slate-50/50 hover:border-slate-200'
                }`}
            >
                <div className="max-w-md mx-auto space-y-4">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm border border-slate-100">
                        <Upload className={`w-8 h-8 ${isDragging ? 'text-[#5C67F2] animate-bounce' : 'text-slate-300'}`} />
                    </div>
                    <h3 className="text-lg font-black text-slate-700">
                        {isDragging ? 'Drop your spreadsheet file here' : 'Drag and drop your spreadsheet here'}
                    </h3>
                    <p className="text-xs text-slate-400">or click <span className="text-[#5C67F2] underline cursor-pointer" onClick={() => fileInputRef.current?.click()}>Upload List</span> to browse</p>
                    <div className="text-[13px] text-slate-500 space-y-2 text-left bg-white p-6 rounded-2xl border border-slate-100 shadow-sm mt-4">
                        <p className="flex gap-3"><span className="text-indigo-500 font-black">1.</span> Column headers must match the sample file.</p>
                        <p className="flex gap-3"><span className="text-indigo-500 font-black">2.</span> Ensure 'Registration No' is unique for every student.</p>
                        <p className="flex gap-3"><span className="text-indigo-500 font-black">3.</span> Class names must exist in your Class Registry.</p>
                        <p className="flex gap-3"><span className="text-indigo-500 font-black">4.</span> Date format should be YYYY-MM-DD.</p>
                    </div>
                </div>
            </div>

            <div className="border border-slate-100 rounded-[1.5rem] shadow-sm overflow-hidden bg-white">
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow className="h-12 hover:bg-slate-50 border-b border-slate-100 text-black">
                            <TableHead className="font-black text-[10px] uppercase h-12 px-6 border-r text-center">Batch ID</TableHead>
                            <TableHead className="font-black text-[10px] uppercase h-12 px-6 border-r">Import Date</TableHead>
                            <TableHead className="font-black text-[10px] uppercase h-12 px-6 border-r">Filename</TableHead>
                            <TableHead className="font-black text-[10px] uppercase h-12 px-6 border-r text-center">Records</TableHead>
                            <TableHead className="font-black text-[10px] uppercase h-12 px-6 border-r text-center">Status</TableHead>
                            <TableHead className="font-black text-[10px] uppercase h-12 px-6 text-center">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <TableRow className="h-16 text-[13px] font-medium text-gray-600">
                            <TableCell className="text-center border-r font-mono text-[11px] text-slate-400">#IMP-9022</TableCell>
                            <TableCell className="px-6 border-r">{new Date().toLocaleDateString()}</TableCell>
                            <TableCell className="px-6 border-r font-bold text-slate-800">Initial_Student_Registry.xlsx</TableCell>
                            <TableCell className="px-6 border-r text-center">42</TableCell>
                            <TableCell className="px-6 border-r text-center">
                                <Badge className="bg-emerald-500 shadow-sm rounded-full px-3 py-1 text-[9px] font-black uppercase">Success</Badge>
                            </TableCell>
                            <TableCell className="px-6 text-center">
                                 <Button variant="ghost" size="sm" className="h-8 text-slate-400 hover:text-indigo-600"><Eye className="w-4 h-4" /></Button>
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}

function ProfileDetails({ student, chartData }: any) {
    return (
        <div className="p-12 space-y-12">
            <div className="flex gap-12 items-start">
                 <div className="flex flex-col items-center shrink-0">
                    <div className="w-48 h-48 rounded-full border-[8px] border-slate-50 shadow-2xl overflow-hidden bg-white mb-6 p-1 border-dashed">
                        <div className="w-full h-full rounded-full overflow-hidden">
                             {student.avatar ? <img src={student.avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-sky-200 flex items-center justify-center text-sky-500 text-6xl font-black italic">J</div>}
                        </div>
                    </div>
                    <Button variant="outline" className="h-8 border-slate-200 text-[#475569] font-black text-[10px] uppercase gap-2 px-6 shadow-sm rounded-sm tracking-widest"><Camera className="w-3.5" /> Change Photo</Button>
                 </div>

                 <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-x-16 gap-y-10">
                    <div className="space-y-10">
                        <div>
                             <h2 className="text-3xl font-black text-[#1e293b] tracking-tighter mb-6">{student.name || 'John Doe'}</h2>
                             <div className="space-y-4">
                                <div className="flex gap-4 items-center mb-6">
                                    <div className="flex items-center gap-2">
                                        <Edit className="w-4 text-slate-300" />
                                        <span className="text-[12px] font-bold text-slate-500">Adm. #:</span>
                                        <span className="text-[12px] font-black text-[#1e293b]">{student.admNo || 'BS2068'}</span>
                                        <Badge className="bg-[#10b981] text-white text-[9px] font-black uppercase rounded-[2px] px-1.5 py-0 shadow-sm ml-2">Active</Badge>
                                    </div>
                                </div>
                                
                                {[
                                    { icon: Info, label: 'Gender', value: 'Male' },
                                    { icon: Globe, label: 'Nationality', flag: true },
                                    { icon: BookmarkIcon, label: 'Sponsorship', value: 'None' },
                                    { icon: BookOpen, label: 'Mode of Learning', value: 'Day' },
                                    { icon: Calendar, label: 'Date of birth', value: '1984-01-01' },
                                    { icon: Calendar, label: 'Admission Date', value: '2018-01-08' },
                                    { icon: Hash, label: 'Unique ID', value: '47357' },
                                ].map((item: any) => (
                                    <div key={item.label} className="flex items-center gap-3">
                                         <item.icon className="w-4 h-4 text-slate-300" />
                                         <span className="text-[12px] font-bold text-slate-500 min-w-[120px]">{item.label}:</span>
                                         {item.flag ? <img src="https://flagcdn.com/w20/ke.png" className="w-5" /> : <span className="text-[12px] font-black text-[#1e293b]">{item.value}</span>}
                                    </div>
                                ))}
                             </div>
                        </div>
                    </div>

                    <div className="space-y-12">
                        <div className="space-y-10">
                             <div className="space-y-4">
                                 <div className="flex items-center gap-2">
                                     <HeartPulse className="w-5 text-slate-800" />
                                     <h4 className="text-[14px] font-black text-slate-800 tracking-tight">Health Concerns</h4>
                                 </div>
                                 <p className="text-[12px] font-bold text-slate-400 pl-7">None</p>
                             </div>
                             <div className="space-y-4">
                                 <div className="flex items-center gap-2">
                                     <TrendingUp className="w-5 text-slate-800 rotate-45" />
                                     <h4 className="text-[14px] font-black text-slate-800 tracking-tight">Waiver/Discount</h4>
                                 </div>
                                 <p className="text-[12px] font-bold text-slate-400 pl-7">None</p>
                             </div>
                        </div>
                    </div>
                 </div>
            </div>

            <div className="border-t border-slate-50 pt-8 space-y-10">
                 <div className="flex items-center gap-10">
                    <p className="text-[13px] font-black text-rose-500 uppercase tracking-tight">Outstanding Balances: KSH 0.00</p>
                    <p className="text-[13px] font-black text-sky-600 uppercase tracking-tight">Credit: KSH 0.00</p>
                    <Button variant="outline" className="h-8 border-slate-200 text-slate-500 font-bold text-[10px] uppercase gap-2 px-4 shadow-sm rounded-sm"><TableIcon className="w-3.5" /> View Statement</Button>
                 </div>

                 <div className="space-y-6">
                    <h4 className="text-[14px] font-black text-slate-800 tracking-tight">Performance Overview</h4>
                    <div className="h-[250px] w-full bg-slate-50/30 rounded-sm border border-slate-100 p-6 shadow-inner">
                         <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 'bold', fill: '#94a3b8' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 'bold', fill: '#94a3b8' }} />
                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                <Line type="monotone" dataKey="student" stroke="#2563eb" strokeWidth={3} dot={{ r: 4, fill: '#2563eb', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                                <Line type="monotone" dataKey="class" stroke="#f59e0b" strokeWidth={3} strokeDasharray="5 5" dot={false} />
                            </LineChart>
                         </ResponsiveContainer>
                    </div>
                 </div>
            </div>
        </div>
    );
}

function PerformanceTrends({ data }: any) {
    return (
        <div className="p-0 flex flex-col h-full bg-white">
             <div className="bg-sky-600 p-6 text-white flex justify-between items-center shadow-lg">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center overflow-hidden border-2 border-white/20">
                         {/* Student Photo */}
                         <User className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold leading-tight">John Doe</h2>
                        <p className="text-[11px] opacity-80 font-bold uppercase tracking-tight">Adm. #: BS2068 • Performance Subjects</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="h-8 bg-white/10 border-white/30 text-white hover:bg-white/20 text-[11px] font-bold rounded-sm px-4">By Subject...</Button>
                    <Button size="sm" variant="outline" className="h-8 bg-white/10 border-white/30 text-white hover:bg-white/20 text-[11px] font-bold rounded-sm px-4">Back</Button>
                </div>
            </div>
            
            <div className="p-12 space-y-10">
                 <h3 className="text-lg font-bold text-slate-800 tracking-tight">Overall Performance</h3>
                 <div className="h-[450px] w-full p-6 border border-slate-100 rounded-sm shadow-sm relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 'bold', fill: '#94a3b8' }} label={{ value: 'Examinations', position: 'bottom', offset: 0, fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 'bold', fill: '#94a3b8' }} domain={[0, 100]} label={{ value: 'Score (%)', angle: -90, position: 'left', fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }} />
                            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                            <Legend verticalAlign="bottom" height={36} iconType="diamond" wrapperStyle={{ fontSize: 9, fontWeight: 'black', textTransform: 'uppercase', letterSpacing: '0.1em' }} />
                            <Line type="monotone" dataKey="student" name="Student" stroke="#dc2626" strokeWidth={2} dot={{ r: 3 }} />
                            <Line type="monotone" dataKey="class" name="Class" stroke="#fbbf24" strokeWidth={2} dot={{ r: 3 }} />
                            <Line type="monotone" dataKey="level" name="Level" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                        </LineChart>
                    </ResponsiveContainer>
                 </div>
            </div>
        </div>
    );
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

function TagIcon(props: any) {
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
        <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2z" />
        <path d="M7 7h.01" />
        </svg>
    )
}
