/**
 * Generated Report Cards
 * Display all generated report cards with filtering by year, term, and class.
 * Users can download PDFs or view individual cards.
 */
import { useState, useMemo } from "react";
import { Home, ChevronRight, Download, Eye, Loader2, Calendar, BookOpen, Users, FileText, Search, Filter } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
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

export default function GeneratedReportCards() {
    const [selectedYear, setSelectedYear] = useState<string>("");
    const [selectedTerm, setSelectedTerm] = useState<string>("");
    const [selectedClass, setSelectedClass] = useState<string>("");
    const [searchTerm, setSearchTerm] = useState("");
    const [downloading, setDownloading] = useState<string | null>(null);

    // ── Queries ────────────────────────────────────────────────────────────────
    const { data: v2Terms = [] } = useQuery<any[]>({
        queryKey: ["v2_all_terms"],
        queryFn: async () => (await api.get("/v2/terms")).data || [],
    });

    const { data: v2Years = [] } = useQuery<any[]>({
        queryKey: ["v2_academic_years"],
        queryFn: async () => (await api.get("/v2/academic-years")).data || [],
    });

    const { data: classes = [] } = useQuery<any[]>({
        queryKey: ["classes"],
        queryFn: async () => (await api.get("/academics/classes")).data || [],
    });

    // Fetch all generated report cards
    const { data: generatedCards = [], isLoading } = useQuery<GeneratedCard[]>({
        queryKey: ["generated_report_cards"],
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

    const classNames = useMemo(() => {
        return classes.map(c => c.levelName || c.name).filter(Boolean).sort();
    }, [classes]);

    // Filter generated cards
    const filteredCards = useMemo(() => {
        let result = generatedCards;

        if (selectedYear) {
            result = result.filter(card => card.academicYear === selectedYear);
        }

        if (selectedTerm) {
            result = result.filter(card => card.term === selectedTerm);
        }

        if (selectedClass) {
            result = result.filter(card => card.className === selectedClass);
        }

        if (searchTerm) {
            const search = searchTerm.toLowerCase();
            result = result.filter(card =>
                card.className.toLowerCase().includes(search) ||
                card.mainExamName.toLowerCase().includes(search) ||
                card.term.toLowerCase().includes(search)
            );
        }

        return result.sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());
    }, [generatedCards, selectedYear, selectedTerm, selectedClass, searchTerm]);

    const handleDownloadPDF = async (card: GeneratedCard) => {
        setDownloading(card._id);
        try {
            // Generate PDF and download
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
            toast.error(error.response?.data?.message || "Failed to download PDF");
        } finally {
            setDownloading(null);
        }
    };

    const activeYear = v2Years.find(y => y.isActive);
    const activeTerm = v2Terms.find(t => t.isActive);

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
                        View and download all generated report cards. Filter by year, term, and class.
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

                        {/* Class Filter */}
                        <div>
                            <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">Class</label>
                            <select
                                value={selectedClass}
                                onChange={(e) => setSelectedClass(e.target.value)}
                                className="w-full mt-1.5 h-10 px-3 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 focus:outline-none focus:border-[#5C67F2]"
                            >
                                <option value="">All Classes</option>
                                {classNames.map(name => (
                                    <option key={name} value={name}>{name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Search */}
                        <div>
                            <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">Search</label>
                            <div className="relative mt-1.5">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search..."
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
                ) : filteredCards.length === 0 ? (
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
                            Showing {filteredCards.length} report card{filteredCards.length !== 1 ? 's' : ''}
                        </div>

                        {filteredCards.map(card => (
                            <div
                                key={card._id}
                                className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                            >
                                <div className="flex items-start gap-4 flex-1 min-w-0">
                                    <div className="w-12 h-12 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                                        <FileText className="w-6 h-6 text-[#5C67F2]" />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                            <h3 className="text-sm font-black text-gray-900">{card.className}</h3>
                                            <span className="text-xs font-bold bg-indigo-50 text-[#5C67F2] px-2.5 py-1 rounded-full">
                                                {card.mainExamName}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-4 flex-wrap text-xs text-gray-500 font-medium">
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
                                        className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase text-white bg-[#5C67F2] hover:bg-[#4a54c4] rounded-lg transition-colors disabled:opacity-50"
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
        </div>
    );
}
