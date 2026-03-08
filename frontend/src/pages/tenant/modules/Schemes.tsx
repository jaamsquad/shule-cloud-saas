import { useState } from "react";
import { motion } from "framer-motion";
import {
    Search, Plus, Download, Calendar, Loader2, Sparkles,
    ChevronRight, BookOpen, Layers, Info, ShieldCheck, FileText
} from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Schemes() {
    const [search, setSearch] = useState("");
    const [showAdd, setShowAdd] = useState(false);
    const [form, setForm] = useState({ subjectId: "", teacherId: "", termId: "", fileUrl: "" });
    const queryClient = useQueryClient();

    const { data: schemes = [], isLoading } = useQuery({
        queryKey: ["schemes"],
        queryFn: async () => {
            const r = await api.get("/academics/schemes");
            return r.data;
        },
    });

    const { data: subjects = [] } = useQuery({ queryKey: ["subjects"], queryFn: async () => (await api.get("/subjects")).data });
    const { data: staff = [] } = useQuery({ queryKey: ["staff"], queryFn: async () => (await api.get("/staff")).data });

    const createMutation = useMutation({
        mutationFn: (data: any) => api.post("/academics/schemes", data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["schemes"] });
            setShowAdd(false);
            setForm({ subjectId: "", teacherId: "", termId: "", fileUrl: "" });
            toast.success("Scheme uploaded");
        },
    });

    const filtered = schemes.filter((s: any) =>
        s.subject?.name.toLowerCase().includes(search.toLowerCase()) ||
        s.teacher?.firstName.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <>
            <AppHeader title="Schemes of Work" subtitle="Plan and manage curriculum delivery for the term" />
            <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-muted/30">

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                        <Card className="border-0 shadow-soft bg-background/50 backdrop-blur-md overflow-hidden group">
                            <CardContent className="p-6 flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground group-hover:text-primary transition-colors">Total Schemes</p>
                                    <p className="text-3xl font-black mt-1">{schemes.length}</p>
                                </div>
                                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:scale-110 transition-transform">
                                    <Layers className="w-7 h-7 text-primary" />
                                </div>
                            </CardContent>
                            <div className="h-1.5 w-full bg-primary/20" />
                        </Card>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
                        <Card className="border-0 shadow-soft bg-background/50 backdrop-blur-md overflow-hidden group">
                            <CardContent className="p-6 flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground group-hover:text-emerald-500 transition-colors">Approved</p>
                                    <p className="text-3xl font-black mt-1">
                                        {schemes.length > 0 ? Math.round((schemes.filter((s: any) => s.status === 'APPROVED').length / schemes.length) * 100) : 0}%
                                    </p>
                                </div>
                                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 group-hover:scale-110 transition-transform">
                                    <ShieldCheck className="w-7 h-7 text-emerald-500" />
                                </div>
                            </CardContent>
                            <div className="h-1.5 w-full bg-emerald-500/20" />
                        </Card>
                    </motion.div>
                </div>

                <div className="flex flex-col xl:flex-row gap-4 items-center justify-between bg-background/40 p-4 rounded-[2rem] border border-border/50 backdrop-blur-md shadow-sm">
                    <div className="relative w-full sm:w-80">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search schemes..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="pl-11 h-12 bg-background/50 border-none rounded-2xl shadow-none focus-visible:ring-2 focus-visible:ring-primary/20 font-bold"
                        />
                    </div>
                    <Button onClick={() => setShowAdd(true)} className="h-12 px-8 rounded-2xl shadow-lg shadow-primary/20 font-black gap-2">
                        <Plus className="w-5 h-5" /> Upload New Scheme
                    </Button>
                </div>

                <Card className="border-0 shadow-soft bg-background/40 backdrop-blur-md rounded-[3rem] overflow-hidden border border-border/10">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent border-border/50">
                                <TableHead className="w-20 pl-8 py-6 text-[10px] font-black uppercase tracking-widest">Icon</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-widest">Subject</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-widest">Teacher</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-widest">Submitted On</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-widest">Status</TableHead>
                                <TableHead className="text-right pr-10 text-[10px] font-black uppercase tracking-widest">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={6} className="text-center py-20"><Loader2 className="w-10 h-10 animate-spin mx-auto text-primary/40" /></TableCell></TableRow>
                            ) : filtered.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-32 group">
                                        <BookOpen className="w-16 h-16 text-muted-foreground/10 mx-auto mb-4 group-hover:scale-110 transition-transform" />
                                        <p className="text-muted-foreground font-black text-[10px] uppercase tracking-widest">No schemes found</p>
                                    </TableCell>
                                </TableRow>
                            ) : filtered.map((s: any, idx: number) => (
                                <motion.tr
                                    key={s.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.03 }}
                                    className="group hover:bg-background/60 transition-colors border-border/50"
                                >
                                    <TableCell className="pl-8 py-6">
                                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-xs shadow-xl shadow-primary/5 group-hover:scale-110 transition-transform">
                                            {s.subject?.name?.[0]}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <h4 className="font-black text-sm">{s.subject?.name}</h4>
                                            <p className="text-[10px] font-mono font-bold text-muted-foreground uppercase">{s.subject?.code || "N/A"}</p>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-[10px] font-black uppercase">
                                                {s.teacher?.firstName?.[0]}{s.teacher?.lastName?.[0]}
                                            </div>
                                            <span className="text-xs font-bold">{s.teacher?.firstName} {s.teacher?.lastName}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-1.5 text-xs font-bold">
                                                <Calendar className="w-3.5 h-3.5 text-muted-foreground" /> {new Date(s.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                            </div>
                                            <span className="text-[9px] font-black uppercase text-muted-foreground mt-0.5 opacity-40">{s.term?.name || "Term"}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={`text-[9px] font-black uppercase h-5 border-none px-3 ${s.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-500' : s.status === 'REVIEW' ? 'bg-amber-500/10 text-amber-500' : 'bg-primary/10 text-primary'}`}>
                                            {s.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right pr-6">
                                        <Button variant="ghost" className="h-10 px-6 rounded-2xl font-black text-[10px] uppercase tracking-widest gap-2 bg-muted/40 hover:bg-primary hover:text-white transition-all">
                                            <Download className="w-3.5 h-3.5" /> Download
                                        </Button>
                                    </TableCell>
                                </motion.tr>
                            ))}
                        </TableBody>
                    </Table>
                </Card>
            </div>

            <Dialog open={showAdd} onOpenChange={setShowAdd}>
                <DialogContent className="max-w-xl rounded-[3rem] border-0 shadow-2xl p-0 overflow-hidden bg-background/95 backdrop-blur-xl">
                    <DialogHeader className="sr-only">
                        <DialogTitle>Add New Scheme of Work</DialogTitle>
                        <p>Upload a new scheme of work for the term.</p>
                    </DialogHeader>
                    <div className="h-2 bg-primary" />
                    <div className="p-10">
                        <div className="mb-8">
                            <h2 className="text-3xl font-black flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                                    <Plus className="w-6 h-6" />
                                </div>
                                New Scheme
                            </h2>
                            <p className="text-sm font-medium text-muted-foreground mt-2">Upload a new scheme of work for the term.</p>
                        </div>
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-[0.2em] ml-1">Subject *</Label>
                                <Select value={form.subjectId} onValueChange={v => setForm({ ...form, subjectId: v })}>
                                    <SelectTrigger className="h-12 rounded-2xl bg-muted/50 border-0 shadow-none font-bold"><SelectValue placeholder="Select Subject" /></SelectTrigger>
                                    <SelectContent className="rounded-2xl border-border/50 shadow-2xl">
                                        {subjects.map((s: any) => <SelectItem key={s.id} value={s.id} className="font-bold text-xs">{s.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-[0.2em] ml-1">Teacher *</Label>
                                <Select value={form.teacherId} onValueChange={v => setForm({ ...form, teacherId: v })}>
                                    <SelectTrigger className="h-12 rounded-2xl bg-muted/50 border-0 shadow-none font-bold"><SelectValue placeholder="Select Teacher" /></SelectTrigger>
                                    <SelectContent className="rounded-2xl border-border/50 shadow-2xl">
                                        {staff.filter((s: any) => s.isTeachingStaff).map((s: any) => <SelectItem key={s.id} value={s.id} className="font-bold text-xs">{s.firstName} {s.lastName}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-[0.2em] ml-1">File Link</Label>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors"><FileText className="w-4 h-4" /></div>
                                    <Input placeholder="Paste link to the document" value={form.fileUrl} onChange={e => setForm({ ...form, fileUrl: e.target.value })} className="h-12 pl-11 rounded-2xl bg-muted/50 border-0 focus-visible:ring-primary shadow-none font-bold" />
                                </div>
                            </div>

                            <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-indigo-600 shadow-sm">
                                    <Info className="w-5 h-5" />
                                </div>
                                <p className="text-[10px] font-bold text-indigo-600/80 leading-relaxed">
                                    Schemes of work need to be approved by the <span className="font-black">HOD</span> before they are finalized.
                                </p>
                            </div>
                        </div>
                        <DialogFooter className="mt-8 flex !flex-row gap-3">
                            <Button variant="outline" onClick={() => setShowAdd(false)} className="flex-1 h-12 rounded-2xl font-bold border-border/50">Cancel</Button>
                            <Button onClick={() => createMutation.mutate({ ...form, termId: "dummy-term" })} disabled={createMutation.isPending} className="flex-[2] h-12 rounded-2xl font-black shadow-lg shadow-primary/20 bg-primary">
                                {createMutation.isPending ? "Uploading..." : "Save Scheme"}
                            </Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
