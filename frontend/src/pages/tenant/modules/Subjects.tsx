import { useState } from "react";
import {
    Search, Plus, MoreVertical, Pencil, Trash2, BookOpen, Layers, Users, Hash,
    ChevronRight, Sparkles, GraduationCap, LayoutGrid, List, FileText, Bookmark, Star
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

const emptyForm = { name: "", code: "", category: "Core", description: "" };

export default function Subjects() {
    const [search, setSearch] = useState("");
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
    const [showAdd, setShowAdd] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [editId, setEditId] = useState<string | null>(null);
    const queryClient = useQueryClient();

    const { data: subjects = [], isLoading } = useQuery({
        queryKey: ["subjects"],
        queryFn: async () => { const r = await api.get("/subjects"); return r.data; },
    });

    const createMutation = useMutation({
        mutationFn: (data: typeof emptyForm) => api.post("/subjects", data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["subjects"] });
            setShowAdd(false); setForm(emptyForm);
            toast.success("Subject integrated into curriculum!");
        },
        onError: (err: any) => toast.error(err?.response?.data?.message || "Integration failed"),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => api.patch(`/subjects/${id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["subjects"] });
            setShowEdit(false); setEditId(null);
            toast.success("Curriculum node updated");
        },
        onError: (err: any) => toast.error(err?.response?.data?.message || "Revision failed"),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/subjects/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["subjects"] });
            toast.success("Subject archived");
        },
    });

    const filtered = subjects.filter((s: any) =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.code?.toLowerCase().includes(search.toLowerCase())
    );

    const openEdit = (s: any) => {
        setEditId(s.id);
        setForm({ name: s.name, code: s.code || "", category: s.category || "Core", description: s.description || "" });
        setShowEdit(true);
    };

    return (
        <>
            <AppHeader title="Subjects" subtitle="Curriculum architecture & subject mapping" />
            <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-muted/30">

                {/* Visual Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                        <Card className="border-0 shadow-soft bg-background/50 backdrop-blur-md overflow-hidden group">
                            <CardContent className="p-6 flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground group-hover:text-primary transition-colors">Catalog Density</p>
                                    <p className="text-3xl font-black mt-1">{isLoading ? "---" : subjects.length}</p>
                                </div>
                                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:scale-110 transition-transform">
                                    <BookOpen className="w-7 h-7 text-primary" />
                                </div>
                            </CardContent>
                            <div className="h-1.5 w-full bg-primary/20 group-hover:bg-primary transition-all duration-500" />
                        </Card>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
                        <Card className="border-0 shadow-soft bg-background/50 backdrop-blur-md overflow-hidden group">
                            <CardContent className="p-6 flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground group-hover:text-indigo-500 transition-colors">Core Nodes</p>
                                    <p className="text-3xl font-black mt-1">{subjects.filter((s: any) => s.category === 'Core').length}</p>
                                </div>
                                <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 group-hover:scale-110 transition-transform">
                                    <Layers className="w-7 h-7 text-indigo-500" />
                                </div>
                            </CardContent>
                            <div className="h-1.5 w-full bg-indigo-500/20 group-hover:bg-indigo-500 transition-all duration-500" />
                        </Card>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
                        <Card className="border-0 shadow-soft bg-background/50 backdrop-blur-md overflow-hidden group">
                            <CardContent className="p-6 flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground group-hover:text-amber-500 transition-colors">Mapping Rate</p>
                                    <p className="text-3xl font-black mt-1">
                                        {Math.round((subjects.filter((s: any) => s.assignments?.length > 0).length / Math.max(subjects.length, 1)) * 100)}%
                                    </p>
                                </div>
                                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 group-hover:scale-110 transition-transform">
                                    <GraduationCap className="w-7 h-7 text-amber-500" />
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
                                    <p className="text-3xl font-black mt-1">100%</p>
                                </div>
                                <div className="w-14 h-14 rounded-2xl bg-success/10 flex items-center justify-center border border-success/20 group-hover:scale-110 transition-transform">
                                    <Sparkles className="w-7 h-7 text-success" />
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
                                placeholder="Filter curriculum nodes..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="pl-11 h-12 bg-background/50 border-none rounded-2xl shadow-none focus-visible:ring-2 focus-visible:ring-primary/20"
                            />
                        </div>
                        <div className="hidden lg:flex bg-muted/60 p-1.5 rounded-2xl border border-border/50 backdrop-blur-sm">
                            <Button variant={viewMode === "grid" ? "secondary" : "ghost"} size="icon" className="h-9 w-9 rounded-xl shadow-none" onClick={() => setViewMode("grid")}><LayoutGrid className="w-4 h-4" /></Button>
                            <Button variant={viewMode === "list" ? "secondary" : "ghost"} size="icon" className="h-9 w-9 rounded-xl shadow-none" onClick={() => setViewMode("list")}><List className="w-4 h-4" /></Button>
                        </div>
                    </div>

                    <Button onClick={() => { setForm(emptyForm); setShowAdd(true); }} className="h-12 px-8 rounded-2xl shadow-lg shadow-primary/20 font-black gap-2 w-full xl:w-auto">
                        <Plus className="w-5 h-5" /> Integrate New Subject
                    </Button>
                </div>

                {/* Content Grid */}
                <AnimatePresence mode="wait">
                    {isLoading ? (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-40 gap-4">
                            <div className="w-12 h-12 border-4 border-primary/10 border-t-primary rounded-full animate-spin" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center">Indexing Curriculum Matrix...</p>
                        </motion.div>
                    ) : filtered.length === 0 ? (
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-40 bg-background/20 rounded-[4rem] border-2 border-dashed border-border/50">
                            <BookOpen className="w-20 h-20 text-muted-foreground/20 mx-auto mb-6" />
                            <h3 className="text-2xl font-black mb-2">Curriculum Void</h3>
                            <p className="text-muted-foreground text-sm max-w-sm mx-auto">No subjects discovered in this sector. Establish a new core node to begin curriculum mapping.</p>
                        </motion.div>
                    ) : viewMode === "grid" ? (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {filtered.map((s: any, idx: number) => (
                                <motion.div
                                    initial={{ opacity: 0, y: 30 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    key={s.id}
                                    className="group h-full"
                                >
                                    <Card className="border-0 shadow-soft bg-background/60 backdrop-blur-md group-hover:bg-background transition-all duration-500 rounded-[2.5rem] overflow-hidden cursor-pointer h-full flex flex-col pt-8" onClick={() => openEdit(s)}>
                                        <div className="flex-1 px-8 pb-8">
                                            <div className="flex items-start justify-between mb-8">
                                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-xl group-hover:scale-110 transition-transform duration-500 shadow-xl ${s.category === 'Science' ? 'bg-gradient-to-br from-indigo-500 to-primary shadow-primary/20' : s.category === 'Languages' ? 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/20' : 'bg-gradient-to-br from-slate-600 to-slate-800 shadow-slate-500/20'}`}>
                                                    {s.name[0]}
                                                </div>
                                                <div className="flex flex-col items-end gap-2">
                                                    <Badge variant="outline" className="font-mono text-[9px] font-black h-6 border-border/50 uppercase tracking-tighter bg-white/50">{s.code || "N/A"}</Badge>
                                                    <Badge className="text-[8px] font-black uppercase h-5 bg-primary/10 text-primary border-none">{s.category}</Badge>
                                                </div>
                                            </div>

                                            <h3 className="font-black text-2xl mb-2 group-hover:text-primary transition-colors leading-tight">{s.name}</h3>
                                            <p className="text-xs font-medium text-muted-foreground line-clamp-2 h-10 mb-8">{s.description || "Experimental curriculum module for high-fidelity evaluation."}</p>

                                            <div className="space-y-4 pt-8 border-t border-dashed border-border/50">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2"><Users className="w-3.5 h-3.5" /> Assigned Units</span>
                                                    <div className="flex -space-x-2.5">
                                                        {s.assignments?.length > 0 ? (
                                                            s.assignments.slice(0, 3).map((a: any) => (
                                                                <div key={a.id} className="w-8 h-8 rounded-xl border-2 border-background bg-muted flex items-center justify-center text-[10px] font-black uppercase shadow-sm" title={`${a.staff.firstName} ${a.staff.lastName}`}>
                                                                    {a.staff.firstName[0]}{a.staff.lastName[0]}
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <Badge variant="outline" className="text-[9px] font-black h-6 opacity-40">EMPTY</Badge>
                                                        )}
                                                        {s.assignments?.length > 3 && (
                                                            <div className="w-8 h-8 rounded-xl border-2 border-background bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-black shadow-sm">
                                                                +{s.assignments.length - 3}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="px-3 pb-3">
                                            <Button variant="ghost" className="h-12 bg-muted/30 hover:bg-primary hover:text-primary-foreground rounded-[1.5rem] w-full text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2">
                                                Modify Specification <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                            </Button>
                                        </div>
                                    </Card>
                                </motion.div>
                            ))}
                        </motion.div>
                    ) : (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-background/40 backdrop-blur-md rounded-[2.5rem] border border-border/50 overflow-hidden shadow-soft">
                            <Table>
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent border-border/50">
                                        <TableHead className="w-20 pl-8 py-6 text-[10px] font-black uppercase tracking-widest">Mark</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase tracking-widest">Subject Definition</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase tracking-widest">Classification</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase tracking-widest">Resource Mapping</TableHead>
                                        <TableHead className="text-right text-[10px] font-black uppercase tracking-widest pr-10">Meta Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filtered.map((s: any) => (
                                        <TableRow key={s.id} className="group hover:bg-background/60 transition-colors border-border/50">
                                            <TableCell className="pl-8 py-6">
                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-sm shadow-xl ${s.category === 'Science' ? 'bg-primary' : 'bg-slate-400'}`}>
                                                    {s.code?.[0] || s.name[0]}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <h4 className="font-black text-sm">{s.name}</h4>
                                                    <p className="text-[10px] font-mono font-bold text-muted-foreground uppercase">{s.code || "NO_CODE"}</p>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={`text-[9px] font-black uppercase h-6 px-3 tracking-tighter border-none ${s.category === 'Core' ? 'bg-primary/10 text-primary' : 'bg-amber-500/10 text-amber-500'}`}>
                                                    {s.category}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex -space-x-2">
                                                    {s.assignments?.length > 0 ? (
                                                        s.assignments.slice(0, 4).map((a: any) => (
                                                            <div key={a.id} className="w-8 h-8 rounded-lg border-2 border-background bg-muted flex items-center justify-center text-[9px] font-black uppercase" title={`${a.staff.firstName} ${a.staff.lastName}`}>
                                                                {a.staff.firstName[0]}{a.staff.lastName[0]}
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <span className="text-[10px] font-black text-muted-foreground italic opacity-30">UNMAPPED</span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right pr-6">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-muted group-hover:scale-110 transition-transform"><MoreVertical className="w-4 h-4" /></Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="rounded-2xl border-border/50 shadow-2xl p-1">
                                                        <DropdownMenuItem onClick={() => openEdit(s)} className="rounded-xl font-bold py-2.5"><Pencil className="w-4 h-4 mr-3" /> Update Spec</DropdownMenuItem>
                                                        <DropdownMenuItem className="text-destructive rounded-xl font-bold py-2.5" onClick={() => deleteMutation.mutate(s.id)}><Trash2 className="w-4 h-4 mr-3" /> Decommission</DropdownMenuItem>
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

            {/* Premium Dialogs */}
            <Dialog open={showAdd || showEdit} onOpenChange={(open) => { if (!open) { setShowAdd(false); setShowEdit(false); setEditId(null); setForm(emptyForm); } }}>
                <DialogContent className="max-w-xl rounded-[3rem] border-0 shadow-2xl p-0 overflow-hidden bg-background/95 backdrop-blur-xl">
                    <div className="h-2 bg-primary" />
                    <div className="p-10">
                        <DialogHeader className="mb-8">
                            <DialogTitle className="text-3xl font-black flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                                    <Sparkles className="w-6 h-6" />
                                </div>
                                {showEdit ? "Calibrate Subject" : "Node Integration"}
                            </DialogTitle>
                            <DialogDescription className="text-sm font-medium">Define a curriculum node for system-wide educational tracking.</DialogDescription>
                        </DialogHeader>

                        <form onSubmit={e => {
                            e.preventDefault();
                            showEdit ? updateMutation.mutate({ id: editId!, data: form }) : createMutation.mutate(form);
                        }} className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2 col-span-2">
                                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] ml-1">Subject Nomenclature *</Label>
                                    <Input placeholder="e.g. Advanced Quantum Mechanics" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required className="h-12 rounded-2xl bg-muted/50 border-0 focus-visible:ring-primary shadow-none font-bold" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] ml-1">System Code</Label>
                                    <Input placeholder="MAT-101" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} className="h-12 rounded-2xl bg-muted/50 border-0 focus-visible:ring-primary shadow-none font-mono font-bold" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] ml-1">Curriculum Class</Label>
                                    <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                                        <SelectTrigger className="h-12 rounded-2xl bg-muted/50 border-0 shadow-none font-bold">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-2xl border-border/50 shadow-2xl">
                                            <SelectItem value="Core" className="font-bold">Category: Core</SelectItem>
                                            <SelectItem value="Elective" className="font-bold">Category: Elective</SelectItem>
                                            <SelectItem value="Science" className="font-bold">Category: Science</SelectItem>
                                            <SelectItem value="Languages" className="font-bold">Category: Languages</SelectItem>
                                            <SelectItem value="Humanities" className="font-bold">Category: Humanities</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-[0.2em] ml-1">Module Abstract</Label>
                                <textarea
                                    className="w-full min-h-[100px] rounded-2xl bg-muted/50 border-0 focus-visible:ring-primary shadow-none resize-none p-4 text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none"
                                    placeholder="Brief overview of curriculum scope..."
                                    value={form.description}
                                    onChange={e => setForm({ ...form, description: e.target.value })}
                                />
                            </div>

                            <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-indigo-600 shadow-sm">
                                    <Star className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase text-indigo-900 tracking-tight">Assignment Dependency</p>
                                    <p className="text-[9px] font-medium text-indigo-400">Subjects require at least one assigned Academic Unit for examination scheduling.</p>
                                </div>
                            </div>

                            <DialogFooter className="mt-6 flex !flex-row gap-3 pt-4">
                                <Button type="button" variant="outline" onClick={() => { setShowAdd(false); setShowEdit(false); }} className="flex-1 h-12 rounded-2xl font-bold border-border/50">Abort Ingress</Button>
                                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="flex-[2] h-12 rounded-2xl font-black shadow-lg shadow-primary/20 bg-primary">
                                    {showEdit ? (updateMutation.isPending ? "Syncing..." : "Re-Calibrate Node") : (createMutation.isPending ? "Establishing..." : "Launch Integration")}
                                </Button>
                            </DialogFooter>
                        </form>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
