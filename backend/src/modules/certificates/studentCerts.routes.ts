/**
 * Certificates issued to students (graduation, leaving, transfer, sports …), each with a certificate
 * number and a QR code that opens a public page confirming it is genuine:
 *
 *   tenant API   GET/POST /students/:id/certificates      list / issue
 *                POST     /student-certificates/:certId/revoke
 *                POST     /reports/verify-link             QR link for a report card
 *   public API   GET /api/v1/public/verify/certificate/:school/:certId
 *                GET /api/v1/public/verify/report/:school/:token
 *
 * Collection: `issued_certificates` (tenant DB).
 */
import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { ObjectId, Db } from 'mongodb';
import { getMetaDb } from '../../lib/mongodb';
import { enforceCrud } from '../../lib/permissions';
import { resolveScope, scopeForCollection, mergeFilter } from '../../lib/dataScope';
import { canonicalStatus } from '../../lib/studentStatus';
import { maskName, maskRef, signToken, readToken, schoolFromSlug, schoolBrand, publicAppUrl } from '../../lib/verifyDocs';
import { findExamByCode, sigMatches, resultSnapshot } from '../../lib/resultLink';
import { yearlyFor, isYearlyKey } from '../../lib/yearlyReport';

export const CERT_TYPES: Record<string, string> = {
    graduation: 'Graduation Certificate', recommendation: 'Letter of Recommendation', leaving: 'School Leaving Certificate',
    transfer: 'Transfer Certificate', sports: 'Sports Certificate', achievement: 'Certificate of Achievement',
    participation: 'Certificate of Participation', academic: 'Academic Excellence Certificate', conduct: 'Good Conduct Certificate',
    attendance: 'Perfect Attendance Certificate', appreciation: 'Certificate of Appreciation', character: 'Character Certificate',
};
const STYLES = ['arcs', 'frame', 'ornate', 'waves', 'stripes', 'gold'];

const str = (v: any, max = 500) => String(v ?? '').trim().slice(0, max);
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';   // no 0/O/1/I/L — easy to read out and type
const newCertId = () => 'CN' + Array.from(crypto.randomBytes(8)).map(b => ALPHABET[b % ALPHABET.length]).join('');
const db = (req: Request): Db => (req as any).tenantDb || getMetaDb();

/**
 * Issue one certificate to a student (stored in issued_certificates with its own number for the
 * QR check). Used by the student profile and by bulk issuing (e.g. sports participation).
 */
export async function issueStudentCertificate(req: Request, s: any, b: any, extra: Record<string, any> = {}): Promise<any> {
    const d = db(req);
    const type = String(b.type || '');
    if (!CERT_TYPES[type]) return { error: 'Choose a certificate type.' };
    const style = STYLES.includes(b.style) ? b.style : 'gold';
    const title = str(b.title, 120) || CERT_TYPES[type];
    const body = str(b.body, 1200);
    if (!body) return { error: 'Write what the certificate is awarded for.' };

    let certId = newCertId();
    for (let i = 0; i < 5 && await d.collection('issued_certificates').findOne({ certId }); i++) certId = newCertId();
    const actor = (req as any).tenantContext?.user || {};
    const doc = {
        certId, type, typeLabel: CERT_TYPES[type], style, title, subtitle: str(b.subtitle, 120), body,
        date: /^\d{4}-\d{2}-\d{2}$/.test(b.date) ? b.date : new Date().toISOString().slice(0, 10),
        signatories: (Array.isArray(b.signatories) ? b.signatories : []).slice(0, 3).map((x: any) => ({ name: str(x?.name, 100), title: str(x?.title, 100) })),
        studentId: String(s._id), studentName: s.studentName || s.name || `${s.firstName || ''} ${s.lastName || ''}`.trim(),
        registrationNo: s.registrationNo || s.admNo || '', className: s.studentClass || s.currentClass || s.statusPrevClass?.studentClass || '', gender: s.gender || '',
        status: 'valid', issuedAt: new Date(), issuedBy: actor.name || actor.staffId || 'admin',
        ...extra,
    };
    await d.collection('issued_certificates').insertOne(doc as any);
    const slug = String((req as any).tenantContext?.tenantSubdomain || '').toLowerCase();
    return { ...doc, verifyUrl: `${publicAppUrl()}/${slug}/certificate/verify/online/${certId}` };
}

// ═════════════════════════ tenant API ═════════════════════════
export const studentCertRouter = Router();

async function loadStudent(req: Request) {
    let oid: ObjectId; try { oid = new ObjectId(req.params.id); } catch { return null; }
    const d = db(req); const scope = await resolveScope(req, d);
    return (await d.collection('students').findOne(mergeFilter({ _id: oid }, scopeForCollection('students', scope)))) as any;
}

studentCertRouter.get('/students/:id/certificates', async (req, res) => {
    try {
        const s = await loadStudent(req); if (!s) return res.status(404).json({ message: 'Student not found' });
        const rows = await db(req).collection('issued_certificates').find({ studentId: String(s._id) }).sort({ issuedAt: -1 }).toArray();
        const slug = String((req as any).tenantContext?.tenantSubdomain || '').toLowerCase();
        res.json(rows.map(r => ({ ...r, verifyUrl: `${publicAppUrl()}/${slug}/certificate/verify/online/${r.certId}` })));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

studentCertRouter.post('/students/:id/certificates', enforceCrud('certificates', 'create'), async (req, res) => {
    try {
        const s = await loadStudent(req); if (!s) return res.status(404).json({ message: 'Student not found' });
        const b = req.body || {};
        const type = String(b.type || '');
        if (!CERT_TYPES[type]) return res.status(400).json({ message: 'Choose a certificate type.' });
        // A transfer certificate exists only for a student who has been transferred.
        if (type === 'transfer' && canonicalStatus(s.status) !== 'Transferred') return res.status(409).json({ message: 'A transfer certificate can only be issued to a student who has been transferred.' });
        const doc = await issueStudentCertificate(req, s, b);
        if (doc.error) return res.status(400).json({ message: doc.error });
        res.status(201).json(doc);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

studentCertRouter.post('/student-certificates/:certId/revoke', enforceCrud('certificates', 'delete'), async (req, res) => {
    try {
        const r = await db(req).collection('issued_certificates').updateOne({ certId: str(req.params.certId, 20) }, { $set: { status: 'revoked', revokedAt: new Date(), revokeReason: str(req.body?.reason, 300) } });
        if (!r.matchedCount) return res.status(404).json({ message: 'Certificate not found' });
        res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// A report card's QR: a signed link (nothing to store — the signature proves the school issued it).
studentCertRouter.post('/reports/verify-link', async (req, res) => {
    try {
        const d = db(req); const b = req.body || {};
        let oid: ObjectId; try { oid = new ObjectId(String(b.studentId)); } catch { return res.status(400).json({ message: 'Invalid student' }); }
        const scope = await resolveScope(req, d);
        const s: any = await d.collection('students').findOne(mergeFilter({ _id: oid }, scopeForCollection('students', scope)));
        if (!s) return res.status(404).json({ message: 'Student not found' });
        const slug = String((req as any).tenantContext?.tenantSubdomain || '').toLowerCase();
        const token = signToken({ s: String(s._id), n: s.studentName || s.name || '', r: s.registrationNo || '', c: str(b.className, 60) || s.studentClass || '', t: str(b.term, 40), y: str(b.year, 10), e: str(b.exam, 80), a: b.average != null ? Number(b.average) : null, g: str(b.grade, 8), at: Date.now() });
        res.json({ url: `${publicAppUrl()}/${slug}/report/verify/online/${token}` });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ═════════════════════════ public API ═════════════════════════
export const publicVerifyRouter = Router();

publicVerifyRouter.get('/paper/:school/:token', async (req, res) => {
    try {
        const found = await schoolFromSlug(req.params.school);
        const data = found ? readToken<any>(req.params.token) : null;
        if (!found || !data) return res.status(404).json({ valid: false, message: 'This verification link is invalid.' });
        res.json({
            valid: true, school: schoolBrand(found.tenant),
            paper: {
                title: data.title, subject: data.subject, className: data.className,
                holder: data.studentName ? maskName(data.studentName) : '', registrationNo: data.admNo ? maskRef(data.admNo) : '',
                issuedAt: data.at,
            },
        });
    } catch (e: any) { res.status(500).json({ valid: false, message: e.message }); }
});

publicVerifyRouter.get('/certificate/:school/:certId', async (req, res) => {
    try {
        const found = await schoolFromSlug(req.params.school);
        const id = str(req.params.certId, 20).toUpperCase();
        const cert: any = found && /^[A-Z0-9]{6,16}$/.test(id) ? await found.db.collection('issued_certificates').findOne({ certId: id }) : null;
        if (!found || !cert) return res.status(404).json({ valid: false, message: 'No certificate with this number was found for this school.' });
        const masked = maskName(cert.studentName);
        res.json({
            valid: cert.status === 'valid', status: cert.status, school: schoolBrand(found.tenant),
            certificate: {
                id: cert.certId, type: cert.type, typeLabel: cert.typeLabel, title: cert.title, subtitle: cert.subtitle || '',
                holder: masked, registrationNo: maskRef(cert.registrationNo), className: cert.className || '', issuedAt: cert.issuedAt, date: cert.date,
                // the printed wording, with the holder's full name hidden the same way
                body: cert.studentName ? String(cert.body).split(cert.studentName).join(masked) : cert.body,
                signatories: (cert.signatories || []).map((x: any) => ({ title: x.title })),   // titles only — names aren't needed to verify
                ...(cert.status === 'revoked' ? { revokedAt: cert.revokedAt } : {}),
            },
        });
    } catch (e: any) { res.status(500).json({ valid: false, message: e.message }); }
});

publicVerifyRouter.get('/report/:school/:token', async (req, res) => {
    try {
        const p: any = readToken(req.params.token);
        const found = await schoolFromSlug(req.params.school);
        if (!p || !found) return res.status(404).json({ valid: false, message: 'This report card link is not valid.' });
        let student: any = null; try { student = await found.db.collection('students').findOne({ _id: new ObjectId(String(p.s)) }); } catch { /* */ }
        if (!student) return res.status(404).json({ valid: false, message: 'This student is not on the school records.' });
        res.json({
            valid: true, school: schoolBrand(found.tenant),
            report: { holder: maskName(p.n), registrationNo: maskRef(p.r), className: p.c, term: p.t, year: p.y, exam: p.e, average: p.a, grade: p.g, issuedAt: new Date(Number(p.at) || Date.now()) },
        });
    } catch (e: any) { res.status(500).json({ valid: false, message: e.message }); }
});

// A parent's "check the result online" link:  /<school>/result/<exam code>/<result id>/<student id>
// The result id is a signature over school + exam + student, so only a link the school made will open.
publicVerifyRouter.get('/result/:school/:examCode/:resultId/:studentId', async (req, res) => {
    try {
        const found = await schoolFromSlug(req.params.school);
        const studentId = str(req.params.studentId, 30);
        const code = str(req.params.examCode, 8).toUpperCase();
        if (isYearlyKey(code)) {   // whole-year report: Y2027
            const okY = !!found && /^[a-f0-9]{24}$/i.test(studentId) && sigMatches(String(found.tenant.subdomain).toLowerCase(), code, studentId, str(req.params.resultId, 40));
            const stu: any = okY ? await found!.db.collection('students').findOne({ _id: new ObjectId(studentId) }).catch(() => null) : null;
            const y = stu ? (await yearlyFor(found!.db, [stu], code.slice(1))).get(studentId) : null;
            if (!y || !y.subjects.length) return res.status(404).json({ valid: false, message: 'This result link is not valid, or the report is not available yet.' });
            return res.json({ valid: true, school: schoolBrand(found!.tenant), yearly: y });
        }
        const exam = found ? await findExamByCode(found.db, req.params.examCode) : null;
        const ok = !!found && !!exam && /^[a-f0-9]{24}$/i.test(studentId) && sigMatches(String(found.tenant.subdomain).toLowerCase(), String(exam._id), studentId, str(req.params.resultId, 40));
        const snap = ok ? await resultSnapshot(found!.db, String(exam._id), studentId) : null;
        if (!ok || !snap) return res.status(404).json({ valid: false, message: 'This result link is not valid, or the result is not available yet.' });
        res.json({ valid: true, school: schoolBrand(found!.tenant), result: snap });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});
