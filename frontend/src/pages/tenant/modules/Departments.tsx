import { useState } from "react";
import {
    Search, Plus, MoreVertical, Pencil, Trash2, Briefcase, Users, User, Info,
    ChevronRight, Sparkles, LayoutGrid, List, Layers, ShieldCheck, Activity
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
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const emptyForm = { name: "", description: "", headId: "" };

export default function Departments() {
    const [search, setSearch] = useState("");
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
    const [showAdd, setShowAdd] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [editId, setEditId] = useState<string | null>(null);
    const queryClient = useQueryClient();

    const { data: departments = [], isLoading } = useQuery({
        queryKey: ["staff-departments"],
        queryFn: async () => { const r = await api.get("/staff-departments"); return r.data; },
    });

    const { data: staff = [] } = useQuery({
        queryKey: ["staff"],
        queryFn: async () => { const r = await api.get("/staff"); return r.data; },
    });

    const createMutation = useMutation({
        mutationFn: (data: any) => api.post("/staff-departments", data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["staff-departments"] });
            setShowAdd(false); setForm(emptyForm);
            toast.success("Structural unit established!");
        },
        onError: (err: any) => toast.error(err?.response?.data?.message || "Failed to establish unit"),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => api.patch(`/staff-departments/${id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["staff-departments"] });
            setShowEdit(false); setEditId(null);
            toast.success("Unit parameters updated");
        },
        onError: (err: any) => toast.error(err?.response?.data?.message || "Update failed"),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/staff-departments/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["staff-departments"] });
            toast.success("Unit decommissioned");
        },
    });

    const filtered = departments.filter((d: any) =>
        d.name.toLowerCase().includes(search.toLowerCase())
    );

    const openEdit = (d: any) => {
        setEditId(d.id);
        setForm({
            name: d.name,
            description: d.description || "",
            headId: d.headId || "none"
        });
        setShowEdit(true);
    };

    return (
        <>
            <AppHeader title="Staff Departments" subtitle="Structural hierarchy & organizational units" />
            <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-muted/30">

                {/* Stats Matrix */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                        <Card className="border-0 shadow-soft bg-background/50 backdrop-blur-md overflow-hidden group">
                            <CardContent className="p-6 flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground group-hover:text-primary transition-colors">Active Divisions</p>
                                    <p className="text-3xl font-black mt-1">{isLoading ? "---" : departments.length}</p>
                                </div>
                                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:scale-110 transition-transform">
                                    <Layers className="w-7 h-7 text-primary" />
                                </div>
                            </CardContent>
                            <div className="h-1 bg-primary/20 group-hover:bg-primary transition-all duration-500" />
                        </Card>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
                        <Card className="border-0 shadow-soft bg-background/50 backdrop-blur-md overflow-hidden group">
                            <CardContent className="p-6 flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground group-hover:text-indigo-500 transition-colors">Staff Coverage</p>
                                    <p className="text-3xl font-black mt-1">
                                        {departments.reduce((acc: number, d: any) => acc + (d._count?.staff || 0), 0)}
                                    </p>
                                </div>
                                <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 group-hover:scale-110 transition-transform">
                                    <Users className="w-7 h-7 text-indigo-500" />
                                </div>
                            </CardContent>
                            <div className="h-1 bg-indigo-500/20 group-hover:bg-indigo-500 transition-all duration-500" />
                        </Card>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
                        <Card className="border-0 shadow-soft bg-background/50 backdrop-blur-md overflow-hidden group">
                            <CardContent className="p-6 flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground group-hover:text-amber-500 transition-colors">Integrity</p>
                                    <p className="text-3xl font-black mt-1">94%</p>
                                </div>
                                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 group-hover:scale-110 transition-transform">
                                    <Activity className="w-7 h-7 text-amber-500" />
                                </div>
                            </CardContent>
                            <div className="h-1 bg-amber-500/20 group-hover:bg-amber-500 transition-all duration-500" />
                        </Card>
                    </motion.div>
                </div>

                {/* Toolbar */}
                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-background/40 p-4 rounded-[2rem] border border-border/50 backdrop-blur-md shadow-sm">
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className="relative w-full sm:w-80">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input placeholder="Filter divisions..." value={search} onChange={e => setSearch(e.target.value)} className="pl-11 h-12 bg-background/50 border-none rounded-2xl shadow-none focus-visible:ring-2 focus-visible:ring-primary/20" />
                        </div>
                        <div className="hidden lg:flex bg-muted/60 p-1.5 rounded-2xl border border-border/50 backdrop-blur-sm">
                            <Button variant={viewMode === "grid" ? "secondary" : "ghost"} size="icon" className="h-9 w-9 rounded-xl shadow-none" onClick={() => setViewMode("grid")}><LayoutGrid className="w-4 h-4" /></Button>
                            <Button variant={viewMode === "list" ? "secondary" : "ghost"} size="icon" className="h-9 w-9 rounded-xl shadow-none" onClick={() => setViewMode("list")}><List className="w-4 h-4" /></Button>
                        </div>
                    </div>
                    <Button onClick={() => { setForm(emptyForm); setShowAdd(true); }} className="h-12 px-8 rounded-2xl shadow-lg shadow-primary/20 font-black gap-2 w-full sm:w-auto">
                        <Plus className="w-5 h-5" /> Construct Department
                    </Button>
                </div>

                {/* Content Grid */}
                <AnimatePresence mode="wait">
                    {isLoading ? (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-40 gap-4">
                            <div className="w-12 h-12 border-4 border-primary/10 border-t-primary rounded-full animate-spin" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Mapping Structural Nodes...</p>
                        </motion.div>
                    ) : filtered.length === 0 ? (
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-40 bg-background/20 rounded-[4rem] border-2 border-dashed border-border/50">
                            <Briefcase className="w-20 h-20 text-muted-foreground/20 mx-auto mb-6" />
                            <h3 className="text-2xl font-black mb-2">No Structural Units</h3>
                            <p className="text-muted-foreground text-sm max-w-sm mx-auto">Define functional divisions to begin organizing your school's workforce.</p>
                        </motion.div>
                    ) : viewMode === "grid" ? (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {filtered.map((d: any, idx: number) => (
                                <motion.div
                                    initial={{ opacity: 0, y: 30 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    key={d.id}
                                    className="group"
                                >
                                    <Card className="border-0 shadow-soft bg-background/60 backdrop-blur-md group-hover:bg-background transition-all duration-500 rounded-[2.5rem] overflow-hidden flex flex-col pt-6">
                                        <div className="flex-1 px-6 pb-6">
                                            <div className="flex items-center justify-between mb-6">
                                                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                                    <Briefcase className="w-6 h-6" />
                                                </div>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl opacity-20 group-hover:opacity-100 transition-opacity">
                                                            <MoreVertical className="w-4 h-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="rounded-2xl border-border/50 shadow-2xl p-1">
                                                        <DropdownMenuItem onClick={() => openEdit(d)} className="rounded-xl font-bold py-2.5"><Pencil className="w-3.5 h-3.5 mr-3" /> Edit Unit</DropdownMenuItem>
                                                        <DropdownMenuItem className="text-destructive rounded-xl font-bold py-2.5" onClick={() => deleteMutation.mutate(d.id)}><Trash2 className="w-3.5 h-3.5 mr-3" /> Decommission</DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                            <h3 className="font-black text-xl mb-1 group-hover:text-primary transition-colors">{d.name}</h3>
                                            <p className="text-xs text-muted-foreground font-medium line-clamp-2 h-8 mb-6">{d.description || "No operational parameters defined."}</p>

                                            <div className="space-y-3 pt-6 border-t border-dashed border-border/50">
                                                <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/40 group-hover:bg-primary/5 transition-colors">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                                        <Users className="w-3 h-3" /> Staff Node Count
                                                    </span>
                                                    <Badge variant="secondary" className="font-black text-[10px] bg-white text-primary border-none h-6 px-3">{d._count?.staff || 0}</Badge>
                                                </div>
                                                <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/40">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                                        <User className="w-3 h-3" /> Unit Lead
                                                    </span>
                                                    <span className="text-xs font-bold truncate max-w-[140px]">
                                                        {d.head ? `${d.head.firstName} ${d.head.lastName}` : "UNASSIGNED"}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <Button variant="ghost" className="h-12 border-t border-border/50 rounded-none w-full text-[10px] font-black uppercase tracking-[0.2em] group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                                            Inspect Metrics <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                        </Button>
                                    </Card>
                                </motion.div>
                            ))}
                        </motion.div>
                    ) : (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-background/40 backdrop-blur-md rounded-[2.5rem] border border-border/50 overflow-hidden shadow-soft">
                            <Table>
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent border-border/50">
                                        <TableHead className="w-20 pl-8 py-6 text-[10px] font-black uppercase tracking-widest">Icon</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase tracking-widest">Unit Specification</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase tracking-widest">Leadership Context</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-center">Entity Density</TableHead>
                                        <TableHead className="text-right text-[10px] font-black uppercase tracking-widest pr-10">Meta Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filtered.map((d: any) => (
                                        <TableRow key={d.id} className="group hover:bg-background/60 transition-colors border-border/50">
                                            <TableCell className="pl-8 py-6">
                                                <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                                    <Briefcase className="w-5 h-5" />
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <h4 className="font-black text-sm">{d.name}</h4>
                                                    <p className="text-[10px] font-medium text-muted-foreground line-clamp-1 max-w-sm">{d.description || "—"}</p>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-[10px] font-black text-muted-foreground uppercase">
                                                        {d.head ? `${d.head.firstName[0]}${d.head.lastName[0]}` : "?"}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-bold">{d.head ? `${d.head.firstName} ${d.head.lastName}` : "Vacant Position"}</span>
                                                        {d.head && <span className="text-[9px] font-black uppercase text-indigo-500 tracking-tighter">Certified Lead</span>}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant="outline" className="font-black text-[10px] h-6 px-4 rounded-full border-border/50 bg-background/50">
                                                    {d._count?.staff || 0} Entities
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right pr-6">
                                                <div className="flex justify-end gap-1 opacity-20 group-hover:opacity-100 transition-opacity">
                                                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-primary/10 hover:text-primary transition-all" onClick={() => openEdit(d)}><Pencil className="w-4 h-4" /></Button>
                                                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-destructive/10 hover:text-destructive transition-all" onClick={() => deleteMutation.mutate(d.id)}><Trash2 className="w-4 h-4" /></Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Premium Construct Dialog */}
            <Dialog open={showAdd || showEdit} onOpenChange={(open) => { if (!open) { setShowAdd(false); setShowEdit(false); setEditId(null); setForm(emptyForm); } }}>
                <DialogContent className="max-w-xl rounded-[3rem] border-0 shadow-2xl p-0 overflow-hidden bg-background/95 backdrop-blur-xl">
                    <div className="h-2 bg-primary" />
                    <div className="p-10">
                        <DialogHeader className="mb-8">
                            <DialogTitle className="text-3xl font-black flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                                    <Sparkles className="w-6 h-6" />
                                </div>
                                {showEdit ? "Calibrate Unit" : "Construct Unit"}
                            </DialogTitle>
                            <DialogDescription className="text-sm font-medium">Establish a structural division within the school's human capital matrix.</DialogDescription>
                        </DialogHeader>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-[0.2em] ml-1">Department Nomenclature *</Label>
                                <Input placeholder="e.g. Theoretical Sciences Segment" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="h-12 rounded-2xl bg-muted/50 border-0 focus-visible:ring-primary shadow-none font-bold" />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-[0.2em] ml-1">Operational Overview</Label>
                                <Textarea placeholder="Define unit responsibilities and scope..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="min-h-[100px] rounded-2xl bg-muted/50 border-0 focus-visible:ring-primary shadow-none resize-none p-4" />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-[0.2em] ml-1">Unit Command (HOD)</Label>
                                <Select value={form.headId} onValueChange={v => setForm({ ...form, headId: v })}>
                                    <SelectTrigger className="h-12 rounded-2xl bg-muted/50 border-0 shadow-none">
                                        <SelectValue placeholder="Appoint staff member" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-2xl border-border/50 shadow-2xl">
                                        <SelectItem value="none" className="font-bold">System Managed (No Lead)</SelectItem>
                                        {staff.map((s: any) => (
                                            <SelectItem key={s.id} value={s.id} className="font-bold">{s.firstName} {s.lastName} <span className="text-[9px] opacity-50 ml-1">({s.staffNumber})</span></SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-50">
                                    <ShieldCheck className="w-5 h-5" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[10px] font-black uppercase text-indigo-900 tracking-tight">Access Control</p>
                                    <p className="text-[9px] font-medium text-indigo-400">Heads of Department receive elevated dashboard analytical capabilities.</p>
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="mt-10 flex !flex-row gap-3">
                            <Button variant="outline" onClick={() => { setShowAdd(false); setShowEdit(false); }} className="flex-1 h-12 rounded-2xl font-bold border-border/50">Abort Construction</Button>
                            <Button
                                className="flex-[2] h-12 rounded-2xl font-black shadow-lg shadow-primary/20"
                                onClick={() => {
                                    const data = { ...form, headId: form.headId === "none" ? null : form.headId };
                                    showEdit ? updateMutation.mutate({ id: editId!, data }) : createMutation.mutate(data);
                                }}
                                disabled={createMutation.isPending || updateMutation.isPending}
                            >
                                {showEdit ? "Update Parameters" : "Establish Structure"}
                            </Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
