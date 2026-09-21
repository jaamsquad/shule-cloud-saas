/**
 * Certificate designs (landscape A4). Each is plain HTML + CSS so it prints and saves as PDF without any
 * image files, and takes the school's logo, the student's name, the wording, the signatories and a QR code.
 */
export interface CertData {
    style: string; title: string; subtitle?: string; name: string; body: string; date: string;
    signatories: { name: string; title: string }[]; certNo: string; qr: string;
    school: { name: string; logo?: string; address?: string; signature?: string; stamp?: string };
}

export const CERT_STYLES: { key: string; label: string; accent: string; note: string }[] = [
    { key: "gold", label: "Classic Gold", accent: "#c9a227", note: "Formal gold double border" },
    { key: "arcs", label: "Modern Arcs", accent: "#c9ac34", note: "Teal circles with gold lines" },
    { key: "frame", label: "Framed", accent: "#5b57b5", note: "Blue frame with medals" },
    { key: "ornate", label: "Ornate Red", accent: "#dc5a62", note: "Decorative red border" },
    { key: "waves", label: "Purple Waves", accent: "#7a1fbf", note: "Purple and orange waves" },
    { key: "stripes", label: "Bright Stripes", accent: "#f5a30a", note: "Colourful stripes, award badge" },
];

export const CERT_TYPES: { key: string; label: string; icon: string; subtitle: string; needsTransfer?: boolean }[] = [
    { key: "graduation", label: "Graduation", icon: "🎓", subtitle: "OF GRADUATION" },
    { key: "recommendation", label: "Recommendation", icon: "✉️", subtitle: "LETTER OF RECOMMENDATION" },
    { key: "leaving", label: "Leaving Certificate", icon: "🚪", subtitle: "SCHOOL LEAVING" },
    { key: "transfer", label: "Transfer Certificate", icon: "🔁", subtitle: "OF TRANSFER", needsTransfer: true },
    { key: "sports", label: "Sports", icon: "🏅", subtitle: "OF SPORTING EXCELLENCE" },
    { key: "achievement", label: "Achievement", icon: "🏆", subtitle: "OF ACHIEVEMENT" },
    { key: "participation", label: "Participation", icon: "🤝", subtitle: "OF PARTICIPATION" },
    { key: "academic", label: "Academic Excellence", icon: "📚", subtitle: "OF ACADEMIC EXCELLENCE" },
    { key: "conduct", label: "Good Conduct", icon: "🌟", subtitle: "OF GOOD CONDUCT" },
    { key: "attendance", label: "Perfect Attendance", icon: "📅", subtitle: "OF PERFECT ATTENDANCE" },
    { key: "appreciation", label: "Appreciation", icon: "💐", subtitle: "OF APPRECIATION" },
    { key: "character", label: "Character Certificate", icon: "🛡️", subtitle: "OF CHARACTER" },
];

const esc = (v: any) => String(v ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
const fmtDate = (iso: string) => { const d = new Date(String(iso).slice(0, 10) + "T00:00:00"); return isNaN(d.getTime()) ? esc(iso) : d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }); };
const SCRIPT = `'Brush Script MT','Lucida Handwriting','Segoe Script','Apple Chancery',cursive`;

// The wording, in the same order for every design — each design only changes colours, spacing and decoration.
function parts(d: CertData, o: { align?: "center" | "left"; nameColor: string; titleColor: string; text: string; lineColor: string; titleSize?: number; nameLine?: string }) {
    const align = o.align || "center";
    const sig = d.signatories.filter(s => s.name || s.title);
    // the principal's / head teacher's signature and the school stamp go on the line of the first head-of-school signatory
    const signer = Math.max(0, sig.findIndex(x => /principal|head|director/i.test(x.title)));
    const sigHtml = sig.map((s, i) => `<div class="sig"><div class="sname">${i === signer && d.school.signature ? `<img class="sigimg" src="${esc(d.school.signature)}" alt=""/>` : ""}${esc(s.name)}</div>${i === signer && d.school.stamp ? `<img class="stampimg" src="${esc(d.school.stamp)}" alt=""/>` : ""}<div class="sline" style="border-color:${o.lineColor}"></div><div class="stitle">${esc(s.title)}</div></div>`).join("");
    return {
        head: `<div class="head" style="text-align:${align}">${d.school.logo ? `<img src="${esc(d.school.logo)}" class="logo" alt=""/>` : ""}<div class="school">${esc(d.school.name)}</div></div>`,
        titleBlock: `<div class="title" style="color:${o.titleColor};font-size:${o.titleSize || 52}px;text-align:${align}">${esc(d.title)}</div>${d.subtitle ? `<div class="subtitle" style="color:${o.titleColor};text-align:${align}">${esc(d.subtitle)}</div>` : ""}`,
        grant: `<div class="grant" style="text-align:${align};color:${o.text}">This is hereby granted to</div>`,
        name: `<div class="name" style="color:${o.nameColor};text-align:${align};${o.nameLine ? `border-bottom:3px solid transparent;border-image:${o.nameLine} 1;display:inline-block;padding:0 40px 4px` : ""}">${esc(d.name)}</div>`,
        body: `<div class="body" style="text-align:${align};color:${o.text}">${esc(d.body).replace(/\n/g, "<br/>")}</div>`,
        footer: `<div class="foot"><div class="fdate"><div class="dv">${fmtDate(d.date)}</div><div class="sline" style="border-color:${o.lineColor}"></div><div class="stitle">Date</div></div>${d.qr ? `<div class="qrbox"><img src="${d.qr}" alt="QR"/><div class="cno">${esc(d.certNo)}</div></div>` : "<div></div>"}<div class="sigs">${sigHtml}</div></div>`,
    };
}

const BASE_CSS = `
@page{size:A4 landscape;margin:0}
*{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
html,body{width:1123px;height:794px;background:#fff;font-family:Arial,Helvetica,sans-serif}
.page{position:relative;width:1123px;height:794px;overflow:hidden}
.content{position:absolute;z-index:5}
.logo{height:74px;width:auto;object-fit:contain;display:block;margin:0 auto 6px}
.school{font-size:20px;font-weight:700;letter-spacing:.5px;text-transform:uppercase}
.title{font-weight:900;letter-spacing:2px;line-height:1.05;margin-top:8px}
.subtitle{font-size:22px;font-weight:700;font-style:italic;letter-spacing:1px;margin-top:8px}
.grant{font-size:20px;margin-top:34px;font-weight:600}
.name{font-family:${SCRIPT};font-size:52px;line-height:1.2;margin-top:8px}
.body{font-size:20px;line-height:1.7;margin:22px auto 0;max-width:680px}
.foot{display:flex;justify-content:space-between;align-items:flex-end;position:absolute;left:0;right:0;bottom:0}
.fdate{width:190px;text-align:center;white-space:nowrap}.dv{font-size:15px;padding-bottom:3px}
.sigs{display:flex;gap:26px;justify-content:flex-end}.sig{width:190px;text-align:center;position:relative}
.sigimg{position:absolute;left:50%;bottom:8px;transform:translateX(-50%);max-height:62px;max-width:170px;object-fit:contain}
.stampimg{position:absolute;right:-34px;bottom:-14px;width:88px;height:88px;object-fit:contain;opacity:.88;transform:rotate(-8deg)}
.sname{font-size:15px;min-height:20px;padding-bottom:3px}.sline{border-top:1.5px solid #000}.stitle{font-size:13px;font-weight:700;margin-top:3px}
.qrbox{text-align:center}.qrbox img{width:96px;height:96px;display:block;margin:0 auto}.cno{font-size:11px;font-weight:700;margin-top:2px;letter-spacing:.5px}
`;
const wrap = (css: string, inner: string) => `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${BASE_CSS}${css}</style></head><body><div class="page">${inner}</div></body></html>`;

// ── 1. Classic gold ────────────────────────────────────────────────────────
function gold(d: CertData) {
    const p = parts(d, { nameColor: "#8a6d0b", titleColor: "#b8901a", text: "#3a3320", lineColor: "#8a6d0b", titleSize: 50 });
    return wrap(`
      .page{background:#fffdf4}
      .b1{position:absolute;inset:22px;border:4px solid #c9a227}.b2{position:absolute;inset:36px;border:1.5px solid #c9a227}
      .c{position:absolute;width:46px;height:46px;border:4px solid #c9a227;background:#fffdf4}
      .c1{left:14px;top:14px;border-right:0;border-bottom:0}.c2{right:14px;top:14px;border-left:0;border-bottom:0}.c3{left:14px;bottom:14px;border-right:0;border-top:0}.c4{right:14px;bottom:14px;border-left:0;border-top:0}
      .content{left:90px;right:90px;top:64px;bottom:64px;font-family:Georgia,'Times New Roman',serif}.title,.school,.grant,.body,.sname,.stitle{font-family:Georgia,'Times New Roman',serif}`,
      `<div class="b1"></div><div class="b2"></div><div class="c c1"></div><div class="c c2"></div><div class="c c3"></div><div class="c c4"></div>
       <div class="content">${p.head}${p.titleBlock}${p.grant}<div style="text-align:center">${p.name}</div>${p.body}${p.footer}</div>`);
}

// ── 2. Modern arcs (left-aligned, teal circles, gold lines) ────────────────
function arcs(d: CertData) {
    const p = parts(d, { align: "left", nameColor: "#111", titleColor: "#c9ac34", text: "#111", lineColor: "#111", titleSize: 64 });
    return wrap(`
      .cir{position:absolute;border-radius:50%}
      .t1{width:900px;height:900px;background:#587a82;right:-470px;top:-90px}.t2{width:820px;height:820px;background:#587a82;right:-470px;top:300px}
      .g1{width:940px;height:940px;border:5px solid #d8b845;right:-430px;top:-120px;border-left-color:#d8b845;border-top-color:transparent;border-bottom-color:transparent}
      .g2{width:820px;height:820px;border:4px solid #e7d276;right:-330px;top:340px;border-color:#e7d276 transparent transparent #e7d276}
      .ga{width:520px;height:520px;border:4px solid #e2cf7a;left:-330px;top:-330px;border-color:transparent #e2cf7a transparent transparent}
      .gb{width:640px;height:640px;border:6px solid #cfa64a;left:-250px;bottom:-560px;border-color:#cfa64a #e9d98a transparent transparent}
      .content{left:110px;top:56px;width:800px;bottom:70px}.head{display:flex;align-items:center;gap:26px;text-align:left}.logo{margin:0;height:96px}
      .school{font-size:16px;color:#444}.grant{margin-top:30px}.name{font-size:56px}.body{margin-left:0;max-width:560px}
      .foot{left:0;right:auto;width:780px}.qrbox{margin:0 30px}
      .qr-top{position:absolute;left:340px;top:56px;text-align:center}`,
      `<div class="cir t2"></div><div class="cir t1"></div><div class="cir g1"></div><div class="cir g2"></div><div class="cir ga"></div><div class="cir gb"></div>
       <div class="content">${p.head}${p.titleBlock}${p.grant}${p.name}${p.body}${p.footer}</div>`);
}

// ── 3. Framed (grey mount, blue frame, medals) ─────────────────────────────
function frame(d: CertData) {
    const p = parts(d, { nameColor: "#111", titleColor: "#111", text: "#222", lineColor: "#555", titleSize: 44 });
    const medal = `<svg width="90" height="110" viewBox="0 0 90 110"><path d="M10 0h14l16 34-14 6z" fill="#3c4fa0"/><path d="M28 0h14l10 30-14 8z" fill="#d94c4c"/><path d="M46 0h14L44 36l-12-4z" fill="#3c4fa0"/><circle cx="34" cy="70" r="26" fill="#e3b93c"/><circle cx="34" cy="70" r="19" fill="none" stroke="#b98b16" stroke-width="3"/><text x="34" y="78" font-size="24" font-weight="900" text-anchor="middle" fill="#b98b16">1</text></svg>`;
    const star = `<svg width="110" height="110" viewBox="0 0 110 110"><circle cx="55" cy="55" r="46" fill="#5b57b5" opacity=".12"/><path d="M55 14l11 27 29 2-22 19 7 28-25-15-25 15 7-28-22-19 29-2z" fill="#5b57b5"/></svg>`;
    return wrap(`
      .page{background:#98999d}.in{position:absolute;inset:36px;background:#fff}.fr{position:absolute;inset:52px;border:12px solid #6a63be}
      .content{left:110px;right:110px;top:80px;bottom:72px}.title{font-family:Arial,sans-serif}.name{font-family:Arial,sans-serif;font-weight:700;font-size:34px}.body{font-size:16px}
      .m1{position:absolute;left:84px;top:84px}.m2{position:absolute;right:84px;top:84px}`,
      `<div class="in"></div><div class="fr"></div><div class="m1">${medal}</div><div class="m2">${star}</div>
       <div class="content">${p.head}${p.titleBlock}${p.grant}<div style="text-align:center">${p.name}</div>${p.body}${p.footer}</div>`);
}

// ── 4. Ornate red border (degree style) ────────────────────────────────────
function ornate(d: CertData) {
    const p = parts(d, { nameColor: "#111", titleColor: "#111", text: "#222", lineColor: "#333", titleSize: 40 });
    return wrap(`
      .ring{position:absolute;inset:14px;border-radius:6px;background:radial-gradient(circle,#dc5a62 34%,transparent 37%) 0 0/18px 18px,#fff;padding:0}
      .ringin{position:absolute;inset:44px;background:#fff;border:2px solid #dc5a62}.ringin2{position:absolute;inset:52px;border:1px solid #f0a4a9}
      .k{position:absolute;width:120px;height:120px;border-radius:50%;border:10px double #dc5a62;background:#fff}
      .k1{left:-26px;top:-26px}.k2{right:-26px;top:-26px}.k3{left:-26px;bottom:-26px}.k4{right:-26px;bottom:-26px}
      .wm{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font-size:260px;color:#dc5a62;opacity:.05;font-weight:900;font-family:Georgia,serif}
      .content{left:120px;right:120px;top:84px;bottom:84px}.title{font-family:Arial,sans-serif}.school{font-size:30px;font-weight:800;text-transform:none;letter-spacing:0}
      .name{font-family:Arial,sans-serif;font-weight:800;text-decoration:underline;font-size:32px}.grant{font-family:${SCRIPT};font-size:26px;font-weight:400}`,
      `<div class="ring"></div><div class="ringin"></div><div class="ringin2"></div><div class="k k1"></div><div class="k k2"></div><div class="k k3"></div><div class="k k4"></div><div class="wm">✦</div>
       <div class="content">${p.head}${p.titleBlock}${p.grant}<div style="text-align:center">${p.name}</div>${p.body}${p.footer}</div>`);
}

// ── 5. Purple + orange waves ───────────────────────────────────────────────
function waves(d: CertData) {
    const p = parts(d, { nameColor: "#7a1fbf", titleColor: "#7a1fbf", text: "#111", lineColor: "#111", titleSize: 58, nameLine: "linear-gradient(90deg,#f6b400,#f6b400)" });
    return wrap(`
      .w{position:absolute;border-radius:50%}
      .a1{width:560px;height:300px;background:#6f19a8;left:-160px;top:-110px;transform:rotate(-24deg)}
      .a2{width:660px;height:120px;background:#f59a1e;left:-130px;top:50px;transform:rotate(-30deg);border-radius:60px}
      .a3{width:640px;height:56px;background:#c9c9cf;left:-120px;top:-6px;transform:rotate(-30deg);border-radius:40px}
      .b1{width:560px;height:260px;background:#6f19a8;right:-230px;bottom:-150px;transform:rotate(-20deg)}
      .b2{width:600px;height:90px;background:#f59a1e;right:-240px;bottom:10px;transform:rotate(-32deg);border-radius:60px}
      .b3{width:560px;height:44px;background:#c9c9cf;right:-210px;bottom:-16px;transform:rotate(-32deg);border-radius:40px}
      .dots{position:absolute;left:24px;top:24px;width:120px;height:26px;background:radial-gradient(circle,#fff 3px,transparent 4px) 0 0/16px 16px}
      .content{left:150px;right:190px;top:44px;bottom:62px}.foot{left:0;right:-40px}.title{letter-spacing:1px}`,
      `<div class="w a3"></div><div class="w a2"></div><div class="w a1"></div><div class="w b3"></div><div class="w b2"></div><div class="w b1"></div><div class="dots"></div>
       <div class="content">${p.head}${p.titleBlock}${p.grant}<div style="text-align:center">${p.name}</div>${p.body}${p.footer}</div>`);
}

// ── 6. Bright stripes with a "best award" badge ────────────────────────────
function stripes(d: CertData) {
    const p = parts(d, { nameColor: "#f5a30a", titleColor: "#12119a", text: "#12119a", lineColor: "#12119a", titleSize: 62, nameLine: "linear-gradient(90deg,#f6d02f,#f1642e)" });
    const pill = (c: string, l: number, t: number, w: number, r: number) => `<div style="position:absolute;left:${l}px;top:${t}px;width:${w}px;height:74px;border-radius:40px;background:${c};transform:rotate(${r}deg)"></div>`;
    const badge = `<svg width="150" height="190" viewBox="0 0 150 190"><path d="M45 130l-15 58 45-24 45 24-15-58z" fill="#f08a24"/><path d="M75 4l12 12 17-4 7 16 17 4-2 18 14 12-10 15 6 17-16 8-1 18-18-1-12 13-16-9-16 9-12-13-18 1-1-18-16-8 6-17-10-15 14-12-2-18 17-4 7-16 17 4z" fill="#f4b73a"/><circle cx="75" cy="88" r="52" fill="none" stroke="#fff" stroke-width="3"/><text x="75" y="80" font-size="22" font-weight="900" text-anchor="middle" fill="#fff">BEST</text><text x="75" y="106" font-size="22" font-weight="900" text-anchor="middle" fill="#fff">AWARD</text><text x="75" y="62" font-size="11" text-anchor="middle" fill="#fff">★ ★ ★</text></svg>`;
    return wrap(`
      .content{left:265px;right:265px;top:40px;bottom:60px}.title{letter-spacing:1px}.subtitle{font-style:normal;font-family:Arial,sans-serif;color:#d11fb7 !important}
      .foot{left:-70px;right:-70px}.bd{position:absolute;right:250px;top:415px;z-index:6;transform:scale(.8);transform-origin:top right}`,
      `${pill("#f6c62b", -40, 40, 360, 55)}${pill("#8f2bb5", -60, 120, 420, 55)}${pill("#e2469b", -70, 210, 420, 55)}${pill("#0c5fa6", -60, 320, 460, 55)}${pill("#16a8d8", -70, 440, 420, 55)}
       ${pill("#16a8d8", 830, 420, 440, -55)}${pill("#f6c62b", 850, 540, 400, -55)}${pill("#8f2bb5", 880, 300, 400, -55)}${pill("#f08a24", 900, 180, 380, -55)}${pill("#e2469b", 930, 90, 340, -55)}
       <div class="bd">${badge}</div><div class="content">${p.head}${p.titleBlock}${p.grant}<div style="text-align:center">${p.name}</div>${p.body}${p.footer}</div>`);
}

const RENDER: Record<string, (d: CertData) => string> = { gold, arcs, frame, ornate, waves, stripes };
export const certificateHtml = (d: CertData) => (RENDER[d.style] || gold)(d);

/** Default wording for each type. {school}, {class}, {he}, {his}, {year} … are filled from the student. */
export function defaultBody(type: string, ctx: { school: string; className: string; gender?: string; admission?: string; year: string; transferTo?: string; transferDate?: string; date?: string }): string {
    const g = String(ctx.gender || "").toLowerCase();
    const he = g.startsWith("f") ? "she" : g.startsWith("m") ? "he" : "they", his = g.startsWith("f") ? "her" : g.startsWith("m") ? "his" : "their", him = g.startsWith("f") ? "her" : g.startsWith("m") ? "him" : "them";
    const cls = ctx.className ? ` (${ctx.className})` : "";
    const T: Record<string, string> = {
        graduation: `has successfully completed the prescribed course of study at ${ctx.school}${cls} and has fulfilled all the requirements for graduation in the year ${ctx.year}.`,
        recommendation: `is a student of ${ctx.school}${cls}. During ${his} time with us ${he} has shown good character, diligence and respect for others. We have no hesitation in recommending ${him} to any institution or employer.`,
        leaving: `was a student of ${ctx.school}${ctx.admission ? ` from ${ctx.admission}` : ""}${ctx.className ? `, last in ${ctx.className}` : ""}. ${he.charAt(0).toUpperCase() + he.slice(1)} has left the school in good standing and ${his} conduct during ${his} stay was satisfactory.`,
        transfer: `was a student of ${ctx.school}${ctx.className ? `, last in ${ctx.className}` : ""}, and has been transferred to ${ctx.transferTo || "another school"}${ctx.transferDate ? ` with effect from ${ctx.transferDate}` : ""}. ${he.charAt(0).toUpperCase() + he.slice(1)} leaves without any outstanding obligation to this school.`,
        sports: `for outstanding performance and sportsmanship in the inter-school sports competition, and for representing ${ctx.school} with distinction.`,
        achievement: `in recognition of outstanding achievement and dedication demonstrated during the ${ctx.year} academic year.`,
        participation: `for the willingness to participate and valuable contribution in the school event held in ${ctx.year}.`,
        academic: `for excellent academic performance and consistent hard work during the ${ctx.year} academic year.`,
        conduct: `for exemplary discipline, respect and good conduct throughout the ${ctx.year} academic year.`,
        attendance: `for a perfect attendance record during the ${ctx.year} academic year.`,
        appreciation: `in sincere appreciation of the valuable service and commitment shown to ${ctx.school}.`,
        character: `is a student of ${ctx.school}${cls} and, to the best of our knowledge, bears a good moral character.`,
    };
    return T[type] || "";
}
