"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.familyOf = void 0;
exports.reportCardHtml = reportCardHtml;
exports.reportCardEmailHtml = reportCardEmailHtml;
exports.htmlToPdf = htmlToPdf;
exports.closeReportBrowser = closeReportBrowser;
const puppeteer_1 = __importDefault(require("puppeteer"));
const familyOf = (template) => {
    const s = (template || '').toLowerCase();
    if (s.startsWith('cbc'))
        return 'CBC';
    if (s.startsWith('cam'))
        return 'Cambridge';
    if (s.startsWith('ib'))
        return 'IB';
    return 'KCSE';
};
exports.familyOf = familyOf;
// Grade/level for a percentage, per curriculum family.
const familyGrade = (pct, family) => {
    switch (family) {
        case 'CBC':
            return pct >= 76 ? 'E.E' : pct >= 51 ? 'M.E' : pct >= 26 ? 'A.E' : 'B.E';
        case 'Cambridge':
            return pct >= 90 ? 'A*' : pct >= 80 ? 'A' : pct >= 70 ? 'B' : pct >= 60 ? 'C' : pct >= 50 ? 'D' : pct >= 40 ? 'E' : 'U';
        case 'IB':
            return pct >= 85 ? '7' : pct >= 75 ? '6' : pct >= 65 ? '5' : pct >= 55 ? '4' : pct >= 45 ? '3' : pct >= 35 ? '2' : '1';
        default: // KCSE 8-4-4
            return pct >= 80 ? 'A' : pct >= 75 ? 'A-' : pct >= 70 ? 'B+' : pct >= 65 ? 'B' : pct >= 60 ? 'B-' : pct >= 55 ? 'C+' : pct >= 50 ? 'C' : pct >= 45 ? 'C-' : pct >= 40 ? 'D+' : pct >= 35 ? 'D' : pct >= 30 ? 'D-' : 'E';
    }
};
const gradeFor = (pct, grading, family) => {
    // Use the school's configured grading bands if present, else the family scheme.
    const bands = grading?.grades || grading?.bands || [];
    if (Array.isArray(bands) && bands.length) {
        for (const b of bands) {
            const lo = Number(b.min ?? b.from ?? b.lower ?? 0);
            const hi = Number(b.max ?? b.to ?? b.upper ?? 100);
            if (pct >= lo && pct <= hi)
                return b.grade || b.name || b.symbol || familyGrade(pct, family);
        }
    }
    return familyGrade(pct, family);
};
const GRADE_HEADER = { CBC: 'Level', KCSE: 'Grade', Cambridge: 'Grade', IB: 'Level (1–7)' };
const overallText = (pct, family, passMark) => {
    if (family === 'CBC')
        return pct >= 51 ? 'Meeting Expectation' : pct >= 26 ? 'Approaching Expectation' : 'Below Expectation';
    return pct >= passMark ? 'PASSED' : 'FAILED';
};
function reportCardHtml(d) {
    const s = d.student || {};
    const family = (0, exports.familyOf)(d.template);
    const rows = (d.marks || []).map((m) => {
        const obtained = Number(m.marksObtained || 0);
        const outOf = Number(m.totalMarks || 100);
        const pct = outOf ? (obtained / outOf) * 100 : 0;
        return `<tr>
            <td style="padding:8px 10px;border:1px solid #e5e7eb">${m.subjectName || m.subject || 'Subject'}</td>
            <td style="padding:8px 10px;border:1px solid #e5e7eb;text-align:center">${obtained}</td>
            <td style="padding:8px 10px;border:1px solid #e5e7eb;text-align:center">${outOf}</td>
            <td style="padding:8px 10px;border:1px solid #e5e7eb;text-align:center">${pct.toFixed(1)}%</td>
            <td style="padding:8px 10px;border:1px solid #e5e7eb;text-align:center;font-weight:700">${gradeFor(pct, d.grading, family)}</td>
        </tr>`;
    }).join('');
    const totalObtained = (d.marks || []).reduce((a, m) => a + Number(m.marksObtained || 0), 0);
    const totalOut = (d.marks || []).reduce((a, m) => a + Number(m.totalMarks || 100), 0);
    const overallPct = totalOut ? (totalObtained / totalOut) * 100 : 0;
    const overallGrade = gradeFor(overallPct, d.grading, family);
    const passMark = Number(d.grading?.passMark) || 40;
    const result = overallText(overallPct, family, passMark);
    const passed = family === 'CBC' ? overallPct >= 51 : overallPct >= passMark;
    const date = (x) => (x ? new Date(x).toLocaleDateString('en-GB') : '');
    return `<!doctype html><html><head><meta charset="utf-8"><style>
      *{box-sizing:border-box;margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif}
      body{color:#1f2937;font-size:13px}
      .head{display:flex;align-items:center;gap:14px;border-bottom:3px solid #0f2942;padding-bottom:12px;margin-bottom:14px}
      .head img{height:60px;object-fit:contain}
      .head h1{font-size:20px;color:#0f2942}
      .head p{color:#6b7280;font-size:12px}
      .title{text-align:center;font-weight:800;letter-spacing:1px;color:#0f2942;margin-bottom:12px;text-transform:uppercase}
      .info{display:flex;flex-wrap:wrap;gap:6px 24px;margin-bottom:14px}
      .info div{font-size:12px}.info b{color:#0f2942}
      table{width:100%;border-collapse:collapse;margin-top:6px}
      thead th{background:#0f2942;color:#fff;padding:9px 10px;font-size:11px;text-transform:uppercase;text-align:center}
      thead th:first-child{text-align:left}
      tfoot td{font-weight:800;background:#f3f4f6;padding:9px 10px;border:1px solid #e5e7eb}
      .summary{display:flex;justify-content:space-between;margin-top:16px;gap:16px}
      .box{flex:1;border:1px solid #e5e7eb;border-radius:8px;padding:12px}
      .box .lbl{font-size:10px;text-transform:uppercase;color:#9ca3af;font-weight:700}
      .box .val{font-size:18px;font-weight:800;color:#0f2942}
      .pass{color:#16a34a}.fail{color:#dc2626}
      .comments{margin-top:16px;border-top:1px solid #e5e7eb;padding-top:10px;font-size:12px;color:#6b7280}
    </style></head><body>
      <div class="head">
        ${d.logo ? `<img src="${d.logo}"/>` : ''}
        <div><h1>${d.school || 'School'}</h1>${d.motto ? `<p>${d.motto}</p>` : ''}</div>
      </div>
      <div class="title">Student Result Card · ${family}</div>
      <div class="info">
        <div>Student: <b>${s.studentName || ''}</b></div>
        <div>Adm/Reg No: <b>${s.registrationNo || s.admNo || '—'}</b></div>
        <div>Class: <b>${d.className || s.studentClass || ''}</b></div>
        <div>Exam: <b>${d.exam?.examName || d.exam?.name || 'Exam'}</b></div>
        <div>Date: <b>${date(d.exam?.date || d.exam?.examDate)}</b></div>
      </div>
      <table>
        <thead><tr><th>Subject</th><th>Marks</th><th>Out Of</th><th>%</th><th>${GRADE_HEADER[family]}</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="5" style="padding:14px;text-align:center;border:1px solid #e5e7eb;color:#9ca3af">No marks recorded.</td></tr>'}</tbody>
        <tfoot><tr><td>Total</td><td style="text-align:center">${totalObtained}</td><td style="text-align:center">${totalOut}</td><td style="text-align:center">${overallPct.toFixed(1)}%</td><td style="text-align:center">${overallGrade}</td></tr></tfoot>
      </table>
      <div class="summary">
        <div class="box"><div class="lbl">Overall %</div><div class="val">${overallPct.toFixed(1)}%</div></div>
        <div class="box"><div class="lbl">${family === 'CBC' ? 'Overall Level' : 'Overall Grade'}</div><div class="val">${overallGrade}</div></div>
        <div class="box"><div class="lbl">Result</div><div class="val ${passed ? 'pass' : 'fail'}">${result}</div></div>
      </div>
      <div class="comments">Class Teacher's Comment: ______________________________________________<br/><br/>Head Teacher's Comment: ______________________________________________</div>
    </body></html>`;
}
// Inline-styled, email-client-safe HTML report (shown in the email body).
function reportCardEmailHtml(d) {
    const s = d.student || {};
    const family = (0, exports.familyOf)(d.template);
    const date = (x) => (x ? new Date(x).toLocaleDateString('en-GB') : '');
    const rows = (d.marks || []).map((m) => {
        const obtained = Number(m.marksObtained || 0);
        const outOf = Number(m.totalMarks || 100);
        const pct = outOf ? (obtained / outOf) * 100 : 0;
        return `<tr>
            <td style="padding:8px 10px;border:1px solid #e5e7eb;font-size:13px">${m.subjectName || m.subject || 'Subject'}</td>
            <td style="padding:8px 10px;border:1px solid #e5e7eb;text-align:center;font-size:13px">${obtained} / ${outOf}</td>
            <td style="padding:8px 10px;border:1px solid #e5e7eb;text-align:center;font-size:13px">${pct.toFixed(1)}%</td>
            <td style="padding:8px 10px;border:1px solid #e5e7eb;text-align:center;font-weight:700;font-size:13px">${gradeFor(pct, d.grading, family)}</td>
        </tr>`;
    }).join('');
    const totalObtained = (d.marks || []).reduce((a, m) => a + Number(m.marksObtained || 0), 0);
    const totalOut = (d.marks || []).reduce((a, m) => a + Number(m.totalMarks || 100), 0);
    const overallPct = totalOut ? (totalObtained / totalOut) * 100 : 0;
    const passMark = Number(d.grading?.passMark) || 40;
    const result = overallText(overallPct, family, passMark);
    const passed = family === 'CBC' ? overallPct >= 51 : overallPct >= passMark;
    return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:0 auto;color:#1f2937">
      <div style="background:linear-gradient(135deg,#159a52,#0f2942);color:#fff;padding:18px 22px;border-radius:10px 10px 0 0">
        <table style="width:100%"><tr>
          <td>${d.logo ? `<img src="${d.logo}" alt="logo" style="height:42px;vertical-align:middle;margin-right:10px"/>` : ''}<span style="font-size:18px;font-weight:800;vertical-align:middle">${d.school || 'School'}</span></td>
          <td style="text-align:right;font-size:12px;opacity:.9">Result Card · ${family}</td>
        </tr></table>
      </div>
      <div style="border:1px solid #eee;border-top:0;padding:22px;border-radius:0 0 10px 10px">
        <p style="margin:0 0 12px">Dear Parent/Guardian,</p>
        <p style="margin:0 0 16px">Please find below the result card for your child. A printable PDF copy is attached.</p>
        <table style="width:100%;border-collapse:collapse;margin-bottom:14px;font-size:13px">
          <tr><td style="padding:4px 0;color:#6b7280;width:130px">Student</td><td style="padding:4px 0;font-weight:700;color:#0f2942">${s.studentName || ''}</td></tr>
          <tr><td style="padding:4px 0;color:#6b7280">Adm / Reg No</td><td style="padding:4px 0;font-weight:700">${s.registrationNo || s.admNo || '—'}</td></tr>
          <tr><td style="padding:4px 0;color:#6b7280">Class</td><td style="padding:4px 0;font-weight:700">${d.className || s.studentClass || ''}</td></tr>
          <tr><td style="padding:4px 0;color:#6b7280">Exam</td><td style="padding:4px 0;font-weight:700">${d.exam?.examName || d.exam?.name || 'Exam'}</td></tr>
          <tr><td style="padding:4px 0;color:#6b7280">Date</td><td style="padding:4px 0;font-weight:700">${date(d.exam?.date || d.exam?.examDate)}</td></tr>
        </table>
        <table style="width:100%;border-collapse:collapse">
          <thead><tr>
            <th style="background:#0f2942;color:#fff;padding:9px 10px;font-size:11px;text-align:left;text-transform:uppercase">Subject</th>
            <th style="background:#0f2942;color:#fff;padding:9px 10px;font-size:11px;text-transform:uppercase">Marks</th>
            <th style="background:#0f2942;color:#fff;padding:9px 10px;font-size:11px;text-transform:uppercase">%</th>
            <th style="background:#0f2942;color:#fff;padding:9px 10px;font-size:11px;text-transform:uppercase">${GRADE_HEADER[family]}</th>
          </tr></thead>
          <tbody>${rows || '<tr><td colspan="4" style="padding:12px;text-align:center;border:1px solid #e5e7eb;color:#9ca3af">No marks recorded.</td></tr>'}</tbody>
        </table>
        <table style="width:100%;margin-top:16px">
          <tr>
            <td style="border:1px solid #e5e7eb;border-radius:8px;padding:12px;text-align:center"><div style="font-size:10px;color:#9ca3af;text-transform:uppercase;font-weight:700">Overall</div><div style="font-size:18px;font-weight:800;color:#0f2942">${overallPct.toFixed(1)}%</div></td>
            <td style="width:10px"></td>
            <td style="border:1px solid #e5e7eb;border-radius:8px;padding:12px;text-align:center"><div style="font-size:10px;color:#9ca3af;text-transform:uppercase;font-weight:700">${family === 'CBC' ? 'Level' : 'Grade'}</div><div style="font-size:18px;font-weight:800;color:#0f2942">${gradeFor(overallPct, d.grading, family)}</div></td>
            <td style="width:10px"></td>
            <td style="border:1px solid #e5e7eb;border-radius:8px;padding:12px;text-align:center"><div style="font-size:10px;color:#9ca3af;text-transform:uppercase;font-weight:700">Result</div><div style="font-size:16px;font-weight:800;color:${passed ? '#16a34a' : '#dc2626'}">${result}</div></td>
          </tr>
        </table>
        <p style="color:#9ca3af;font-size:12px;margin-top:20px">Regards,<br/>${d.school || 'The School'}</p>
      </div>
    </div>`;
}
// Reuse one Chromium instance for the whole batch.
let browser = null;
const getBrowser = async () => {
    if (!browser)
        browser = await puppeteer_1.default.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    return browser;
};
async function htmlToPdf(html) {
    const b = await getBrowser();
    const page = await b.newPage();
    try {
        await page.setContent(html, { waitUntil: 'networkidle0' });
        const pdf = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '12mm', bottom: '12mm', left: '10mm', right: '10mm' } });
        return Buffer.from(pdf);
    }
    finally {
        await page.close().catch(() => { });
    }
}
async function closeReportBrowser() {
    if (browser) {
        await browser.close().catch(() => { });
        browser = null;
    }
}
