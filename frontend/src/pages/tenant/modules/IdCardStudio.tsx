import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Download, Save, Search, CreditCard, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

const NAVY = "#0f2548";

const blank = { name: "", regNumber: "", course: "", yearOfStudy: "", school: "", faculty: "", bloodGroup: "", expiry: "" };

export default function IdCardStudio() {
    const [form, setForm] = useState({ ...blank });
    const [busy, setBusy] = useState<"" | "save" | "pdf">("");
    const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

    const { data: students = [] } = useQuery({ queryKey: ["students"], queryFn: async () => { const r = await api.get("/students"); return Array.isArray(r.data) ? r.data : []; } });
    const { data: school } = useQuery({ queryKey: ["tenant_profile_global"], queryFn: async () => { const r = await api.get("/auth/tenant/profile"); return Array.isArray(r.data) ? r.data[0] : r.data; } });

    const pick = (s: any) => setForm({
        name: s.studentName || `${s.firstName || ""} ${s.lastName || ""}`.trim(),
        regNumber: s.registrationNo || s.admNo || "",
        course: s.course || s.studentClass || "",
        yearOfStudy: s.yearOfStudy || (s.studentClass ? `${s.studentClass}` : ""),
        school: school?.name || "University of Nairobi",
        faculty: s.faculty || s.department || "Computing & Informatics",
        bloodGroup: s.bloodGroup || "",
        expiry: s.expiry || "Dec 2025",
    });

    const walletUrl = `https://shulecloud.com/wallet/${encodeURIComponent(form.regNumber || "")}`;
    const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=0&data=${encodeURIComponent(walletUrl)}`;
    const barSrc = useMemo(() => form.regNumber ? `https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(form.regNumber)}&scale=3&height=10&includetext=false` : "", [form.regNumber]);

    const save = async () => {
        if (!form.name || !form.regNumber) { toast.error("Name and reg number are required"); return; }
        setBusy("save");
        try { await api.post("/student-id", form); toast.success("Card data saved (synced: false)"); }
        catch (e: any) { toast.error(e.response?.data?.message || "Failed"); } finally { setBusy(""); }
    };
    const downloadPdf = async () => {
        if (!form.regNumber) { toast.error("Reg number is required"); return; }
        setBusy("pdf");
        try {
            const r = await api.post("/student-id/pdf", form, { responseType: "blob" });
            const url = URL.createObjectURL(r.data);
            window.open(url, "_blank");
            setTimeout(() => URL.revokeObjectURL(url), 60000);
        } catch (e: any) { toast.error("PDF failed"); } finally { setBusy(""); }
    };

    const F = (label: string, k: keyof typeof blank, ph = "") => (
        <div><label className="block text-[11px] font-bold text-slate-600 mb-1">{label}</label>
            <input value={(form as any)[k]} onChange={e => set(k, e.target.value)} placeholder={ph} className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#0f2548]" /></div>
    );

    return (
        <div className="flex-1 bg-[#f4f7f6] min-h-screen p-6">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center gap-3 mb-6"><div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white" style={{ background: NAVY }}><CreditCard className="w-5 h-5" /></div>
                    <div><h1 className="text-xl font-black text-slate-800">ID Card Studio — Classic Navy</h1><p className="text-xs text-slate-500">Pick a student, preview the card, and download a print-ready PDF</p></div></div>

                <div className="grid lg:grid-cols-[360px_1fr] gap-6">
                    {/* Form */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3 h-fit">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <select onChange={e => { const s = students.find((x: any) => x._id === e.target.value); if (s) pick(s); }} className="w-full h-10 pl-9 pr-3 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 focus:outline-none focus:border-[#0f2548]">
                                <option value="">Prefill from a student…</option>
                                {students.map((s: any) => <option key={s._id} value={s._id}>{s.studentName} ({s.registrationNo || s.admNo})</option>)}
                            </select>
                        </div>
                        {F("Student Name", "name", "Jane Wanjiku Kamau")}
                        {F("Reg Number", "regNumber", "UON/CS/042")}
                        {F("Course", "course", "BSc. Computer Science")}
                        {F("Year of Study", "yearOfStudy", "Year 2")}
                        {F("School", "school", "University of Nairobi")}
                        {F("Faculty", "faculty", "Computing & Informatics")}
                        <div className="grid grid-cols-2 gap-3">{F("Blood Group", "bloodGroup", "O+")}{F("Expiry", "expiry", "Dec 2025")}</div>
                        <div className="flex gap-2 pt-2">
                            <button onClick={save} disabled={!!busy} className="flex-1 h-11 border-2 border-[#0f2548] text-[#0f2548] font-black text-xs uppercase rounded-xl flex items-center justify-center gap-2">{busy === "save" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save</button>
                            <button onClick={downloadPdf} disabled={!!busy} className="flex-1 h-11 text-white font-black text-xs uppercase rounded-xl flex items-center justify-center gap-2" style={{ background: NAVY }}>{busy === "pdf" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} PDF</button>
                        </div>
                    </div>

                    {/* Live preview */}
                    <div className="flex flex-wrap gap-6 items-start">
                        {/* FRONT */}
                        <div className="bg-white rounded-2xl shadow-lg overflow-hidden" style={{ width: 342, height: 216 }}>
                            <div className="flex items-center gap-2 px-3 py-2.5">
                                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white font-black text-sm" style={{ background: NAVY }}>{(form.school || "U")[0]}</div>
                                <div><div className="font-black text-[12px]" style={{ color: NAVY }}>{form.school || "University of Nairobi"}</div><div className="text-[8px] font-bold tracking-wider text-slate-500">{(form.faculty || "Computing & Informatics").toUpperCase()}</div></div>
                                <span className="ml-auto text-[8px] font-black text-white px-2 py-0.5 rounded-full" style={{ background: NAVY }}>2024/25</span>
                            </div>
                            <div className="flex gap-3 px-3 py-3 text-white" style={{ background: NAVY, height: 136 }}>
                                <div className="w-[80px] h-[96px] rounded-lg flex items-center justify-center text-[8px] font-black" style={{ background: "#1c3a63", color: "#5b7aa8" }}>PHOTO</div>
                                <div className="flex-1">
                                    <div className="text-[15px] font-black leading-tight">{form.name || "Jane Wanjiku Kamau"}</div>
                                    <div className="text-[10px] mb-2" style={{ color: "#9db6da" }}>{form.course || "BSc. Computer Science"}{form.yearOfStudy ? ` · ${form.yearOfStudy}` : ""}</div>
                                    <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                                        {[["REG NO.", form.regNumber || "UON/CS/042"], ["BLOOD", form.bloodGroup || "O+"], ["FACULTY", (form.faculty || "Computing").split("&")[0].trim()], ["EXPIRES", form.expiry || "Dec 2025"]].map(([l, v]) => (
                                            <div key={l}><div className="text-[7px] font-bold tracking-wide" style={{ color: "#6f8db8" }}>{l}</div><div className="text-[10px] font-black">{v}</div></div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 px-3" style={{ height: 38 }}>
                                {barSrc ? <img src={barSrc} alt="barcode" className="h-5" /> : <div className="h-5 flex-1 bg-slate-100" />}
                                <span className="text-[8px] tracking-widest font-bold text-slate-500">{(form.regNumber || "").replace(/\W/g, "")}</span>
                                <div className="ml-auto w-6 h-5 rounded" style={{ background: "linear-gradient(135deg,#e8b94a,#c8902a)" }} />
                            </div>
                        </div>

                        {/* BACK */}
                        <div className="rounded-2xl shadow-lg flex flex-col items-center justify-center text-white" style={{ width: 342, height: 216, background: NAVY }}>
                            <div className="text-[11px] font-black tracking-wider mb-3" style={{ color: "#9db6da" }}>SCAN FOR STUDENT WALLET</div>
                            <img src={qrSrc} alt="wallet QR" className="w-[104px] h-[104px] bg-white p-1.5 rounded-lg" />
                            <div className="mt-3 text-[11px] tracking-widest" style={{ color: "#cbd5e1" }}>{form.regNumber || "UON/CS/042"}</div>
                        </div>
                        <p className="w-full text-[11px] text-slate-400 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> CR80 (85.6×54mm) · print-ready PDF includes bleed + crop marks · QR links to the student wallet.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
