/** Print layouts for skill-based reports (A4 portrait). One page per learner; every page carries a QR that verifies it online. */
export interface ScaleDef { label: string; ratings: { code: string; label: string; short: string }[] }
export interface SkillReport {
    student: { _id: string; name: string; regNo: string; className: string; gender?: string };
    subjects: { subject: string; areas: { area: string; scale: string; skills: { id: string; name: string; ratings: Record<string, string> }[] }[] }[];
}
export interface SkillPrint {
    reports: SkillReport[]; scales: Record<string, ScaleDef>; template: string; theme: string; term: string; year: string; terms: string[];
    school: { name: string; logo?: string; address?: string }; qr: Record<string, string>; title: string;
    signatories: { title: string }[]; showComment: boolean;
}

export const SKILL_TEMPLATES = [
    { key: "checklist", label: "Skill checklist", note: "Ticks under Mastered / Progressing / Beginning (or the scale you chose) for one term", perTerm: true },
    { key: "bars", label: "Progress bars", note: "Grade letter with a coloured bar for each term", perTerm: false },
    { key: "termly", label: "Termly grid", note: "All terms side by side — a full termly report", perTerm: false },
    { key: "two_col", label: "Compact two-column", note: "Fits more skills on a page, one term", perTerm: true },
];
export const SKILL_THEMES: Record<string, { label: string; head: string; sub: string; line: string }> = {
    blue: { label: "Blue", head: "#517cb5", sub: "#b9d3ee", line: "#1e293b" },
    teal: { label: "Teal", head: "#1a9db8", sub: "#bfe4ec", line: "#0f3d48" },
    orange: { label: "Orange", head: "#fb6a0a", sub: "#f5b48c", line: "#7c2d05" },
    maroon: { label: "Maroon", head: "#97767f", sub: "#d8cbcf", line: "#3f2a30" },
    red: { label: "Red", head: "#d34a4a", sub: "#e8d5d5", line: "#4a1414" },
};

const esc = (v: any) => String(v ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));

function header(p: SkillPrint, r: SkillReport, th: { head: string }) {
    return `
    <div class="top">${p.school.logo ? `<img class="lg" src="${esc(p.school.logo)}" alt=""/>` : ""}
      <div class="sn">${esc(p.school.name)}</div>${p.school.address ? `<div class="sa">${esc(p.school.address)}</div>` : ""}
      ${p.qr[r.student._id] ? `<img class="qr" src="${p.qr[r.student._id]}" alt="QR"/>` : ""}</div>
    <div class="ttl" style="background:${th.head}">${esc(p.title)}</div>
    <table class="who"><tr><td><b>Student Name :</b> ${esc(r.student.name)}</td><td><b>Reg No :</b> ${esc(r.student.regNo || "—")}</td></tr>
      <tr><td><b>Class :</b> ${esc(r.student.className || "—")}</td><td><b>${p.template === "termly" || p.template === "bars" ? "Year" : "Term"} :</b> ${p.template === "termly" || p.template === "bars" ? esc(p.year) : `${esc(p.term)} ${esc(p.year)}`}</td></tr></table>`;
}
function footer(p: SkillReport | any, sp: SkillPrint) {
    const sig = sp.signatories.filter(s => s.title);
    return `${sp.showComment ? `<div class="cm"><b>Class teacher's comments:</b><div class="cl"></div><div class="cl"></div></div>` : ""}
    <div class="sg">${sig.map(s => `<div><div class="sgl"></div>${esc(s.title)}</div>`).join("")}</div>
    <div class="ft"><span>${esc(p.student.name)}</span><span>${esc(sp.school.name)}</span></div>`;
}

// ── shared helpers ──
const scaleOf = (p: SkillPrint, key: string) => p.scales[key] || p.scales.mastery;
const rank = (p: SkillPrint, scale: string, code: string) => { const r = scaleOf(p, scale).ratings; const i = r.findIndex(x => x.code === code); return i < 0 ? -1 : i; };
const barColor = (i: number, n: number) => { const t = n <= 1 ? 0 : i / (n - 1); const hue = Math.round(125 - t * 125); return `hsl(${hue},85%,45%)`; };

function checklist(p: SkillPrint, r: SkillReport, th: any) {
    // one table per field of study, so each can have as many columns as its own scale needs
    return r.subjects.map(sub => `
      <div class="sub sbar" style="background:${th.head}">${esc(sub.subject)}</div>
      ${sub.areas.map(a => { const sc = scaleOf(p, a.scale).ratings; const w = (54 / sc.length).toFixed(2);
        return `<table class="grid fx"><colgroup><col style="width:46%">${sc.map(() => `<col style="width:${w}%">`).join("")}</colgroup>
        <tr class="ah" style="background:${th.head}"><td>${esc(a.area).toUpperCase()}</td>${sc.map(x => `<td class="c">${esc(x.short)}</td>`).join("")}</tr>
        ${a.skills.map(s => `<tr><td>${esc(s.name)}</td>${sc.map(x => `<td class="c tick">${s.ratings[p.term] === x.code ? "✓" : ""}</td>`).join("")}</tr>`).join("")}</table>`; }).join("")}`).join("");
}

function bars(p: SkillPrint, r: SkillReport, th: any) {
    return r.subjects.map(sub => `
      <table class="grid"><tr><td class="sub" style="background:${th.head}" colspan="${1 + p.terms.length}">${esc(sub.subject)}</td>${""}</tr>
      ${sub.areas.map(a => { const n = scaleOf(p, a.scale).ratings.length; return `
        <tr class="ah" style="background:${th.sub};color:#0f172a"><td>◉ ${esc(a.area).toUpperCase()}</td>${p.terms.map(t => `<td class="c">${esc(t)}</td>`).join("")}</tr>
        ${a.skills.map(s => `<tr><td>${esc(s.name)}</td>${p.terms.map(t => { const code = s.ratings[t]; const i = rank(p, a.scale, code); return `<td class="bar">${code ? `<span class="lt" style="color:${th.head}">${esc(code)}</span><span class="bw"><i style="width:${Math.round(((n - i) / n) * 100)}%;background:${barColor(i, n)}"></i></span>` : ""}</td>`; }).join("")}</tr>`).join("")}`; }).join("")}</table>`).join("");
}

function termly(p: SkillPrint, r: SkillReport, th: any) {
    return r.subjects.map(sub => `
      <table class="grid"><tr><td class="sub" style="background:${th.head}">${esc(sub.subject.toUpperCase())}</td>${p.terms.map(t => `<td class="sub c" style="background:${th.head}">${esc(t)}</td>`).join("")}</tr>
      ${sub.areas.map(a => `
        <tr class="ah" style="background:${th.sub};color:#0f172a"><td colspan="${1 + p.terms.length}">◉ ${esc(a.area).toUpperCase()}</td></tr>
        ${a.skills.map(s => `<tr><td>${esc(s.name)}</td>${p.terms.map(t => `<td class="c b">${esc(s.ratings[t])}</td>`).join("")}</tr>`).join("")}`).join("")}</table>`).join("");
}

function twoCol(p: SkillPrint, r: SkillReport, th: any) {
    const blocks = r.subjects.flatMap(sub => sub.areas.map(a => `
      <table class="grid half"><tr><td class="sub" style="background:${th.head}">${esc(sub.subject)} — ${esc(a.area)}</td><td class="sub c" style="background:${th.head}">${esc(p.term)}</td></tr>
      ${a.skills.map(s => { const lab = scaleOf(p, a.scale).ratings.find(x => x.code === s.ratings[p.term]); return `<tr><td>${esc(s.name)}</td><td class="c b">${esc(lab?.short || "")}</td></tr>`; }).join("")}</table>`));
    return `<div class="cols">${blocks.join("")}</div>`;
}

export function skillReportHtml(p: SkillPrint): string {
    const th = SKILL_THEMES[p.theme] || SKILL_THEMES.blue;
    const body = (r: SkillReport) => p.template === "bars" ? bars(p, r, th) : p.template === "termly" ? termly(p, r, th) : p.template === "two_col" ? twoCol(p, r, th) : checklist(p, r, th);
    const pages = p.reports.map(r => `<section class="pg">${header(p, r, th)}${r.subjects.length ? body(r) : `<p class="none">No skills have been set up for this learner's class yet.</p>`}${footer(r, p)}</section>`).join("");
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(p.title)}</title><style>
    @page{size:A4 portrait;margin:11mm}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    body{font-family:Arial,Helvetica,sans-serif;color:#111;font-size:11px;margin:0}
    .pg{page-break-after:always;position:relative;min-height:270mm;padding-bottom:26px}.pg:last-child{page-break-after:auto}
    .top{text-align:center;position:relative;padding-bottom:6px}.lg{height:62px;display:block;margin:0 auto 4px}.sn{font-size:20px;font-weight:800}.sa{font-size:11px;color:#444}
    .qr{position:absolute;right:0;top:0;width:74px;height:74px}
    .ttl{color:#fff;text-align:center;font-size:19px;font-weight:800;padding:5px;margin:6px 0 8px}
    .who{width:100%;border-collapse:collapse;margin-bottom:8px}.who td{padding:3px 6px;font-size:12px;width:50%}
    .grid{width:100%;border-collapse:collapse;margin-bottom:9px;page-break-inside:auto}.grid td{border:1px solid #222;padding:4px 6px;vertical-align:middle}
    .sub{color:#fff;font-weight:800;font-size:14px;text-align:center}.sbar{padding:5px;border:1px solid #222;border-bottom:0;margin-top:2px}.fx{table-layout:fixed;margin-bottom:6px}.ah td{color:inherit;font-weight:700;font-size:11px}.ah{color:#fff}.c{text-align:center;width:19%}.tick{font-size:15px;font-weight:700}.b{font-weight:800;font-size:13px}
    .bar{width:19%}.lt{font-weight:800;font-size:13px;display:inline-block;width:18px}.bw{display:inline-block;width:64%;height:11px;background:#eee;vertical-align:middle}.bw i{display:block;height:11px}
    .cols{columns:2;column-gap:10px}.half{break-inside:avoid;font-size:10px}.half .c{width:34%}
    .cm{margin-top:10px;font-size:11px}.cl{border-bottom:1px solid #666;height:20px}
    .sg{display:flex;justify-content:space-around;margin-top:26px;text-align:center;font-size:11px}.sg>div{width:30%}.sgl{border-top:1px solid #111;margin-bottom:3px}
    .ft{position:absolute;left:0;right:0;bottom:0;display:flex;justify-content:space-between;font-size:10px;color:#555}.none{text-align:center;color:#888;padding:30px}
    </style></head><body>${pages}<script>window.onload=()=>setTimeout(()=>window.print(),300)</script></body></html>`;
}
