import { useState, useEffect } from "react";
import {
    Home, CheckCircle2, LayoutTemplate, Sparkles, Shield, FileText,
    Award, Palette, Loader2, BookOpen, Bookmark, GraduationCap
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

// ─── Mini preview components ─────────────────────────────────────────────────

const PreviewCherith = () => (
    <div className="p-3 bg-white rounded-lg border-2 border-pink-700 text-slate-800 font-sans select-none text-[8px] leading-tight">
        <div className="flex items-start justify-between border-b-2 border-pink-700 pb-2 mb-2">
            <div className="flex-1">
                <p className="font-black text-[9px] text-pink-700 uppercase tracking-wide leading-none">Cherith Gate of Wisdom Schools</p>
                <p className="text-[7px] text-slate-500 mt-0.5">Kaduna State, Nigeria · Tel: 08034100041</p>
                <p className="text-[7px] text-pink-600 font-semibold">cherithschools@gmail.com</p>
            </div>
            <div className="w-8 h-10 border border-slate-300 flex items-center justify-center text-[6px] text-slate-400 bg-slate-50 rounded ml-2 flex-shrink-0">PHOTO</div>
        </div>
        <p className="text-center font-black text-[8px] uppercase text-slate-900 tracking-tight mb-2">Termly Performance Report Sheet</p>
        <div className="grid grid-cols-3 gap-1 bg-pink-50 border border-pink-200 rounded p-1.5 mb-2 text-[7px]">
            <span className="text-slate-500">Name: <strong className="text-slate-800">John Doe</strong></span>
            <span className="text-slate-500">Session: <strong className="text-slate-800">2025/26</strong></span>
            <span className="text-slate-500">Position: <strong className="text-pink-700">3rd</strong></span>
        </div>
        <table className="w-full text-[7px] mb-2" style={{ borderCollapse: "collapse" }}>
            <thead>
                <tr className="bg-pink-700 text-white">
                    <th className="px-1.5 py-1 text-left font-bold">Cognitive domain</th>
                    <th className="px-1 py-1 font-bold">CA1</th>
                    <th className="px-1 py-1 font-bold">CA2</th>
                    <th className="px-1 py-1 font-bold">Exam</th>
                    <th className="px-1 py-1 font-bold text-yellow-300">Total</th>
                    <th className="px-1 py-1 font-bold">Grade</th>
                </tr>
            </thead>
            <tbody>
                {[["Mathematics", "18", "17", "68", "86", "A"], ["English Language", "16", "15", "62", "78", "B"], ["Basic Science", "19", "18", "69", "88", "A"]].map(([s, c1, c2, e, t, g]) => (
                    <tr key={s} className="border-b border-slate-200">
                        <td className="px-1.5 py-0.5 font-semibold">{s}</td>
                        <td className="px-1 py-0.5 text-center">{c1}</td>
                        <td className="px-1 py-0.5 text-center">{c2}</td>
                        <td className="px-1 py-0.5 text-center">{e}</td>
                        <td className="px-1 py-0.5 text-center font-bold text-pink-700 bg-pink-50">{t}</td>
                        <td className="px-1 py-0.5 text-center font-black text-pink-700">{g}</td>
                    </tr>
                ))}
            </tbody>
        </table>
        <div className="grid grid-cols-2 gap-1.5 text-[7px]">
            <div className="border border-slate-200 rounded overflow-hidden">
                <div className="bg-pink-700 text-white px-1.5 py-0.5 font-bold uppercase text-[6px]">Psychomotor</div>
                {[["Punctuality", "5"], ["Neatness", "5"], ["Politeness", "4"]].map(([k, v]) => (
                    <div key={k} className="flex justify-between px-1.5 py-0.5 border-b border-slate-100 last:border-0">
                        <span className="text-slate-600">{k}</span><span className="font-bold">{v}</span>
                    </div>
                ))}
            </div>
            <div className="border border-slate-200 rounded overflow-hidden">
                <div className="bg-pink-700 text-white px-1.5 py-0.5 font-bold uppercase text-[6px]">Affective</div>
                {[["Attentiveness", "5"], ["Reliability", "4"], ["Cooperation", "5"]].map(([k, v]) => (
                    <div key={k} className="flex justify-between px-1.5 py-0.5 border-b border-slate-100 last:border-0">
                        <span className="text-slate-600">{k}</span><span className="font-bold">{v}</span>
                    </div>
                ))}
            </div>
        </div>
    </div>
);

const PreviewCBSE = () => (
    <div className="p-3 bg-white rounded-lg border border-slate-300 text-slate-800 font-sans select-none text-[8px] leading-tight">
        <div className="flex items-center gap-2 border-b-2 border-blue-800 pb-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-blue-800 text-white flex items-center justify-center text-[7px] font-bold flex-shrink-0">CBSE</div>
            <div className="flex-1 text-center">
                <p className="font-black text-[9px] uppercase text-blue-900 leading-none tracking-tight">Uday Narayan Sikshan Sansthan</p>
                <p className="text-[7px] text-slate-500 mt-0.5">Affiliated to CBSE · Session 2025–2026</p>
            </div>
            <div className="w-7 h-9 border border-slate-300 flex items-center justify-center text-[6px] text-slate-400 bg-slate-50 rounded flex-shrink-0">PHOTO</div>
        </div>
        <div className="grid grid-cols-2 gap-1 bg-slate-50 border border-slate-200 rounded p-1.5 mb-2 text-[7px]">
            <span className="text-slate-500">Student: <strong className="text-slate-800">Shahvez</strong></span>
            <span className="text-slate-500">Roll No: <strong className="text-slate-800">101</strong></span>
            <span className="text-slate-500">Mother: <strong className="text-slate-800">Mrs. Heena</strong></span>
            <span className="text-slate-500">Class: <strong className="text-slate-800">4A</strong></span>
        </div>
        <p className="text-[7px] font-bold text-blue-900 uppercase border-l-2 border-red-600 pl-1.5 mb-1">Scholastic areas</p>
        <table className="w-full text-[7px] mb-2" style={{ borderCollapse: "collapse" }}>
            <thead>
                <tr className="bg-blue-800 text-white">
                    <th className="px-1.5 py-1 text-left font-bold">Subject</th>
                    <th className="px-1 py-1 font-bold">Term I</th>
                    <th className="px-1 py-1 font-bold">Term II</th>
                    <th className="px-1 py-1 font-bold">Total</th>
                    <th className="px-1 py-1 font-bold">Grade</th>
                </tr>
            </thead>
            <tbody>
                {[["Hindi", "52", "36", "88", "A2"], ["English", "55", "37", "92", "A1"], ["Mathematics", "51", "34", "85", "B1"]].map(([s, t1, t2, tot, g]) => (
                    <tr key={s} className="border-b border-slate-200">
                        <td className="px-1.5 py-0.5 font-semibold">{s}</td>
                        <td className="px-1 py-0.5 text-center">{t1}</td>
                        <td className="px-1 py-0.5 text-center">{t2}</td>
                        <td className="px-1 py-0.5 text-center font-bold">{tot}</td>
                        <td className="px-1 py-0.5 text-center font-black text-blue-700 bg-blue-50">{g}</td>
                    </tr>
                ))}
            </tbody>
        </table>
        <p className="text-[7px] font-bold text-blue-900 uppercase border-l-2 border-red-600 pl-1.5 mb-1">Co-scholastic areas</p>
        <div className="border border-slate-200 rounded overflow-hidden text-[7px]">
            <div className="bg-slate-600 text-white px-1.5 py-0.5 flex justify-between font-bold text-[6px] uppercase">
                <span>Activity</span><span>Term I</span><span>Term II</span>
            </div>
            {[["Uniform & Turnout", "A+", "A"], ["Discipline & Conduct", "A+", "A+"], ["Communication Skills", "B+", "A"]].map(([k, t1, t2]) => (
                <div key={k} className="flex justify-between px-1.5 py-0.5 border-b border-slate-100 last:border-0">
                    <span className="text-slate-600 flex-1">{k}</span>
                    <span className="font-bold text-blue-700 w-6 text-center">{t1}</span>
                    <span className="font-bold text-blue-700 w-6 text-center">{t2}</span>
                </div>
            ))}
        </div>
    </div>
);

const PreviewTriTriangle = () => (
    <div className="p-3 bg-white rounded-lg border border-slate-200 text-slate-800 font-sans select-none text-[8px] leading-tight">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
            <div className="text-xl font-black text-cyan-600 leading-none tracking-tighter">▲▲▲</div>
            <div className="text-right">
                <p className="font-black text-[9px] uppercase text-slate-900 tracking-tight leading-none">TriTriangle</p>
                <p className="text-[7px] text-cyan-600 font-bold uppercase tracking-widest mt-0.5">Institute of Management</p>
            </div>
        </div>
        <div className="grid grid-cols-2 gap-1 bg-slate-50 rounded-lg border border-slate-100 p-1.5 mb-2 text-[7px]">
            <span className="text-slate-400">Student: <strong className="text-slate-800">Amaan Kumar</strong></span>
            <span className="text-slate-400">Program: <strong className="text-slate-800">Electrical Eng.</strong></span>
            <span className="text-slate-400">Batch: <strong className="text-slate-800">2025 / 3rd</strong></span>
            <span className="text-slate-400">Adm: <strong className="text-slate-800">2025-EE-01</strong></span>
        </div>
        <table className="w-full text-[7px] rounded-lg overflow-hidden mb-2" style={{ borderCollapse: "collapse" }}>
            <thead>
                <tr className="bg-cyan-600 text-white">
                    <th className="px-1.5 py-1 text-left font-bold uppercase text-[6px] tracking-wider">Subject</th>
                    <th className="px-1 py-1 font-bold uppercase text-[6px]">Max</th>
                    <th className="px-1 py-1 font-bold uppercase text-[6px]">Min</th>
                    <th className="px-1 py-1 font-bold uppercase text-[6px]">Obtained</th>
                </tr>
            </thead>
            <tbody>
                {[["Electrical Machines", "100", "50", "85"], ["Power Generation", "100", "50", "88"], ["Motor Control", "100", "50", "92"]].map(([s, mx, mn, ob]) => (
                    <tr key={s} className="border-b border-slate-100">
                        <td className="px-1.5 py-0.5 font-semibold">{s}</td>
                        <td className="px-1 py-0.5 text-center text-slate-500">{mx}</td>
                        <td className="px-1 py-0.5 text-center text-slate-500">{mn}</td>
                        <td className="px-1 py-0.5 text-center font-black text-cyan-700 bg-cyan-50">{ob}</td>
                    </tr>
                ))}
            </tbody>
        </table>
        <div className="bg-cyan-50 border border-cyan-100 rounded-lg p-2 text-center font-bold text-cyan-900 text-[8px]">
            Total: 730 / 1000 &nbsp;·&nbsp; Result: <span className="text-cyan-600">PASSED</span>
        </div>
    </div>
);

const PreviewIslamabad = () => (
    <div className="p-3 bg-white rounded-lg border border-slate-300 text-slate-800 font-sans select-none text-[8px] leading-tight">
        <div className="flex items-center gap-2 border-b-2 border-emerald-700 pb-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-emerald-700 text-white flex items-center justify-center text-[7px] font-black flex-shrink-0">IMC</div>
            <div className="flex-1 text-center">
                <p className="font-black text-[8px] uppercase text-slate-900 tracking-tight leading-none">Islamabad Model College for Boys</p>
                <p className="text-[7px] text-emerald-700 font-bold uppercase tracking-wider mt-0.5">Final Consolidated Report Card</p>
            </div>
            <div className="w-7 h-9 border border-slate-300 flex items-center justify-center text-[6px] text-slate-400 bg-slate-50 rounded flex-shrink-0">PHOTO</div>
        </div>
        <div className="grid grid-cols-2 gap-1 bg-emerald-50 border border-emerald-100 rounded p-1.5 mb-2 text-[7px]">
            <span className="text-slate-500">Student: <strong className="text-slate-800">Raja Muhammad</strong></span>
            <span className="text-slate-500">Class: <strong className="text-slate-800">VIII-A · 2025-26</strong></span>
        </div>
        <table className="w-full text-[7px] mb-2" style={{ borderCollapse: "collapse" }}>
            <thead>
                <tr className="bg-emerald-700 text-white">
                    <th className="px-1.5 py-1 text-left font-bold text-[6px]">Subject</th>
                    <th className="px-1 py-1 font-bold text-[6px]">B1 10%</th>
                    <th className="px-1 py-1 font-bold text-[6px]">Mid 30%</th>
                    <th className="px-1 py-1 font-bold text-[6px]">B2 10%</th>
                    <th className="px-1 py-1 font-bold text-[6px]">Final 50%</th>
                    <th className="px-1 py-1 font-bold text-[6px] text-yellow-300">Total</th>
                </tr>
            </thead>
            <tbody>
                {[["Computer", "9", "28", "9", "43", "89"], ["English", "8", "27", "8", "44", "87"], ["Mathematics", "10", "29", "9", "45", "93"]].map(([s, b1, m, b2, f, tot]) => (
                    <tr key={s} className="border-b border-slate-200">
                        <td className="px-1.5 py-0.5 font-semibold">{s}</td>
                        <td className="px-1 py-0.5 text-center">{b1}</td>
                        <td className="px-1 py-0.5 text-center">{m}</td>
                        <td className="px-1 py-0.5 text-center">{b2}</td>
                        <td className="px-1 py-0.5 text-center">{f}</td>
                        <td className="px-1 py-0.5 text-center font-black text-emerald-700 bg-emerald-50">{tot}</td>
                    </tr>
                ))}
            </tbody>
        </table>
        <div className="bg-slate-50 border border-slate-200 rounded p-1.5 flex justify-around text-[8px] font-bold text-slate-800">
            <span>Marks: 575/700</span>
            <span>Pct: 82.2%</span>
            <span className="text-emerald-700">Position: 2nd</span>
        </div>
    </div>
);

const PreviewSplitPanel = () => (
    <div className="p-3 bg-white rounded-lg border-2 border-indigo-500 text-slate-800 font-sans select-none text-[8px] leading-tight">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-[7px] font-bold flex-shrink-0">SC</div>
            <div className="flex-1 text-center">
                <p className="font-black text-[9px] uppercase text-slate-900 tracking-tight leading-none">St. Jude High School</p>
                <p className="text-[7px] text-indigo-600 font-bold uppercase tracking-widest mt-0.5">Annual Report Card</p>
            </div>
            <div className="w-7 h-7 rounded-lg bg-slate-900 text-slate-400 flex items-center justify-center text-[10px] flex-shrink-0">★</div>
        </div>
        <div className="grid grid-cols-2 gap-1 bg-slate-50 border border-slate-200 rounded p-1.5 mb-2 text-[7px]">
            <span className="text-slate-500">Student: <strong className="text-slate-800">Amit Dadhich</strong></span>
            <span className="text-slate-500">Class: <strong className="text-slate-800">STD 5 A</strong></span>
        </div>
        <div className="grid grid-cols-2 gap-2">
            <div>
                <table className="w-full text-[7px]" style={{ borderCollapse: "collapse" }}>
                    <thead>
                        <tr className="bg-indigo-600 text-white">
                            <th className="px-1.5 py-1 text-left font-bold text-[6px]">Subject</th>
                            <th className="px-1 py-1 font-bold text-[6px]">T1</th>
                            <th className="px-1 py-1 font-bold text-[6px]">T2</th>
                            <th className="px-1 py-1 font-bold text-[6px]">Avg</th>
                        </tr>
                    </thead>
                    <tbody>
                        {[["English", "67", "75", "71"], ["Maths", "65", "82", "73"], ["Science", "70", "75", "72"]].map(([s, t1, t2, a]) => (
                            <tr key={s} className="border-b border-slate-100">
                                <td className="px-1.5 py-0.5 font-semibold">{s}</td>
                                <td className="px-1 py-0.5 text-center">{t1}</td>
                                <td className="px-1 py-0.5 text-center">{t2}</td>
                                <td className="px-1 py-0.5 text-center font-bold text-indigo-700 bg-indigo-50">{a}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="space-y-1">
                <div className="border border-slate-200 rounded overflow-hidden">
                    <div className="bg-indigo-600 text-white px-1.5 py-0.5 font-bold uppercase text-[6px]">Personality</div>
                    {[["Application", "A+"], ["Conduct", "A+"], ["Discipline", "A"]].map(([k, v]) => (
                        <div key={k} className="flex justify-between px-1.5 py-0.5 border-b border-slate-100 last:border-0 text-[7px]">
                            <span className="text-slate-600">{k}</span><span className="font-bold text-indigo-700">{v}</span>
                        </div>
                    ))}
                </div>
                <div className="border border-indigo-200 bg-indigo-50 rounded p-1 text-center text-[7px] font-bold text-indigo-900">
                    Attendance: 184/200
                </div>
            </div>
        </div>
    </div>
);

// ─── Template definitions ─────────────────────────────────────────────────────

const TEMPLATES = [
    {
        id: "cherith_termly",
        title: "Cherith Gate Termly",
        badge: "West African Standard",
        desc: "Distinctive Nigerian layout with bold pink headers, student photo box, cognitive domain grids, and psychomotor/affective evaluation tables.",
        icon: Shield,
        headerFrom: "from-pink-600",
        headerTo: "to-rose-600",
        accentBorder: "border-pink-600",
        accentRing: "ring-pink-100",
        preview: <PreviewCherith />,
    },
    {
        id: "cbse_scholastic",
        title: "CBSE Scholastic",
        badge: "India / CBSE Standard",
        desc: "Classic Indian CBSE board format with circular crest, half-yearly & annual scholastic grading, co-scholastic tables, and triple-signature blocks.",
        icon: GraduationCap,
        headerFrom: "from-blue-700",
        headerTo: "to-indigo-700",
        accentBorder: "border-blue-700",
        accentRing: "ring-blue-100",
        preview: <PreviewCBSE />,
    },
    {
        id: "tritriangle_modern",
        title: "TriTriangle Modern",
        badge: "Institute / Minimalist",
        desc: "Ultra-modern corporate style with geometric logo mark, teal/cyan column headers, minimalist typography, and a prominent pass/fail summary block.",
        icon: LayoutTemplate,
        headerFrom: "from-cyan-600",
        headerTo: "to-teal-600",
        accentBorder: "border-cyan-600",
        accentRing: "ring-cyan-100",
        preview: <PreviewTriTriangle />,
    },
    {
        id: "islamabad_bimonthly",
        title: "Islamabad Consolidated",
        badge: "Bimonthly Weighted",
        desc: "Elegant crest header with structured bimonthly & midterm weightage columns (10%·30%·10%·50%), overall position tracking, and formal signature lines.",
        icon: Bookmark,
        headerFrom: "from-emerald-600",
        headerTo: "to-teal-700",
        accentBorder: "border-emerald-600",
        accentRing: "ring-emerald-100",
        preview: <PreviewIslamabad />,
    },
    {
        id: "annual_split_panel",
        title: "Annual Split Panel",
        badge: "Annual Split Layout",
        desc: "Elegant balanced layout with a side-by-side split: left for academic subjects & term averages, right for personality profile, attendance & remarks.",
        icon: BookOpen,
        headerFrom: "from-indigo-600",
        headerTo: "to-violet-600",
        accentBorder: "border-indigo-600",
        accentRing: "ring-indigo-100",
        preview: <PreviewSplitPanel />,
    },
];

// ─── Main component ───────────────────────────────────────────────────────────

export default function ReportCardTemplates() {
    const queryClient = useQueryClient();

    const { data: profileData, isLoading } = useQuery({
        queryKey: ["tenant_profile"],
        queryFn: async () => {
            const r = await api.get("/auth/tenant/profile");
            return r.data;
        },
    });

    const [activeTemplate, setActiveTemplate] = useState<string>("cherith_termly");

    useEffect(() => {
        if (profileData?.reportTemplate) {
            setActiveTemplate(profileData.reportTemplate);
        }
    }, [profileData]);

    const updateMutation = useMutation({
        mutationFn: async (templateId: string) => {
            const response = await api.patch("/auth/tenant/profile", { reportTemplate: templateId });
            return response.data;
        },
        onSuccess: (_, variables) => {
            setActiveTemplate(variables);
            queryClient.invalidateQueries({ queryKey: ["tenant_profile"] });
            queryClient.invalidateQueries({ queryKey: ["tenant_profile_global"] });
            toast.success("Report card template updated successfully!");
        },
        onError: (err: any) =>
            toast.error(err?.response?.data?.message || "Failed to update template"),
    });

    const handleSelect = (templateId: string) => {
        if (templateId === activeTemplate || updateMutation.isPending) return;
        updateMutation.mutate(templateId);
    };

    const activeTitle = TEMPLATES.find((t) => t.id === activeTemplate)?.title ?? "Cherith Gate Termly";

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-[#f8fafc]">
                <Loader2 className="w-10 h-10 animate-spin text-[#5C67F2]" />
            </div>
        );
    }

    return (
        <div className="flex-1 bg-[#f8fafc] min-h-screen flex flex-col overflow-y-auto custom-scrollbar">

            {/* Breadcrumb */}
            <div className="bg-white border-b border-gray-100 px-6 py-3.5 flex items-center gap-2 shadow-sm z-10 m-4 rounded-xl">
                <Home className="w-4 h-4 text-gray-400" />
                <span className="text-gray-400 text-sm font-medium">General Settings</span>
                <span className="text-gray-300">/</span>
                <span className="text-gray-700 text-sm font-semibold">Report Card Templates</span>
            </div>

            <div className="px-8 pb-10 max-w-7xl mx-auto w-full space-y-8">

                {/* Page header */}
                <div className="bg-white px-8 py-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-5">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center shadow-inner">
                            <Palette className="w-7 h-7 text-indigo-600" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Report Card Templates</h1>
                            <p className="text-sm text-slate-500 font-medium mt-0.5">
                                Choose a professional layout for your school's official academic transcripts.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2.5 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-100">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                        <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                            Active: {activeTitle}
                        </span>
                    </div>
                </div>

                {/* Templates grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {TEMPLATES.map((template) => {
                        const isSelected = template.id === activeTemplate;
                        const isPending =
                            updateMutation.isPending && updateMutation.variables === template.id;
                        const Icon = template.icon;

                        return (
                            <motion.div
                                key={template.id}
                                layout
                                whileHover={{ y: isSelected ? 0 : -4 }}
                                transition={{ duration: 0.18, ease: "easeOut" }}
                                className={[
                                    "rounded-3xl bg-white border-2 overflow-hidden flex flex-col transition-all duration-200",
                                    isSelected
                                        ? `${template.accentBorder} shadow-lg ring-4 ${template.accentRing}`
                                        : "border-slate-100 shadow-md shadow-slate-100/60 hover:border-slate-200",
                                ].join(" ")}
                            >
                                {/* Card header */}
                                <div
                                    className={`bg-gradient-to-r ${template.headerFrom} ${template.headerTo} px-5 py-4 flex items-center justify-between text-white`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                            <Icon className="w-5 h-5 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="font-black text-base leading-none">{template.title}</h3>
                                            <p className="text-[10px] opacity-75 font-semibold mt-1 uppercase tracking-widest">
                                                {template.badge}
                                            </p>
                                        </div>
                                    </div>
                                    <AnimatePresence>
                                        {isSelected && (
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.7 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.7 }}
                                                className="flex items-center gap-1.5 bg-white/95 text-slate-700 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow"
                                            >
                                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                                Active
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* Preview */}
                                <div className="p-5 bg-slate-50/60 border-b border-slate-100 flex items-center justify-center">
                                    <div className="w-full transition-transform duration-200 hover:scale-[1.02]">
                                        {template.preview}
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="p-5 flex flex-col gap-4 bg-white flex-1">
                                    <p className="text-xs text-slate-500 leading-relaxed font-medium flex-1">
                                        {template.desc}
                                    </p>
                                    <button
                                        onClick={() => handleSelect(template.id)}
                                        disabled={isSelected || updateMutation.isPending}
                                        className={[
                                            "w-full h-11 rounded-xl font-black text-[11px] tracking-[0.15em] uppercase flex items-center justify-center gap-2 transition-all duration-150",
                                            isSelected
                                                ? "bg-emerald-50 text-emerald-700 border-2 border-emerald-200 cursor-default"
                                                : updateMutation.isPending && updateMutation.variables === template.id
                                                    ? "bg-indigo-100 text-indigo-400 cursor-wait"
                                                    : "bg-[#5C67F2] hover:bg-[#4a54c4] active:scale-[0.98] text-white shadow-md shadow-indigo-100 disabled:opacity-40",
                                        ].join(" ")}
                                    >
                                        {isPending ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Applying…
                                            </>
                                        ) : isSelected ? (
                                            <>
                                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                                Currently Active
                                            </>
                                        ) : (
                                            <>
                                                <Award className="w-4 h-4" />
                                                Select This Template
                                            </>
                                        )}
                                    </button>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}