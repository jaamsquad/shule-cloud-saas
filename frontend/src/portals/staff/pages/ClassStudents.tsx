import { useState } from "react";
import { useOutletContext, useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Printer, Search, Users } from "lucide-react";
import { PageTitle, PanelCard } from "../../PortalShell";
import { outputHtmlDoc } from "@/lib/pdfDoc";
import type { StaffCtx } from "../StaffLayout";

const esc = (v: any) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

/** The printed class list: school logo and name top-left, then the learners. */
function classListHtml(d: any, teacher: string, blanks: number) {
    const s = d.school || {};
    const contact = [s.address, s.phone, s.email].filter(Boolean).map(esc).join(" · ");
    const blankHead = Array.from({ length: blanks }, () => `<th class="blank"></th>`).join("");
    const blankCells = Array.from({ length: blanks }, () => `<td class="blank"></td>`).join("");
    const rows = (d.students || []).map((st: any, i: number) =>
        `<tr><td class="num">${i + 1}</td><td>${esc(st.admNo || "—")}</td><td class="name">${esc(st.name)}</td><td>${esc(st.gender || "—")}</td>${blankCells}</tr>`).join("");
    return `<!doctype html><html><head><meta charset="utf-8"><title>Class List - ${esc(d.className)}</title>
<style>
  @page { size: A4; margin: 14mm 12mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #1e293b; margin: 0; font-size: 12px; }
  .head { display: flex; align-items: center; gap: 14px; text-align: left; padding-bottom: 10px; border-bottom: 2px solid #1e293b; }
  .head img { width: 64px; height: 64px; object-fit: contain; }
  .school { font-size: 20px; font-weight: 800; text-transform: uppercase; letter-spacing: .3px; }
  .motto { font-size: 11px; font-style: italic; color: #475569; margin-top: 2px; }
  .contact { font-size: 10.5px; color: #475569; margin-top: 2px; }
  h2 { font-size: 15px; margin: 14px 0 4px; text-transform: uppercase; }
  .meta { display: flex; flex-wrap: wrap; gap: 6px 22px; font-size: 11.5px; color: #334155; margin-bottom: 10px; }
  .meta b { color: #0f172a; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #94a3b8; padding: 5px 7px; text-align: left; }
  th { background: #e2e8f0; font-size: 11px; text-transform: uppercase; }
  td.num { width: 34px; text-align: center; }
  td.name { font-weight: 600; }
  th.blank, td.blank { width: 44px; }
  tr:nth-child(even) td { background: #f8fafc; }
  .foot { margin-top: 18px; display: flex; justify-content: space-between; font-size: 11px; color: #475569; }
  @media print { tr { page-break-inside: avoid; } th { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style></head><body>
<div class="head">
  ${s.logo ? `<img src="${esc(s.logo)}" alt="">` : ""}
  <div>
    <div class="school">${esc(s.name || "School")}</div>
    ${s.motto ? `<div class="motto">${esc(s.motto)}</div>` : ""}
    ${contact ? `<div class="contact">${contact}</div>` : ""}
  </div>
</div>
<h2>Class List — ${esc(d.className)}</h2>
<div class="meta">
  ${d.subjects?.length ? `<span>Subject: <b>${esc(d.subjects.join(", "))}</b></span>` : ""}
  ${teacher ? `<span>Teacher: <b>${esc(teacher)}</b></span>` : ""}
  <span>Learners: <b>${(d.students || []).length}</b></span>
  <span>Printed: <b>${esc(new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }))}</b></span>
</div>
<table><thead><tr><th>#</th><th>Adm No</th><th>Student Name</th><th>Gender</th>${blankHead}</tr></thead>
<tbody>${rows || `<tr><td colspan="${4 + blanks}" style="text-align:center;padding:16px">No learners in this class</td></tr>`}</tbody></table>
<div class="foot"><span>Signature: ______________________</span><span>${esc(s.name || "")}</span></div>
<script>window.onload=function(){setTimeout(function(){window.print()},300)}</script>
</body></html>`;
}

export default function ClassStudents() {
    const { api, staff } = useOutletContext<StaffCtx>() as any;
    const { className = "" } = useParams();
    const navigate = useNavigate();
    const [q, setQ] = useState("");
    const [blanks, setBlanks] = useState(0);

    const { data, isLoading, error } = useQuery<any>({
        queryKey: ["staff_class_students", className],
        queryFn: async () => (await api.get("/staff-portal/my-classes/students", { params: { className } })).data,
        retry: false,
    });
    const students: any[] = data?.students || [];
    const shown = students.filter(s => !q || `${s.name} ${s.admNo}`.toLowerCase().includes(q.toLowerCase()));
    const teacher = staff?.name || staff?.employeeName || [staff?.firstName, staff?.lastName].filter(Boolean).join(" ") || "";

    const print = () => data && outputHtmlDoc(`Class List - ${data.className}`, classListHtml(data, teacher, blanks), { fileName: `Class_List_${data.className}` });

    return (
        <>
            <button type="button" onClick={() => navigate("/classes")} className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800">
                <ArrowLeft className="w-4 h-4" /> My Classes
            </button>
            <PageTitle title={data?.className || className} />
            <PanelCard
                title={`Class List${data?.subjects?.length ? ` · ${data.subjects.join(", ")}` : ""}`}
                action={data ? (
                    <button type="button" onClick={print} className="inline-flex items-center gap-1.5 bg-white/95 hover:bg-white text-slate-700 text-xs font-bold px-3 py-1.5 rounded">
                        <Printer className="w-4 h-4" /> Print
                    </button>
                ) : undefined}
            >
                {isLoading ? (
                    <div className="flex items-center gap-2 text-slate-400 text-sm py-8 justify-center"><Loader2 className="w-5 h-5 animate-spin" /> Loading…</div>
                ) : error ? (
                    <p className="text-center py-10 text-sm font-semibold text-rose-600">{(error as any)?.response?.data?.message || "Could not load this class."}</p>
                ) : (
                    <>
                        {data?.school && (
                            <div className="flex items-center gap-3 pb-4 mb-4 border-b border-black/10">
                                {data.school.logo && <img src={data.school.logo} alt="" className="w-12 h-12 object-contain" />}
                                <div className="min-w-0">
                                    <div className="font-extrabold uppercase text-slate-800 truncate">{data.school.name}</div>
                                    <div className="text-xs text-slate-500">{students.length} learner{students.length === 1 ? "" : "s"}</div>
                                </div>
                            </div>
                        )}
                        <div className="flex flex-col sm:flex-row gap-3 mb-4">
                            <div className="relative flex-1">
                                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name or admission no…"
                                    className="w-full h-10 pl-9 pr-3 border border-black/10 rounded-md text-sm outline-none focus:border-[#c4a35a]" />
                            </div>
                            <label className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                                Blank columns on print
                                <select value={blanks} onChange={e => setBlanks(Number(e.target.value))} className="h-10 px-2 border border-black/10 rounded-md text-sm bg-white">
                                    {[0, 1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n}</option>)}
                                </select>
                            </label>
                        </div>
                        {shown.length === 0 ? (
                            <div className="text-center py-10 text-slate-400">
                                <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
                                <p className="text-sm font-semibold">{students.length ? "No learner matches your search." : "No learners in this class yet."}</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-left text-slate-500 border-b border-black/10">
                                            <th className="py-2 w-10">#</th>
                                            <th className="py-2">Adm No</th>
                                            <th className="py-2">Student Name</th>
                                            <th className="py-2">Gender</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {shown.map((s, i) => (
                                            <tr key={s._id} className="border-b border-black/5 hover:bg-slate-50">
                                                <td className="py-2.5 text-slate-400">{i + 1}</td>
                                                <td className="py-2.5 text-slate-600">{s.admNo || "—"}</td>
                                                <td className="py-2.5 font-semibold text-slate-700">{s.name}</td>
                                                <td className="py-2.5 text-slate-600">{s.gender || "—"}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>
                )}
            </PanelCard>
        </>
    );
}
