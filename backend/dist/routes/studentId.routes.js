"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const puppeteer_1 = __importDefault(require("puppeteer"));
const router = (0, express_1.Router)();
const getDb = (req) => req.tenantDb;
// Fetch an image (QR / barcode) and return a base64 data URI — no npm package needed.
const fetchB64 = async (url) => {
    try {
        const r = await fetch(url);
        const buf = Buffer.from(await r.arrayBuffer());
        return `data:image/png;base64,${buf.toString('base64')}`;
    }
    catch {
        return '';
    }
};
const walletUrlFor = (req, regNumber) => {
    const host = String(req.headers['x-tenant-subdomain'] || '').trim();
    const base = host ? `https://${host}.shulecloud.com` : 'https://shulecloud.com';
    return `${base}/wallet/${encodeURIComponent(regNumber)}`;
};
// QR (qrserver) + Code128 barcode (bwip-js web API) as base64 data URIs.
const genImages = async (req, regNumber) => {
    const walletUrl = walletUrlFor(req, regNumber);
    const [qr, barcode] = await Promise.all([
        fetchB64(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=0&data=${encodeURIComponent(walletUrl)}`),
        fetchB64(`https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(regNumber)}&scale=3&height=10&includetext=false`),
    ]);
    return { qr, barcode, walletUrl };
};
// ── POST /api/v1/student-id ───────────────────────────────────────────────────
// Saves the card data (synced:false for offline POS sync) and returns base64
// QR + barcode ready for printing.
router.post('/student-id', async (req, res) => {
    try {
        const db = getDb(req);
        const { name, regNumber, course, yearOfStudy, school, faculty, bloodGroup, expiry } = req.body || {};
        if (!name || !regNumber)
            return res.status(400).json({ message: 'name and regNumber are required' });
        const { qr, barcode, walletUrl } = await genImages(req, regNumber);
        const doc = { name, regNumber, course: course || '', yearOfStudy: yearOfStudy || '', school: school || '', faculty: faculty || '', bloodGroup: bloodGroup || '', expiry: expiry || '', walletUrl, synced: false, updatedAt: new Date() };
        await db.collection('student_id_cards').updateOne({ regNumber }, { $set: doc, $setOnInsert: { createdAt: new Date() } }, { upsert: true });
        res.json({ data: { ...doc }, qr, barcode, walletUrl });
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
});
// ── Card HTML (Classic Navy) — used for the print-ready PDF ────────────────────
const NAVY = '#0f2548';
const cardHtml = (d, qr, barcode) => {
    const cropMark = (pos) => `<div class="crop ${pos}"></div>`;
    const corners = ['tl', 'tr', 'bl', 'br'].map(cropMark).join('');
    const front = `
      <div class="bleed">${corners}
        <div class="card front">
          <div class="hdr">
            <div class="logo">${(d.school || 'U')[0]}</div>
            <div><div class="sname">${d.school || 'University'}</div><div class="fac">${(d.faculty || '').toUpperCase()}</div></div>
            <div class="yr">${d.expiry ? d.expiry.replace(/\\D+/g, '').slice(-2) : ''}</div>
          </div>
          <div class="body">
            <div class="photo">PHOTO</div>
            <div class="details">
              <div class="name">${d.name || ''}</div>
              <div class="course">${d.course || ''}${d.yearOfStudy ? ' · ' + d.yearOfStudy : ''}</div>
              <div class="grid">
                <div><span>REG NO.</span><b>${d.regNumber || ''}</b></div>
                <div><span>BLOOD</span><b>${d.bloodGroup || ''}</b></div>
                <div><span>FACULTY</span><b>${(d.faculty || '').split('&')[0].trim() || '—'}</b></div>
                <div><span>EXPIRES</span><b>${d.expiry || ''}</b></div>
              </div>
            </div>
          </div>
          <div class="strip">${barcode ? `<img class="bar" src="${barcode}"/>` : ''}<span class="rn">${(d.regNumber || '').replace(/\\W/g, '')}</span><div class="chip"></div></div>
        </div>
      </div>`;
    const back = `
      <div class="bleed">${corners}
        <div class="card back">
          <div class="back-lbl">SCAN FOR STUDENT WALLET</div>
          ${qr ? `<img class="qr" src="${qr}"/>` : ''}
          <div class="back-rn">${d.regNumber || ''}</div>
        </div>
      </div>`;
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      * { margin:0; padding:0; box-sizing:border-box; font-family: Arial, Helvetica, sans-serif; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
      @page { size: 97.6mm 66mm; margin:0; }
      .bleed { position:relative; width:97.6mm; height:66mm; display:flex; align-items:center; justify-content:center; page-break-after:always; }
      .crop { position:absolute; width:4mm; height:4mm; }
      .crop.tl { top:1mm; left:1mm; border-left:0.3mm solid #000; border-top:0.3mm solid #000; }
      .crop.tr { top:1mm; right:1mm; border-right:0.3mm solid #000; border-top:0.3mm solid #000; }
      .crop.bl { bottom:1mm; left:1mm; border-left:0.3mm solid #000; border-bottom:0.3mm solid #000; }
      .crop.br { bottom:1mm; right:1mm; border-right:0.3mm solid #000; border-bottom:0.3mm solid #000; }
      .card { width:85.6mm; height:54mm; border-radius:3mm; overflow:hidden; background:#fff; box-shadow:0 0 0 0.2mm #ddd; }
      .front .hdr { display:flex; align-items:center; gap:2mm; padding:2.5mm 3mm; background:#fff; }
      .logo { width:7mm; height:7mm; border-radius:50%; background:${NAVY}; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:3.5mm; }
      .sname { font-weight:800; color:${NAVY}; font-size:3mm; }
      .fac { font-size:1.8mm; letter-spacing:0.3mm; color:#64748b; font-weight:700; }
      .yr { margin-left:auto; background:${NAVY}; color:#fff; font-size:2mm; font-weight:800; padding:0.8mm 2mm; border-radius:3mm; }
      .body { background:${NAVY}; color:#fff; display:flex; gap:3mm; padding:3mm; height:34mm; }
      .photo { width:20mm; height:24mm; border-radius:2mm; background:#1c3a63; display:flex; align-items:center; justify-content:center; font-size:2mm; color:#5b7aa8; font-weight:800; }
      .details { flex:1; }
      .name { font-size:3.6mm; font-weight:800; }
      .course { font-size:2.2mm; color:#9db6da; margin:0.5mm 0 2mm; }
      .grid { display:grid; grid-template-columns:1fr 1fr; gap:1.5mm 3mm; }
      .grid span { display:block; font-size:1.6mm; color:#6f8db8; letter-spacing:0.2mm; font-weight:700; }
      .grid b { font-size:2.4mm; }
      .strip { background:#fff; height:9.5mm; display:flex; align-items:center; gap:2mm; padding:0 3mm; }
      .bar { height:6mm; }
      .rn { font-size:2mm; letter-spacing:1mm; color:#475569; font-weight:700; }
      .chip { margin-left:auto; width:6mm; height:5mm; border-radius:1mm; background:linear-gradient(135deg,#e8b94a,#c8902a); }
      .back { background:${NAVY}; color:#fff; display:flex; flex-direction:column; align-items:center; justify-content:center; }
      .back-lbl { font-size:2.4mm; font-weight:800; letter-spacing:0.4mm; color:#9db6da; margin-bottom:3mm; }
      .qr { width:26mm; height:26mm; background:#fff; padding:1.5mm; border-radius:2mm; }
      .back-rn { margin-top:3mm; font-size:2.4mm; letter-spacing:1mm; color:#cbd5e1; }
    </style></head><body>${front}${back}</body></html>`;
};
// ── POST /api/v1/student-id/pdf ───────────────────────────────────────────────
// Print-ready CR80 PDF (front + back, bleed + crop marks).
router.post('/student-id/pdf', async (req, res) => {
    let browser;
    try {
        const d = req.body || {};
        if (!d.regNumber)
            return res.status(400).json({ message: 'regNumber is required' });
        const { qr, barcode } = await genImages(req, d.regNumber);
        const html = cardHtml(d, qr, barcode);
        browser = await puppeteer_1.default.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
        const pdf = await page.pdf({ width: '97.6mm', height: '66mm', printBackground: true });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="id-${String(d.regNumber).replace(/\\W/g, '')}.pdf"`);
        res.send(Buffer.from(pdf));
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
    finally {
        if (browser)
            await browser.close().catch(() => { });
    }
});
exports.default = router;
