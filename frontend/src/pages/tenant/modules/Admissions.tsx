import { useState } from "react";
<<<<<<< HEAD:frontend/src/pages/tenant/modules/Admissions.tsx
import {
    Search, Plus, UserPlus, ClipboardCheck, Calendar, CheckCircle2, XCircle,
    MoreVertical, Pencil, Trash2, Eye, GraduationCap, Users, School,
    ChevronRight, Sparkles, UserCheck, AlertCircle, TrendingUp, Info
} from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const emptyForm = {
    admissionNumber: "", firstName: "", lastName: "", gender: "Male", dob: "",
    classStreamId: "", guardianFirstName: "", guardianLastName: "", guardianPhone: "", guardianEmail: "",
    guardianRelation: "Parent",
};

export default function Admissions() {
    const [search, setSearch] = useState("");
    const [showAdd, setShowAdd] = useState(false);
    const [showView, setShowView] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [viewStudent, setViewStudent] = useState<any>(null);
    const queryClient = useQueryClient();

    const { data: students = [], isLoading } = useQuery({
        queryKey: ["students"],
        queryFn: async () => { const r = await api.get("/students"); return r.data; },
    });

    const { data: classStreams = [] } = useQuery({
        queryKey: ["class-streams"],
        queryFn: async () => { const r = await api.get("/class-streams"); return r.data; },
    });

    const admitMutation = useMutation({
        mutationFn: async (data: typeof emptyForm) => {
            let guardianId;
            if (data.guardianFirstName && data.guardianLastName) {
                const gRes = await api.post("/guardians", {
                    firstName: data.guardianFirstName,
                    lastName: data.guardianLastName,
                    phone: data.guardianPhone,
                    email: data.guardianEmail,
                });
                guardianId = gRes.data.id;
            }
            return api.post("/students", {
                admissionNumber: data.admissionNumber,
                firstName: data.firstName,
                lastName: data.lastName,
                gender: data.gender,
                dob: data.dob,
                classStreamId: data.classStreamId || undefined,
                guardianId,
                guardianRelation: data.guardianRelation,
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["students"] });
            queryClient.invalidateQueries({ queryKey: ["guardians"] });
            setShowAdd(false);
            setForm(emptyForm);
            toast.success("Student node successfully integrated!");
        },
        onError: (err: any) => toast.error(err?.response?.data?.message || "Integration failed"),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/students/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["students"] });
            toast.success("Record archived");
        },
    });

    const recentAdmissions = [...students].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const filtered = recentAdmissions.filter((s: any) => {
        const q = search.toLowerCase();
        return `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
            s.admissionNumber.toLowerCase().includes(q);
    });

    const thisMonthCount = students.filter((s: any) => {
        const d = new Date(s.createdAt);
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;

    return (
        <>
            <AppHeader title="Admission Registry" subtitle="High-fidelity enrollment & student lifecycle tracking" />
            <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-muted/30">

                {/* Metrics Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                        <Card className="border-0 shadow-soft bg-background/50 backdrop-blur-md overflow-hidden group">
                            <CardContent className="p-6 flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground group-hover:text-primary transition-colors">Cumulative Entry</p>
                                    <p className="text-3xl font-black mt-1">{isLoading ? "---" : students.length}</p>
                                </div>
                                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:scale-110 transition-transform">
                                    <GraduationCap className="w-7 h-7 text-primary" />
                                </div>
                            </CardContent>
                            <div className="h-1.5 w-full bg-primary/20 group-hover:bg-primary transition-all duration-500" />
                        </Card>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
                        <Card className="border-0 shadow-soft bg-background/50 backdrop-blur-md overflow-hidden group">
                            <CardContent className="p-6 flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground group-hover:text-success transition-colors">Verified Active</p>
                                    <p className="text-3xl font-black mt-1">{students.filter((s: any) => !s.deletedAt).length}</p>
                                </div>
                                <div className="w-14 h-14 rounded-2xl bg-success/10 flex items-center justify-center border border-success/20 group-hover:scale-110 transition-transform">
                                    <UserCheck className="w-7 h-7 text-success" />
                                </div>
                            </CardContent>
                            <div className="h-1.5 w-full bg-success/20 group-hover:bg-success transition-all duration-500" />
                        </Card>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
                        <Card className="border-0 shadow-soft bg-background/50 backdrop-blur-md overflow-hidden group">
                            <CardContent className="p-6 flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground group-hover:text-indigo-500 transition-colors">Temporal Flux (Month)</p>
                                    <p className="text-3xl font-black mt-1">{thisMonthCount}</p>
                                </div>
                                <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 group-hover:scale-110 transition-transform">
                                    <TrendingUp className="w-7 h-7 text-indigo-500" />
                                </div>
                            </CardContent>
                            <div className="h-1.5 w-full bg-indigo-500/20 group-hover:bg-indigo-500 transition-all duration-500" />
                        </Card>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}>
                        <Card className="border-0 shadow-soft bg-background/50 backdrop-blur-md overflow-hidden group">
                            <CardContent className="p-6 flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground group-hover:text-rose-500 transition-colors">Archived Records</p>
                                    <p className="text-3xl font-black mt-1">{students.filter((s: any) => s.deletedAt).length}</p>
                                </div>
                                <div className="w-14 h-14 rounded-2xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20 group-hover:scale-110 transition-transform">
                                    <AlertCircle className="w-7 h-7 text-rose-500" />
                                </div>
                            </CardContent>
                            <div className="h-1.5 w-full bg-rose-500/20 group-hover:bg-rose-500 transition-all duration-500" />
                        </Card>
                    </motion.div>
                </div>

                {/* Toolbar */}
                <div className="flex flex-col xl:flex-row gap-4 items-center justify-between bg-background/40 p-4 rounded-[2rem] border border-border/50 backdrop-blur-md shadow-sm">
                    <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
                        <div className="relative w-full sm:w-80">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Filter admission nodes..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="pl-11 h-12 bg-background/50 border-none rounded-2xl shadow-none focus-visible:ring-2 focus-visible:ring-primary/20"
                            />
                        </div>
                    </div>
                    <Button onClick={() => { setForm(emptyForm); setShowAdd(true); }} className="h-12 px-8 rounded-2xl shadow-lg shadow-primary/20 font-black gap-2 w-full xl:w-auto">
                        <UserPlus className="w-5 h-5" /> Initialize Ingress
                    </Button>
                </div>

                {/* Content Table */}
                <AnimatePresence mode="wait">
                    {isLoading ? (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-40 gap-4">
                            <div className="w-12 h-12 border-4 border-primary/10 border-t-primary rounded-full animate-spin" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Synchronizing Registry Flux...</p>
                        </motion.div>
                    ) : (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-background/40 backdrop-blur-md rounded-[2.5rem] border border-border/50 overflow-hidden shadow-soft">
                            <Table>
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent border-border/50">
                                        <TableHead className="w-20 pl-8 py-6 text-[10px] font-black uppercase tracking-widest">Mark</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase tracking-widest">Entity Specification</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase tracking-widest">Level Assign</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase tracking-widest">Guardian Link</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase tracking-widest">Registry Date</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase tracking-widest">Status</TableHead>
                                        <TableHead className="text-right text-[10px] font-black uppercase tracking-widest pr-10">Meta Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filtered.map((s: any) => (
                                        <TableRow key={s.id} className="group hover:bg-background/60 transition-colors border-border/50">
                                            <TableCell className="pl-8 py-6">
                                                <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-xs group-hover:scale-110 transition-transform">
                                                    {s.firstName?.[0]}{s.lastName?.[0]}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <h4 className="font-black text-sm">{s.firstName} {s.lastName}</h4>
                                                    <p className="text-[10px] font-mono font-bold text-muted-foreground uppercase">{s.admissionNumber}</p>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="text-[9px] font-black uppercase h-5 bg-background border-border/50 px-2.5">
                                                    {s.classStream?.name || "Global Flow"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="text-xs font-bold">{s.guardians?.[0]?.guardian ? `${s.guardians[0].guardian.firstName} ${s.guardians[0].guardian.lastName}` : "UNBOUND"}</span>
                                                    {s.guardians?.[0]?.relation && <span className="text-[8px] font-black uppercase text-muted-foreground tracking-tighter">{s.guardians[0].relation}</span>}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-[10px] font-mono font-bold text-muted-foreground">
                                                {new Date(s.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={`text-[9px] font-black uppercase h-6 px-3 tracking-tighter border-none ${s.deletedAt ? "bg-rose-500/10 text-rose-500" : "bg-emerald-500/10 text-emerald-500"}`}>
                                                    {s.deletedAt ? "Archived" : "Verified"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right pr-6">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-muted group-hover:scale-110 transition-transform"><MoreVertical className="w-4 h-4" /></Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="rounded-2xl border-border/50 shadow-2xl p-1">
                                                        <DropdownMenuItem onClick={() => { setViewStudent(s); setShowView(true); }} className="rounded-xl font-bold py-2.5"><Eye className="w-3.5 h-3.5 mr-3" /> Inspect Node</DropdownMenuItem>
                                                        <DropdownMenuItem className="text-rose-500 rounded-xl font-bold py-2.5" onClick={() => deleteMutation.mutate(s.id)}><Trash2 className="w-3.5 h-3.5 mr-3" /> Archive Unit</DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Premium Ingress Dialog */}
            <Dialog open={showAdd} onOpenChange={setShowAdd}>
                <DialogContent className="max-w-3xl rounded-[3rem] border-0 shadow-2xl p-0 overflow-hidden bg-background/95 backdrop-blur-xl">
                    <div className="h-2 bg-primary" />
                    <div className="p-10">
                        <DialogHeader className="mb-8">
                            <DialogTitle className="text-3xl font-black flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                                    <Sparkles className="w-6 h-6" />
                                </div>
                                Entity Ingress
                            </DialogTitle>
                            <DialogDescription className="text-sm font-medium">Initialize student node propagation into the school's central registry.</DialogDescription>
                        </DialogHeader>

                        <form onSubmit={e => { e.preventDefault(); admitMutation.mutate(form); }} className="space-y-8">
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Badge className="bg-primary/10 text-primary border-none font-black text-[9px] h-6 uppercase tracking-widest">Phase 1</Badge>
                                    <span className="text-[10px] font-black uppercase text-muted-foreground mr-1">Biological Identity</span>
                                    <div className="flex-1 h-px bg-border/50 border-dashed" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest ml-1">First Name</Label><Input value={form.firstName} onChange={e => setForm(p => ({ ...p, firstName: e.target.value }))} required className="h-12 rounded-2xl bg-muted/50 border-0 shadow-none font-bold" /></div>
                                    <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest ml-1">Last Name</Label><Input value={form.lastName} onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))} required className="h-12 rounded-2xl bg-muted/50 border-0 shadow-none font-bold" /></div>
                                    <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest ml-1">Meta ID (Admission #)</Label><Input placeholder="ADM-202X-XX" value={form.admissionNumber} onChange={e => setForm(p => ({ ...p, admissionNumber: e.target.value }))} required className="h-12 rounded-2xl bg-muted/50 border-0 shadow-none font-mono font-bold" /></div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Cell Gender</Label>
                                        <Select value={form.gender} onValueChange={v => setForm(p => ({ ...p, gender: v }))}>
                                            <SelectTrigger className="h-12 rounded-2xl bg-muted/50 border-0 shadow-none font-bold"><SelectValue /></SelectTrigger>
                                            <SelectContent className="rounded-2xl border-border/50 shadow-2xl"><SelectItem value="Male" className="font-bold">MALE</SelectItem><SelectItem value="Female" className="font-bold">FEMALE</SelectItem></SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest ml-1">Birth Registry</Label><Input type="date" value={form.dob} onChange={e => setForm(p => ({ ...p, dob: e.target.value }))} className="h-12 rounded-2xl bg-muted/50 border-0 shadow-none font-bold" /></div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Level Assign</Label>
                                        <Select value={form.classStreamId} onValueChange={v => setForm(p => ({ ...p, classStreamId: v }))}>
                                            <SelectTrigger className="h-12 rounded-2xl bg-muted/50 border-0 shadow-none font-bold"><SelectValue placeholder="Target Level" /></SelectTrigger>
                                            <SelectContent className="rounded-2xl border-border/50 shadow-2xl">
                                                {classStreams.map((cs: any) => (
                                                    <SelectItem key={cs.id} value={cs.id} className="font-bold">{cs.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Badge className="bg-indigo-500/10 text-indigo-500 border-none font-black text-[9px] h-6 uppercase tracking-widest">Phase 2</Badge>
                                    <span className="text-[10px] font-black uppercase text-muted-foreground mr-1">Guardianship Node</span>
                                    <div className="flex-1 h-px bg-border/50 border-dashed" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest ml-1">Primary Guardian (Name)</Label><Input placeholder="First Name" value={form.guardianFirstName} onChange={e => setForm(p => ({ ...p, guardianFirstName: e.target.value }))} className="h-12 rounded-2xl bg-muted/50 border-0 shadow-none font-bold" /></div>
                                    <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest ml-1">Primary Guardian (Surname)</Label><Input placeholder="Last Name" value={form.guardianLastName} onChange={e => setForm(p => ({ ...p, guardianLastName: e.target.value }))} className="h-12 rounded-2xl bg-muted/50 border-0 shadow-none font-bold" /></div>
                                    <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest ml-1">Voice Link</Label><Input type="tel" placeholder="Phone" value={form.guardianPhone} onChange={e => setForm(p => ({ ...p, guardianPhone: e.target.value }))} className="h-12 rounded-2xl bg-muted/50 border-0 shadow-none font-bold" /></div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Affiliation</Label>
                                        <Select value={form.guardianRelation} onValueChange={v => setForm(p => ({ ...p, guardianRelation: v }))}>
                                            <SelectTrigger className="h-12 rounded-2xl bg-muted/50 border-0 shadow-none font-bold"><SelectValue /></SelectTrigger>
                                            <SelectContent className="rounded-2xl border-border/50 shadow-2xl">
                                                <SelectItem value="Parent" className="font-bold">Parent</SelectItem>
                                                <SelectItem value="Father" className="font-bold">Father</SelectItem>
                                                <SelectItem value="Mother" className="font-bold">Mother</SelectItem>
                                                <SelectItem value="Guardian" className="font-bold">Guardian</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>

                            <DialogFooter className="mt-10 flex !flex-row gap-3 pt-4">
                                <Button type="button" variant="outline" onClick={() => setShowAdd(false)} className="flex-1 h-12 rounded-2xl font-bold border-border/50">Abort Ingress</Button>
                                <Button type="submit" disabled={admitMutation.isPending} className="flex-[2] h-12 rounded-2xl font-black shadow-lg shadow-primary/20 bg-primary">
                                    {admitMutation.isPending ? "Propagating Node..." : "Launch Ingress"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Inspect Node Dialog */}
            <Dialog open={showView} onOpenChange={setShowView}>
                <DialogContent className="max-w-xl rounded-[3rem] border-0 shadow-2xl p-0 overflow-hidden bg-background/95 backdrop-blur-xl">
                    {viewStudent && (
                        <div className="flex flex-col">
                            <div className="p-10 bg-gradient-to-br from-primary/10 via-background to-transparent border-b border-border/50">
                                <div className="flex items-center gap-6">
                                    <div className="w-20 h-20 rounded-[2rem] bg-primary flex items-center justify-center text-white text-3xl font-black shadow-2xl border-4 border-background">
                                        {viewStudent.firstName?.[0]}{viewStudent.lastName?.[0]}
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="text-2xl font-black">{viewStudent.firstName} {viewStudent.lastName}</h3>
                                        <div className="flex items-center gap-2">
                                            <Badge className="font-black text-[10px] uppercase h-6 bg-primary/10 text-primary border-none">{viewStudent.admissionNumber}</Badge>
                                            <Badge variant="outline" className="font-black text-[10px] uppercase h-6 border-border/50 bg-white/50">{viewStudent.classStream?.name || "Global"}</Badge>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-10 space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 rounded-3xl bg-muted/30">
                                        <p className="text-[9px] font-black uppercase text-muted-foreground mb-1 tracking-widest">Status</p>
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${viewStudent.deletedAt ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                                            <span className="text-xs font-black uppercase">{viewStudent.deletedAt ? 'Archived' : 'Verified Active'}</span>
                                        </div>
                                    </div>
                                    <div className="p-4 rounded-3xl bg-muted/30">
                                        <p className="text-[9px] font-black uppercase text-muted-foreground mb-1 tracking-widest">Lifecycle Ingress</p>
                                        <span className="text-xs font-bold font-mono">{new Date(viewStudent.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                                    </div>
                                </div>

                                {viewStudent.guardians?.length > 0 && (
                                    <div className="space-y-3">
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground px-1 flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-primary" /> Guardianship Grid
                                        </h4>
                                        {viewStudent.guardians.map((g: any) => (
                                            <div key={g.guardianId} className="p-5 rounded-[2rem] bg-indigo-50/50 border border-indigo-100 flex items-center justify-between group">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-indigo-600 font-bold shadow-sm">
                                                        {g.guardian.firstName?.[0]}{g.guardian.lastName?.[0]}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black">{g.guardian.firstName} {g.guardian.lastName}</p>
                                                        <p className="text-[10px] font-bold text-muted-foreground uppercase">{g.relation}</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-indigo-500 border border-indigo-50 shadow-sm cursor-pointer hover:bg-indigo-500 hover:text-white transition-colors">
                                                        <Info className="w-4 h-4" />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="p-8 bg-muted/10 border-t border-border/50 flex gap-3">
                                <Button variant="outline" className="flex-1 h-12 rounded-2xl font-bold border-border/50" onClick={() => setShowView(false)}>Dismiss</Button>
                                <Button className="flex-1 h-12 rounded-2xl font-black shadow-lg shadow-primary/20 gap-2">
                                    <UserCheck className="w-4 h-4" /> Verify Credentials
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
=======
import { Search, Plus, Filter, FileUp } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const applications = [
  { id: "APP-001", name: "Grace Wambui", class: "Grade 7", guardian: "Joyce Wambui", phone: "+254 711 222 333", date: "2026-02-20", status: "Pending" },
  { id: "APP-002", name: "Mark Otieno", class: "Grade 7", guardian: "Peter Otieno", phone: "+254 722 333 444", date: "2026-02-18", status: "Approved" },
  { id: "APP-003", name: "Fatima Ali", class: "Grade 8", guardian: "Hassan Ali", phone: "+254 733 444 555", date: "2026-02-15", status: "Approved" },
  { id: "APP-004", name: "Samuel Kiprop", class: "Grade 7", guardian: "Elijah Kiprop", phone: "+254 744 555 666", date: "2026-02-12", status: "Rejected" },
  { id: "APP-005", name: "Mercy Njoki", class: "Grade 9", guardian: "Ann Njoki", phone: "+254 755 666 777", date: "2026-02-10", status: "Pending" },
];

export default function Admissions() {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const filtered = applications.filter(a => a.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <AppHeader title="Admissions" subtitle="New student enrollment and applications" />
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card><CardContent className="pt-6"><p className="text-2xl font-bold text-foreground">12</p><p className="text-xs text-muted-foreground">Total Applications</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-2xl font-bold text-warning">5</p><p className="text-xs text-muted-foreground">Pending Review</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-2xl font-bold text-success">6</p><p className="text-xs text-muted-foreground">Approved</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-2xl font-bold text-destructive">1</p><p className="text-xs text-muted-foreground">Rejected</p></CardContent></Card>
        </div>

        {showForm ? (
          <Card>
            <CardHeader><CardTitle className="text-base">New Application</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label className="text-xs">First Name</Label><Input placeholder="Enter first name" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Last Name</Label><Input placeholder="Enter last name" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Date of Birth</Label><Input type="date" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Gender</Label>
                  <Select><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem></SelectContent></Select>
                </div>
                <div className="space-y-1.5"><Label className="text-xs">Applying for Class</Label>
                  <Select><SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger><SelectContent><SelectItem value="7">Grade 7</SelectItem><SelectItem value="8">Grade 8</SelectItem><SelectItem value="9">Grade 9</SelectItem></SelectContent></Select>
                </div>
                <div className="space-y-1.5"><Label className="text-xs">Guardian Name</Label><Input placeholder="Guardian full name" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Guardian Phone</Label><Input placeholder="+254 7XX XXX XXX" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Guardian Email</Label><Input type="email" placeholder="guardian@email.com" /></div>
              </div>
              <div className="flex gap-2">
                <Button>Submit Application</Button>
                <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search applications..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm"><FileUp className="w-4 h-4 mr-1.5" />Bulk Import</Button>
                <Button size="sm" onClick={() => setShowForm(true)}><Plus className="w-4 h-4 mr-1.5" />New Application</Button>
              </div>
            </div>
            <Card className="shadow-card overflow-hidden">
              <Table>
                <TableHeader><TableRow><TableHead className="text-xs">APP ID</TableHead><TableHead className="text-xs">STUDENT NAME</TableHead><TableHead className="text-xs">CLASS</TableHead><TableHead className="text-xs">GUARDIAN</TableHead><TableHead className="text-xs">PHONE</TableHead><TableHead className="text-xs">DATE</TableHead><TableHead className="text-xs">STATUS</TableHead></TableRow></TableHeader>
                <TableBody>
                  {filtered.map(a => (
                    <TableRow key={a.id}>
                      <TableCell className="text-sm font-mono text-primary">{a.id}</TableCell>
                      <TableCell className="text-sm font-medium">{a.name}</TableCell>
                      <TableCell className="text-sm">{a.class}</TableCell>
                      <TableCell className="text-sm">{a.guardian}</TableCell>
                      <TableCell className="text-sm">{a.phone}</TableCell>
                      <TableCell className="text-sm">{a.date}</TableCell>
                      <TableCell><Badge variant={a.status === "Approved" ? "default" : a.status === "Pending" ? "secondary" : "destructive"} className="text-xs">{a.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </>
        )}
      </div>
    </>
  );
>>>>>>> 77ad23531057427f302c2871fe4722f1f20fe25e:src/pages/modules/Admissions.tsx
}
