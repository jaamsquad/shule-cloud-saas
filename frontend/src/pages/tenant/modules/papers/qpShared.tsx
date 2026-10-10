/**
 * Shared parts of the Question Paper pages: the page shell with its tabs, data hooks, a
 * question card (shows parts / options with proper numbering) and the question editor.
 */
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { FileUp, Library, FileText, BookOpen, Plus, Trash2, X } from "lucide-react";
import api from "@/lib/api";
import { partLabel, subLabel, optionLabel } from "@/lib/paperNumbering";

export const ACCENT = "#4F46E5";
export const TYPES = ["MCQ", "Short Answer", "Structured", "Essay", "True/False", "Fill in the blank"];
export const DIFFS = ["EASY", "MEDIUM", "HARD"];
export const inp = "w-full h-10 px-3 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

export interface QPart { label?: string; text: string; marks: number | null; parts?: QPart[] }
export interface QQuestion { _id?: string; number?: number; text: string; marks: number | null; type: string; difficulty: string; parts: QPart[]; options: { label?: string; text: string }[]; answer: string; markingScheme?: string; images?: string[]; section?: string; subjectName?: string; className?: string; chapterName?: string; timesUsed?: number; sourceDocument?: string }

const TABS = [
    { to: "/papers/import", label: "Import paper", icon: FileUp },
    { to: "/papers/questions", label: "Question bank", icon: Library },
    { to: "/papers/create", label: "Create paper", icon: FileText },
    { to: "/papers/chapters", label: "Chapters", icon: BookOpen },
];

export function QPShell({ title, subtitle, actions, children }: { title: string; subtitle: string; actions?: React.ReactNode; children: React.ReactNode }) {
    const { pathname } = useLocation();
    return (
        <div className="flex-1 min-h-screen bg-slate-50 pb-16">
            <div className="bg-gradient-to-r from-indigo-600 via-indigo-600 to-violet-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-4">
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                        <div>
                            <div className="text-[11px] font-bold uppercase tracking-widest text-indigo-200">Question Paper</div>
                            <h1 className="text-2xl font-black tracking-tight">{title}</h1>
                            <p className="text-sm text-indigo-100 mt-0.5">{subtitle}</p>
                        </div>
                        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
                    </div>
                    <div className="flex gap-1 mt-5 overflow-x-auto -mb-4">
                        {TABS.map(t => {
                            const on = pathname === t.to || (t.to === "/papers/create" && pathname.startsWith("/papers/create"));
                            return (
                                <Link key={t.to} to={t.to} className={`shrink-0 h-10 px-4 rounded-t-xl text-sm font-bold flex items-center gap-2 transition-colors ${on ? "bg-slate-50 text-indigo-700" : "text-indigo-100 hover:bg-white/10"}`}>
                                    <t.icon className="w-4 h-4" /> {t.label}
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </div>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">{children}</div>
        </div>
    );
}

export const Panel = ({ title, sub, right, children, className = "" }: { title?: string; sub?: string; right?: React.ReactNode; children: React.ReactNode; className?: string }) => (
    <div className={`bg-white rounded-2xl border border-slate-200/70 shadow-sm ${className}`}>
        {(title || right) && <div className="px-5 pt-4 pb-3 flex items-start justify-between gap-3 border-b border-slate-100">
            <div>{title && <h3 className="font-black text-slate-800">{title}</h3>}{sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}</div>{right}
        </div>}
        <div className="p-5">{children}</div>
    </div>
);

export const Label = ({ children }: { children: React.ReactNode }) => <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">{children}</label>;

export function useQPSubjects() {
    return useQuery<any[]>({ queryKey: ["qp_subjects"], queryFn: async () => (await api.get("/qp/subjects")).data || [] });
}
export function useQPClasses() {
    return useQuery<any[]>({
        queryKey: ["qp_classes"],
        queryFn: async () => {
            const [v2, legacy] = await Promise.all([api.get("/v2/classes").then(r => r.data || []).catch(() => []), api.get("/classes").then(r => r.data || []).catch(() => [])]);
            const seen = new Set<string>();
            return [...v2, ...legacy].map((c: any) => ({ id: String(c._id), name: String(c.name || c.levelName || "").trim() })).filter(c => c.name && !seen.has(c.name.toLowerCase()) && seen.add(c.name.toLowerCase()));
        },
    });
}
export function useQPChapters() {
    return useQuery<any[]>({ queryKey: ["chapters"], queryFn: async () => (await api.get("/chapters")).data || [] });
}

export const DiffBadge = ({ d }: { d: string }) => {
    const tone = d === "EASY" ? "bg-emerald-50 text-emerald-700" : d === "HARD" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700";
    return <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${tone}`}>{d.toLowerCase()}</span>;
};
export const TypeBadge = ({ t }: { t: string }) => <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-50 text-indigo-700">{t}</span>;

/** A question as it will read on paper (parts, sub-parts, options, pictures). */
export function QuestionBody({ q, showAnswer }: { q: QQuestion; showAnswer?: boolean }) {
    return (
        <div className="text-sm text-slate-800 leading-relaxed">
            {q.text && <p className="whitespace-pre-wrap">{q.text}</p>}
            {(q.images || []).map((src, i) => <img key={i} src={src} alt="" className="max-h-48 my-2 rounded-lg border border-slate-100" />)}
            {q.parts?.length > 0 && (
                <div className="mt-1.5 space-y-1">
                    {q.parts.map((p, i) => (
                        <div key={i}>
                            <div className="flex gap-2"><span className="font-bold text-slate-500 w-7 shrink-0">{partLabel(i + 1, "(a)")}</span><span className="flex-1">{p.text}</span>{p.marks != null && <span className="text-xs font-bold text-slate-400 shrink-0">({p.marks})</span>}</div>
                            {(p.parts || []).map((s, j) => (
                                <div key={j} className="flex gap-2 ml-8"><span className="font-bold text-slate-400 w-7 shrink-0">{subLabel(j + 1, "(i)")}</span><span className="flex-1">{s.text}</span>{s.marks != null && <span className="text-xs font-bold text-slate-400 shrink-0">({s.marks})</span>}</div>
                            ))}
                        </div>
                    ))}
                </div>
            )}
            {q.options?.length > 0 && (
                <div className="mt-1.5 grid sm:grid-cols-2 gap-x-6 gap-y-0.5">
                    {q.options.map((o, i) => {
                        const right = showAnswer && q.answer && q.answer.trim().toUpperCase().startsWith(String.fromCharCode(65 + i));
                        return <div key={i} className={right ? "font-black text-emerald-700" : ""}><span className="font-bold text-slate-500 mr-1.5">{optionLabel(i + 1, "A.")}</span>{o.text}</div>;
                    })}
                </div>
            )}
            {showAnswer && q.answer && !q.options?.length && <p className="mt-1.5 text-xs text-emerald-700"><b>Answer:</b> {q.answer}</p>}
        </div>
    );
}

/** Edit one question (text, marks, type, difficulty, parts, options, answer). */
export function QuestionEditor({ value, onChange }: { value: QQuestion; onChange: (q: QQuestion) => void }) {
    const q = value;
    const set = (patch: Partial<QQuestion>) => onChange({ ...q, ...patch });
    const setPart = (i: number, patch: Partial<QPart>) => set({ parts: q.parts.map((p, k) => k === i ? { ...p, ...patch } : p) });
    const [showScheme, setShowScheme] = useState(!!q.markingScheme);
    return (
        <div className="space-y-3">
            <textarea value={q.text} onChange={e => set({ text: e.target.value })} rows={3} placeholder="Question text" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500" />
            <div className="grid grid-cols-3 gap-2">
                <div><Label>Marks</Label><input type="number" min={0} value={q.marks ?? ""} onChange={e => set({ marks: e.target.value === "" ? null : Number(e.target.value) })} placeholder={q.parts.length ? "from parts" : "0"} className={inp} /></div>
                <div><Label>Type</Label><select value={q.type} onChange={e => set({ type: e.target.value })} className={inp}>{TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
                <div><Label>Difficulty</Label><select value={q.difficulty} onChange={e => set({ difficulty: e.target.value })} className={inp}>{DIFFS.map(t => <option key={t} value={t}>{t.toLowerCase()}</option>)}</select></div>
            </div>
            {(q.parts.length > 0 || q.type === "Structured") && (
                <div className="space-y-2">
                    <Label>Parts</Label>
                    {q.parts.map((p, i) => (
                        <div key={i} className="rounded-xl border border-slate-100 p-2 space-y-1.5">
                            <div className="flex gap-2 items-start">
                                <span className="font-black text-slate-400 text-sm w-8 pt-2">{partLabel(i + 1, "(a)")}</span>
                                <textarea rows={1} value={p.text} onChange={e => setPart(i, { text: e.target.value })} className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                                <input type="number" min={0} value={p.marks ?? ""} onChange={e => setPart(i, { marks: e.target.value === "" ? null : Number(e.target.value) })} placeholder="mks" className="w-16 h-9 px-2 border border-slate-200 rounded-lg text-sm" />
                                <button onClick={() => set({ parts: q.parts.filter((_, k) => k !== i) })} className="p-2 text-slate-300 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                            </div>
                            {(p.parts || []).map((s, j) => (
                                <div key={j} className="flex gap-2 items-start ml-10">
                                    <span className="font-bold text-slate-300 text-sm w-8 pt-2">{subLabel(j + 1, "(i)")}</span>
                                    <input value={s.text} onChange={e => setPart(i, { parts: (p.parts || []).map((x, k) => k === j ? { ...x, text: e.target.value } : x) })} className="flex-1 h-9 px-3 border border-slate-200 rounded-lg text-sm" />
                                    <input type="number" min={0} value={s.marks ?? ""} onChange={e => setPart(i, { parts: (p.parts || []).map((x, k) => k === j ? { ...x, marks: e.target.value === "" ? null : Number(e.target.value) } : x) })} placeholder="mks" className="w-16 h-9 px-2 border border-slate-200 rounded-lg text-sm" />
                                    <button onClick={() => setPart(i, { parts: (p.parts || []).filter((_, k) => k !== j) })} className="p-2 text-slate-300 hover:text-rose-500"><X className="w-4 h-4" /></button>
                                </div>
                            ))}
                            <button onClick={() => setPart(i, { parts: [...(p.parts || []), { text: "", marks: null }] })} className="ml-10 text-[11px] font-bold text-indigo-600">+ sub-part</button>
                        </div>
                    ))}
                    <button onClick={() => set({ parts: [...q.parts, { text: "", marks: null, parts: [] }] })} className="text-xs font-bold text-indigo-600 flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Add part</button>
                </div>
            )}
            {(q.type === "MCQ" || q.options.length > 0) && (
                <div className="space-y-1.5">
                    <Label>Options</Label>
                    {q.options.map((o, i) => (
                        <div key={i} className="flex gap-2 items-center">
                            <button title="Mark as the correct answer" onClick={() => set({ answer: String.fromCharCode(65 + i) })} className={`w-8 h-8 rounded-lg text-xs font-black ${q.answer?.toUpperCase().startsWith(String.fromCharCode(65 + i)) ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-500"}`}>{String.fromCharCode(65 + i)}</button>
                            <input value={o.text} onChange={e => set({ options: q.options.map((x, k) => k === i ? { ...x, text: e.target.value } : x) })} className="flex-1 h-9 px-3 border border-slate-200 rounded-lg text-sm" />
                            <button onClick={() => set({ options: q.options.filter((_, k) => k !== i) })} className="p-2 text-slate-300 hover:text-rose-500"><X className="w-4 h-4" /></button>
                        </div>
                    ))}
                    {q.options.length < 8 && <button onClick={() => set({ options: [...q.options, { text: "" }] })} className="text-xs font-bold text-indigo-600 flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Add option</button>}
                    <p className="text-[11px] text-slate-400">Tap a letter to mark the correct answer.</p>
                </div>
            )}
            {q.type !== "MCQ" && (
                <div><Label>Answer (optional)</Label><input value={q.answer} onChange={e => set({ answer: e.target.value })} className={inp} placeholder="Expected answer" /></div>
            )}
            {showScheme ? (
                <div><Label>Marking scheme (optional)</Label><textarea rows={3} value={q.markingScheme || ""} onChange={e => set({ markingScheme: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm" /></div>
            ) : <button onClick={() => setShowScheme(true)} className="text-xs font-bold text-indigo-600">+ Marking scheme</button>}
        </div>
    );
}

export const blankQuestion = (): QQuestion => ({ text: "", marks: 1, type: "Short Answer", difficulty: "MEDIUM", parts: [], options: [], answer: "", markingScheme: "", images: [] });
