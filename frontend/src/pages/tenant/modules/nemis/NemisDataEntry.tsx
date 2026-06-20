import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Copy, Check, ChevronLeft, ChevronRight, SkipForward, RotateCcw, CheckCircle2, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { nemis } from "./nemisApi";

const CHECKLIST = ["Student created", "Parent entered", "UPI entered", "Birth Certificate entered", "Photo uploaded", "Saved in NEMIS"];

const copy = (text: string, label: string) => {
    if (!text) return toast.error(`${label} is empty`);
    navigator.clipboard.writeText(text).then(() => toast.success(`${label} copied`)).catch(() => toast.error("Clipboard blocked"));
};

export default function NemisDataEntry() {
    const { data, isLoading } = useQuery({ queryKey: ["nemis_validate"], queryFn: () => nemis.validate() });
    const [idx, setIdx] = useState(0);
    const [search, setSearch] = useState("");
    const [checks, setChecks] = useState<Record<string, boolean[]>>({});

    const all = data?.validations || [];
    const list = useMemo(() => all.filter((v: any) => !search || `${v.studentName} ${v.admissionNo}`.toLowerCase().includes(search.toLowerCase())), [all, search]);
    const cur = list[idx];

    useEffect(() => { setIdx(0); }, [search]);

    if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-[#0F766E]" /></div>;
    if (!list.length) return <div className="text-center text-slate-400 py-16 text-sm font-bold uppercase">No students</div>;

    const checked = checks[cur.studentId] || CHECKLIST.map(() => false);
    const toggle = (i: number) => setChecks(c => { const arr = [...(c[cur.studentId] || CHECKLIST.map(() => false))]; arr[i] = !arr[i]; return { ...c, [cur.studentId]: arr }; });
    const reset = () => setChecks(c => ({ ...c, [cur.studentId]: CHECKLIST.map(() => false) }));
    const field = (key: string) => cur.fields.find((f: any) => f.key === key)?.value || "";

    const groupCopy = (label: string, keys: string[]) => copy(keys.map(k => `${cur.fields.find((f: any) => f.key === k)?.label}: ${field(k)}`).join("\n"), label);

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[220px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Find student…" className="w-full h-10 pl-10 pr-4 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:outline-none" /></div>
                <span className="text-xs font-bold text-slate-400">{idx + 1} of {list.length}</span>
                <button onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0} className="h-10 px-3 border border-slate-200 rounded-xl text-sm font-bold disabled:opacity-40 flex items-center gap-1"><ChevronLeft className="w-4 h-4" /> Prev</button>
                <button onClick={() => setIdx(i => Math.min(list.length - 1, i + 1))} disabled={idx === list.length - 1} className="h-10 px-3 border border-slate-200 rounded-xl text-sm font-bold disabled:opacity-40 flex items-center gap-1">Next <ChevronRight className="w-4 h-4" /></button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* LEFT — student details with per-field copy */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                    <div className="flex items-center gap-4 mb-4">
                        {field("passportPhoto") ? <img src={field("passportPhoto")} className="w-16 h-16 rounded-2xl object-cover" /> : <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-300 text-xs font-black">NO PHOTO</div>}
                        <div className="flex-1"><h2 className="text-lg font-black text-slate-800">{cur.studentName}</h2><p className="text-xs text-slate-400">{cur.admissionNo} · {cur.grade} · Score {cur.score}%</p></div>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                        <GroupBtn label="Copy Student Details" onClick={() => groupCopy("Student details", ["admissionNo", "upi", "studentName", "birthCertNo", "dob", "gender", "nationality"])} />
                        <GroupBtn label="Copy Parent Details" onClick={() => groupCopy("Parent details", ["parentName", "parentPhone"])} />
                        <GroupBtn label="Copy Guardian Details" onClick={() => groupCopy("Guardian details", ["guardianName", "guardianPhone"])} />
                        <GroupBtn label="Copy Academic Details" onClick={() => groupCopy("Academic details", ["grade", "class", "admissionDate"])} />
                        <GroupBtn label="Copy All" onClick={() => groupCopy("All info", cur.fields.map((f: any) => f.key))} primary />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {cur.fields.filter((f: any) => f.key !== "passportPhoto").map((f: any) => (
                            <div key={f.key} className="flex items-center gap-2 border border-slate-100 rounded-lg px-3 py-2">
                                <div className="flex-1 min-w-0"><p className="text-[10px] font-bold text-slate-400 uppercase">{f.label}</p><p className="text-sm font-bold text-slate-700 truncate">{f.value || <span className="text-rose-400">— missing —</span>}</p></div>
                                <button onClick={() => copy(f.value, f.label)} disabled={!f.value} className="w-7 h-7 rounded-lg bg-slate-50 hover:bg-[#0F766E]/10 text-slate-400 hover:text-[#0F766E] flex items-center justify-center disabled:opacity-30"><Copy className="w-3.5 h-3.5" /></button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* RIGHT — submission checklist */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 h-fit">
                    <h3 className="text-sm font-black text-slate-700 mb-3">Submission Checklist</h3>
                    <div className="space-y-2 mb-4">
                        {CHECKLIST.map((c, i) => (
                            <button key={c} onClick={() => toggle(i)} className="w-full flex items-center gap-2.5 text-left">
                                <span className={`w-5 h-5 rounded-md border flex items-center justify-center ${checked[i] ? "bg-[#0F766E] border-[#0F766E]" : "border-slate-300"}`}>{checked[i] && <Check className="w-3.5 h-3.5 text-white" />}</span>
                                <span className={`text-sm font-bold ${checked[i] ? "text-slate-400 line-through" : "text-slate-700"}`}>{c}</span>
                            </button>
                        ))}
                    </div>
                    <div className="space-y-2">
                        <button onClick={() => { toast.success("Marked as submitted"); setIdx(i => Math.min(list.length - 1, i + 1)); }} className="w-full h-10 bg-[#0F766E] text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2"><CheckCircle2 className="w-4 h-4" /> Mark as Submitted</button>
                        <div className="flex gap-2">
                            <button onClick={() => setIdx(i => Math.min(list.length - 1, i + 1))} className="flex-1 h-9 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 flex items-center justify-center gap-1"><SkipForward className="w-3.5 h-3.5" /> Skip</button>
                            <button onClick={reset} className="flex-1 h-9 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 flex items-center justify-center gap-1"><RotateCcw className="w-3.5 h-3.5" /> Reset</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function GroupBtn({ label, onClick, primary }: { label: string; onClick: () => void; primary?: boolean }) {
    return <button onClick={onClick} className={`h-8 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 ${primary ? "bg-[#0F766E] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}><Copy className="w-3.5 h-3.5" /> {label}</button>;
}
