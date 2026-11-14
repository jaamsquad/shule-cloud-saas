/**
 * Subjects → Pathways (CBE senior school, Grades 10–12): the three pathways and their tracks
 * with their subjects, which tracks the school offers, and each learner's pathway, track and
 * three electives. Learners' pathways drive their CBC learning areas.
 */
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Route, ChevronDown, ChevronRight, Loader2, Save, Users, Info } from "lucide-react";
import api from "@/lib/api";

const INK = "#1f2937";
const ACC = "#0f766e";
const border = { border: "0.5px solid #e5e7eb" };
const PATH_TINT: Record<string, string> = { stem: "#f1f5f9", "social-sciences": "#f1f5f9", "arts-sports": "#f1f5f9" };

type Subj = { name: string; key: string | null; offered: boolean };
type Track = { key: string; name: string; offered: boolean; students: number; subjects: Subj[] };
type Pathway = { key: string; name: string; short: string; students: number; tracks: Track[] };
type PathwaysData = { core: { subjects: string[]; math: { stem: string; other: string }; support: string[]; electivesPerLearner: number }; pathways: Pathway[] };
type Learner = { _id: string; name: string; adm: string; gender: string; stream: string; pathway: string; track: string; electives: string[] };

export default function Pathways() {
    const qc = useQueryClient();
    const { data, isLoading } = useQuery<PathwaysData>({ queryKey: ["pathways"], queryFn: async () => (await api.get("/pathways")).data });
    const [open, setOpen] = useState<string | null>("stem");
    const [tab, setTab] = useState<"pathways" | "learners">("pathways");

    const tracksMut = useMutation({
        mutationFn: async (offeredTracks: string[]) => (await api.put("/pathways/tracks", { offeredTracks })).data,
        onSuccess: (d: { message?: string }) => { toast.success(d.message || "Saved"); qc.invalidateQueries({ queryKey: ["pathways"] }); },
        onError: () => toast.error("Could not save"),
    });
    const toggleTrack = (key: string) => {
        if (!data) return;
        const on = data.pathways.flatMap(p => p.tracks).filter(t => t.offered).map(t => t.key);
        tracksMut.mutate(on.includes(key) ? on.filter(k => k !== key) : [...on, key]);
    };

    return (
        <div className="min-h-screen bg-[#f6f7fb] p-4 sm:p-6">
            <div className="max-w-6xl mx-auto space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white" style={{ background: INK }}><Route className="w-5 h-5" /></div>
                        <div><h1 className="text-xl font-black" style={{ color: INK }}>Pathways</h1><p className="text-xs text-slate-500">CBE senior school (Grades 10–12): pathways, tracks and the learners in them.</p></div>
                    </div>
                    <div className="flex rounded-xl p-1 bg-white" style={border}>
                        {(["pathways", "learners"] as const).map(t => (
                            <button key={t} onClick={() => setTab(t)} className={`px-4 h-9 rounded-lg text-sm font-bold ${tab === t ? "text-white" : "text-slate-500"}`} style={tab === t ? { background: INK } : {}}>{t === "pathways" ? "Pathways & tracks" : "Assign learners"}</button>
                        ))}
                    </div>
                </div>

                {data && (
                    <div className="rounded-2xl p-4 flex gap-3 text-sm" style={{ background: "#ffffff", border: "0.5px solid #e5e7eb" }}>
                        <Info className="w-4 h-4 mt-0.5 shrink-0 text-slate-500" />
                        <div className="text-slate-700">
                            Every learner takes <b>4 core subjects</b> — {data.core.subjects.slice(0, 2).join(", ")} (or Kenyan Sign Language), Mathematics (<b>{data.core.math.stem}</b> in STEM, <b>{data.core.math.other}</b> in the other pathways) and {data.core.subjects[2]} — plus <b>{data.core.electivesPerLearner} electives</b> from their track, and {data.core.support.join(" and ")}.
                        </div>
                    </div>
                )}

                {isLoading || !data ? <div className="py-20 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div> : tab === "pathways" ? (
                    <div className="bg-white rounded-2xl overflow-hidden" style={border}>
                        <div className="hidden sm:grid grid-cols-[1fr_120px_160px_40px] px-5 py-3 text-[10px] font-black uppercase tracking-wide text-slate-400 border-b border-slate-100">
                            <span>Pathway</span><span>Tracks</span><span>Assigned learners</span><span />
                        </div>
                        {data.pathways.map(p => (
                            <div key={p.key} className="border-b border-slate-100 last:border-0">
                                <button onClick={() => setOpen(open === p.key ? null : p.key)} className="w-full grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_120px_160px_40px] items-center px-5 py-4 text-left hover:bg-slate-50/60">
                                    <span className="flex items-center gap-3"><span className="w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-black" style={{ background: PATH_TINT[p.key], color: INK }}>{p.short}</span><span className="font-black uppercase tracking-wide" style={{ color: INK }}>{p.name}</span></span>
                                    <span className="hidden sm:block text-sm text-slate-600">{p.tracks.length}</span>
                                    <span className="hidden sm:block text-sm text-slate-600">{p.students}</span>
                                    {open === p.key ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                                </button>
                                {open === p.key && (
                                    <div className="px-5 pb-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {p.tracks.map(t => (
                                            <div key={t.key} className={`rounded-xl p-3 ${t.offered ? "bg-white" : "bg-slate-50 opacity-70"}`} style={border}>
                                                <div className="flex items-start justify-between gap-2 mb-2">
                                                    <div><div className="font-black text-sm" style={{ color: INK }}>{t.name}</div><div className="text-[11px] text-slate-500">{t.students} learner{t.students === 1 ? "" : "s"}</div></div>
                                                    <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 cursor-pointer"><input type="checkbox" checked={t.offered} onChange={() => toggleTrack(t.key)} disabled={tracksMut.isPending} className="w-4 h-4 accent-slate-700" /> Offered</label>
                                                </div>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {t.subjects.map(s => <span key={s.name} title={s.offered ? "Your school offers this subject" : "Not ticked under Subjects we offer"} className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${s.offered ? "bg-slate-100 text-slate-700" : "bg-white text-slate-400 border border-dashed border-slate-200"}`}>{s.name}</span>)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : <AssignLearners data={data} />}
            </div>
        </div>
    );
}

function AssignLearners({ data }: { data: PathwaysData }) {
    const qc = useQueryClient();
    const { data: classes = [] } = useQuery<{ _id: string; name: string }[]>({ queryKey: ["v2_classes"], queryFn: async () => (await api.get("/v2/classes")).data || [] });
    const { data: streams = [] } = useQuery<{ _id: string; name: string; classId: string }[]>({ queryKey: ["v2_streams"], queryFn: async () => (await api.get("/v2/streams")).data || [] });
    const senior = classes.filter(c => /grade\s*1[0-2]\b/i.test(c.name));
    const choices = senior.length ? senior : classes;
    const [cls, setCls] = useState("");
    const [stream, setStream] = useState("");
    useEffect(() => { if (!cls && choices.length) setCls(choices[0].name); }, [choices.length]); // eslint-disable-line react-hooks/exhaustive-deps
    const clsObj = classes.find(c => c.name === cls);
    const { data: learners = [], isFetching } = useQuery<Learner[]>({
        queryKey: ["pathway_learners", cls, stream], enabled: !!cls,
        queryFn: async () => (await api.get("/pathways/learners", { params: { class: cls, stream: stream || undefined } })).data,
    });
    const [rows, setRows] = useState<Record<string, { pathway: string; track: string; electives: string[] }>>({});
    const [picked, setPicked] = useState<Set<string>>(new Set());
    useEffect(() => { const r: typeof rows = {}; learners.forEach(l => { r[l._id] = { pathway: l.pathway, track: l.track, electives: l.electives }; }); setRows(r); setPicked(new Set()); }, [learners]);
    const dirty = useMemo(() => learners.filter(l => { const r = rows[l._id]; return r && (r.pathway !== l.pathway || r.track !== l.track || r.electives.join("|") !== l.electives.join("|")); }), [learners, rows]);

    const tracksOf = (p: string) => data.pathways.find(x => x.key === p)?.tracks.filter(t => t.offered) || [];
    const electivesOf = (p: string, t: string) => {
        const tr = data.pathways.find(x => x.key === p)?.tracks.find(x => x.key === t);
        // the track's subjects first, then other offered elective subjects (accredited combinations can cross tracks)
        const others = data.pathways.flatMap(x => x.tracks.flatMap(y => y.subjects)).filter(s => s.offered).map(s => s.name);
        return Array.from(new Set([...(tr?.subjects.map(s => s.name) || []), ...others]));
    };
    const set = (id: string, patch: Partial<{ pathway: string; track: string; electives: string[] }>) => setRows(r => ({ ...r, [id]: { ...r[id], ...patch } }));
    const bulk = (pathway: string, track: string) => setRows(r => { const n = { ...r }; picked.forEach(id => { n[id] = { pathway, track, electives: pathway === n[id]?.pathway && track === n[id]?.track ? n[id].electives : [] }; }); return n; });
    const [bp, setBp] = useState(""); const [bt, setBt] = useState("");

    const save = useMutation({
        mutationFn: async () => (await api.post("/pathways/assign", { assignments: dirty.map(l => ({ studentId: l._id, ...rows[l._id] })) })).data,
        onSuccess: (d: { message?: string }) => { toast.success(d.message || "Saved"); qc.invalidateQueries({ queryKey: ["pathway_learners"] }); qc.invalidateQueries({ queryKey: ["pathways"] }); },
        onError: () => toast.error("Could not save"),
    });
    const sel = "h-9 px-2 rounded-lg text-xs bg-white outline-none";

    return (
        <div className="bg-white rounded-2xl p-4" style={border}>
            <div className="flex flex-wrap items-end gap-3 mb-4">
                <label><span className="block text-[11px] font-bold text-slate-500 mb-1">Class</span>
                    <select className={`${sel} min-w-[140px]`} style={border} value={cls} onChange={e => { setCls(e.target.value); setStream(""); }}>{choices.map(c => <option key={c._id} value={c.name}>{c.name}</option>)}</select></label>
                <label><span className="block text-[11px] font-bold text-slate-500 mb-1">Stream</span>
                    <select className={`${sel} min-w-[120px]`} style={border} value={stream} onChange={e => setStream(e.target.value)}><option value="">All</option>{streams.filter(s => String(s.classId) === String(clsObj?._id)).map(s => <option key={s._id} value={s.name}>{s.name}</option>)}</select></label>
                {picked.size > 0 && (
                    <div className="flex flex-wrap items-end gap-2 rounded-xl px-3 py-2 w-full md:w-auto" style={{ background: "#f8fafc" }}>
                        <span className="text-xs font-bold self-center" style={{ color: INK }}>{picked.size} selected →</span>
                        <select className={sel} style={border} value={bp} onChange={e => { setBp(e.target.value); setBt(""); }}><option value="">Pathway…</option>{data.pathways.map(p => <option key={p.key} value={p.key}>{p.name}</option>)}</select>
                        <select className={sel} style={border} value={bt} onChange={e => setBt(e.target.value)} disabled={!bp}><option value="">Track…</option>{tracksOf(bp).map(t => <option key={t.key} value={t.key}>{t.name}</option>)}</select>
                        <button disabled={!bp} onClick={() => bulk(bp, bt)} className="h-9 px-3 rounded-lg text-xs font-bold text-white disabled:opacity-50" style={{ background: INK }}>Apply</button>
                    </div>
                )}
                <button disabled={!dirty.length || save.isPending} onClick={() => save.mutate()} className="ml-auto h-10 px-4 rounded-xl text-sm font-bold text-white flex items-center gap-1.5 disabled:opacity-50" style={{ background: ACC }}>{save.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save{dirty.length ? ` (${dirty.length})` : ""}</button>
            </div>
            {isFetching ? <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div> : !learners.length ? (
                <div className="py-14 text-center text-sm text-slate-500 flex flex-col items-center gap-2"><Users className="w-6 h-6 text-slate-300" />No learners in {cls || "this class"}.</div>
            ) : (
                <>
                {/* phones: one card per learner */}
                <div className="md:hidden space-y-2">
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-600 px-1"><input type="checkbox" checked={picked.size === learners.length} onChange={e => setPicked(e.target.checked ? new Set(learners.map(l => l._id)) : new Set())} className="w-4 h-4" /> Select all</label>
                    {learners.map(l => {
                        const r = rows[l._id] || { pathway: "", track: "", electives: [] };
                        const opts = electivesOf(r.pathway, r.track);
                        return (
                            <div key={l._id} className="rounded-xl p-3 bg-slate-50/60 space-y-2" style={border}>
                                <label className="flex items-start gap-2">
                                    <input type="checkbox" checked={picked.has(l._id)} onChange={() => setPicked(p => { const n = new Set(p); if (n.has(l._id)) n.delete(l._id); else n.add(l._id); return n; })} className="w-4 h-4 mt-0.5" />
                                    <span><span className="block font-bold" style={{ color: INK }}>{l.name}</span><span className="text-[11px] text-slate-400">{[l.adm, l.stream].filter(Boolean).join(" · ")}</span></span>
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    <select className={`${sel} w-full`} style={border} value={r.pathway} onChange={e => set(l._id, { pathway: e.target.value, track: "", electives: [] })}><option value="">Pathway…</option>{data.pathways.map(p => <option key={p.key} value={p.key}>{p.name}</option>)}</select>
                                    <select className={`${sel} w-full`} style={border} value={r.track} disabled={!r.pathway} onChange={e => set(l._id, { track: e.target.value, electives: [] })}><option value="">Track…</option>{tracksOf(r.pathway).map(t => <option key={t.key} value={t.key}>{t.name}</option>)}</select>
                                </div>
                                <div className="grid grid-cols-1 gap-2">
                                    {Array.from({ length: data.core.electivesPerLearner }).map((_, i) => (
                                        <select key={i} className={`${sel} w-full`} style={border} disabled={!r.pathway} value={r.electives[i] || ""} onChange={e => { const ev = [...r.electives]; ev[i] = e.target.value; set(l._id, { electives: ev.filter(Boolean) }); }}>
                                            <option value="">Elective {i + 1}</option>{opts.filter(o => o === r.electives[i] || !r.electives.includes(o)).map(o => <option key={o} value={o}>{o}</option>)}
                                        </select>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm min-w-[880px]">
                        <thead><tr className="text-[10px] font-black uppercase tracking-wide text-slate-400 text-left">
                            <th className="py-2 w-8"><input type="checkbox" checked={picked.size === learners.length} onChange={e => setPicked(e.target.checked ? new Set(learners.map(l => l._id)) : new Set())} className="w-4 h-4" /></th>
                            <th>Learner</th><th>Pathway</th><th>Track</th><th>Electives ({data.core.electivesPerLearner})</th>
                        </tr></thead>
                        <tbody>
                            {learners.map(l => {
                                const r = rows[l._id] || { pathway: "", track: "", electives: [] };
                                const opts = electivesOf(r.pathway, r.track);
                                return (
                                    <tr key={l._id} className="border-t border-slate-100">
                                        <td className="py-2"><input type="checkbox" checked={picked.has(l._id)} onChange={() => setPicked(p => { const n = new Set(p); if (n.has(l._id)) n.delete(l._id); else n.add(l._id); return n; })} className="w-4 h-4" /></td>
                                        <td className="min-w-[170px] pr-2"><div className="font-bold" style={{ color: INK }}>{l.name}</div><div className="text-[11px] text-slate-400">{[l.adm, l.stream].filter(Boolean).join(" · ")}</div></td>
                                        <td><select className={sel} style={border} value={r.pathway} onChange={e => set(l._id, { pathway: e.target.value, track: "", electives: [] })}><option value="">—</option>{data.pathways.map(p => <option key={p.key} value={p.key}>{p.name}</option>)}</select></td>
                                        <td><select className={sel} style={border} value={r.track} disabled={!r.pathway} onChange={e => set(l._id, { track: e.target.value, electives: [] })}><option value="">—</option>{tracksOf(r.pathway).map(t => <option key={t.key} value={t.key}>{t.name}</option>)}</select></td>
                                        <td><div className="flex gap-1.5">{Array.from({ length: data.core.electivesPerLearner }).map((_, i) => (
                                            <select key={i} className={`${sel} w-36`} style={border} disabled={!r.pathway} value={r.electives[i] || ""} onChange={e => { const ev = [...r.electives]; ev[i] = e.target.value; set(l._id, { electives: ev.filter(Boolean) }); }}>
                                                <option value="">Elective {i + 1}</option>{opts.filter(o => o === r.electives[i] || !r.electives.includes(o)).map(o => <option key={o} value={o}>{o}</option>)}
                                            </select>
                                        ))}</div></td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                </>
            )}
        </div>
    );
}
