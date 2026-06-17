import { useOutletContext } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MapPin, Calendar, Check, X, Loader2, CreditCard, PenLine, Eraser } from "lucide-react";
import { toast } from "sonner";
import type { ParentCtx } from "../ParentLayout";

const ksh = (n: any) => `KSh ${Number(n || 0).toLocaleString()}`;

// ── Signature pad ────────────────────────────────────────────────────────────
function SignaturePad({ onChange }: { onChange: (dataUrl: string) => void }) {
    const ref = useRef<HTMLCanvasElement>(null);
    const drawing = useRef(false);

    useEffect(() => {
        const c = ref.current; if (!c) return;
        const ctx = c.getContext("2d"); if (!ctx) return;
        ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.strokeStyle = "#0f172a";
    }, []);

    const pos = (e: any) => {
        const c = ref.current!; const r = c.getBoundingClientRect();
        const t = e.touches?.[0];
        return { x: (t ? t.clientX : e.clientX) - r.left, y: (t ? t.clientY : e.clientY) - r.top };
    };
    const start = (e: any) => { drawing.current = true; const ctx = ref.current!.getContext("2d")!; const { x, y } = pos(e); ctx.beginPath(); ctx.moveTo(x, y); };
    const move = (e: any) => { if (!drawing.current) return; e.preventDefault(); const ctx = ref.current!.getContext("2d")!; const { x, y } = pos(e); ctx.lineTo(x, y); ctx.stroke(); };
    const end = () => { if (!drawing.current) return; drawing.current = false; onChange(ref.current!.toDataURL("image/png")); };
    const clear = () => { const c = ref.current!; c.getContext("2d")!.clearRect(0, 0, c.width, c.height); onChange(""); };

    return (
        <div>
            <canvas ref={ref} width={420} height={120}
                className="w-full border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 touch-none"
                onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
                onTouchStart={start} onTouchMove={move} onTouchEnd={end} />
            <button type="button" onClick={clear} className="mt-1 text-[11px] font-bold text-slate-400 flex items-center gap-1 hover:text-rose-500"><Eraser className="w-3.5 h-3.5" /> Clear signature</button>
        </div>
    );
}

export default function ParentTrips() {
    const { api, child } = useOutletContext<ParentCtx>();
    const qc = useQueryClient();
    const [modalTrip, setModalTrip] = useState<any>(null);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [signature, setSignature] = useState("");

    const { data: trips = [], isLoading } = useQuery({
        queryKey: ["parent_trips", child?._id],
        queryFn: async () => { try { const r = await api.get("/parent-portal/trips"); return Array.isArray(r.data) ? r.data : []; } catch { return []; } },
    });

    const consent = useMutation({
        mutationFn: async ({ id, decision, body }: { id: string; decision: string; body?: any }) =>
            api.post(`/parent-portal/trips/${id}/consent`, { decision, ...(body || {}) }),
        onSuccess: (_res, vars) => {
            toast.success(vars.decision === "approve" ? "Consent submitted — fee added for payment" : "Trip declined");
            setModalTrip(null); setAnswers({}); setSignature("");
            qc.invalidateQueries({ queryKey: ["parent_trips"] });
        },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed"),
    });

    // Approve: if the trip has consent questions, open the consent modal; else approve directly.
    const onApprove = (t: any) => {
        if (Array.isArray(t.consentQuestions) && t.consentQuestions.length > 0) {
            setModalTrip(t); setAnswers({}); setSignature("");
        } else {
            consent.mutate({ id: t._id, decision: "approve" });
        }
    };
    const submitConsent = () => {
        const qs: string[] = modalTrip.consentQuestions || [];
        for (const q of qs) if (!answers[q]) { toast.error("Please answer all questions"); return; }
        if (!signature) { toast.error("Please sign to give consent"); return; }
        consent.mutate({ id: modalTrip._id, decision: "approve", body: { answers, signature } });
    };

    return (
        <div className="p-4 md:p-6 max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 rounded-2xl bg-[#5C67F2] flex items-center justify-center text-white"><MapPin className="w-5 h-5" /></div>
                <div>
                    <h1 className="text-lg font-black text-slate-800">Trips & Excursions</h1>
                    <p className="text-xs text-slate-500">Approve trips and pay for {child?.name || "your child"}</p>
                </div>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-20 gap-2 text-slate-400"><Loader2 className="w-5 h-5 animate-spin" /> Loading trips…</div>
            ) : trips.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center text-slate-400 text-sm font-bold">No trips available right now</div>
            ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                    {trips.map((t: any) => (
                        <div key={t._id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                            <div className="h-1.5 bg-[#5C67F2]" />
                            <div className="p-5">
                                <div className="flex items-start justify-between">
                                    <h3 className="font-black text-slate-800">{t.name}</h3>
                                    {t.fee > 0 && <span className="text-xs font-black text-[#5C67F2]">{ksh(t.fee)}</span>}
                                </div>
                                {t.destination && <p className="text-xs text-slate-500 mt-0.5">{t.destination}</p>}
                                {t.description && <p className="text-[11px] text-slate-400 mt-2 line-clamp-3">{t.description}</p>}
                                <div className="flex items-center gap-3 mt-3 text-[11px] text-slate-400 font-bold">
                                    {t.date && <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {t.date}</span>}
                                    {t.deadline && <span>Deadline: {t.deadline}</span>}
                                </div>

                                <div className="mt-4">
                                    {t.consentStatus === "pending" ? (
                                        <div className="flex gap-2">
                                            <button onClick={() => onApprove(t)} disabled={consent.isPending}
                                                className="flex-1 h-9 bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50">
                                                <Check className="w-3.5 h-3.5" /> {Array.isArray(t.consentQuestions) && t.consentQuestions.length > 0 ? "Review & Consent" : "Approve"}
                                            </button>
                                            <button onClick={() => consent.mutate({ id: t._id, decision: "decline" })} disabled={consent.isPending}
                                                className="flex-1 h-9 border border-slate-200 text-slate-600 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5">
                                                <X className="w-3.5 h-3.5" /> Decline
                                            </button>
                                        </div>
                                    ) : t.consentStatus === "declined" ? (
                                        <div className="text-center text-xs font-bold text-slate-400 py-2 bg-slate-50 rounded-lg">Declined</div>
                                    ) : t.paid ? (
                                        <div className="text-center text-xs font-black text-emerald-600 py-2 bg-emerald-50 rounded-lg flex items-center justify-center gap-1.5"><Check className="w-4 h-4" /> Confirmed &amp; Paid</div>
                                    ) : t.fee > 0 ? (
                                        <div className="space-y-2">
                                            <div className="text-center text-[11px] font-bold text-amber-600 py-1.5 bg-amber-50 rounded-lg">Approved — payment pending</div>
                                            <a href="/fees" className="h-9 bg-[#5C67F2] text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5"><CreditCard className="w-3.5 h-3.5" /> Pay {ksh(t.fee)}{t.invoiceNo ? ` · ${t.invoiceNo}` : ""}</a>
                                        </div>
                                    ) : (
                                        <div className="text-center text-xs font-black text-emerald-600 py-2 bg-emerald-50 rounded-lg">Confirmed</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Consent modal: questions (Yes/No) + digital signature */}
            {modalTrip && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setModalTrip(null)} />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[92vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-1">
                            <h2 className="font-black text-slate-800 flex items-center gap-2"><PenLine className="w-4 h-4 text-[#5C67F2]" /> Consent — {modalTrip.name}</h2>
                            <button onClick={() => setModalTrip(null)} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500"><X className="w-4 h-4" /></button>
                        </div>
                        <p className="text-[11px] text-slate-400 mb-4">For {child?.name || "your child"}. Please answer and sign below.</p>

                        <div className="space-y-3 mb-4">
                            {(modalTrip.consentQuestions || []).map((q: string, i: number) => (
                                <div key={i} className="bg-slate-50 rounded-xl p-3">
                                    <p className="text-sm font-bold text-slate-700 mb-2">{q}</p>
                                    <div className="flex gap-2">
                                        {["Yes", "No"].map((opt) => (
                                            <button key={opt} type="button" onClick={() => setAnswers((p) => ({ ...p, [q]: opt }))}
                                                className={`flex-1 h-8 rounded-lg text-xs font-bold border ${answers[q] === opt ? (opt === "Yes" ? "bg-emerald-500 text-white border-emerald-500" : "bg-rose-500 text-white border-rose-500") : "bg-white text-slate-600 border-slate-200"}`}>
                                                {opt}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <label className="block text-[11px] font-black uppercase tracking-wide text-slate-400 mb-1">Parent Signature</label>
                        <SignaturePad onChange={setSignature} />

                        <div className="flex gap-2 mt-5">
                            <button onClick={() => setModalTrip(null)} className="flex-1 h-10 border border-slate-200 rounded-xl text-slate-600 font-bold text-sm">Cancel</button>
                            <button onClick={submitConsent} disabled={consent.isPending} className="flex-1 h-10 bg-emerald-500 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                                {consent.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Give Consent
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
