import { Router, Request, Response } from 'express';
import { Db, ObjectId } from 'mongodb';
import { requireRole, getSchoolId, getRequestDb, getNextReceiptNo, postFeePaymentJournal } from './fees.routes';
import {
    N, round2, oid, openInvoices, invoiceBalance, applyAwardToOpenInvoices, reverseApplication,
    sponsorShare, sponsorshipLive, studentOutstanding, paySponsoredStudent,
} from '../services/feeAid.service';

/**
 * Scholarships/bursaries and sponsorships (see services/feeAid.service.ts for
 * how each affects invoices). Everything is admin/bursar only.
 */
const router = Router();
const admin = requireRole('ADMIN');
const db = (req: Request): Db => getRequestDb(req);
const who = (req: Request) => (req as any).user?.sub || (req as any).user?.id || 'admin';
const fail = (res: Response, e: any, code = 500) => res.status(code).json({ message: e?.message || String(e) });
const text = (v: any, max = 500) => String(v ?? '').trim().slice(0, max);
const date = (v: any) => { const d = v ? new Date(v) : null; return d && !isNaN(+d) ? d : null; };

async function loadStudents(d: Db, ids: string[]) {
    const oids = ids.map(oid).filter(Boolean) as ObjectId[];
    const rows = await d.collection('students').find({ _id: { $in: oids } }).toArray();
    return rows.map((s: any) => ({
        studentId: String(s._id),
        studentName: s.studentName || `${s.firstName || ''} ${s.lastName || ''}`.trim() || 'Student',
        registrationNo: s.registrationNo || s.admNo || '',
        className: s.studentClass || s.currentClass || s.className || '',
    }));
}

// ════════════════════════════════════════════════════════════════════════════
//  SCHOLARSHIPS
// ════════════════════════════════════════════════════════════════════════════

router.get('/fees/scholarships/summary', admin, async (req, res) => {
    try {
        const d = db(req);
        const [schemes, active, applied] = await Promise.all([
            d.collection('scholarship_schemes').countDocuments({ active: { $ne: false } }),
            d.collection('scholarship_awards').countDocuments({ status: 'active' }),
            d.collection('scholarship_applications').aggregate([{ $match: { reversed: { $ne: true } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]).toArray(),
        ]);
        res.json({ schemes, activeAwards: active, totalAwarded: round2(N(applied[0]?.total)) });
    } catch (e) { fail(res, e); }
});

// Schemes ---------------------------------------------------------------------
router.get('/fees/scholarships/schemes', admin, async (req, res) => {
    try {
        const d = db(req);
        const schemes = await d.collection('scholarship_schemes').find({}).sort({ createdAt: -1 }).toArray();
        const counts = await d.collection('scholarship_awards').aggregate([
            { $match: { status: 'active' } }, { $group: { _id: '$schemeId', n: { $sum: 1 }, applied: { $sum: '$totalApplied' } } },
        ]).toArray();
        const byId = Object.fromEntries(counts.map((c: any) => [c._id, c]));
        res.json(schemes.map((s: any) => ({ ...s, activeAwards: byId[String(s._id)]?.n || 0, totalApplied: round2(N(byId[String(s._id)]?.applied)) })));
    } catch (e) { fail(res, e); }
});

const schemeBody = (b: any) => {
    const valueType = b.valueType === 'fixed' ? 'fixed' : 'percent';
    const value = N(b.value);
    if (!text(b.name)) throw new Error('Scheme name is required');
    if (value <= 0) throw new Error('Enter a value greater than zero');
    if (valueType === 'percent' && value > 100) throw new Error('A percentage cannot be more than 100');
    return {
        name: text(b.name, 120), kind: ['scholarship', 'bursary', 'discount'].includes(b.kind) ? b.kind : 'scholarship',
        valueType, value, description: text(b.description, 1000), active: b.active !== false,
    };
};

router.post('/fees/scholarships/schemes', admin, async (req, res) => {
    try {
        const doc = { ...schemeBody(req.body), createdAt: new Date(), createdBy: who(req) };
        const r = await db(req).collection('scholarship_schemes').insertOne(doc);
        res.status(201).json({ ...doc, _id: r.insertedId });
    } catch (e: any) { fail(res, e, 400); }
});

router.put('/fees/scholarships/schemes/:id', admin, async (req, res) => {
    try {
        const body = schemeBody(req.body);
        const d = db(req);
        await d.collection('scholarship_schemes').updateOne({ _id: oid(req.params.id) as any }, { $set: { ...body, updatedAt: new Date() } });
        // Keep award labels in step with a renamed scheme (values on existing awards are left as awarded).
        await d.collection('scholarship_awards').updateMany({ schemeId: req.params.id }, { $set: { schemeName: body.name } });
        res.json({ ok: true });
    } catch (e: any) { fail(res, e, 400); }
});

router.delete('/fees/scholarships/schemes/:id', admin, async (req, res) => {
    try {
        const d = db(req);
        if (await d.collection('scholarship_awards').countDocuments({ schemeId: req.params.id })) {
            return res.status(409).json({ message: 'This scheme has awards. Deactivate it instead of deleting.' });
        }
        await d.collection('scholarship_schemes').deleteOne({ _id: oid(req.params.id) as any });
        res.json({ ok: true });
    } catch (e) { fail(res, e); }
});

// Awards ----------------------------------------------------------------------
router.get('/fees/scholarships/awards', admin, async (req, res) => {
    try {
        const q: any = {};
        if (req.query.status) q.status = String(req.query.status);
        if (req.query.schemeId) q.schemeId = String(req.query.schemeId);
        if (req.query.studentId) q.studentId = String(req.query.studentId);
        if (req.query.search) {
            const rx = new RegExp(String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            q.$or = [{ studentName: rx }, { registrationNo: rx }, { schemeName: rx }];
        }
        res.json(await db(req).collection('scholarship_awards').find(q).sort({ createdAt: -1 }).limit(1000).toArray());
    } catch (e) { fail(res, e); }
});

/** Award a scheme to one or many students. Optionally apply to their open invoices now. */
router.post('/fees/scholarships/awards', admin, async (req, res) => {
    try {
        const d = db(req);
        const scheme = await d.collection('scholarship_schemes').findOne({ _id: oid(req.body.schemeId) as any });
        if (!scheme) return res.status(400).json({ message: 'Choose a scholarship scheme' });
        if (scheme.active === false) return res.status(400).json({ message: 'This scheme is inactive' });
        const ids: string[] = Array.isArray(req.body.studentIds) ? req.body.studentIds.map(String) : [];
        if (!ids.length) return res.status(400).json({ message: 'Select at least one student' });

        // Per-award override of the scheme value (e.g. a 50% scheme given at 30%).
        const valueType = req.body.valueType === 'fixed' || req.body.valueType === 'percent' ? req.body.valueType : scheme.valueType;
        const value = req.body.value !== undefined && req.body.value !== '' ? N(req.body.value) : scheme.value;
        if (value <= 0 || (valueType === 'percent' && value > 100)) return res.status(400).json({ message: 'Invalid award value' });

        const students = await loadStudents(d, ids);
        const created: any[] = [], skipped: string[] = [];
        for (const s of students) {
            const dup = await d.collection('scholarship_awards').findOne({ schemeId: String(scheme._id), studentId: s.studentId, status: 'active' });
            if (dup) { skipped.push(s.studentName); continue; }
            const award = {
                schemeId: String(scheme._id), schemeName: scheme.name, kind: scheme.kind, ...s, valueType, value,
                startDate: date(req.body.startDate), endDate: date(req.body.endDate), notes: text(req.body.notes, 1000),
                status: 'active', totalApplied: 0, createdAt: new Date(), createdBy: who(req),
            };
            const r = await d.collection('scholarship_awards').insertOne(award);
            const full = { ...award, _id: r.insertedId };
            const applied = req.body.applyNow ? await applyAwardToOpenInvoices(d, full, who(req)) : { invoices: 0, amount: 0 };
            created.push({ ...full, applied });
        }
        res.status(201).json({ created: created.length, skipped, awards: created });
    } catch (e) { fail(res, e); }
});

router.put('/fees/scholarships/awards/:id', admin, async (req, res) => {
    try {
        const set: any = { updatedAt: new Date() };
        if (['active', 'suspended', 'ended'].includes(req.body.status)) set.status = req.body.status;
        if (req.body.value !== undefined) {
            const v = N(req.body.value);
            if (v <= 0) return res.status(400).json({ message: 'Invalid award value' });
            set.value = v;
        }
        if (req.body.valueType === 'percent' || req.body.valueType === 'fixed') set.valueType = req.body.valueType;
        if (set.valueType === 'percent' && N(set.value ?? 0) > 100) return res.status(400).json({ message: 'A percentage cannot be more than 100' });
        if ('startDate' in req.body) set.startDate = date(req.body.startDate);
        if ('endDate' in req.body) set.endDate = date(req.body.endDate);
        if ('notes' in req.body) set.notes = text(req.body.notes, 1000);
        await db(req).collection('scholarship_awards').updateOne({ _id: oid(req.params.id) as any }, { $set: set });
        res.json({ ok: true });
    } catch (e) { fail(res, e); }
});

router.delete('/fees/scholarships/awards/:id', admin, async (req, res) => {
    try {
        const d = db(req);
        const used = await d.collection('scholarship_applications').countDocuments({ awardId: req.params.id, reversed: { $ne: true } });
        if (used) {
            // Keep the audit trail: an award that has discounted invoices is ended, not deleted.
            await d.collection('scholarship_awards').updateOne({ _id: oid(req.params.id) as any }, { $set: { status: 'ended', endedAt: new Date() } });
            return res.json({ ok: true, ended: true });
        }
        await d.collection('scholarship_awards').deleteOne({ _id: oid(req.params.id) as any });
        res.json({ ok: true });
    } catch (e) { fail(res, e); }
});

router.post('/fees/scholarships/awards/:id/apply', admin, async (req, res) => {
    try {
        const d = db(req);
        const award = await d.collection('scholarship_awards').findOne({ _id: oid(req.params.id) as any });
        if (!award) return res.status(404).json({ message: 'Award not found' });
        if (award.status !== 'active') return res.status(400).json({ message: 'Only active awards can be applied' });
        res.json(await applyAwardToOpenInvoices(d, award, who(req)));
    } catch (e) { fail(res, e); }
});

router.get('/fees/scholarships/applications', admin, async (req, res) => {
    try {
        const q: any = {};
        if (req.query.awardId) q.awardId = String(req.query.awardId);
        if (req.query.studentId) q.studentId = String(req.query.studentId);
        res.json(await db(req).collection('scholarship_applications').find(q).sort({ createdAt: -1 }).limit(500).toArray());
    } catch (e) { fail(res, e); }
});

router.post('/fees/scholarships/applications/:id/reverse', admin, async (req, res) => {
    try {
        const ok = await reverseApplication(db(req), req.params.id, who(req));
        if (!ok) return res.status(404).json({ message: 'Already reversed or not found' });
        res.json({ ok: true });
    } catch (e) { fail(res, e); }
});

// ════════════════════════════════════════════════════════════════════════════
//  SPONSORS & SPONSORSHIPS
// ════════════════════════════════════════════════════════════════════════════

const SPONSOR_TYPES = ['individual', 'organisation', 'government', 'ngo', 'religious', 'alumni'];
const sponsorBody = (b: any) => {
    if (!text(b.name)) throw new Error('Sponsor name is required');
    return {
        name: text(b.name, 160), type: SPONSOR_TYPES.includes(b.type) ? b.type : 'organisation',
        contactPerson: text(b.contactPerson, 120), phone: text(b.phone, 40), email: text(b.email, 160),
        address: text(b.address, 300), notes: text(b.notes, 1000), active: b.active !== false,
    };
};

router.get('/fees/sponsors/summary', admin, async (req, res) => {
    try {
        const d = db(req);
        const [sponsors, students, paid] = await Promise.all([
            d.collection('sponsors').countDocuments({ active: { $ne: false } }),
            d.collection('sponsorships').countDocuments({ status: 'active' }),
            d.collection('sponsor_payments').aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]).toArray(),
        ]);
        res.json({ sponsors, sponsoredStudents: students, totalReceived: round2(N(paid[0]?.total)) });
    } catch (e) { fail(res, e); }
});

router.get('/fees/sponsors', admin, async (req, res) => {
    try {
        const d = db(req);
        const sponsors = await d.collection('sponsors').find({}).sort({ name: 1 }).toArray();
        const ships = await d.collection('sponsorships').aggregate([
            { $match: { status: 'active' } }, { $group: { _id: '$sponsorId', n: { $sum: 1 } } },
        ]).toArray();
        const pays = await d.collection('sponsor_payments').aggregate([{ $group: { _id: '$sponsorId', total: { $sum: '$amount' } } }]).toArray();
        const n = Object.fromEntries(ships.map((s: any) => [s._id, s.n]));
        const p = Object.fromEntries(pays.map((s: any) => [s._id, s.total]));
        res.json(sponsors.map((s: any) => ({ ...s, students: n[String(s._id)] || 0, totalPaid: round2(N(p[String(s._id)])) })));
    } catch (e) { fail(res, e); }
});

router.post('/fees/sponsors', admin, async (req, res) => {
    try {
        const doc = { ...sponsorBody(req.body), unallocated: 0, createdAt: new Date(), createdBy: who(req) };
        const r = await db(req).collection('sponsors').insertOne(doc);
        res.status(201).json({ ...doc, _id: r.insertedId });
    } catch (e: any) { fail(res, e, 400); }
});

router.put('/fees/sponsors/:id', admin, async (req, res) => {
    try {
        const body = sponsorBody(req.body);
        const d = db(req);
        await d.collection('sponsors').updateOne({ _id: oid(req.params.id) as any }, { $set: { ...body, updatedAt: new Date() } });
        await d.collection('sponsorships').updateMany({ sponsorId: req.params.id }, { $set: { sponsorName: body.name } });
        res.json({ ok: true });
    } catch (e: any) { fail(res, e, 400); }
});

router.delete('/fees/sponsors/:id', admin, async (req, res) => {
    try {
        const d = db(req);
        if (await d.collection('sponsor_payments').countDocuments({ sponsorId: req.params.id })) {
            await d.collection('sponsors').updateOne({ _id: oid(req.params.id) as any }, { $set: { active: false } });
            await d.collection('sponsorships').updateMany({ sponsorId: req.params.id, status: 'active' }, { $set: { status: 'ended', endedAt: new Date() } });
            return res.json({ ok: true, deactivated: true });
        }
        await d.collection('sponsorships').deleteMany({ sponsorId: req.params.id });
        await d.collection('sponsors').deleteOne({ _id: oid(req.params.id) as any });
        res.json({ ok: true });
    } catch (e) { fail(res, e); }
});

/** Sponsor detail + statement: each sponsored student's outstanding and the sponsor's expected share. */
router.get('/fees/sponsors/:id', admin, async (req, res) => {
    try {
        const d = db(req);
        const sponsor = await d.collection('sponsors').findOne({ _id: oid(req.params.id) as any });
        if (!sponsor) return res.status(404).json({ message: 'Sponsor not found' });
        const ships = await d.collection('sponsorships').find({ sponsorId: req.params.id }).sort({ studentName: 1 }).toArray();
        const students = [];
        for (const sp of ships) {
            const outstanding = await studentOutstanding(d, sp.studentId);
            students.push({ ...sp, outstanding, expected: sponsorshipLive(sp) ? sponsorShare(sp, outstanding) : 0 });
        }
        const payments = await d.collection('sponsor_payments').find({ sponsorId: req.params.id }).sort({ createdAt: -1 }).limit(200).toArray();
        res.json({
            sponsor, students, payments,
            totals: {
                expected: round2(students.reduce((s, x) => s + x.expected, 0)),
                paid: round2(payments.reduce((s: number, p: any) => s + N(p.amount), 0)),
            },
        });
    } catch (e) { fail(res, e); }
});

router.get('/fees/sponsorships', admin, async (req, res) => {
    try {
        const q: any = {};
        if (req.query.sponsorId) q.sponsorId = String(req.query.sponsorId);
        if (req.query.studentId) q.studentId = String(req.query.studentId);
        if (req.query.status) q.status = String(req.query.status);
        res.json(await db(req).collection('sponsorships').find(q).sort({ createdAt: -1 }).limit(1000).toArray());
    } catch (e) { fail(res, e); }
});

router.post('/fees/sponsorships', admin, async (req, res) => {
    try {
        const d = db(req);
        const sponsor = await d.collection('sponsors').findOne({ _id: oid(req.body.sponsorId) as any });
        if (!sponsor || sponsor.active === false) return res.status(400).json({ message: 'Choose an active sponsor' });
        const coverage = ['full', 'percent', 'fixed'].includes(req.body.coverage) ? req.body.coverage : 'full';
        const value = coverage === 'full' ? 100 : N(req.body.value);
        if (coverage !== 'full' && (value <= 0 || (coverage === 'percent' && value > 100))) return res.status(400).json({ message: 'Invalid coverage value' });
        const ids: string[] = Array.isArray(req.body.studentIds) ? req.body.studentIds.map(String) : [];
        if (!ids.length) return res.status(400).json({ message: 'Select at least one student' });

        const students = await loadStudents(d, ids);
        let created = 0; const skipped: string[] = [];
        for (const s of students) {
            const dup = await d.collection('sponsorships').findOne({ sponsorId: String(sponsor._id), studentId: s.studentId, status: 'active' });
            if (dup) { skipped.push(s.studentName); continue; }
            await d.collection('sponsorships').insertOne({
                sponsorId: String(sponsor._id), sponsorName: sponsor.name, ...s, coverage, value,
                startDate: date(req.body.startDate), endDate: date(req.body.endDate), notes: text(req.body.notes, 1000),
                status: 'active', totalPaid: 0, createdAt: new Date(), createdBy: who(req),
            });
            created++;
        }
        res.status(201).json({ created, skipped });
    } catch (e) { fail(res, e); }
});

router.put('/fees/sponsorships/:id', admin, async (req, res) => {
    try {
        const set: any = { updatedAt: new Date() };
        if (['active', 'suspended', 'ended'].includes(req.body.status)) set.status = req.body.status;
        if (['full', 'percent', 'fixed'].includes(req.body.coverage)) set.coverage = req.body.coverage;
        if (req.body.value !== undefined) set.value = N(req.body.value);
        if (set.coverage === 'full') set.value = 100;
        if ('startDate' in req.body) set.startDate = date(req.body.startDate);
        if ('endDate' in req.body) set.endDate = date(req.body.endDate);
        if ('notes' in req.body) set.notes = text(req.body.notes, 1000);
        await db(req).collection('sponsorships').updateOne({ _id: oid(req.params.id) as any }, { $set: set });
        res.json({ ok: true });
    } catch (e) { fail(res, e); }
});

router.delete('/fees/sponsorships/:id', admin, async (req, res) => {
    try {
        const d = db(req);
        const sp = await d.collection('sponsorships').findOne({ _id: oid(req.params.id) as any });
        if (!sp) return res.status(404).json({ message: 'Not found' });
        if (N(sp.totalPaid) > 0) {
            await d.collection('sponsorships').updateOne({ _id: sp._id }, { $set: { status: 'ended', endedAt: new Date() } });
            return res.json({ ok: true, ended: true });
        }
        await d.collection('sponsorships').deleteOne({ _id: sp._id });
        res.json({ ok: true });
    } catch (e) { fail(res, e); }
});

/**
 * Record money received from a sponsor.
 * - allocations: [{ studentId, amount }] → pay exactly that per student, or
 * - no allocations → split across the sponsor's active students by their
 *   expected share (largest first), then any remainder stays with the sponsor
 *   as unallocated credit.
 */
router.post('/fees/sponsors/:id/payments', admin, async (req, res) => {
    try {
        const d = db(req);
        const schoolId = getSchoolId(req);
        const sponsor = await d.collection('sponsors').findOne({ _id: oid(req.params.id) as any });
        if (!sponsor) return res.status(404).json({ message: 'Sponsor not found' });
        const amount = round2(N(req.body.amount));
        if (amount <= 0) return res.status(400).json({ message: 'Enter the amount received' });
        const method = text(req.body.method || 'BANK', 20).toUpperCase();
        const payment_date = text(req.body.payment_date, 10) || new Date().toISOString().slice(0, 10);

        // Plan the split.
        let plan: { studentId: string; amount: number }[] = [];
        if (Array.isArray(req.body.allocations) && req.body.allocations.length) {
            plan = req.body.allocations.map((a: any) => ({ studentId: String(a.studentId), amount: round2(N(a.amount)) })).filter((a: any) => a.amount > 0);
            const sum = plan.reduce((s, a) => s + a.amount, 0);
            if (sum - amount > 0.009) return res.status(400).json({ message: 'Allocations add up to more than the amount received' });
        } else {
            const ships = (await d.collection('sponsorships').find({ sponsorId: req.params.id, status: 'active' }).toArray()).filter(sp => sponsorshipLive(sp));
            const wants = [];
            for (const sp of ships) wants.push({ studentId: sp.studentId, want: sponsorShare(sp, await studentOutstanding(d, sp.studentId)) });
            let left = amount;
            for (const w of wants.sort((a, b) => b.want - a.want)) {
                if (left <= 0) break;
                const give = round2(Math.min(w.want, left));
                if (give > 0) { plan.push({ studentId: w.studentId, amount: give }); left = round2(left - give); }
            }
        }

        const spId = new ObjectId();
        const ctx = { schoolId, sponsor, sponsorPaymentId: String(spId), method, reference: text(req.body.reference, 80), payment_date, by: who(req) };
        const allocations = [];
        let used = 0;
        for (const a of plan) {
            const r = await paySponsoredStudent(d, ctx, a.studentId, a.amount, getNextReceiptNo, postFeePaymentJournal);
            if (r.used > 0) {
                const sp = await d.collection('sponsorships').findOne({ sponsorId: req.params.id, studentId: a.studentId });
                allocations.push({ studentId: a.studentId, studentName: sp?.studentName || '', amount: r.used, receipts: r.receipts });
                used = round2(used + r.used);
            }
        }
        const unallocated = round2(amount - used);
        const doc = {
            _id: spId, sponsorId: req.params.id, sponsorName: sponsor.name, amount, method, reference: ctx.reference,
            payment_date, notes: text(req.body.notes, 1000), allocations, unallocated, recordedBy: who(req), createdAt: new Date(),
        };
        await d.collection('sponsor_payments').insertOne(doc);
        if (unallocated > 0) await d.collection('sponsors').updateOne({ _id: sponsor._id }, { $inc: { unallocated } });
        res.status(201).json(doc);
    } catch (e) { fail(res, e); }
});

router.get('/fees/sponsors/:id/payments', admin, async (req, res) => {
    try {
        res.json(await db(req).collection('sponsor_payments').find({ sponsorId: req.params.id }).sort({ createdAt: -1 }).toArray());
    } catch (e) { fail(res, e); }
});

// ════════════════════════════════════════════════════════════════════════════
//  CREDITS (overpayments carried forward)
// ════════════════════════════════════════════════════════════════════════════

router.get('/fees/credits', admin, async (req, res) => {
    try {
        const d = db(req);
        const students = await d.collection('students')
            .find({ feeCredit: { $gt: 0 } }, { projection: { studentName: 1, firstName: 1, lastName: 1, registrationNo: 1, admNo: 1, studentClass: 1, currentClass: 1, feeCredit: 1 } })
            .sort({ feeCredit: -1 }).limit(1000).toArray();
        const movements = await d.collection('fee_credits').find({}).sort({ createdAt: -1 }).limit(200).toArray();
        res.json({
            students: students.map((s: any) => ({
                studentId: String(s._id),
                studentName: s.studentName || `${s.firstName || ''} ${s.lastName || ''}`.trim(),
                registrationNo: s.registrationNo || s.admNo || '',
                className: s.studentClass || s.currentClass || '',
                credit: round2(N(s.feeCredit)),
            })),
            total: round2(students.reduce((t: number, s: any) => t + N(s.feeCredit), 0)),
            movements,
        });
    } catch (e) { fail(res, e); }
});

/** Fee-aid view for one student (used on the ledger / collect pages). */
router.get('/fees/aid/student/:studentId', admin, async (req, res) => {
    try {
        const d = db(req);
        const sid = req.params.studentId;
        const [awards, sponsorships] = await Promise.all([
            d.collection('scholarship_awards').find({ studentId: sid }).sort({ createdAt: -1 }).toArray(),
            d.collection('sponsorships').find({ studentId: sid }).sort({ createdAt: -1 }).toArray(),
        ]);
        const open = await openInvoices(d, sid);
        res.json({ awards, sponsorships, outstanding: round2(open.reduce((s, i) => s + invoiceBalance(i), 0)) });
    } catch (e) { fail(res, e); }
});

export default router;
