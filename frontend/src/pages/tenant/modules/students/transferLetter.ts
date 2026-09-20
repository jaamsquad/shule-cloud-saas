import { outputHtmlDoc } from "@/lib/pdfDoc";
import type { SchoolBrand } from "@/lib/printDoc";

const esc = (v: any) => String(v ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));

/**
 * A date as "20 September 2026". Accepts ISO dates, Date strings and Excel serial numbers
 * (students imported from a spreadsheet by older versions kept dates like 46027.125…).
 */
export function displayDate(v: any): string {
    if (v === undefined || v === null || String(v).trim() === "") return "";
    const s = String(v).trim();
    let d: Date;
    if (/^\d{4,6}(\.\d+)?$/.test(s) && Number(s) > 20000 && Number(s) < 80000) d = new Date(Math.round((Number(s) - 25569) * 86400 * 1000));   // Excel serial
    else d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(s) ? `${s}T00:00:00` : s);
    return isNaN(d.getTime()) ? s : d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

export interface TransferInfo { refNo?: string; toSchool: string; date: string; reason?: string; status?: "draft" | "completed" }

/** Print (or save as PDF on mobile) the transfer letter: school letterhead, reference number, student details, receiving school. */
export function printTransferLetter(school: SchoolBrand, student: any, transfer: TransferInfo) {
    const name = student.studentName || `${student.firstName || ""} ${student.lastName || ""}`.trim() || "the student";
    const reg = student.registrationNo || student.admNo || "";
    // Once transferred their class is cleared, so the class they left is kept in statusPrevClass.
    const lastClass = student.studentClass || student.currentClass || student.statusPrevClass?.studentClass || student.statusPrevClass?.currentClass || "";
    const draft = transfer.status === "draft";
    const contacts = [school.address, school.phone && `Tel: ${school.phone}`, school.email].filter(Boolean).join("  ·  ");
    const rows: [string, string][] = [
        ["Name of student", name],
        ["Registration / Admission No.", reg],
        ["Gender", student.gender || ""],
        ["Date of birth", displayDate(student.dob)],
        ["Date of admission", displayDate(student.admissionDate)],
        ["Last class attended", lastClass],
        ["Date of transfer", displayDate(transfer.date)],
        ["Transferring to", transfer.toSchool],
    ];

    const html = `<!DOCTYPE html><html><head><title>Transfer Letter - ${esc(name)}</title>
    <style>
      @page{size:A4 portrait;margin:18mm}
      *{-webkit-print-color-adjust:exact;print-color-adjust:exact;box-sizing:border-box}
      body{font-family:'Times New Roman',Georgia,serif;color:#111;font-size:13.5px;line-height:1.55;margin:0;position:relative}
      .head{display:flex;align-items:center;gap:16px;border-bottom:3px double #1e293b;padding-bottom:12px;margin-bottom:18px}
      .head img{height:74px;width:auto;object-fit:contain}
      .head h1{margin:0;font-size:24px;text-transform:uppercase;letter-spacing:.5px}
      .head .sub{font-size:11.5px;color:#475569;margin-top:3px}
      .meta{display:flex;justify-content:space-between;margin-bottom:18px;font-weight:bold}
      .re{font-weight:bold;text-decoration:underline;text-transform:uppercase;margin:16px 0 12px}
      table{border-collapse:collapse;width:100%;margin:14px 0}
      td{border:1px solid #64748b;padding:6px 10px;font-size:13px}
      td.k{width:38%;background:#f1f5f9;font-weight:bold}
      .sign{margin-top:46px;display:flex;justify-content:space-between;align-items:flex-end}
      .line{border-top:1px solid #111;width:230px;padding-top:4px;font-size:12px}
      .stamp{width:120px;height:120px;border:1px dashed #94a3b8;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:11px;text-align:center}
      .foot{margin-top:28px;border-top:1px solid #cbd5e1;padding-top:6px;font-size:10.5px;color:#64748b;text-align:center}
      .wm{position:fixed;top:38%;left:0;right:0;text-align:center;font-size:120px;font-weight:bold;color:rgba(220,38,38,.12);transform:rotate(-24deg);letter-spacing:12px;pointer-events:none}
    </style></head><body>
      ${draft ? `<div class="wm">DRAFT</div>` : ""}
      <div class="head">
        ${school.logo ? `<img src="${esc(school.logo)}" alt=""/>` : ""}
        <div><h1>${esc(school.name)}</h1>${contacts ? `<div class="sub">${esc(contacts)}</div>` : ""}</div>
      </div>
      <div class="meta"><span>Ref: ${esc(transfer.refNo || "—")}</span><span>Date: ${esc(displayDate(new Date().toISOString().slice(0, 10)))}</span></div>

      <div>The Principal,<br/><b>${esc(transfer.toSchool)}</b></div>
      <p style="margin-top:14px">Dear Sir/Madam,</p>
      <div class="re">Re: Transfer of ${esc(name)}${reg ? ` — Reg. No. ${esc(reg)}` : ""}</div>

      <p>This is to confirm that <b>${esc(name)}</b>${reg ? ` (Registration No. <b>${esc(reg)}</b>)` : ""} was a student of <b>${esc(school.name)}</b>${lastClass ? `, last in <b>${esc(lastClass)}</b>` : ""}${student.admissionDate ? `, having been admitted on ${esc(displayDate(student.admissionDate))}` : ""}.</p>
      <p>The student is being transferred to your school with effect from <b>${esc(displayDate(transfer.date))}</b>${transfer.reason ? `. Reason for transfer: ${esc(transfer.reason)}` : ""}.</p>

      <table>${rows.filter(r => r[1]).map(([k, v]) => `<tr><td class="k">${esc(k)}</td><td>${esc(v)}</td></tr>`).join("")}</table>

      <p>Kindly admit the student and accept this letter as confirmation of the transfer. Should you need any further information, please contact the school${school.phone ? ` on ${esc(school.phone)}` : ""}${school.email ? ` or ${esc(school.email)}` : ""}.</p>

      <p style="margin-top:22px">Yours faithfully,</p>
      <div class="sign">
        <div class="line">Principal / Head Teacher<br/>${esc(school.name)}</div>
        <div class="stamp">School stamp</div>
      </div>
      <div class="foot">${esc(school.name)}${draft ? " — DRAFT: not valid until the transfer is confirmed" : ""}</div>
      <script>window.onload=()=>window.print()</script>
    </body></html>`;
    void outputHtmlDoc(`Transfer Letter - ${name}`, html, { fileName: `Transfer-Letter-${reg || name}` });
}
