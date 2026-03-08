import { useState } from "react";
import {
    Search, Plus, MoreVertical, Pencil, Trash2, GraduationCap, Users, BookOpen, School, User,
    ArrowRight, LayoutGrid, List, Filter, Info, UserCheck, UserX, ChevronRight, X
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
import {
    Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription
} from "@/components/ui/sheet";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function Classes() {
    const [search, setSearch] = useState("");
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
    const [showAdd, setShowAdd] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [className, setClassName] = useState("");
    const [newClassName, setNewClassName] = useState("");
    const [teacherId, setTeacherId] = useState("");
    const [editId, setEditId] = useState<string | null>(null);
    const [editName, setEditName] = useState("");
    const [editTeacherId, setEditTeacherId] = useState("");

    // For student list view
    const [selectedClass, setSelectedClass] = useState<any>(null);
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    const queryClient = useQueryClient();

    const { data: classStreams = [], isLoading } = useQuery({
        queryKey: ["classes"],
        queryFn: async () => { const r = await api.get("/academics/classes"); return r.data; },
    });

    const { data: staff = [] } = useQuery({
        queryKey: ["staff"],
        queryFn: async () => { const r = await api.get("/staff"); return r.data; },
    });

    // Fetch students only when a class is selected
    const { data: classStudents = [], isLoading: loadingStudents } = useQuery({
        queryKey: ["class-students", selectedClass?.id],
        queryFn: async () => {
            const r = await api.get(`/students?streamId=${selectedClass.id}`);
            return r.data;
        },
        enabled: !!selectedClass,
    });

    const teachers = staff.filter((s: any) => s.isTeachingStaff);

    const createMutation = useMutation({
        mutationFn: (data: any) => api.post("/academics/classes", data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["classes"] });
            setShowAdd(false); setClassName(""); setNewClassName(""); setTeacherId("");
            toast.success("Class created successfully!");
        },
        onError: (err: any) => toast.error(err?.response?.data?.message || "Failed to create class"),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => api.put(`/academics/classes/${id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["class-streams"] });
            queryClient.invalidateQueries({ queryKey: ["students"] });
            setShowEdit(false); setEditName(""); setEditTeacherId("");
            toast.success("Class updated");
        },
        onError: (err: any) => toast.error(err?.response?.data?.message || "Failed to update"),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/academics/classes/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["class-streams"] });
            queryClient.invalidateQueries({ queryKey: ["students"] });
            toast.success("Class deleted");
        },
        onError: (err: any) => toast.error(err?.response?.data?.message || "Failed to delete class"),
    });

    const filtered = classStreams.filter((cs: any) => {
        const name = `${cs.levelName} ${cs.streamName}`.toLowerCase();
        return name.includes(search.toLowerCase());
    });

    const totalStudents = classStreams.reduce((acc: number, cs: any) => acc + (cs._count?.students || 0), 0);

    const openEdit = (cs: any) => {
        setEditId(cs.id);
        setEditName(`${cs.levelName} ${cs.streamName}`);
        setEditTeacherId(cs.classTeacherId || "none");
        setShowEdit(true);
    };

    const viewStudents = (cs: any) => {
        setSelectedClass(cs);
        setIsSheetOpen(true);
    };

    return (
        <>
            <AppHeader title="Classes & Streams" subtitle="Manage class groups and academic streams" />
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-muted/30">
                {/* Stats Section with Glassmorphism */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                        <Card className="border-0 shadow-sm bg-background/50 backdrop-blur-sm overflow-hidden group">
                            <CardContent className="p-5 flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground group-hover:text-primary transition-colors">Total Classes</p>
                                    <p className="text-3xl font-black">{isLoading ? "---" : classStreams.length}</p>
                                </div>
                                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <School className="w-6 h-6 text-primary" />
                                </div>
                            </CardContent>
                            <div className="h-1 w-full bg-primary/20 group-hover:bg-primary transition-all" />
                        </Card>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                        <Card className="border-0 shadow-sm bg-background/50 backdrop-blur-sm overflow-hidden group">
                            <CardContent className="p-5 flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground group-hover:text-success transition-colors">Total Students</p>
                                    <p className="text-3xl font-black">{totalStudents}</p>
                                </div>
                                <div className="w-12 h-12 rounded-2xl bg-success/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Users className="w-6 h-6 text-success" />
                                </div>
                            </CardContent>
                            <div className="h-1 w-full bg-success/20 group-hover:bg-success transition-all" />
                        </Card>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                        <Card className="border-0 shadow-sm bg-background/50 backdrop-blur-sm overflow-hidden group">
                            <CardContent className="p-5 flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground group-hover:text-amber-500 transition-colors">Avg Class Size</p>
                                    <p className="text-3xl font-black">{classStreams.length > 0 ? (totalStudents / classStreams.length).toFixed(1) : 0}</p>
                                </div>
                                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <ArrowRight className="w-6 h-6 text-amber-500" />
                                </div>
                            </CardContent>
                            <div className="h-1 w-full bg-amber-500/20 group-hover:bg-amber-500 transition-all" />
                        </Card>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                        <Card className="border-0 shadow-sm bg-background/50 backdrop-blur-sm overflow-hidden group">
                            <CardContent className="p-5 flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground group-hover:text-indigo-500 transition-colors">Staff Assigned</p>
                                    <p className="text-3xl font-black">{classStreams.filter((cs: any) => cs.classTeacherId).length}</p>
                                </div>
                                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <UserCheck className="w-6 h-6 text-indigo-500" />
                                </div>
                            </CardContent>
                            <div className="h-1 w-full bg-indigo-500/20 group-hover:bg-indigo-500 transition-all" />
                        </Card>
                    </motion.div>
                </div>

                {/* Toolbar */}
                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-background/40 p-4 rounded-2xl border border-border/50 backdrop-blur-md">
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className="relative flex-1 sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Filter classes..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="pl-9 bg-background/50 border-none h-10 shadow-none focus-visible:ring-1"
                            />
                        </div>
                        <div className="flex bg-muted/50 p-1 rounded-lg">
                            <Button
                                variant={viewMode === "grid" ? "secondary" : "ghost"}
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setViewMode("grid")}
                            >
                                <LayoutGrid className="w-4 h-4" />
                            </Button>
                            <Button
                                variant={viewMode === "list" ? "secondary" : "ghost"}
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setViewMode("list")}
                            >
                                <List className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Button variant="outline" className="h-10 bg-background/50">
                            <Filter className="w-4 h-4 mr-2" /> Filters
                        </Button>
                        <Button onClick={() => { setClassName(""); setTeacherId(""); setShowAdd(true); }} className="h-10 shadow-lg shadow-primary/20">
                            <Plus className="w-4 h-4 mr-2" /> New Class
                        </Button>
                    </div>
                </div>

                {/* Main Content Area */}
                <AnimatePresence mode="wait">
                    {isLoading ? (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-20 gap-4">
                            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                            <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Loading Records...</p>
                        </motion.div>
                    ) : filtered.length === 0 ? (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20 bg-background/40 rounded-3xl border-2 border-dashed border-border/50">
                            <School className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                            <h3 className="text-lg font-bold mb-1">No Classes Found</h3>
                            <p className="text-muted-foreground text-sm max-w-[250px] mx-auto">Try adjusting your filters or create a new class to get started.</p>
                        </motion.div>
                    ) : viewMode === "grid" ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                        >
                            {filtered.map((cs: any) => (
                                <motion.div key={cs.id} layout>
                                    <Card className="border-0 shadow-soft bg-background/60 backdrop-blur-md group hover:bg-background transition-all duration-300 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-2">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-all">
                                                        <MoreVertical className="w-4 h-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-48">
                                                    <DropdownMenuItem onClick={() => openEdit(cs)}>
                                                        <Pencil className="w-4 h-4 mr-2" /> Update Details
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => viewStudents(cs)}>
                                                        <Users className="w-4 h-4 mr-2" /> Manage Students
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem className="text-destructive" onClick={() => deleteMutation.mutate(cs.id)}>
                                                        <Trash2 className="w-4 h-4 mr-2" /> Remove Class
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>

                                        <CardContent className="p-6">
                                            <div className="flex items-center gap-4 mb-5">
                                                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 font-black text-xl">
                                                    {cs.levelName.substring(0, 1)}
                                                </div>
                                                <div>
                                                    <h3 className="font-black text-lg leading-none">{cs.levelName} {cs.streamName}</h3>
                                                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-tighter mt-1 flex items-center gap-1">
                                                        <Users className="w-2.5 h-2.5" />
                                                        {cs._count?.students || 0} Students Enrolled
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="space-y-2.5">
                                                <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                                                            <User className="w-3 h-3 text-primary" />
                                                        </div>
                                                        <span className="text-[11px] font-bold text-foreground/80 lowercase">Teacher</span>
                                                    </div>
                                                    <span className="text-[11px] font-black truncate max-w-[100px]">
                                                        {cs.classTeacher ? `${cs.classTeacher.firstName} ${cs.classTeacher.lastName}` : "TBD"}
                                                    </span>
                                                </div>

                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="flex flex-col p-2.5 rounded-xl bg-primary/5 border border-primary/10">
                                                        <span className="text-[8px] uppercase font-black text-primary/60 tracking-tighter">Attendance</span>
                                                        <span className="text-sm font-black">94%</span>
                                                    </div>
                                                    <div className="flex flex-col p-2.5 rounded-xl bg-success/5 border border-success/10">
                                                        <span className="text-[8px] uppercase font-black text-success/60 tracking-tighter">Efficiency</span>
                                                        <span className="text-sm font-black">High</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <Button
                                                variant="secondary"
                                                className="w-full mt-5 h-9 text-[11px] font-bold uppercase tracking-widest gap-2 bg-background group-hover:bg-primary group-hover:text-primary-foreground transition-all border border-border/50 group-hover:border-primary"
                                                onClick={() => viewStudents(cs)}
                                            >
                                                View Students <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                                            </Button>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            ))}
                        </motion.div>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="bg-background/40 backdrop-blur-md rounded-3xl border border-border/50 overflow-hidden"
                        >
                            <Table>
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent border-border/50">
                                        <TableHead className="w-12"></TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase tracking-widest py-4">Class Name</TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase tracking-widest">Class Teacher</TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase tracking-widest">Students</TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase tracking-widest">Performance</TableHead>
                                        <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest pr-6">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filtered.map((cs: any) => (
                                        <TableRow key={cs.id} className="group hover:bg-background/60 transition-colors border-border/50">
                                            <TableCell className="pl-6">
                                                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                    <BookOpen className="w-4 h-4 text-primary" />
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-black text-sm">{cs.levelName} {cs.streamName}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline" className="font-bold lowercase bg-muted/50 border-none px-2 py-0.5">
                                                        {cs.classTeacher ? `${cs.classTeacher.firstName} ${cs.classTeacher.lastName}` : "Unassigned"}
                                                    </Badge>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold">{cs._count?.students || 0}</span>
                                                    <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden hidden sm:block">
                                                        <div className="h-full bg-primary" style={{ width: `${Math.min((cs._count?.students / 40) * 100, 100)}%` }} />
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className="bg-success/10 text-success border-success/20 font-bold text-[10px]">Exemplary</Badge>
                                            </TableCell>
                                            <TableCell className="text-right pr-6">
                                                <div className="flex justify-end gap-1">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => viewStudents(cs)}>
                                                        <Info className="w-4 h-4 text-muted-foreground" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => openEdit(cs)}>
                                                        <Pencil className="w-4 h-4 text-muted-foreground" />
                                                    </Button>
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

            {/* Student List Sheet (Cool Interaction) */}
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetContent className="sm:max-w-xl w-[90vw] p-0 border-l-0 bg-background/95 backdrop-blur-xl">
                    <div className="h-full flex flex-col">
                        <div className="p-6 bg-primary/5 border-b border-primary/10">
                            <SheetHeader className="text-left space-y-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-black text-lg">
                                        {selectedClass?.levelName.substring(0, 1)}
                                    </div>
                                    <div>
                                        <SheetTitle className="text-2xl font-black">{selectedClass?.levelName} {selectedClass?.streamName}</SheetTitle>
                                        <SheetDescription className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                                            Roll List <ChevronRight className="w-3 h-3" /> {classStudents.length} Students
                                        </SheetDescription>
                                    </div>
                                </div>
                            </SheetHeader>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            {loadingStudents ? (
                                <div className="py-20 text-center space-y-3">
                                    <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Pulling Student Records...</p>
                                </div>
                            ) : classStudents.length === 0 ? (
                                <div className="py-20 text-center opacity-40">
                                    <UserX className="w-12 h-12 mx-auto mb-2" />
                                    <p className="text-sm font-bold">No students found in this stream</p>
                                </div>
                            ) : (
                                classStudents.map((student: any, idx: number) => (
                                    <motion.div
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        key={student.id}
                                        className="flex items-center justify-between p-3 rounded-2xl bg-muted/30 hover:bg-muted/60 transition-colors border border-transparent hover:border-border/50 group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-background flex items-center justify-center font-bold text-xs text-muted-foreground group-hover:text-primary transition-colors">
                                                {idx + 1}
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm leading-none">{student.firstName} {student.lastName}</p>
                                                <p className="text-[10px] font-mono text-muted-foreground mt-1 uppercase tracking-tighter">{student.admissionNumber}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right hidden sm:block">
                                                <p className="text-[10px] font-bold uppercase">{student.gender || "---"}</p>
                                                <p className="text-[9px] text-muted-foreground">Status: Active</p>
                                            </div>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                                                <ChevronRight className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </div>

                        <div className="p-4 bg-muted/20 border-t border-border/50 flex gap-2">
                            <Button variant="outline" className="flex-1 font-bold h-11 rounded-xl" onClick={() => setIsSheetOpen(false)}>Close Registry</Button>
                            <Button className="flex-1 font-bold h-11 rounded-xl gap-2 shadow-lg shadow-primary/20">
                                <Plus className="w-4 h-4" /> Enroll Student
                            </Button>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>

            {/* Create Class Dialog */}
            <Dialog open={showAdd} onOpenChange={setShowAdd}>
                <DialogContent className="max-w-sm rounded-[2rem] border-0 shadow-2xl overflow-hidden p-0">
                    <div className="h-2 bg-primary" />
                    <div className="p-6">
                        <DialogHeader className="mb-6">
                            <DialogTitle className="flex items-center gap-3 text-xl font-black">
                                <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                                    <Plus className="w-6 h-6" />
                                </div>
                                Create New Class
                            </DialogTitle>
                            <DialogDescription className="text-xs font-medium">Define a new academic group and assign a mentor teacher.</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={e => { e.preventDefault(); if (className.trim()) createMutation.mutate({ levelType: 'CBC', levelName: className.trim(), streamName: newClassName.trim(), capacity: 40, classTeacherId: teacherId === "none" ? null : teacherId }); }} className="space-y-4">
                            <div className="space-y-2">
                                <Input placeholder="e.g. Grade 4" value={className} onChange={e => setClassName(e.target.value)} required className="h-11 rounded-xl bg-muted/50 border-0 focus-visible:ring-primary" />
                                <Label className="text-[10px] font-bold uppercase tracking-widest ml-1">Stream Name</Label>
                                <Input placeholder="e.g. North" value={newClassName} onChange={e => setNewClassName(e.target.value)} required className="h-11 rounded-xl bg-muted/50 border-0 focus-visible:ring-primary" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase tracking-widest ml-1">Class Teacher</Label>
                                <Select value={teacherId} onValueChange={setTeacherId}>
                                    <SelectTrigger className="h-11 rounded-xl bg-muted/50 border-0 focus:ring-primary">
                                        <SelectValue placeholder="Select a mentor" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border-border/50 shadow-xl">
                                        <SelectItem value="none" className="text-muted-foreground italic">No mentor assigned</SelectItem>
                                        {teachers.map((t: any) => (
                                            <SelectItem key={t.id} value={t.id} className="font-bold">{t.firstName} {t.lastName}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <DialogFooter className="pt-4 flex !flex-row gap-2">
                                <Button type="button" variant="outline" onClick={() => setShowAdd(false)} className="flex-1 h-11 rounded-xl font-bold">Cancel</Button>
                                <Button type="submit" disabled={createMutation.isPending} className="flex-1 h-11 rounded-xl font-bold shadow-lg shadow-primary/20">
                                    {createMutation.isPending ? "Configuring..." : "Launch Class"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Edit Class Dialog */}
            <AnimatePresence>
                <Dialog open={showEdit} onOpenChange={setShowEdit}>
                    <DialogContent className="max-w-sm rounded-[2rem] border-0 shadow-2xl overflow-hidden p-0">
                        <div className="h-2 bg-amber-500" />
                        <div className="p-6">
                            <DialogHeader className="mb-6">
                                <DialogTitle className="flex items-center gap-3 text-xl font-black">
                                    <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                                        <Pencil className="w-5 h-5" />
                                    </div>
                                    Edit Settings
                                </DialogTitle>
                            </DialogHeader>
                            <form onSubmit={e => { e.preventDefault(); if (editId && editName.trim()) updateMutation.mutate({ id: editId, data: { name: editName.trim(), classTeacherId: editTeacherId === "none" ? null : editTeacherId } }); }} className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest ml-1">Class Name</Label>
                                    <Input value={editName} onChange={e => setEditName(e.target.value)} required className="h-11 rounded-xl bg-muted/50 border-0" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest ml-1">Class Teacher</Label>
                                    <Select value={editTeacherId} onValueChange={setEditTeacherId}>
                                        <SelectTrigger className="h-11 rounded-xl bg-muted/50 border-0">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl border-border/50 shadow-xl">
                                            <SelectItem value="none" className="text-muted-foreground italic">Unassigned</SelectItem>
                                            {teachers.map((t: any) => (
                                                <SelectItem key={t.id} value={t.id} className="font-bold">{t.firstName} {t.lastName}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <DialogFooter className="pt-4 flex !flex-row gap-2">
                                    <Button type="button" variant="outline" onClick={() => setShowEdit(false)} className="flex-1 h-11 rounded-xl font-bold">Discard</Button>
                                    <Button type="submit" disabled={updateMutation.isPending} className="flex-1 h-11 rounded-xl font-bold bg-amber-500 hover:bg-amber-600 shadow-lg shadow-amber-500/20">
                                        {updateMutation.isPending ? "Applying..." : "Save Changes"}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </div>
                    </DialogContent>
                </Dialog>
            </AnimatePresence>
        </>
    );
}
