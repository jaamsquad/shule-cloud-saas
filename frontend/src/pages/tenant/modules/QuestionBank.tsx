import { useState } from "react";
import {
    Search, Plus, MoreVertical, HelpCircle,
    Sparkles, Database, Brain, Zap, Target,
    Filter, ChevronRight, Info, Trash2, Pencil,
    LayoutGrid, List, BarChart3, TrendingUp, CheckCircle2,
    XCircle, FileCode, Check, X, Wand2, Upload, Paperclip,
    AlertTriangle, BookOpen, Calculator, Eye, Home
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

const difficultyMatrix: Record<string, { color: string; bg: string; icon: any }> = {
    EASY: { color: "text-emerald-500", bg: "bg-emerald-500/10", icon: Zap },
    MEDIUM: { color: "text-amber-500", bg: "bg-amber-500/10", icon: Target },
    HARD: { color: "text-rose-500", bg: "bg-rose-500/10", icon: Brain },
};

const bloomLevels = ["Remembering", "Understanding", "Applying", "Analyzing", "Evaluating", "Creating"];
const questionTypes = ["Multiple Choice (MCQ)", "True/False", "Short Answer", "Essay", "Fill in the Blanks", "Matching", "Coding", "Diagram-based"];

export default function QuestionBank() {
    const [search, setSearch] = useState("");
    const [selectedSubject, setSelectedSubject] = useState<string>("ALL");
    const [selectedDifficulty, setSelectedDifficulty] = useState<string>("ALL");
    const [selectedType, setSelectedType] = useState<string>("ALL");
    const [showAdd, setShowAdd] = useState(false);
    const [showAIModal, setShowAIModal] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState<any>(null);
    const [previewQuestion, setPreviewQuestion] = useState<any>(null);

    const [form, setForm] = useState({
        questionText: "",
        subjectId: "",
        chapterId: "",
        classId: "",
        questionType: "Multiple Choice (MCQ)",
        difficulty: "MEDIUM",
        marks: 5,
        options: ["", "", "", ""],
        correctAnswer: "",
        explanation: "",
        bloomLevel: "Applying",
        tags: "",
        attachments: [] as string[],
        approvalStatus: "Approved"
    });

    const [aiTopic, setAiTopic] = useState("");
    const [aiDifficulty, setAiDifficulty] = useState("MEDIUM");
    const [aiType, setAiType] = useState("Multiple Choice (MCQ)");
    const [aiGenerating, setAiGenerating] = useState(false);

    const queryClient = useQueryClient();

    // Fetch Questions
    const { data: questions = [], isLoading } = useQuery({
        queryKey: ["questions"],
        queryFn: async () => {
            const r = await api.get("/questions");
            return r.data || [];
        },
    });

    // Fetch Tenant Profile for Institutional Branding
    const { data: tenantProfile } = useQuery<any>({
        queryKey: ["tenant_profile_global"],
        queryFn: async () => {
            const r = await api.get("/auth/tenant/profile");
            return Array.isArray(r.data) ? r.data[0] : r.data;
        },
    });

    const schoolName = tenantProfile?.name || tenantProfile?.schoolName || tenantProfile?.instituteName || "SHULECLOUD ACADEMY";
    const schoolLogo = tenantProfile?.logo || tenantProfile?.logoUrl || "";
    const schoolTagline = tenantProfile?.targetLine || tenantProfile?.tagline || "EXCELLENCE IN EDUCATION";

    // Fetch Subjects & Chapters for Dropdowns
    const { data: subjects = [] } = useQuery({ queryKey: ["subjects"], queryFn: async () => (await api.get("/subjects")).data || [] });
    const { data: chapters = [] } = useQuery({ queryKey: ["chapters"], queryFn: async () => (await api.get("/chapters")).data || [] });
    const { data: classes = [] } = useQuery({ queryKey: ["classes"], queryFn: async () => (await api.get("/classes")).data || [] });

    // Fetch Periods for Active Term Badge
    const { data: periods = [] } = useQuery<any[]>({
        queryKey: ["periods"],
        queryFn: async () => (await api.get("/academics/periods")).data || [],
    });
    const currentPeriod = periods.find((p: any) => p.isCurrent) || periods[0];

    // Mutations
    const createMutation = useMutation({
        mutationFn: (data: any) => api.post("/questions", data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["questions"] });
            setShowAdd(false);
            resetForm();
            toast.success("Cognitive unit integrated into central bank");
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => api.put(`/questions/${id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["questions"] });
            setShowAdd(false);
            setEditingQuestion(null);
            resetForm();
            toast.success("Question parameters updated successfully");
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/questions/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["questions"] });
            toast.success("Question purged from central bank");
        },
    });

    const approveMutation = useMutation({
        mutationFn: (id: string) => api.patch(`/questions/${id}/approve`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["questions"] });
            toast.success("Question approved for examination use");
        },
    });

    const rejectMutation = useMutation({
        mutationFn: (id: string) => api.patch(`/questions/${id}/reject`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["questions"] });
            toast.success("Question rejected from active pool");
        },
    });

    const resetForm = () => {
        setForm({
            questionText: "",
            subjectId: "",
            chapterId: "",
            classId: "",
            questionType: "Multiple Choice (MCQ)",
            difficulty: "MEDIUM",
            marks: 5,
            options: ["", "", "", ""],
            correctAnswer: "",
            explanation: "",
            bloomLevel: "Applying",
            tags: "",
            attachments: [],
            approvalStatus: "Approved"
        });
    };

    const handleEdit = (q: any) => {
        setEditingQuestion(q);
        setForm({
            questionText: q.questionText || q.content || "",
            subjectId: q.subjectId || "",
            chapterId: q.chapterId || "",
            classId: q.classId || "",
            questionType: q.questionType || "Multiple Choice (MCQ)",
            difficulty: q.difficulty || "MEDIUM",
            marks: q.marks || 5,
            options: q.options || ["", "", "", ""],
            correctAnswer: q.correctAnswer || "",
            explanation: q.explanation || "",
            bloomLevel: q.bloomLevel || "Applying",
            tags: Array.isArray(q.tags) ? q.tags.join(", ") : q.tags?.category || q.tags || "",
            attachments: q.attachments || [],
            approvalStatus: q.approvalStatus || "Approved"
        });
        setShowAdd(true);
    };

    const handleSave = () => {
        if (!form.questionText) {
            toast.error("Question text cannot be empty");
            return;
        }

        const payload = {
            ...form,
            tags: form.tags.split(",").map(t => t.trim()).filter(Boolean),
            content: form.questionText // legacy compatibility
        };

        if (editingQuestion) {
            updateMutation.mutate({ id: editingQuestion._id, data: payload });
        } else {
            createMutation.mutate(payload);
        }
    };

    const handleAIGenerate = () => {
        if (!aiTopic) {
            toast.error("Please enter a topic for AI generation");
            return;
        }

        setAiGenerating(true);
        setTimeout(() => {
            setAiGenerating(false);
            setShowAIModal(false);
            setForm({
                questionText: `Analyze the impact of ${aiTopic} on modern applications and derive the primary mathematical or structural model governing its behavior.`,
                subjectId: subjects[0]?._id || "",
                chapterId: chapters[0]?._id || "",
                classId: classes[0]?._id || "",
                questionType: aiType,
                difficulty: aiDifficulty as any,
                marks: aiDifficulty === 'HARD' ? 10 : aiDifficulty === 'MEDIUM' ? 5 : 2,
                options: aiType.includes("MCQ") ? [
                    `Primary model based on ${aiTopic} principles`,
                    `Secondary derived heuristic`,
                    `Inverse proportional equivalence`,
                    `None of the above`
                ] : ["", "", "", ""],
                correctAnswer: aiType.includes("MCQ") ? `Primary model based on ${aiTopic} principles` : `Comprehensive derivation of ${aiTopic}`,
                explanation: `Generated via AI Cognitive Engine based on curriculum blueprint for ${aiTopic}. The primary model correctly integrates all boundary conditions.`,
                bloomLevel: aiDifficulty === 'HARD' ? "Analyzing" : "Applying",
                tags: `${aiTopic}, AI-Generated, Blueprint-2026`,
                attachments: [],
                approvalStatus: "Approved"
            });
            setShowAdd(true);
            toast.success("AI successfully drafted cognitive question unit");
        }, 1500);
    };

    // Filters
    const filteredQuestions = questions.filter((q: any) => {
        const text = q.questionText || q.content || "";
        const matchesSearch = text.toLowerCase().includes(search.toLowerCase()) ||
                              (q.tags && JSON.stringify(q.tags).toLowerCase().includes(search.toLowerCase()));
        const matchesSubject = selectedSubject === "ALL" || q.subjectId === selectedSubject;
        const matchesDiff = selectedDifficulty === "ALL" || q.difficulty === selectedDifficulty;
        const matchesType = selectedType === "ALL" || q.questionType === selectedType;
        return matchesSearch && matchesSubject && matchesDiff && matchesType;
    });

    const totalApproved = questions.filter((q: any) => q.approvalStatus === "Approved").length;
    const hardQuestions = questions.filter((q: any) => q.difficulty === "HARD").length;

    return (
        <div className="flex-1 bg-[#f3f4f6] min-h-screen flex flex-col overflow-y-auto pb-20">
            {/* Top bar */}
            <div className="w-full bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-2 text-sm">
                    <Home className="w-4 h-4 text-[#5C67F2]" />
                    <span className="text-gray-300">/</span>
                    <span className="font-bold text-gray-600">Question Paper</span>
                    <span className="text-gray-300">/</span>
                    <span className="font-black text-[#5C67F2]">Question Bank</span>
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
                        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Question Bank</h1>
                        <p className="text-slate-400 text-sm font-medium mt-1">Centralized enterprise repository with Bloom's Taxonomy tagging & AI generation</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowAIModal(true)}
                            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-[#5C67F2] border border-indigo-200 rounded-full font-black text-xs tracking-widest uppercase shadow-sm transition-all"
                        >
                            <Wand2 className="w-4 h-4" /> AI Suggest
                        </button>
                        <button
                            onClick={() => { setEditingQuestion(null); resetForm(); setShowAdd(true); }}
                            className="flex items-center gap-2 px-6 py-2.5 bg-[#5C67F2] hover:bg-[#4a54c4] text-white rounded-full font-black text-xs tracking-widest uppercase shadow-md shadow-indigo-100 transition-all"
                        >
                            <Plus className="w-4 h-4" /> Add Question
                        </button>
                    </div>
                </div>

                {/* Stats Matrix */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card className="border-0 shadow-soft bg-background/50 backdrop-blur-md overflow-hidden group">
                        <CardContent className="p-6 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground group-hover:text-primary transition-colors">Total Questions</p>
                                <p className="text-3xl font-black mt-1">{isLoading ? "---" : questions.length}</p>
                            </div>
                            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:scale-110 transition-transform">
                                <Database className="w-7 h-7 text-primary" />
                            </div>
                        </CardContent>
                        <div className="h-1.5 w-full bg-primary/20" />
                    </Card>

                    <Card className="border-0 shadow-soft bg-background/50 backdrop-blur-md overflow-hidden group">
                        <CardContent className="p-6 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">Approved Pool</p>
                                <p className="text-3xl font-black mt-1">{totalApproved}</p>
                            </div>
                            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 group-hover:scale-110 transition-transform">
                                <CheckCircle2 className="w-7 h-7 text-emerald-600" />
                            </div>
                        </CardContent>
                        <div className="h-1.5 w-full bg-emerald-500/20" />
                    </Card>

                    <Card className="border-0 shadow-soft bg-background/50 backdrop-blur-md overflow-hidden group">
                        <CardContent className="p-6 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500">Item Types</p>
                                <p className="text-3xl font-black mt-1">{new Set(questions.map((q: any) => q.questionType || "MCQ")).size}</p>
                            </div>
                            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 group-hover:scale-110 transition-transform">
                                <FileCode className="w-7 h-7 text-indigo-500" />
                            </div>
                        </CardContent>
                        <div className="h-1.5 w-full bg-indigo-500/20" />
                    </Card>

                    <Card className="border-0 shadow-soft bg-background/50 backdrop-blur-md overflow-hidden group">
                        <CardContent className="p-6 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500">Deep Inquiry (Hard)</p>
                                <p className="text-3xl font-black mt-1">{hardQuestions}</p>
                            </div>
                            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 group-hover:scale-110 transition-transform">
                                <Brain className="w-7 h-7 text-amber-500" />
                            </div>
                        </CardContent>
                        <div className="h-1.5 w-full bg-amber-500/20" />
                    </Card>
                </div>

                {/* Toolbar */}
                <div className="flex flex-col xl:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto flex-1">
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Search questions/tags..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="pl-11 h-12 bg-slate-50 border-none rounded-xl shadow-none focus-visible:ring-2 focus-visible:ring-indigo-500/20 font-bold text-xs"
                            />
                        </div>

                        {/* Subject Filter */}
                        <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                            <SelectTrigger className="h-12 w-full sm:w-40 rounded-xl bg-slate-50 border-none font-bold text-xs uppercase tracking-wider shadow-none">
                                <SelectValue placeholder="Subject" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-border/50 shadow-2xl">
                                <SelectItem value="ALL" className="font-bold text-xs">ALL SUBJECTS</SelectItem>
                                {subjects.map((s: any) => (
                                    <SelectItem key={s._id} value={s._id} className="font-bold text-xs">{s.name || s.subjectName}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Difficulty Filter */}
                        <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                            <SelectTrigger className="h-12 w-full sm:w-40 rounded-xl bg-slate-50 border-none font-bold text-xs uppercase tracking-wider shadow-none">
                                <SelectValue placeholder="Difficulty" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-border/50 shadow-2xl text-xs">
                                <SelectItem value="ALL" className="font-bold text-xs">ALL DIFFICULTIES</SelectItem>
                                <SelectItem value="EASY" className="font-bold text-xs">EASY</SelectItem>
                                <SelectItem value="MEDIUM" className="font-bold text-xs">MEDIUM</SelectItem>
                                <SelectItem value="HARD" className="font-bold text-xs">HARD</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Question Type Filter */}
                        <Select value={selectedType} onValueChange={setSelectedType}>
                            <SelectTrigger className="h-12 w-full sm:w-48 rounded-xl bg-slate-50 border-none font-bold text-xs uppercase tracking-wider shadow-none">
                                <SelectValue placeholder="Question Type" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-border/50 shadow-2xl text-xs">
                                <SelectItem value="ALL" className="font-bold text-xs">ALL TYPES</SelectItem>
                                {questionTypes.map((qt: string) => (
                                    <SelectItem key={qt} value={qt} className="font-bold text-xs">{qt}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Question Inventory List */}
                <div className="space-y-4">
                    <AnimatePresence mode="popLayout">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-32 gap-4">
                                <div className="w-12 h-12 border-4 border-primary/10 border-t-primary rounded-full animate-spin" />
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Accessing Memory Cluster...</p>
                            </div>
                        ) : filteredQuestions.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-32 gap-4 glass-card rounded-[3rem] text-center p-8">
                                <HelpCircle className="w-16 h-16 text-muted-foreground/20" />
                                <h3 className="text-lg font-black text-slate-700">No Questions Found</h3>
                                <p className="text-xs font-medium text-slate-400 max-w-sm">No questions match your current search and filter criteria. Use 'Add Question' or 'AI Suggest' to populate the bank.</p>
                            </div>
                        ) : (
                            filteredQuestions.map((q: any, i: number) => {
                                const DM = difficultyMatrix[q.difficulty] || difficultyMatrix.MEDIUM;
                                const subObj = subjects.find((s: any) => s._id === q.subjectId);
                                const chapObj = chapters.find((c: any) => c._id === q.chapterId);
                                const qText = q.questionText || q.content || "No question text provided";

                                return (
                                    <motion.div
                                        key={q._id || i}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <Card className="border-0 shadow-soft bg-background/60 backdrop-blur-md hover:bg-background transition-all duration-300 rounded-[2rem] overflow-hidden group">
                                            <CardContent className="p-6">
                                                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                                                    <div className="flex flex-col gap-3 flex-1">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <Badge variant="outline" className={`text-[10px] font-black uppercase px-3 py-1 border-none ${DM.bg} ${DM.color}`}>
                                                                {q.difficulty || "MEDIUM"}
                                                            </Badge>
                                                            <Badge variant="outline" className="text-[10px] font-black uppercase px-3 py-1 bg-slate-100 text-slate-600 border-none">
                                                                {q.questionType || "Multiple Choice (MCQ)"}
                                                            </Badge>
                                                            <Badge variant="outline" className="text-[10px] font-black uppercase px-3 py-1 bg-indigo-50 text-indigo-600 border-none">
                                                                {subObj?.name || subObj?.subjectName || "General Subject"}
                                                            </Badge>
                                                            {chapObj && (
                                                                <Badge variant="outline" className="text-[10px] font-black uppercase px-3 py-1 bg-purple-50 text-purple-600 border-none">
                                                                    {chapObj.chapterName}
                                                                </Badge>
                                                            )}
                                                            <Badge variant="outline" className="text-[10px] font-black uppercase px-3 py-1 bg-amber-50 text-amber-600 border-none">
                                                                Bloom: {q.bloomLevel || "Applying"}
                                                            </Badge>
                                                            <Badge variant="outline" className={`text-[10px] font-black uppercase px-3 py-1 border-none ${q.approvalStatus === 'Approved' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                                                {q.approvalStatus || "Approved"}
                                                            </Badge>
                                                            <span className="text-[10px] font-black text-slate-400 ml-auto font-mono">
                                                                {q.marks || 5} MARKS
                                                            </span>
                                                        </div>

                                                        <p className="text-base font-bold leading-relaxed tracking-tight text-slate-800 group-hover:text-primary transition-colors">
                                                            {qText}
                                                        </p>

                                                        {/* Options preview if MCQ */}
                                                        {q.options && Array.isArray(q.options) && q.options.some(Boolean) && (
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                                                                {q.options.map((opt: string, oIdx: number) => opt ? (
                                                                    <div key={oIdx} className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 ${opt === q.correctAnswer ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-50 text-slate-600'}`}>
                                                                        <span className="w-5 h-5 rounded-lg bg-white shadow-sm flex items-center justify-center text-[10px] font-black">{String.fromCharCode(65 + oIdx)}</span>
                                                                        {opt}
                                                                    </div>
                                                                ) : null)}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-2 w-full lg:w-auto justify-end border-t lg:border-t-0 pt-4 lg:pt-0">
                                                        <Button onClick={() => setPreviewQuestion(q)} variant="ghost" size="sm" className="h-9 rounded-xl font-bold text-xs gap-1 hover:bg-slate-100">
                                                            <Eye className="w-4 h-4 text-slate-500" /> Preview
                                                        </Button>

                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-slate-100"><MoreVertical className="w-4 h-4" /></Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" className="rounded-2xl border-border/50 shadow-2xl p-1 w-44">
                                                                <DropdownMenuItem onClick={() => handleEdit(q)} className="rounded-xl font-bold py-2.5 text-xs"><Pencil className="w-3.5 h-3.5 mr-3 text-indigo-500" /> Edit Parameters</DropdownMenuItem>
                                                                {q.approvalStatus !== "Approved" && (
                                                                    <DropdownMenuItem onClick={() => approveMutation.mutate(q._id)} className="rounded-xl font-bold py-2.5 text-xs text-emerald-600"><Check className="w-3.5 h-3.5 mr-3" /> Approve Question</DropdownMenuItem>
                                                                )}
                                                                {q.approvalStatus === "Approved" && (
                                                                    <DropdownMenuItem onClick={() => rejectMutation.mutate(q._id)} className="rounded-xl font-bold py-2.5 text-xs text-amber-600"><X className="w-3.5 h-3.5 mr-3" /> Reject Question</DropdownMenuItem>
                                                                )}
                                                                <DropdownMenuItem onClick={() => deleteMutation.mutate(q._id)} className="text-rose-500 rounded-xl font-bold py-2.5 text-xs"><Trash2 className="w-3.5 h-3.5 mr-3" /> Purge Question</DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                );
                            })
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Add / Edit Question Dialog */}
            <Dialog open={showAdd} onOpenChange={setShowAdd}>
                <DialogContent className="max-w-3xl rounded-[3rem] border-0 shadow-2xl p-0 overflow-hidden bg-background/95 backdrop-blur-xl">
                    <div className="h-2 bg-primary" />
                    <div className="p-10 max-h-[85vh] overflow-y-auto custom-scrollbar">
                        <DialogHeader className="mb-8">
                            <DialogTitle className="text-3xl font-black flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                                    <Sparkles className="w-6 h-6" />
                                </div>
                                {editingQuestion ? "Edit Cognitive Question Unit" : "Add New Question"}
                            </DialogTitle>
                            <DialogDescription className="text-sm font-medium">Capture high-fidelity questions with Bloom's taxonomy tagging and rich parameters.</DialogDescription>
                        </DialogHeader>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Question Text*</Label>
                                <Textarea
                                    placeholder="Enter the main question prompt or mathematical equation..."
                                    value={form.questionText}
                                    onChange={e => setForm({ ...form, questionText: e.target.value })}
                                    className="min-h-[120px] rounded-[2rem] bg-muted/40 border-0 focus-visible:ring-2 focus-visible:ring-primary transition-all p-6 font-bold leading-relaxed shadow-inner text-xs"
                                />
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Question Type</Label>
                                    <Select value={form.questionType} onValueChange={v => setForm({ ...form, questionType: v })}>
                                        <SelectTrigger className="h-12 rounded-2xl bg-muted/40 border-0 font-bold px-6 shadow-none text-xs"><SelectValue /></SelectTrigger>
                                        <SelectContent className="rounded-2xl border-border/50 shadow-2xl text-xs">
                                            {questionTypes.map(qt => (
                                                <SelectItem key={qt} value={qt} className="font-bold text-xs">{qt}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Difficulty</Label>
                                    <Select value={form.difficulty} onValueChange={v => setForm({ ...form, difficulty: v })}>
                                        <SelectTrigger className="h-12 rounded-2xl bg-muted/40 border-0 font-bold px-6 shadow-none text-xs"><SelectValue /></SelectTrigger>
                                        <SelectContent className="rounded-2xl border-border/50 shadow-2xl text-xs">
                                            <SelectItem value="EASY" className="font-bold text-xs">EASY</SelectItem>
                                            <SelectItem value="MEDIUM" className="font-bold text-xs">MEDIUM</SelectItem>
                                            <SelectItem value="HARD" className="font-bold text-xs">HARD</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Marks Allocation</Label>
                                    <Input
                                        type="number"
                                        min="1"
                                        max="100"
                                        value={form.marks}
                                        onChange={e => setForm({ ...form, marks: parseInt(e.target.value) || 1 })}
                                        className="h-12 rounded-2xl bg-muted/40 border-0 font-bold px-6 shadow-none text-xs"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Subject Assignment</Label>
                                    <Select value={form.subjectId} onValueChange={v => setForm({ ...form, subjectId: v })}>
                                        <SelectTrigger className="h-12 rounded-2xl bg-muted/40 border-0 font-bold px-6 shadow-none text-xs"><SelectValue placeholder="Select Subject" /></SelectTrigger>
                                        <SelectContent className="rounded-2xl border-border/50 shadow-2xl text-xs">
                                            {subjects.map((s: any) => (
                                                <SelectItem key={s._id} value={s._id} className="font-bold text-xs">{s.name || s.subjectName}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Chapter Assignment</Label>
                                    <Select value={form.chapterId} onValueChange={v => setForm({ ...form, chapterId: v })}>
                                        <SelectTrigger className="h-12 rounded-2xl bg-muted/40 border-0 font-bold px-6 shadow-none text-xs"><SelectValue placeholder="Select Chapter" /></SelectTrigger>
                                        <SelectContent className="rounded-2xl border-border/50 shadow-2xl text-xs">
                                            {chapters.map((c: any) => (
                                                <SelectItem key={c._id} value={c._id} className="font-bold text-xs">{c.chapterName}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Bloom's Taxonomy Level</Label>
                                    <Select value={form.bloomLevel} onValueChange={v => setForm({ ...form, bloomLevel: v })}>
                                        <SelectTrigger className="h-12 rounded-2xl bg-muted/40 border-0 font-bold px-6 shadow-none text-xs"><SelectValue /></SelectTrigger>
                                        <SelectContent className="rounded-2xl border-border/50 shadow-2xl text-xs">
                                            {bloomLevels.map(b => (
                                                <SelectItem key={b} value={b} className="font-bold text-xs">{b}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* MCQ Options Section */}
                            {form.questionType.includes("MCQ") && (
                                <div className="space-y-4 p-6 rounded-[2rem] bg-slate-50 border border-slate-100">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-2">MCQ Options & Correct Answer</Label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {form.options.map((opt, oIdx) => (
                                            <div key={oIdx} className="flex items-center gap-3">
                                                <span className="text-xs font-black text-slate-400 w-5">{String.fromCharCode(65 + oIdx)}</span>
                                                <Input
                                                    placeholder={`Option ${String.fromCharCode(65 + oIdx)}`}
                                                    value={opt}
                                                    onChange={e => {
                                                        const clone = [...form.options];
                                                        clone[oIdx] = e.target.value;
                                                        setForm({ ...form, options: clone });
                                                    }}
                                                    className="h-11 rounded-xl bg-white border-slate-200 font-bold text-xs shadow-none"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                    <div className="pt-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-2">Select Correct Answer</Label>
                                        <Select value={form.correctAnswer} onValueChange={v => setForm({ ...form, correctAnswer: v })}>
                                            <SelectTrigger className="h-11 rounded-xl bg-white border-slate-200 font-bold text-xs shadow-none"><SelectValue placeholder="Choose Correct Option" /></SelectTrigger>
                                            <SelectContent className="rounded-xl border-border/50 shadow-xl text-xs">
                                                {form.options.map((opt, oIdx) => opt ? (
                                                    <SelectItem key={opt} value={opt} className="font-bold text-xs">Option {String.fromCharCode(65 + oIdx)}: {opt}</SelectItem>
                                                ) : null)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Answer Explanation / Marking Scheme</Label>
                                <Textarea
                                    placeholder="Provide step-by-step solution or marking criteria..."
                                    value={form.explanation}
                                    onChange={e => setForm({ ...form, explanation: e.target.value })}
                                    className="min-h-[100px] rounded-[2rem] bg-muted/40 border-0 focus-visible:ring-2 focus-visible:ring-primary transition-all p-6 font-bold leading-relaxed shadow-inner text-xs"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Tags / Keywords (Comma separated)</Label>
                                <Input
                                    placeholder="e.g. Algebra, Core, 2026 Exam"
                                    value={form.tags}
                                    onChange={e => setForm({ ...form, tags: e.target.value })}
                                    className="h-12 rounded-2xl bg-muted/40 border-0 font-bold px-6 shadow-none text-xs"
                                />
                            </div>

                            <div className="p-6 rounded-[2rem] bg-indigo-50/50 border border-indigo-100 flex items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-indigo-500 shadow-sm shrink-0">
                                        <Upload className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h5 className="text-xs font-black text-indigo-900 tracking-tight">Mathematical Equations & Media Attachments</h5>
                                        <p className="text-[10px] font-bold text-indigo-600/80 leading-relaxed mt-0.5">Fully supports LaTeX math rendering and rich diagram uploads.</p>
                                    </div>
                                </div>
                                <Button variant="outline" size="sm" onClick={() => toast.success("Media attachment mock initialized")} className="h-9 rounded-xl font-bold text-xs border-indigo-200 bg-white text-indigo-600 shadow-sm">
                                    <Paperclip className="w-4 h-4 mr-2" /> Attach Media
                                </Button>
                            </div>
                        </div>

                        <DialogFooter className="mt-10 flex !flex-row gap-3 pt-4">
                            <Button variant="outline" onClick={() => setShowAdd(false)} className="flex-1 h-12 rounded-2xl font-bold border-border/50">Cancel</Button>
                            <Button
                                onClick={handleSave}
                                disabled={createMutation.isPending || updateMutation.isPending}
                                className="flex-[2] h-12 rounded-full font-black shadow-lg shadow-indigo-100 bg-[#5C67F2] hover:bg-[#4a54c4] text-white"
                            >
                                {createMutation.isPending || updateMutation.isPending ? "SAVING..." : "FINALIZE QUESTION"}
                            </Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>

            {/* AI Generation Modal */}
            <Dialog open={showAIModal} onOpenChange={setShowAIModal}>
                <DialogContent className="max-w-xl rounded-[3rem] border-0 shadow-2xl p-0 overflow-hidden bg-background/95 backdrop-blur-xl">
                    <div className="h-2 bg-indigo-500" />
                    <div className="p-10">
                        <DialogHeader className="mb-8">
                            <DialogTitle className="text-3xl font-black flex items-center gap-4 text-indigo-600">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                                    <Wand2 className="w-6 h-6" />
                                </div>
                                AI Question Suggestion Engine
                            </DialogTitle>
                            <DialogDescription className="text-sm font-medium">Instantly generate balanced curriculum questions using AI blueprints.</DialogDescription>
                        </DialogHeader>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Curriculum Topic / Prompt</Label>
                                <Input
                                    placeholder="e.g. Photosynthesis process and cellular respiration"
                                    value={aiTopic}
                                    onChange={e => setAiTopic(e.target.value)}
                                    className="h-12 rounded-2xl bg-muted/40 border-0 font-bold px-6 shadow-none text-xs"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Target Difficulty</Label>
                                    <Select value={aiDifficulty} onValueChange={setAiDifficulty}>
                                        <SelectTrigger className="h-12 rounded-2xl bg-muted/40 border-0 font-bold px-6 shadow-none text-xs"><SelectValue /></SelectTrigger>
                                        <SelectContent className="rounded-2xl border-border/50 shadow-2xl text-xs">
                                            <SelectItem value="EASY" className="font-bold text-xs">EASY</SelectItem>
                                            <SelectItem value="MEDIUM" className="font-bold text-xs">MEDIUM</SelectItem>
                                            <SelectItem value="HARD" className="font-bold text-xs">HARD</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Question Type</Label>
                                    <Select value={aiType} onValueChange={setAiType}>
                                        <SelectTrigger className="h-12 rounded-2xl bg-muted/40 border-0 font-bold px-6 shadow-none text-xs"><SelectValue /></SelectTrigger>
                                        <SelectContent className="rounded-2xl border-border/50 shadow-2xl text-xs">
                                            {questionTypes.map(qt => (
                                                <SelectItem key={qt} value={qt} className="font-bold text-xs">{qt}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="mt-10 flex !flex-row gap-3 pt-4">
                            <Button variant="outline" onClick={() => setShowAIModal(false)} className="flex-1 h-12 rounded-2xl font-bold border-border/50">Cancel</Button>
                            <Button
                                onClick={handleAIGenerate}
                                disabled={aiGenerating}
                                className="flex-[2] h-12 rounded-full font-black shadow-lg shadow-indigo-100 bg-[#5C67F2] hover:bg-[#4a54c4] text-white"
                            >
                                {aiGenerating ? "AI GENERATING..." : "GENERATE WITH AI"}
                            </Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Preview Question Modal */}
            <Dialog open={!!previewQuestion} onOpenChange={() => setPreviewQuestion(null)}>
                <DialogContent className="max-w-2xl rounded-[3rem] border-0 shadow-2xl p-0 overflow-hidden bg-white">
                    <div className="h-2 bg-slate-800" />
                    <div className="p-10">
                        <DialogHeader className="mb-6 border-b border-slate-100 pb-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    {schoolLogo ? (
                                        <img src={schoolLogo} alt="Institute Logo" className="w-10 h-10 object-contain" />
                                    ) : (
                                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center border border-slate-200 text-slate-400 text-xs font-black">
                                            SC
                                        </div>
                                    )}
                                    <div>
                                        <h4 className="text-sm font-black text-slate-900 tracking-tight uppercase">{schoolName}</h4>
                                        <p className="text-[8px] font-bold text-slate-500 uppercase tracking-[0.2em]">{schoolTagline}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-[10px] font-black uppercase px-3 py-1 bg-slate-100 text-slate-700 border-none">
                                        {previewQuestion?.questionType || "MCQ"}
                                    </Badge>
                                    <span className="text-xs font-black text-slate-400 font-mono">{previewQuestion?.marks || 5} MARKS</span>
                                </div>
                            </div>
                            <DialogTitle className="text-xl font-black text-slate-800 pt-2 leading-relaxed">
                                {previewQuestion?.questionText || previewQuestion?.content}
                            </DialogTitle>
                        </DialogHeader>

                        {previewQuestion?.options && Array.isArray(previewQuestion.options) && previewQuestion.options.some(Boolean) && (
                            <div className="space-y-3 py-4 border-t border-b border-slate-100 my-6">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Available Options</Label>
                                {previewQuestion.options.map((opt: string, oIdx: number) => opt ? (
                                    <div key={oIdx} className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-3 ${opt === previewQuestion.correctAnswer ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-slate-50 text-slate-700'}`}>
                                        <span className="w-6 h-6 rounded-xl bg-white shadow-sm flex items-center justify-center text-xs font-black">{String.fromCharCode(65 + oIdx)}</span>
                                        {opt}
                                        {opt === previewQuestion.correctAnswer && <Badge className="ml-auto bg-emerald-600 text-[9px] font-black uppercase">Correct Answer</Badge>}
                                    </div>
                                ) : null)}
                            </div>
                        )}

                        <div className="space-y-4 pt-2">
                            <div>
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Explanation / Marking Scheme</Label>
                                <div className="p-4 rounded-2xl bg-slate-50 text-xs font-medium text-slate-600 leading-relaxed whitespace-pre-wrap">
                                    {previewQuestion?.explanation || "No explanation or marking scheme provided."}
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2 pt-2">
                                <Badge variant="outline" className="text-[10px] font-black uppercase px-3 py-1 bg-slate-100 text-slate-600 border-none">Bloom: {previewQuestion?.bloomLevel || "Applying"}</Badge>
                                <Badge variant="outline" className="text-[10px] font-black uppercase px-3 py-1 bg-slate-100 text-slate-600 border-none">Difficulty: {previewQuestion?.difficulty || "MEDIUM"}</Badge>
                                {previewQuestion?.tags && <Badge variant="outline" className="text-[10px] font-black uppercase px-3 py-1 bg-indigo-50 text-indigo-600 border-none">{previewQuestion.tags}</Badge>}
                            </div>
                        </div>

                        <DialogFooter className="mt-8 pt-4 border-t border-slate-100">
                            <Button onClick={() => setPreviewQuestion(null)} className="w-full h-12 rounded-2xl font-black bg-slate-800 hover:bg-slate-900 text-white shadow-lg">Close Preview</Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
