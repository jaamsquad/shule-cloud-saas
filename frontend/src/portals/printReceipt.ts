// Official-receipt printout matching the institutional layout
// (crest, school name, OFFICIAL RECEIPT, field grid, amount-in-words, balance).

interface ReceiptData {
    receiptNo: string;
    date?: string;
    paymentMode?: string;
    amount: number;
    reference?: string;
    purpose?: string;
    servedBy?: string;
}
interface PartyData {
    schoolName?: string;
    schoolCrest?: string | null;
    poBox?: string;
    email?: string;
    tel?: string;
    fax?: string;
    studentName?: string;
    studentNo?: string;
    feesBalance?: number | null;
}

const ONES = ["", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE", "TEN",
    "ELEVEN", "TWELVE", "THIRTEEN", "FOURTEEN", "FIFTEEN", "SIXTEEN", "SEVENTEEN", "EIGHTEEN", "NINETEEN"];
const TENS = ["", "", "TWENTY", "THIRTY", "FORTY", "FIFTY", "SIXTY", "SEVENTY", "EIGHTY", "NINETY"];

function chunk(n: number): string {
    let s = "";
    if (n >= 100) { s += ONES[Math.floor(n / 100)] + " HUNDRED "; n %= 100; }
    if (n >= 20) { s += TENS[Math.floor(n / 10)] + " "; n %= 10; }
    if (n > 0) s += ONES[n] + " ";
    return s.trim();
}

export function amountInWords(amount: number): string {
    const whole = Math.floor(amount);
    const cents = Math.round((amount - whole) * 100);
    if (whole === 0) return `ZERO AND ${cents}/100`;
    const units = [["", 1], ["THOUSAND", 1000], ["MILLION", 1000000], ["BILLION", 1000000000]] as const;
    let n = whole;
    const parts: string[] = [];
    const groups: number[] = [];
    while (n > 0) { groups.push(n % 1000); n = Math.floor(n / 1000); }
    for (let i = groups.length - 1; i >= 0; i--) {
        if (groups[i] === 0) continue;
        parts.push(`${chunk(groups[i])}${units[i][0] ? " " + units[i][0] : ""}`);
    }
    return `${parts.join(" ").trim()} AND ${cents}/100`;
}

const fmt = (n: number) => Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const longDate = (d?: string) => d ? new Date(d).toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" }) : "—";

export function printOfficialReceipt(party: PartyData, r: ReceiptData) {
    const w = window.open("", "_blank", "width=820,height=1000");
    if (!w) return;
    const now = new Date().toLocaleString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit" });
    const crest = party.schoolCrest
        ? `<img src="${party.schoolCrest}" style="height:64px" />`
        : "";

    w.document.write(`<!doctype html><html><head><title>${r.receiptNo}</title>
    <style>
      *{box-sizing:border-box} body{font-family:'Times New Roman',Georgia,serif;color:#111;padding:32px;font-size:13px}
      .wrap{max-width:720px;margin:0 auto}
      .top{display:flex;justify-content:space-between;align-items:flex-start}
      .top .side{font-size:12px;line-height:1.6}
      .crest{flex:1;text-align:center}
      .rule{border:0;border-top:2px solid #111;margin:6px 0}
      h1{font-size:20px;text-align:center;margin:6px 0 0;letter-spacing:.5px}
      h2{font-size:14px;text-align:center;margin:2px 0 0;font-weight:bold}
      .grid{width:100%;border-collapse:collapse;margin-top:4px}
      .grid td{padding:3px 0;vertical-align:top}
      .lbl{font-weight:bold}
      .val{color:#15397a}
      .row{margin:6px 0}
      .ts{color:#a33;font-size:11px;margin-top:10px}
      @media print{ body{padding:0} @page{margin:14mm} }
    </style></head><body onload="window.print()">
    <div class="wrap">
      <div class="top">
        <div class="side"><span class="lbl">P.o Box:</span> ${party.poBox || ""}<br><span class="lbl">Email:</span> ${party.email || ""}</div>
        <div class="crest">${crest}</div>
        <div class="side" style="text-align:right"><span class="lbl">Tel:</span> ${party.tel || ""}<br><span class="lbl">Fax:</span> ${party.fax || ""}</div>
      </div>
      <hr class="rule">
      <h1>${(party.schoolName || "SCHOOL").toUpperCase()}</h1>
      <h2>OFFICIAL RECEIPT</h2>
      <hr class="rule">

      <table class="grid">
        <tr>
          <td style="width:60%"><span class="lbl">Date:</span> <span class="val">${longDate(r.date)}</span></td>
          <td><span class="lbl">Receipt No:</span> <span class="val">${r.receiptNo}</span></td>
        </tr>
        <tr>
          <td><span class="lbl">Received From:</span> <span class="val">${(party.studentName || "").toUpperCase()}</span></td>
          <td><span class="lbl">Student No.:</span> <span class="val">${party.studentNo || ""}</span></td>
        </tr>
      </table>

      <div class="row"><span class="lbl">Being</span> <span class="val">${r.purpose || "Fees payment"}</span></div>
      <div class="row"><span class="lbl">The Sum of:</span> &nbsp; <span class="val">${fmt(r.amount)}</span></div>
      <div class="row"><span class="lbl">Amount In Words:</span> <span class="val">**** ${amountInWords(r.amount)}</span></div>
      <div class="row"><span class="lbl">Pay Mode:</span> <span class="val">${r.paymentMode || "Direct Bank Deposit"}</span> &nbsp;&nbsp; <span class="lbl">Bank:</span> &nbsp;&nbsp; <span class="lbl">Transaction No:</span> <span class="val">${r.reference || "—"}</span></div>
      <div class="row"><span class="lbl">Payment By:</span> <span class="val">${(r.paymentMode || "").toUpperCase()} ${r.reference || ""}</span></div>
      ${party.feesBalance != null ? `<div class="row"><span class="lbl">Fees Balance Kshs.</span> <span class="val">${fmt(party.feesBalance)}</span></div>` : ""}
      <div class="row"><span class="lbl">Served By:</span> <span class="val">${r.servedBy || "Self-Service Portal"}</span></div>
      <div class="ts">${now}</div>
      <hr class="rule">
    </div>
    </body></html>`);
    w.document.close();
    w.focus();
}
