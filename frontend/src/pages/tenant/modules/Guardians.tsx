import { useState } from "react";
import {
    Search, Plus, Users, MoreVertical, Pencil, Trash2, Eye, UserPlus,
    Phone, Mail, GraduationCap, ChevronRight, Sparkles, PhoneCall,
    ShieldCheck, Link as LinkIcon, Activity
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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const emptyGuardian = { firstName: "", lastName: "", phone: "", email: "" };

export default function Guardians() {
    const [search, setSearch] = useState("");
    const [showAdd, setShowAdd] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [showView, setShowView] = useState(false);
    const [form, setForm] = useState(emptyGuardian);
    const [editId, setEditId] = useState<string | null>(null);
    const [viewGuardian, setViewGuardian] = useState<any>(null);
    const queryClient = useQueryClient();

    const { data: guardians = [], isLoading } = useQuery({
        queryKey: ["guardians"],
        queryFn: async () => { const r = await api.get("/guardians"); return r.data; },
    });

    const createMutation = useMutation({
        mutationFn: (data: any) => api.post("/guardians", data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["guardians"] });
            setShowAdd(false); setForm(emptyGuardian);
            toast.success("Guardian profile integrated");
        },
        onError: (err: any) => toast.error(err?.response?.data?.message || "Integration failed"),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => api.patch(`/guardians/${id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["guardians"] });
            setShowEdit(false); setForm(emptyGuardian);
            toast.success("Parameters updated");
        },
        onError: (err: any) => toast.error(err?.response?.data?.message || "Sync failed"),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/guardians/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["guardians"] });
            queryClient.invalidateQueries({ queryKey: ["students"] });
            toast.success("Guardian archived");
        },
    });

    const filtered = guardians.filter((g: any) => {
        const q = search.toLowerCase();
        return `${g.firstName} ${g.lastName}`.toLowerCase().includes(q) ||
            g.phone?.toLowerCase().includes(q) ||
            g.email?.toLowerCase().includes(q);
    });

    const openEdit = (g: any) => {
        setForm({ firstName: g.firstName, lastName: g.lastName, phone: g.phone || "", email: g.email || "" });
        setEditId(g.id);
        setShowEdit(true);
    };

    const linkedCount = guardians.filter((g: any) => g.students?.length > 0).length;

    return (
        <>
            <AppHeader title="Guardian Directory" subtitle="Parental nodes & guardianship matrix tracking" />
            <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-muted/30">

                {/* Stats Matrix */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                        <Card className="border-0 shadow-soft bg-background/50 backdrop-blur-md overflow-hidden group">
                            <CardContent className="p-6 flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground group-hover:text-primary transition-colors">Total Guardians</p>
                                    <p className="text-3xl font-black mt-1">{isLoading ? "---" : guardians.length}</p>
                                </div>
                                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:scale-110 transition-transform">
                                    <Users className="w-7 h-7 text-primary" />
                                </div>
                            </CardContent>
                            <div className="h-1.5 w-full bg-primary/20 group-hover:bg-primary transition-all duration-500" />
                        </Card>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
                        <Card className="border-0 shadow-soft bg-background/50 backdrop-blur-md overflow-hidden group">
                            <CardContent className="p-6 flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground group-hover:text-indigo-500 transition-colors">Linked Profiles</p>
                                    <p className="text-3xl font-black mt-1">{linkedCount}</p>
                                </div>
                                <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 group-hover:scale-110 transition-transform">
                                    <LinkIcon className="w-7 h-7 text-indigo-500" />
                                </div>
                            </CardContent>
                            <div className="h-1.5 w-full bg-indigo-500/20 group-hover:bg-indigo-500 transition-all duration-500" />
                        </Card>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
                        <Card className="border-0 shadow-soft bg-background/50 backdrop-blur-md overflow-hidden group">
                            <CardContent className="p-6 flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground group-hover:text-amber-500 transition-colors">Signal Reach</p>
                                    <p className="text-3xl font-black mt-1">{guardians.filter((g: any) => g.phone).length}</p>
                                </div>
                                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 group-hover:scale-110 transition-transform">
                                    <PhoneCall className="w-7 h-7 text-amber-500" />
                                </div>
                            </CardContent>
                            <div className="h-1.5 w-full bg-amber-500/20 group-hover:bg-amber-500 transition-all duration-500" />
                        </Card>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}>
                        <Card className="border-0 shadow-soft bg-background/50 backdrop-blur-md overflow-hidden group">
                            <CardContent className="p-6 flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground group-hover:text-success transition-colors">Integrity</p>
                                    <p className="text-3xl font-black mt-1">98%</p>
                                </div>
                                <div className="w-14 h-14 rounded-2xl bg-success/10 flex items-center justify-center border border-success/20 group-hover:scale-110 transition-transform">
                                    <Activity className="w-7 h-7 text-success" />
                                </div>
                            </CardContent>
                            <div className="h-1.5 w-full bg-success/20 group-hover:bg-success transition-all duration-500" />
                        </Card>
                    </motion.div>
                </div>

                {/* Toolbar */}
                <div className="flex flex-col xl:flex-row gap-4 items-center justify-between bg-background/40 p-4 rounded-[2rem] border border-border/50 backdrop-blur-md shadow-sm">
                    <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
                        <div className="relative w-full sm:w-80">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Filter guardian nodes..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="pl-11 h-12 bg-background/50 border-none rounded-2xl shadow-none focus-visible:ring-2 focus-visible:ring-primary/20"
                            />
                        </div>
                    </div>
                    <Button onClick={() => { setForm(emptyGuardian); setShowAdd(true); }} className="h-12 px-8 rounded-2xl shadow-lg shadow-primary/20 font-black gap-2 w-full xl:w-auto">
                        <UserPlus className="w-5 h-5" /> Integrate New Guardian
                    </Button>
                </div>

                {/* Table Flow */}
                <AnimatePresence mode="wait">
                    {isLoading ? (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-40 gap-4">
                            <div className="w-12 h-12 border-4 border-primary/10 border-t-primary rounded-full animate-spin" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Mapping Parental Connections...</p>
                        </motion.div>
                    ) : (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-background/40 backdrop-blur-md rounded-[2.5rem] border border-border/50 overflow-hidden shadow-soft">
                            <Table>
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent border-border/50">
                                        <TableHead className="w-20 pl-8 py-6 text-[10px] font-black uppercase tracking-widest">Mark</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase tracking-widest">Biological Node</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase tracking-widest">Communication Channel</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase tracking-widest">Entity Links</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase tracking-widest">Sys Registry</TableHead>
                                        <TableHead className="text-right text-[10px] font-black uppercase tracking-widest pr-10">Meta Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filtered.map((g: any) => (
                                        <TableRow key={g.id} className="group hover:bg-background/60 transition-colors border-border/50">
                                            <TableCell className="pl-8 py-6">
                                                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 font-black text-xs group-hover:scale-110 transition-transform">
                                                    {g.firstName?.[0]}{g.lastName?.[0]}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <h4 className="font-black text-sm">{g.firstName} {g.lastName}</h4>
                                                    <p className="text-[10px] font-black uppercase text-indigo-500 tracking-tighter">Verified Guardian</p>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1">
                                                    {g.phone && <span className="flex items-center gap-2 text-[11px] font-bold"><Phone className="w-3 h-3 text-muted-foreground" /> {g.phone}</span>}
                                                    {g.email && <span className="flex items-center gap-2 text-[10px] font-medium text-muted-foreground"><Mail className="w-3 h-3" /> {g.email}</span>}
                                                    {!g.phone && !g.email && <span className="text-[10px] italic text-muted-foreground font-medium opacity-40">NO COMMS CHANNEL</span>}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1.5 max-w-[200px]">
                                                    {g.students?.length > 0 ? (
                                                        g.students.map((sg: any) => (
                                                            <Badge key={sg.student.id} variant="secondary" className="text-[9px] font-black uppercase h-5 px-3 bg-white border-none shadow-sm text-primary">
                                                                {sg.student.firstName}
                                                            </Badge>
                                                        ))
                                                    ) : (
                                                        <Badge variant="outline" className="text-[9px] font-black uppercase h-5 px-3 opacity-20">UNBOUND</Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-[10px] font-mono font-bold text-muted-foreground">
                                                {new Date(g.createdAt).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className="text-right pr-6">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-muted group-hover:scale-110 transition-transform"><MoreVertical className="w-4 h-4" /></Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="rounded-2xl border-border/50 shadow-2xl p-1">
                                                        <DropdownMenuItem onClick={() => { setViewGuardian(g); setShowView(true); }} className="rounded-xl font-bold py-2.5"><Eye className="w-3.5 h-3.5 mr-3" /> Inspect Node</DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => openEdit(g)} className="rounded-xl font-bold py-2.5"><Pencil className="w-3.5 h-3.5 mr-3" /> Re-Calibrate</DropdownMenuItem>
                                                        <DropdownMenuItem className="text-rose-500 rounded-xl font-bold py-2.5" onClick={() => deleteMutation.mutate(g.id)}><Trash2 className="w-3.5 h-3.5 mr-3" /> Archive Link</DropdownMenuItem>
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

            {/* Ingress Dialog */}
            <Dialog open={showAdd || showEdit} onOpenChange={(open) => { if (!open) { setShowAdd(false); setShowEdit(false); setEditId(null); setForm(emptyGuardian); } }}>
                <DialogContent className="max-w-xl rounded-[3rem] border-0 shadow-2xl p-0 overflow-hidden bg-background/95 backdrop-blur-xl">
                    <div className="h-2 bg-primary" />
                    <div className="p-10">
                        <DialogHeader className="mb-8">
                            <DialogTitle className="text-3xl font-black flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                                    <Sparkles className="w-6 h-6" />
                                </div>
                                {showEdit ? "Update Guardian" : "Integrate Guardian"}
                            </DialogTitle>
                            <DialogDescription className="text-sm font-medium">Establish a high-fidelity parental node within the communication network.</DialogDescription>
                        </DialogHeader>

                        <form onSubmit={e => {
                            e.preventDefault();
                            showEdit ? updateMutation.mutate({ id: editId!, data: form }) : createMutation.mutate(form);
                        }} className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest ml-1">Legal First Name *</Label><Input value={form.firstName} onChange={e => setForm(p => ({ ...p, firstName: e.target.value }))} required className="h-12 rounded-2xl bg-muted/50 border-0 shadow-none font-bold" /></div>
                                <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest ml-1">Legal Surname *</Label><Input value={form.lastName} onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))} required className="h-12 rounded-2xl bg-muted/50 border-0 shadow-none font-bold" /></div>
                            </div>
                            <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest ml-1">Voice Frequency (Phone)</Label><Input type="tel" placeholder="07XX XXX XXX" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} className="h-12 rounded-2xl bg-muted/50 border-0 shadow-none font-bold" /></div>
                            <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest ml-1">Digital Protocol (Email)</Label><Input type="email" placeholder="name@domain.com" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className="h-12 rounded-2xl bg-muted/50 border-0 shadow-none font-bold" /></div>

                            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-emerald-600 shadow-sm border border-emerald-50">
                                    <ShieldCheck className="w-5 h-5" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[10px] font-black uppercase text-emerald-900 tracking-tight">Security Protocol</p>
                                    <p className="text-[9px] font-medium text-emerald-400 text-pretty">Verification signals will be dispatched to these channels for portal authorization.</p>
                                </div>
                            </div>

                            <DialogFooter className="mt-8 flex !flex-row gap-3 pt-4">
                                <Button type="button" variant="outline" onClick={() => { setShowAdd(false); setShowEdit(false); }} className="flex-1 h-12 rounded-2xl font-bold border-border/50">Abort Sync</Button>
                                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="flex-[2] h-12 rounded-2xl font-black shadow-lg shadow-primary/20 bg-primary">
                                    {showEdit ? "Apply Parameters" : "Synchronize Profile"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Inspect Node */}
            <Dialog open={showView} onOpenChange={setShowView}>
                <DialogContent className="max-w-xl rounded-[3rem] border-0 shadow-2xl p-0 overflow-hidden bg-background/95 backdrop-blur-xl">
                    {viewGuardian && (
                        <div className="flex flex-col">
                            <div className="p-10 bg-gradient-to-br from-indigo-500/10 via-background to-transparent border-b border-border/50">
                                <div className="flex items-center gap-6">
                                    <div className="w-20 h-20 rounded-[2rem] bg-indigo-500 flex items-center justify-center text-white text-3xl font-black shadow-2xl border-4 border-background">
                                        {viewGuardian.firstName?.[0]}{viewGuardian.lastName?.[0]}
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="text-2xl font-black">{viewGuardian.firstName} {viewGuardian.lastName}</h3>
                                        <div className="flex items-center gap-2">
                                            <Badge className="font-black text-[9px] uppercase h-6 bg-indigo-500/10 text-indigo-500 border-none tracking-widest">Active Link</Badge>
                                            <span className="text-[10px] font-mono font-bold text-muted-foreground ml-2 pt-1 uppercase tracking-tighter">ID: {viewGuardian.id.split('-')[0]}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-10 space-y-8">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest px-1">Comms Registry</p>
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-3 p-3 rounded-2xl bg-muted/40 border border-border/50">
                                                <Phone className="w-3.5 h-3.5 text-primary" />
                                                <span className="text-[11px] font-bold">{viewGuardian.phone || "UNREGISTERED"}</span>
                                            </div>
                                            <div className="flex items-center gap-3 p-3 rounded-2xl bg-muted/40 border border-border/50">
                                                <Mail className="w-3.5 h-3.5 text-primary" />
                                                <span className="text-[11px] font-bold truncate">{viewGuardian.email || "UNREGISTERED"}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-4 pt-5 px-4 rounded-[2rem] bg-primary/5 border border-primary/10">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[9px] font-black uppercase text-primary tracking-widest">Entity Density</span>
                                            <Badge className="bg-primary text-white border-none font-black text-[10px] h-6 w-6 flex items-center justify-center p-0 rounded-lg">{viewGuardian.students?.length || 0}</Badge>
                                        </div>
                                        <p className="text-[10px] font-medium text-primary/60 text-pretty">Currently managing multiple high-value student nodes within the central registry.</p>
                                    </div>
                                </div>

                                {viewGuardian.students?.length > 0 && (
                                    <div className="space-y-3">
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground px-1 flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-primary" /> Connected Students
                                        </h4>
                                        <div className="grid grid-cols-1 gap-2">
                                            {viewGuardian.students.map((sg: any) => (
                                                <div key={sg.student.id} className="flex items-center justify-between p-4 rounded-2xl bg-background border border-border/50 hover:bg-muted/30 transition-all group overflow-hidden relative">
                                                    <div className="flex items-center gap-3 relative z-10">
                                                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                                            <GraduationCap className="w-4 h-4" />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-xs font-black">{sg.student.firstName} {sg.student.lastName}</span>
                                                            <span className="text-[9px] font-black text-muted-foreground uppercase opacity-60">{sg.student.admissionNumber}</span>
                                                        </div>
                                                    </div>
                                                    <div className="relative z-10">
                                                        <Badge variant="outline" className="text-[9px] font-black uppercase h-6 border-border/40 group-hover:bg-primary group-hover:text-white transition-colors">{sg.relation}</Badge>
                                                    </div>
                                                    <div className="absolute top-0 right-0 w-20 h-full bg-gradient-to-l from-primary/5 to-transparent skew-x-12 translate-x-10 group-hover:translate-x-0 transition-transform duration-700" />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="p-8 bg-muted/10 border-t border-border/50 flex gap-3">
                                <Button variant="outline" className="flex-1 h-12 rounded-2xl font-bold border-border/50" onClick={() => setShowView(false)}>Dismiss Node</Button>
                                <Button className="flex-1 h-12 rounded-2xl font-black shadow-lg shadow-primary/20 gap-2" onClick={() => { setShowView(false); openEdit(viewGuardian); }}>
                                    <Pencil className="w-4 h-4" /> Re-Calibrate Specification
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
