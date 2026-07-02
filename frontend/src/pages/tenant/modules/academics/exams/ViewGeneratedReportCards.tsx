/**
 * Generated Report Cards - View & Download
 * Display all generated report cards grouped by exam, filtered by year, term,
 * class and stream. Styled to match the Generate Report Cards wizard
 * ("All Reports for Term and Year" — pill search bar, rounded emerald cards).
 * Users can download PDFs or view individual cards.
 */
import { useState, useMemo } from "react";
import {
    Home, ChevronRight, Download, Eye, Loader2, Calendar, BookOpen,
    FileText, Search, ChevronDown, CheckCircle2, GraduationCap
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { toast } from "sonner";

interface GeneratedCard {
    _id: string;
    classId: string;
    classV2Id?: string;
    className: string;
    mainExamId: string;
    mainExamName: string;
    term: string;
    academicYear: string;
    streamId?: string;
    streamName?: string;
    generatedAt: string;
    pdfUrl?: string;
    totalStudents?: number;
}

interface ExamGroup {
    examId: string;
    examName: string;
    cards: GeneratedCard[];
}

const norm = (v: any) => String(v ?? "").toLowerCase().replace(/\s+/g, " ").trim();

export default function ViewGeneratedReportCards() {
    const navigate = useNavigate();
    const [selectedYear, setSelectedYear] = useState<string>("");
    const [selectedTerm, setSelectedTerm] = useState<string>("");
    const [selectedClassId, setSelectedClassId] = useState<string>("");
    const [selectedStreamId, setSelectedStreamId] = useState<string>("");
    const [downloading, setDownloading] = useState<string | null>(null);
    const [expandedExams, setExpandedExams] = useState<Set<string>>(new Set());

    const normalizeExamName = (name: string) => {
        if (!name) return "";
        return name.trim().replace(/\s+/g, " ").split(" ").map(word =>
            word.toLowerCase() === "t" ? word.toUpperCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(" ");
    };

    // ── Queries ────────────────────────────────────────────────────────────────
    const { data: v2Terms = [] } = useQuery<any[]>({
        queryKey: ["v2_all_terms"],
        queryFn: async () => (await api.get("/v2/terms")).data || [],
    });

    const { data: v2Years = [] } = useQuery<any[]>({
        queryKey: ["v2_academic_years"],
        queryFn: async () => (await api.get("/v2/academic-years")).data || [],
    });

    const { data: v2Classes = [] } = useQuery<any[]>({
        queryKey: ["v2_classes"],
        queryFn: async () => (await api.get("/v2/classes")).data || [],
    });

    const { data: allStreams = [] } = useQuery<any[]>({
        queryKey: ["v2_streams_all"],
        queryFn: async () => (await api.get("/v2/streams")).data || [],
    });

    const activeYear = v2Years.find(y => y.isActive);
    const activeTerm = v2Terms.find(t => t.isActive);

    const pageTitle = selectedYear && selectedTerm
        ? `${selectedYear} ${selectedTerm.toUpperCase()} Report Cards`
        : activeYear && activeTerm
            ? `${activeYear.year} ${activeTerm.name.toUpperCase()} Report Cards`
            : "Generated Report Cards";

    // Fetch all generated report cards
    const { data: generatedCards = [], isLoading } = useQuery<GeneratedCard[]>({
        queryKey: ["report_card_generations"],
        queryFn: async () => (await api.get("/report_card_generations")).data || [],
    });

    // ── Derived data ───────────────────────────────────────────────────────────
    const years = useMemo(() => {
        const set = new Set<string>();
        generatedCards.forEach(card => { if (card.academicYear) set.add(card.academicYear); });
        v2Years.forEach(y => set.add(String(y.year)));
        return Array.from(set).sort().reverse();
    }, [generatedCards, v2Years]);

    const terms = useMemo(() => {
        const set = new Set<string>();
        generatedCards.forEach(card => { if (card.term) set.add(card.term); });
        v2Terms.forEach(t => set.add(t.name));
        return Array.from(set).sort();
    }, [generatedCards, v2Terms]);

    const streamsForClass = (cid: string) => allStreams.filter((s: any) => !cid || String(s.classId) === cid);

    // Filter and group by exam
    const examGroups = useMemo(() => {
        let filtered = generatedCards;

        if (selectedYear) filtered = filtered.filter(card => card.academicYear === selectedYear);
        if (selectedTerm) filtered = filtered.filter(card => card.term === selectedTerm);

        if (selectedClassId) {
            const bc = v2Classes.find((c: any) => String(c._id) === selectedClassId);
            const bcName = bc ? norm(bc.name || bc.levelName || "") : "";
            if (bcName) filtered = filtered.filter(card =>
                norm(card.className).includes(bcName) || bcName.includes(norm(card.className)));
        }

        if (selectedStreamId) {
            const bs = allStreams.find((s: any) => String(s._id) === selectedStreamId);
            if (bs) filtered = filtered.filter(card => String(card.streamId) === String(bs._id));
        }

        // Group by exam
        const grouped: Record<string, ExamGroup> = {};
        filtered.forEach(card => {
            const key = card.mainExamId;
            const name = normalizeExamName(card.mainExamName || card.term || "Exam");
            if (!grouped[key]) grouped[key] = { examId: card.mainExamId, examName: name, cards: [] };
            grouped[key].cards.push(card);
        });

        return Object.values(grouped)
            .sort((a, b) => a.examName.localeCompare(b.examName))
            .map(group => ({
                ...group,
                cards: group.cards.sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime())
            }));
    }, [generatedCards, selectedYear, selectedTerm, selectedClassId, selectedStreamId, v2Classes, allStreams]);

    const handleDownloadPDF = async (card: GeneratedCard) => {
        setDownloading(card._id);
        try {
            const response = await api.get(`/report_card_generations/${card._id}/pdf`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${card.className}-${card.mainExamName}-${card.term}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
            window.URL.revokeObjectURL(url);
            toast.success("PDF downloaded successfully");
        } catch (error: any) {
            console.error("Download error:", error);
            toast.error(error.response?.data?.message || "Failed to download PDF");
        } finally {
            setDownloading(null);
        }
    };

    const handleViewCard = (card: GeneratedCard) => {
        const classIdParam = card.classV2Id || card.classId;
        const params = new URLSearchParams({
            examId: card.mainExamId,
            classId: classIdParam,
            wholeClass: "true",
        });
        if (card.streamId) params.set("streamId", card.streamId);
        navigate(`/exams/scholar-sheet?${params.toString()}`, {
            state: { className: card.className, examName: card.mainExamName }
        });
    };

    const toggleExam = (examId: string) => {
        const next = new Set(expandedExams);
        next.has(examId) ? next.delete(examId) : next.add(examId);
        setExpandedExams(next);
    };

    const totalCards = useMemo(() => examGroups.reduce((sum, group) => sum + group.cards.length, 0), [examGroups]);

    return (
        <div className="flex-1 bg-[#f3f4f6] min-h-screen flex flex-col pb-10">
            {/* Header */}
            <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-2 min-w-0">
                    <Home className="w-4 h-4 text-[#5C67F2] flex-shrink-0" />
                    <ChevronRight className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                    <span className="text-gray-500 font-medium text-sm cursor-pointer hover:text-[#5C67F2] truncate">Exams</span>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                    <span className="font-black text-[#5C67F2] text-sm truncate">Generated Report Cards</span>
                </div>
                {activeTerm && (
                    <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-full flex-shrink-0">
                        <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                        <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wider">
                            {activeTerm.name} · {activeYear?.year}
                        </span>
                    </div>
                )}
            </div>

            <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 pt-6 space-y-6">

                {/* Top action: back to generator */}
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => navigate("/exams/generate-reports")}
                        className="flex items-center gap-1.5 px-4 py-2 text-xs font-black uppercase text-[#5C67F2] bg-indigo-50 hover:bg-indigo-100 rounded-xl border border-indigo-100 transition-all">
                        <FileText className="w-4 h-4" /> Generate Report Cards
                    </button>
                </div>

                {/* Search panel — matches the wizard's "All Reports for Term and Year" */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-8">
                    <h2 className="text-lg sm:text-xl font-black text-slate-800 mb-1">{pageTitle}</h2>
                    <p className="text-sm text-slate-400 mb-6">
                        View and download report cards grouped by exam. Filter by year, term, class &amp; stream.
                    </p>

                    {/* Year + Term row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="text-[11px] font-black text-amber-700 uppercase tracking-wide">Academic Year</label>
                            <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}
                                className="mt-1.5 w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:border-[#5C67F2]">
                                <option value="">All Years</option>
                                {years.map(year => <option key={year} value={year}>{year}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-[11px] font-black text-amber-700 uppercase tracking-wide">Term</label>
                            <select value={selectedTerm} onChange={(e) => setSelectedTerm(e.target.value)}
                                className="mt-1.5 w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:border-[#5C67F2]">
                                <option value="">All Terms</option>
                                {terms.map(term => <option key={term} value={term}>{term}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Pill search bar — Choose Class · Choose Stream */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        <div className="flex-1 flex items-center gap-2 bg-white border-2 border-slate-200 rounded-full px-4 py-2">
                            <select value={selectedClassId} onChange={e => { setSelectedClassId(e.target.value); setSelectedStreamId(""); }}
                                className="flex-1 h-9 bg-transparent text-sm font-bold text-slate-700 focus:outline-none">
                                <option value="">Choose Class</option>
                                {v2Classes.map((c: any) => <option key={c._id} value={c._id}>{c.name}</option>)}
                            </select>
                            <div className="w-px h-6 bg-slate-200" />
                            <select value={selectedStreamId} onChange={e => setSelectedStreamId(e.target.value)} disabled={!selectedClassId}
                                className="flex-1 h-9 bg-transparent text-sm font-bold text-slate-700 focus:outline-none disabled:text-slate-300">
                                <option value="">Choose Stream</option>
                                {streamsForClass(selectedClassId).map((s: any) => <option key={s._id} value={s._id}>{s.name}</option>)}
                            </select>
                            <Search className="w-4 h-4 text-slate-400" />
                        </div>
                        {(selectedClassId || selectedStreamId || selectedYear || selectedTerm) && (
                            <button
                                onClick={() => { setSelectedClassId(""); setSelectedStreamId(""); setSelectedYear(""); setSelectedTerm(""); }}
                                className="px-5 py-3 text-xs font-black uppercase text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all">
                                Clear
                            </button>
                        )}
                    </div>
                </div>

                {/* Results */}
                {isLoading ? (
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm py-20 flex flex-col items-center gap-3 text-gray-400">
                        <Loader2 className="w-8 h-8 animate-spin text-[#5C67F2]" />
                        <p className="text-sm font-medium">Loading report cards...</p>
                    </div>
                ) : totalCards === 0 ? (
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm py-16 flex flex-col items-center gap-3 text-gray-400">
                        <GraduationCap className="w-10 h-10 opacity-60" />
                        <p className="font-bold text-sm">
                            {generatedCards.length === 0 ? "No report cards generated yet" : "No matching report cards found"}
                        </p>
                        <p className="text-xs text-gray-400">
                            {generatedCards.length === 0 ? "Start by generating report cards" : "Try adjusting your filters"}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
                            Showing {totalCards} report card{totalCards !== 1 ? 's' : ''} across {examGroups.length} exam{examGroups.length !== 1 ? 's' : ''}
                        </div>

                        {/* Exam Groups */}
                        {examGroups.map((group) => {
                            const open = expandedExams.has(group.examId);
                            return (
                                <div key={group.examId} className="bg-white rounded-2xl border-2 border-emerald-200 shadow-sm overflow-hidden">
                                    {/* Exam Header */}
                                    <button
                                        onClick={() => toggleExam(group.examId)}
                                        className="w-full px-4 sm:px-5 py-4 flex items-center justify-between hover:bg-emerald-50/40 transition-colors"
                                    >
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                                                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                            </div>
                                            <div className="text-left flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h3 className="font-black text-gray-900 text-sm">{group.examName}</h3>
                                                    <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">✓ Generated</span>
                                                </div>
                                                <p className="text-[11px] text-gray-400 font-medium mt-0.5">
                                                    {group.cards.length} class{group.cards.length !== 1 ? 'es' : ''}
                                                </p>
                                            </div>
                                        </div>
                                        <ChevronDown className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
                                    </button>

                                    {/* Exam Cards List */}
                                    {open && (
                                        <div className="border-t border-emerald-100 divide-y divide-gray-100 bg-gray-50/30">
                                            {group.cards.map(card => (
                                                <div key={card._id}
                                                    className="px-4 sm:px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:bg-white transition-colors">
                                                    <div className="flex items-start gap-3 flex-1 min-w-0">
                                                        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                                                            <FileText className="w-5 h-5 text-[#5C67F2]" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <h4 className="text-sm font-black text-gray-900">{card.className}</h4>
                                                                {card.streamName && <span className="text-[10px] font-bold text-slate-500">· {card.streamName}</span>}
                                                            </div>
                                                            <div className="flex items-center gap-4 flex-wrap text-[11px] text-gray-500 font-medium mt-1">
                                                                <span className="flex items-center gap-1">
                                                                    <Calendar className="w-3.5 h-3.5" />
                                                                    {card.academicYear} · {card.term}
                                                                </span>
                                                                <span className="flex items-center gap-1">
                                                                    <BookOpen className="w-3.5 h-3.5" />
                                                                    Generated {new Date(card.generatedAt).toLocaleDateString()}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2 flex-shrink-0">
                                                        <button
                                                            onClick={() => handleDownloadPDF(card)}
                                                            disabled={downloading === card._id}
                                                            className="flex items-center gap-1.5 px-4 py-2 text-[10px] font-black uppercase text-white bg-[#5C67F2] hover:bg-[#4a54c4] rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            {downloading === card._id
                                                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                                : <Download className="w-3.5 h-3.5" />}
                                                            <span className="hidden sm:inline">Download PDF</span>
                                                            <span className="sm:hidden">PDF</span>
                                                        </button>
                                                        <button
                                                            onClick={() => handleViewCard(card)}
                                                            className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-black uppercase text-[#5C67F2] bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors border border-indigo-100"
                                                        >
                                                            <Eye className="w-3.5 h-3.5" />
                                                            <span className="hidden sm:inline">View Cards</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
