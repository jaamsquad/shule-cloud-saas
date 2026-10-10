import { useMemo, useState } from "react";
import { X, Loader2, Printer, Award, ShieldCheck, Ban } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import QRCode from "qrcode";
import { toast } from "sonner";
import api from "@/lib/api";
import { useSchoolBrand } from "@/lib/printDoc";
import { outputHtmlDoc } from "@/lib/pdfDoc";
import { CERT_STYLES, CERT_TYPES, certificateHtml, defaultBody, CertData } from "./certStyles";

const inp = "w-full h-10 px-3 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-[#5C67F2]";
const fmtLong = (iso?: string) => { if (!iso) return ""; const d = new Date(String(iso).slice(0, 10) + "T00:00:00"); return isNaN(d.getTime()) ? String(iso) : d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }); };

const qrOf = (url: string) => QRCode.toDataURL(url, { margin: 1, width: 240, errorCorrectionLevel: "M" });
const withPrint = (html: string) => html.replace("</body>", "<script>window.onload=()=>setTimeout(()=>window.print(),250)</script></body>");

/** "Generate certificate" for one student: pick a type and a design, edit the wording, issue it, print it (with a QR that verifies it online). */
export default function CertificateModal({ student, onClose }: { student: any; onClose: () => void }) {
    const qc = useQueryClient();
    const school = useSchoolBrand();
    const name = student.studentName || `${student.firstName || ""} ${student.lastName || ""}`.trim();
    const isTransferred = String(student.status || "").toLowerCase() === "transferred";
    const types = CERT_TYPES.filter(t => !t.needsTransfer || isTransferred);   // transfer certificates only for transferred students
    const className = student.studentClass || student.currentClass || student.statusPrevClass?.studentClass || "";
    const year = String(new Date().getFullYear());

    const ctx = { school: school.name, className, gender: student.gender, admission: student.admissionDate && /^\d{4}-\d{2}-\d{2}/.test(String(student.admissionDate)) ? fmtLong(student.admissionDate) : "", year, transferTo: student.transfer?.toSchool, transferDate: fmtLong(student.transfer?.date) };
    const [type, setType] = useState(types[0].key);
    const [style, setStyle] = useState("gold");
    const [title, setTitle] = useState("CERTIFICATE");
    const [subtitle, setSubtitle] = useState(types[0].subtitle);   // (graduation is the first type)
    const [body, setBody] = useState(defaultBody(types[0].key, ctx));
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const [sig, setSig] = useState([{ name: "", title: "Class Teacher" }, { name: "", title: "Principal" }]);
    const [busy, setBusy] = useState(false);

    const { data: issued = [] } = useQuery<any[]>({ queryKey: ["student_certs", student._id], queryFn: async () => (await api.get(`/students/${student._id}/certificates`)).data || [] });

    // types whose heading is the whole name of the document rather than "CERTIFICATE … OF X"
    const WHOLE_TITLE: Record<string, string> = { recommendation: "LETTER OF RECOMMENDATION", leaving: "LEAVING CERTIFICATE", transfer: "TRANSFER CERTIFICATE", character: "CHARACTER CERTIFICATE" };
    const pickType = (key: string) => {
        const t = CERT_TYPES.find(x => x.key === key)!;
        setType(key); setBody(defaultBody(key, ctx));
        setTitle(WHOLE_TITLE[key] || "CERTIFICATE"); setSubtitle(WHOLE_TITLE[key] ? "" : t.subtitle);
    };

    const data = (over: Partial<CertData> = {}): CertData => ({ style, title, subtitle, name, body, date, signatories: sig, certNo: "CN‑XXXXXXXXXX", qr: "", school: { name: school.name, logo: school.logo, address: school.address, signature: school.signature, stamp: school.stamp }, ...over });
    const previewHtml = useMemo(() => certificateHtml(data({ qr: PLACEHOLDER_QR })), [style, title, subtitle, name, body, date, sig, school.name, school.logo, school.signature, school.stamp]); // eslint-disable-line react-hooks/exhaustive-deps

    const issue = async () => {
        if (!body.trim()) { toast.error("Write what the certificate is awarded for."); return; }
        setBusy(true);
        try {
            const r = (await api.post(`/students/${student._id}/certificates`, { type, style, title, subtitle, body, date, signatories: sig })).data;
            const qr = await qrOf(r.verifyUrl);
            outputHtmlDoc(`${r.typeLabel} - ${name}`, withPrint(certificateHtml(data({ certNo: r.certId, qr }))), { fileName: `${r.typeLabel}-${name}` });
            qc.invalidateQueries({ queryKey: ["student_certs", student._id] });
            toast.success(`Certificate ${r.certId} issued`);
        } catch (e: any) { toast.error(e.response?.data?.message || "Could not issue the certificate"); } finally { setBusy(false); }
    };

    const reprint = async (c: any) => {
        try {
            const qr = await qrOf(c.verifyUrl);
            outputHtmlDoc(`${c.typeLabel} - ${c.studentName}`, withPrint(certificateHtml({ style: c.style, title: c.title, subtitle: c.subtitle, name: c.studentName, body: c.body, date: c.date, signatories: c.signatories || [], certNo: c.certId, qr, school: { name: school.name, logo: school.logo, address: school.address, signature: school.signature, stamp: school.stamp } })), { fileName: `${c.typeLabel}-${c.studentName}` });
        } catch { toast.error("Could not print"); }
    };
    const revoke = async (c: any) => {
        if (!confirm(`Revoke certificate ${c.certId}? Scanning its QR will then show it as revoked.`)) return;
        try { await api.post(`/student-certificates/${c.certId}/revoke`, {}); qc.invalidateQueries({ queryKey: ["student_certs", student._id] }); toast.success("Certificate revoked"); }
        catch (e: any) { toast.error(e.response?.data?.message || "Failed"); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-3" onClick={onClose}>
            <div className="bg-white rounded-3xl w-full max-w-7xl shadow-2xl overflow-hidden flex flex-col max-h-[96vh]" onClick={e => e.stopPropagation()}>
                <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-slate-50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center"><Award className="w-5 h-5" /></div>
                        <div><h3 className="font-black text-slate-800 text-lg">Generate Certificate</h3><p className="text-xs font-bold text-slate-500">{name}{className ? ` · ${className}` : ""}</p></div>
                    </div>
                    <button onClick={onClose} className="w-9 h-9 flex items-center justify-center bg-slate-200 hover:bg-slate-300 rounded-full text-slate-600"><X className="w-4 h-4" /></button>
                </div>

                <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-0 bg-[#f4f7f6]">
                    {/* left: choices */}
                    <div className="p-5 space-y-5 lg:border-r border-gray-100 bg-white">
                        <div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">1 · Certificate type</div>
                            <div className="grid grid-cols-3 gap-2">
                                {types.map(t => (
                                    <button key={t.key} onClick={() => pickType(t.key)} className={`p-2 rounded-xl border-2 text-center transition-all ${type === t.key ? "border-[#5C67F2] bg-indigo-50" : "border-gray-100 hover:border-indigo-200"}`}>
                                        <div className="text-xl">{t.icon}</div><div className="text-[10px] font-bold text-slate-700 leading-tight mt-0.5">{t.label}</div>
                                    </button>
                                ))}
                            </div>
                            {!isTransferred && <p className="text-[10px] text-slate-400 mt-1.5">The Transfer certificate appears once the student has been transferred.</p>}
                        </div>

                        <div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">2 · Design</div>
                            <div className="grid grid-cols-3 gap-2">
                                {CERT_STYLES.map(s => (
                                    <button key={s.key} onClick={() => setStyle(s.key)} title={s.note} className={`rounded-xl border-2 overflow-hidden transition-all ${style === s.key ? "border-[#5C67F2] ring-2 ring-[#5C67F2]/20" : "border-gray-100 hover:border-indigo-200"}`}>
                                        <div className="h-14 relative overflow-hidden bg-white"><iframe title={s.key} srcDoc={certificateHtml({ style: s.key, title: "CERTIFICATE", subtitle: "", name: "Name", body: "", date: "", signatories: [], certNo: "", qr: "", school: { name: "" } })} className="absolute top-0 left-0 origin-top-left pointer-events-none border-0" style={{ width: 1123, height: 794, transform: "scale(0.1)" }} /></div>
                                        <div className="text-[10px] font-bold text-slate-600 py-1">{s.label}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">3 · Wording</div>
                            <div className="grid grid-cols-2 gap-2">
                                <div><label className="block text-[11px] font-bold text-slate-500 mb-1">Title</label><input className={inp} value={title} onChange={e => setTitle(e.target.value)} /></div>
                                <div><label className="block text-[11px] font-bold text-slate-500 mb-1">Sub-title</label><input className={inp} value={subtitle} onChange={e => setSubtitle(e.target.value)} /></div>
                            </div>
                            <div><label className="block text-[11px] font-bold text-slate-500 mb-1">Awarded for / wording</label><textarea rows={5} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#5C67F2]" value={body} onChange={e => setBody(e.target.value)} /></div>
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

                    {/* right: preview + issued */}
                    <div className="p-5 space-y-4">
                        <div className="bg-white rounded-2xl border border-gray-100 p-3 shadow-sm">
                            <div className="relative overflow-hidden mx-auto" style={{ width: 700, maxWidth: "100%", aspectRatio: "1123 / 794" }}>
                                <iframe title="preview" srcDoc={previewHtml} className="absolute top-0 left-0 border-0 origin-top-left" style={{ width: 1123, height: 794, transform: "scale(var(--s))", ["--s" as any]: 0.623 }} />
                            </div>
                            <p className="text-center text-[11px] text-slate-400 mt-2">Preview — the certificate number and QR are created when you issue it.</p>
                        </div>
                        <div className="flex justify-end">
                            <button onClick={issue} disabled={busy} className="h-11 px-6 rounded-xl bg-[#5C67F2] hover:bg-[#4a54c4] text-white text-sm font-bold flex items-center gap-2 disabled:opacity-50">
                                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />} Issue &amp; print
                            </button>
                        </div>

                        {issued.length > 0 && (
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Already issued to {name.split(" ")[0]}</div>
                                <div className="space-y-1.5">
                                    {issued.map(c => (
                                        <div key={c.certId} className="flex items-center gap-3 text-sm border-t border-slate-50 pt-1.5">
                                            <ShieldCheck className={`w-4 h-4 shrink-0 ${c.status === "valid" ? "text-emerald-500" : "text-rose-400"}`} />
                                            <div className="flex-1 min-w-0"><span className="font-bold text-slate-700">{c.typeLabel}</span> <span className="text-slate-400 text-xs">· {c.certId} · {fmtLong(c.date)}</span>{c.status !== "valid" && <span className="ml-2 text-[10px] font-black uppercase text-rose-500">Revoked</span>}</div>
                                            {c.status === "valid" && <><button onClick={() => reprint(c)} className="text-xs font-bold text-[#5C67F2] hover:underline">Reprint</button><button onClick={() => revoke(c)} title="Revoke" className="text-slate-300 hover:text-rose-500"><Ban className="w-3.5 h-3.5" /></button></>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// a tiny neutral QR-looking tile for the preview only (the real code is made when the certificate is issued)
export const PLACEHOLDER_QR = "data:image/svg+xml;utf8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 9 9"><rect width="9" height="9" fill="#fff"/><g fill="#111"><rect x="0" y="0" width="3" height="3"/><rect x="6" y="0" width="3" height="3"/><rect x="0" y="6" width="3" height="3"/><rect x="4" y="1" width="1" height="1"/><rect x="4" y="4" width="2" height="1"/><rect x="7" y="5" width="1" height="2"/><rect x="4" y="7" width="2" height="1"/><rect x="5" y="3" width="1" height="1"/></g><g fill="#fff"><rect x="1" y="1" width="1" height="1"/><rect x="7" y="1" width="1" height="1"/><rect x="1" y="7" width="1" height="1"/></g></svg>`);
