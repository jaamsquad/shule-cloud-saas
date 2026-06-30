/**
 * Generated Report Cards - View & Download
 * Display all generated report cards grouped by exam with filtering by year and term.
 * Users can download PDFs or view individual cards.
 */
import { useState, useMemo } from "react";
import { Home, ChevronRight, Download, Eye, Loader2, Calendar, BookOpen, Users, FileText, Search, Filter, ChevronDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { toast } from "sonner";

interface GeneratedCard {
    _id: string;
    classId: string;
    className: string;
    mainExamId: string;
    mainExamName: string;
    term: string;
    academicYear: string;
    generatedAt: string;
    pdfUrl?: string;
    totalStudents?: number;
}

interface ExamGroup {
    examId: string;
    examName: string;
    cards: GeneratedCard[];
}

export default function ViewGeneratedReportCards() {
    const navigate = useNavigate();
    const [selectedYear, setSelectedYear] = useState<string>("");
    const [selectedTerm, setSelectedTerm] = useState<string>("");
    const [searchTerm, setSearchTerm] = useState("");
    const [downloading, setDownloading] = useState<string | null>(null);
    const [expandedExams, setExpandedExams] = useState<Set<string>>(new Set());

    // ── Queries ────────────────────────────────────────────────────────────────
    const { data: v2Terms = [] } = useQuery<any[]>({
        queryKey: ["v2_all_terms"],
        queryFn: async () => (await api.get("/v2/terms")).data || [],
    });

    const { data: v2Years = [] } = useQuery<any[]>({
        queryKey: ["v2_academic_years"],
        queryFn: async () => (await api.get("/v2/academic-years")).data || [],
    });

    // Fetch all generated report cards
    const { data: generatedCards = [], isLoading } = useQuery<GeneratedCard[]>({
        queryKey: ["report_card_generations"],
        queryFn: async () => (await api.get("/report_card_generations")).data || [],
    });

    // ── Derived data ───────────────────────────────────────────────────────────
    const years = useMemo(() => {
        const set = new Set<string>();
        generatedCards.forEach(card => {
            if (card.academicYear) set.add(card.academicYear);
        });
        v2Years.forEach(y => set.add(String(y.year)));
        return Array.from(set).sort().reverse();
    }, [generatedCards, v2Years]);

    const terms = useMemo(() => {
        const set = new Set<string>();
        generatedCards.forEach(card => {
            if (card.term) set.add(card.term);
        });
        v2Terms.forEach(t => set.add(t.name));
        return Array.from(set).sort();
    }, [generatedCards, v2Terms]);

    // Filter and group by exam
    const examGroups = useMemo(() => {
        let filtered = generatedCards;

        if (selectedYear) {
            filtered = filtered.filter(card => card.academicYear === selectedYear);
        }

        if (selectedTerm) {
            filtered = filtered.filter(card => card.term === selectedTerm);
        }

        if (searchTerm) {
            const search = searchTerm.toLowerCase();
            filtered = filtered.filter(card =>
                card.className.toLowerCase().includes(search) ||
                card.mainExamName.toLowerCase().includes(search) ||
                card.term.toLowerCase().includes(search)
            );
        }

        // Group by exam
        const grouped: Record<string, ExamGroup> = {};
        filtered.forEach(card => {
            const key = card.mainExamId;
            if (!grouped[key]) {
                grouped[key] = {
                    examId: card.mainExamId,
                    examName: card.mainExamName,
                    cards: []
                };
            }
            grouped[key].cards.push(card);
        });

        return Object.values(grouped)
            .sort((a, b) => a.examName.localeCompare(b.examName))
            .map(group => ({
                ...group,
                cards: group.cards.sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime())
            }));
    }, [generatedCards, selectedYear, selectedTerm, searchTerm]);

    const handleDownloadPDF = async (card: GeneratedCard) => {
        setDownloading(card._id);
        try {
            const response = await api.get(`/report_card_generations/${card._id}/pdf`, {
                responseType: 'blob',
            });
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
        // Navigate to Scholar Sheet with class and exam parameters
        navigate(`/exams/scholar-sheet?examId=${card.mainExamId}&class=${card.classId}`, {
            state: { className: card.className, examName: card.mainExamName }
        });
    };

    const toggleExam = (examId: string) => {
        const newExpanded = new Set(expandedExams);
        if (newExpanded.has(examId)) {
            newExpanded.delete(examId);
        } else {
            newExpanded.add(examId);
        }
        setExpandedExams(newExpanded);
    };

    const activeYear = v2Years.find(y => y.isActive);
    const activeTerm = v2Terms.find(t => t.isActive);

    const totalCards = useMemo(() => {
        return examGroups.reduce((sum, group) => sum + group.cards.length, 0);
    }, [examGroups]);

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

            <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 pt-6 space-y-4">
                {/* Title */}
                <div>
                    <h1 className="text-xl sm:text-2xl font-black text-slate-800">Generated Report Cards</h1>
                    <p className="text-sm text-slate-400 mt-0.5">
                        View and download report cards grouped by exam. Filter by year and term.
                    </p>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                        <Filter className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-bold text-gray-700 uppercase tracking-wide">Filters</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {/* Year Filter */}
                        <div>
                            <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">Academic Year</label>
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(e.target.value)}
                                className="w-full mt-1.5 h-10 px-3 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 focus:outline-none focus:border-[#5C67F2]"
                            >
                                <option value="">All Years</option>
                                {years.map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                        </div>

                        {/* Term Filter */}
                        <div>
                            <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">Term</label>
                            <select
                                value={selectedTerm}
                                onChange={(e) => setSelectedTerm(e.target.value)}
                                className="w-full mt-1.5 h-10 px-3 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 focus:outline-none focus:border-[#5C67F2]"
                            >
                                <option value="">All Terms</option>
                                {terms.map(term => (
                                    <option key={term} value={term}>{term}</option>
                                ))}
                            </select>
                        </div>

                        {/* Search */}
                        <div className="sm:col-span-2 lg:col-span-2">
                            <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">Search</label>
                            <div className="relative mt-1.5">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search by exam or class..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-9 pr-3 h-10 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 focus:outline-none focus:border-[#5C67F2]"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Results */}
                {isLoading ? (
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-20 flex flex-col items-center gap-3 text-gray-400">
                        <Loader2 className="w-8 h-8 animate-spin text-[#5C67F2]" />
                        <p className="text-sm font-medium">Loading report cards...</p>
                    </div>
                ) : totalCards === 0 ? (
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-20 flex flex-col items-center gap-3 text-gray-400">
                        <FileText className="w-10 h-10 opacity-50" />
                        <p className="font-bold text-sm">
                            {generatedCards.length === 0 ? "No report cards generated yet" : "No matching report cards found"}
                        </p>
                        <p className="text-xs text-gray-400">
                            {generatedCards.length === 0 ? "Start by generating report cards" : "Try adjusting your filters"}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="text-sm text-gray-600 font-medium">
                            Showing {totalCards} report card{totalCards !== 1 ? 's' : ''} across {examGroups.length} exam{examGroups.length !== 1 ? 's' : ''}
                        </div>

                        {/* Exam Groups */}
                        {examGroups.map((group) => (
                            <div key={group.examId} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                                {/* Exam Header */}
                                <button
                                    onClick={() => toggleExam(group.examId)}
                                    className="w-full px-4 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors border-b border-gray-100"
                                >
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <BookOpen className="w-5 h-5 text-[#5C67F2] flex-shrink-0" />
                                        <div className="text-left flex-1 min-w-0">
                                            <h3 className="font-bold text-gray-900 text-sm">{group.examName}</h3>
                                            <p className="text-xs text-gray-500">{group.cards.length} class{group.cards.length !== 1 ? 'es' : ''}</p>
                                        </div>
                                    </div>
                                    <ChevronDown
                                        className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${
                                            expandedExams.has(group.examId) ? 'rotate-180' : ''
                                        }`}
                                    />
                                </button>

                                {/* Exam Cards List */}
                                {expandedExams.has(group.examId) && (
                                    <div className="divide-y divide-gray-100">
                                        {group.cards.map(card => (
                                            <div
                                                key={card._id}
                                                className="px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:bg-gray-50 transition-colors"
                                            >
                                                <div className="flex items-start gap-3 flex-1 min-w-0">
                                                    <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                                                        <FileText className="w-5 h-5 text-[#5C67F2]" />
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="text-sm font-bold text-gray-900">{card.className}</h4>

                                                        <div className="flex items-center gap-4 flex-wrap text-xs text-gray-500 font-medium mt-1">
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
                                                        className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase text-white bg-[#5C67F2] hover:bg-[#4a54c4] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        {downloading === card._id ? (
                                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                        ) : (
                                                            <Download className="w-3.5 h-3.5" />
                                                        )}
                                                        <span className="hidden sm:inline">Download PDF</span>
                                                        <span className="sm:hidden">Download</span>
                                                    </button>

                                                    <button
                                                        onClick={() => handleViewCard(card)}
                                                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase text-[#5C67F2] bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-100"
                                                    >
                                                        <Eye className="w-3.5 h-3.5" />
                                                        <span className="hidden sm:inline">View</span>
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
