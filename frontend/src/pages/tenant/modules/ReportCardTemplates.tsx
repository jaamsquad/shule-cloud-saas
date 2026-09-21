import { useState, useEffect } from "react";
import { Home, CheckCircle2, Palette, Loader2, Check, QrCode } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";

// ─── Mini previews (drawn to look like the printed page) ─────────────────────
const Bars = ({ colors, n = 5 }: { colors: string[]; n?: number }) => (
    <div className="border border-slate-400 p-1 mt-1.5">
        <p className="text-center text-[5px] font-bold text-slate-600">Result Analysis</p>
        <div className="flex items-end justify-around h-9 border-l border-b border-slate-500 mt-0.5">
            {Array.from({ length: n }).map((_, i) => (
                <div key={i} className="flex items-end gap-px">
                    {colors.map((c, j) => <div key={j} className="w-1" style={{ background: c, height: `${[60, 75, 45, 82, 55][(i + j * 2) % 5]}%` }} />)}
                </div>
            ))}
        </div>
    </div>
);
const Head = ({ name = "Your School Name", sub = "Address · Phone" }: { name?: string; sub?: string }) => (
    <div className="flex items-center gap-1.5 pb-1 border-b border-slate-300">
        <div className="w-5 h-5 rounded-full bg-slate-700 text-white text-[6px] font-black flex items-center justify-center">LG</div>
        <div><p className="text-[7px] font-black text-slate-900 leading-none">{name}</p><p className="text-[5px] text-slate-500 mt-0.5">{sub}</p></div>
    </div>
);
const Sig = () => <div className="grid grid-cols-3 gap-2 mt-2 text-[4.5px] text-center text-slate-500">{["Principal", "HOD", "Teacher"].map(t => <div key={t} className="border-t border-slate-700 pt-px">{t}</div>)}</div>;

const PreviewScholar = () => (
    <div className="p-2 bg-white border border-slate-300 text-[5px] text-black" style={{ fontFamily: "Times New Roman, serif" }}>
        <div className="flex justify-between items-start"><div className="flex gap-1.5"><div className="w-5 h-5 rounded-full bg-slate-700" /><div><p className="text-[9px] font-black leading-none">SCHOOL NAME</p><p>Box · Tel</p><p className="font-bold">Report Form</p></div></div><span>Issue Date</span></div>
        <div className="border border-black mt-1 grid grid-cols-6 text-center font-bold"><span>Total</span><span>Mean</span><span>Points</span><span>M.Pt</span><span>Grade</span><span>Pos</span></div>
        <div className="border border-black border-t-0 grid grid-cols-6 text-center"><span>805/1100</span><span>73.2</span><span>106</span><span>9.6</span><span>B+</span><span>1/1</span></div>
        <div className="border border-black mt-1">
            {["CHEMISTRY", "HISTORY", "PHYSICS", "ENGLISH"].map((s, i) => <div key={s} className="grid grid-cols-5 border-b border-black last:border-0 px-0.5"><span className="col-span-2">{s}</span><span>{[98, 87, 87, 78][i]}/100</span><span className="font-bold">A</span><span>EXCELLENT</span></div>)}
        </div>
        <div className="border border-black mt-1 h-7 relative"><svg viewBox="0 0 100 20" className="w-full h-full"><polyline points="4,14 30,10 55,12 80,5 96,3" fill="none" stroke="#000" strokeWidth="1" /></svg></div>
        <div className="border border-black mt-1 p-0.5">Class Teacher's Comments : ____________</div>
    </div>
);

const PreviewAnnual = () => (
    <div className="p-2 bg-white border border-slate-200 text-[5px] text-slate-800">
        <Head />
        <p className="text-center text-[8px] font-black my-1 tracking-wide">ANNUAL EXAMINATION</p>
        <div className="grid grid-cols-2 gap-x-2 text-[5px] mb-1"><span><b>Student Name :</b> Alex Arlene</span><span><b>Adm No :</b> 1</span><span><b>Class :</b> Class 1 A</span><span><b>Period :</b> Term 1</span></div>
        <div className="grid text-white font-bold text-center text-[5px] py-[2px]" style={{ gridTemplateColumns: "0.5fr 1.6fr 1fr 1fr", background: "#33357f" }}><span>Sr.No</span><span>Subject Name</span><span>Total</span><span>Obtained</span></div>
        {["English", "Spanish", "German"].map((s, i) => <div key={s} className="grid text-center border-b border-slate-300 py-[2px]" style={{ gridTemplateColumns: "0.5fr 1.6fr 1fr 1fr", background: i % 2 ? "#fff" : "#f8f8ff" }}><span>{i + 1}</span><span className="text-left">{s}</span><span>50</span><span>{[48, 41, 33][i]}</span></div>)}
        <Bars colors={["#ff5555", "#5555ff", "#55ff55"]} n={4} />
        <div className="mt-1.5 text-white font-bold px-1 py-px" style={{ background: "#33357f" }}>Class Teacher's Comments :</div>
        <Sig />
    </div>
);

const PreviewProgress = () => (
    <div className="p-2 bg-white border border-slate-200 text-[5px] text-slate-800">
        <div className="flex items-center gap-1.5"><div className="w-6 h-6 rounded-full bg-slate-700" /><div className="flex-1 text-center"><p className="font-black text-[7px]">Your School Name</p><p className="font-bold text-[6px]">TERM END EXAM</p><p className="font-black text-[7px] mt-1">Progress Report</p></div></div>
        <div className="text-white px-1 py-px mt-1" style={{ background: "#4a6fa5" }}>Subject : English</div>
        <div className="grid grid-cols-4 text-center border border-slate-500 py-px"><span>Andy Richards</span><span>Grade 10</span><span>GR_7485</span><span>81</span></div>
        <div className="grid text-white font-bold text-center mt-1.5 py-[2px]" style={{ gridTemplateColumns: "0.4fr 1.6fr 1fr 1fr 1fr", background: "#4a6fa5" }}><span>#</span><span>Subject</span><span>Max</span><span>Marks</span><span>%</span></div>
        {["FA1 - English", "Term End", "Unit Test"].map((s, i) => <div key={s} className="grid text-center border-b border-slate-300 py-[2px]" style={{ gridTemplateColumns: "0.4fr 1.6fr 1fr 1fr 1fr" }}><span>{i + 1}</span><span className="text-left">{s}</span><span>20.00</span><span>{[5, 15, 11][i]}.00</span><span>{[25, 75, 55][i]}.00</span></div>)}
        <div className="border border-slate-500 mt-1.5 p-1"><div className="flex items-end justify-around h-8 border-l border-b border-slate-500">{[30, 85, 55, 40, 75].map((h, i) => <div key={i} className="w-2" style={{ height: `${h}%`, background: "#ff5555" }} />)}</div></div>
        <div className="flex gap-2 mt-1.5"><div className="w-1/2"><div className="text-white text-center font-bold py-px" style={{ background: "#4a6fa5" }}>Assessment Key</div>{["A 85-100%", "B 80-85%", "C 70-80%"].map(t => <div key={t} className="border border-slate-400 px-1">{t}</div>)}</div><div className="flex-1 text-white font-bold px-1 py-px self-start" style={{ background: "#4a6fa5" }}>Special Comments :</div></div>
    </div>
);

const PreviewClassTest = () => (
    <div className="p-2 bg-white border border-slate-200 text-[5px] text-slate-800">
        <Head name="Your School Name" />
        <p className="text-center text-[7px] font-black my-1">Class Test Report Card ( 2026 )</p>
        <div className="grid grid-cols-2 text-[5px] mb-1"><span><b>Student Name :</b> Alex Arlene</span><span><b>Class :</b> Class 1 A</span></div>
        <div className="grid text-center font-bold py-[2px] border border-slate-500" style={{ gridTemplateColumns: "0.5fr 1.6fr 1fr 1fr 0.8fr", background: "#d9d9d9" }}><span>Sr.No</span><span>Subject</span><span>Total</span><span>Obtained</span><span>Grade</span></div>
        {["English", "Spanish", "German"].map((s, i) => <div key={s} className="grid text-center border border-t-0 border-slate-500 py-[2px]" style={{ gridTemplateColumns: "0.5fr 1.6fr 1fr 1fr 0.8fr" }}><span>{i + 1}</span><span className="text-left">{s}</span><span>70</span><span>{[61, 48, 49][i]}</span><span>{["A", "C", "B"][i]}</span></div>)}
        <div className="border border-t-0 border-slate-500 text-center font-bold py-[2px]">Total Marks 351.0/420.0 · 83.57%</div>
        <Bars colors={["#ff5555", "#5555ff", "#55ff55"]} n={4} />
        <div className="mt-1 px-1 py-px font-bold border border-slate-500" style={{ background: "#d9d9d9" }}>Grade Boundaries :</div>
        <div className="border border-t-0 border-slate-500 px-1">A* : 100-90, A : 90-80, B : 80-70 …</div>
    </div>
);

const PreviewTermEnd = () => (
    <div className="p-2 bg-white border border-slate-200 text-[5px] text-slate-800">
        <Head />
        <p className="text-center text-[8px] font-black my-1">Term End Report</p>
        <div className="grid grid-cols-2 text-[5px] mb-1"><span><b>Student Name :</b> Carel Matthew</span><span><b>Class :</b> 2A</span><span><b>Year :</b> 2026</span><span><b>Adm No :</b> 1</span></div>
        <div className="grid text-center font-bold py-[2px] border border-slate-700" style={{ gridTemplateColumns: "1.6fr 1fr 1fr 0.8fr", background: "#17a2b8" }}><span>Subject</span><span>Marks</span><span>Percentage</span><span>Grade</span></div>
        {["English", "Mathematics", "Physics", "History"].map((s, i) => <div key={s} className="grid text-center border border-t-0 border-slate-700 py-[2px]" style={{ gridTemplateColumns: "1.6fr 1fr 1fr 0.8fr" }}><span className="text-left pl-1">{s}</span><span>{[71, 64, 87, 62][i]}/100</span><span>{[71, 64, 87, 62][i]}%</span><span>{["B+", "B", "A", "B"][i]}</span></div>)}
        <div className="mt-1.5 font-bold px-1 py-px border border-slate-700" style={{ background: "#17a2b8" }}>Class Teacher's Comments :</div>
        <div className="border border-t-0 border-slate-700 h-4" />
        <div className="mt-1 font-bold px-1 py-px border border-slate-700" style={{ background: "#17a2b8" }}>Grade Boundaries :</div>
        <div className="border border-t-0 border-slate-700 px-1">A+ : 100-91, A : 90-81, B+ : 80-71 …</div>
    </div>
);

// ─── Template registry ────────────────────────────────────────────────────────
const TEMPLATES = [
    { id: "scholarsheet", title: "ScholarSheet (Current)", badge: "Classic A4 · Black & White", color: "#0f172a", preview: <PreviewScholar />,
      desc: "Your current report card: summary row with total, mean score, points, grade and positions, subject remarks, performance trend, comments. Printed from the ScholarSheet page." },
    { id: "annual_exam", title: "Annual Examination", badge: "Navy · Result Analysis", color: "#33357f", preview: <PreviewAnnual />,
      desc: "Letterhead, marks table with grades, a result-analysis chart against class average and topper, class teacher's comments and three signatures." },
    { id: "progress_report", title: "Progress Report", badge: "Blue · Assessment Key", color: "#4a6fa5", preview: <PreviewProgress />,
      desc: "Marks and overall % per subject, an examination performance chart, the grading key from your grading scale and special comments." },
    { id: "class_test", title: "Report Card with Class Tests", badge: "Grey · Grade Boundaries", color: "#6b7280", preview: <PreviewClassTest />,
      desc: "Neutral grey card with totals and total percentage, this term's exam-by-exam progress, a result-analysis chart and grade boundaries." },
    { id: "term_end", title: "Term End Report", badge: "Teal · Comments", color: "#17a2b8", preview: <PreviewTermEnd />,
      desc: "Clean teal termly report: subject, marks, percentage and grade, class teacher's comments and the grade boundaries." },
];

// ─── Main component ───────────────────────────────────────────────────────────
export default function ReportCardTemplates() {
    const qc = useQueryClient();
    const { data: profileData, isLoading } = useQuery<any>({
        queryKey: ["tenant_profile_global"],
        queryFn: async () => { const r = await api.get("/auth/tenant/profile"); return Array.isArray(r.data) ? r.data[0] : r.data; },
    });

    const [activeTemplate, setActiveTemplate] = useState<string>("annual_exam");
    // A school that picked one of the retired designs is printing on the Annual Examination layout now.
    useEffect(() => {
        const id = profileData?.reportTemplate;
        setActiveTemplate(TEMPLATES.some(t => t.id === id) ? id : "annual_exam");
    }, [profileData]);

    const saveMut = useMutation({
        mutationFn: (id: string) => api.patch("/auth/tenant/profile", { reportTemplate: id }),
        onSuccess: (_, id) => {
            setActiveTemplate(id);
            qc.invalidateQueries({ queryKey: ["tenant_profile_global"] });
            toast.success(`"${TEMPLATES.find(t => t.id === id)?.title}" is now your active report card template`);
        },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed to save template"),
    });

    const activeInfo = TEMPLATES.find(t => t.id === activeTemplate);
    if (isLoading) return <div className="flex-1 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#5C67F2]" /></div>;

    return (
        <div className="flex-1 bg-[#f8fafc] min-h-screen flex flex-col">
            <div className="bg-white border-b border-gray-100 px-6 py-3.5 flex items-center gap-2 shadow-sm m-4 rounded-xl">
                <Home className="w-4 h-4 text-gray-400" />
                <span className="text-gray-400 text-sm font-medium">General Settings</span>
                <span className="text-gray-300">/</span>
                <span className="text-gray-700 text-sm font-semibold">Report Card Templates</span>
            </div>

            <div className="px-6 pb-10 max-w-7xl mx-auto w-full space-y-6">
                <div className="bg-white px-6 py-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center"><Palette className="w-6 h-6 text-indigo-600" /></div>
                        <div>
                            <h1 className="text-xl font-black text-slate-800">Report Card Templates</h1>
                            <p className="text-xs text-slate-500 font-medium mt-0.5">Choose how your school's report cards look. Every design carries the school logo, your grading scale and a QR code parents can scan to verify the report.</p>
                        </div>
                    </div>
                    {activeInfo && (
                        <div className="flex items-center gap-2 bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-200">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-xs font-black text-emerald-800 uppercase tracking-wide">Active: {activeInfo.title}</span>
                        </div>
                    )}
                </div>

                {activeTemplate === "scholarsheet" && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-3 text-xs font-medium text-slate-600">
                        <QrCode className="w-4 h-4 text-slate-500 flex-shrink-0" />
                        ScholarSheet is printed from <strong className="mx-1">Exams → ScholarSheet</strong>; the Class Report Cards and Result Card pages will open it for you.
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {TEMPLATES.map(tpl => {
                        const isSelected = activeTemplate === tpl.id;
                        const isPending = saveMut.isPending && saveMut.variables === tpl.id;
                        return (
                            <div key={tpl.id}
                                className={`rounded-2xl bg-white border-2 overflow-hidden flex flex-col transition-all duration-150 hover:-translate-y-1 ${isSelected ? "shadow-lg" : "border-gray-100 shadow-sm hover:shadow-md"}`}
                                style={isSelected ? { borderColor: tpl.color, boxShadow: `0 0 0 4px ${tpl.color}20` } : {}}>
                                <div className="px-4 py-3 text-white flex items-center justify-between" style={{ backgroundColor: tpl.color }}>
                                    <div>
                                        <h3 className="font-black text-sm leading-none">{tpl.title}</h3>
                                        <p className="text-[9px] opacity-75 font-semibold mt-1 uppercase tracking-widest">{tpl.badge}</p>
                                    </div>
                                    {isSelected && (
                                        <div className="flex items-center gap-1 bg-white/90 rounded-full px-2 py-1">
                                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /><span className="text-[9px] font-black text-slate-700">Active</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 p-4 bg-slate-50/60 border-y border-slate-100 flex justify-center">
                                    <div className="w-full max-w-[230px] shadow-md">{tpl.preview}</div>
                                </div>
                                <div className="p-4">
                                    <p className="text-[11px] text-slate-500 font-medium leading-relaxed mb-3 min-h-[48px]">{tpl.desc}</p>
                                    <button onClick={() => !isSelected && saveMut.mutate(tpl.id)} disabled={isSelected || isPending}
                                        className={`w-full h-9 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${isSelected ? "border-2 cursor-default" : "text-white shadow-sm hover:opacity-90"}`}
                                        style={isSelected ? { borderColor: tpl.color, color: tpl.color } : { backgroundColor: tpl.color }}>
                                        {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : isSelected ? <><Check className="w-3.5 h-3.5" /> Selected</> : "Select Template"}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
