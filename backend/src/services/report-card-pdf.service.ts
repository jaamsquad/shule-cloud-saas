import puppeteer, { Browser } from 'puppeteer';

export type Family = 'CBC' | 'KCSE' | 'Cambridge' | 'IB';
// Older template ids carry the curriculum in their prefix (cbc_*, cam_*, ib_*). The newer layouts are
// curriculum-neutral, so for those the school's curriculum setting decides the grading family.
export const familyOf = (template?: string, curriculum?: string): Family => {
    const s = (template || '').toLowerCase();
    if (s.startsWith('cbc')) return 'CBC';
    if (s.startsWith('cam')) return 'Cambridge';
    if (s.startsWith('ib')) return 'IB';
    if (s.startsWith('kcse')) return 'KCSE';
    const c = (curriculum || '').toLowerCase();
    if (c === 'cbc') return 'CBC';
    if (c === 'cambridge') return 'Cambridge';
    if (c === 'ib') return 'IB';
    return 'KCSE';
};

// Grade/level for a percentage, per curriculum family.
const familyGrade = (pct: number, family: Family): string => {
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

const gradeFor = (pct: number, grading: any, family: Family): string => {
    // Use the school's configured grading bands if present, else the family scheme.
    const bands: any[] = grading?.grades || grading?.bands || [];
    if (Array.isArray(bands) && bands.length) {
        for (const b of bands) {
            const lo = Number(b.min ?? b.from ?? b.lower ?? 0);
            const hi = Number(b.max ?? b.to ?? b.upper ?? 100);
            if (pct >= lo && pct <= hi) return b.grade || b.name || b.symbol || familyGrade(pct, family);
        }
    }
    return familyGrade(pct, family);
};

const GRADE_HEADER: Record<Family, string> = { CBC: 'Level', KCSE: 'Grade', Cambridge: 'Grade', IB: 'Level (1–7)' };
const overallText = (pct: number, family: Family, passMark: number) => {
    if (family === 'CBC') return pct >= 51 ? 'Meeting Expectation' : pct >= 26 ? 'Approaching Expectation' : 'Below Expectation';
    return pct >= passMark ? 'PASSED' : 'FAILED';
};

export interface ReportCardData {
    school?: string; logo?: string | null; motto?: string; address?: string; template?: string; curriculum?: string;
    student: any; exam: any; className?: string; marks: any[]; grading?: any;
}

// The layouts a school can choose on Report Card Templates (same names as the on-screen ones).
const LOOKS: Record<string, { head: string; text: string; zebra: string }> = {
    annual_exam:     { head: '#33357f', text: '#ffffff', zebra: '#f8f8ff' },
    progress_report: { head: '#4a6fa5', text: '#ffffff', zebra: '#ffffff' },
    class_test:      { head: '#d9d9d9', text: '#000000', zebra: '#ffffff' },
    term_end:        { head: '#17a2b8', text: '#000000', zebra: '#ffffff' },
    scholarsheet:    { head: '#ffffff', text: '#000000', zebra: '#ffffff' },
};
export const looksFor = (template?: string) => LOOKS[String(template || '')] ? String(template) : 'annual_exam';
const esc = (v: any) => String(v ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
const remark = (pct: number) => pct >= 80 ? 'EXCELLENT' : pct >= 70 ? 'V.GOOD' : pct >= 60 ? 'GOOD' : pct >= 50 ? 'AVERAGE' : 'POOR';

// A plain bar chart of each subject's % (inline SVG so it prints from the PDF renderer)
function barChartSvg(rows: { label: string; pct: number }[], title: string): string {
    if (!rows.length) return '';
    const W = 720, padL = 46, padR = 14, padT = 24, tall = 180, padB = 38, H = padT + tall + padB, cw = W - padL - padR, gw = cw / rows.length, bw = Math.min(30, gw * 0.6);
    const y = (v: number) => padT + tall - (Math.max(0, Math.min(100, v)) / 100) * tall;
    const grid = [0, 25, 50, 75, 100].map(t => `<line x1="${padL}" x2="${W - padR}" y1="${y(t)}" y2="${y(t)}" stroke="#d4d4d8" stroke-dasharray="3 3"/><text x="${padL - 6}" y="${y(t) + 4}" text-anchor="end" font-size="11">${t}</text>`).join('');
    const bars = rows.map((r, i) => { const x = padL + i * gw + (gw - bw) / 2; return `<rect x="${x}" y="${y(r.pct)}" width="${bw}" height="${padT + tall - y(r.pct)}" fill="#ff5555"/><text x="${x + bw / 2}" y="${y(r.pct) - 4}" text-anchor="middle" font-size="10.5">${Math.round(r.pct)}</text><text x="${padL + i * gw + gw / 2}" y="${padT + tall + 16}" text-anchor="middle" font-size="11">${esc(r.label.length > 11 ? r.label.slice(0, 9) + '…' : r.label)}</text>`; }).join('');
    return `<div style="border:1px solid #444;padding:6px;margin-top:12px;page-break-inside:avoid"><div style="text-align:center;font-weight:700;font-size:13px;color:#333">${esc(title)}</div>
      <svg viewBox="0 0 ${W} ${H}" style="width:100%;display:block">${grid}${bars}<line x1="${padL}" x2="${W - padR}" y1="${padT + tall}" y2="${padT + tall}" stroke="#111"/><line x1="${padL}" x2="${padL}" y1="${padT}" y2="${padT + tall}" stroke="#111"/></svg></div>`;
}

export function reportCardHtml(d: ReportCardData): string {
    const s = d.student || {};
    const family = familyOf(d.template, d.curriculum);
    const tpl = looksFor(d.template);
    const look = LOOKS[tpl];
    const classic = tpl === 'scholarsheet';

    const subs = (d.marks || []).map((m: any) => {
        const obtained = Number(m.marksObtained || 0), outOf = Number(m.totalMarks || 100), pct = outOf ? (obtained / outOf) * 100 : 0;
        return { name: String(m.subjectName || m.subject || 'Subject'), obtained, outOf, pct, grade: gradeFor(pct, d.grading, family) };
    });
    const totalObtained = subs.reduce((a, x) => a + x.obtained, 0);
    const totalOut = subs.reduce((a, x) => a + x.outOf, 0);
    const overallPct = totalOut ? (totalObtained / totalOut) * 100 : 0;
    const overallGrade = gradeFor(overallPct, d.grading, family);
    const passMark = Number(d.grading?.passMark) || 40;
    const result = overallText(overallPct, family, passMark);
    const date = (x: any) => (x ? new Date(x).toLocaleDateString('en-GB') : '');
    const examName = String(d.exam?.examName || d.exam?.name || 'Exam');
    const gh = GRADE_HEADER[family];
    const bands: { grade: string; lo: number; hi: number; label: string }[] = ((d.grading?.grades || d.grading?.bands || []) as any[])
        .map(b => ({ grade: String(b.grade || b.name || b.symbol || ''), lo: Number(b.min ?? b.from ?? b.lower ?? 0), hi: Number(b.max ?? b.to ?? b.upto ?? b.upper ?? 100), label: String(b.status || b.label || '') }))
        .filter(b => b.grade).sort((x, y) => y.lo - x.lo);
    const boundaries = bands.map(b => `${esc(b.grade)} : ${b.hi} - ${b.lo}`).join(', ');

    const th = (t: string, left = false) => `<th style="background:${look.head};color:${look.text};padding:8px;border:1px solid #222;font-size:12px;text-align:${left ? 'left' : 'center'}">${t}</th>`;
    const td = (t: any, o: { left?: boolean; bold?: boolean } = {}) => `<td style="padding:7px 8px;border:1px solid #222;font-size:12px;text-align:${o.left ? 'left' : 'center'};${o.bold ? 'font-weight:700' : ''}">${t}</td>`;
    const bar = (t: string) => `<div style="background:${look.head};color:${look.text};font-weight:700;font-size:13px;padding:5px 9px;border:1px solid #222">${t}</div>`;
    const lines = `<div style="padding:2px 8px 6px">${'<div style="border-bottom:1px solid #94a3b8;height:20px"></div>'.repeat(3)}</div>`;
    const box = (t: string, inner: string) => `<div style="border:1px solid #222;margin-top:12px;page-break-inside:avoid">${bar(t)}${inner}</div>`;
    const sign = (t: string[]) => `<div style="display:flex;gap:22px;margin-top:38px;page-break-inside:avoid">${t.map(x => `<div style="flex:1;text-align:center;font-size:12px"><div style="height:32px"></div><div style="border-top:1.5px solid #111;padding-top:4px">${x}</div></div>`).join('')}</div>`;
    const info = (rows: [string, string][][]) => `<table style="width:100%;border-collapse:collapse;margin:10px 0;table-layout:fixed">${rows.map(r => `<tr>${r.map(([l, v], j) => `<td colspan="${j === r.length - 1 ? 2 - r.length + 1 : 1}" style="padding:4px 10px;font-size:13px"><b>${l} :</b>&nbsp;&nbsp;${esc(v)}</td>`).join('')}</tr>`).join('')}</table>`;
    const letterhead = `<div style="display:flex;align-items:center;gap:16px;padding-bottom:10px;border-bottom:1.5px solid #cbd5e1">
        ${d.logo ? `<img src="${esc(d.logo)}" style="height:70px;width:auto;object-fit:contain"/>` : ''}
        <div><div style="font-size:25px;font-weight:800;color:#000;line-height:1.15">${esc(d.school || 'School')}</div>${d.address || d.motto ? `<div style="font-size:13px;margin-top:5px;color:#222">${esc(d.address || d.motto)}</div>` : ''}</div></div>`;

    const chart = barChartSvg(subs.map(x => ({ label: x.name, pct: x.pct })), tpl === 'progress_report' ? 'Examination Performance Analysis' : 'Result Analysis');
    const stu = s.studentName || s.name || '';
    const adm = s.registrationNo || s.admNo || '—';
    const cls = d.className || s.studentClass || '';
    const empty = `<tr><td colspan="6" style="padding:14px;text-align:center;border:1px solid #222;color:#9ca3af">No marks recorded.</td></tr>`;

    let body = '';
    if (tpl === 'progress_report') {
        body = `<div style="display:flex;align-items:center;gap:14px">${d.logo ? `<img src="${esc(d.logo)}" style="height:70px"/>` : ''}<div style="flex:1;text-align:center;padding-right:${d.logo ? 70 : 0}px"><div style="font-weight:700;font-size:17px">${esc(d.school || 'School')}</div><div style="font-weight:700;font-size:15px;text-transform:uppercase">${esc(examName)}</div><div style="font-weight:700;font-size:16px;margin-top:12px">Progress Report</div></div></div>
          <div style="background:${look.head};color:#fff;padding:3px 8px;display:flex;justify-content:space-between;font-size:12.5px;border:1px solid #222;margin-top:10px"><span>Class : <b>${esc(cls)}</b></span><span>${date(d.exam?.date || d.exam?.examDate)}</span></div>
          <table style="width:100%;border-collapse:collapse;text-align:center;margin-bottom:14px"><tr>${['Student Name', 'Adm No', 'Result'].map(h => td(`<b>${h}</b>`)).join('')}</tr><tr>${[esc(stu), esc(adm), esc(result)].map(v => td(v)).join('')}</tr></table>
          <table style="width:100%;border-collapse:collapse"><thead><tr>${th('#')}${th('Subject', true)}${th('Max Marks')}${th('Marks Obtained')}${th('Overall %')}</tr></thead><tbody>
          ${subs.map((x, i) => `<tr>${td(i + 1)}${td(esc(x.name), { left: true })}${td(x.outOf.toFixed(2))}${td(x.obtained.toFixed(2))}${td(x.pct.toFixed(2))}</tr>`).join('') || empty}
          <tr>${td('Total', { bold: true })}${td('', {})}${td(totalOut.toFixed(2), { bold: true })}${td(totalObtained.toFixed(2), { bold: true })}${td(`${overallPct.toFixed(2)} · ${esc(overallGrade)}`, { bold: true })}</tr></tbody></table>
          ${chart}
          ${bands.length ? `<table style="border-collapse:collapse;margin:14px 0;width:320px;page-break-inside:avoid"><tr><th colspan="3" style="background:${look.head};color:#fff;padding:6px;border:1px solid #222;font-size:14px">Assessment Key</th></tr>${bands.map(b => `<tr>${td(esc(b.grade))}${td(`${b.lo}% - ${b.hi}%`)}${td(esc(b.label), { left: true })}</tr>`).join('')}</table>` : ''}
          ${box('Special Comments :', lines)}${sign(['Class Teacher', 'Principal', 'Parent / Guardian'])}`;
    } else if (tpl === 'class_test') {
        body = `${letterhead}<div style="text-align:center;font-size:21px;font-weight:700;margin:14px 0 6px">${esc(examName)} Report Card</div><hr style="border:0;border-top:1px solid #ccc;margin:0 0 6px"/>
          ${info([[['Student Name', stu], ['Adm No', adm]], [['Class', cls], ['Result', result]]])}
          <table style="width:100%;border-collapse:collapse"><thead><tr>${th('Sr.No')}${th('Subject Name', true)}${th('Total Marks')}${th('Marks Obtained')}${th('%')}${th(gh)}</tr></thead><tbody>
          ${subs.map((x, i) => `<tr>${td(i + 1)}${td(esc(x.name), { left: true })}${td(x.outOf)}${td(x.obtained)}${td(x.pct.toFixed(1) + '%')}${td(esc(x.grade), { bold: true })}</tr>`).join('') || empty}
          <tr><td colspan="2" style="padding:7px;border:1px solid #222;text-align:center;font-weight:700;font-size:12px">Total Marks</td><td colspan="2" style="padding:7px;border:1px solid #222;text-align:center;font-weight:700;font-size:12px">${totalObtained.toFixed(1)}/${totalOut.toFixed(1)}</td><td colspan="2" style="padding:7px;border:1px solid #222;text-align:center;font-weight:700;font-size:12px">${esc(overallGrade)}</td></tr>
          <tr><td colspan="2" style="padding:7px;border:1px solid #222;text-align:center;font-weight:700;font-size:12px">Total Percentage</td><td colspan="4" style="padding:7px;border:1px solid #222;text-align:center;font-weight:700;font-size:12px">${overallPct.toFixed(2)}%</td></tr></tbody></table>
          ${chart}${box("Class Teacher's Comments :", lines)}${boundaries ? box('Grade Boundaries :', `<div style="font-size:12px;padding:5px 9px">${boundaries}</div>`) : ''}${sign(['Class Teacher', 'Principal', 'Parent / Guardian'])}`;
    } else if (tpl === 'term_end') {
        body = `${letterhead}<div style="text-align:center;font-size:23px;font-weight:700;margin:14px 0 4px">Term End Report</div>
          ${info([[['Student Name', stu], ['Adm No', adm]], [['Class', cls], ['Exam', examName]]])}
          <table style="width:100%;border-collapse:collapse"><thead><tr>${th('Subject')}${th('Marks')}${th('Percentage')}${th(gh)}</tr></thead><tbody>
          ${subs.map(x => `<tr>${td(esc(x.name), { left: true })}${td(`${x.obtained}/${x.outOf}`)}${td(x.pct.toFixed(1) + '%')}${td(esc(x.grade), { bold: true })}</tr>`).join('') || empty}
          <tr style="background:#eef9fb">${td('Overall', { left: true, bold: true })}${td(`${totalObtained}/${totalOut}`, { bold: true })}${td(overallPct.toFixed(1) + '%', { bold: true })}${td(esc(overallGrade), { bold: true })}</tr></tbody></table>
          ${box("Class Teacher's Comments :", lines)}${boundaries ? box('Grade Boundaries :', `<div style="font-size:12.5px;padding:6px 9px">${boundaries}</div>`) : ''}${sign(['Class Teacher', 'Principal', 'Parent / Guardian'])}
          <div style="display:flex;justify-content:space-between;font-size:12px;margin-top:16px;color:#333"><span>${esc(stu)}</span><span>${esc(d.school || '')}</span></div>`;
    } else if (classic) {
        const mean = subs.length ? overallPct : 0;
        body = `<div style="font-family:'Times New Roman',Georgia,serif;color:#000">
          <div style="display:flex;justify-content:space-between;align-items:flex-start"><div style="display:flex;gap:10px">${d.logo ? `<img src="${esc(d.logo)}" style="height:56px"/>` : ''}<div><div style="font-size:22px;font-weight:800">${esc(d.school || 'SCHOOL')}</div>${d.address || d.motto ? `<div style="font-size:11px">${esc(d.address || d.motto)}</div>` : ''}<div style="font-weight:700;margin-top:2px">Report Form</div></div></div><div style="font-size:11px">Issue Date : <b>${new Date().toLocaleDateString('en-GB')}</b></div></div>
          <div style="display:flex;justify-content:space-between;margin-top:8px;font-size:12px"><b>${esc(examName)}</b><span>Class : <b>${esc(cls)}</b></span></div>
          <table style="width:100%;border-collapse:collapse;margin-top:4px"><tr><td style="border:1px solid #000;padding:3px 6px;font-size:12px">Name : <b>${esc(stu)}</b></td><td style="border:1px solid #000;padding:3px 6px;font-size:12px;width:170px">Adm No : <b>${esc(adm)}</b></td></tr></table>
          <table style="width:100%;border-collapse:collapse;margin-top:4px;text-align:center;font-size:12px"><tr style="font-weight:700">${['Total Marks', 'Mean Score', gh === 'Level' ? 'Overall Level' : 'Mean Grade'].map(h => `<td style="border:1px solid #000;padding:3px">${h}</td>`).join('')}</tr><tr>${[`${totalObtained}/${totalOut}`, mean.toFixed(1), esc(overallGrade)].map(v => `<td style="border:1px solid #000;padding:3px">${v}</td>`).join('')}</tr></table>
          <table style="width:100%;border-collapse:collapse;margin-top:4px;font-size:12px"><tr style="font-weight:700;text-align:center">${['Subject', 'Marks', gh, 'Remarks'].map((h, i) => `<td style="border:1px solid #000;padding:3px 5px;${i === 0 ? 'text-align:left' : ''}">${h}</td>`).join('')}</tr>
          ${subs.map(x => `<tr><td style="border:1px solid #000;padding:3px 5px">${esc(x.name).toUpperCase()}</td><td style="border:1px solid #000;padding:3px 5px;text-align:center">${x.obtained}/${x.outOf}</td><td style="border:1px solid #000;padding:3px 5px;text-align:center;font-weight:700">${esc(x.grade)}</td><td style="border:1px solid #000;padding:3px 5px">${remark(x.pct)}</td></tr>`).join('') || `<tr><td colspan="4" style="border:1px solid #000;padding:10px;text-align:center">No marks recorded.</td></tr>`}</table>
          ${chart}
          <table style="width:100%;border-collapse:collapse;margin-top:4px;font-size:12px"><tr><td style="border:1px solid #000;padding:5px;height:38px;vertical-align:top"><b>Class Teacher's Comments :</b></td><td style="border:1px solid #000;padding:5px;width:170px;vertical-align:bottom">Signature : ________</td></tr><tr><td style="border:1px solid #000;padding:5px;height:38px;vertical-align:top"><b>Principal's Comments :</b></td><td style="border:1px solid #000;padding:5px;vertical-align:bottom">Signature : ________</td></tr><tr><td style="border:1px solid #000;padding:5px;height:30px;vertical-align:top"><b>Report Seen By Parent/Guardian :</b> Date : ________</td><td style="border:1px solid #000;padding:5px">Result : <b>${esc(result)}</b></td></tr></table></div>`;
    } else {   // annual_exam (and any retired design)
        body = `${letterhead}<div style="text-align:center;font-size:24px;font-weight:700;text-transform:uppercase;margin:14px 0 4px">${esc(examName)}</div>
          ${info([[['Student Name', stu], ['Adm No', adm]], [['Class', cls], ['Date', date(d.exam?.date || d.exam?.examDate) || '—']]])}
          <table style="width:100%;border-collapse:collapse"><thead><tr>${th('Sr.No')}${th('Subject Name', true)}${th('Total Marks')}${th('Obtained Marks')}${th('%')}${th(gh)}</tr></thead><tbody>
          ${subs.map((x, i) => `<tr style="background:${i % 2 ? '#fff' : look.zebra}">${td(i + 1)}${td(esc(x.name), { left: true })}${td(x.outOf)}${td(x.obtained)}${td(x.pct.toFixed(1) + '%')}${td(esc(x.grade), { bold: true })}</tr>`).join('') || empty}
          <tr style="font-weight:700"><td colspan="2" style="padding:7px;border:1px solid #222;text-align:center;font-size:12px">Total</td>${td(totalOut.toFixed(1), { bold: true })}${td(totalObtained.toFixed(1), { bold: true })}${td(overallPct.toFixed(1) + '%', { bold: true })}${td(esc(overallGrade), { bold: true })}</tr></tbody></table>
          ${chart}${box("Class Teacher's Comments :", lines)}${sign(['Principal', 'HOD', 'Homeroom Teacher'])}`;
    }

    return `<!doctype html><html><head><meta charset="utf-8"><style>
      *{box-sizing:border-box;margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
      body{color:#111;font-size:13px;padding:6px 10px}
    </style></head><body>${body}</body></html>`;
}

// ── Yearly (annual) report: Term 1 | Term 2 | Term 3 | Year average, in the school's chosen colours ──
export interface YearlyData {
    school?: string; logo?: string | null; address?: string; template?: string;
    year: string; name: string; regNo: string; className: string;
    subjects: { name: string; t: (number | null)[]; avg: number | null; grade: string }[];
    termOverall: (number | null)[]; yearAvg: number | null; yearGrade: string;
    bands?: { grade: string; lo: number; hi: number }[];
}
const YEAR_LOOK: Record<string, { head: string; text: string }> = {
    annual_exam: { head: '#33357f', text: '#fff' }, progress_report: { head: '#4a6fa5', text: '#fff' }, class_test: { head: '#d9d9d9', text: '#000' },
    term_end: { head: '#17a2b8', text: '#000' }, scholarsheet: { head: '#111827', text: '#fff' },
};
export function yearlyPageHtml(d: YearlyData): string {
    const look = YEAR_LOOK[String(d.template || '')] || YEAR_LOOK.annual_exam;
    const th = (t: string, left = false) => `<th style="background:${look.head};color:${look.text};padding:8px;border:1px solid #222;font-size:12px;text-align:${left ? 'left' : 'center'}">${t}</th>`;
    const td = (t: any, o: { left?: boolean; bold?: boolean; bg?: string } = {}) => `<td style="padding:7px 8px;border:1px solid #222;font-size:12px;text-align:${o.left ? 'left' : 'center'};${o.bold ? 'font-weight:700;' : ''}${o.bg ? `background:${o.bg};` : ''}">${t}</td>`;
    const pc = (v: number | null) => (v == null ? '—' : `${v}%`);
    const rows = d.subjects.map((x, i) => `<tr style="background:${i % 2 ? '#fff' : '#f8f8ff'}">${td(i + 1)}${td(esc(x.name), { left: true })}${td(pc(x.t[0]))}${td(pc(x.t[1]))}${td(pc(x.t[2]))}${td(pc(x.avg), { bold: true, bg: '#eef2ff' })}${td(esc(x.grade), { bold: true })}</tr>`).join('')
        || `<tr><td colspan="7" style="padding:14px;text-align:center;border:1px solid #222;color:#9ca3af">No results recorded for this year yet.</td></tr>`;
    const bounds = (d.bands || []).map(b => `${esc(b.grade)} : ${b.hi} - ${b.lo}`).join(', ');
    const lines = '<div style="border-bottom:1px solid #94a3b8;height:20px"></div>'.repeat(3);
    return `<div style="page-break-after:always">
      <div style="display:flex;align-items:center;gap:16px;padding-bottom:10px;border-bottom:1.5px solid #cbd5e1">${d.logo ? `<img src="${esc(d.logo)}" style="height:70px;width:auto;object-fit:contain"/>` : ''}
        <div><div style="font-size:25px;font-weight:800;line-height:1.15">${esc(d.school || 'School')}</div>${d.address ? `<div style="font-size:13px;margin-top:5px;color:#222">${esc(d.address)}</div>` : ''}</div></div>
      <div style="text-align:center;font-size:22px;font-weight:700;text-transform:uppercase;margin:14px 0 6px">${esc(d.year)} Annual Report</div>
      <table style="width:100%;border-collapse:collapse;margin:8px 0;table-layout:fixed"><tr><td style="padding:4px 10px;font-size:13px"><b>Student Name :</b>&nbsp;&nbsp;${esc(d.name)}</td><td style="padding:4px 10px;font-size:13px"><b>Adm No :</b>&nbsp;&nbsp;${esc(d.regNo || '—')}</td></tr>
        <tr><td style="padding:4px 10px;font-size:13px"><b>Class :</b>&nbsp;&nbsp;${esc(d.className)}</td><td style="padding:4px 10px;font-size:13px"><b>Academic Year :</b>&nbsp;&nbsp;${esc(d.year)}</td></tr></table>
      <table style="width:100%;border-collapse:collapse"><thead><tr>${th('#')}${th('Subject', true)}${th('Term 1')}${th('Term 2')}${th('Term 3')}${th('Year Average')}${th('Grade')}</tr></thead><tbody>${rows}
        <tr style="font-weight:700"><td colspan="2" style="padding:8px;border:1px solid #222;text-align:center;font-size:12px">OVERALL</td>${td(pc(d.termOverall[0]), { bold: true })}${td(pc(d.termOverall[1]), { bold: true })}${td(pc(d.termOverall[2]), { bold: true })}${td(pc(d.yearAvg), { bold: true, bg: '#e0e7ff' })}${td(esc(d.yearGrade), { bold: true })}</tr></tbody></table>
      <div style="border:1px solid #222;margin-top:14px;page-break-inside:avoid"><div style="background:${look.head};color:${look.text};font-weight:700;font-size:13px;padding:5px 9px">Class Teacher's Comments :</div><div style="padding:2px 8px 6px">${lines}</div></div>
      ${bounds ? `<div style="border:1px solid #222;margin-top:10px;page-break-inside:avoid"><div style="background:${look.head};color:${look.text};font-weight:700;font-size:13px;padding:5px 9px">Grade Boundaries :</div><div style="font-size:12px;padding:6px 9px">${bounds}</div></div>` : ''}
      <div style="display:flex;gap:22px;margin-top:38px;page-break-inside:avoid">${['Class Teacher', 'Principal', 'Parent / Guardian'].map(x => `<div style="flex:1;text-align:center;font-size:12px"><div style="height:32px"></div><div style="border-top:1.5px solid #111;padding-top:4px">${x}</div></div>`).join('')}</div>
    </div>`;
}
/** One document with a page per learner. */
export function yearlyDocumentHtml(pages: YearlyData[]): string {
    return `<!doctype html><html><head><meta charset="utf-8"><style>*{box-sizing:border-box;margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
      body{color:#111;font-size:13px;padding:6px 10px}@page{size:A4;margin:12mm}</style></head><body>${pages.map(yearlyPageHtml).join('')}</body></html>`;
}

// Inline-styled, email-client-safe HTML report (shown in the email body).
const EMAIL_HEAD: Record<string, string> = { annual_exam: '#33357f', progress_report: '#4a6fa5', class_test: '#4b5563', term_end: '#17a2b8', scholarsheet: '#111827' };

export function reportCardEmailHtml(d: ReportCardData): string {
    const s = d.student || {};
    const family = familyOf(d.template, d.curriculum);
    const date = (x: any) => (x ? new Date(x).toLocaleDateString('en-GB') : '');
    const rows = (d.marks || []).map((m: any) => {
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
    const totalObtained = (d.marks || []).reduce((a: number, m: any) => a + Number(m.marksObtained || 0), 0);
    const totalOut = (d.marks || []).reduce((a: number, m: any) => a + Number(m.totalMarks || 100), 0);
    const overallPct = totalOut ? (totalObtained / totalOut) * 100 : 0;
    const passMark = Number(d.grading?.passMark) || 40;
    const result = overallText(overallPct, family, passMark);
    const passed = family === 'CBC' ? overallPct >= 51 : overallPct >= passMark;

    return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:0 auto;color:#1f2937">
      <div style="background:${EMAIL_HEAD[looksFor(d.template)]};color:#fff;padding:18px 22px;border-radius:10px 10px 0 0">
        <table style="width:100%"><tr>
          <td>${d.logo ? `<img src="${d.logo}" alt="logo" style="height:42px;vertical-align:middle;margin-right:10px"/>` : ''}<span style="font-size:18px;font-weight:800;vertical-align:middle">${d.school || 'School'}</span></td>
          <td style="text-align:right;font-size:12px;opacity:.9">Result Card</td>
        </tr></table>
      </div>
      <div style="border:1px solid #eee;border-top:0;padding:22px;border-radius:0 0 10px 10px">
        <p style="margin:0 0 12px">Dear Parent/Guardian,</p>
        <p style="margin:0 0 16px">Please find below the result card for your child. A printable PDF copy is attached.</p>
        <table style="width:100%;border-collapse:collapse;margin-bottom:14px;font-size:13px">
          <tr><td style="padding:4px 0;color:#6b7280;width:130px">Student</td><td style="padding:4px 0;font-weight:700;color:${EMAIL_HEAD[looksFor(d.template)]}">${s.studentName || ''}</td></tr>
          <tr><td style="padding:4px 0;color:#6b7280">Adm / Reg No</td><td style="padding:4px 0;font-weight:700">${s.registrationNo || s.admNo || '—'}</td></tr>
          <tr><td style="padding:4px 0;color:#6b7280">Class</td><td style="padding:4px 0;font-weight:700">${d.className || s.studentClass || ''}</td></tr>
          <tr><td style="padding:4px 0;color:#6b7280">Exam</td><td style="padding:4px 0;font-weight:700">${d.exam?.examName || d.exam?.name || 'Exam'}</td></tr>
          <tr><td style="padding:4px 0;color:#6b7280">Date</td><td style="padding:4px 0;font-weight:700">${date(d.exam?.date || d.exam?.examDate)}</td></tr>
        </table>
        <table style="width:100%;border-collapse:collapse">
          <thead><tr>
            <th style="background:${EMAIL_HEAD[looksFor(d.template)]};color:#fff;padding:9px 10px;font-size:11px;text-align:left;text-transform:uppercase">Subject</th>
            <th style="background:${EMAIL_HEAD[looksFor(d.template)]};color:#fff;padding:9px 10px;font-size:11px;text-transform:uppercase">Marks</th>
            <th style="background:${EMAIL_HEAD[looksFor(d.template)]};color:#fff;padding:9px 10px;font-size:11px;text-transform:uppercase">%</th>
            <th style="background:${EMAIL_HEAD[looksFor(d.template)]};color:#fff;padding:9px 10px;font-size:11px;text-transform:uppercase">${GRADE_HEADER[family]}</th>
          </tr></thead>
          <tbody>${rows || '<tr><td colspan="4" style="padding:12px;text-align:center;border:1px solid #e5e7eb;color:#9ca3af">No marks recorded.</td></tr>'}</tbody>
        </table>
        <table style="width:100%;margin-top:16px">
          <tr>
            <td style="border:1px solid #e5e7eb;border-radius:8px;padding:12px;text-align:center"><div style="font-size:10px;color:#9ca3af;text-transform:uppercase;font-weight:700">Overall</div><div style="font-size:18px;font-weight:800;color:${EMAIL_HEAD[looksFor(d.template)]}">${overallPct.toFixed(1)}%</div></td>
            <td style="width:10px"></td>
            <td style="border:1px solid #e5e7eb;border-radius:8px;padding:12px;text-align:center"><div style="font-size:10px;color:#9ca3af;text-transform:uppercase;font-weight:700">${family === 'CBC' ? 'Level' : 'Grade'}</div><div style="font-size:18px;font-weight:800;color:${EMAIL_HEAD[looksFor(d.template)]}">${gradeFor(overallPct, d.grading, family)}</div></td>
            <td style="width:10px"></td>
            <td style="border:1px solid #e5e7eb;border-radius:8px;padding:12px;text-align:center"><div style="font-size:10px;color:#9ca3af;text-transform:uppercase;font-weight:700">Result</div><div style="font-size:16px;font-weight:800;color:${passed ? '#16a34a' : '#dc2626'}">${result}</div></td>
          </tr>
        </table>
        <p style="color:#9ca3af;font-size:12px;margin-top:20px">Regards,<br/>${d.school || 'The School'}</p>
      </div>
    </div>`;
}

// Reuse one Chromium instance for the whole batch.
let browser: Browser | null = null;
const getBrowser = async () => {
    if (!browser) browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    return browser;
};

export async function htmlToPdf(html: string): Promise<Buffer> {
    const b = await getBrowser();
    const page = await b.newPage();
    try {
        await page.setContent(html, { waitUntil: 'networkidle0' });
        const pdf = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '12mm', bottom: '12mm', left: '10mm', right: '10mm' } });
        return Buffer.from(pdf);
    } finally {
        await page.close().catch(() => {});
    }
}

export async function closeReportBrowser() {
    if (browser) { await browser.close().catch(() => {}); browser = null; }
}
