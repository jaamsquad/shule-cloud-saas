/**
 * Fees dashboard: one place to see how fee collection is going.
 *   GET  /fees/overview              cards, fee structures (with who has paid), 14-day trend, by method, by class
 *   GET  /fees/overview/overdue      invoices past their due date
 *   GET  /fees/overview/records      every student's billed / paid / balance (filter by class, search)
 *   GET  /fees/overview/processing   M-PESA payments started in the last few days (pending / done / failed)
 *   GET  /fees/overview/edited       recent fee edits, waivers and voids (the fee audit log)
 *   POST /fees/overview/notify       SMS a reminder to the parents of overdue invoices
 * Only people allowed to see school finance (school admin, head teacher, finance staff).
 */
import { Router, Request, Response, NextFunction } from 'express';
import { Db, ObjectId } from 'mongodb';
import { getMetaDb } from '../lib/mongodb';
import { resolveScope, accessibleStudentIds } from '../lib/dataScope';
import { resolveStaffPermissions, permsToModules } from '../lib/permissions';
import { currentTerm } from '../modules/cbc/cbcTerm';

const router = Router();
const dbOf = (req: Request): Db => (req as any).tenantDb || getMetaDb();
const num = (v: any) => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };
const round = (n: number) => Math.round(n * 100) / 100;
const today = () => new Date().toISOString().slice(0, 10);

// ── who may look ─────────────────────────────────────────────────────────────
async function financeGate(req: Request, res: Response, next: NextFunction) {
    try {
        const d = dbOf(req); const scope = await resolveScope(req, d);
        if (scope.isAdmin) return next();
        let me: any = null; try { me = scope.staffId ? await d.collection('staff').findOne({ _id: new ObjectId(scope.staffId) }) : null; } catch { /* */ }
        if (me) {
            const titles = [me.designation, ...(Array.isArray(me.roles) ? me.roles : [])].filter(Boolean).join(' ');
            if (/head\s*-?\s*teacher|head\s*master|head\s*mistress|principal/i.test(titles)) return next();
            const perms = await resolveStaffPermissions(d, me, { teacherFallback: false });
            if (perms.includes('*') || permsToModules(perms).includes('fees')) return next();
        }
        res.status(403).json({ message: 'You do not have access to school finance.' });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
}
router.use('/fees/overview', financeGate);

// ── invoice figures (voided ignored, waived owes nothing) ────────────────────
type Inv = { _id: any; sid: string; no: string; total: number; paid: number; balance: number; due: string; status: string; structure: string; raw: any };
async function loadInvoices(req: Request): Promise<Inv[]> {
    const d = dbOf(req);
    const allowed = await accessibleStudentIds(req, d);
    const rows: any[] = await d.collection('invoices').find({ status: { $nin: ['VOIDED', 'voided', 'Voided'] } }).toArray();
    return rows.map(inv => {
        const status = String(inv.status || 'UNPAID').toUpperCase();
        let total = num(inv.total_due ?? inv.total); const isPaid = status === 'PAID';
        const paid = num(inv.amount_paid ?? (isPaid ? total : 0));
        if (status === 'WAIVED') total = paid;   // what was forgiven is neither billed nor owed
        const balance = status === 'WAIVED' ? 0 : Math.max(0, num(inv.balance ?? (isPaid ? 0 : total)));
        return { _id: inv._id, sid: String(inv.student_id || inv.studentId || ''), no: inv.invoice_no || inv.number || `INV-${String(inv._id).slice(-6).toUpperCase()}`, total, paid, balance, due: String(inv.due_date || inv.dueDate || '').slice(0, 10), status, structure: String(inv.fee_structure_id || ''), raw: inv };
    }).filter(i => !allowed || allowed.has(i.sid));
}
const isOverdue = (i: Inv) => !['PAID', 'WAIVED'].includes(i.status) && i.balance > 0 && !!i.due && i.due < today();
async function studentMap(d: Db, ids: string[]) {
    const oids = ids.map(x => { try { return new ObjectId(x); } catch { return null; } }).filter(Boolean) as ObjectId[];
    const rows: any[] = oids.length ? await d.collection('students').find({ _id: { $in: oids } }).toArray() : [];
    return new Map(rows.map(s => [String(s._id), s]));
}
const nameOf = (s: any) => s?.studentName || s?.name || `${s?.firstName || ''} ${s?.lastName || ''}`.trim() || 'Student';
const classOf = (s: any) => s?.studentClass || s?.currentClass || s?.statusPrevClass?.studentClass || '';

// ── overview ─────────────────────────────────────────────────────────────────
router.get('/fees/overview', async (req, res) => {
    try {
        const d = dbOf(req); const tc = (req as any).tenantContext || {};
        const [invoices, term] = await Promise.all([loadInvoices(req), currentTerm(d).catch(() => null)]);
        const totalStudents = await d.collection('students').countDocuments({}).catch(() => 0);

        // school collection
        const invoiced = invoices.reduce((s, i) => s + i.total, 0), paid = invoices.reduce((s, i) => s + i.paid, 0), balance = invoices.reduce((s, i) => s + i.balance, 0);
        const overdue = invoices.filter(isOverdue);

        // online (M-PESA STK) — the platform keeps these in the meta DB, tagged with this school's database
        const since30 = new Date(Date.now() - 30 * 86400000);
        const online: any[] = tc.databaseName ? await getMetaDb().collection('mpesa_transactions').find({ tenantDbName: tc.databaseName, createdAt: { $gte: since30 } }).toArray().catch(() => []) : [];
        const onlineDone = online.filter(t => t.status === 'completed');

        // deposits (student wallets)
        const wallets: any[] = await d.collection('wallets').find({}).toArray().catch(() => []);
        const held = wallets.filter(w => num(w.balance) > 0);

        // fee structures with who has paid
        const structures: any[] = await d.collection('fee_structures').find({}).toArray().catch(() => []);
        const byStructure = new Map<string, Inv[]>(); invoices.forEach(i => { if (i.structure) (byStructure.get(i.structure) || byStructure.set(i.structure, []).get(i.structure)!).push(i); });
        const fs = structures.map(s => {
            const list = byStructure.get(String(s._id)) || [];
            const students = new Set(list.map(i => i.sid));
            const owing = new Set(list.filter(i => i.balance > 0).map(i => i.sid));
            return {
                _id: String(s._id), name: s.name, items: (s.items || []).map((it: any) => ({ category: it.category, description: it.description || '', amount: num(it.amount), required: !!it.is_required })),
                total: round((s.items || []).reduce((t: number, it: any) => t + num(it.amount), 0)), classes: (s.class_ids || []).length,
                invoices: list.length, students: students.size, notPaid: owing.size, invoiced: round(list.reduce((t, i) => t + i.total, 0)), collected: round(list.reduce((t, i) => t + i.paid, 0)),
            };
        }).sort((a, b) => b.invoices - a.invoices);

        // last 14 days of collection + split by method (from recorded payments)
        const from14 = new Date(Date.now() - 13 * 86400000).toISOString().slice(0, 10), from90 = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
        const pays: any[] = await d.collection('payments').find({ is_voided: { $ne: true }, payment_date: { $gte: from90 } }).toArray().catch(() => []);
        const daily: Record<string, number> = {}; for (let i = 13; i >= 0; i--) daily[new Date(Date.now() - i * 86400000).toISOString().slice(0, 10)] = 0;
        const methods: Record<string, { amount: number; count: number }> = {};
        pays.forEach(p => { const dt = String(p.payment_date).slice(0, 10); if (dt >= from14 && dt in daily) daily[dt] += num(p.amount); const m = String(p.method || 'Other'); (methods[m] ||= { amount: 0, count: 0 }); methods[m].amount += num(p.amount); methods[m].count++; });
        const todayPays = pays.filter(p => String(p.payment_date).slice(0, 10) === today());

        // outstanding by class (top 8)
        const stu = await studentMap(d, Array.from(new Set(invoices.filter(i => i.balance > 0).map(i => i.sid))));
        const byClass: Record<string, { balance: number; students: Set<string> }> = {};
        invoices.filter(i => i.balance > 0).forEach(i => { const c = classOf(stu.get(i.sid)) || 'No class'; (byClass[c] ||= { balance: 0, students: new Set() }); byClass[c].balance += i.balance; byClass[c].students.add(i.sid); });

        res.json({
            term: term ? { label: term.label, year: term.year } : null,
            cards: {
                overdue: { amount: round(overdue.reduce((s, i) => s + i.balance, 0)), invoices: overdue.length, students: new Set(overdue.map(i => i.sid)).size },
                online: { count: onlineDone.length, amount: round(onlineDone.reduce((s, t) => s + num(t.amount), 0)), pending: online.filter(t => t.status === 'pending').length, failed: online.filter(t => t.status === 'failed').length, totalStudents },
                deposit: { held: round(held.reduce((s, w) => s + num(w.balance), 0)), students: held.length },
                school: { invoiced: round(invoiced), paid: round(paid), balance: round(balance), rate: invoiced > 0 ? Math.round((paid / invoiced) * 1000) / 10 : 0, invoices: invoices.length, studentsOwing: new Set(invoices.filter(i => i.balance > 0).map(i => i.sid)).size },
                today: { amount: round(todayPays.reduce((s, p) => s + num(p.amount), 0)), transactions: todayPays.length },
            },
            structures: fs,
            trend: Object.entries(daily).map(([date, amount]) => ({ date, amount: round(amount) })),
            methods: Object.entries(methods).map(([method, v]) => ({ method, amount: round(v.amount), count: v.count })).sort((a, b) => b.amount - a.amount),
            byClass: Object.entries(byClass).map(([className, v]) => ({ className, balance: round(v.balance), students: v.students.size })).sort((a, b) => b.balance - a.balance).slice(0, 8),
        });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── tabs ─────────────────────────────────────────────────────────────────────
router.get('/fees/overview/overdue', async (req, res) => {
    try {
        const d = dbOf(req); const list = (await loadInvoices(req)).filter(isOverdue);
        const stu = await studentMap(d, Array.from(new Set(list.map(i => i.sid))));
        res.json(list.map(i => { const s = stu.get(i.sid); return { invoiceId: String(i._id), invoiceNo: i.no, studentId: i.sid, studentName: nameOf(s), className: classOf(s), balance: round(i.balance), total: round(i.total), dueDate: i.due, daysOverdue: Math.ceil((Date.now() - new Date(i.due + 'T00:00:00').getTime()) / 86400000), phone: s?.parentPhone || s?.fatherPhone || s?.motherPhone || s?.guardianPhone || s?.phone || '' }; }).sort((a, b) => b.balance - a.balance).slice(0, 500));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get('/fees/overview/records', async (req, res) => {
    try {
        const d = dbOf(req); const list = await loadInvoices(req);
        const per = new Map<string, { billed: number; paid: number; balance: number; invoices: number; last: string }>();
        list.forEach(i => { const p = per.get(i.sid) || { billed: 0, paid: 0, balance: 0, invoices: 0, last: '' }; p.billed += i.total; p.paid += i.paid; p.balance += i.balance; p.invoices++; per.set(i.sid, p); });
        const stu = await studentMap(d, Array.from(per.keys()));
        const cls = String(req.query.className || '').trim().toLowerCase(), q = String(req.query.q || '').trim().toLowerCase();
        let rows = Array.from(per.entries()).map(([sid, p]) => { const s = stu.get(sid); return { studentId: sid, studentName: nameOf(s), registrationNo: s?.registrationNo || '', className: classOf(s), billed: round(p.billed), paid: round(p.paid), balance: round(p.balance), invoices: p.invoices }; });
        if (cls) rows = rows.filter(r => r.className.toLowerCase() === cls);
        if (q) rows = rows.filter(r => `${r.studentName} ${r.registrationNo}`.toLowerCase().includes(q));
        res.json(rows.sort((a, b) => b.balance - a.balance).slice(0, 500));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get('/fees/overview/processing', async (req, res) => {
    try {
        const tc = (req as any).tenantContext || {}; const days = Math.min(30, Math.max(1, parseInt(String(req.query.days)) || 3));
        const rows: any[] = tc.databaseName ? await getMetaDb().collection('mpesa_transactions').find({ tenantDbName: tc.databaseName, createdAt: { $gte: new Date(Date.now() - days * 86400000) } }).toArray().catch(() => []) : [];
        res.json(rows.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, 300).map(t => ({ checkoutRequestId: t.checkoutRequestId, studentName: t.studentName || '', registrationNo: t.registrationNo || '', purpose: t.purpose || 'fees', amount: num(t.amount), phone: t.phone || '', status: t.status || 'pending', receipt: t.mpesaReceipt || '', message: t.resultDesc || '', createdAt: t.createdAt })));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get('/fees/overview/edited', async (req, res) => {
    try {
        const rows: any[] = await dbOf(req).collection('fee_audit_logs').find({}).toArray().catch(() => []);
        res.json(rows.sort((a, b) => String(b.performed_at || b.createdAt || '').localeCompare(String(a.performed_at || a.createdAt || ''))).slice(0, 200).map(r => ({
            _id: String(r._id), action: r.action || '', entity: r.entity_type || '', by: r.performed_by_name || r.performed_by || r.user || '', at: r.performed_at || r.createdAt || '', reference: r.entity_id || r.invoice_no || '', details: r.description || r.reason || r.details || (r.after ? JSON.stringify(r.after).slice(0, 160) : ''),
        })));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// A real SMS to each parent (the older /defaulters/sms endpoint only pretends to send).
router.post('/fees/overview/notify', async (req, res) => {
    try {
        const d = dbOf(req); const ids: string[] = (Array.isArray(req.body?.invoiceIds) ? req.body.invoiceIds : []).map(String).slice(0, 300);
        const overdue = (await loadInvoices(req)).filter(isOverdue).filter(i => !ids.length || ids.includes(String(i._id)));
        if (!overdue.length) return res.status(400).json({ message: 'There are no overdue invoices to remind.' });
        const stu = await studentMap(d, Array.from(new Set(overdue.map(i => i.sid))));
        const { queueSms } = await import('../services/smsGateway.service');
        const schoolId = String((req as any).tenantContext?.tenantId || 'default');
        // one reminder per student, covering everything they owe
        const per = new Map<string, number>(); overdue.forEach(i => per.set(i.sid, (per.get(i.sid) || 0) + i.balance));
        let sent = 0, failed = 0, noPhone = 0, lastError = '';
        for (const [sid, bal] of per) {
            const s = stu.get(sid); const phone = s?.parentPhone || s?.fatherPhone || s?.motherPhone || s?.guardianPhone || s?.phone;
            if (!phone) { noPhone++; continue; }
            const r: any = await queueSms(d, schoolId, [phone], `Dear parent, ${nameOf(s)} has an outstanding fee balance of KES ${Math.round(bal).toLocaleString('en-KE')}. Kindly clear it as soon as possible. Thank you.`, { audience: 'fee_overdue' });
            if (r.provider === 'device' || r.sent > 0) sent++; else { failed++; lastError = r.error || lastError; }
        }
        res.json({ sent, failed, noPhone, message: lastError });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

export default router;
