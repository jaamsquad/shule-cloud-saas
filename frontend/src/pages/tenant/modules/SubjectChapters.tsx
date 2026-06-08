import { useState } from "react";
import {
    Search, Plus, BookOpen, Layers, Edit, Trash2, Archive, 
    ArrowUpDown, CheckCircle, Clock, ChevronDown, ChevronUp, 
    Sparkles, Filter, AlertCircle, FileText, Check, X, Home
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

export default function SubjectChapters() {
    const [search, setSearch] = useState("");
    const [selectedSubject, setSelectedSubject] = useState<string>("ALL");
    const [selectedClass, setSelectedClass] = useState<string>("ALL");
    const [showAdd, setShowAdd] = useState(false);
    const [editingChapter, setEditingChapter] = useState<any>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const [form, setForm] = useState({
        chapterName: "",
        chapterCode: "",
        subjectId: "",
        classId: "",
        description: "",
        academicYear: "2026/2027",
        term: "Term 1",
        learningObjectives: "",
        status: "Active",
        completionPercentage: 0,
        order: 1
    });

    const queryClient = useQueryClient();

    // Fetch Chapters
    const { data: chapters = [], isLoading } = useQuery({
        queryKey: ["chapters"],
        queryFn: async () => {
            const r = await api.get("/chapters");
            return r.data || [];
        },
    });

    // Fetch Subjects & Classes for Dropdowns
    const { data: subjects = [] } = useQuery({ queryKey: ["subjects"], queryFn: async () => (await api.get("/subjects")).data || [] });
    const { data: classes = [] } = useQuery({ queryKey: ["classes"], queryFn: async () => (await api.get("/classes")).data || [] });

    // Fetch Periods for Active Term Badge
    const { data: periods = [] } = useQuery<any[]>({
        queryKey: ["periods"],
        queryFn: async () => (await api.get("/academics/periods")).data || [],
    });
    const currentPeriod = periods.find((p: any) => p.isCurrent) || periods[0];

    // Mutations
    const createMutation = useMutation({
        mutationFn: (data: any) => api.post("/chapters", data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["chapters"] });
            setShowAdd(false);
            resetForm();
            toast.success("Subject chapter integrated successfully");
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => api.put(`/chapters/${id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["chapters"] });
            setShowAdd(false);
            setEditingChapter(null);
            resetForm();
            toast.success("Chapter parameters updated successfully");
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/chapters/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["chapters"] });
            toast.success("Chapter purged from active registry");
        },
    });

    const archiveMutation = useMutation({
        mutationFn: (id: string) => api.patch(`/chapters/${id}/archive`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["chapters"] });
            toast.success("Chapter moved to secure archives");
        },
    });

    const reorderMutation = useMutation({
        mutationFn: (items: any[]) => api.patch("/chapters/reorder", { items }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["chapters"] });
            toast.success("Chapter sequence reordered");
        },
    });

    const resetForm = () => {
        setForm({
            chapterName: "",
            chapterCode: "",
            subjectId: "",
            classId: "",
            description: "",
            academicYear: "2026/2027",
            term: "Term 1",
            learningObjectives: "",
            status: "Active",
            completionPercentage: 0,
            order: chapters.length + 1
        });
    };

    const handleEdit = (chapter: any) => {
        setEditingChapter(chapter);
        setForm({
            chapterName: chapter.chapterName || "",
            chapterCode: chapter.chapterCode || "",
            subjectId: chapter.subjectId || "",
            classId: chapter.classId || "",
            description: chapter.description || "",
            academicYear: chapter.academicYear || "2026/2027",
            term: chapter.term || "Term 1",
            learningObjectives: chapter.learningObjectives || "",
            status: chapter.status || "Active",
            completionPercentage: chapter.completionPercentage || 0,
            order: chapter.order || 1
        });
        setShowAdd(true);
    };

    const handleSave = () => {
        if (!form.chapterName || !form.chapterCode) {
            toast.error("Please fill in Chapter Name and Code");
            return;
        }
        if (editingChapter) {
            updateMutation.mutate({ id: editingChapter._id, data: form });
        } else {
            createMutation.mutate(form);
        }
    };

    const moveChapter = (index: number, direction: 'up' | 'down') => {
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= chapters.length) return;
        const clone = [...chapters];
        const temp = clone[index];
        clone[index] = clone[newIndex];
        clone[newIndex] = temp;
        // update order fields
        const updated = clone.map((c, idx) => ({ _id: c._id, order: idx + 1 }));
        reorderMutation.mutate(updated);
    };

    // Filters
    const filteredChapters = chapters.filter((c: any) => {
        const matchesSearch = (c.chapterName || "").toLowerCase().includes(search.toLowerCase()) ||
                              (c.chapterCode || "").toLowerCase().includes(search.toLowerCase()) ||
                              (c.description || "").toLowerCase().includes(search.toLowerCase());
        const matchesSubject = selectedSubject === "ALL" || c.subjectId === selectedSubject;
        const matchesClass = selectedClass === "ALL" || c.classId === selectedClass;
        return matchesSearch && matchesSubject && matchesClass && c.status !== "Archived";
    }).sort((a: any, b: any) => (a.order || 0) - (b.order || 0));

    const totalActive = chapters.filter((c: any) => c.status === "Active").length;
    const avgCompletion = chapters.length > 0 ? Math.round(chapters.reduce((sum: number, c: any) => sum + (Number(c.completionPercentage) || 0), 0) / chapters.length) : 0;

    return (
        <div className="flex-1 bg-[#f3f4f6] min-h-screen flex flex-col overflow-y-auto pb-20">
            {/* Top bar */}
            <div className="w-full bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-2 text-sm">
                    <Home className="w-4 h-4 text-[#5C67F2]" />
                    <span className="text-gray-300">/</span>
                    <span className="font-bold text-gray-600">Question Paper</span>
                    <span className="text-gray-300">/</span>
                    <span className="font-black text-[#5C67F2]">Subject Chapters</span>
                </div>
                {currentPeriod && (
                    <div className="flex items-center gap-2 px-4 py-1.5 bg-emerald-50 border border-emerald-100 rounded-full">
                        <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse inline-block" />
                        <span className="text-xs font-black text-emerald-600 uppercase tracking-wider">
                            {currentPeriod.label} · {currentPeriod.academicYear}
                        </span>
                    </div>
                )}
            </div>

            <div className="flex-1 px-8 py-8 w-full max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-2">
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Subject Chapters</h1>
                        <p className="text-slate-400 text-sm font-medium mt-1">Curriculum blueprinting, learning objectives & chapter completion tracking</p>
                    </div>
                    <button
                        onClick={() => { setEditingChapter(null); resetForm(); setShowAdd(true); }}
                        className="flex items-center gap-2 px-6 py-2.5 bg-[#5C67F2] hover:bg-[#4a54c4] text-white rounded-full font-black text-xs tracking-widest uppercase shadow-md shadow-indigo-100 transition-all"
                    >
                        <Plus className="w-4 h-4" /> Add New Chapter
                    </button>
                </div>

                {/* Stats Matrix */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="border-0 shadow-soft bg-background/50 backdrop-blur-md overflow-hidden group">
                        <CardContent className="p-6 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground group-hover:text-primary transition-colors">Total Chapters</p>
                                <p className="text-3xl font-black mt-1">{isLoading ? "---" : chapters.length}</p>
                            </div>
                            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:scale-110 transition-transform">
                                <BookOpen className="w-7 h-7 text-primary" />
                            </div>
                        </CardContent>
                        <div className="h-1.5 w-full bg-primary/20" />
                    </Card>

                    <Card className="border-0 shadow-soft bg-background/50 backdrop-blur-md overflow-hidden group">
                        <CardContent className="p-6 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">Active Chapters</p>
                                <p className="text-3xl font-black mt-1">{totalActive}</p>
                            </div>
                            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 group-hover:scale-110 transition-transform">
                                <CheckCircle className="w-7 h-7 text-emerald-600" />
                            </div>
                        </CardContent>
                        <div className="h-1.5 w-full bg-emerald-500/20" />
                    </Card>

                    <Card className="border-0 shadow-soft bg-background/50 backdrop-blur-md overflow-hidden group">
                        <CardContent className="p-6 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500">Avg. Completion</p>
                                <p className="text-3xl font-black mt-1">{avgCompletion}%</p>
                            </div>
                            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 group-hover:scale-110 transition-transform">
                                <Clock className="w-7 h-7 text-indigo-500" />
                            </div>
                        </CardContent>
                        <div className="h-1.5 w-full bg-indigo-500/20" />
                    </Card>
                </div>

                {/* Toolbar */}
                <div className="flex flex-col xl:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto flex-1">
                        <div className="relative w-full sm:w-72">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Search chapter name/code..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="pl-11 h-12 bg-slate-50 border-none rounded-xl shadow-none focus-visible:ring-2 focus-visible:ring-indigo-500/20 font-bold text-sm"
                            />
                        </div>

                        {/* Subject Filter */}
                        <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                            <SelectTrigger className="h-12 w-full sm:w-48 rounded-xl bg-slate-50 border-none font-bold text-xs uppercase tracking-wider shadow-none">
                                <SelectValue placeholder="Filter Subject" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-border/50 shadow-2xl">
                                <SelectItem value="ALL" className="font-bold text-xs">ALL SUBJECTS</SelectItem>
                                {subjects.map((s: any) => (
                                    <SelectItem key={s._id} value={s._id} className="font-bold text-xs">{s.name || s.subjectName}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Class Filter */}
                        <Select value={selectedClass} onValueChange={setSelectedClass}>
                            <SelectTrigger className="h-12 w-full sm:w-48 rounded-xl bg-slate-50 border-none font-bold text-xs uppercase tracking-wider shadow-none">
                                <SelectValue placeholder="Filter Class" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-border/50 shadow-2xl">
                                <SelectItem value="ALL" className="font-bold text-xs">ALL CLASSES</SelectItem>
                                {classes.map((c: any) => (
                                    <SelectItem key={c._id} value={c._id} className="font-bold text-xs">{c.levelName || c.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Chapter Cards List */}
                <div className="space-y-4">
                    <AnimatePresence mode="popLayout">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-32 gap-4">
                                <div className="w-12 h-12 border-4 border-primary/10 border-t-primary rounded-full animate-spin" />
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Loading Curriculum Nodes...</p>
                            </div>
                        ) : filteredChapters.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-32 gap-4 glass-card rounded-[3rem] text-center p-8">
                                <AlertCircle className="w-16 h-16 text-muted-foreground/20" />
                                <h3 className="text-lg font-black text-slate-700">No Chapters Found</h3>
                                <p className="text-xs font-medium text-slate-400 max-w-sm">No chapters match your current search and filter criteria. Click 'Add New Chapter' to begin curriculum blueprinting.</p>
                            </div>
                        ) : (
                            filteredChapters.map((c: any, i: number) => {
                                const isExpanded = expandedId === c._id;
                                const subObj = subjects.find((s: any) => s._id === c.subjectId);
                                const clsObj = classes.find((cls: any) => cls._id === c.classId);

                                return (
                                    <motion.div
                                        key={c._id || i}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <Card className="border-0 shadow-soft bg-background/60 backdrop-blur-md hover:bg-background transition-all duration-300 rounded-[2rem] overflow-hidden group">
                                            <CardContent className="p-6">
                                                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                                                    {/* Left: Drag Handle & Main Info */}
                                                    <div className="flex items-start gap-4 flex-1">
                                                        <div className="flex flex-col gap-1 pt-1 opacity-40 group-hover:opacity-100 transition-opacity">
                                                            <button onClick={() => moveChapter(i, 'up')} disabled={i === 0} className="hover:text-primary disabled:opacity-20"><ChevronUp className="w-4 h-4" /></button>
                                                            <button onClick={() => moveChapter(i, 'down')} disabled={i === filteredChapters.length - 1} className="hover:text-primary disabled:opacity-20"><ChevronDown className="w-4 h-4" /></button>
                                                        </div>

                                                        <div className="space-y-2 flex-1">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <Badge variant="outline" className="text-[10px] font-black uppercase px-3 py-1 bg-primary/10 text-primary border-none">
                                                                    {c.chapterCode || `CH-${i + 1}`}
                                                                </Badge>
                                                                <Badge variant="outline" className="text-[10px] font-black uppercase px-3 py-1 bg-slate-100 text-slate-600 border-none">
                                                                    {subObj?.name || subObj?.subjectName || "General Subject"}
                                                                </Badge>
                                                                <Badge variant="outline" className="text-[10px] font-black uppercase px-3 py-1 bg-indigo-50 text-indigo-600 border-none">
                                                                    {clsObj?.levelName || clsObj?.name || "All Classes"}
                                                                </Badge>
                                                                <Badge variant="outline" className={`text-[10px] font-black uppercase px-3 py-1 border-none ${c.status === 'Active' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                                                    {c.status || "Active"}
                                                                </Badge>
                                                            </div>

                                                            <h3 className="text-lg font-black text-slate-800 tracking-tight group-hover:text-primary transition-colors">
                                                                {c.chapterName || "Unnamed Chapter"}
                                                            </h3>

                                                            <p className="text-xs font-medium text-slate-500 line-clamp-2 leading-relaxed">
                                                                {c.description || "No description provided for this curriculum unit."}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Right: Progress & Actions */}
                                                    <div className="flex items-center gap-6 w-full lg:w-auto justify-between lg:justify-end border-t lg:border-t-0 pt-4 lg:pt-0">
                                                        <div className="flex flex-col items-start lg:items-end gap-1">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] font-black uppercase text-slate-400">Completion</span>
                                                                <span className="text-xs font-black text-slate-700">{c.completionPercentage || 0}%</span>
                                                            </div>
                                                            <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                                <div className="h-full bg-primary transition-all duration-500" style={{ width: `${c.completionPercentage || 0}%` }} />
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-2">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => setExpandedId(isExpanded ? null : c._id)}
                                                                className="text-xs font-bold gap-1 rounded-xl hover:bg-slate-100"
                                                            >
                                                                {isExpanded ? "Hide Details" : "Objectives"}
                                                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                            </Button>

                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-slate-100"><ArrowUpDown className="w-4 h-4" /></Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end" className="rounded-2xl border-border/50 shadow-2xl p-1 w-44">
                                                                    <DropdownMenuItem onClick={() => handleEdit(c)} className="rounded-xl font-bold py-2.5 text-xs"><Edit className="w-3.5 h-3.5 mr-3 text-indigo-500" /> Edit Parameters</DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={() => archiveMutation.mutate(c._id)} className="rounded-xl font-bold py-2.5 text-xs"><Archive className="w-3.5 h-3.5 mr-3 text-amber-500" /> Archive Chapter</DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={() => deleteMutation.mutate(c._id)} className="text-rose-500 rounded-xl font-bold py-2.5 text-xs"><Trash2 className="w-3.5 h-3.5 mr-3" /> Purge Chapter</DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Expandable Details / Learning Objectives */}
                                                <AnimatePresence>
                                                    {isExpanded && (
                                                        <motion.div
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: "auto", opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            className="overflow-hidden border-t border-slate-100 mt-6 pt-6 grid grid-cols-1 md:grid-cols-2 gap-6"
                                                        >
                                                            <div className="space-y-2">
                                                                <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                                                    <FileText className="w-3.5 h-3.5" /> Learning Objectives
                                                                </h4>
                                                                <div className="p-4 rounded-2xl bg-slate-50 text-xs font-medium text-slate-600 leading-relaxed whitespace-pre-wrap">
                                                                    {c.learningObjectives || "No specific learning objectives configured."}
                                                                </div>
                                                            </div>

                                                            <div className="space-y-2">
                                                                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                                                    <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Curriculum Metadata
                                                                </h4>
                                                                <div className="p-4 rounded-2xl bg-slate-50 grid grid-cols-2 gap-4 text-xs font-medium text-slate-600">
                                                                    <div>
                                                                        <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Academic Year</span>
                                                                        <span className="font-black text-slate-700">{c.academicYear || "2026/2027"}</span>
                                                                    </div>
                                                                    <div>
                                                                        <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Term / Semester</span>
                                                                        <span className="font-black text-slate-700">{c.term || "Term 1"}</span>
                                                                    </div>
                                                                    <div>
                                                                        <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Sequence Order</span>
                                                                        <span className="font-black text-slate-700">Chapter #{c.order || i + 1}</span>
                                                                    </div>
                                                                    <div>
                                                                        <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Status</span>
                                                                        <span className="font-black text-slate-700">{c.status || "Active"}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                );
                            })
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Ingress/Edit Dialog */}
            <Dialog open={showAdd} onOpenChange={setShowAdd}>
                <DialogContent className="max-w-2xl rounded-[3rem] border-0 shadow-2xl p-0 overflow-hidden bg-background/95 backdrop-blur-xl">
                    <div className="h-2 bg-primary" />
                    <div className="p-10 max-h-[85vh] overflow-y-auto custom-scrollbar">
                        <DialogHeader className="mb-8">
                            <DialogTitle className="text-3xl font-black flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                                    <BookOpen className="w-6 h-6" />
                                </div>
                                {editingChapter ? "Edit Chapter Parameters" : "Add New Subject Chapter"}
                            </DialogTitle>
                            <DialogDescription className="text-sm font-medium">Define curriculum structure, learning objectives, and completion targets.</DialogDescription>
                        </DialogHeader>

                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Chapter Name*</Label>
                                    <Input
                                        placeholder="e.g. Quadratic Equations"
                                        value={form.chapterName}
                                        onChange={e => setForm({ ...form, chapterName: e.target.value })}
                                        className="h-12 rounded-2xl bg-muted/40 border-0 font-bold px-6 shadow-none"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Chapter Code*</Label>
                                    <Input
                                        placeholder="e.g. MATH-CH4"
                                        value={form.chapterCode}
                                        onChange={e => setForm({ ...form, chapterCode: e.target.value })}
                                        className="h-12 rounded-2xl bg-muted/40 border-0 font-bold px-6 shadow-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Subject Assignment</Label>
                                    <Select value={form.subjectId} onValueChange={v => setForm({ ...form, subjectId: v })}>
                                        <SelectTrigger className="h-12 rounded-2xl bg-muted/40 border-0 font-bold px-6 shadow-none"><SelectValue placeholder="Select Subject" /></SelectTrigger>
                                        <SelectContent className="rounded-2xl border-border/50 shadow-2xl">
                                            {subjects.map((s: any) => (
                                                <SelectItem key={s._id} value={s._id} className="font-bold text-xs">{s.name || s.subjectName}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Class Assignment</Label>
                                    <Select value={form.classId} onValueChange={v => setForm({ ...form, classId: v })}>
                                        <SelectTrigger className="h-12 rounded-2xl bg-muted/40 border-0 font-bold px-6 shadow-none"><SelectValue placeholder="Select Class" /></SelectTrigger>
                                        <SelectContent className="rounded-2xl border-border/50 shadow-2xl">
                                            {classes.map((c: any) => (
                                                <SelectItem key={c._id} value={c._id} className="font-bold text-xs">{c.levelName || c.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Academic Year</Label>
                                    <Input
                                        value={form.academicYear}
                                        onChange={e => setForm({ ...form, academicYear: e.target.value })}
                                        className="h-12 rounded-2xl bg-muted/40 border-0 font-bold px-6 shadow-none text-xs"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Term / Semester</Label>
                                    <Select value={form.term} onValueChange={v => setForm({ ...form, term: v })}>
                                        <SelectTrigger className="h-12 rounded-2xl bg-muted/40 border-0 font-bold px-6 shadow-none text-xs"><SelectValue /></SelectTrigger>
                                        <SelectContent className="rounded-2xl border-border/50 shadow-2xl text-xs">
                                            <SelectItem value="Term 1" className="font-bold text-xs">Term 1</SelectItem>
                                            <SelectItem value="Term 2" className="font-bold text-xs">Term 2</SelectItem>
                                            <SelectItem value="Term 3" className="font-bold text-xs">Term 3</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Completion (%)</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={form.completionPercentage}
                                        onChange={e => setForm({ ...form, completionPercentage: parseInt(e.target.value) || 0 })}
                                        className="h-12 rounded-2xl bg-muted/40 border-0 font-bold px-6 shadow-none text-xs"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Chapter Description</Label>
                                <Textarea
                                    placeholder="Brief overview of the chapter content..."
                                    value={form.description}
                                    onChange={e => setForm({ ...form, description: e.target.value })}
                                    className="min-h-[100px] rounded-[2rem] bg-muted/40 border-0 focus-visible:ring-2 focus-visible:ring-primary transition-all p-6 font-bold leading-relaxed shadow-inner text-xs"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Learning Objectives (Bloom's Taxonomy Aligned)</Label>
                                <Textarea
                                    placeholder="1. Understand the core principles of...&#10;2. Apply formulas to solve..."
                                    value={form.learningObjectives}
                                    onChange={e => setForm({ ...form, learningObjectives: e.target.value })}
                                    className="min-h-[120px] rounded-[2rem] bg-muted/40 border-0 focus-visible:ring-2 focus-visible:ring-primary transition-all p-6 font-bold leading-relaxed shadow-inner text-xs"
                                />
                            </div>
                        </div>

                        <DialogFooter className="mt-10 flex !flex-row gap-3 pt-4">
                            <Button variant="outline" onClick={() => setShowAdd(false)} className="flex-1 h-12 rounded-2xl font-bold border-border/50">Cancel</Button>
                            <Button
                                onClick={handleSave}
                                disabled={createMutation.isPending || updateMutation.isPending}
                                className="flex-[2] h-12 rounded-full font-black shadow-lg shadow-indigo-100 bg-[#5C67F2] hover:bg-[#4a54c4] text-white"
                            >
                                {createMutation.isPending || updateMutation.isPending ? "SAVING..." : "SAVE CHAPTER"}
                            </Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
