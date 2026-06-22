// Professional invoice printout (matches the modern invoice template).
import { outputHtmlDoc } from "@/lib/pdfDoc";

interface InvoiceData {
    invoiceNo: string;
    date?: string;
    dueDate?: string;
    term?: string;
    lineItems: { description: string; amount: number; qty?: number }[];
    subtotal?: number;
    discount?: number;
    total: number;
    paid?: number;
    balance: number;
}
interface Party {
    schoolName?: string;
    schoolLogo?: string | null;
    schoolAddress?: string;
    schoolEmail?: string;
    schoolPhone?: string;
    studentName?: string;
    studentNo?: string;
    parentName?: string;
    parentEmail?: string;
    payBill?: string;
}

const fmt = (n: number) => `KSh ${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const date = (d?: string) => (d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—");

export function invoiceHtml(p: Party, inv: InvoiceData, autoPrint = false): string {
    const items = (inv.lineItems || []).map((it, i) => `
        <tr style="border-bottom:1px solid #eef1f6">
            <td style="padding:12px 8px;color:#1f2937">${i + 1}. ${it.description || "Fee item"}</td>
            <td style="padding:12px 8px;text-align:right;color:#6b7280">${fmt(it.amount)}</td>
            <td style="padding:12px 8px;text-align:center;color:#6b7280">${it.qty || 1}</td>
            <td style="padding:12px 8px;text-align:right;font-weight:600;color:#1f2937">${fmt((it.amount || 0) * (it.qty || 1))}</td>
        </tr>`).join("");

    const subtotal = inv.subtotal ?? inv.lineItems.reduce((s, i) => s + (i.amount || 0) * (i.qty || 1), 0);

    return `<!doctype html><html><head><meta charset="utf-8"><title>Invoice ${inv.invoiceNo}</title>
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:'Segoe UI',Arial,sans-serif;color:#1f2937;background:#fff;padding:36px;font-size:13px}
      .wrap{max-width:760px;margin:0 auto}
      .head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px}
      .brand{display:flex;align-items:center;gap:12px}
      .brand img{height:48px;object-fit:contain}
      .brand .nm{font-size:18px;font-weight:800;color:#0f2942}
      .title{text-align:right}
      .title h1{font-size:34px;letter-spacing:2px;color:#0f2942;font-weight:800}
      .title .meta{margin-top:8px;font-size:12px;color:#6b7280;line-height:1.7}
      .title .meta b{color:#1f2937}
      .parties{display:flex;justify-content:space-between;gap:24px;margin:24px 0}
      .parties .box{flex:1}
      .parties .lbl{font-size:10px;letter-spacing:1px;text-transform:uppercase;color:#9ca3af;font-weight:700;margin-bottom:6px}
      .parties .nm{font-weight:700;color:#0f2942;margin-bottom:2px}
      .parties .ln{color:#6b7280;font-size:12px;line-height:1.6}
      table{width:100%;border-collapse:collapse;margin-top:8px}
      thead th{background:#0f2942;color:#fff;padding:10px 8px;font-size:11px;text-transform:uppercase;letter-spacing:.5px}
      thead th:first-child{text-align:left;border-radius:6px 0 0 6px}
      thead th:last-child{text-align:right;border-radius:0 6px 6px 0}
      thead th:nth-child(2){text-align:right}thead th:nth-child(3){text-align:center}
      .totals{display:flex;justify-content:space-between;gap:24px;margin-top:24px}
      .pay{flex:1;font-size:12px;color:#6b7280;line-height:1.8}
      .pay .lbl{font-size:10px;letter-spacing:1px;text-transform:uppercase;color:#9ca3af;font-weight:700;margin-bottom:4px;color:#0f2942}
      .sum{width:280px}
      .sum .row{display:flex;justify-content:space-between;padding:7px 0;color:#6b7280}
      .sum .row b{color:#1f2937}
      .sum .due{display:flex;justify-content:space-between;background:#0f2942;color:#fff;padding:12px 14px;border-radius:8px;margin-top:8px;font-weight:800;font-size:15px}
      .notes{margin-top:28px;border-top:1px solid #eef1f6;padding-top:14px;color:#9ca3af;font-size:11px}
      @media print{body{padding:0}@page{margin:14mm}}
    </style></head>
    <body ${autoPrint ? 'onload="window.print()"' : ""}>
      <div class="wrap">
        <div class="head">
          <div class="brand">
            ${p.schoolLogo ? `<img src="${p.schoolLogo}" alt="logo"/>` : ""}
            <div class="nm">${(p.schoolName || "School")}</div>
          </div>
          <div class="title">
            <h1>INVOICE</h1>
            <div class="meta">
              <div>Invoice No: <b>${inv.invoiceNo}</b></div>
              <div>Issued: <b>${date(inv.date)}</b></div>
              <div>Due: <b>${date(inv.dueDate)}</b></div>
              ${inv.term ? `<div>Term: <b>${inv.term}</b></div>` : ""}
            </div>
          </div>
        </div>

        <div class="parties">
          <div class="box">
            <div class="lbl">From</div>
            <div class="nm">${p.schoolName || "School"}</div>
            <div class="ln">${p.schoolAddress || ""}</div>
            <div class="ln">${p.schoolEmail || ""}</div>
            <div class="ln">${p.schoolPhone || ""}</div>
          </div>
          <div class="box" style="text-align:right">
            <div class="lbl">Bill To</div>
            <div class="nm">${p.studentName || ""}</div>
            <div class="ln">Adm/Reg No: ${p.studentNo || "—"}</div>
            ${p.parentName ? `<div class="ln">Parent/Guardian: ${p.parentName}</div>` : ""}
            ${p.parentEmail ? `<div class="ln">${p.parentEmail}</div>` : ""}
          </div>
        </div>

        <table>
          <thead><tr><th>Description</th><th>Price</th><th>Qty</th><th>Total</th></tr></thead>
          <tbody>${items}</tbody>
        </table>

        <div class="totals">
          <div class="pay">
            <div class="lbl">Payment Instructions</div>
            <div>Pay via M-PESA Paybill <b>${p.payBill || "—"}</b></div>
            <div>Account No: <b>${p.studentNo || ""}</b></div>
            <div style="margin-top:6px">Or pay online through the Student / Parent Portal.</div>
          </div>
          <div class="sum">
            <div class="row"><span>Subtotal</span><b>${fmt(subtotal)}</b></div>
            ${inv.discount ? `<div class="row"><span>Discount</span><b>- ${fmt(inv.discount)}</b></div>` : ""}
            <div class="row"><span>Total</span><b>${fmt(inv.total)}</b></div>
            ${inv.paid ? `<div class="row"><span>Paid</span><b>- ${fmt(inv.paid)}</b></div>` : ""}
            <div class="due"><span>Balance Due</span><span>${fmt(inv.balance)}</span></div>
          </div>
        </div>

        <div class="notes">Thank you. Please settle the balance by the due date. This invoice was generated by ${p.schoolName || "the school"} via ShuleCloud.</div>
      </div>
    </body></html>`;
}

export function printInvoice(p: Party, inv: InvoiceData) {
    // Desktop → print window; mobile app → real PDF saved & opened.
    void outputHtmlDoc(`Invoice ${inv.invoiceNo}`, invoiceHtml(p, inv, true), { fileName: `Invoice-${inv.invoiceNo}` });
}
