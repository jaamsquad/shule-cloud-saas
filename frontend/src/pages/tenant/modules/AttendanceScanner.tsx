import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ScanLine, Loader2, LogIn, LogOut, CheckCircle2, XCircle, UserCheck, ClipboardCheck, User } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

const time = (t: any) => (t ? new Date(t).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "—");

export default function AttendanceScanner() {
    const qc = useQueryClient();
    const [code, setCode] = useState("");
    const [last, setLast] = useState<any>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Keep the scanner input focused so a USB card reader always types into it.
    const focus = () => inputRef.current?.focus();
    useEffect(() => { focus(); const i = setInterval(focus, 1500); return () => clearInterval(i); }, []);

    const { data } = useQuery({
        queryKey: ["scan_today"],
        queryFn: async () => (await api.get("/attendance/scan/today")).data,
        refetchInterval: 5000,
    });
    const rows: any[] = data?.rows || [];

    const scan = useMutation({
        mutationFn: async (c: string) => (await api.post("/attendance/scan", { code: c })).data,
        onSuccess: (d: any) => {
            setLast(d);
            toast.success(`${d.name} — ${d.action === "in" ? "Checked IN" : "Checked OUT"}`);
            qc.invalidateQueries({ queryKey: ["scan_today"] });
        },
        onError: (e: any) => { setLast({ error: e.response?.data?.message || "Not recognised" }); toast.error(e.response?.data?.message || "Card not recognised"); },
    });

    const finalize = useMutation({
        mutationFn: async () => (await api.post("/attendance/scan/finalize", {})).data,
        onSuccess: (d: any) => { toast.success(`${d.markedAbsent} marked absent for today`); qc.invalidateQueries({ queryKey: ["scan_today"] }); },
        onError: () => toast.error("Failed to finalize"),
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        const c = code.trim();
        if (!c) return;
        scan.mutate(c);
        setCode("");
        setTimeout(focus, 50);
    };

    return (
        <div className="flex-1 bg-[#f4f7f6] min-h-screen p-6">
            <div className="max-w-5xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 bg-[#5C67F2] rounded-2xl flex items-center justify-center text-white"><ScanLine className="w-5 h-5" /></div>
                        <div><h1 className="text-xl font-black text-slate-800">Attendance Scanner</h1><p className="text-xs text-slate-500">Scan a student or staff card to mark attendance</p></div>
                    </div>
                    <button onClick={() => { if (window.confirm("Mark everyone not scanned today as ABSENT?")) finalize.mutate(); }} disabled={finalize.isPending}
                        className="inline-flex items-center gap-2 h-10 px-4 bg-white border border-slate-200 text-slate-600 hover:text-rose-500 hover:border-rose-300 font-bold rounded-xl text-xs uppercase tracking-wide disabled:opacity-50">
                        {finalize.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardCheck className="w-4 h-4" />} Mark Absentees
                    </button>
                </div>

                <div className="grid lg:grid-cols-2 gap-6 mb-6">
                    {/* Scanner */}
                    <div className="bg-gradient-to-br from-[#5C67F2] to-[#0A1B3F] rounded-3xl p-8 text-white text-center shadow-xl">
                        <ScanLine className="w-12 h-12 mx-auto mb-4 opacity-80" />
                        <p className="font-black text-lg mb-1">Ready to Scan</p>
                        <p className="text-white/70 text-sm mb-6">Tap a card on the reader, or type the ID and press Enter.</p>
                        <form onSubmit={submit}>
                            <input ref={inputRef} value={code} onChange={e => setCode(e.target.value)} autoFocus
                                placeholder="Waiting for scan…"
                                className="w-full h-14 px-6 rounded-2xl text-center text-lg font-black text-slate-800 focus:outline-none bg-white/95" />
                        </form>
                        <p className="text-white/50 text-[11px] mt-3">{scan.isPending ? "Reading…" : "Keep this window focused"}</p>
                    </div>

                    {/* Last scan result */}
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 flex flex-col items-center justify-center text-center">
                        {!last ? (
                            <div className="text-slate-300"><User className="w-14 h-14 mx-auto mb-3" /><p className="text-sm font-semibold text-slate-400">Scan a card to see the result here</p></div>
                        ) : last.error ? (
                            <><div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center mb-3"><XCircle className="w-8 h-8 text-rose-500" /></div><p className="font-black text-slate-800">Not recognised</p><p className="text-xs text-slate-400 mt-1">{last.error}</p></>
                        ) : (
                            <>
                                {last.photo ? <img src={last.photo} className="w-20 h-20 rounded-full object-cover mb-3 border-2 border-[#5C67F2]/20" /> : <div className="w-20 h-20 rounded-full bg-[#5C67F2]/10 flex items-center justify-center mb-3 text-[#5C67F2]"><User className="w-10 h-10" /></div>}
                                <p className="font-black text-lg text-slate-800">{last.name}</p>
                                <p className="text-xs text-slate-400 mb-4">{last.role} · {last.registrationNo}</p>
                                <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-black ${last.action === "in" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`}>
                                    {last.action === "in" ? <><LogIn className="w-4 h-4" /> Checked IN · {time(last.inTime)}</> : <><LogOut className="w-4 h-4" /> Checked OUT · {time(last.outTime)}</>}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Today's log */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
                        <p className="text-xs font-black text-slate-400 uppercase flex items-center gap-2"><UserCheck className="w-4 h-4" /> Today · {new Date().toLocaleDateString("en-GB")}</p>
                        <div className="flex gap-2 text-[11px] font-bold">
                            <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">{data?.present ?? 0} Present</span>
                            <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-700">{data?.absent ?? 0} Absent</span>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wide">
                                    <th className="text-left px-5 py-3 font-black">Name</th>
                                    <th className="text-left px-3 py-3 font-black">Role</th>
                                    <th className="text-left px-3 py-3 font-black">In</th>
                                    <th className="text-left px-3 py-3 font-black">Out</th>
                                    <th className="text-left px-5 py-3 font-black">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.length === 0 ? (
                                    <tr><td colSpan={5} className="py-10 text-center text-slate-400">No scans yet today.</td></tr>
                                ) : rows.map((r: any) => (
                                    <tr key={r._id} className="border-b border-slate-50">
                                        <td className="px-5 py-3 font-bold text-slate-700">{r.name}</td>
                                        <td className="px-3 py-3 text-slate-500">{r.role}</td>
                                        <td className="px-3 py-3 text-slate-500">{time(r.inTime)}</td>
                                        <td className="px-3 py-3 text-slate-500">{time(r.outTime)}</td>
                                        <td className="px-5 py-3">
                                            <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${r.status === "Present" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                                                {r.status === "Present" ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />} {r.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
