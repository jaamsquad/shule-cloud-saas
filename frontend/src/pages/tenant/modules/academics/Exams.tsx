import { useState } from "react";
import { 
    Search, Plus, Calendar, Eye, Edit, Trash2, 
    LayoutDashboard, Settings, FileText, CheckCircle, ArrowLeft,
    TrendingUp, Users, Info, ChevronRight, MoreHorizontal,
    Table as TableIcon, Printer, User, Award, BarChart3,
    ShieldCheck, GraduationCap, ChevronDown, ListChecks, Mail, MessageSquare, PlayCircle,
    Copy, Sparkles, BookOpen, AlertCircle
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
import { motion, AnimatePresence } from "framer-motion";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function Exams() {
    const [selectedExam, setSelectedExam] = useState<any>(null);
    const [subView, setSubView] = useState<"dashboard" | "results" | "settings">("dashboard");
    const [search, setSearch] = useState("");
    const [showAdd, setShowAdd] = useState(false);
    const [editingExam, setEditingExam] = useState<any>(null);
    const [form, setForm] = useState({ type: "", level: "", period: "", mode: "Regular", status: "Active" });
    
    const queryClient = useQueryClient();

    const { data: exams = [], isLoading } = useQuery({
        queryKey: ["exams-list"],
        queryFn: async () => {
            const r = await api.get("/academics/exams");
            return r.data;
        },
    });

    const { data: periods = [] } = useQuery({
        queryKey: ["periods"],
        queryFn: async () => (await api.get("/academics/periods")).data,
    });
    const currentPeriod = periods.find((p: any) => p.isCurrent) || periods[0];

    const createMutation = useMutation({
        mutationFn: (data: any) => api.post("/academics/exams", data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["exams-list"] });
            setShowAdd(false);
            setForm({ type: "", level: "", period: "", mode: "Regular", status: "Active" });
            toast.success("Examination added successfully");
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string, data: any }) => api.patch(`/academics/exams/${id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["exams-list"] });
            setEditingExam(null);
            toast.success("Examination updated");
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/academics/exams/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["exams-list"] });
            setSelectedExam(null);
            toast.success("Examination archived");
        },
    });

    const filtered = exams.filter((e: any) => 
        e.type?.toLowerCase().includes(search.toLowerCase()) || 
        e.level?.toLowerCase().includes(search.toLowerCase())
    );

    const handleEditClick = (e: any) => {
        setEditingExam(e);
        setForm({ type: e.type, level: e.level, period: e.period, mode: e.mode || "Regular", status: e.status || "Active" });
    };

    if (selectedExam) {
        return (
            <ExamContainer 
                exam={selectedExam} 
                onBack={() => setSelectedExam(null)} 
                subView={subView} 
                setSubView={setSubView}
                onDelete={() => deleteMutation.mutate(selectedExam._id)}
                onEdit={() => handleEditClick(selectedExam)}
            />
        );
    }

    return (
        <div className="flex-1 bg-white overflow-hidden flex flex-col p-6 space-y-6">
            <div className="flex justify-between items-start border-b border-gray-100 pb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-sm bg-gray-50 flex items-center justify-center">
                        <TableIcon className="w-5 h-5 text-gray-500" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                             Examinations
                        </h1>
                        <p className="text-[12px] text-gray-400 font-bold mt-0.5 tracking-tight uppercase">
                            {currentPeriod ? `Period: ${currentPeriod.label} · Year: ${currentPeriod.academicYear}` : "Period: Term 2 · Year: 2026/2027"}
                        </p>
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                    <Button onClick={() => { setForm({ type: "", level: "", period: currentPeriod ? `${currentPeriod.label} (${currentPeriod.academicYear})` : "Term 2 (2026/2027)", mode: "Regular", status: "Active" }); setShowAdd(true); }} size="sm" variant="outline" className="text-gray-600 font-bold text-[11px] gap-2 h-9 px-4 rounded-sm border-gray-300">
                        <Plus className="w-4 h-4" /> Add Examination
                    </Button>
                    <Button variant="outline" size="sm" className="text-gray-600 font-bold text-[11px] gap-2 h-9 px-4 rounded-sm border-gray-300">
                        <Calendar className="w-4 h-4 text-gray-400" /> Change Year
                    </Button>
                </div>
            </div>

            <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2 text-[13px] text-gray-500">
                    <span>Show</span>
                    <select className="border border-gray-300 rounded-sm px-2 py-1 outline-none font-bold text-gray-700 h-8">
                        <option>10</option>
                        <option>25</option>
                    </select>
                    <span>entries</span>
                </div>
                
                <div className="flex items-center gap-2">
                   <span className="text-[13px] font-medium text-gray-500">Search:</span>
                   <Input 
                        value={search} 
                        onChange={e => setSearch(e.target.value)}
                        className="w-56 h-8 rounded-sm bg-white border-gray-300 shadow-none text-[13px]" 
                    />
                </div>
            </div>

            <div className="border border-gray-100 rounded-sm shadow-sm overflow-x-auto">
                <Table>
                    <TableHeader className="bg-gray-50 text-gray-600">
                        <TableRow className="h-10">
                            <TableHead className="font-bold text-[12px] uppercase text-gray-500 h-10 px-6">Type</TableHead>
                            <TableHead className="font-bold text-[12px] uppercase text-gray-500 h-10 px-6">Level</TableHead>
                            <TableHead className="font-bold text-[12px] uppercase text-gray-500 h-10 px-6">Period</TableHead>
                            <TableHead className="font-bold text-[12px] uppercase text-gray-500 h-10 px-6">Type</TableHead>
                            <TableHead className="font-bold text-[12px] uppercase text-gray-500 h-10 px-6">Status</TableHead>
                            <TableHead className="font-bold text-[12px] uppercase text-gray-500 h-10 px-6 text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={6} className="text-center py-10 opacity-50 text-xs text-gray-400">Syncing with registry...</TableCell></TableRow>
                        ) : filtered.length === 0 ? (
                            <TableRow><TableCell colSpan={6} className="text-center py-10 opacity-50 text-xs font-bold text-gray-400 tracking-widest uppercase">No examination records found</TableCell></TableRow>
                        ) : (
                            filtered.map((e: any) => (
                                <TableRow key={e._id} className="hover:bg-gray-50/50 group border-b border-gray-50 h-12">
                                    <TableCell className="text-[13px] text-gray-800 px-6 font-medium">{e.type}</TableCell>
                                    <TableCell className="text-[13px] text-gray-600 px-6">{e.level}</TableCell>
                                    <TableCell className="text-[13px] text-gray-500 px-6">{e.period || 'N/A'}</TableCell>
                                    <TableCell className="text-[13px] px-6">
                                        <span className={e.mode === 'Combined' ? 'text-rose-500 font-bold' : 'text-sky-600 font-bold'}>{e.mode || 'Regular'}</span>
                                    </TableCell>
                                    <TableCell className="px-6">
                                        <Badge className="bg-[#10b981] hover:bg-[#059669] text-white font-black text-[9px] uppercase rounded-[2px] px-2 py-0.5 tracking-tighter">
                                            {e.status || 'Complete'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right px-6 flex justify-end items-center h-12 gap-1.5">
                                        <Button onClick={() => setSelectedExam(e)} variant="outline" size="sm" className="h-7 px-3 text-[11px] font-bold text-white bg-sky-600 hover:bg-sky-700 border-none gap-1.5 rounded-sm shadow-none">
                                            <Eye className="w-3.5 h-3.5" /> View
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
            
            <Dialog open={showAdd || !!editingExam} onOpenChange={(v) => { if(!v) { setShowAdd(false); setEditingExam(null); } }}>
                <DialogContent className="max-w-xl p-0 overflow-hidden border-none rounded-[4px] shadow-2xl">
                    <DialogHeader className="bg-[#10b981] p-4 text-white flex-row items-center gap-3 space-y-0">
                         <div className="bg-white/20 p-2 rounded-full shrink-0">
                            <Pencil className="w-4 h-4" />
                         </div>
                         <div className="flex flex-col">
                            <DialogTitle className="text-[17px] font-bold tracking-tight leading-none">Examination Details</DialogTitle>
                            <DialogDescription className="sr-only">Assessment lifecycle and parameter configuration</DialogDescription>
                         </div>
                    </DialogHeader>
                    <div className="p-8 bg-white">
                        <div className="grid grid-cols-2 gap-x-12 gap-y-6">
                            <div className="space-y-4">
                                <div className="space-y-1">
                                     <select 
                                         value={form.type} 
                                         onChange={e => setForm({...form, type: e.target.value})}
                                         className="w-full h-11 px-4 rounded-[4px] border border-gray-300 text-[14px] bg-white focus:border-[#10b981] outline-none font-medium text-gray-700 shadow-sm appearance-none cursor-pointer"
                                     >
                                         <option value="">Select Exam Type</option>
                                         <option value="Mid Term Exam">Mid Term Exam</option>
                                         <option value="End Term Exam">End Term Exam</option>
                                         <option value="CAT 1">CAT 1</option>
                                         <option value="CAT 2">CAT 2</option>
                                     </select>
                                </div>
                                <div className="space-y-1">
                                     <select 
                                         value={form.mode} 
                                         onChange={e => setForm({...form, mode: e.target.value})}
                                         className="w-full h-11 px-4 rounded-[4px] border border-gray-300 text-[14px] bg-white focus:border-[#10b981] outline-none font-medium text-gray-700 shadow-sm appearance-none cursor-pointer"
                                     >
                                         <option value="Regular">Regular Exam</option>
                                         <option value="Combined">Combined Exam</option>
                                     </select>
                                </div>
                                <div className="space-y-1">
                                     <select 
                                         value={form.level} 
                                         onChange={e => setForm({...form, level: e.target.value})}
                                         className="w-full h-11 px-4 rounded-[4px] border border-gray-300 text-[14px] bg-white focus:border-[#10b981] outline-none font-medium text-gray-700 shadow-sm appearance-none cursor-pointer"
                                     >
                                         <option value="">Select Level</option>
                                         <option value="Form 1">Form 1</option>
                                         <option value="Form 2">Form 2</option>
                                         <option value="Form 3">Form 3</option>
                                         <option value="Form 4">Form 4</option>
                                         <option value="Grade 1">Grade 1</option>
                                         <option value="Grade 2">Grade 2</option>
                                         <option value="Grade 3">Grade 3</option>
                                     </select>
                                </div>
                                <div className="space-y-1">
                                     <select 
                                         value={form.period} 
                                         onChange={e => setForm({...form, period: e.target.value})}
                                         className="w-full h-11 px-4 rounded-[4px] border border-gray-300 text-[14px] bg-white focus:border-[#10b981] outline-none font-medium text-gray-700 shadow-sm appearance-none cursor-pointer"
                                     >
                                         <option value="">Select Period / Term</option>
                                         {periods.map((p: any) => (
                                             <option key={p._id} value={`${p.label} (${p.academicYear})`}>
                                                 {p.label} ({p.academicYear}) {p.isCurrent ? "★ CURRENT" : ""}
                                             </option>
                                         ))}
                                         {periods.length === 0 && (
                                             <option value="Term 2 (2026/2027)">Term 2 (2026/2027)</option>
                                         )}
                                     </select>
                                </div>
                                <div className="flex items-center h-11 border border-gray-300 rounded-[4px] overflow-hidden">
                                     <div className="bg-gray-50 px-3 border-r h-full flex items-center shrink-0">
                                         <span className="font-bold text-[14px] text-gray-500">.0</span>
                                     </div>
                                     <Input type="number" className="h-full border-none rounded-none focus-visible:ring-0 text-[14px] text-gray-700 shadow-none px-4" placeholder="Decimal Points" />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center h-11 border border-gray-300 rounded-[4px] overflow-hidden group focus-within:border-[#10b981] transition-colors shadow-sm">
                                    <div className="bg-gray-50 px-3 border-r h-full flex items-center shrink-0">
                                         <Calendar className="w-4 h-4 text-gray-500" />
                                    </div>
                                    <Input type="text" className="h-full border-none rounded-none focus-visible:ring-0 text-[14px] text-gray-500 font-medium px-4" placeholder="Starting Date" />
                                </div>
                                <div className="flex items-center h-11 border border-gray-300 rounded-[4px] overflow-hidden group focus-within:border-[#10b981] transition-colors shadow-sm">
                                    <div className="bg-gray-50 px-3 border-r h-full flex items-center shrink-0">
                                         <Calendar className="w-4 h-4 text-gray-500" />
                                    </div>
                                    <Input type="text" className="h-full border-none rounded-none focus-visible:ring-0 text-[14px] text-gray-500 font-medium px-4" placeholder="Ending Date" />
                                </div>
                                <div className="flex items-center h-11 border border-gray-300 rounded-[4px] overflow-hidden group focus-within:border-[#10b981] transition-colors shadow-sm">
                                    <div className="bg-gray-50 px-3 h-full flex items-center shrink-0 border-r">
                                         <Info className="w-4 h-4 text-gray-500" />
                                    </div>
                                    <Input className="h-full border-none rounded-none focus-visible:ring-0 text-[14px] text-gray-500 font-medium px-4" placeholder="Exam Name (optional)" />
                                </div>

                                <div className="pt-4 space-y-4">
                                   <label className="flex items-center gap-3 cursor-pointer group">
                                       <div className="w-5 h-5 border-[2px] border-gray-300 rounded-[2px] bg-white group-hover:border-[#10b981] transition-colors" />
                                       <span className="text-[13px] font-bold text-slate-600">Show Ranking</span>
                                   </label>
                                   <label className="flex items-center gap-3 cursor-pointer group">
                                       <div className="w-5 h-5 border-[2px] border-gray-300 rounded-[2px] bg-white group-hover:border-[#10b981] transition-colors" />
                                       <span className="text-[13px] font-bold text-slate-600">This is a combination of exams</span>
                                   </label>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="p-8 border-t flex gap-4 bg-white/50">
                         <Button onClick={() => editingExam ? updateMutation.mutate({ id: editingExam._id, data: form }) : createMutation.mutate(form)} className="flex-1 h-11 bg-[#10b981] hover:bg-emerald-600 text-white font-bold rounded-[4px] text-[15px] gap-2 shadow-sm transition-all">
                            <CheckCircle className="w-4 h-4" /> Save
                         </Button>
                         <Button variant="outline" onClick={() => { setShowAdd(false); setEditingExam(null); }} className="flex-1 h-11 bg-white border border-gray-300 text-gray-600 font-bold rounded-[4px] text-[15px] gap-2 shadow-sm hover:bg-gray-50 transition-all uppercase tracking-tight">
                            <span className="w-5 h-5 border-2 border-gray-400 rounded-full flex items-center justify-center text-[10px] bg-transparent transform -rotate-45 shrink-0 opacity-60">|</span> Cancel
                         </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function ExamContainer({ exam, onBack, subView, setSubView, onDelete, onEdit }: any) {
    return (
        <div className="flex h-full bg-[#f8fafc]">
            <aside className="w-56 bg-white border-r border-gray-100 flex flex-col shadow-sm">
                 <div className="p-4 border-b border-gray-100 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-sky-500" />
                    <h2 className="font-bold text-sky-600 text-[13px]">Exam Menu</h2>
                 </div>
                 <nav className="flex-1 py-1">
                    {[
                        { id: 'dashboard', label: 'Exam Dashboard', icon: LayoutDashboard },
                        { id: 'settings', label: 'Exam Settings', icon: Settings },
                        { id: 'papers', label: 'Exam Papers', icon: FileText },
                        { id: 'results', label: 'Results Submission', icon: ChevronRight },
                    ].map(item => (
                        <button 
                            key={item.id}
                            onClick={() => setSubView(item.id)}
                            className={`w-full flex items-center gap-3 px-6 py-2.5 text-[12px] font-medium transition-all ${subView === item.id 
                                ? "bg-[#10b981] text-white" 
                                : "hover:bg-gray-50 text-gray-500"
                            }`}
                        >
                            <item.icon className={`w-3.5 h-3.5 ${subView === item.id ? 'text-white' : 'opacity-30'}`} />
                            {item.label}
                        </button>
                    ))}

                    <button 
                        onClick={onBack}
                        className="w-full flex items-center gap-3 px-6 py-4 mt-4 text-[12px] font-medium text-gray-400 hover:text-gray-800 border-t border-dashed"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        Go Back
                    </button>
                 </nav>
            </aside>

            <main className="flex-1 overflow-hidden flex flex-col">
                <div className="h-14 bg-white border-b border-gray-200 px-4 flex items-center justify-between shadow-sm">
                    <div className="flex gap-2 overflow-x-auto no-scrollbar items-center py-2">
                        <Button onClick={onEdit} size="sm" variant="outline" className="h-8 bg-sky-600 hover:bg-sky-700 text-white border-none text-[11px] font-bold gap-2 rounded-sm"><Edit className="w-3.5" /> Edit Exam</Button>
                        <Button size="sm" variant="outline" className="h-8 bg-sky-600 hover:bg-sky-700 text-white border-none text-[11px] font-bold gap-2 rounded-sm"><Plus className="w-3.5" /> Participating Classes</Button>
                        <Button size="sm" variant="outline" className="h-8 bg-sky-600 hover:bg-sky-700 text-white border-none text-[11px] font-bold gap-2 rounded-sm"><Award className="w-3.5" /> Rank All</Button>
                        <Button size="sm" variant="outline" className="h-8 bg-sky-600 hover:bg-sky-700 text-white border-none text-[11px] font-bold gap-2 rounded-sm"><TrendingUp className="w-3.5" /> Regrade</Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button size="sm" variant="outline" className="h-8 bg-white border-gray-300 text-gray-500 text-[11px] font-bold gap-2 rounded-sm"><Plus className="w-3.5" /> More Actions... <ChevronDown className="w-3" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={onDelete} className="text-rose-600 font-bold">Delete Record</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50/50">
                    {subView === 'dashboard' ? <IndividualExamDashboard exam={exam} /> : <IndividualExamResults exam={exam} />}
                </div>
            </main>
        </div>
    );
}

function IndividualExamDashboard({ exam }: any) {
    const data = [
        { name: 'Overall', points: 11.2 },
        { name: 'Yellow', points: 12.5 },
        { name: 'Grey', points: 10.3 },
    ];

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex items-center gap-4">
                 <h2 className="text-2xl font-bold text-sky-900 tracking-tight">Exam Dashboard</h2>
                 <Badge className="bg-rose-500 text-white rounded-[2px] text-[10px] uppercase font-black px-2 py-0.5 tracking-tighter shadow-sm">Combined Exam</Badge>
                 <Badge className="bg-[#10b981] text-white rounded-[2px] text-[10px] uppercase font-black px-2 py-0.5 tracking-tighter shadow-sm">Complete</Badge>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                     <div className="bg-white border border-gray-100 p-10 rounded-sm shadow-sm flex flex-col items-center relative h-[400px]">
                        <div className="relative w-48 h-48 mb-6">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={[{v: 100}]} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                                    <Bar dataKey="v" fill="#fbbf24" radius={[40, 40, 40, 40]} />
                                </BarChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <p className="text-4xl font-black text-[#1e293b] leading-none">100<span className="text-[20px] ml-0.5 opacity-60">%</span></p>
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Completion</p>
                            </div>
                            <div className="absolute inset-0 border-[14px] border-amber-400 rounded-full opacity-100 border-t-transparent -rotate-45" />
                            <div className="absolute -inset-1 border border-white/50 rounded-full" />
                        </div>
                        
                        <div className="flex gap-20 w-full justify-center">
                           <div className="text-center">
                              <p className="text-3xl font-black text-[#1e293b]">2</p>
                              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Finished</p>
                           </div>
                           <div className="text-center">
                              <p className="text-3xl font-black text-[#1e293b]">0</p>
                              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Remaining</p>
                           </div>
                        </div>

                        <div className="w-full h-48 mt-10">
                             <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 'bold', fill: '#94a3b8' }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 'bold', fill: '#94a3b8' }} />
                                    <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '4px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                    <Bar dataKey="points" barSize={35}>
                                        {data.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={index === 0 ? '#dc2626' : index === 1 ? '#16a34a' : '#2563eb'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                             </ResponsiveContainer>
                             <p className="text-[9px] font-black uppercase tracking-widest text-[#94a3b8] absolute -left-12 top-1/2 -rotate-90">Points</p>
                        </div>
                     </div>
                </div>

                <div className="space-y-8">
                    <div className="bg-white border border-gray-100 p-6 rounded-sm shadow-sm space-y-4">
                        <h4 className="font-bold text-sky-900 text-[14px] border-b border-slate-50 pb-3 flex items-center justify-between">Exam Details</h4>
                        <div className="space-y-4 pt-2">
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-[12px] text-slate-400 font-bold uppercase tracking-tight">Results Submission Status:</span>
                                    <span className="text-[12px] text-[#10b981] font-black">Complete 100%</span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-100 rounded-sm overflow-hidden border border-slate-50">
                                    <div className="h-full w-full bg-[#10b981]" />
                                </div>
                            </div>
                            
                            {[
                                { label: 'Mean Grade', value: 'A Minus', color: 'text-slate-800' },
                                { label: 'Mean Points', value: '11.0', color: 'text-slate-800' },
                                { label: 'Mean Score', value: '77', color: 'text-slate-800' },
                                { label: 'Grading Preset', value: 'KCSE Preset', color: 'text-sky-600 underline cursor-pointer' },
                                { label: 'Ranking', value: 'Pending', color: 'text-sky-600 bg-sky-50 px-2 py-0.5 rounded-sm' },
                                { label: 'Show Ranking', value: 'Yes', color: 'text-emerald-600' },
                                { label: 'Prevent Changes', value: 'Yes', color: 'text-rose-500' },
                            ].map(x => (
                                <div key={x.label} className="flex justify-between items-center text-[12px]">
                                    <span className="text-slate-500 font-medium">{x.label}:</span>
                                    <span className={`font-black ${x.color}`}>{x.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <div className="bg-white border border-gray-100 p-6 rounded-sm shadow-sm space-y-4">
                        <h4 className="font-bold text-sky-900 text-[14px] border-b border-slate-50 pb-3">Exam Reports</h4>
                        <div className="space-y-4 pt-2">
                             {[
                                { stream: 'Yellow', avg: '12.0', grade: 'A' },
                                { stream: 'Grey', avg: '10.0', grade: 'B PLUS' },
                                { stream: 'Overall', avg: '11.0', grade: 'A Minus' },
                             ].map(r => (
                                <div key={r.stream} className="flex flex-col border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-[12px] font-bold text-slate-800">{r.stream}</span>
                                        <div className="flex items-center gap-4">
                                            <span className="text-[12px] font-black text-slate-500">{r.avg}</span>
                                            <span className="text-[12px] font-black text-slate-800 w-16 text-right">{r.grade}</span>
                                            <button className="text-sky-600 text-[11px] font-bold flex items-center gap-1 hover:underline"><TableIcon className="w-3" /> View Report</button>
                                        </div>
                                    </div>
                                </div>
                             ))}
                        </div>
                        <Button className="w-full bg-[#10b981] hover:bg-emerald-600 text-white rounded-sm text-[12px] font-bold gap-2 shadow-sm"><FileText className="w-4 h-4" /> View Analysis Report</Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function IndividualExamResults({ exam }: any) {
    return (
        <div className="bg-white border border-gray-100 rounded-sm shadow-sm overflow-hidden flex flex-col h-full mx-auto max-w-[1400px]">
            <div className="bg-sky-600 p-6 text-white flex justify-between items-center">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/20 rounded-sm flex items-center justify-center">
                         <FileText className="w-6 h-6 rotate-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold leading-tight">{exam.type}</h2>
                        <p className="text-[12px] opacity-80 font-bold uppercase tracking-tight">{exam.level} Yellow • Results</p>
                    </div>
                 </div>
                 <div className="flex gap-2">
                    {['Rank Class', 'SMS Results', 'Mail', 'Print Results', 'Marksheet', 'By Subject', 'Raw Marks', 'Grade Distribution'].map(act => (
                        <Button key={act} size="sm" variant="outline" className="h-8 bg-white/10 border-white/30 text-white hover:bg-white/20 text-[11px] font-bold rounded-sm px-4">{act}</Button>
                    ))}
                    <Button onClick={() => {}} variant="outline" size="sm" className="h-8 bg-white/20 border-white/40 text-white text-[11px] font-bold rounded-sm px-4"><ArrowLeft className="w-3.5 mr-2" /> Back</Button>
                 </div>
            </div>

            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white px-8">
                 <h3 className="text-[15px] font-bold text-slate-800 flex items-center gap-2 tracking-tight"><LayoutDashboard className="w-5 h-5 text-sky-500" /> Results</h3>
                 <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="h-8 bg-sky-600 text-white border-none hover:bg-sky-700 text-[11px] font-bold rounded-sm px-4 flex gap-2"><Settings className="w-3.5" /> Change View <ChevronDown className="w-3" /></Button>
                    <Button size="sm" variant="outline" className="h-8 bg-slate-100 text-slate-400 border-none cursor-not-allowed text-[11px] font-bold rounded-sm px-4 gap-2"><TrendingUp className="w-3.5" /> Regrade</Button>
                 </div>
            </div>

            <div className="p-4 flex items-center justify-between border-b border-slate-50 bg-slate-50/30 px-8">
                <div className="flex items-center gap-2 text-[13px] text-gray-500">
                    <span>Show</span>
                    <select className="border border-gray-300 bg-white rounded-sm px-2 py-1 outline-none font-bold text-gray-700">
                        <option>50</option>
                    </select>
                    <span>entries</span>
                </div>
                <div className="flex items-center gap-2">
                   <span className="text-[13px] font-black text-slate-500 uppercase tracking-tight">Search:</span>
                   <Input className="w-48 h-8 rounded-sm bg-white border-gray-200 shadow-none text-[13px]" />
                </div>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar">
                <Table className="border-collapse">
                    <TableHeader className="bg-slate-50 text-[#94a3b8] sticky top-0 z-10 border-b shadow-sm">
                        <TableRow className="h-10 hover:bg-slate-50">
                            <TableHead className="w-12 h-10 font-black px-4 text-[10px] uppercase text-center border-r">#</TableHead>
                            <TableHead className="h-10 font-black px-4 text-[10px] uppercase border-r">Adm.#</TableHead>
                            <TableHead className="h-10 font-black px-4 text-[10px] uppercase border-r min-w-[180px]">Name</TableHead>
                            {['ENG', 'KIS', 'MATH', 'BIO', 'PHY', 'CHEM', 'HIS', 'GEO', 'CRE', 'IRE', 'HSCI', 'AGRI', 'COM', 'BUS'].map(sub => (
                                <TableHead key={sub} className="h-10 font-black px-4 text-[10px] uppercase text-center border-r min-w-[65px]">{sub}</TableHead>
                            ))}
                            <TableHead className="h-10 font-black px-4 text-[10px] uppercase text-center border-r min-w-[80px]">Total</TableHead>
                            <TableHead className="h-10 font-black px-4 text-[10px] uppercase text-center min-w-[80px]">Mean</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {[
                            { adm: 'BS0112', name: 'Fatuma Waridi', ENG: '12 A', KIS: '12 A', MATH: '11 A-', BIO: '11 A-', PHY: '12 A', CHEM: '11 A-', HIS: '12 A', GEO: '11 A-', CRE: '12 A', IRE: '-', HSCI: '-', AGRI: '-', COM: '11 A-', BUS: '12 A', total: '82.00', mean: '11 A' }
                        ].map((row, idx) => (
                             <TableRow key={row.adm} className="h-12 border-b hover:bg-sky-50/20 transition-colors group">
                                <TableCell className="px-4 text-[12px] text-slate-400 font-bold text-center border-r">{idx + 1}</TableCell>
                                <TableCell className="px-4 text-[12px] text-sky-600 font-black border-r underline cursor-pointer hover:text-sky-800">{row.adm}</TableCell>
                                <TableCell className="px-4 text-[12px] font-bold text-slate-700 border-r">{row.name}</TableCell>
                                {['ENG', 'KIS', 'MATH', 'BIO', 'PHY', 'CHEM', 'HIS', 'GEO', 'CRE', 'IRE', 'HSCI', 'AGRI', 'COM', 'BUS'].map(sub => (
                                    <TableCell key={sub} className="px-4 text-[12px] text-center border-r font-bold text-slate-600">{(row as any)[sub] || '-'}</TableCell>
                                ))}
                                <TableCell className="px-4 text-[12px] text-center border-r font-black text-slate-800">{row.total}</TableCell>
                                <TableCell className="px-4 text-[12px] text-center font-black text-sky-600">{row.mean}</TableCell>
                             </TableRow>
                        ))}
                    </TableBody>
                    <TableFooter className="bg-slate-50 border-t-2 border-slate-200 pointer-events-none sticky bottom-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                        <TableRow className="h-14 font-black">
                            <TableCell colSpan={3} className="px-4 text-right pr-10 text-slate-400 uppercase tracking-widest text-[10px]">Mean Analysis</TableCell>
                            {['ENG', 'KIS', 'MATH', 'BIO', 'PHY', 'CHEM', 'HIS', 'GEO', 'CRE', 'IRE', 'HSCI', 'AGRI', 'COM', 'BUS'].map((sub, idx) => (
                                <TableCell key={sub} className="px-4 text-[12px] text-center border-r text-slate-700 bg-slate-100/50">
                                    {(rowIdx: number) => {}}
                                    {idx === 0 || idx === 1 || idx === 13 ? '12.0 A' : (idx < 14 ? '11.0 A-' : '-')}
                                </TableCell>
                            ))}
                            <TableCell className="px-4 text-[12px] text-center border-r text-slate-800 bg-slate-100">82.00</TableCell>
                            <TableCell className="px-4 text-[12px] text-center text-sky-800 bg-slate-100 font-black">12 A</TableCell>
                        </TableRow>
                    </TableFooter>
                </Table>
            </div>
            
            <div className="p-4 flex items-center justify-between text-[13px] text-gray-500 border-t bg-white px-8">
                <p>Showing 1 to 1 of 1 entries</p>
                <div className="flex">
                    <Button variant="outline" size="sm" className="h-8 shadow-none border-gray-200 rounded-l-md border-r-0 text-gray-400">Previous</Button>
                    <Button variant="outline" size="sm" className="h-8 w-8 bg-sky-600 text-white shadow-none border-none rounded-none">1</Button>
                    <Button variant="outline" size="sm" className="h-8 shadow-none border-gray-200 rounded-r-md border-l-0 text-gray-400">Next</Button>
                </div>
            </div>
        </div>
    );
}

function TableFooter({ children, className }: any) {
    return <tfoot className={className}>{children}</tfoot>;
}
