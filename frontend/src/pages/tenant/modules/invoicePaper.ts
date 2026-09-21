import type { SchoolBrand } from "@/lib/printDoc";

export const esc = (v: any) => String(v ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
export const money = (n: any) => `KES ${(Number(n) || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const day = (v: any) => { if (!v) return "—"; const d = new Date(v); return isNaN(d.getTime()) ? String(v) : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); };

export interface Line { label: string; amount: number }
export interface InvoiceView {
    no: string; issued: any; due: any; status: string; period: string;
    studentName: string; regNo: string; className: string;
    guardian: { name: string; phone: string; email: string };
    lines: Line[]; total: number; paid: number; balance: number;
    payments: { date: any; method: string; ref: string; amount: number }[];
    bank: string;
}

/** The invoice as a finished A4 page: school details top-left, INVOICE + numbers top-right. */
export function invoiceHtml(v: InvoiceView, school: SchoolBrand, forPrint: boolean): string {
    const accent = "#1e3a8a";
    const contacts = [school.address, school.phone && `Tel: ${school.phone}`, school.email].filter(Boolean);
    const st = v.status;
    const stColor = st === "PAID" ? "#047857" : st === "PARTIAL" ? "#b45309" : "#b91c1c";
    const stBg = st === "PAID" ? "#d1fae5" : st === "PARTIAL" ? "#fef3c7" : "#fee2e2";
    const rows = v.lines.map((l, i) => `<tr><td class="c">${i + 1}</td><td>${esc(l.label)}</td><td class="r">${money(l.amount)}</td></tr>`).join("");
    const pays = v.payments.length ? `
      <div class="sec">Payments received</div>
      <table><thead><tr><th style="width:24%">Date</th><th style="width:26%">Method</th><th>Reference</th><th class="r" style="width:22%">Amount</th></tr></thead>
      <tbody>${v.payments.map(p => `<tr><td>${day(p.date)}</td><td>${esc(p.method || "—")}</td><td>${esc(p.ref || "—")}</td><td class="r">${money(p.amount)}</td></tr>`).join("")}</tbody></table>` : "";
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Invoice ${esc(v.no)}</title><style>
    @page{size:A4 portrait;margin:12mm}
    *{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    body{margin:0;font-family:'Segoe UI',Arial,Helvetica,sans-serif;color:#1f2937;font-size:12px;line-height:1.45;background:#fff}
    .pg{position:relative;width:100%;max-width:${forPrint ? "186mm" : "none"};margin:0 auto;padding:${forPrint ? "0" : "12mm"}}
    .top{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;padding-bottom:14px;border-bottom:3px solid ${accent}}
    .sch{display:flex;gap:14px;align-items:flex-start}.sch img{height:66px;width:auto;max-width:90px;object-fit:contain}
    .sch h1{margin:0 0 3px;font-size:19px;font-weight:800;color:#0f172a;text-transform:uppercase;letter-spacing:.3px;line-height:1.15}
    .sch p{margin:0;font-size:11.5px;color:#475569}
    .inv{text-align:right;min-width:190px}.inv h2{margin:0;font-size:30px;letter-spacing:3px;color:${accent};font-weight:800;line-height:1}
    .meta{margin-top:9px;font-size:11.5px}.meta div{display:flex;justify-content:space-between;gap:16px;padding:1.5px 0}.meta span{color:#64748b}.meta b{color:#0f172a}
    .badge{display:inline-block;margin-top:7px;padding:3px 12px;border-radius:99px;font-weight:800;font-size:11px;letter-spacing:1px;color:${stColor};background:${stBg}}
    .bill{display:flex;gap:26px;margin:20px 0 6px}.bill>div{flex:1}
    .lab{font-size:10px;font-weight:800;letter-spacing:1.4px;text-transform:uppercase;color:${accent};margin-bottom:5px}
    .bill p{margin:1px 0}.bill .nm{font-size:14px;font-weight:800;color:#0f172a}
    .sec{font-size:10px;font-weight:800;letter-spacing:1.4px;text-transform:uppercase;color:${accent};margin:20px 0 6px}
    table{width:100%;border-collapse:collapse}
    th{background:${accent};color:#fff;text-align:left;padding:8px 10px;font-size:10.5px;letter-spacing:.8px;text-transform:uppercase}
    td{padding:8px 10px;border-bottom:1px solid #e5e7eb}
    .c{text-align:center;width:38px;color:#64748b}.r{text-align:right}
    thead th.r{text-align:right}
    .tot{width:290px;margin:12px 0 0 auto}.tot div{display:flex;justify-content:space-between;padding:5px 10px;font-size:12.5px}
    .tot .bal{background:${accent};color:#fff;font-weight:800;font-size:14px;border-radius:4px;margin-top:4px;padding:8px 10px}
    .note{margin-top:22px;padding:11px 14px;background:#f8fafc;border-left:3px solid ${accent};font-size:11.5px;color:#475569}
    .note b{color:#0f172a}
    .sign{display:flex;justify-content:space-between;gap:40px;margin-top:46px}.sign div{flex:1;border-top:1px solid #111;padding-top:4px;text-align:center;font-size:11px;color:#475569}
    .ft{margin-top:26px;text-align:center;font-size:10.5px;color:#94a3b8;border-top:1px solid #e5e7eb;padding-top:8px}
    .stamp{position:absolute;right:14mm;top:118mm;transform:rotate(-14deg);border:4px solid #059669;color:#059669;font-weight:900;font-size:46px;letter-spacing:6px;padding:2px 22px;border-radius:8px;opacity:.16;pointer-events:none}
    </style></head><body><div class="pg">
      ${st === "PAID" ? `<div class="stamp">PAID</div>` : ""}
      <div class="top">
        <div class="sch">${school.logo ? `<img src="${esc(school.logo)}" alt=""/>` : ""}<div><h1>${esc(school.name)}</h1>${contacts.map(c => `<p>${esc(c)}</p>`).join("")}</div></div>
        <div class="inv"><h2>INVOICE</h2>
          <div class="meta"><div><span>Invoice No.</span><b>${esc(v.no)}</b></div><div><span>Date issued</span><b>${day(v.issued)}</b></div><div><span>Due date</span><b>${day(v.due)}</b></div>${v.period ? `<div><span>Period</span><b>${esc(v.period)}</b></div>` : ""}</div>
          <span class="badge">${esc(st)}</span></div>
      </div>
      <div class="bill">
        <div><div class="lab">Bill to</div><p class="nm">${esc(v.guardian.name || "Parent / Guardian")}</p>${v.guardian.phone ? `<p>Tel: ${esc(v.guardian.phone)}</p>` : ""}${v.guardian.email ? `<p>${esc(v.guardian.email)}</p>` : ""}</div>
        <div><div class="lab">Student</div><p class="nm">${esc(v.studentName)}</p><p>Adm. No: <b>${esc(v.regNo)}</b></p><p>Class: <b>${esc(v.className)}</b></p></div>
      </div>
      <div class="sec">Fee particulars</div>
      <table><thead><tr><th class="c" style="background:${accent};color:#fff">#</th><th>Description</th><th class="r">Amount</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="tot">
        <div><span>Total billed</span><b>${money(v.total)}</b></div>
        <div><span>Amount paid</span><b>${money(v.paid)}</b></div>
        <div class="bal"><span>Balance due</span><span>${money(v.balance)}</span></div>
      </div>
      ${pays}
      <div class="note"><b>Payment details.</b> ${v.bank ? `Bank: <b>${esc(v.bank)}</b>. ` : ""}Please quote the student's admission number <b>${esc(v.regNo)}</b> and invoice number <b>${esc(v.no)}</b> as the payment reference. Fees are payable by the due date shown above.</div>
      <div class="sign"><div>Prepared by</div><div>Authorised signature &amp; school stamp</div></div>
      <div class="ft">${esc(school.name)} · Thank you for your prompt payment</div>
    </div>${forPrint ? "<script>window.onload=()=>setTimeout(()=>window.print(),300)</script>" : ""}</body></html>`;
}

