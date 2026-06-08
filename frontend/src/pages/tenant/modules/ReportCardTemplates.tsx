import { useState, useEffect } from "react";
import { Home, CheckCircle2, Palette, Loader2, BookOpen, Check } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";

// ─── Curriculum tabs ──────────────────────────────────────────────────────────
const CURRICULUM_TABS = [
    { id: "all",       label: "All",       color: "#5C67F2" },
    { id: "CBC",       label: "CBC",       color: "#10B981" },
    { id: "844",       label: "8-4-4 / KCSE", color: "#5C67F2" },
    { id: "Cambridge", label: "Cambridge", color: "#8B5CF6" },
    { id: "IB",        label: "IB",        color: "#EC4899" },
];

// ─── Mini preview components ──────────────────────────────────────────────────

// CBC TEMPLATES
const PreviewCBCClassic = () => (
    <div className="p-3 bg-white rounded-lg border-2 border-emerald-600 text-[7px] leading-tight select-none">
        <div className="text-center border-b-2 border-emerald-600 pb-1.5 mb-1.5">
            <p className="font-black text-[8px] text-emerald-800 uppercase">COMPETENCY BASED REPORT</p>
            <p className="text-[6px] text-slate-500">Term 1 · Academic Year 2025/2026</p>
        </div>
        <div className="grid grid-cols-3 gap-1 bg-emerald-50 rounded p-1 mb-1.5 text-[6px]">
            <span>Student: <strong>Amina K.</strong></span>
            <span>Class: <strong>Grade 4</strong></span>
            <span>Stream: <strong>East</strong></span>
        </div>
        <table className="w-full" style={{ borderCollapse: "collapse" }}>
            <thead><tr className="bg-emerald-700 text-white">
                <th className="px-1 py-0.5 text-left">Subject</th>
                <th className="px-1 py-0.5">Score</th>
                <th className="px-1 py-0.5">Level</th>
                <th className="px-1 py-0.5">Remarks</th>
            </tr></thead>
            <tbody>{[["Mathematics", "88", "EE", "Excellent"],["English", "74", "ME", "Good"],["Science", "65", "ME", "Good"]].map(([s, sc, l, r]) => (
                <tr key={s} className="border-b border-slate-100">
                    <td className="px-1 py-0.5 font-semibold">{s}</td>
                    <td className="px-1 py-0.5 text-center">{sc}</td>
                    <td className="px-1 py-0.5 text-center font-black" style={{ color: l === "EE" ? "#10B981" : "#5C67F2" }}>{l}</td>
                    <td className="px-1 py-0.5 text-[6px] text-slate-500">{r}</td>
                </tr>
            ))}</tbody>
        </table>
        <div className="mt-1.5 bg-emerald-50 border border-emerald-200 rounded p-1 text-[6px] flex justify-around font-bold">
            <span className="text-emerald-700">EE: 80–100%</span><span className="text-blue-700">ME: 60–79%</span>
            <span className="text-amber-600">AE: 40–59%</span><span className="text-red-600">BE: 0–39%</span>
        </div>
    </div>
);

const PreviewCBCPortfolio = () => (
    <div className="p-3 bg-white rounded-lg border border-emerald-300 text-[7px] leading-tight select-none">
        <div className="flex items-center gap-2 border-b border-emerald-200 pb-1.5 mb-1.5">
            <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center font-black text-[8px]">📚</div>
            <div><p className="font-black text-emerald-800 text-[8px]">CBC Learning Portfolio</p>
            <p className="text-[6px] text-slate-400">Holistic Learner Assessment</p></div>
        </div>
        <p className="text-[6px] font-black text-emerald-700 uppercase mb-1">Core Competency Strands</p>
        {[["Communication", "ME", "#5C67F2"],["Critical Thinking","EE","#10B981"],["Citizenship","AE","#F59E0B"],["Self-Efficacy","ME","#5C67F2"]].map(([k,v,c]) => (
            <div key={k as string} className="flex justify-between items-center py-0.5 border-b border-slate-50">
                <span className="text-slate-600">{k}</span>
                <span className="font-black text-[7px] px-1.5 py-0.5 rounded-full text-white" style={{ backgroundColor: c as string }}>{v}</span>
            </div>
        ))}
        <div className="mt-1.5 bg-slate-50 rounded p-1 text-[6px] text-slate-500 italic">"Shows great enthusiasm in group work and peer learning activities."</div>
    </div>
);

const PreviewCBCHolistic = () => (
    <div className="p-3 bg-white rounded-lg border border-slate-200 text-[7px] leading-tight select-none">
        <div className="bg-emerald-700 text-white rounded-lg px-2 py-1.5 mb-2 text-center">
            <p className="font-black text-[8px]">HOLISTIC DEVELOPMENT REPORT</p>
            <p className="text-[6px] opacity-75">CBC Framework · Grade 3</p>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
            <div><p className="text-[6px] font-black text-emerald-700 uppercase mb-1">Academic</p>
            {[["Literacy","EE"],["Numeracy","ME"],["Science","EE"]].map(([k,v]) => (
                <div key={k as string} className="flex justify-between text-[6px] border-b border-slate-50 py-0.5">
                    <span className="text-slate-600">{k}</span><span className="font-black text-emerald-700">{v}</span>
                </div>
            ))}</div>
            <div><p className="text-[6px] font-black text-blue-700 uppercase mb-1">Values</p>
            {[["Respect","EE"],["Integrity","ME"],["Patriotism","EE"]].map(([k,v]) => (
                <div key={k as string} className="flex justify-between text-[6px] border-b border-slate-50 py-0.5">
                    <span className="text-slate-600">{k}</span><span className="font-black text-blue-700">{v}</span>
                </div>
            ))}</div>
        </div>
        <div className="mt-1.5 bg-emerald-50 border border-emerald-100 rounded p-1 text-center text-[6px] font-bold text-emerald-800">
            Overall: Meets Expectation · Attendance: 92%
        </div>
    </div>
);

const PreviewCBCModern = () => (
    <div className="p-3 bg-gradient-to-br from-emerald-50 to-white rounded-lg border border-emerald-200 text-[7px] leading-tight select-none">
        <div className="flex justify-between items-start mb-2">
            <div><p className="font-black text-[9px] text-emerald-900">CBC Report Card</p>
            <p className="text-[6px] text-slate-400">Grade 5 West · 2026</p></div>
            <div className="text-right"><p className="text-[6px] text-slate-400">Student</p><p className="font-black text-slate-800">John Otieno</p></div>
        </div>
        {[["Mathematics","92","EE","#10B981"],["English","77","ME","#5C67F2"],["Kiswahili","58","AE","#F59E0B"],["CRE","83","EE","#10B981"]].map(([s,sc,l,c]) => (
            <div key={s as string} className="flex items-center gap-2 py-0.5 border-b border-slate-50">
                <span className="flex-1 text-slate-700 font-semibold">{s}</span>
                <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${sc}%`, backgroundColor: c as string }} />
                </div>
                <span className="w-5 text-right font-black" style={{ color: c as string }}>{l}</span>
            </div>
        ))}
    </div>
);

// 8-4-4 / KCSE TEMPLATES
const PreviewKCSEClassic = () => (
    <div className="p-3 bg-white rounded-lg border-2 border-indigo-600 text-[7px] leading-tight select-none">
        <div className="text-center border-b-2 border-indigo-600 pb-1.5 mb-1.5">
            <p className="font-black text-[8px] text-indigo-800 uppercase">KCSE Academic Report</p>
            <p className="text-[6px] text-slate-400">Term 2 · Form 3 North</p>
        </div>
        <div className="grid grid-cols-3 gap-1 text-[6px] bg-indigo-50 rounded p-1 mb-1.5">
            <span>Name: <strong>James K.</strong></span><span>Form: <strong>3N</strong></span><span>Pos: <strong>4/42</strong></span>
        </div>
        <table className="w-full" style={{ borderCollapse: "collapse" }}>
            <thead><tr className="bg-indigo-700 text-white">
                <th className="px-1 py-0.5 text-left">Subject</th>
                <th className="px-1 py-0.5">CA1</th><th className="px-1 py-0.5">CA2</th>
                <th className="px-1 py-0.5">Exam</th><th className="px-1 py-0.5">Total</th>
                <th className="px-1 py-0.5">Grade</th><th className="px-1 py-0.5">Pts</th>
            </tr></thead>
            <tbody>{[["Mathematics","18","17","55","90","A","12"],["English","15","16","50","81","A-","11"],["Biology","14","15","48","77","B+","10"]].map(([s,c1,c2,e,t,g,p]) => (
                <tr key={s} className="border-b border-slate-100">
                    <td className="px-1 py-0.5 font-semibold">{s}</td>
                    <td className="px-1 py-0.5 text-center">{c1}</td><td className="px-1 py-0.5 text-center">{c2}</td>
                    <td className="px-1 py-0.5 text-center">{e}</td>
                    <td className="px-1 py-0.5 text-center font-bold text-indigo-700">{t}</td>
                    <td className="px-1 py-0.5 text-center font-black text-indigo-700">{g}</td>
                    <td className="px-1 py-0.5 text-center font-black">{p}</td>
                </tr>
            ))}</tbody>
        </table>
        <div className="mt-1.5 bg-indigo-50 rounded p-1 text-center text-[6px] font-bold text-indigo-800">
            Mean Grade: A- · Total Points: 64 · Position: 4/42
        </div>
    </div>
);

const PreviewKCSETermly = () => (
    <div className="p-3 bg-white rounded-lg border border-indigo-200 text-[7px] leading-tight select-none">
        <div className="flex items-center gap-2 mb-2 border-b border-indigo-100 pb-1.5">
            <div className="w-7 h-7 rounded-full bg-indigo-700 text-white flex items-center justify-center font-black text-[8px]">SC</div>
            <div><p className="font-black text-indigo-900 text-[8px]">Termly Progress Report</p>
            <p className="text-[6px] text-slate-400">3 Terms · KCSE System</p></div>
        </div>
        <table className="w-full" style={{ borderCollapse: "collapse" }}>
            <thead><tr className="bg-indigo-600 text-white">
                <th className="px-1 py-0.5 text-left">Subject</th>
                <th className="px-1 py-0.5">T1</th><th className="px-1 py-0.5">T2</th><th className="px-1 py-0.5">T3</th>
                <th className="px-1 py-0.5">Avg</th><th className="px-1 py-0.5">Grd</th>
            </tr></thead>
            <tbody>{[["Maths","88","82","90","87","A"],["English","76","80","78","78","B+"],["Physics","72","75","80","76","B+"]].map(([s,t1,t2,t3,a,g]) => (
                <tr key={s} className="border-b border-slate-100">
                    <td className="px-1 py-0.5 font-semibold">{s}</td>
                    <td className="px-1 py-0.5 text-center">{t1}</td><td className="px-1 py-0.5 text-center">{t2}</td><td className="px-1 py-0.5 text-center">{t3}</td>
                    <td className="px-1 py-0.5 text-center font-bold text-indigo-700">{a}</td>
                    <td className="px-1 py-0.5 text-center font-black text-indigo-700">{g}</td>
                </tr>
            ))}</tbody>
        </table>
    </div>
);

const PreviewKCSEMerit = () => (
    <div className="p-3 bg-white rounded-lg border border-slate-200 text-[7px] leading-tight select-none">
        <div className="bg-gradient-to-r from-indigo-700 to-blue-700 text-white rounded-lg px-2 py-1.5 mb-2">
            <p className="font-black text-[8px] text-center">MERIT ACADEMIC REPORT</p>
            <p className="text-[6px] text-center opacity-70">Kenya Certificate of Secondary Education</p>
        </div>
        <div className="grid grid-cols-2 gap-1 text-[6px] mb-1.5">
            <span className="text-slate-500">Student: <strong className="text-slate-800">Wanjiku M.</strong></span>
            <span className="text-slate-500">Stream: <strong className="text-slate-800">Form 4 West</strong></span>
            <span className="text-slate-500">Mean Grade: <strong className="text-indigo-700">A-</strong></span>
            <span className="text-slate-500">Points: <strong className="text-indigo-700">66/84</strong></span>
        </div>
        {[["Mathematics","A","12"],["English","A-","11"],["Biology","B+","10"],["Chemistry","A","12"]].map(([s,g,p]) => (
            <div key={s as string} className="flex justify-between text-[6px] border-b border-slate-50 py-0.5">
                <span className="text-slate-700 flex-1">{s}</span>
                <span className="font-black text-indigo-700 w-6">{g}</span>
                <span className="text-slate-400 w-5 text-right">{p}pts</span>
            </div>
        ))}
        <div className="mt-1.5 bg-indigo-50 border border-indigo-100 rounded p-1 text-[6px] italic text-slate-500">"An outstanding student with great potential."</div>
    </div>
);

const PreviewKCSEComprehensive = () => (
    <div className="p-3 bg-white rounded-lg border border-indigo-100 text-[7px] leading-tight select-none">
        <div className="text-center mb-2"><p className="font-black text-[8px] text-slate-800 uppercase">Comprehensive Report</p>
        <p className="text-[6px] text-slate-400">8-4-4 System · Annual Assessment</p></div>
        <div className="grid grid-cols-2 gap-1.5 mb-1.5">
            <div className="border border-indigo-100 rounded overflow-hidden">
                <div className="bg-indigo-700 text-white px-1.5 py-0.5 font-bold text-[6px]">Academic</div>
                {[["Maths","A","12"],["Eng","A-","11"],["Bio","B+","10"]].map(([s,g,p]) => (
                    <div key={s as string} className="flex justify-between px-1.5 py-0.5 border-b border-slate-50 text-[6px]">
                        <span>{s}</span><span className="font-black text-indigo-700">{g}</span><span className="text-slate-400">{p}</span>
                    </div>
                ))}
            </div>
            <div>
                <div className="border border-slate-100 rounded overflow-hidden mb-1">
                    <div className="bg-slate-600 text-white px-1.5 py-0.5 font-bold text-[6px]">Behaviour</div>
                    {[["Punctuality","A"],["Conduct","A+"]].map(([k,v]) => (
                        <div key={k as string} className="flex justify-between px-1.5 py-0.5 text-[6px]"><span>{k}</span><span className="font-black">{v}</span></div>
                    ))}
                </div>
                <div className="bg-indigo-50 border border-indigo-100 rounded p-1 text-[6px] text-center font-bold text-indigo-800">Att: 188/200</div>
            </div>
        </div>
    </div>
);

// CAMBRIDGE TEMPLATES
const PreviewCambridgeStandard = () => (
    <div className="p-3 bg-white rounded-lg border-2 border-purple-600 text-[7px] leading-tight select-none">
        <div className="flex items-center gap-2 border-b-2 border-purple-600 pb-1.5 mb-1.5">
            <div className="w-7 h-7 rounded-full bg-purple-700 text-white flex items-center justify-center font-black text-[6px]">CAM</div>
            <div><p className="font-black text-[8px] text-purple-900">Cambridge International</p>
            <p className="text-[6px] text-slate-400">IGCSE · Academic Report 2026</p></div>
            <div className="ml-auto w-7 h-9 border border-slate-200 flex items-center justify-center text-[5px] text-slate-400 bg-slate-50 rounded">PHOTO</div>
        </div>
        <div className="grid grid-cols-2 gap-1 text-[6px] bg-purple-50 rounded p-1 mb-1.5">
            <span>Candidate: <strong>Emma Watson</strong></span><span>Centre: <strong>KE/001</strong></span>
        </div>
        <table className="w-full" style={{ borderCollapse: "collapse" }}>
            <thead><tr className="bg-purple-700 text-white">
                <th className="px-1 py-0.5 text-left">Subject</th>
                <th className="px-1 py-0.5">CW%</th><th className="px-1 py-0.5">Exam%</th>
                <th className="px-1 py-0.5">Final</th><th className="px-1 py-0.5">Grade</th>
            </tr></thead>
            <tbody>{[["Mathematics","88","92","91","A*"],["English Lit","82","85","84","A"],["Biology","75","78","77","B"]].map(([s,cw,ex,f,g]) => (
                <tr key={s} className="border-b border-slate-100">
                    <td className="px-1 py-0.5 font-semibold">{s}</td>
                    <td className="px-1 py-0.5 text-center">{cw}</td><td className="px-1 py-0.5 text-center">{ex}</td>
                    <td className="px-1 py-0.5 text-center font-bold">{f}</td>
                    <td className="px-1 py-0.5 text-center font-black text-purple-700">{g}</td>
                </tr>
            ))}</tbody>
        </table>
    </div>
);

const PreviewCambridgeIGCSE = () => (
    <div className="p-3 bg-white rounded-lg border border-purple-200 text-[7px] leading-tight select-none">
        <div className="bg-purple-800 text-white rounded-lg px-2 py-1.5 mb-2 flex justify-between items-center">
            <div><p className="font-black text-[8px]">IGCSE Progress Report</p>
            <p className="text-[6px] opacity-70">Cambridge Assessment International Education</p></div>
            <div className="text-right text-[6px] opacity-80">Grade 10</div>
        </div>
        {[["Mathematics","A*","Outstanding"],["English Lang","A","Excellent"],["Physics","B","Very Good"],["Chemistry","A","Excellent"]].map(([s,g,r]) => (
            <div key={s as string} className="flex items-center gap-2 py-0.5 border-b border-slate-50">
                <span className="flex-1 text-slate-700">{s}</span>
                <span className="font-black text-purple-700 w-6 text-center">{g}</span>
                <span className="text-[6px] text-slate-400 w-16">{r}</span>
            </div>
        ))}
        <div className="mt-1.5 text-[6px] text-slate-400 text-center">A*&gt;A&gt;B&gt;C&gt;D&gt;E&gt;F&gt;U</div>
    </div>
);

const PreviewCambridgeProgress = () => (
    <div className="p-3 bg-white rounded-lg border border-violet-200 text-[7px] leading-tight select-none">
        <div className="flex justify-between items-start mb-2 pb-1.5 border-b border-violet-100">
            <div><p className="font-black text-[8px] text-violet-900">Progress Report</p>
            <p className="text-[6px] text-slate-400">Cambridge · Target & Achieved</p></div>
        </div>
        <table className="w-full" style={{ borderCollapse: "collapse" }}>
            <thead><tr className="bg-violet-600 text-white text-[6px]">
                <th className="px-1 py-0.5 text-left">Subject</th>
                <th className="px-1 py-0.5">Target</th><th className="px-1 py-0.5">Achieved</th><th className="px-1 py-0.5">Trend</th>
            </tr></thead>
            <tbody>{[["Mathematics","A*","A","▲"],["English","A","A","→"],["Biology","B","A","▲"],["History","B","B-","▼"]].map(([s,tg,ach,tr]) => (
                <tr key={s} className="border-b border-slate-100">
                    <td className="px-1 py-0.5 font-semibold">{s}</td>
                    <td className="px-1 py-0.5 text-center text-slate-500">{tg}</td>
                    <td className="px-1 py-0.5 text-center font-black text-violet-700">{ach}</td>
                    <td className="px-1 py-0.5 text-center" style={{ color: tr === "▲" ? "#10B981" : tr === "▼" ? "#EF4444" : "#5C67F2" }}>{tr}</td>
                </tr>
            ))}</tbody>
        </table>
        <div className="mt-1 text-[6px] text-slate-400 italic">"On track for target grades. Continue current study habits."</div>
    </div>
);

const PreviewCambridgeContinuous = () => (
    <div className="p-3 bg-white rounded-lg border border-purple-100 text-[7px] leading-tight select-none">
        <div className="text-center bg-gradient-to-r from-purple-700 to-violet-700 text-white rounded-lg py-1.5 mb-2">
            <p className="font-black text-[8px]">Continuous Assessment Report</p>
            <p className="text-[6px] opacity-75">Cambridge International · 2026</p>
        </div>
        {[["Mathematics","CW1: 88","CW2: 91","Proj: 85","A*"],["English","CW1: 82","CW2: 80","Proj: 84","A"],["Sciences","CW1: 76","CW2: 79","Proj: 80","B"]].map(([s,a1,a2,p,g]) => (
            <div key={s as string} className="mb-1.5 border border-slate-100 rounded p-1">
                <div className="flex justify-between font-bold text-[6px]">
                    <span className="text-slate-800">{s}</span>
                    <span className="text-purple-700">{g}</span>
                </div>
                <div className="flex gap-2 text-[6px] text-slate-400 mt-0.5">{[a1,a2,p].map(v => <span key={v}>{v}</span>)}</div>
            </div>
        ))}
    </div>
);

// IB TEMPLATES
const PreviewIBStandard = () => (
    <div className="p-3 bg-white rounded-lg border-2 border-pink-500 text-[7px] leading-tight select-none">
        <div className="text-center border-b-2 border-pink-500 pb-1.5 mb-1.5">
            <p className="font-black text-[8px] text-pink-800 uppercase">IB Academic Report</p>
            <p className="text-[6px] text-slate-400">International Baccalaureate · 2026</p>
        </div>
        <div className="grid grid-cols-2 gap-1 text-[6px] bg-pink-50 rounded p-1 mb-1.5">
            <span>Student: <strong>Sofia M.</strong></span><span>Year: <strong>IB2</strong></span>
        </div>
        <table className="w-full" style={{ borderCollapse: "collapse" }}>
            <thead><tr className="bg-pink-600 text-white">
                <th className="px-1 py-0.5 text-left">Subject</th>
                <th className="px-1 py-0.5">IA%</th><th className="px-1 py-0.5">Exam</th>
                <th className="px-1 py-0.5">Pts/7</th><th className="px-1 py-0.5">Pred</th>
            </tr></thead>
            <tbody>{[["HL Mathematics","85","6","6","7"],["HL English","78","5","5","6"],["SL Biology","82","6","6","6"]].map(([s,ia,ex,p,pr]) => (
                <tr key={s} className="border-b border-slate-100">
                    <td className="px-1 py-0.5 font-semibold">{s}</td>
                    <td className="px-1 py-0.5 text-center">{ia}</td><td className="px-1 py-0.5 text-center">{ex}</td>
                    <td className="px-1 py-0.5 text-center font-black text-pink-600">{p}</td>
                    <td className="px-1 py-0.5 text-center text-slate-400">{pr}</td>
                </tr>
            ))}</tbody>
        </table>
        <div className="mt-1.5 bg-pink-50 border border-pink-100 rounded p-1 text-center text-[6px] font-bold text-pink-800">
            Total IB Points: 32/42 · EE: B · TOK: B
        </div>
    </div>
);

const PreviewIBMYP = () => (
    <div className="p-3 bg-white rounded-lg border border-pink-200 text-[7px] leading-tight select-none">
        <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-pink-100">
            <div className="w-7 h-7 rounded-full bg-pink-600 text-white flex items-center justify-center font-black text-[6px]">MYP</div>
            <div><p className="font-black text-pink-900 text-[8px]">MYP Progress Report</p>
            <p className="text-[6px] text-slate-400">Middle Years Programme · Year 4</p></div>
        </div>
        {[["Arts","Task 1: Sculpture","6/7"],["Humanities","Inquiry essay","5/7"],["Sciences","Lab report","6/7"],["PHE","Fitness test","7/7"]].map(([s,t,g]) => (
            <div key={s as string} className="flex items-center gap-2 py-0.5 border-b border-slate-50">
                <span className="flex-1 font-semibold text-slate-700">{s}</span>
                <span className="text-[6px] text-slate-400">{t}</span>
                <span className="font-black text-pink-600 w-6 text-right">{g}</span>
            </div>
        ))}
        <div className="mt-1 text-[6px] text-slate-400 text-center">MYP Scale: 1–7 · Passing: 4+</div>
    </div>
);

const PreviewIBProgress = () => (
    <div className="p-3 bg-white rounded-lg border border-rose-200 text-[7px] leading-tight select-none">
        <div className="bg-gradient-to-r from-pink-600 to-rose-600 text-white rounded-lg px-2 py-1.5 mb-2">
            <p className="font-black text-[8px] text-center">IB Diploma Progress</p>
            <p className="text-[6px] text-center opacity-70">Predicted vs Current Points</p>
        </div>
        {[["HL Maths","7","6","▲"],["HL Physics","6","6","→"],["HL English","6","5","▼"],["SL French","5","5","→"]].map(([s,pred,cur,tr]) => (
            <div key={s as string} className="flex justify-between items-center py-0.5 border-b border-slate-50">
                <span className="flex-1 text-slate-700">{s}</span>
                <span className="text-[6px] text-slate-400 mr-2">Pred: {pred}</span>
                <span className="font-black text-pink-600 w-4 text-center">{cur}</span>
                <span className="w-4 text-center" style={{ color: tr === "▲" ? "#10B981" : tr === "▼" ? "#EF4444" : "#5C67F2" }}>{tr}</span>
            </div>
        ))}
        <div className="mt-1.5 bg-pink-50 border border-pink-100 rounded p-1 text-center text-[6px] font-bold text-pink-800">
            Current: 31pts · Predicted: 33pts
        </div>
    </div>
);

const PreviewIBDiploma = () => (
    <div className="p-3 bg-white rounded-lg border border-pink-100 text-[7px] leading-tight select-none">
        <div className="text-center mb-2">
            <p className="font-black text-[8px] text-slate-900">IB DIPLOMA TRANSCRIPT</p>
            <p className="text-[6px] text-pink-600 font-bold">IBDP Full Report · 2026</p>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
            <div><p className="text-[6px] font-black text-pink-700 uppercase mb-1">HL Subjects</p>
            {[["Mathematics","7"],["Physics","6"],["English A","6"]].map(([s,p]) => (
                <div key={s as string} className="flex justify-between text-[6px] border-b border-slate-50 py-0.5">
                    <span>{s}</span><span className="font-black text-pink-600">{p}</span>
                </div>
            ))}</div>
            <div><p className="text-[6px] font-black text-rose-700 uppercase mb-1">SL Subjects</p>
            {[["French","5"],["History","5"],["Biology","6"]].map(([s,p]) => (
                <div key={s as string} className="flex justify-between text-[6px] border-b border-slate-50 py-0.5">
                    <span>{s}</span><span className="font-black text-rose-600">{p}</span>
                </div>
            ))}</div>
        </div>
        <div className="mt-1.5 bg-pink-50 border border-pink-100 rounded p-1 flex justify-around text-[6px] font-bold text-pink-800">
            <span>Total: 35/45</span><span>EE: A</span><span>TOK: A</span><span>+3 bonus</span>
        </div>
    </div>
);

// ─── Template registry ────────────────────────────────────────────────────────
const TEMPLATES = [
    // CBC
    { id: "cbc_classic",     curriculum: "CBC",       title: "CBC Classic",          badge: "Competency Levels",     color: "#10B981", preview: <PreviewCBCClassic />,      desc: "Standard CBC report with EE/ME/AE/BE performance levels, subject scores, and competency remarks." },
    { id: "cbc_portfolio",   curriculum: "CBC",       title: "CBC Portfolio",         badge: "Learning Portfolio",    color: "#10B981", preview: <PreviewCBCPortfolio />,    desc: "Learning portfolio format organized by core competency strands with teacher narrative comments." },
    { id: "cbc_holistic",    curriculum: "CBC",       title: "CBC Holistic",          badge: "Holistic Development",  color: "#10B981", preview: <PreviewCBCHolistic />,     desc: "Full holistic development report covering academic, values, and skills domains." },
    { id: "cbc_modern",      curriculum: "CBC",       title: "CBC Modern Card",       badge: "Visual Progress Bars",  color: "#10B981", preview: <PreviewCBCModern />,       desc: "Minimalist CBC report with color-coded progress bars and clean typography." },
    // 8-4-4
    { id: "kcse_classic",    curriculum: "844",       title: "KCSE Classic",          badge: "Traditional KCSE",      color: "#5C67F2", preview: <PreviewKCSEClassic />,     desc: "Traditional KCSE report with CA1+CA2+Exam columns, letter grades A–E, and points." },
    { id: "kcse_termly",     curriculum: "844",       title: "KCSE 3-Term",           badge: "Term-by-Term",          color: "#5C67F2", preview: <PreviewKCSETermly />,      desc: "Three-term comparison report showing Term 1, 2, 3 scores with overall mean grade." },
    { id: "kcse_merit",      curriculum: "844",       title: "KCSE Merit",            badge: "Mean Grade Focus",      color: "#5C67F2", preview: <PreviewKCSEMerit />,       desc: "Merit-style report highlighting mean grade, points tally, position, and teacher remarks." },
    { id: "kcse_comprehensive", curriculum: "844",    title: "KCSE Comprehensive",    badge: "Full Assessment",       color: "#5C67F2", preview: <PreviewKCSEComprehensive />, desc: "Comprehensive 8-4-4 report including academics, behavior, attendance, and signature blocks." },
    // Cambridge
    { id: "cam_standard",    curriculum: "Cambridge", title: "Cambridge Standard",    badge: "IGCSE A*–U",            color: "#8B5CF6", preview: <PreviewCambridgeStandard />, desc: "Official Cambridge IGCSE layout with coursework and written exam weightings, A*–U grades." },
    { id: "cam_igcse",       curriculum: "Cambridge", title: "Cambridge IGCSE",       badge: "Subject Grades",        color: "#8B5CF6", preview: <PreviewCambridgeIGCSE />,  desc: "Clean Cambridge IGCSE subject grades with descriptors and grade boundary reference." },
    { id: "cam_progress",    curriculum: "Cambridge", title: "Cambridge Progress",    badge: "Target vs Achieved",    color: "#8B5CF6", preview: <PreviewCambridgeProgress />, desc: "Progress report comparing target grades against achieved grades with trend indicators." },
    { id: "cam_continuous",  curriculum: "Cambridge", title: "Cambridge Continuous",  badge: "Continuous Assessment", color: "#8B5CF6", preview: <PreviewCambridgeContinuous />, desc: "Continuous assessment format tracking multiple coursework submissions and project grades." },
    // IB
    { id: "ib_standard",     curriculum: "IB",        title: "IB Standard",          badge: "1–7 Points Scale",      color: "#EC4899", preview: <PreviewIBStandard />,      desc: "Standard IB report with HL/SL subject points on the 1–7 scale, IA scores, and TOK/EE." },
    { id: "ib_myp",          curriculum: "IB",        title: "IB MYP Report",         badge: "Middle Years",          color: "#EC4899", preview: <PreviewIBMYP />,           desc: "Middle Years Programme report with task-based assessment and MYP 1–7 grade scale." },
    { id: "ib_progress",     curriculum: "IB",        title: "IB Progress",           badge: "Predicted vs Current",  color: "#EC4899", preview: <PreviewIBProgress />,      desc: "IB Diploma progress tracker comparing current points against predicted grades with trends." },
    { id: "ib_diploma",      curriculum: "IB",        title: "IB Diploma Full",       badge: "IBDP Transcript",       color: "#EC4899", preview: <PreviewIBDiploma />,       desc: "Full IB Diploma transcript showing HL/SL subjects, bonus points, EE, and TOK grades." },
];

// ─── Main component ───────────────────────────────────────────────────────────
export default function ReportCardTemplates() {
    const qc = useQueryClient();
    const [curriculumTab, setCurriculumTab] = useState("all");

    const { data: profileData, isLoading } = useQuery<any>({
        queryKey: ["tenant_profile_global"],
        queryFn: async () => {
            const r = await api.get("/auth/tenant/profile");
            return Array.isArray(r.data) ? r.data[0] : r.data;
        },
    });

    const { data: curriculumSettings } = useQuery<any>({
        queryKey: ["curriculum_settings"],
        queryFn: async () => {
            const r = await api.get("/curriculum_settings");
            const arr = Array.isArray(r.data) ? r.data : [];
            return arr[0] || null;
        },
    });

    const [activeTemplate, setActiveTemplate] = useState<string>("kcse_classic");

    useEffect(() => {
        if (profileData?.reportTemplate) setActiveTemplate(profileData.reportTemplate);
        // Auto-tab to the school's configured curriculum
        else if (curriculumSettings?.curriculumId) setCurriculumTab(curriculumSettings.curriculumId);
    }, [profileData, curriculumSettings]);

    useEffect(() => {
        if (curriculumSettings?.curriculumId && !profileData?.reportTemplate) {
            setCurriculumTab(curriculumSettings.curriculumId);
        }
    }, [curriculumSettings]);

    const saveMut = useMutation({
        mutationFn: (id: string) => api.patch("/auth/tenant/profile", { reportTemplate: id }),
        onSuccess: (_, id) => {
            setActiveTemplate(id);
            qc.invalidateQueries({ queryKey: ["tenant_profile_global"] });
            const tpl = TEMPLATES.find(t => t.id === id);
            toast.success(`"${tpl?.title}" is now your active report card template`);
        },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed to save template"),
    });

    const visible = curriculumTab === "all"
        ? TEMPLATES
        : TEMPLATES.filter(t => t.curriculum === curriculumTab);

    const activeInfo = TEMPLATES.find(t => t.id === activeTemplate);
    const schoolCurriculum = curriculumSettings?.curriculumId;

    if (isLoading) return <div className="flex-1 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#5C67F2]" /></div>;

    return (
        <div className="flex-1 bg-[#f8fafc] min-h-screen flex flex-col">

            {/* Breadcrumb */}
            <div className="bg-white border-b border-gray-100 px-6 py-3.5 flex items-center gap-2 shadow-sm m-4 rounded-xl">
                <Home className="w-4 h-4 text-gray-400" />
                <span className="text-gray-400 text-sm font-medium">General Settings</span>
                <span className="text-gray-300">/</span>
                <span className="text-gray-700 text-sm font-semibold">Report Card Templates</span>
            </div>

            <div className="px-6 pb-10 max-w-7xl mx-auto w-full space-y-6">

                {/* Header */}
                <div className="bg-white px-6 py-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center">
                            <Palette className="w-6 h-6 text-indigo-600" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-slate-800">Report Card Templates</h1>
                            <p className="text-xs text-slate-500 font-medium mt-0.5">Choose a template for your school's academic transcripts. {TEMPLATES.length} templates across 4 curricula.</p>
                        </div>
                    </div>
                    {activeInfo && (
                        <div className="flex items-center gap-2 bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-200">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-xs font-black text-emerald-800 uppercase tracking-wide">
                                Active: {activeInfo.title}
                            </span>
                            <span className="text-[9px] text-emerald-600 font-bold px-1.5 py-0.5 rounded-full border border-emerald-200">
                                {activeInfo.curriculum}
                            </span>
                        </div>
                    )}
                </div>

                {/* School curriculum hint */}
                {schoolCurriculum && (
                    <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-center gap-3 text-xs font-medium text-blue-700">
                        <BookOpen className="w-4 h-4 text-blue-500 flex-shrink-0" />
                        Your school uses <strong className="mx-1">{schoolCurriculum}</strong> curriculum.
                        <button onClick={() => setCurriculumTab(schoolCurriculum)}
                            className="ml-1 font-black underline hover:text-blue-900 transition-colors">
                            Show {schoolCurriculum} templates →
                        </button>
                    </div>
                )}

                {/* Curriculum Tabs */}
                <div className="flex gap-2 flex-wrap">
                    {CURRICULUM_TABS.map(tab => {
                        const count = tab.id === "all" ? TEMPLATES.length : TEMPLATES.filter(t => t.curriculum === tab.id).length;
                        const isActive = curriculumTab === tab.id;
                        return (
                            <button key={tab.id} onClick={() => setCurriculumTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
                                    isActive
                                        ? "text-white shadow-sm border-transparent"
                                        : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                                }`}
                                style={isActive ? { backgroundColor: tab.color, borderColor: tab.color } : {}}>
                                {tab.label}
                                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${isActive ? "bg-white/20" : "bg-gray-100 text-gray-500"}`}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Templates grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
                    {visible.map(tpl => {
                        const isSelected = activeTemplate === tpl.id;
                        const isPending = saveMut.isPending && saveMut.variables === tpl.id;
                        return (
                            <div key={tpl.id}
                                className={`rounded-2xl bg-white border-2 overflow-hidden flex flex-col transition-all duration-150 hover:-translate-y-1 ${
                                    isSelected
                                        ? "shadow-lg"
                                        : "border-gray-100 shadow-sm hover:shadow-md"
                                }`}
                                style={isSelected ? { borderColor: tpl.color, boxShadow: `0 0 0 4px ${tpl.color}20` } : {}}>

                                {/* Card header */}
                                <div className="px-4 py-3 text-white flex items-center justify-between"
                                    style={{ backgroundColor: tpl.color }}>
                                    <div>
                                        <h3 className="font-black text-sm leading-none">{tpl.title}</h3>
                                        <p className="text-[9px] opacity-75 font-semibold mt-1 uppercase tracking-widest">{tpl.badge}</p>
                                    </div>
                                    {isSelected && (
                                        <div className="flex items-center gap-1 bg-white/90 rounded-full px-2 py-1">
                                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                            <span className="text-[9px] font-black text-slate-700">Active</span>
                                        </div>
                                    )}
                                </div>

                                {/* Preview */}
                                <div className="flex-1 p-3 bg-slate-50/50 border-y border-slate-100 overflow-hidden">
                                    <div className="scale-95 origin-top-left" style={{ maxHeight: "200px", overflow: "hidden" }}>
                                        {tpl.preview}
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="p-4">
                                    <p className="text-[10px] text-slate-500 font-medium leading-relaxed mb-3">{tpl.desc}</p>
                                    <button
                                        onClick={() => !isSelected && saveMut.mutate(tpl.id)}
                                        disabled={isSelected || isPending}
                                        className={`w-full h-9 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                                            isSelected
                                                ? "border-2 cursor-default"
                                                : "text-white shadow-sm hover:opacity-90"
                                        }`}
                                        style={isSelected
                                            ? { borderColor: tpl.color, color: tpl.color }
                                            : { backgroundColor: tpl.color }
                                        }>
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
