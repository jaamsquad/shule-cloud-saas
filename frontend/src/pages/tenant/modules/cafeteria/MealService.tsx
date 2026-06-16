import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ScanLine, Loader2, Camera, Check, User, Utensils, X, CheckCircle2, Keyboard } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import CameraScanner from "./CameraScanner";

const MEALS = ["Breakfast", "Lunch", "Supper"];
const time = (t: any) => (t ? new Date(t).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "—");

export default function MealService() {
    const qc = useQueryClient();
    const [code, setCode] = useState("");
    const [student, setStudent] = useState<any>(null);
    const [scanMode, setScanMode] = useState<"scanner" | "camera">("scanner");
    const [mealType, setMealType] = useState("Lunch");
    const [photo, setPhoto] = useState<string>("");
    const inputRef = useRef<HTMLInputElement>(null);
    const debounceRef = useRef<any>(null);

    const focus = () => { if (!student) inputRef.current?.focus(); };
    useEffect(() => { focus(); const i = setInterval(focus, 1500); return () => clearInterval(i); }, [student]);

    const { data: today } = useQuery({ queryKey: ["meals_today"], queryFn: async () => (await api.get("/cafeteria/meals/today")).data, refetchInterval: 30000 });


    const lookup = useMutation({
        mutationFn: async (c: string) => (await api.get(`/cafeteria/student/${encodeURIComponent(c)}`)).data,
        onSuccess: (s) => { setStudent(s); setPhoto(""); },
        onError: (e: any) => { toast.error(e.response?.data?.message || "Card not recognised"); setCode(""); setTimeout(focus, 30); },
    });

    const onChange = (v: string) => {
        setCode(v);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (v.trim().length >= 3) debounceRef.current = setTimeout(() => lookup.mutate(v.trim()), 150);
    };

    const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0]; if (!f) return;
        const r = new FileReader(); r.onloadend = () => setPhoto(String(r.result)); r.readAsDataURL(f);
    };

    const serve = useMutation({
        mutationFn: async () => (await api.post("/cafeteria/serve", { code, mealType, photo })).data,
        onSuccess: (d) => {
            toast.success(`${d.studentName} served ${mealType}`);
            qc.invalidateQueries({ queryKey: ["meals_today"] });
            reset();
        },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed to serve"),
    });

    const reset = () => { setStudent(null); setCode(""); setPhoto(""); setTimeout(focus, 50); };

    return (
        <div className="flex-1 bg-[#f4f7f6] min-h-screen p-6">
            <div className="max-w-5xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 bg-amber-500 rounded-2xl flex items-center justify-center text-white"><Utensils className="w-5 h-5" /></div>
                        <div><h1 className="text-xl font-black text-slate-800">Meal Service</h1><p className="text-xs text-slate-500">Scan a student card, photograph the meal, and serve</p></div>
                    </div>
                    <div className="flex gap-2 text-[11px] font-bold">
                        {MEALS.map(m => <span key={m} className="px-2.5 py-1 rounded-full bg-white border border-slate-100 text-slate-500">{m}: <b className="text-amber-600">{today?.[m.toLowerCase()] ?? 0}</b></span>)}
                    </div>
                </div>

                <div className="grid lg:grid-cols-2 gap-6">
                    {/* Scan / student */}
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-7">
                        {!student ? (
                            <div>
                                {/* Scanner / Camera mode toggle */}
                                <div className="bg-slate-50 border border-slate-100 rounded-xl p-1 flex mb-5">
                                    <button onClick={() => setScanMode("scanner")} className={`flex-1 py-2 rounded-lg text-[11px] font-black uppercase tracking-wide inline-flex items-center justify-center gap-1.5 ${scanMode === "scanner" ? "bg-amber-500 text-white" : "text-slate-400"}`}><Keyboard className="w-3.5 h-3.5" /> Scanner</button>
                                    <button onClick={() => setScanMode("camera")} className={`flex-1 py-2 rounded-lg text-[11px] font-black uppercase tracking-wide inline-flex items-center justify-center gap-1.5 ${scanMode === "camera" ? "bg-amber-500 text-white" : "text-slate-400"}`}><Camera className="w-3.5 h-3.5" /> Camera</button>
                                </div>
                                {scanMode === "scanner" ? (
                                    <div className="text-center py-6">
                                        <ScanLine className="w-12 h-12 mx-auto text-amber-500 mb-4" />
                                        <p className="font-black text-slate-700 mb-1">Scan student card</p>
                                        <p className="text-xs text-slate-400 mb-6">Barcode / QR / RFID — or type the admission no.</p>
                                        <input ref={inputRef} value={code} onChange={e => onChange(e.target.value)} autoFocus placeholder="Waiting for scan…"
                                            className="w-full h-12 px-5 rounded-2xl text-center text-lg font-black text-slate-800 border border-slate-200 focus:outline-none focus:border-amber-500" />
                                    </div>
                                ) : (
                                    <CameraScanner onScan={(c) => { setCode(c); lookup.mutate(c); }} />
                                )}
                                {lookup.isPending && <Loader2 className="w-5 h-5 animate-spin text-amber-500 mx-auto mt-3" />}
                            </div>
                        ) : (
                            <div>
                                <div className="flex items-center gap-4 mb-5">
                                    {student.photo ? <img src={student.photo} className="w-16 h-16 rounded-2xl object-cover" /> : <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600"><User className="w-8 h-8" /></div>}
                                    <div className="flex-1">
                                        <p className="font-black text-lg text-slate-800">{student.name}</p>
                                        <p className="text-xs text-slate-500">{student.admissionNo} · {student.class}</p>
                                        <span className="inline-block mt-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">{student.boarding}</span>
                                    </div>
                                    <button onClick={reset} className="text-slate-400 hover:text-rose-500"><X className="w-5 h-5" /></button>
                                </div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Meal</p>
                                <div className="grid grid-cols-3 gap-2 mb-4">
                                    {MEALS.map(m => <button key={m} onClick={() => setMealType(m)} className={`py-2.5 rounded-xl text-xs font-black uppercase ${mealType === m ? "bg-amber-500 text-white" : "bg-slate-50 text-slate-500"}`}>{m}</button>)}
                                </div>
                                <button onClick={() => serve.mutate()} disabled={serve.isPending}
                                    className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-black text-sm uppercase tracking-widest rounded-xl flex items-center justify-center gap-2">
                                    {serve.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Serve Meal
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Optional meal photo */}
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-7 flex flex-col">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Meal Photo <span className="text-slate-300 normal-case">(optional)</span></p>
                        {photo ? (
                            <div className="flex-1 flex flex-col">
                                <img src={photo} className="w-full rounded-2xl object-cover flex-1" />
                                <button onClick={() => setPhoto("")} className="mt-3 text-xs font-black text-amber-600 uppercase">Remove</button>
                            </div>
                        ) : (
                            <label className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-300 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:border-amber-400 hover:text-amber-500 py-10">
                                <Camera className="w-12 h-12" />
                                <span className="text-xs font-black uppercase tracking-widest">Tap to add a meal photo</span>
                                <input type="file" accept="image/*" capture="environment" onChange={onFile} className="hidden" />
                            </label>
                        )}
                    </div>
                </div>

                {/* Recent serves */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mt-6">
                    <p className="px-5 py-3 text-xs font-black text-slate-400 uppercase border-b border-slate-100 flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Served Today ({today?.served ?? 0})</p>
                    <div className="overflow-x-auto max-h-72 overflow-y-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 sticky top-0"><tr className="text-slate-500 text-[11px] uppercase">
                                <th className="text-left px-5 py-2.5 font-black">Student</th><th className="text-left px-3 py-2.5 font-black">Class</th><th className="text-left px-3 py-2.5 font-black">Meal</th><th className="text-left px-3 py-2.5 font-black">Time</th><th className="text-left px-3 py-2.5 font-black">Photo</th>
                            </tr></thead>
                            <tbody>
                                {(today?.rows || []).length === 0 ? <tr><td colSpan={5} className="py-8 text-center text-slate-400 text-xs">No meals served yet today.</td></tr>
                                    : today.rows.map((r: any) => (
                                        <tr key={r._id} className="border-b border-slate-50">
                                            <td className="px-5 py-2.5 font-bold text-slate-700">{r.studentName}</td>
                                            <td className="px-3 py-2.5 text-slate-500">{r.studentClass}</td>
                                            <td className="px-3 py-2.5"><span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">{r.mealType}</span></td>
                                            <td className="px-3 py-2.5 text-slate-500">{time(r.time)}</td>
                                            <td className="px-3 py-2.5">{r.photo ? <img src={r.photo} className="w-9 h-9 rounded-lg object-cover" /> : "—"}</td>
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
