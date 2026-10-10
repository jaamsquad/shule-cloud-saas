import { useState } from "react";
import {
    Search, Plus, FileText, Sparkles, Printer, Download, CheckCircle,
    Clock, HelpCircle, Layers, Filter, Check, X, Eye, BookOpen,
    Wand2, Calculator, Settings2, Trash2, ArrowUpDown, ChevronRight,
    QrCode, FileCheck, FileDown, ShieldCheck, AlertCircle, Home, Edit
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
import { API_ORIGIN } from "@/lib/config";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { openPrintDoc } from "@/lib/pdfDoc";

// ─── Utility: open a dedicated print window with just the exam paper HTML ───
function printExamPaper(paper: any, answerLinesCount: number, schoolName: string, schoolLogo: string) {
    const buildAnswerLines = (count: number) =>
        count > 0
            ? Array.from({ length: count })
                .map(() => `<div style="border-bottom:1px dotted #999;height:22px;width:100%;margin-bottom:4px;"></div>`)
                .join("")
            : "";

    const buildOptions = (options: string[]) =>
        options
            .filter(Boolean)
            .map(
                (opt, i) =>
                    `<div style="display:flex;gap:8px;font-size:12px;margin-bottom:4px;">
                        <span style="font-weight:900;">(${String.fromCharCode(65 + i)})</span>
                        <span>${opt.replace(/^[A-E][\.\)]\s*/, "")}</span>
                    </div>`
            )
            .join("");

    const buildSubQuestions = (subs: any[], answerLines: number) =>
        subs
            .map(
                (sub) =>
                    `<div style="margin-left:24px;margin-bottom:10px;">
                        <div style="display:flex;gap:8px;font-size:12px;font-weight:700;">
                            <span style="font-weight:900;">${sub.label})</span>
                            <span style="white-space:pre-wrap;">${sub.text}</span>
                        </div>
                        ${buildAnswerLines(answerLines)}
                    </div>`
            )
            .join("");

    const buildQuestions = (questions: any[]) =>
        questions
            .map((q, qIdx) => {
                const isMCQ = q.options && Array.isArray(q.options) && q.options.some(Boolean);
                const hasSubQ = q.subQuestions && Array.isArray(q.subQuestions) && q.subQuestions.length > 0;
                const num = q.questionNumber ? `${q.questionNumber}.` : `${qIdx + 1}.`;
                return `
                    <div style="margin-bottom:20px;">
                        <div style="display:flex;gap:10px;font-size:12px;font-weight:700;color:#111;line-height:1.6;">
                            <span style="font-weight:900;flex-shrink:0;">${num}</span>
                            <p style="flex:1;white-space:pre-wrap;margin:0;">${q.questionText || q.content || ""}</p>
                        </div>
                        ${hasSubQ ? buildSubQuestions(q.subQuestions, answerLinesCount) : ""}
                        ${isMCQ ? `<div style="margin-left:24px;margin-top:6px;">${buildOptions(q.options)}</div>` : ""}
                        ${!hasSubQ && !isMCQ ? buildAnswerLines(answerLinesCount) : ""}
                    </div>`;
            })
            .join("");

    const buildSections = () => {
        if (paper.sections && Array.isArray(paper.sections)) {
            return paper.sections
                .map(
                    (sec: any) => `
                    <div style="margin-bottom:32px;">
                        <div style="border-bottom:1px solid #333;padding-bottom:6px;margin-bottom:16px;">
                            <h4 style="font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:0.15em;color:#111;margin:0;">${sec.sectionName}</h4>
                        </div>
                        <div style="padding-left:8px;">${buildQuestions(sec.questions || [])}</div>
                    </div>`
                )
                .join("");
        }
        if (paper.generatedQuestions && Array.isArray(paper.generatedQuestions)) {
            return `<div style="padding-left:8px;">${buildQuestions(paper.generatedQuestions)}</div>`;
        }
        return "";
    };

    const logoHtml = schoolLogo
        ? `<img src="${schoolLogo}" alt="Logo" style="width:72px;height:72px;object-fit:contain;margin-bottom:8px;" />`
        : `<div style="width:60px;height:60px;border-radius:50%;border:1px solid #ccc;display:flex;align-items:center;justify-content:center;margin-bottom:8px;"><svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/></svg></div>`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${paper.paperTitle || "Examination Paper"}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: "Times New Roman", Times, serif;
      background: white;
      color: #111;
      padding: 40px 48px;
    }
    @media print {
      body { padding: 24px 32px; }
      @page { margin: 1.2cm; }
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div style="text-align:center;position:relative;padding-bottom:24px;margin-bottom:24px;">
    <div style="position:absolute;right:0;top:0;font-size:36px;">▦</div>
    <div style="display:flex;flex-direction:column;align-items:center;gap:6px;">
      ${logoHtml}
      <h2 style="font-size:20px;font-weight:900;text-transform:uppercase;text-decoration:underline;letter-spacing:0.05em;">${schoolName || "INSTITUTION NAME"}</h2>
    </div>
    <h3 style="font-size:16px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin-top:6px;">${paper.paperTitle || "EXAMINATION PAPER"}</h3>
    <div style="display:flex;justify-content:center;gap:40px;margin-top:8px;font-size:13px;font-weight:700;text-transform:uppercase;">
      <span>TIME: ${paper.duration || 120} MINUTES</span>
      <span>TOTAL MARKS: ${paper.totalMarks || 100}</span>
    </div>
  </div>

  <!-- Candidate Info -->
  <div style="border:2px solid #111;padding:16px 20px;border-radius:8px;display:flex;gap:32px;margin-bottom:28px;">
    <div style="flex:1;display:flex;align-items:flex-end;gap:8px;">
      <span style="font-size:13px;font-weight:700;white-space:nowrap;">CANDIDATE NAME:</span>
      <div style="flex:1;border-bottom:2px dotted #111;height:20px;"></div>
    </div>
    <div style="flex:0.55;display:flex;align-items:flex-end;gap:8px;">
      <span style="font-size:13px;font-weight:700;white-space:nowrap;">ADM NO:</span>
      <div style="flex:1;border-bottom:2px dotted #111;height:20px;"></div>
    </div>
  </div>

  <!-- Instructions -->
  <div style="margin-bottom:20px;">
    <h4 style="font-size:13px;font-weight:700;text-transform:uppercase;text-decoration:underline;margin-bottom:8px;">INSTRUCTIONS TO CANDIDATES:</h4>
    <p style="font-size:13px;font-weight:500;white-space:pre-wrap;line-height:1.7;">${paper.instructions || "Answer all questions in the provided booklet."}</p>
  </div>

  <hr style="border:none;border-top:2px solid #111;margin-bottom:28px;" />

  <!-- Sections & Questions -->
  ${buildSections()}

  <script>
    window.addEventListener('DOMContentLoaded', () => {
      const doPrint = () => {
        setTimeout(() => {
          window.focus();
          window.print();
          window.close();
        }, 300);
      };
      
      const imgs = document.querySelectorAll('img');
      if (imgs.length === 0) {
        doPrint();
      } else {
        let loaded = 0;
        const total = imgs.length;
        const checkReady = () => {
          loaded++;
          if (loaded === total) {
            doPrint();
          }
        };
        imgs.forEach(img => {
          if (img.complete) {
            checkReady();
          } else {
            img.addEventListener('load', checkReady);
            img.addEventListener('error', checkReady);
          }
        });
      }
    });
  </script>
</body>
</html>`;

    const printWin = openPrintDoc();
    if (!printWin) {
        alert("Please allow pop-ups to enable printing.");
        return;
    }
    printWin.document.open();
    printWin.document.write(html);
    printWin.document.close();
}

// ────────────────────────────────────────────────────────────────────────────

export default function CreateQuestionPaper() {
    const [search, setSearch] = useState("");
    const [selectedSubject, setSelectedSubject] = useState<string>("ALL");
    const [selectedClass, setSelectedClass] = useState<string>("ALL");
    const [showPreviewModal, setShowPreviewModal] = useState<any>(null);
    const [answerLinesCount, setAnswerLinesCount] = useState<number>(0);

    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const { data: questionPapers = [], isLoading } = useQuery<any[]>({
        queryKey: ["question_papers"],
        queryFn: async () => {
            const r = await api.get("/question-papers");
            return r.data || [];
        },
    });

    const { data: tenantProfile } = useQuery<any>({
        queryKey: ["tenant_profile_global"],
        queryFn: async () => {
            const r = await api.get("/auth/tenant/profile");
            return Array.isArray(r.data) ? r.data[0] : r.data;
        },
    });

    const schoolName = tenantProfile?.name || tenantProfile?.schoolName || tenantProfile?.instituteName || "";
    const schoolLogo = tenantProfile?.logo || tenantProfile?.logoUrl || "";
    const schoolTagline = tenantProfile?.targetLine || tenantProfile?.tagline || "";

    const { data: subjects = [] } = useQuery({ queryKey: ["subjects"], queryFn: async () => (await api.get("/subjects")).data || [] });
    const { data: classes = [] } = useQuery({ queryKey: ["classes"], queryFn: async () => (await api.get("/classes")).data || [] });
    const { data: exams = [] } = useQuery({ queryKey: ["exams"], queryFn: async () => (await api.get("/exams")).data || [] });

    const { data: periods = [] } = useQuery<any[]>({
        queryKey: ["periods"],
        queryFn: async () => (await api.get("/academics/periods")).data || [],
    });
    const currentPeriod = periods.find((p: any) => p.isCurrent) || periods[0];

    const publishMutation = useMutation({
        mutationFn: (id: string) => api.patch(`/question-papers/${id}/publish`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["question_papers"] });
            toast.success("Question paper published for institutional printing");
        },
    });

    const approveMutation = useMutation({
        mutationFn: (id: string) => api.patch(`/question-papers/${id}/approve`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["question_papers"] });
            toast.success("Question paper approved by Examination Board");
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/question-papers/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["question_papers"] });
            toast.success("Question paper purged from active registry");
        },
    });

    const handleExportPDF = (paper: any) => {
        const id = paper?._id || paper?.examId;
        toast.success(`Exporting ${paper?.paperTitle || "Exam"} to print-ready PDF`);
        setTimeout(() => { window.open(`${API_ORIGIN}/api/v1/exams/${id}/pdf`, "_blank"); }, 1000);
    };

    const handleExportWord = (paper: any) => {
        const id = paper?._id || paper?.examId;
        toast.success(`Exporting ${paper?.paperTitle || "Exam"} to Word DOCX`);
        setTimeout(() => { window.open(`${API_ORIGIN}/api/v1/exams/${id}/word`, "_blank"); }, 1000);
    };

    // ── Print handler used by BOTH the card button and the modal button ──
    const handlePrint = (paper: any) => {
        printExamPaper(paper, answerLinesCount, schoolName, schoolLogo);
    };

    const filteredPapers = questionPapers.filter((qp: any) => {
        const matchesSearch =
            (qp.paperTitle || "").toLowerCase().includes(search.toLowerCase()) ||
            (qp.instructions || "").toLowerCase().includes(search.toLowerCase());
        const matchesSubject = selectedSubject === "ALL" || qp.subjectId === selectedSubject;
        const matchesClass = selectedClass === "ALL" || qp.classId === selectedClass;
        return matchesSearch && matchesSubject && matchesClass;
    });

    const totalPublished = questionPapers.filter((qp: any) => qp.status === "Published").length;
    const totalApproved = questionPapers.filter((qp: any) => qp.approvalStatus === "Approved").length;

    return (
        <div className="flex-1 bg-[#f3f4f6] min-h-screen flex flex-col overflow-y-auto pb-20">
            {/* Top bar */}
            <div className="w-full bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-2 text-sm">
                    <Home className="w-4 h-4 text-[#5C67F2]" />
                    <span className="text-gray-300">/</span>
                    <span className="font-bold text-gray-600">Question Paper</span>
                    <span className="text-gray-300">/</span>
                    <span className="font-black text-[#5C67F2]">Create Question Paper</span>
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
                        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Create Question Paper</h1>
                        <p className="text-slate-400 text-sm font-medium mt-1">
                            Intelligent exam builder with automated blueprinting, difficulty balancing & QR verification
                        </p>
                    </div>
                    <button
                        onClick={() => navigate("/papers/create/new")}
                        className="flex items-center gap-2 px-6 py-2.5 bg-[#5C67F2] hover:bg-[#4a54c4] text-white rounded-full font-black text-xs tracking-widest uppercase shadow-md shadow-indigo-100 transition-all"
                    >
                        <Plus className="w-4 h-4" /> CREATE NEW PAPER
                    </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card className="border-0 shadow-soft bg-background/50 backdrop-blur-md overflow-hidden group">
                        <CardContent className="p-6 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground group-hover:text-primary transition-colors">Total Papers</p>
                                <p className="text-3xl font-black mt-1">{isLoading ? "---" : questionPapers.length}</p>
                            </div>
                            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:scale-110 transition-transform">
                                <FileText className="w-7 h-7 text-primary" />
                            </div>
                        </CardContent>
                        <div className="h-1.5 w-full bg-primary/20" />
                    </Card>
                    <Card className="border-0 shadow-soft bg-background/50 backdrop-blur-md overflow-hidden group">
                        <CardContent className="p-6 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">Published Papers</p>
                                <p className="text-3xl font-black mt-1">{totalPublished}</p>
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
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500">Board Approved</p>
                                <p className="text-3xl font-black mt-1">{totalApproved}</p>
                            </div>
                            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 group-hover:scale-110 transition-transform">
                                <ShieldCheck className="w-7 h-7 text-indigo-500" />
                            </div>
                        </CardContent>
                        <div className="h-1.5 w-full bg-indigo-500/20" />
                    </Card>
                    <Card className="border-0 shadow-soft bg-background/50 backdrop-blur-md overflow-hidden group">
                        <CardContent className="p-6 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500">Avg. Duration</p>
                                <p className="text-3xl font-black mt-1">120m</p>
                            </div>
                            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 group-hover:scale-110 transition-transform">
                                <Clock className="w-7 h-7 text-amber-500" />
                            </div>
                        </CardContent>
                        <div className="h-1.5 w-full bg-amber-500/20" />
                    </Card>
                </div>

                {/* Toolbar */}
                <div className="flex flex-col xl:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto flex-1">
                        <div className="relative w-full sm:w-72">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Search paper title/instructions..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-11 h-12 bg-slate-50 border-none rounded-xl shadow-none focus-visible:ring-2 focus-visible:ring-indigo-500/20 font-bold text-xs"
                            />
                        </div>
                        <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                            <SelectTrigger className="h-12 w-full sm:w-48 rounded-xl bg-slate-50 border-none font-bold text-xs uppercase tracking-wider shadow-none">
                                <SelectValue placeholder="Subject" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-border/50 shadow-2xl">
                                <SelectItem value="ALL" className="font-bold text-xs">ALL SUBJECTS</SelectItem>
                                {subjects.map((s: any) => (
                                    <SelectItem key={s._id} value={s._id} className="font-bold text-xs">{s.name || s.subjectName}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={selectedClass} onValueChange={setSelectedClass}>
                            <SelectTrigger className="h-12 w-full sm:w-48 rounded-xl bg-slate-50 border-none font-bold text-xs uppercase tracking-wider shadow-none">
                                <SelectValue placeholder="Class" />
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

                {/* Papers List */}
                <div className="space-y-4">
                    <AnimatePresence mode="popLayout">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-32 gap-4">
                                <div className="w-12 h-12 border-4 border-primary/10 border-t-primary rounded-full animate-spin" />
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Loading Examination Papers...</p>
                            </div>
                        ) : filteredPapers.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-32 gap-4 glass-card rounded-[3rem] text-center p-8">
                                <AlertCircle className="w-16 h-16 text-muted-foreground/20" />
                                <h3 className="text-lg font-black text-slate-700">No Question Papers Found</h3>
                                <p className="text-xs font-medium text-slate-400 max-w-sm">
                                    No question papers match your current search and filter criteria.
                                </p>
                            </div>
                        ) : (
                            filteredPapers.map((qp: any, i: number) => {
                                const subObj = subjects.find((s: any) => s._id === qp.subjectId);
                                const clsObj = classes.find((c: any) => c._id === qp.classId);
                                return (
                                    <motion.div
                                        key={qp._id || i}
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
                                                            <Badge variant="outline" className="text-[10px] font-black uppercase px-3 py-1 bg-primary/10 text-primary border-none">
                                                                VERSION {qp.version || "1.0"}
                                                            </Badge>
                                                            <Badge variant="outline" className="text-[10px] font-black uppercase px-3 py-1 bg-slate-100 text-slate-600 border-none">
                                                                {subObj?.name || subObj?.subjectName || "General Subject"}
                                                            </Badge>
                                                            <Badge variant="outline" className="text-[10px] font-black uppercase px-3 py-1 bg-indigo-50 text-indigo-600 border-none">
                                                                {clsObj?.levelName || clsObj?.name || "All Classes"}
                                                            </Badge>
                                                            <Badge variant="outline" className={`text-[10px] font-black uppercase px-3 py-1 border-none ${qp.status === "Published" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>
                                                                {qp.status || "Draft"}
                                                            </Badge>
                                                            <Badge variant="outline" className={`text-[10px] font-black uppercase px-3 py-1 border-none ${qp.approvalStatus === "Approved" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
                                                                {qp.approvalStatus || "Pending Approval"}
                                                            </Badge>
                                                            <span className="text-[10px] font-black text-slate-400 ml-auto font-mono">
                                                                {qp.duration || 120} MINS • {qp.totalMarks || 100} MARKS
                                                            </span>
                                                        </div>
                                                        <h3 className="text-lg font-black text-slate-800 tracking-tight group-hover:text-primary transition-colors">
                                                            {qp.paperTitle || "Generated Examination Paper"}
                                                        </h3>
                                                        <p className="text-xs font-medium text-slate-500 line-clamp-2 leading-relaxed whitespace-pre-wrap">
                                                            {qp.instructions || "No specific instructions configured for this examination."}
                                                        </p>
                                                        {qp.sections && Array.isArray(qp.sections) && (
                                                            <div className="flex flex-wrap gap-4 pt-2 border-t border-slate-100 mt-2">
                                                                {qp.sections.map((sec: any, sIdx: number) => (
                                                                    <div key={sIdx} className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                                                                        <Layers className="w-3.5 h-3.5 text-primary" />
                                                                        <span>{sec.sectionName}:</span>
                                                                        <span className="text-primary font-black">{sec.questions?.length || 0} Questions</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-2 w-full lg:w-auto justify-end border-t lg:border-t-0 pt-4 lg:pt-0">
                                                        <Button
                                                            onClick={() => setShowPreviewModal(qp)}
                                                            variant="ghost" size="sm"
                                                            className="h-9 rounded-xl font-bold text-xs gap-1 hover:bg-slate-100 text-indigo-600"
                                                        >
                                                            <Eye className="w-4 h-4" /> Live Preview
                                                        </Button>

                                                        {/* ── Print button directly on the card ── */}
                                                        <Button
                                                            onClick={() => handlePrint(qp)}
                                                            variant="ghost" size="sm"
                                                            className="h-9 rounded-xl font-bold text-xs gap-1 hover:bg-slate-100 text-slate-700"
                                                        >
                                                            <Printer className="w-4 h-4" /> Print
                                                        </Button>

                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-slate-100">
                                                                    <Settings2 className="w-4 h-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" className="rounded-2xl border-border/50 shadow-2xl p-1 w-52">
                                                                <DropdownMenuItem onClick={() => setShowPreviewModal(qp)} className="rounded-xl font-bold py-2.5 text-xs">
                                                                    <Eye className="w-3.5 h-3.5 mr-3 text-indigo-500" /> Print-Ready Preview
                                                                </DropdownMenuItem>
                                                                {qp.status !== "Published" && (
                                                                    <DropdownMenuItem onClick={() => navigate(`/papers/create/new/${qp._id}`)} className="rounded-xl font-bold py-2.5 text-xs">
                                                                        <Edit className="w-3.5 h-3.5 mr-3 text-blue-500" /> Edit Paper
                                                                    </DropdownMenuItem>
                                                                )}
                                                                <DropdownMenuItem onClick={() => handlePrint(qp)} className="rounded-xl font-bold py-2.5 text-xs">
                                                                    <Printer className="w-3.5 h-3.5 mr-3 text-slate-600" /> Print Paper
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => handleExportPDF(qp)} className="rounded-xl font-bold py-2.5 text-xs">
                                                                    <FileDown className="w-3.5 h-3.5 mr-3 text-emerald-500" /> Export to PDF (with QR)
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => handleExportWord(qp)} className="rounded-xl font-bold py-2.5 text-xs">
                                                                    <FileCheck className="w-3.5 h-3.5 mr-3 text-blue-500" /> Export to Word DOCX
                                                                </DropdownMenuItem>
                                                                {qp.status !== "Published" && (
                                                                    <DropdownMenuItem onClick={() => publishMutation.mutate(qp._id)} className="rounded-xl font-bold py-2.5 text-xs text-emerald-600">
                                                                        <CheckCircle className="w-3.5 h-3.5 mr-3" /> Publish Paper
                                                                    </DropdownMenuItem>
                                                                )}
                                                                {qp.approvalStatus !== "Approved" && (
                                                                    <DropdownMenuItem onClick={() => approveMutation.mutate(qp._id)} className="rounded-xl font-bold py-2.5 text-xs text-purple-600">
                                                                        <ShieldCheck className="w-3.5 h-3.5 mr-3" /> Board Approve
                                                                    </DropdownMenuItem>
                                                                )}
                                                                <DropdownMenuItem onClick={() => deleteMutation.mutate(qp._id)} className="text-rose-500 rounded-xl font-bold py-2.5 text-xs">
                                                                    <Trash2 className="w-3.5 h-3.5 mr-3" /> Purge Paper
                                                                </DropdownMenuItem>
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

            {/* Preview Modal — no print CSS hacks needed; printing is handled via popup window */}
            <Dialog open={!!showPreviewModal} onOpenChange={() => setShowPreviewModal(null)}>
                <DialogContent className="max-w-4xl rounded-[3rem] border-0 shadow-2xl p-0 overflow-hidden bg-white">
                    <div className="h-3 bg-slate-900" />
                    <div id="printable-exam-paper" className="p-12 max-h-[85vh] overflow-y-auto custom-scrollbar">
                        {/* Paper Header */}
                        <div className="pb-6 mb-6 text-center relative">
                            <div className="absolute right-0 top-0 hidden sm:block">
                                <QrCode className="w-10 h-10 text-slate-800" />
                            </div>
                            <div className="flex flex-col items-center justify-center gap-2 mb-2">
                                {schoolLogo ? (
                                    <img src={schoolLogo} alt="Institute Logo" className="w-20 h-20 object-contain" />
                                ) : (
                                    <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 text-slate-800 mb-1">
                                        <BookOpen className="w-8 h-8" />
                                    </div>
                                )}
                                <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight underline decoration-2">{schoolName}</h2>
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mt-1 uppercase tracking-wide">{showPreviewModal?.paperTitle || "EXAMINATION PAPER"}</h3>
                            <div className="flex items-center justify-center gap-6 mt-2 text-sm font-bold text-slate-900 uppercase">
                                <span>TIME: {showPreviewModal?.duration || 120} MINUTES</span>
                                <span>TOTAL MARKS: {showPreviewModal?.totalMarks || 100}</span>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-8 border-2 border-slate-900 p-5 rounded-xl bg-white">
                            <div className="flex-1 w-full flex items-end gap-2">
                                <span className="text-sm font-bold text-slate-900 whitespace-nowrap">CANDIDATE NAME:</span>
                                <div className="border-b-2 border-dotted border-slate-900 flex-1 h-5" />
                            </div>
                            <div className="flex-[0.6] w-full flex items-end gap-2">
                                <span className="text-sm font-bold text-slate-900 whitespace-nowrap">ADM NO:</span>
                                <div className="border-b-2 border-dotted border-slate-900 flex-1 h-5" />
                            </div>
                        </div>

                        <div className="text-left mb-6">
                            <h4 className="text-sm font-bold uppercase underline mb-2 text-slate-900">INSTRUCTIONS TO CANDIDATES:</h4>
                            <p className="text-sm font-medium text-slate-900 whitespace-pre-wrap leading-relaxed">
                                {showPreviewModal?.instructions || "Answer all questions in the provided booklet."}
                            </p>
                        </div>

                        <div className="border-b-2 border-slate-900 mb-8" />

                        {/* Sections & Questions */}
                        <div className="space-y-10">
                            {showPreviewModal?.sections
                                ? showPreviewModal.sections.map((sec: any, sIdx: number) => (
                                    <div key={sIdx} className="space-y-6">
                                        <div className="border-b border-slate-300 pb-2 flex items-center justify-between">
                                            <h4 className="text-sm font-black uppercase tracking-widest text-slate-900">{sec.sectionName}</h4>
                                            <span className="text-xs font-black text-slate-500 uppercase">{sec.questions?.length || 0} Questions</span>
                                        </div>
                                        <div className="space-y-6 pl-2">
                                            {sec.questions?.map((q: any, qIdx: number) => {
                                                const isMCQ = q.options && Array.isArray(q.options) && q.options.some(Boolean);
                                                return (
                                                    <div key={qIdx} className="flex items-start justify-between gap-6 group">
                                                        <div className="space-y-2 flex-1">
                                                            <div className="flex items-start gap-3 text-xs font-bold text-slate-800 leading-relaxed">
                                                                <span className="font-black text-slate-900 shrink-0">{q.questionNumber ? `${q.questionNumber}.` : `${qIdx + 1}.`}</span>
                                                                <p className="flex-1 whitespace-pre-wrap text-slate-900">{q.questionText || q.content}</p>
                                                            </div>
                                                            {q.subQuestions && Array.isArray(q.subQuestions) && q.subQuestions.length > 0 && (
                                                                <div className="space-y-3 pt-2 pl-6">
                                                                    {q.subQuestions.map((sub: any, sIdx: number) => (
                                                                        <div key={sIdx} className="flex flex-col gap-2 w-full mb-3">
                                                                            <div className="flex items-start gap-2 text-xs font-bold text-slate-700">
                                                                                <span className="font-black text-slate-800 shrink-0">{sub.label})</span>
                                                                                <p className="flex-1 whitespace-pre-wrap text-slate-900">{sub.text}</p>
                                                                            </div>
                                                                            {answerLinesCount > 0 && (
                                                                                <div className="space-y-2 pt-2 pl-6 w-full">
                                                                                    {Array.from({ length: answerLinesCount }).map((_, i) => (
                                                                                        <div key={i} className="border-b border-dotted border-slate-300 h-5 w-full opacity-60" />
                                                                                    ))}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            {isMCQ && (
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 pl-6">
                                                                    {q.options.map((opt: string, oIdx: number) => opt ? (
                                                                        <div key={oIdx} className="text-xs font-bold text-slate-600 flex items-center gap-2">
                                                                            <span className="font-black text-slate-800">({String.fromCharCode(65 + oIdx)})</span>
                                                                            <span className="text-slate-700">{opt.replace(/^[A-E][\.\)]\s*/, "")}</span>
                                                                        </div>
                                                                    ) : null)}
                                                                </div>
                                                            )}
                                                            {answerLinesCount > 0 && (!q.subQuestions || q.subQuestions.length === 0) && !isMCQ && (
                                                                <div className="space-y-2 pt-3 pl-6 w-full">
                                                                    {Array.from({ length: answerLinesCount }).map((_, i) => (
                                                                        <div key={i} className="border-b border-dotted border-slate-300 h-5 w-full opacity-60" />
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))
                                : showPreviewModal?.generatedQuestions?.map((q: any, qIdx: number) => {
                                    const isMCQ = q.options && Array.isArray(q.options) && q.options.some(Boolean);
                                    return (
                                        <div key={qIdx} className="flex items-start justify-between gap-6 group">
                                            <div className="space-y-2 flex-1">
                                                <div className="flex items-start gap-3 text-xs font-bold text-slate-800 leading-relaxed">
                                                    <span className="font-black text-slate-900 shrink-0">{q.questionNumber ? `${q.questionNumber}.` : `${qIdx + 1}.`}</span>
                                                    <p className="flex-1 whitespace-pre-wrap text-slate-900">{q.questionText || q.content}</p>
                                                </div>
                                                {q.subQuestions && Array.isArray(q.subQuestions) && q.subQuestions.length > 0 && (
                                                    <div className="space-y-3 pt-2 pl-6">
                                                        {q.subQuestions.map((sub: any, sIdx: number) => (
                                                            <div key={sIdx} className="flex flex-col gap-2 w-full mb-3">
                                                                <div className="flex items-start gap-2 text-xs font-bold text-slate-700">
                                                                    <span className="font-black text-slate-800 shrink-0">{sub.label})</span>
                                                                    <p className="flex-1 whitespace-pre-wrap text-slate-900">{sub.text}</p>
                                                                </div>
                                                                {answerLinesCount > 0 && (
                                                                    <div className="space-y-2 pt-2 pl-6 w-full">
                                                                        {Array.from({ length: answerLinesCount }).map((_, i) => (
                                                                            <div key={i} className="border-b border-dotted border-slate-300 h-5 w-full opacity-60" />
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                                {isMCQ && (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 pl-6">
                                                        {q.options.map((opt: string, oIdx: number) => opt ? (
                                                            <div key={oIdx} className="text-xs font-bold text-slate-600 flex items-center gap-2">
                                                                <span className="font-black text-slate-800">({String.fromCharCode(65 + oIdx)})</span>
                                                                <span className="text-slate-700">{opt.replace(/^[A-E][\.\)]\s*/, "")}</span>
                                                            </div>
                                                        ) : null)}
                                                    </div>
                                                )}
                                                {answerLinesCount > 0 && (!q.subQuestions || q.subQuestions.length === 0) && !isMCQ && (
                                                    <div className="space-y-2 pt-3 pl-6 w-full">
                                                        {Array.from({ length: answerLinesCount }).map((_, i) => (
                                                            <div key={i} className="border-b border-dotted border-slate-300 h-5 w-full opacity-60" />
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>

                        {/* Footer */}
                        <DialogFooter className="mt-12 pt-6 border-t border-slate-200 flex flex-wrap gap-3 items-center justify-between">
                            <div className="flex items-center gap-2 mr-auto">
                                <span className="text-xs font-bold text-slate-700">Answer Spaces:</span>
                                <Select value={String(answerLinesCount)} onValueChange={(val) => setAnswerLinesCount(Number(val))}>
                                    <SelectTrigger className="h-10 w-36 rounded-xl bg-slate-50 border border-slate-200 font-bold text-xs shadow-none">
                                        <SelectValue placeholder="None" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border-border/50 shadow-2xl">
                                        <SelectItem value="0" className="font-bold text-xs">None</SelectItem>
                                        <SelectItem value="2" className="font-bold text-xs">2 Lines (Short)</SelectItem>
                                        <SelectItem value="4" className="font-bold text-xs">4 Lines (Medium)</SelectItem>
                                        <SelectItem value="6" className="font-bold text-xs">6 Lines (Long)</SelectItem>
                                        <SelectItem value="8" className="font-bold text-xs">8 Lines (Essay)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-center gap-3">
                                <Button variant="outline" onClick={() => setShowPreviewModal(null)} className="h-12 rounded-2xl font-bold border-slate-200 px-6">
                                    Close Preview
                                </Button>
                                <Button onClick={() => handleExportWord(showPreviewModal)} variant="outline" className="h-12 rounded-2xl font-bold border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 px-6 gap-2">
                                    <FileCheck className="w-4 h-4" /> Export Word
                                </Button>
                                {/* ── The fixed Print button — opens isolated popup ── */}
                                <Button
                                    onClick={() => handlePrint(showPreviewModal)}
                                    className="h-12 rounded-2xl font-black bg-slate-900 hover:bg-slate-800 text-white px-8 shadow-lg gap-2"
                                >
                                    <Printer className="w-4 h-4" /> Print / Export PDF
                                </Button>
                            </div>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}