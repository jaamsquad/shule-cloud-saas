/**
 * Sports: add students to a sport by hand (by class or admission number / name) and issue
 * participation certificates to its participants with the same designs as the student profile.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Award, Check, Loader2, Printer, Search, UserPlus, X } from "lucide-react";
import QRCode from "qrcode";
import { toast } from "sonner";
import api from "@/lib/api";
import { useSchoolBrand } from "@/lib/printDoc";
import { outputHtmlDoc } from "@/lib/pdfDoc";
import { CERT_STYLES, CertData, certificateHtml, combineCertificates } from "../students/certificates/certStyles";
import { PLACEHOLDER_QR } from "../students/certificates/CertificateModal";

const inp = "w-full h-10 px-3 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:border-[#5C67F2]";
const nameOf = (s: any) => s?.studentName || `${s?.firstName || ""} ${s?.lastName || ""}`.trim() || s?.name || "—";
const admOf = (s: any) => s?.registrationNo || s?.admissionNumber || s?.admNo || "";
const classOf = (s: any) => s?.studentClass || s?.currentClass || "";
const LEFT_SCHOOL = /graduat|transfer|left|withdraw|expel|deceas|alumni|inactive|suspend/i;

function Shell({ title, sub, icon, onClose, children, footer }: { title: string; sub?: string; icon: React.ReactNode; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-3" onClick={onClose}>
            <div className="bg-white rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]" onClick={e => e.stopPropagation()}>
                <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-[#5C67F2]/10 text-[#5C67F2] flex items-center justify-center shrink-0">{icon}</div>
                        <div className="min-w-0"><h3 className="font-black text-slate-800 text-lg truncate">{title}</h3>{sub && <p className="text-xs font-bold text-slate-500 truncate">{sub}</p>}</div>
                    </div>
                    <button onClick={onClose} className="w-9 h-9 flex items-center justify-center bg-slate-200 hover:bg-slate-300 rounded-full text-slate-600 shrink-0"><X className="w-4 h-4" /></button>
                </div>
                <div className="flex-1 overflow-y-auto">{children}</div>
                {footer && <div className="p-4 border-t border-slate-100 bg-slate-50 flex flex-wrap items-center justify-end gap-3">{footer}</div>}
            </div>
        </div>
    );
}

/** A landscape A4 certificate scaled to whatever width its box has. */
function CertPreview({ html }: { html: string }) {
    const box = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(0.5);
    useEffect(() => {
        const el = box.current; if (!el) return;
        const fit = () => setScale(el.clientWidth / 1123);
        fit();
        const ro = new ResizeObserver(fit); ro.observe(el);
        return () => ro.disconnect();
    }, []);
    return (
        <div ref={box} className="relative overflow-hidden w-full" style={{ aspectRatio: "1123 / 794" }}>
            <iframe title="preview" srcDoc={html} className="absolute top-0 left-0 border-0 origin-top-left" style={{ width: 1123, height: 794, transform: `scale(${scale})` }} />
        </div>
    );
}

// ─── Add students ──────────────────────────────────────────────────────────────
export function AddStudentsModal({ sport, onClose }: { sport: any; onClose: () => void }) {
    const qc = useQueryClient();
    const [mode, setMode] = useState<"class" | "search">("class");
    const [cls, setCls] = useState("");
    const [q, setQ] = useState("");
    const [picked, setPicked] = useState<Set<string>>(new Set());
    const fee = Number(sport.fee) || 0;
    const [billFee, setBillFee] = useState(fee > 0);
    const [busy, setBusy] = useState(false);

    const { data: students = [], isLoading } = useQuery<any[]>({
        queryKey: ["sports_students_lookup"],
        queryFn: async () => { try { const r = await api.get("/students"); return Array.isArray(r.data) ? r.data : []; } catch { return []; } },
    });
    const { data: enrollments = [] } = useQuery<any[]>({
        queryKey: ["sports_enrollments"],
        queryFn: async () => { try { const r = await api.get("/sports-enrollments"); return Array.isArray(r.data) ? r.data : []; } catch { return []; } },
    });
    const inSport = useMemo(() => new Set(enrollments.filter((e: any) => String(e.sportId) === String(sport._id) && e.status !== "declined").map((e: any) => String(e.studentId))), [enrollments, sport._id]);
    const active = useMemo(() => students.filter((s: any) => !LEFT_SCHOOL.test(String(s.status || ""))), [students]);
    const classes = useMemo(() => [...new Set(active.map(classOf).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })), [active]);

    const shown = useMemo(() => {
        if (mode === "class") return cls ? active.filter((s: any) => classOf(s) === cls) : [];
        const t = q.trim().toLowerCase();
        if (t.length < 2) return [];
        return active.filter((s: any) => admOf(s).toLowerCase().includes(t) || nameOf(s).toLowerCase().includes(t)).slice(0, 100);
    }, [mode, cls, q, active]);
    const selectable = shown.filter((s: any) => !inSport.has(String(s._id)));
    const allOn = selectable.length > 0 && selectable.every((s: any) => picked.has(String(s._id)));
    const toggle = (id: string) => setPicked(p => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
    const toggleAll = () => setPicked(p => { const n = new Set(p); selectable.forEach((s: any) => allOn ? n.delete(String(s._id)) : n.add(String(s._id))); return n; });

    const capacity = Number(sport.capacity) || 0;
    const left = capacity ? Math.max(0, capacity - inSport.size) : null;

    const add = async () => {
        setBusy(true);
        try {
            const r = (await api.post(`/sports/${sport._id}/participants`, { studentIds: [...picked], billFee })).data;
            const n = r.added?.length || 0;
            if (n) toast.success(`${n} student${n === 1 ? "" : "s"} added to ${sport.name}`);
            if (r.skipped?.length) toast.warning(`${r.skipped.length} not added: ${r.skipped.slice(0, 3).map((x: any) => `${x.studentName || "student"} (${x.reason})`).join(", ")}${r.skipped.length > 3 ? "…" : ""}`);
            qc.invalidateQueries({ queryKey: ["sports_enrollments"] });
            if (n) onClose();
        } catch (e: any) { toast.error(e?.response?.data?.message || "Could not add students"); } finally { setBusy(false); }
    };

    return (
        <Shell title={`Add students — ${sport.name}`} sub={[sport.gender, sport.ageGroup, sport.term, left !== null ? `${left} place${left === 1 ? "" : "s"} left of ${capacity}` : ""].filter(Boolean).join(" · ")} icon={<UserPlus className="w-5 h-5" />} onClose={onClose}
            footer={<>
                {fee > 0 && (
                    <label className="mr-auto flex items-center gap-2 text-sm font-bold text-slate-600">
                        <input type="checkbox" checked={billFee} onChange={e => setBillFee(e.target.checked)} className="w-4 h-4 accent-[#5C67F2]" />
                        Invoice the sport fee (KSh {fee.toLocaleString()} each)
                    </label>
                )}
                <button onClick={onClose} className="h-10 px-5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600">Cancel</button>
                <button onClick={add} disabled={!picked.size || busy} className="h-10 px-5 bg-[#5C67F2] text-white rounded-xl text-sm font-bold flex items-center gap-2 disabled:opacity-50">
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />} Add {picked.size || ""} student{picked.size === 1 ? "" : "s"}
                </button>
            </>}>
            <div className="p-5 space-y-4">
                <div className="flex gap-2 bg-slate-100 p-1 rounded-xl w-fit">
                    {(["class", "search"] as const).map(m => (
                        <button key={m} onClick={() => setMode(m)} className={`h-9 px-4 rounded-lg text-xs font-black uppercase tracking-wider ${mode === m ? "bg-white text-[#5C67F2] shadow-sm" : "text-slate-500"}`}>
                            {m === "class" ? "By class" : "By Adm No / name"}
                        </button>
                    ))}
                </div>
                {mode === "class" ? (
                    <select value={cls} onChange={e => setCls(e.target.value)} className={inp + " max-w-sm"}>
                        <option value="">Select a class…</option>
                        {classes.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                ) : (
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Type an admission number or name…" className={inp + " pl-9"} />
                    </div>
                )}
                {picked.size > 0 && <p className="text-xs font-bold text-[#5C67F2]">{picked.size} selected (selections are kept when you change class or search)</p>}

                <div className="border border-slate-100 rounded-2xl overflow-hidden">
                    {isLoading ? (
                        <div className="py-12 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-slate-300" /></div>
                    ) : shown.length === 0 ? (
                        <p className="py-12 text-center text-xs font-bold uppercase text-slate-400">{mode === "class" ? (cls ? "No students in this class" : "Pick a class to list its students") : (q.trim().length < 2 ? "Type at least 2 characters" : "No student matches")}</p>
                    ) : (
                        <table className="w-full text-sm">
                            <thead><tr className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-wider text-left">
                                <th className="py-2.5 px-4 w-10"><input type="checkbox" checked={allOn} onChange={toggleAll} disabled={!selectable.length} className="w-4 h-4 accent-[#5C67F2]" /></th>
                                <th className="py-2.5 px-2">Adm No</th><th className="py-2.5 px-2">Student</th><th className="py-2.5 px-2">Class</th><th className="py-2.5 px-2">Gender</th><th className="py-2.5 px-2" />
                            </tr></thead>
                            <tbody className="divide-y divide-slate-50">
                                {shown.map((s: any) => {
                                    const id = String(s._id), already = inSport.has(id);
                                    return (
                                        <tr key={id} onClick={() => !already && toggle(id)} className={already ? "opacity-60" : "cursor-pointer hover:bg-slate-50"}>
                                            <td className="py-2 px-4"><input type="checkbox" disabled={already} checked={already || picked.has(id)} onChange={() => toggle(id)} onClick={e => e.stopPropagation()} className="w-4 h-4 accent-[#5C67F2]" /></td>
                                            <td className="py-2 px-2 text-slate-500">{admOf(s) || "—"}</td>
                                            <td className="py-2 px-2 font-bold text-slate-800">{nameOf(s)}</td>
                                            <td className="py-2 px-2 text-slate-500">{classOf(s) || "—"}</td>
                                            <td className="py-2 px-2 text-slate-500">{s.gender || "—"}</td>
                                            <td className="py-2 px-2 text-right">{already && <span className="text-[10px] font-black uppercase text-emerald-600 inline-flex items-center gap-1"><Check className="w-3 h-3" /> In sport</span>}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </Shell>
    );
}

// ─── Participation certificates ──────────────────────────────────────────────────
const CERT_KINDS = [
    { key: "participation", label: "Participation", subtitle: "OF PARTICIPATION" },
    { key: "sports", label: "Sporting Excellence", subtitle: "OF SPORTING EXCELLENCE" },
    { key: "achievement", label: "Achievement", subtitle: "OF ACHIEVEMENT" },
    { key: "appreciation", label: "Appreciation", subtitle: "OF APPRECIATION" },
];
const qrOf = (url: string) => QRCode.toDataURL(url, { margin: 1, width: 240, errorCorrectionLevel: "M" });
const withPrint = (html: string) => html.replace("</body>", "<script>window.onload=()=>setTimeout(()=>window.print(),300)</script></body>");

export function SportCertificatesModal({ sport, onClose }: { sport: any; onClose: () => void }) {
    const qc = useQueryClient();
    const school = useSchoolBrand();
    const year = String(new Date().getFullYear());
    const { data: enrollments = [], isLoading } = useQuery<any[]>({
        queryKey: ["sports_enrollments"],
        queryFn: async () => { try { const r = await api.get("/sports-enrollments"); return Array.isArray(r.data) ? r.data : []; } catch { return []; } },
    });
    const rows = useMemo(() => enrollments.filter((e: any) => String(e.sportId) === String(sport._id) && e.status !== "declined" && e.studentId)
        .sort((a: any, b: any) => String(a.studentName || "").localeCompare(String(b.studentName || ""))), [enrollments, sport._id]);
    const [picked, setPicked] = useState<Set<string> | null>(null);   // null = everyone
    const on = (id: string) => picked ? picked.has(id) : true;
    const chosen = rows.filter((r: any) => on(String(r._id)));
    const toggle = (id: string) => setPicked(p => { const n = new Set(p ?? rows.map((r: any) => String(r._id))); if (n.has(id)) n.delete(id); else n.add(id); return n; });
    const allOn = rows.length > 0 && chosen.length === rows.length;

    const [kind, setKind] = useState("participation");
    const [style, setStyle] = useState("gold");
    const [title, setTitle] = useState("CERTIFICATE");
    const [subtitle, setSubtitle] = useState("OF PARTICIPATION");
    const event = [sport.name, sport.ageGroup, sport.gender].filter(Boolean).join(" ");
    const [body, setBody] = useState(`for active participation in ${event}${sport.term ? ` during ${sport.term}` : ""} ${year} at ${school.name === "School" ? "the school" : school.name}, showing commitment, teamwork and good sportsmanship.`);
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const [sig, setSig] = useState([{ name: sport.coach || "", title: "Coach" }, { name: "", title: "Principal" }]);
    const [busy, setBusy] = useState(false);

    const pickKind = (k: string) => { setKind(k); setSubtitle(CERT_KINDS.find(x => x.key === k)!.subtitle); };
    const brand = { name: school.name, logo: school.logo, address: school.address, signature: school.signature, stamp: school.stamp };
    const sample = chosen[0] || rows[0];
    const fill = (t: string, r: any) => t.replace(/\{name\}/gi, r?.studentName || "Student Name").replace(/\{class\}/gi, r?.studentClass || "").replace(/\{sport\}/gi, sport.name || "");
    const card = (r: any, over: Partial<CertData> = {}): CertData => ({ style, title: fill(title, r), subtitle: fill(subtitle, r), name: r?.studentName || "Student Name", body: fill(body, r), date, signatories: sig, certNo: "CN‑XXXXXXXXXX", qr: PLACEHOLDER_QR, school: brand, ...over });
    const preview = useMemo(() => certificateHtml(card(sample)), [style, title, subtitle, body, date, sig, sample, school.name, school.logo, school.signature, school.stamp]); // eslint-disable-line react-hooks/exhaustive-deps

    const issue = async () => {
        if (!chosen.length) return;
        if (!body.trim()) { toast.error("Write what the certificate is awarded for."); return; }
        setBusy(true);
        try {
            const r = (await api.post(`/sports/${sport._id}/certificates`, { enrollmentIds: chosen.map((x: any) => x._id), type: kind, style, title, subtitle, body, date, signatories: sig })).data;
            const issued: any[] = r.issued || [];
            if (issued.length) {
                const docs = await Promise.all(issued.map(async (c: any) => certificateHtml({ style: c.style, title: c.title, subtitle: c.subtitle, name: c.studentName, body: c.body, date: c.date, signatories: c.signatories || [], certNo: c.certId, qr: await qrOf(c.verifyUrl), school: brand })));
                await outputHtmlDoc(`${sport.name} certificates`, withPrint(combineCertificates(docs)), { fileName: `${sport.name}-certificates`, landscape: true });
                toast.success(`${issued.length} certificate${issued.length === 1 ? "" : "s"} issued`);
            }
            if (r.failed?.length) toast.warning(`${r.failed.length} not issued: ${r.failed.slice(0, 3).map((x: any) => `${x.studentName || "student"} (${x.reason})`).join(", ")}`);
            qc.invalidateQueries({ queryKey: ["sports_enrollments"] });
        } catch (e: any) { toast.error(e?.response?.data?.message || "Could not issue certificates"); } finally { setBusy(false); }
    };

    return (
        <Shell title={`Certificates — ${sport.name}`} sub="Same designs as the student profile; each certificate gets its own number and a QR that verifies it online." icon={<Award className="w-5 h-5" />} onClose={onClose}
            footer={<>
                <span className="mr-auto text-xs font-bold text-slate-500">{chosen.length} of {rows.length} participant{rows.length === 1 ? "" : "s"} selected</span>
                <button onClick={onClose} className="h-10 px-5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600">Close</button>
                <button onClick={issue} disabled={!chosen.length || busy} className="h-10 px-5 bg-[#5C67F2] text-white rounded-xl text-sm font-bold flex items-center gap-2 disabled:opacity-50">
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />} Issue &amp; print {chosen.length || ""}
                </button>
            </>}>
            <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] bg-[#f4f7f6]">
                <div className="p-5 space-y-5 bg-white lg:border-r border-slate-100">
                    <div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">1 · Participants</div>
                        <div className="border border-slate-100 rounded-xl max-h-56 overflow-y-auto">
                            {isLoading ? <div className="py-6 flex justify-center"><Loader2 className="w-4 h-4 animate-spin text-slate-300" /></div>
                                : rows.length === 0 ? <p className="py-6 text-center text-xs font-bold text-slate-400">No participants yet — add students first.</p>
                                : <>
                                    <label className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 text-xs font-black uppercase text-slate-500 cursor-pointer">
                                        <input type="checkbox" checked={allOn} onChange={() => setPicked(allOn ? new Set() : null)} className="w-4 h-4 accent-[#5C67F2]" /> Everyone ({rows.length})
                                    </label>
                                    {rows.map((r: any) => (
                                        <label key={r._id} className="flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer hover:bg-slate-50">
                                            <input type="checkbox" checked={on(String(r._id))} onChange={() => toggle(String(r._id))} className="w-4 h-4 accent-[#5C67F2]" />
                                            <span className="font-bold text-slate-700 truncate">{r.studentName}</span>
                                            <span className="text-[11px] text-slate-400 truncate">{[r.admNo, r.studentClass].filter(Boolean).join(" · ")}</span>
                                            {r.certificates?.length > 0 && <Award className="w-3.5 h-3.5 text-amber-500 ml-auto shrink-0" />}
                                        </label>
                                    ))}
                                </>}
                        </div>
                    </div>
                    <div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">2 · Certificate</div>
                        <div className="grid grid-cols-2 gap-2">
                            {CERT_KINDS.map(k => (
                                <button key={k.key} onClick={() => pickKind(k.key)} className={`h-9 rounded-xl border-2 text-xs font-bold ${kind === k.key ? "border-[#5C67F2] bg-indigo-50 text-[#5C67F2]" : "border-slate-100 text-slate-600"}`}>{k.label}</button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">3 · Design</div>
                        <div className="grid grid-cols-3 gap-2">
                            {CERT_STYLES.map(s => (
                                <button key={s.key} onClick={() => setStyle(s.key)} title={s.note} className={`rounded-xl border-2 overflow-hidden ${style === s.key ? "border-[#5C67F2] ring-2 ring-[#5C67F2]/20" : "border-slate-100"}`}>
                                    <div className="h-14 relative overflow-hidden bg-white"><iframe title={s.key} srcDoc={certificateHtml({ style: s.key, title: "CERTIFICATE", subtitle: "", name: "Name", body: "", date: "", signatories: [], certNo: "", qr: "", school: { name: "" } })} className="absolute top-0 left-0 origin-top-left pointer-events-none border-0" style={{ width: 1123, height: 794, transform: "scale(0.1)" }} /></div>
                                    <div className="text-[10px] font-bold text-slate-600 py-1">{s.label}</div>
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="space-y-3">
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">4 · Wording</div>
                        <div className="grid grid-cols-2 gap-2">
                            <div><label className="block text-[11px] font-bold text-slate-500 mb-1">Title</label><input className={inp} value={title} onChange={e => setTitle(e.target.value)} /></div>
                            <div><label className="block text-[11px] font-bold text-slate-500 mb-1">Sub-title</label><input className={inp} value={subtitle} onChange={e => setSubtitle(e.target.value)} /></div>
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 mb-1">Awarded for</label>
                            <textarea rows={4} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#5C67F2]" value={body} onChange={e => setBody(e.target.value)} />
                            <p className="text-[10px] text-slate-400 mt-1">You can use {"{name}"}, {"{class}"} and {"{sport}"} — filled in for each student.</p>
                        </div>
                        <div><label className="block text-[11px] font-bold text-slate-500 mb-1">Date</label><input type="date" className={inp} value={date} onChange={e => setDate(e.target.value)} /></div>
                        <div className="grid grid-cols-2 gap-2">
                            {sig.map((s, i) => (
                                <div key={i} className="space-y-1">
                                    <input className={inp} placeholder="Signatory name" value={s.name} onChange={e => setSig(a => a.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
                                    <input className={inp} placeholder="Title" value={s.title} onChange={e => setSig(a => a.map((x, j) => j === i ? { ...x, title: e.target.value } : x))} />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="p-5">
                    <div className="bg-white rounded-2xl border border-slate-100 p-3 shadow-sm">
                        <CertPreview html={preview} />
                        <p className="text-center text-[11px] text-slate-400 mt-2">Preview for {sample?.studentName || "a participant"} — each student gets their own page, number and QR.</p>
                    </div>
                </div>
            </div>
        </Shell>
    );
}
