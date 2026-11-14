/**
 * Exams → Printouts: the printable documents (full HTML pages) for the merit list, the
 * analysis report and transcripts. The same HTML is shown in the on-screen preview and sent
 * to print / PDF (lib/pdfDoc), so what you see is what prints.
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- renders the loosely-shaped report JSON from /exam-printouts */
import type { SchoolBrand } from "@/lib/printDoc";

export const esc = (v: unknown) => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
export const nkey = (v: unknown) => String(v ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const n = (v: unknown, d = 2) => (v === null || v === undefined || v === "" || Number.isNaN(Number(v)) ? "–" : String(Math.round(Number(v) * 10 ** d) / 10 ** d));
const dev = (v: unknown, d = 2) => (v === null || v === undefined ? "–" : `${Number(v) > 0 ? "+" : ""}${n(v, d)}`);

const INK = "#1e1b4b", RULE = "#c7c9d9", HEAD = "#eef0f8", ACC = "#0f766e";

function page(title: string, body: string, opts: { landscape?: boolean; mono?: boolean } = {}) {
    const ink = opts.mono ? "#111" : INK;
    const head = opts.mono ? "#f2f2f2" : HEAD;
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>
@page{size:A4 ${opts.landscape ? "landscape" : "portrait"};margin:10mm}
*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{font-family:"Segoe UI",Arial,Helvetica,sans-serif;color:#111827;margin:0;font-size:11px}
.sheet{padding:6px 2px}
.hd{display:flex;align-items:center;gap:14px;padding-bottom:8px;border-bottom:2px solid ${ink}}
.hd img{height:58px;width:58px;object-fit:contain}
.hd h1{margin:0;font-size:18px;letter-spacing:.5px;color:${ink};text-transform:uppercase}
.hd .c{font-size:10.5px;color:#374151;margin-top:2px}
.band{margin:8px 0 10px;padding:6px 12px;font-weight:800;font-size:12px;letter-spacing:.4px;text-transform:uppercase;color:#fff;background:${ink};border-left:6px solid ${opts.mono ? "#555" : ACC};border-radius:0 14px 14px 0}
h2{font-size:12px;text-transform:uppercase;letter-spacing:.4px;margin:14px 0 6px;padding:5px 8px;background:${head};color:${ink};border-left:4px solid ${opts.mono ? "#555" : ACC}}
h3{font-size:11px;margin:10px 0 4px;color:${ink}}
table{width:100%;border-collapse:collapse;margin-bottom:8px}
th,td{border:1px solid ${opts.mono ? "#9ca3af" : RULE};padding:3px 4px;text-align:left;vertical-align:middle}
th{background:${head};color:${ink};font-size:9.5px;text-transform:uppercase;font-weight:800}
td{font-size:10.5px}
td.c,th.c{text-align:center}
tr.tot td{font-weight:800;background:#fafafa}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;align-items:start}
.kpi{border:1px solid ${RULE};border-radius:8px;padding:8px;text-align:center}
.kpi b{display:block;font-size:18px;color:${ink}}
.kpi span{font-size:9.5px;text-transform:uppercase;color:#6b7280;font-weight:700}
.muted{color:#6b7280}
.pb{page-break-after:always;break-after:page}
.dense th,.dense td{font-size:8.6px;padding:2px 3px;white-space:nowrap}
.dense td.nm{white-space:normal;min-width:90px}
svg{max-width:100%;height:auto}
.ft{margin-top:10px;font-size:9px;color:#6b7280;display:flex;justify-content:space-between}
svg text{font-family:Arial,sans-serif}
</style></head><body>${body}</body></html>`;
}

function letterhead(school: SchoolBrand, title: string) {
    const contacts = [school.phone && `Phone: ${school.phone}`, school.email && `Email: ${school.email}`, school.address].filter(Boolean).map(esc).join(" &nbsp;·&nbsp; ");
    return `<div class="hd">${school.logo ? `<img src="${esc(school.logo)}" alt="">` : ""}<div><h1>${esc(school.name)}</h1><div class="c">${contacts}</div></div></div><div class="band">${esc(title)}</div>`;
}
const footer = () => `<div class="ft"><span>Printed ${esc(new Date().toLocaleString("en-GB"))}</span><span>ShuleCloud School System · shulecloud.com</span></div>`;

// ── small SVG charts ─────────────────────────────────────────────────────────────
function lineChart(points: { label: string; value: number }[], opts: { w?: number; h?: number; yLabel?: string; color?: string } = {}) {
    const w = opts.w ?? 360, h = opts.h ?? 170, pl = 34, pb = 26, pt = 10, pr = 10;
    if (!points.length) return "";
    const max = Math.max(1, ...points.map(p => p.value)) * 1.1;
    const x = (i: number) => pl + (points.length === 1 ? (w - pl - pr) / 2 : (i * (w - pl - pr)) / (points.length - 1));
    const y = (v: number) => pt + (h - pt - pb) * (1 - v / max);
    const ticks = [0, 0.25, 0.5, 0.75, 1].map(f => max * f);
    const path = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
    const area = `${path} L${x(points.length - 1).toFixed(1)},${(h - pb).toFixed(1)} L${x(0).toFixed(1)},${(h - pb).toFixed(1)} Z`;
    const col = opts.color || ACC;
    return `<svg width="100%" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
${ticks.map(t => `<line x1="${pl}" x2="${w - pr}" y1="${y(t)}" y2="${y(t)}" stroke="#e5e7eb"/><text x="${pl - 4}" y="${y(t) + 3}" font-size="8" text-anchor="end" fill="#6b7280">${n(t, 1)}</text>`).join("")}
<path d="${area}" fill="${col}" opacity=".12"/><path d="${path}" fill="none" stroke="${col}" stroke-width="2"/>
${points.map((p, i) => `<circle cx="${x(i)}" cy="${y(p.value)}" r="2.6" fill="${col}"/><text x="${x(i)}" y="${h - pb + 12}" font-size="8" text-anchor="middle" fill="#374151">${esc(p.label)}</text>`).join("")}
${opts.yLabel ? `<text x="9" y="${h / 2}" font-size="8" fill="#6b7280" transform="rotate(-90 9 ${h / 2})" text-anchor="middle">${esc(opts.yLabel)}</text>` : ""}
</svg>`;
}
function barChart(points: { label: string; value: number }[], opts: { w?: number; h?: number; yLabel?: string } = {}) {
    const w = opts.w ?? 360, h = opts.h ?? 170, pl = 30, pb = 26, pt = 10, pr = 6;
    if (!points.length) return "";
    const max = Math.max(1, ...points.map(p => p.value)) * 1.15;
    const bw = (w - pl - pr) / points.length;
    const y = (v: number) => pt + (h - pt - pb) * (1 - v / max);
    return `<svg width="100%" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
${[0, 0.5, 1].map(f => `<line x1="${pl}" x2="${w - pr}" y1="${y(max * f)}" y2="${y(max * f)}" stroke="#e5e7eb"/><text x="${pl - 4}" y="${y(max * f) + 3}" font-size="8" text-anchor="end" fill="#6b7280">${Math.round(max * f)}</text>`).join("")}
${points.map((p, i) => `<rect x="${pl + i * bw + bw * 0.18}" y="${y(p.value)}" width="${bw * 0.64}" height="${h - pb - y(p.value)}" rx="2" fill="${INK}" opacity=".85"/>${p.value ? `<text x="${pl + i * bw + bw / 2}" y="${y(p.value) - 2}" font-size="7.5" text-anchor="middle" fill="#111">${p.value}</text>` : ""}<text x="${pl + i * bw + bw / 2}" y="${h - pb + 11}" font-size="8" text-anchor="middle" fill="#374151">${esc(p.label)}</text>`).join("")}
${opts.yLabel ? `<text x="8" y="${h / 2}" font-size="8" fill="#6b7280" transform="rotate(-90 8 ${h / 2})" text-anchor="middle">${esc(opts.yLabel)}</text>` : ""}
</svg>`;
}

// ── shared table builders ────────────────────────────────────────────────────────
function gradeTable(first: string, rows: any[], grades: string[], extra: { teacher?: boolean; tsc?: boolean; dev?: boolean } = {}) {
    return `<table class="dense"><thead><tr><th>${esc(first)}</th>${grades.map(g => `<th class="c">${esc(g)}</th>`).join("")}<th class="c">Entries</th><th class="c">Mean marks</th>${extra.dev ? `<th class="c">MM dev</th>` : ""}<th class="c">Mean points</th>${extra.dev ? `<th class="c">MP dev</th>` : ""}<th class="c">Grade</th>${extra.teacher ? `<th>Teacher</th>` : ""}${extra.tsc ? `<th>TSC No</th>` : ""}</tr></thead><tbody>
${rows.map(r => `<tr class="${r.stream === "" ? "tot" : ""}"><td class="nm">${esc(r.label)}</td>${grades.map(g => `<td class="c">${r.counts?.[g] ?? 0}</td>`).join("")}<td class="c">${r.entries}</td><td class="c">${n(r.meanMarks, 1)}</td>${extra.dev ? `<td class="c">${dev(r.mmDev)}</td>` : ""}<td class="c">${n(r.meanPoints, 4)}</td>${extra.dev ? `<td class="c">${dev(r.mpDev, 4)}</td>` : ""}<td class="c"><b>${esc(r.grade)}</b></td>${extra.teacher ? `<td class="nm">${esc(r.teacher?.name || r.classTeacher?.name || (r.stream === "" ? "–" : ""))}</td>` : ""}${extra.tsc ? `<td>${esc(r.teacher?.tsc || r.classTeacher?.tsc || (r.stream === "" ? "–" : ""))}</td>` : ""}</tr>`).join("")}
</tbody></table>`;
}
function topTable(list: any[], subject: boolean, gender: "" | "boys" | "girls") {
    if (!list.length) return `<p class="muted">None.</p>`;
    const sr = (r: any) => (gender ? r.genderStreamRank : r.streamRank), or = (r: any) => (gender ? r.genderOverallRank : r.overallRank);
    const suff = gender ? ` ${gender}` : "";
    return `<table class="dense"><thead><tr><th>Adm No</th><th>Name</th><th class="c">Stream</th><th class="c">Strm rank</th><th class="c">Ovrl rank</th>${subject ? `<th class="c">Score</th>` : `<th class="c">Mean marks</th><th class="c">Dev</th><th class="c">Total marks</th><th class="c">Total points</th>`}<th class="c">Grade</th><th class="c">Gender</th></tr></thead><tbody>
${list.map(r => `<tr><td>${esc(r.adm)}</td><td>${esc(r.name)}</td><td class="c">${esc(r.stream)}</td><td class="c">${esc(sr(r))}${suff}</td><td class="c">${esc(or(r))}${suff}</td>${subject ? `<td class="c">${esc(r.score)}</td>` : `<td class="c">${n(r.meanMarks, 1)}</td><td class="c">${dev(r.dev, 2)}</td><td class="c">${esc(r.totalMarks)}</td><td class="c">${esc(r.totalPoints)}</td>`}<td class="c"><b>${esc(r.grade)}</b></td><td class="c">${esc(r.gender)}</td></tr>`).join("")}
</tbody></table>`;
}

// ── Merit list ───────────────────────────────────────────────────────────────────
export interface MeritOpts { section: "ranking" | "breakdown" | "summary" | "all"; gender: "all" | "Male" | "Female"; stream: string; cols: { upi: boolean; stream: boolean; kcpe: boolean; gender: boolean } }

export function filteredStudents(r: any, o: Pick<MeritOpts, "gender" | "stream">) {
    return (r?.students || []).filter((s: any) => (o.gender === "all" || s.gender === o.gender) && (!o.stream || s.stream === o.stream));
}

export function meritHtml(school: SchoolBrand, r: any, o: MeritOpts) {
    const title = `${r.level}${o.stream ? ` ${o.stream}` : ""} — ${r.exam.title}: Merit list`;
    const list = filteredStudents(r, o);
    const ranking = `<h2>Student ranking${o.gender !== "all" ? ` — ${o.gender === "Male" ? "boys" : "girls"}` : ""} (${list.length})</h2>
<table class="dense"><thead><tr><th class="c">#</th><th>Adm</th><th>Student</th>${o.cols.upi ? "<th>UPI</th>" : ""}${o.cols.gender ? `<th class="c">Sex</th>` : ""}${o.cols.stream ? `<th class="c">Str</th>` : ""}${o.cols.kcpe ? `<th class="c">KCPE</th>` : ""}
${r.subjects.map((s: any) => `<th class="c" title="${esc(s.name)}">${esc(s.short)}</th>`).join("")}<th class="c">Sbj</th><th class="c">TT mks</th><th class="c">Mn mks</th><th class="c">Dev</th><th class="c">Gr</th><th class="c">TT pts</th><th class="c">Mn pts</th><th class="c">Str pos</th><th class="c">Ovr pos</th></tr></thead><tbody>
${list.map((s: any, i: number) => `<tr><td class="c">${i + 1}</td><td>${esc(s.adm)}</td><td class="nm"><b>${esc(s.name)}</b></td>${o.cols.upi ? `<td>${esc(s.upi)}</td>` : ""}${o.cols.gender ? `<td class="c">${esc((s.gender || "").charAt(0))}</td>` : ""}${o.cols.stream ? `<td class="c">${esc(s.stream)}</td>` : ""}${o.cols.kcpe ? `<td class="c">${esc(s.kcpe ?? "")}</td>` : ""}
${r.subjects.map((sub: any) => { const x = s.subjects[nkey(sub.name)]; return `<td class="c">${x ? `${esc(x.marks)} <span class="muted">${esc(x.grade)}</span>` : ""}</td>`; }).join("")}<td class="c">${s.subjectCount}</td><td class="c">${esc(s.totalMarks)}</td><td class="c">${n(s.meanMarks)}</td><td class="c">${dev(s.dev, 3)}</td><td class="c"><b>${esc(s.meanGrade)}</b></td><td class="c">${esc(s.totalPoints)}</td><td class="c">${n(s.meanPoints, 3)}</td><td class="c">${s.streamPos ?? ""}</td><td class="c">${s.overallPos ?? ""}</td></tr>`).join("")}
</tbody></table>`;
    const breakdown = `<h2>Grade breakdown by stream</h2>${gradeTable("Form / stream", r.breakdown.streams, r.grades, { dev: true, teacher: true })}<h3>By gender</h3>${gradeTable("Gender", r.breakdown.gender, r.grades, { dev: true })}`;
    const summary = `<h2>Class grade summary by subject</h2>${gradeTable("Subject", [{ ...r.breakdown.streams[r.breakdown.streams.length - 1], label: `${r.level} (overall)` }, ...r.subjectSummary.map((s: any) => ({ ...s, label: s.name, stream: "x", teacher: { name: s.teachers } }))], r.grades, { dev: true, teacher: true })}`;
    const body = o.section === "ranking" ? ranking : o.section === "breakdown" ? breakdown : o.section === "summary" ? summary : `${ranking}${breakdown}${summary}`;
    return page(title, `<div class="sheet">${letterhead(school, title)}${r.previousExam ? `<p class="muted">Dev = change in mean points since ${esc(r.previousExam.title)}. Ranked by ${r.rankBy === "marks" ? "total marks" : "mean points"}.</p>` : ""}${body}${footer()}</div>`, { landscape: o.section !== "breakdown" });
}

// ── Analysis report ──────────────────────────────────────────────────────────────
export function analysisHtml(school: SchoolBrand, r: any, opts: { stream: string; topN?: number }) {
    const title = `${r.level}${opts.stream ? ` ${opts.stream}` : ""} — ${r.exam.title}`;
    const inScope = (x: any) => !opts.stream || x.stream === opts.stream;
    const s = r.summary;
    const head = `<div class="grid">
  <div><div class="grid" style="grid-template-columns:1fr 1fr;gap:6px">
    <div class="kpi"><span>Mean marks</span><b>${n(s.meanMarks, 1)}</b><span>${dev(s.mmDev)}</span></div>
    <div class="kpi"><span>Mean points</span><b>${n(s.meanPoints, 4)}</b><span>${dev(s.mpDev, 4)}</span></div>
    <div class="kpi"><span>Mean grade</span><b>${esc(s.grade)}</b></div>
    <div class="kpi"><span>Sat the exam</span><b>${s.entries}</b><span>students</span></div>
  </div></div>
  <div><h3 style="margin-top:0">Performance of ${esc(r.level)} streams (mean points)</h3>${lineChart(s.streamMeans.map((x: any) => ({ label: x.stream, value: x.meanPoints })), { h: 150 })}</div>
  <div><h3 style="margin-top:0">Overall grade distribution</h3>${barChart(r.grades.map((g: string) => ({ label: g, value: r.breakdown.streams[r.breakdown.streams.length - 1].counts?.[g] || 0 })), { h: 150, yLabel: "Students" })}</div>
</div>`;
    const subjStats = `<h2>Subject statistics</h2><table><thead><tr><th>Subject</th><th class="c">Mean points</th><th class="c">Change</th><th class="c">Trend</th><th class="c">Mean marks</th><th class="c">Mean grade</th><th>Teacher(s)</th></tr></thead><tbody>
${r.subjectSummary.map((x: any) => `<tr><td>${esc(x.name)}</td><td class="c">${n(x.meanPoints, 4)}</td><td class="c">${dev(x.mpDev, 4)}</td><td class="c">${x.mpDev == null ? "–" : x.mpDev > 0 ? "▲" : x.mpDev < 0 ? "▼" : "▶"}</td><td class="c">${n(x.meanMarks, 1)}</td><td class="c"><b>${esc(x.grade)}</b></td><td>${esc(x.teachers || "")}</td></tr>`).join("")}
</tbody></table>`;
    const means = `<div class="grid" style="grid-template-columns:1fr 1fr"><div><h2>Class subject means</h2>${lineChart(r.subjectSummary.map((x: any) => ({ label: x.short, value: x.meanPoints })), { yLabel: "Points" })}</div><div><h2>Subject mean marks</h2>${barChart(r.subjectSummary.map((x: any) => ({ label: x.short, value: Math.round(x.meanMarks) })), { yLabel: "%" })}</div></div>`;
    const classSummary = `<h2>Class grade summary</h2>${gradeTable("Subject", [{ ...r.breakdown.streams[r.breakdown.streams.length - 1], label: `${r.level} (overall)` }, ...r.subjectSummary.map((x: any) => ({ ...x, label: x.name, stream: "x", teacher: { name: x.teachers } }))], r.grades, { dev: true, teacher: true })}`;
    const filt = (list: any[]) => list.filter(inScope);
    const overall = `<h2>Overall</h2><h3>Grade summary — overall</h3>${gradeTable("Form", r.breakdown.streams, r.grades, { dev: true, teacher: true, tsc: true })}${gradeTable("Gender", r.breakdown.gender, r.grades, { dev: true })}
<h3>Top overall</h3>${topTable(filt(r.top.overall), false, "")}<h3>Top boys</h3>${topTable(filt(r.top.boys), false, "boys")}<h3>Top girls</h3>${topTable(filt(r.top.girls), false, "girls")}`;
    const perSubject = r.perSubject.map((p: any) => `<h2>${esc(p.name)}</h2><h3>Grade summary — ${esc(p.name)}</h3>${gradeTable("Form", p.streams, r.grades, { dev: true, teacher: true, tsc: true })}${gradeTable("Gender", p.gender, r.grades)}
<h3>Top overall — ${esc(p.name)}</h3>${topTable(filt(p.top.overall), true, "")}<h3>Top boys — ${esc(p.name)}</h3>${topTable(filt(p.top.boys), true, "boys")}<h3>Top girls — ${esc(p.name)}</h3>${topTable(filt(p.top.girls), true, "girls")}`).join("");
    return page(title, `<div class="sheet">${letterhead(school, title)}${head}${subjStats}${means}${classSummary}${overall}${perSubject}${footer()}</div>`, { landscape: true });
}

// ── Transcripts (school report format: black & white A4, comments, signature, stamp, QR) ──
export interface TranscriptOpts { showMarks: boolean; showRank: boolean; showGender: boolean; remarksDos: boolean; remarksPrincipal: boolean; signatures: boolean }

export function transcriptsHtml(school: SchoolBrand, data: any, o: TranscriptOpts, qrs: Record<string, string>) {
    const pages = (data.students || []).map((s: any, idx: number) => {
        const cols = s.columns as any[];
        // header groups: class level → its terms
        const groups: { level: string; span: number }[] = [];
        cols.forEach(c => { const last = groups[groups.length - 1]; if (last && last.level === c.level) last.span++; else groups.push({ level: c.level || "", span: 1 }); });
        const colLabel = (c: any) => (data.mode === "all" ? `${esc(c.term)}<br><span style="font-weight:600;text-transform:none">${esc(c.exam.replace(/^.*?(term\s*\d+)\s*/i, "").replace(/\(\d{4}\)$/, ""))}</span>` : `${esc(c.term || c.exam)}`);
        const cell = (c: any, sub: string) => { const x = c.subjects[nkey(sub)]; return x ? (o.showMarks ? `${n(x.pct, 0)}% ${esc(x.grade)}` : esc(x.grade)) : "–"; };
        const rows = [
            ...s.subjects.map((sub: string) => `<tr><td>${esc(sub)}</td>${cols.map(c => `<td class="c">${cell(c, sub)}</td>`).join("")}</tr>`),
            `<tr class="tot"><td>MEAN MARKS</td>${cols.map(c => `<td class="c">${n(c.meanMarks, 2)}%</td>`).join("")}</tr>`,
            o.showMarks ? `<tr class="tot"><td>TOTAL MARKS</td>${cols.map(c => `<td class="c">${esc(c.totalMarks)} / ${esc(c.totalMax)}</td>`).join("")}</tr>` : "",
            o.showMarks ? `<tr class="tot"><td>TOTAL POINTS</td>${cols.map(c => `<td class="c">${esc(c.totalPoints)} / ${esc(c.totalPointsMax)}</td>`).join("")}</tr>` : "",
            o.showRank ? `<tr class="tot"><td>OVERALL RANK</td>${cols.map(c => `<td class="c">${c.rank ?? "–"} / ${c.rankOf}</td>`).join("")}</tr>` : "",
            `<tr class="tot"><td>OVERALL GRADE</td>${cols.map(c => `<td class="c">${esc(c.grade)}</td>`).join("")}</tr>`,
        ].join("");
        const box = (label: string, signer?: boolean) => `<div style="border:1px solid #111;border-radius:6px;padding:6px 8px;min-height:92px;position:relative">
  <div style="font-weight:800;font-size:10.5px;margin-bottom:6px">${esc(label)}</div>
  <div style="border-bottom:1px dotted #555;height:16px"></div><div style="border-bottom:1px dotted #555;height:16px"></div>
  <div style="margin-top:8px;font-size:10px;display:flex;align-items:flex-end;gap:6px">Signature: ${signer && o.signatures && school.signature ? `<img src="${esc(school.signature)}" style="height:30px;max-width:120px;object-fit:contain">` : `<span style="flex:1;border-bottom:1px dotted #555;height:12px;display:inline-block;min-width:90px"></span>`}</div>
  ${signer && o.signatures && school.stamp ? `<img src="${esc(school.stamp)}" style="position:absolute;right:8px;bottom:6px;height:70px;opacity:.85">` : ""}
</div>`;
        const remarks = [o.remarksDos ? box("Dean of Studies remarks") : "", o.remarksPrincipal ? box(`${school.signerTitle || "Principal"} remarks${school.signerName ? `: ${school.signerName}` : ""}`, true) : ""].filter(Boolean);
        return `<div class="sheet ${idx < data.students.length - 1 ? "pb" : ""}">
${letterhead(school, "Academic transcript")}
<div style="display:flex;gap:12px;align-items:flex-start;margin-bottom:8px">
  <div style="width:84px;height:96px;border:1px solid #111;display:flex;align-items:center;justify-content:center;overflow:hidden">${s.photo ? `<img src="${esc(s.photo)}" style="width:100%;height:100%;object-fit:cover">` : `<span class="muted" style="font-size:9px">Photo</span>`}</div>
  <div style="font-size:11.5px;line-height:1.6"><div style="font-size:15px;font-weight:800">${esc(s.name)}</div><div><b>ADM NO:</b> ${esc(s.adm)}</div><div><b>CLASS:</b> ${esc(s.className)}${s.stream && !String(s.className).includes(s.stream) ? ` ${esc(s.stream)}` : ""}</div>${o.showGender && s.gender ? `<div><b>GENDER:</b> ${esc(s.gender)}</div>` : ""}</div>
</div>
<table><thead><tr><th rowspan="2" style="width:32%">Subject</th>${groups.map(g => `<th class="c" colspan="${g.span}">${esc(g.level || "")}</th>`).join("")}</tr><tr>${cols.map(c => `<th class="c">${colLabel(c)}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table>
${remarks.length ? `<div style="display:grid;grid-template-columns:repeat(${remarks.length},1fr);gap:10px;margin-top:10px">${remarks.join("")}</div>` : ""}
<div style="text-align:center;margin-top:10px;font-size:9px;color:#374151">${qrs[s.studentId] ? `<img src="${qrs[s.studentId]}" style="width:22mm;height:22mm;display:block;margin:0 auto 2px">Scan to verify this transcript · ` : ""}ShuleCloud School System | www.shulecloud.com</div>
</div>`;
    }).join("");
    return page(`Transcripts — ${data.level}${data.stream ? ` ${data.stream}` : ""}`, pages || `<p>No students with published results.</p>`, { mono: true });
}
