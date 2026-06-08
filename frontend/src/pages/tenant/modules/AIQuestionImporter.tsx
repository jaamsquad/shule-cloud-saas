import { useState, useRef } from "react";
import {
    Search, Plus, FileText, Sparkles, Printer, Download, CheckCircle,
    Clock, HelpCircle, Layers, Filter, Check, X, Eye, BookOpen,
    Wand2, Calculator, Settings2, Trash2, ArrowUpDown, ChevronRight,
    QrCode, FileCheck, FileDown, ShieldCheck, AlertCircle, Home,
    Upload, FileCode, CheckCircle2, XCircle, RefreshCw, Paperclip,
    Database, Brain, Zap, Target, FileSpreadsheet, Image as ImageIcon,
    Loader2, Edit3, Save, CheckSquare, Square
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

const bloomLevels = ["Remembering", "Understanding", "Applying", "Analyzing", "Evaluating", "Creating"];
const questionTypes = ["Multiple Choice (MCQ)", "True/False", "Short Answer", "Essay", "Fill in the Blanks", "Matching", "Coding", "Diagram-based"];

export default function AIQuestionImporter() {
    const [file, setFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [ocrMode, setOcrMode] = useState<string>("DEEP_OCR"); // DEEP_OCR or STANDARD
    const [selectedSubject, setSelectedSubject] = useState<string>("");
    const [selectedChapter, setSelectedChapter] = useState<string>("");
    const [selectedClass, setSelectedClass] = useState<string>("");

    const [activeJobId, setActiveJobId] = useState<string | null>(null);
    const [editingQuestion, setEditingQuestion] = useState<any>(null);
    const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
    const [activeTab, setActiveTab] = useState<"questions" | "tables" | "images" | "raw">("questions");

    const fileInputRef = useRef<HTMLInputElement>(null);
    const queryClient = useQueryClient();

    // Fetch Subjects, Chapters, Classes for Dropdowns
    const { data: subjects = [] } = useQuery({ queryKey: ["subjects"], queryFn: async () => (await api.get("/subjects")).data || [] });
    const { data: chapters = [] } = useQuery({ queryKey: ["chapters"], queryFn: async () => (await api.get("/chapters")).data || [] });
    const { data: classes = [] } = useQuery({ queryKey: ["classes"], queryFn: async () => (await api.get("/classes")).data || [] });

    // Fetch Periods for Active Term Badge
    const { data: periods = [] } = useQuery<any[]>({
        queryKey: ["periods"],
        queryFn: async () => (await api.get("/academics/periods")).data || [],
    });
    const currentPeriod = periods.find((p: any) => p.isCurrent) || periods[0];

    // Fetch Active OCR Job Status / Results
    const { data: activeJob, isLoading: isJobLoading } = useQuery({
        queryKey: ["ocr_job", activeJobId],
        queryFn: async () => {
            if (!activeJobId) return null;
            const r = await api.get(`/question-import/status/${activeJobId}`);
            return r.data || null;
        },
        enabled: !!activeJobId,
        refetchInterval: (query) => {
            const data = query.state.data;
            return data && data.status === "Processing" ? 1000 : false;
        }
    });

    // Fetch OCR Jobs History
    const { data: jobsHistory = [] } = useQuery({
        queryKey: ["ocr_jobs_history"],
        queryFn: async () => (await api.get("/question-import/jobs")).data || []
    });

    // Upload & OCR Pipeline Mutation
    const uploadMutation = useMutation({
        mutationFn: async (uploadData: { file: string; filename: string; subjectId: string; chapterId: string; classId: string; ocrMode: string }) => {
            const r = await api.post("/question-import/upload", uploadData);
            return r.data;
        },
        onSuccess: (data) => {
            setActiveJobId(data.jobId);
            toast.success("Document ingested into AI OCR extraction pipeline");
            queryClient.invalidateQueries({ queryKey: ["ocr_jobs_history"] });
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || err.message || "Failed to upload document");
        }
    });

    // Save/Approve Bulk Questions Mutation
    const bulkApproveMutation = useMutation({
        mutationFn: async (questionsToSave: any[]) => {
            const r = await api.post("/questions/bulk", { questions: questionsToSave });
            return r.data;
        },
        onSuccess: () => {
            toast.success("Extracted questions successfully verified & saved to central Question Bank");
            queryClient.invalidateQueries({ queryKey: ["questions"] });
        }
    });

    // Delete Job Mutation
    const deleteJobMutation = useMutation({
        mutationFn: async (jobId: string) => {
            await api.delete(`/question-import/${jobId}`);
        },
        onSuccess: () => {
            toast.success("Extraction job record cleaned up");
            if (activeJobId) setActiveJobId(null);
            queryClient.invalidateQueries({ queryKey: ["ocr_jobs_history"] });
        }
    });

    const handleFileDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setFile(e.dataTransfer.files[0]);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleStartImport = () => {
        if (!file) {
            toast.error("Please select or drop a document to import");
            return;
        }
        if (!selectedSubject) {
            toast.error("Please select a target Subject for classification");
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const base64Str = event.target?.result as string;
            uploadMutation.mutate({
                file: base64Str,
                filename: file.name,
                subjectId: selectedSubject,
                chapterId: selectedChapter,
                classId: selectedClass,
                ocrMode
            });
        };
        reader.readAsDataURL(file);
    };

    const handleToggleSelectAll = (questions: any[]) => {
        if (selectedQuestionIds.length === questions.length) {
            setSelectedQuestionIds([]);
        } else {
            setSelectedQuestionIds(questions.map((q: any) => q.questionNumber || q.questionText));
        }
    };

    const handleToggleSelectOne = (id: string) => {
        if (selectedQuestionIds.includes(id)) {
            setSelectedQuestionIds(selectedQuestionIds.filter(i => i !== id));
        } else {
            setSelectedQuestionIds([...selectedQuestionIds, id]);
        }
    };

    const handleBulkApprove = (questions: any[]) => {
        const targetQuestions = questions.filter((q: any) => selectedQuestionIds.includes(q.questionNumber || q.questionText));
        if (targetQuestions.length === 0) {
            toast.error("Please select at least one extracted question to approve");
            return;
        }

        const formatted = targetQuestions.map((q: any) => ({
            questionText: q.questionText,
            questionType: q.questionType || "Essay",
            subjectId: selectedSubject || q.subjectId,
            chapterId: selectedChapter || q.chapterId,
            classId: selectedClass || q.classId,
            difficulty: q.difficulty || "MEDIUM",
            bloomLevel: q.bloomLevel || "Applying",
            marks: Number(q.marks) || 5,
            options: q.options || [],
            correctAnswer: q.correctAnswer || "",
            explanation: q.explanation || "Extracted via AI OCR Engine",
            tags: q.tags || ["AI-Extracted"],
            aiConfidence: q.aiConfidence || 0.95,
            approvalStatus: "Approved",
            createdAt: new Date()
        }));

        bulkApproveMutation.mutate(formatted);
    };

    const handleSaveEdit = () => {
        if (!editingQuestion) return;
        if (activeJob && activeJob.extractedQuestions) {
            const updated = activeJob.extractedQuestions.map((q: any) => {
                if ((q.questionNumber || q.questionText) === (editingQuestion.questionNumber || editingQuestion.questionText)) {
                    return editingQuestion;
                }
                return q;
            });
            activeJob.extractedQuestions = updated;
            toast.success("Question unit updated successfully");
            setEditingQuestion(null);
        }
    };

    return (
        <div className="flex-1 bg-[#f3f4f6] min-h-screen flex flex-col overflow-y-auto pb-20">
            {/* Top bar */}
            <div className="w-full bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-2 text-sm">
                    <Home className="w-4 h-4 text-[#5C67F2]" />
                    <span className="text-gray-300">/</span>
                    <span className="font-bold text-gray-600">Question Paper</span>
                    <span className="text-gray-300">/</span>
                    <span className="font-black text-[#5C67F2]">AI Past Paper Importer</span>
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
                        <h1 className="text-2xl font-black text-slate-800 tracking-tight">AI Past Paper Importer & OCR Engine</h1>
                        <p className="text-slate-400 text-sm font-medium mt-1">Upload PDF past papers, CATs, or textbook scans for automated question extraction & central bank storage</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button
                            onClick={() => window.open("/papers/create", "_self")}
                            className="flex items-center gap-2 px-6 py-2.5 bg-[#5C67F2] hover:bg-[#4a54c4] text-white rounded-full font-black text-xs tracking-widest uppercase shadow-md shadow-indigo-100 transition-all h-11"
                        >
                            <Wand2 className="w-4 h-4" /> Auto Generate Exam
                        </Button>
                    </div>
                </div>

                {/* Upload & Configuration Zone */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left: Metadata & Settings */}
                    <Card className="border-0 shadow-sm bg-white rounded-2xl p-6 space-y-6">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                <Settings2 className="w-4 h-4 text-[#5C67F2]" /> Ingestion Parameters
                            </h3>
                            <Badge variant="outline" className="font-black text-[10px] bg-indigo-50/50 text-[#5C67F2] border-indigo-100 px-3 py-1 rounded-full">
                                AI v2.4 Active
                            </Badge>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-black text-slate-700 uppercase tracking-wider">Target Subject *</Label>
                                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                                    <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-none font-bold text-xs uppercase tracking-wider shadow-none">
                                        <SelectValue placeholder="Select Subject" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border-border/50 shadow-2xl">
                                        {subjects.map((s: any) => (
                                            <SelectItem key={s._id} value={s._id} className="font-bold text-xs">{s.name || s.subjectName}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-black text-slate-700 uppercase tracking-wider">Target Class (Optional)</Label>
                                <Select value={selectedClass} onValueChange={setSelectedClass}>
                                    <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-none font-bold text-xs uppercase tracking-wider shadow-none">
                                        <SelectValue placeholder="Select Class" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border-border/50 shadow-2xl">
                                        {classes.map((c: any) => (
                                            <SelectItem key={c._id} value={c._id} className="font-bold text-xs">{c.levelName || c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-black text-slate-700 uppercase tracking-wider">Target Chapter (Optional)</Label>
                                <Select value={selectedChapter} onValueChange={setSelectedChapter}>
                                    <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-none font-bold text-xs uppercase tracking-wider shadow-none">
                                        <SelectValue placeholder="Select Chapter" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border-border/50 shadow-2xl">
                                        {chapters.map((c: any) => (
                                            <SelectItem key={c._id} value={c._id} className="font-bold text-xs">{c.chapterName || c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2 pt-2">
                                <Label className="text-xs font-black text-slate-700 uppercase tracking-wider">Extraction Mode</Label>
                                <div className="grid grid-cols-2 gap-3 pt-1">
                                    <button
                                        type="button"
                                        onClick={() => setOcrMode("DEEP_OCR")}
                                        className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 font-bold text-xs transition-all ${ocrMode === "DEEP_OCR" ? "border-[#5C67F2] bg-indigo-50/50 text-[#5C67F2]" : "border-gray-100 bg-slate-50 text-slate-500 hover:border-gray-200"}`}
                                    >
                                        <Brain className="w-5 h-5 mb-1.5" />
                                        <span>Deep OCR Engine</span>
                                        <span className="text-[9px] font-medium text-slate-400 mt-0.5">Scanned / Images</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setOcrMode("STANDARD")}
                                        className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 font-bold text-xs transition-all ${ocrMode === "STANDARD" ? "border-[#5C67F2] bg-indigo-50/50 text-[#5C67F2]" : "border-gray-100 bg-slate-50 text-slate-500 hover:border-gray-200"}`}
                                    >
                                        <FileText className="w-5 h-5 mb-1.5" />
                                        <span>Standard Parser</span>
                                        <span className="text-[9px] font-medium text-slate-400 mt-0.5">Native PDF Text</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Right: Drag & Drop Zone */}
                    <Card className="border-0 shadow-sm bg-white rounded-2xl p-8 lg:col-span-2 flex flex-col justify-center items-center relative overflow-hidden group">
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            accept=".pdf,.docx,.png,.jpg,.jpeg"
                            className="hidden"
                        />

                        <div
                            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={handleFileDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={`w-full flex-1 border-3 border-dashed rounded-2xl flex flex-col items-center justify-center p-10 text-center cursor-pointer transition-all ${isDragging ? "border-[#5C67F2] bg-indigo-50/20 scale-[0.99]" : "border-gray-200 hover:border-[#5C67F2] hover:bg-slate-50/50"}`}
                        >
                            <div className="w-20 h-20 rounded-full bg-indigo-50 flex items-center justify-center text-[#5C67F2] mb-6 group-hover:scale-110 transition-transform shadow-sm">
                                <Upload className="w-10 h-10" />
                            </div>

                            {file ? (
                                <div className="space-y-2 max-w-md">
                                    <div className="flex items-center justify-center gap-2 text-sm font-black text-slate-800">
                                        <FileCode className="w-5 h-5 text-[#5C67F2]" />
                                        <span className="truncate">{file.name}</span>
                                    </div>
                                    <p className="text-xs font-bold text-slate-400">{(file.size / (1024 * 1024)).toFixed(2)} MB · Click or drag to replace</p>
                                </div>
                            ) : (
                                <div className="space-y-2 max-w-md">
                                    <h3 className="text-base font-black text-slate-800 tracking-tight">Drop examination document here or click to browse</h3>
                                    <p className="text-xs font-medium text-slate-400 leading-relaxed">Supports PDF past papers, DOCX assignments, scanned images, and textbooks. AI will automatically extract, clean, and classify all questions.</p>
                                </div>
                            )}

                            <div className="flex items-center gap-4 mt-8">
                                <Badge variant="outline" className="font-bold text-[10px] bg-slate-50 text-slate-600 border-gray-200 px-3 py-1 rounded-full">PDF Papers</Badge>
                                <Badge variant="outline" className="font-bold text-[10px] bg-slate-50 text-slate-600 border-gray-200 px-3 py-1 rounded-full">DOCX Exams</Badge>
                                <Badge variant="outline" className="font-bold text-[10px] bg-slate-50 text-slate-600 border-gray-200 px-3 py-1 rounded-full">Scanned Images</Badge>
                            </div>
                        </div>

                        {file && (
                            <div className="w-full pt-6 flex items-center justify-end gap-4">
                                <Button
                                    variant="outline"
                                    onClick={(e) => { e.stopPropagation(); setFile(null); }}
                                    className="h-12 px-6 rounded-full font-bold text-xs border-gray-200 text-slate-600 hover:bg-slate-50"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={(e) => { e.stopPropagation(); handleStartImport(); }}
                                    disabled={uploadMutation.isPending}
                                    className="h-12 px-8 bg-[#5C67F2] hover:bg-[#4a54c4] text-white rounded-full font-black text-xs tracking-widest uppercase shadow-md shadow-indigo-100 flex items-center gap-2"
                                >
                                    {uploadMutation.isPending ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" /> Ingesting Document...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="w-4 h-4" /> Start AI Extraction
                                        </>
                                    )}
                                </Button>
                            </div>
                        )}
                    </Card>
                </div>

                {/* Active Extraction Job Progress / Results */}
                {activeJob && (
                    <Card className="border-0 shadow-sm bg-white rounded-2xl overflow-hidden">
                        {/* Progress Bar Header */}
                        <div className="bg-slate-900 p-6 flex flex-col md:flex-row items-center justify-between gap-6 text-white border-b border-slate-800">
                            <div className="flex items-center gap-4 w-full md:w-auto">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 border border-indigo-500/30 shrink-0">
                                    {activeJob.status === "Processing" ? (
                                        <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                                    ) : (
                                        <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                                    )}
                                </div>
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h3 className="text-base font-black tracking-tight">{activeJob.filename}</h3>
                                        <Badge className={`font-black text-[10px] px-3 py-0.5 rounded-full uppercase tracking-wider ${activeJob.status === "Processing" ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"}`}>
                                            {activeJob.status}
                                        </Badge>
                                    </div>
                                    <p className="text-xs font-medium text-slate-400 mt-1">
                                        {activeJob.status === "Processing" ? "AI OCR microservice is parsing layout, detecting equations, and classifying cognitive units..." : "Extraction complete. Review, edit, and approve extracted questions below."}
                                    </p>
                                </div>
                            </div>

                            {activeJob.status === "Processing" && (
                                <div className="w-full md:w-64 space-y-2">
                                    <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                                        <span>AI Pipeline Progress</span>
                                        <span className="text-indigo-400">{activeJob.progress || 15}%</span>
                                    </div>
                                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${activeJob.progress || 15}%` }}
                                            className="h-full bg-gradient-to-r from-indigo-500 to-[#5C67F2] rounded-full"
                                        />
                                    </div>
                                </div>
                            )}

                            {activeJob.status === "Completed" && activeJob.extractedQuestions && (
                                <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                                    <Button
                                        onClick={() => handleToggleSelectAll(activeJob.extractedQuestions)}
                                        variant="outline"
                                        className="h-10 px-5 rounded-full font-bold text-xs border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
                                    >
                                        {selectedQuestionIds.length === activeJob.extractedQuestions.length ? "Deselect All" : "Select All"}
                                    </Button>
                                    <Button
                                        onClick={() => handleBulkApprove(activeJob.extractedQuestions)}
                                        disabled={bulkApproveMutation.isPending}
                                        className="h-10 px-6 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full font-black text-xs tracking-widest uppercase shadow-md shadow-emerald-900/20 flex items-center gap-2"
                                    >
                                        <Database className="w-4 h-4" /> Approve Selected ({selectedQuestionIds.length})
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* Interactive Review Tabs */}
                        {activeJob.status === "Completed" && (
                            <div className="p-6 space-y-6">
                                {/* Navigation Tabs */}
                                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setActiveTab("questions")}
                                            className={`px-6 py-2.5 rounded-full font-black text-xs tracking-wider transition-all flex items-center gap-2 ${activeTab === "questions" ? "bg-indigo-50 text-[#5C67F2] shadow-sm" : "text-slate-500 hover:bg-slate-50"}`}
                                        >
                                            <FileCode className="w-4 h-4" /> Extracted Questions ({activeJob.extractedQuestions?.length || 0})
                                        </button>
                                        <button
                                            onClick={() => setActiveTab("tables")}
                                            className={`px-6 py-2.5 rounded-full font-black text-xs tracking-wider transition-all flex items-center gap-2 ${activeTab === "tables" ? "bg-indigo-50 text-[#5C67F2] shadow-sm" : "text-slate-500 hover:bg-slate-50"}`}
                                        >
                                            <FileSpreadsheet className="w-4 h-4" /> Extracted Tables ({activeJob.tables?.length || 0})
                                        </button>
                                        <button
                                            onClick={() => setActiveTab("images")}
                                            className={`px-6 py-2.5 rounded-full font-black text-xs tracking-wider transition-all flex items-center gap-2 ${activeTab === "images" ? "bg-indigo-50 text-[#5C67F2] shadow-sm" : "text-slate-500 hover:bg-slate-50"}`}
                                        >
                                            <ImageIcon className="w-4 h-4" /> Extracted Diagrams ({activeJob.images?.length || 0})
                                        </button>
                                        <button
                                            onClick={() => setActiveTab("raw")}
                                            className={`px-6 py-2.5 rounded-full font-black text-xs tracking-wider transition-all flex items-center gap-2 ${activeTab === "raw" ? "bg-indigo-50 text-[#5C67F2] shadow-sm" : "text-slate-500 hover:bg-slate-50"}`}
                                        >
                                            <BookOpen className="w-4 h-4" /> Raw OCR Text
                                        </button>
                                    </div>
                                </div>

                                {/* Tab Contents */}
                                <AnimatePresence mode="popLayout">
                                    {activeTab === "questions" && (
                                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                                            {activeJob.extractedQuestions?.map((q: any, idx: number) => {
                                                const qId = q.questionNumber || q.questionText;
                                                const isSelected = selectedQuestionIds.includes(qId);
                                                return (
                                                    <Card key={idx} className={`border transition-all rounded-2xl overflow-hidden ${isSelected ? "border-[#5C67F2] shadow-md shadow-indigo-100 bg-indigo-50/10" : "border-gray-100 bg-white hover:border-gray-200 shadow-sm"}`}>
                                                        <div className="p-6 flex items-start gap-6">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleToggleSelectOne(qId)}
                                                                className={`mt-1 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${isSelected ? "bg-[#5C67F2] border-[#5C67F2] text-white" : "border-gray-300 bg-white hover:border-gray-400"}`}
                                                            >
                                                                {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                                                            </button>

                                                            <div className="flex-1 space-y-4">
                                                                <div className="flex flex-wrap items-center justify-between gap-4">
                                                                    <div className="flex items-center gap-3">
                                                                        <Badge className="font-black text-xs px-3 py-1 bg-slate-900 text-white rounded-xl">
                                                                            Q{q.questionNumber || idx + 1}
                                                                        </Badge>
                                                                        <Badge variant="outline" className="font-bold text-xs bg-slate-50 text-slate-700 border-gray-200 px-3 py-1 rounded-xl">
                                                                            {q.questionType || "Essay"}
                                                                        </Badge>
                                                                        <Badge variant="outline" className="font-bold text-xs bg-indigo-50 text-[#5C67F2] border-indigo-100 px-3 py-1 rounded-xl">
                                                                            {q.bloomLevel || "Applying"}
                                                                        </Badge>
                                                                        <Badge variant="outline" className={`font-bold text-xs px-3 py-1 rounded-xl ${q.difficulty === "HARD" ? "bg-rose-50 text-rose-600 border-rose-100" : q.difficulty === "EASY" ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-amber-50 text-amber-600 border-amber-100"}`}>
                                                                            {q.difficulty || "MEDIUM"}
                                                                        </Badge>
                                                                    </div>

                                                                    <div className="flex items-center gap-4">
                                                                        <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-700 font-bold text-xs">
                                                                            <Sparkles className="w-3.5 h-3.5" />
                                                                            <span>{Math.round((q.aiConfidence || 0.95) * 100)}% Match</span>
                                                                        </div>
                                                                        <span className="font-black text-xs text-slate-700">{q.marks || 5} Marks</span>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            onClick={() => setEditingQuestion(q)}
                                                                            className="h-8 px-3 rounded-xl font-bold text-xs text-indigo-600 hover:bg-indigo-50"
                                                                        >
                                                                            <Edit3 className="w-4 h-4 mr-1.5" /> Edit
                                                                        </Button>
                                                                    </div>
                                                                </div>

                                                                <p className="text-sm font-bold text-slate-800 leading-relaxed">
                                                                    {q.questionText}
                                                                </p>

                                                                {q.subQuestions && q.subQuestions.length > 0 && (
                                                                    <div className="pl-6 space-y-2 border-l-2 border-indigo-100 pt-2">
                                                                        {q.subQuestions.map((sub: any, sIdx: number) => (
                                                                            <div key={sIdx} className="flex items-start justify-between gap-4 text-xs font-semibold text-slate-700 bg-slate-50/50 p-3 rounded-xl border border-gray-100">
                                                                                <span>({sub.label}) {sub.text}</span>
                                                                                <span className="font-bold text-slate-500 shrink-0">{sub.marks || 2} Marks</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}

                                                                {q.options && q.options.length > 0 && (
                                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                                                                        {q.options.map((opt: string, oIdx: number) => (
                                                                            <div key={oIdx} className="p-3 rounded-xl bg-slate-50 border border-gray-100 text-xs font-bold text-slate-700 flex items-center gap-3">
                                                                                <span className="w-5 h-5 rounded-full bg-white border border-gray-200 flex items-center justify-center text-[10px] font-black text-slate-500">{opt.charAt(0)}</span>
                                                                                <span className="truncate">{opt.substring(2)}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </Card>
                                                );
                                            })}
                                        </motion.div>
                                    )}

                                    {activeTab === "tables" && (
                                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                                            {activeJob.tables?.map((table: any, tIdx: number) => (
                                                <Card key={tIdx} className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                                                    <div className="p-4 bg-slate-50 border-b border-gray-100 flex items-center justify-between font-bold text-xs text-slate-700">
                                                        <span>Extracted Table #{tIdx + 1} (Page {table.page || 1})</span>
                                                        <Badge variant="outline" className="bg-white border-gray-200 font-bold text-[10px]">Data Grid</Badge>
                                                    </div>
                                                    <div className="p-6 overflow-x-auto">
                                                        <table className="w-full text-left border-collapse">
                                                            <thead>
                                                                <tr className="border-b border-gray-200 bg-slate-50/50">
                                                                    {table.content[0]?.map((h: string, hIdx: number) => (
                                                                        <th key={hIdx} className="p-3 font-black text-xs text-slate-800 uppercase tracking-wider">{h}</th>
                                                                    ))}
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {table.content.slice(1).map((row: string[], rIdx: number) => (
                                                                    <tr key={rIdx} className="border-b border-gray-100 hover:bg-slate-50/30">
                                                                        {row.map((cell: string, cIdx: number) => (
                                                                            <td key={cIdx} className="p-3 text-xs font-medium text-slate-600">{cell}</td>
                                                                        ))}
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </Card>
                                            ))}
                                        </motion.div>
                                    )}

                                    {activeTab === "images" && (
                                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                                            {activeJob.images?.map((img: any, iIdx: number) => (
                                                <Card key={iIdx} className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm group">
                                                    <div className="h-48 bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
                                                        <img src={img.data} alt="Extracted diagram" className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300" />
                                                        <Badge className="absolute top-3 right-3 font-black text-[10px] bg-slate-900/80 backdrop-blur-md text-white border-0">
                                                            Page {img.page || 1}
                                                        </Badge>
                                                    </div>
                                                    <div className="p-4 bg-white border-t border-gray-100 flex items-center justify-between">
                                                        <span className="text-xs font-bold text-slate-700">Diagram #{iIdx + 1}</span>
                                                        <Button variant="outline" size="sm" onClick={() => window.open(img.data, "_blank")} className="h-8 rounded-xl font-bold text-xs border-gray-200">View Full</Button>
                                                    </div>
                                                </Card>
                                            ))}
                                        </motion.div>
                                    )}

                                    {activeTab === "raw" && (
                                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                            <Card className="border border-gray-100 rounded-2xl p-6 shadow-sm bg-white">
                                                <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-4">Raw OCR Engine Output Buffer</h4>
                                                <div className="p-6 bg-slate-900 rounded-xl text-slate-200 font-mono text-xs leading-relaxed max-h-96 overflow-y-auto whitespace-pre-wrap custom-scrollbar">
                                                    {activeJob.rawText || "No raw text available."}
                                                </div>
                                            </Card>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}
                    </Card>
                )}

                {/* OCR Jobs History Table */}
                <Card className="border-0 shadow-sm bg-white rounded-2xl overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                        <h3 className="text-base font-black text-slate-800 tracking-tight flex items-center gap-2">
                            <Database className="w-5 h-5 text-[#5C67F2]" /> Ingestion & OCR Processing Logs
                        </h3>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => queryClient.invalidateQueries({ queryKey: ["ocr_jobs_history"] })}
                            className="h-9 px-4 rounded-xl font-bold text-xs border-gray-200 text-slate-600 flex items-center gap-2"
                        >
                            <RefreshCw className="w-3.5 h-3.5" /> Refresh Logs
                        </Button>
                    </div>

                    <div className="p-0 overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-100 bg-slate-50/50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    <th className="py-4 px-6">Document Name</th>
                                    <th className="py-4 px-6">Job ID</th>
                                    <th className="py-4 px-6">Status</th>
                                    <th className="py-4 px-6">Questions Extracted</th>
                                    <th className="py-4 px-6">Timestamp</th>
                                    <th className="py-4 px-6 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="text-xs font-medium text-slate-600 divide-y divide-gray-100">
                                {jobsHistory.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-12 text-center text-slate-400 font-bold">No previous AI extraction jobs found.</td>
                                    </tr>
                                ) : (
                                    jobsHistory.map((job: any) => (
                                        <tr key={job.jobId} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="py-4 px-6 font-bold text-slate-800 flex items-center gap-3">
                                                <FileText className="w-4 h-4 text-[#5C67F2]" />
                                                <span>{job.filename || "scanned_document.pdf"}</span>
                                            </td>
                                            <td className="py-4 px-6 font-mono text-slate-400">{job.jobId}</td>
                                            <td className="py-4 px-6">
                                                <Badge className={`font-black text-[10px] px-3 py-0.5 rounded-full uppercase tracking-wider ${job.status === "Processing" ? "bg-amber-50 text-amber-600 border border-amber-100" : "bg-emerald-50 text-emerald-600 border border-emerald-100"}`}>
                                                    {job.status}
                                                </Badge>
                                            </td>
                                            <td className="py-4 px-6 font-black text-slate-700">{job.extractedQuestions?.length || 0} Units</td>
                                            <td className="py-4 px-6 text-slate-400">{new Date(job.createdAt).toLocaleDateString()} {new Date(job.createdAt).toLocaleTimeString()}</td>
                                            <td className="py-4 px-6 text-right space-x-2">
                                                <Button
                                                    variant="outline" size="sm"
                                                    onClick={() => setActiveJobId(job.jobId)}
                                                    className="h-8 px-3 rounded-xl font-bold text-xs border-gray-200 text-indigo-600 hover:bg-indigo-50"
                                                >
                                                    View Results
                                                </Button>
                                                <Button
                                                    variant="ghost" size="sm"
                                                    onClick={() => deleteJobMutation.mutate(job.jobId)}
                                                    className="h-8 w-8 p-0 rounded-xl text-rose-500 hover:bg-rose-50"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>

            {/* Edit Question Modal */}
            <Dialog open={!!editingQuestion} onOpenChange={() => setEditingQuestion(null)}>
                <DialogContent className="max-w-2xl rounded-[2rem] border-0 shadow-2xl p-0 overflow-hidden bg-white">
                    <div className="h-2 bg-[#5C67F2]" />
                    <div className="p-8 space-y-6 max-h-[85vh] overflow-y-auto custom-scrollbar">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-black text-slate-800">Edit Extracted Question Unit</DialogTitle>
                            <DialogDescription className="text-xs font-medium text-slate-400">Modify OCR text, adjust difficulty, or realign Bloom's taxonomy before saving to bank.</DialogDescription>
                        </DialogHeader>

                        {editingQuestion && (
                            <div className="space-y-6 pt-2">
                                <div className="space-y-2">
                                    <Label className="text-xs font-black text-slate-700 uppercase tracking-wider">Question Text</Label>
                                    <Textarea
                                        value={editingQuestion.questionText}
                                        onChange={e => setEditingQuestion({ ...editingQuestion, questionText: e.target.value })}
                                        className="min-h-[100px] rounded-2xl bg-slate-50 border-none font-bold p-4 shadow-none text-xs leading-relaxed"
                                    />
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-black text-slate-700 uppercase tracking-wider">Question Type</Label>
                                        <Select value={editingQuestion.questionType} onValueChange={v => setEditingQuestion({ ...editingQuestion, questionType: v })}>
                                            <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-none font-bold text-xs shadow-none"><SelectValue /></SelectTrigger>
                                            <SelectContent className="rounded-xl border-border/50 shadow-2xl text-xs">
                                                {questionTypes.map(qt => <SelectItem key={qt} value={qt} className="font-bold text-xs">{qt}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-black text-slate-700 uppercase tracking-wider">Bloom Level</Label>
                                        <Select value={editingQuestion.bloomLevel} onValueChange={v => setEditingQuestion({ ...editingQuestion, bloomLevel: v })}>
                                            <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-none font-bold text-xs shadow-none"><SelectValue /></SelectTrigger>
                                            <SelectContent className="rounded-xl border-border/50 shadow-2xl text-xs">
                                                {bloomLevels.map(bl => <SelectItem key={bl} value={bl} className="font-bold text-xs">{bl}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-black text-slate-700 uppercase tracking-wider">Difficulty</Label>
                                        <Select value={editingQuestion.difficulty} onValueChange={v => setEditingQuestion({ ...editingQuestion, difficulty: v })}>
                                            <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-none font-bold text-xs shadow-none"><SelectValue /></SelectTrigger>
                                            <SelectContent className="rounded-xl border-border/50 shadow-2xl text-xs">
                                                <SelectItem value="EASY" className="font-bold text-xs">EASY</SelectItem>
                                                <SelectItem value="MEDIUM" className="font-bold text-xs">MEDIUM</SelectItem>
                                                <SelectItem value="HARD" className="font-bold text-xs">HARD</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-black text-slate-700 uppercase tracking-wider">Marks</Label>
                                        <Input
                                            type="number"
                                            value={editingQuestion.marks}
                                            onChange={e => setEditingQuestion({ ...editingQuestion, marks: Number(e.target.value) })}
                                            className="h-12 rounded-xl bg-slate-50 border-none font-bold px-4 shadow-none text-xs"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-black text-slate-700 uppercase tracking-wider">Tags (Comma separated)</Label>
                                        <Input
                                            value={Array.isArray(editingQuestion.tags) ? editingQuestion.tags.join(", ") : editingQuestion.tags}
                                            onChange={e => setEditingQuestion({ ...editingQuestion, tags: e.target.value.split(",").map((t: string) => t.trim()) })}
                                            className="h-12 rounded-xl bg-slate-50 border-none font-bold px-4 shadow-none text-xs"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        <DialogFooter className="mt-8 flex !flex-row gap-3 pt-4 border-t border-gray-100">
                            <Button variant="outline" onClick={() => setEditingQuestion(null)} className="flex-1 h-12 rounded-full font-bold border-gray-200">Cancel</Button>
                            <Button onClick={handleSaveEdit} className="flex-[2] h-12 rounded-full font-black shadow-lg shadow-indigo-100 bg-[#5C67F2] hover:bg-[#4a54c4] text-white flex items-center gap-2">
                                <Save className="w-4 h-4" /> Save Changes
                            </Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
