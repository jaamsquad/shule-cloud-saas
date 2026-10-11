/**
 * Question-paper numbering and the printed paper (Question Paper → Create Paper).
 * Numbers are worked out here from the order of questions, so they are always in sequence
 * whatever is added, removed or reordered — never typed by hand.
 */

export type MainStyle = "1." | "1)" | "Q1." | "Question 1" | "I." | "A.";
export type PartStyle = "(a)" | "a)" | "a." | "(i)" | "i." | "(A)";
export type SubStyle = "(i)" | "i." | "(a)" | "a." | "•";
export type OptStyle = "A." | "(A)" | "(a)" | "a)";
export type MarksStyle = "(5 marks)" | "[5]" | "(5mks)" | "hidden";

export interface Numbering {
    main: MainStyle; part: PartStyle; sub: SubStyle; option: OptStyle; marks: MarksStyle;
    startAt: number;
    restartEachSection: boolean;   // Section B starts again at 1
    answerLines: boolean;          // writing lines under each question (by marks)
}
export const DEFAULT_NUMBERING: Numbering = { main: "1.", part: "(a)", sub: "(i)", option: "A.", marks: "(5 marks)", startAt: 1, restartEachSection: false, answerLines: false };

const ROMAN: [number, string][] = [[1000, "m"], [900, "cm"], [500, "d"], [400, "cd"], [100, "c"], [90, "xc"], [50, "l"], [40, "xl"], [10, "x"], [9, "ix"], [5, "v"], [4, "iv"], [1, "i"]];
export function roman(n: number): string { let out = ""; for (const [v, s] of ROMAN) while (n >= v) { out += s; n -= v; } return out; }
export function letter(n: number): string { let s = ""; n = Math.max(1, n); while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(97 + r) + s; n = Math.floor((n - 1) / 26); } return s; }

export function mainLabel(n: number, style: MainStyle): string {
    switch (style) {
        case "1)": return `${n})`;
        case "Q1.": return `Q${n}.`;
        case "Question 1": return `Question ${n}`;
        case "I.": return `${roman(n).toUpperCase()}.`;
        case "A.": return `${letter(n).toUpperCase()}.`;
        default: return `${n}.`;
    }
}
export function partLabel(i: number, style: PartStyle): string {   // i = 1-based
    switch (style) {
        case "a)": return `${letter(i)})`;
        case "a.": return `${letter(i)}.`;
        case "(i)": return `(${roman(i)})`;
        case "i.": return `${roman(i)}.`;
        case "(A)": return `(${letter(i).toUpperCase()})`;
        default: return `(${letter(i)})`;
    }
}
export function subLabel(i: number, style: SubStyle): string {
    switch (style) {
        case "i.": return `${roman(i)}.`;
        case "(a)": return `(${letter(i)})`;
        case "a.": return `${letter(i)}.`;
        case "•": return "•";
        default: return `(${roman(i)})`;
    }
}
export function optionLabel(i: number, style: OptStyle): string {
    const L = String.fromCharCode(64 + i);
    switch (style) {
        case "(A)": return `(${L})`;
        case "(a)": return `(${L.toLowerCase()})`;
        case "a)": return `${L.toLowerCase()})`;
        default: return `${L}.`;
    }
}
export function marksLabel(m: number | null | undefined, style: MarksStyle): string {
    if (m === null || m === undefined || style === "hidden") return "";
    if (style === "[5]") return `[${m}]`;
    if (style === "(5mks)") return `(${m}mk${m === 1 ? "" : "s"})`;
    return `(${m} mark${m === 1 ? "" : "s"})`;
}

export interface PaperPart { label?: string; text: string; marks: number | null; parts?: PaperPart[] }
export interface PaperQuestion { _id?: string; text: string; marks: number | null; type?: string; parts?: PaperPart[]; options?: { label?: string; text: string }[]; answer?: string; markingScheme?: string; images?: string[] }
export interface PaperSection { name: string; instructions?: string; questions: PaperQuestion[] }
export interface PaperHeader {
    school?: string; logo?: string; title?: string; subject?: string; className?: string; duration?: string; term?: string; date?: string; showCandidateFields?: boolean;
    /** One learner's own copy: name/admission no. are pre-filled instead of blank lines, and their
     * admission no. is woven into a faint watermark across the page (traces a leaked copy back to them). */
    studentName?: string; admNo?: string;
    /** Data-URL image — "scan to verify this paper with the school" (see lib/paperQr). */
    qr?: string;
}
export interface Paper { header: PaperHeader; rules: string[]; numbering: Numbering; sections: PaperSection[] }

/** Question numbers for every question, in order, following the numbering settings. */
export function questionNumbers(sections: PaperSection[], n: Numbering): number[][] {
    let k = n.startAt - 1;
    return sections.map(s => { if (n.restartEachSection) k = n.startAt - 1; return s.questions.map(() => ++k); });
}

export const questionMarks = (q: PaperQuestion): number => {
    const sum = (ps: PaperPart[] = []): number => ps.reduce((a, p) => a + (p.marks ?? sum(p.parts)), 0);
    return q.marks ?? sum(q.parts);
};
export const paperTotal = (sections: PaperSection[]) => sections.reduce((a, s) => a + s.questions.reduce((b, q) => b + (questionMarks(q) || 0), 0), 0);

const esc = (v: any) => String(v ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
const lines = (marks: number | null | undefined, on: boolean) => on ? `<div class="lines">${'<div class="ln"></div>'.repeat(Math.min(14, Math.max(2, Math.round((marks || 1) * 1.5))))}</div>` : "";

/** A faint tiled admission-no. watermark — a texture, not a stamp, so it isn't noticed at a glance,
 * but a leaked copy can still be traced back to the student it was printed for. */
function admNoWatermarkUrl(admNo: string): string {
    const t = esc(admNo);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="140">
      <text x="0" y="70" transform="rotate(-28 110 70)" font-family="Arial,sans-serif" font-size="18" fill="#000" fill-opacity="0.045" text-anchor="middle">${t}</text>
    </svg>`;
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** The paper as a full A4 document. withAnswers → the marking scheme.
 * copies, when given a non-empty list, prints one page per entry (each with its own
 * candidate details / QR / watermark) instead of the single generic page from p.header —
 * used to hand every student their own, individually traceable copy of the same paper. */
export function paperHtml(p: Paper, withAnswers = false, copies?: PaperHeader[]): string {
    const n = p.numbering;
    const nums = questionNumbers(p.sections, n);
    const total = paperTotal(p.sections);
    const h = p.header;
    const mk = (m: number | null | undefined) => { const t = marksLabel(m, n.marks); return t ? `<span class="mk">${t}</span>` : ""; };
    const renderParts = (ps: PaperPart[] = [], depth = 0): string => ps.map((pt, i) => `
        <div class="part d${depth}"><span class="pl">${depth === 0 ? partLabel(i + 1, n.part) : subLabel(i + 1, n.sub)}</span><div class="pt"><div class="row"><span>${esc(pt.text)}</span>${pt.marks != null ? mk(pt.marks) : ""}</div>
        ${pt.parts?.length ? renderParts(pt.parts, depth + 1) : (!withAnswers ? lines(pt.marks, n.answerLines) : "")}</div></div>`).join("");
    const body = p.sections.map((s, si) => `
        ${s.name ? `<h3 class="sec">${esc(s.name)}</h3>` : ""}${s.instructions ? `<p class="sec-ins">${esc(s.instructions)}</p>` : ""}
        ${s.questions.map((q, qi) => `
          <div class="q"><span class="ql">${mainLabel(nums[si][qi], n.main)}</span><div class="qt">
            <div class="row"><span>${esc(q.text)}</span>${!q.parts?.length ? mk(questionMarks(q)) : ""}</div>
            ${(q.images || []).map(src => `<img class="fig" src="${esc(src)}" alt=""/>`).join("")}
            ${q.options?.length ? `<div class="opts">${q.options.map((o, i) => `<div class="opt${withAnswers && q.answer && String(q.answer).trim().toUpperCase().startsWith(String.fromCharCode(65 + i)) ? " right" : ""}"><span>${optionLabel(i + 1, n.option)}</span> ${esc(o.text)}</div>`).join("")}</div>` : ""}
            ${renderParts(q.parts)}
            ${!q.parts?.length && !q.options?.length && !withAnswers ? lines(questionMarks(q), n.answerLines) : ""}
            ${withAnswers && (q.answer || q.markingScheme) ? `<div class="ans"><b>Answer:</b> ${esc(q.answer || "")}${q.markingScheme ? `<div>${esc(q.markingScheme).replace(/\n/g, "<br/>")}</div>` : ""}</div>` : ""}
            ${withAnswers && !q.answer && !q.markingScheme ? `<div class="ans muted">No answer saved for this question.</div>` : ""}
          </div></div>`).join("")}`).join("");
    const pageFor = (ph: PaperHeader): string => {
        const candFilled = !withAnswers && (ph.studentName || ph.admNo);
        const cand = ph.showCandidateFields !== false && !withAnswers ? `<table class="cand"><tr><td>Name: ${candFilled ? `<b>${esc(ph.studentName || "")}</b>` : "______________________________"}</td><td>Adm No: ${candFilled ? `<b>${esc(ph.admNo || "")}</b>` : "__________"}</td></tr><tr><td>Class: ${ph.className ? `<b>${esc(ph.className)}</b>` : "____________"}</td><td>Signature: __________</td></tr></table>` : "";
        const qr = !withAnswers && ph.qr ? `<div class="qr"><img src="${esc(ph.qr)}" alt=""/><span>Scan to verify</span></div>` : "";
        const wmLogo = ph.logo ? `<div class="wm wm-logo" style="background-image:url('${esc(ph.logo)}')"></div>` : "";
        const wmAdm = !withAnswers && ph.admNo ? `<div class="wm wm-adm" style="background-image:url('${admNoWatermarkUrl(ph.admNo)}')"></div>` : "";
        return `<div class="sheet">
      ${wmLogo}${wmAdm}
      <div class="head">${qr}${ph.logo ? `<img src="${esc(ph.logo)}" alt=""/>` : ""}<div class="school">${esc(ph.school || "")}</div>
        <div class="title">${esc(ph.title || "")}${withAnswers ? " — MARKING SCHEME" : ""}</div>
        <div class="meta"><span>${esc([ph.subject, ph.className].filter(Boolean).join(" · "))}</span><span>${esc(ph.term || "")}</span><span>${ph.duration ? `Time: ${esc(ph.duration)}` : ""}</span></div></div>
      ${cand}
      ${p.rules.length && !withAnswers ? `<div class="rules"><h4>Instructions to candidates</h4><ol>${p.rules.map(r => `<li>${esc(r)}</li>`).join("")}</ol></div>` : ""}
      <div class="meta" style="margin-bottom:6px"><span></span><span>Total: ${total} marks</span></div>
      ${body}
      <div class="foot">${withAnswers ? "End of marking scheme" : "— End of paper —"}</div>
    </div>`;
    };
    const pages = copies && copies.length ? copies.map(pageFor).join("") : pageFor(h);
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(h.title || "Question paper")}</title><style>
      @page{size:A4;margin:16mm 15mm}
      body{font-family:"Times New Roman",Georgia,serif;color:#111;font-size:12.5pt;line-height:1.45;margin:0}
      .sheet{position:relative}.sheet + .sheet{page-break-before:always}
      .wm{position:absolute;inset:0;pointer-events:none;z-index:0}
      .wm-logo{background-repeat:no-repeat;background-position:center;background-size:55% auto;opacity:.05}
      .wm-adm{background-repeat:repeat;background-size:220px 140px}
      .head,.cand,.rules,.meta,.sec,.sec-ins,.q,.foot{position:relative;z-index:1}
      .head{text-align:center;border-bottom:2px solid #111;padding-bottom:8px;margin-bottom:10px}
      .head img{height:64px;margin-bottom:4px}
      .qr{position:absolute;top:0;right:0;text-align:center;font-size:7pt;line-height:1.2}
      .qr img{width:54px;height:54px;display:block;margin:0 auto}
      .school{font-size:17pt;font-weight:bold;text-transform:uppercase;letter-spacing:.5px}
      .title{font-size:13.5pt;font-weight:bold;margin-top:2px;text-transform:uppercase}
      .meta{display:flex;justify-content:space-between;font-weight:bold;margin-top:6px;font-size:11.5pt}
      .cand{width:100%;margin:8px 0 6px;font-size:11.5pt}.cand td{padding:4px 0}
      .rules{border:1px solid #111;padding:6px 12px;margin:8px 0 12px}.rules h4{margin:2px 0 4px;font-size:11.5pt;text-transform:uppercase}.rules ol{margin:0;padding-left:20px}
      .sec{text-align:center;text-transform:uppercase;font-size:12.5pt;margin:16px 0 4px;text-decoration:underline}
      .sec-ins{text-align:center;font-style:italic;margin:0 0 8px}
      .q{display:flex;gap:8px;margin:10px 0;page-break-inside:avoid}.ql{font-weight:bold;min-width:${n.main === "Question 1" ? "88px" : "30px"}}
      .qt{flex:1}.row{display:flex;justify-content:space-between;gap:12px}.mk{white-space:nowrap;font-weight:bold}
      .part{display:flex;gap:6px;margin:4px 0 4px 2px}.part.d1{margin-left:8px}.pl{min-width:28px}.pt{flex:1}
      .opts{display:grid;grid-template-columns:1fr 1fr;gap:2px 24px;margin:4px 0 0 4px}.opt.right{font-weight:bold;text-decoration:underline}
      .fig{max-width:70%;max-height:260px;display:block;margin:6px 0}
      .lines .ln{border-bottom:1px dotted #555;height:22px}
      .ans{margin-top:4px;padding:4px 8px;background:#f1f5f9;border-left:3px solid #2E7D32;font-size:11pt}.ans.muted{color:#94a3b8;border-color:#cbd5e1}
      .foot{text-align:center;font-size:10pt;margin-top:18px;color:#444}
    </style></head><body>
      ${pages}
    </body></html>`;
}
