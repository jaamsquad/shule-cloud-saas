import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ShieldCheck, ShieldX, Award, FileText } from "lucide-react";
import api from "@/lib/api";

const fmt = (iso?: string) => { if (!iso) return "—"; const d = new Date(iso); return isNaN(d.getTime()) ? String(iso) : d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }); };

/**
 * What a QR code opens:  /<school>/certificate/verify/online/<certificate no>   or   /<school>/report/verify/online/<token>
 * Says whether the document is genuine, with the basics (the holder's middle names are hidden).
 */
export default function VerifyDoc({ kind }: { kind: "certificate" | "report" }) {
    const { school = "", certId = "", token = "" } = useParams();
    const id = kind === "certificate" ? certId : token;
    const { data, isLoading, error } = useQuery<any>({
        queryKey: ["verify_doc", kind, school, id], retry: false,
        queryFn: async () => (await api.get(`/public/verify/${kind}/${encodeURIComponent(school)}/${encodeURIComponent(id)}`)).data,
    });
    useEffect(() => { document.title = kind === "certificate" ? "Verify certificate — ShuleCloud" : "Verify report card — ShuleCloud"; }, [kind]);

    if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-8 h-8 animate-spin text-[#534AB7]" /></div>;

    const invalid = !!error || !data;
    const c = data?.certificate, r = data?.report;
    const valid = !invalid && data.valid;
    const revoked = !invalid && kind === "certificate" && data.status === "revoked";
    const msg = (error as any)?.response?.data?.message || "We could not find this document.";
    const row = (k: string, v: any) => v ? <div className="flex justify-between gap-4 py-2 border-b border-slate-100 text-sm"><span className="text-slate-500">{k}</span><span className="font-bold text-slate-800 text-right">{v}</span></div> : null;

    return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden">
                <div className={`px-6 py-7 text-center text-white ${valid ? "bg-emerald-600" : "bg-rose-600"}`}>
                    {valid ? <ShieldCheck className="w-14 h-14 mx-auto" /> : <ShieldX className="w-14 h-14 mx-auto" />}
                    <div className="text-2xl font-black mt-2 tracking-wide">{valid ? "VALID" : revoked ? "REVOKED" : "NOT VALID"}</div>
                    <div className="text-sm opacity-90 mt-1">{valid ? (kind === "certificate" ? "This certificate was issued by the school and is genuine." : "This report card was issued by the school and is genuine.") : revoked ? "This certificate has been withdrawn by the school." : msg}</div>
                </div>

                {!invalid && (
                    <div className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                            {data.school?.logo ? <img src={data.school.logo} alt="" className="h-12 w-auto object-contain" /> : <div className="w-12 h-12 rounded-xl bg-indigo-50 text-[#534AB7] flex items-center justify-center">{kind === "certificate" ? <Award className="w-6 h-6" /> : <FileText className="w-6 h-6" />}</div>}
                            <div><div className="font-black text-slate-800">{data.school?.name}</div>{data.school?.address && <div className="text-xs text-slate-400">{data.school.address}</div>}</div>
                        </div>

                        {kind === "certificate" && c && (
                            <>
                                <div className="text-center my-4"><div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{c.typeLabel}</div><div className="text-xl font-black text-slate-800">{c.title}{c.subtitle ? <span className="block text-sm font-bold text-slate-500">{c.subtitle}</span> : null}</div></div>
                                {row("Certificate no.", c.id)}{row("Awarded to", c.holder)}{row("Registration no.", c.registrationNo)}{row("Class", c.className)}{row("Date", fmt(c.date))}
                                {c.body && <p className="text-sm text-slate-600 bg-slate-50 rounded-xl p-3 mt-4 leading-relaxed">{c.body}</p>}
                                {(c.signatories || []).filter((s: any) => s.title).length > 0 && <p className="text-[11px] text-slate-400 mt-3 text-center">Signed for the school by: {(c.signatories as any[]).map(s => s.title).filter(Boolean).join(", ")}</p>}
                            </>
                        )}
                        {kind === "report" && r && (
                            <>
                                <div className="text-center my-4"><div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Report card</div><div className="text-xl font-black text-slate-800">{[r.exam, r.term, r.year].filter(Boolean).join(" · ") || "Academic report"}</div></div>
                                {row("Student", r.holder)}{row("Registration no.", r.registrationNo)}{row("Class", r.className)}{row("Average", r.average != null ? `${r.average}%` : "")}{row("Grade", r.grade)}{row("Issued", fmt(r.issuedAt))}
                            </>
                        )}
                    </div>
                )}
                <div className="px-6 py-3 bg-slate-50 text-center text-[11px] text-slate-400">Verified by ShuleCloud · to protect privacy, middle names are hidden</div>
            </div>
        </div>
    );
}
