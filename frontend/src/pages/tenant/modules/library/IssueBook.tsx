import { useState } from "react";
import { Home, Search, BookOpen, User, Calendar, Check, X, Loader2, AlertCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";

export default function IssueBook() {
    const qc = useQueryClient();
    const [memberSearch, setMemberSearch] = useState("");
    const [bookSearch, setBookSearch] = useState("");
    const [selectedMember, setSelectedMember] = useState<any>(null);
    const [selectedBook, setSelectedBook] = useState<any>(null);

    const defaultDue = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const [dueDate, setDueDate] = useState(defaultDue);
    const [notes, setNotes] = useState("");

    const { data: members = [] } = useQuery({
        queryKey: ["library_members"],
        queryFn: async () => {
            const r = await api.get("/library/members");
            return (Array.isArray(r.data) ? r.data : []).filter((m: any) => m.isActive !== false);
        },
    });

    const { data: books = [] } = useQuery({
        queryKey: ["library_books"],
        queryFn: async () => {
            const r = await api.get("/library/books");
            return (Array.isArray(r.data) ? r.data : []).filter((b: any) => b.isActive !== false && (b.availableCopies ?? b.totalCopies) > 0);
        },
    });

    const { data: recentIssues = [] } = useQuery({
        queryKey: ["library_issues_recent"],
        queryFn: async () => {
            const r = await api.get("/library/issues?status=ISSUED");
            return Array.isArray(r.data) ? r.data.slice(0, 8) : [];
        },
    });

    const issueMutation = useMutation({
        mutationFn: (payload: any) => api.post("/library/issues", payload),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["library_issues_recent"] });
            qc.invalidateQueries({ queryKey: ["library_books"] });
            qc.invalidateQueries({ queryKey: ["library_stats"] });
            toast.success(`"${selectedBook?.title}" issued to ${selectedMember?.name}`);
            setSelectedMember(null); setSelectedBook(null);
            setMemberSearch(""); setBookSearch("");
            setNotes(""); setDueDate(defaultDue);
        },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed to issue book"),
    });

    const filteredMembers = memberSearch.length >= 2
        ? members.filter((m: any) => (m.name || "").toLowerCase().includes(memberSearch.toLowerCase()) || (m.admissionNo || "").toLowerCase().includes(memberSearch.toLowerCase()))
        : [];

    const filteredBooks = bookSearch.length >= 2
        ? books.filter((b: any) => (b.title || "").toLowerCase().includes(bookSearch.toLowerCase()) || (b.isbn || "").toLowerCase().includes(bookSearch.toLowerCase()) || (b.author || "").toLowerCase().includes(bookSearch.toLowerCase()))
        : [];

    const handleIssue = () => {
        if (!selectedMember || !selectedBook) { toast.error("Select both member and book"); return; }
        issueMutation.mutate({
            bookId: selectedBook._id, bookTitle: selectedBook.title,
            memberId: selectedMember._id, memberName: selectedMember.name,
            memberType: selectedMember.memberType || "student",
            memberClass: selectedMember.class || selectedMember.memberClass || "",
            dueDate, notes,
        });
    };

    return (
        <div className="flex-1 bg-[#F8FAFC] min-h-screen flex flex-col pb-20 font-sans">
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-2 text-sm">
                    <Home className="w-4 h-4 text-[#5C67F2]" /><span className="text-gray-300">/</span>
                    <span className="font-bold text-gray-600">Library</span><span className="text-gray-300">/</span>
                    <span className="font-black text-[#5C67F2]">Issue Book</span>
                </div>
            </div>

            <div className="flex-1 max-w-6xl mx-auto w-full px-6 pt-8">
                <div className="mb-6"><h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Issue Book</h1>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-1">Lend a book to a registered library member</p></div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Issue Form */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Member search */}
                        <div className="bg-white p-7 rounded-[2rem] border border-slate-100 shadow-sm relative">
                            <div className="absolute -top-3 left-6 bg-[#5C67F2] text-white text-[9px] px-3 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Select Member*</div>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                <input type="text" value={memberSearch} onChange={e => { setMemberSearch(e.target.value); if (selectedMember) setSelectedMember(null); }}
                                    className="w-full h-11 pl-12 pr-10 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700" placeholder="Type member name or admission no..." />
                                {selectedMember && <button onClick={() => { setSelectedMember(null); setMemberSearch(""); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500"><X className="w-4 h-4" /></button>}
                            </div>
                            {filteredMembers.length > 0 && !selectedMember && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-slate-100 shadow-xl z-50 overflow-hidden max-h-52 overflow-y-auto">
                                    {filteredMembers.map((m: any) => (
                                        <div key={m._id} onClick={() => { setSelectedMember(m); setMemberSearch(m.name); }} className="px-4 py-3 hover:bg-slate-50 cursor-pointer flex items-center justify-between border-b border-slate-50">
                                            <div>
                                                <p className="text-xs font-black text-slate-700 uppercase">{m.name}</p>
                                                <p className="text-[9px] text-slate-400 font-bold uppercase">{m.memberType} · {m.class || m.memberClass || "—"}</p>
                                            </div>
                                            <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase ${m.memberType === "student" ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"}`}>{m.memberType}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {selectedMember && (
                                <div className="mt-3 flex items-center gap-3 p-3 bg-indigo-50 rounded-2xl border border-indigo-100">
                                    <div className="w-9 h-9 rounded-xl bg-[#5C67F2] flex items-center justify-center text-white font-black text-sm">{selectedMember.name[0]}</div>
                                    <div>
                                        <p className="text-xs font-black text-slate-800">{selectedMember.name}</p>
                                        <p className="text-[9px] text-slate-500 font-bold uppercase">{selectedMember.memberType} · {selectedMember.class || selectedMember.memberClass || "—"}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Book search */}
                        <div className="bg-white p-7 rounded-[2rem] border border-slate-100 shadow-sm relative">
                            <div className="absolute -top-3 left-6 bg-[#5C67F2] text-white text-[9px] px-3 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Select Book*</div>
                            <div className="relative">
                                <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                <input type="text" value={bookSearch} onChange={e => { setBookSearch(e.target.value); if (selectedBook) setSelectedBook(null); }}
                                    className="w-full h-11 pl-12 pr-10 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700" placeholder="Search by title, author, or ISBN..." />
                                {selectedBook && <button onClick={() => { setSelectedBook(null); setBookSearch(""); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500"><X className="w-4 h-4" /></button>}
                            </div>
                            {filteredBooks.length > 0 && !selectedBook && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-slate-100 shadow-xl z-50 overflow-hidden max-h-52 overflow-y-auto">
                                    {filteredBooks.map((b: any) => (
                                        <div key={b._id} onClick={() => { setSelectedBook(b); setBookSearch(b.title); }} className="px-4 py-3 hover:bg-slate-50 cursor-pointer flex items-center justify-between border-b border-slate-50">
                                            <div>
                                                <p className="text-xs font-black text-slate-700">{b.title}</p>
                                                <p className="text-[9px] text-slate-400 font-bold uppercase">{b.author || "—"} · Shelf: {b.shelfLocation || "—"}</p>
                                            </div>
                                            <span className="text-[9px] font-black text-emerald-600">{b.availableCopies ?? b.totalCopies} available</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {selectedBook && (
                                <div className="mt-3 flex items-center gap-3 p-3 bg-emerald-50 rounded-2xl border border-emerald-100">
                                    <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center text-white font-black text-sm">{selectedBook.title[0]}</div>
                                    <div>
                                        <p className="text-xs font-black text-slate-800">{selectedBook.title}</p>
                                        <p className="text-[9px] text-slate-500 font-bold uppercase">{selectedBook.author || "—"} · {selectedBook.availableCopies ?? selectedBook.totalCopies} copies available</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Due date + notes */}
                        <div className="bg-white p-7 rounded-[2rem] border border-slate-100 shadow-sm grid grid-cols-2 gap-6">
                            <div className="relative">
                                <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Due Date*</div>
                                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} min={new Date().toISOString().split("T")[0]}
                                    className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700" />
                            </div>
                            <div className="relative">
                                <div className="absolute -top-3 left-4 bg-slate-800 text-white text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest z-10 uppercase">Notes</div>
                                <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional..."
                                    className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-[#5C67F2] text-xs font-bold text-slate-700" />
                            </div>
                            <button onClick={handleIssue} disabled={issueMutation.isPending || !selectedMember || !selectedBook}
                                className="col-span-2 h-12 bg-[#5C67F2] hover:bg-indigo-600 disabled:opacity-40 text-white font-black text-xs uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 transition-all">
                                {issueMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                Issue Book
                            </button>
                        </div>
                    </div>

                    {/* Currently issued */}
                    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm h-fit">
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-4">Currently Issued ({recentIssues.length})</h3>
                        {recentIssues.length === 0 ? (
                            <p className="text-slate-300 text-xs font-bold uppercase text-center py-8">No active issues</p>
                        ) : (
                            <div className="space-y-3">
                                {recentIssues.map((i: any) => (
                                    <div key={i._id} className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                                        <p className="text-[10px] font-black text-slate-800 truncate">{i.bookTitle}</p>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">{i.memberName}</p>
                                        <p className="text-[9px] text-slate-400 font-bold flex items-center gap-1 mt-0.5"><Calendar className="w-3 h-3" />Due: {i.dueDate}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
