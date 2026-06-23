/**
 * Expense Management module.
 *
 * Owns: expenses, expense_categories, budgets, expense_payments, recurring_expenses.
 * Shares (read/write) with Procurement: procurement_suppliers (registered here).
 * procurement_pr / procurement_po CRUD live in the Procurement module.
 * Auto-posts journal entries to the Accounting ledger when an expense is approved
 * (see postExpenseJournal).
 *
 * Everything is soft-deleted, audit-logged, and uses auto-generated numbers.
 */
import { Router, Request } from 'express';
import { ObjectId } from 'mongodb';
import { getMetaDb } from '../../lib/mongodb';
import { sanitizeUpdate } from '../../lib/sanitizeUpdate';

const router = Router();
const db = (req: Request) => (req as any).tenantDb || getMetaDb();
const num = (v: any) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const oid = (id: string) => { try { return new ObjectId(id); } catch { return null; } };
const user = (req: Request) => (req as any).tenantContext?.user || 'admin';

const audit = async (req: Request, action: string, target: string, meta: any = {}) => {
    try { await db(req).collection('audit_logs').insertOne({ scope: 'expense', action, target, meta, user: user(req), changedAt: new Date(), createdAt: new Date() }); } catch { /* */ }
};

async function nextNumber(req: Request, coll: string, prefix: string) {
    const year = new Date().getFullYear();
    const count = await db(req).collection(coll).countDocuments({ number: new RegExp(`^${prefix}-${year}-`) }).catch(() => 0);
    return `${prefix}-${year}-${String(count + 1).padStart(4, '0')}`;
}

// Auto-post a double-entry journal when an expense is approved (Accounting integration).
async function postExpenseJournal(req: Request, expense: any) {
    try {
        const jNo = await nextNumber(req, 'accounting_journals', 'JV');
        await db(req).collection('accounting_journals').insertOne({
            number: jNo, date: expense.date || new Date(), description: `Expense ${expense.number} — ${expense.description || ''}`,
            reference: expense.number, source: 'expense',
            lines: [
                { account: expense.expenseAccount || expense.category || 'Expenses', type: 'debit', amount: num(expense.totalAmount) },
                { account: expense.paymentMethod === 'Cash' ? 'Cash' : 'Bank', type: 'credit', amount: num(expense.totalAmount) },
            ],
            status: 'posted', createdBy: user(req), createdAt: new Date(),
        });
    } catch { /* accounting module may not be set up yet */ }
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
router.get('/expense/stats', async (req, res) => {
    try {
        const expenses = await db(req).collection('expenses').find({ deletedAt: { $exists: false } }).toArray().catch(() => []);
        const now = new Date(); const today = now.toISOString().slice(0, 10); const month = today.slice(0, 7); const year = String(now.getFullYear());
        const sum = (arr: any[]) => arr.reduce((s, e) => s + num(e.totalAmount), 0);
        const inDay = expenses.filter((e: any) => String(e.date || '').slice(0, 10) === today);
        const inMonth = expenses.filter((e: any) => String(e.date || '').slice(0, 7) === month);
        const inYear = expenses.filter((e: any) => String(e.date || '').slice(0, 4) === year);

        const budgets = await db(req).collection('budgets').find({}).toArray().catch(() => []);
        const allocated = budgets.reduce((s: number, b: any) => s + num(b.amount), 0);
        const spent = sum(expenses.filter((e: any) => /approved|paid/i.test(e.approvalStatus || e.status || '')));

        const byCat: Record<string, number> = {}; const byDept: Record<string, number> = {}; const byMethod: Record<string, number> = {}; const byMonth: Record<string, number> = {};
        expenses.forEach((e: any) => {
            byCat[e.category || 'Other'] = (byCat[e.category || 'Other'] || 0) + num(e.totalAmount);
            byDept[e.department || 'General'] = (byDept[e.department || 'General'] || 0) + num(e.totalAmount);
            byMethod[e.paymentMethod || 'Cash'] = (byMethod[e.paymentMethod || 'Cash'] || 0) + num(e.totalAmount);
            const m = String(e.date || '').slice(0, 7); if (m) byMonth[m] = (byMonth[m] || 0) + num(e.totalAmount);
        });
        const supplierOutstanding = expenses.filter((e: any) => /unpaid|pending/i.test(e.paymentStatus || '')).reduce((s: number, e: any) => s + num(e.totalAmount), 0);

        res.json({
            cards: {
                today: sum(inDay), month: sum(inMonth), year: sum(inYear),
                pendingApprovals: expenses.filter((e: any) => /pending|submitted/i.test(e.approvalStatus || '')).length,
                approved: expenses.filter((e: any) => /approved/i.test(e.approvalStatus || '')).length,
                rejected: expenses.filter((e: any) => /rejected/i.test(e.approvalStatus || '')).length,
                outstandingSupplier: supplierOutstanding,
                budgetUtilization: allocated ? Math.round(spent / allocated * 100) : 0,
                remainingBudget: Math.max(0, allocated - spent),
            },
            charts: { byMonth, byCat, byDept, byMethod, topCategories: byCat },
        });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Generic soft-delete CRUD factory ──────────────────────────────────────────
function crud(coll: string, numberPrefix?: string) {
    router.get(`/${coll}`, async (req, res) => {
        try {
            const q: any = { deletedAt: { $exists: false } };
            ['department', 'category', 'supplier', 'approvalStatus', 'paymentStatus', 'paymentMethod', 'status', 'staffId', 'budgetCode', 'campus'].forEach(k => { if (req.query[k]) q[k] = String(req.query[k]); });
            if (req.query.from || req.query.to) q.date = { ...(req.query.from ? { $gte: String(req.query.from) } : {}), ...(req.query.to ? { $lte: String(req.query.to) } : {}) };
            const rows = await db(req).collection(coll).find(q).sort({ createdAt: -1 }).limit(1000).toArray();
            res.json(rows);
        } catch (e: any) { res.status(500).json({ message: e.message }); }
    });
    router.post(`/${coll}`, async (req, res) => {
        try {
            const doc: any = { ...req.body, createdBy: user(req), createdAt: new Date() };
            if (numberPrefix && !doc.number) doc.number = await nextNumber(req, coll, numberPrefix);
            const r = await db(req).collection(coll).insertOne(doc);
            await audit(req, `create_${coll}`, String(r.insertedId), { number: doc.number });
            res.status(201).json({ _id: r.insertedId, ...doc });
        } catch (e: any) { res.status(500).json({ message: e.message }); }
    });
    router.patch(`/${coll}/:id`, async (req, res) => {
        try {
            const _id = oid(req.params.id); if (!_id) return res.status(400).json({ message: 'Bad id' });
            const before = await db(req).collection(coll).findOne({ _id });
            await db(req).collection(coll).updateOne({ _id }, { $set: { ...sanitizeUpdate(req.body), updatedAt: new Date(), updatedBy: user(req) } });
            // When an expense flips to approved, post the journal.
            if (coll === 'expenses' && /approved/i.test(req.body.approvalStatus || '') && !/approved/i.test(before?.approvalStatus || '')) {
                const after = await db(req).collection(coll).findOne({ _id });
                await postExpenseJournal(req, after);
            }
            await audit(req, `update_${coll}`, req.params.id, { fields: Object.keys(req.body) });
            res.json({ ok: true });
        } catch (e: any) { res.status(500).json({ message: e.message }); }
    });
    // Soft delete (recoverable).
    router.delete(`/${coll}/:id`, async (req, res) => {
        try {
            const _id = oid(req.params.id); if (!_id) return res.status(400).json({ message: 'Bad id' });
            await db(req).collection(coll).updateOne({ _id }, { $set: { deletedAt: new Date(), deletedBy: user(req) } });
            await audit(req, `delete_${coll}`, req.params.id);
            res.json({ ok: true });
        } catch (e: any) { res.status(500).json({ message: e.message }); }
    });
}

crud('expenses', 'EXP');
crud('expense_categories');
crud('budgets');
crud('expense_payments', 'PAY');
crud('recurring_expenses');
crud('procurement_suppliers');     // shared with Procurement

// Seed the default expense categories on first load.
router.post('/expense_categories/seed', async (req, res) => {
    const DEFAULTS = ['Salaries & Wages', 'Casual Labour', 'Electricity', 'Water', 'Internet', 'Telephone', 'Rent', 'Repairs & Maintenance', 'Fuel', 'Transport', 'School Feeding', 'Textbooks', 'Stationery', 'Laboratory Equipment', 'Sports', 'Examination Expenses', 'Cleaning Supplies', 'Security', 'Medical', 'ICT Equipment', 'Furniture', 'Building Projects', 'Insurance', 'Bank Charges', 'Licenses', 'Staff Welfare', 'Training', 'Marketing', 'Miscellaneous'];
    try {
        const existing = await db(req).collection('expense_categories').countDocuments({});
        if (existing > 0) return res.json({ ok: true, message: 'Categories already exist', count: existing });
        await db(req).collection('expense_categories').insertMany(DEFAULTS.map(name => ({ name, active: true, createdAt: new Date() })));
        res.json({ ok: true, count: DEFAULTS.length });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Budget control: spent vs allocated per budget ─────────────────────────────
router.get('/expense/budget-control', async (req, res) => {
    try {
        const [budgets, expenses] = await Promise.all([
            db(req).collection('budgets').find({ deletedAt: { $exists: false } }).toArray().catch(() => []),
            db(req).collection('expenses').find({ deletedAt: { $exists: false }, approvalStatus: { $regex: /approved|paid/i } }).toArray().catch(() => []),
        ]);
        const rows = budgets.map((b: any) => {
            const spent = expenses.filter((e: any) => (b.category && e.category === b.category) || (b.department && e.department === b.department) || (b.code && e.budgetCode === b.code)).reduce((s: number, e: any) => s + num(e.totalAmount), 0);
            const allocated = num(b.amount);
            return { _id: String(b._id), name: b.name || b.category || b.department, scope: b.category ? 'Category' : b.department ? 'Department' : b.project ? 'Project' : 'Campus', allocated, spent, remaining: allocated - spent, percent: allocated ? Math.round(spent / allocated * 100) : 0, year: b.year };
        });
        res.json(rows);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Approvals queue + action ──────────────────────────────────────────────────
router.get('/expense/approvals', async (req, res) => {
    try {
        const rows = await db(req).collection('expenses').find({ deletedAt: { $exists: false }, approvalStatus: { $regex: /pending|submitted/i } }).sort({ createdAt: -1 }).toArray();
        res.json(rows);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});
router.post('/expense/approvals/:id', async (req, res) => {
    try {
        const _id = oid(req.params.id); if (!_id) return res.status(400).json({ message: 'Bad id' });
        const { decision, comment } = req.body || {};   // approve | reject
        const status = /reject/i.test(decision) ? 'Rejected' : 'Approved';
        const exp = await db(req).collection('expenses').findOne({ _id });
        await db(req).collection('expenses').updateOne({ _id }, { $set: { approvalStatus: status, approvedBy: user(req), approvedAt: new Date() }, $push: { approvalTrail: { by: user(req), decision: status, comment: comment || '', at: new Date() } } });
        if (status === 'Approved' && exp) await postExpenseJournal(req, { ...exp, approvalStatus: 'Approved' });
        await audit(req, 'approval', req.params.id, { status, comment });
        res.json({ ok: true, status });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Reports ───────────────────────────────────────────────────────────────────
router.get('/expense/reports/:kind', async (req, res) => {
    try {
        const expenses = await db(req).collection('expenses').find({ deletedAt: { $exists: false } }).sort({ date: -1 }).toArray().catch(() => []);
        const kind = req.params.kind;
        const money = (n: any) => `KSh ${num(n).toLocaleString()}`;
        if (kind === 'by-category') {
            const m: Record<string, number> = {}; expenses.forEach((e: any) => m[e.category || 'Other'] = (m[e.category || 'Other'] || 0) + num(e.totalAmount));
            return res.json({ title: 'Expenses by Category', columns: [{ key: 'category', label: 'Category' }, { key: 'amount', label: 'Amount' }], rows: Object.entries(m).map(([category, a]) => ({ category, amount: money(a) })) });
        }
        if (kind === 'by-department') {
            const m: Record<string, number> = {}; expenses.forEach((e: any) => m[e.department || 'General'] = (m[e.department || 'General'] || 0) + num(e.totalAmount));
            return res.json({ title: 'Department Expenses', columns: [{ key: 'department', label: 'Department' }, { key: 'amount', label: 'Amount' }], rows: Object.entries(m).map(([department, a]) => ({ department, amount: money(a) })) });
        }
        if (kind === 'supplier-payments') {
            const payments = await db(req).collection('expense_payments').find({ deletedAt: { $exists: false } }).toArray().catch(() => []);
            return res.json({ title: 'Supplier Payments', columns: [{ key: 'number', label: 'Payment No' }, { key: 'supplier', label: 'Supplier' }, { key: 'amount', label: 'Amount', type: 'money' }, { key: 'paymentMethod', label: 'Method' }, { key: 'date', label: 'Date', type: 'date' }], rows: payments });
        }
        // Default: expense summary register
        return res.json({ title: 'Expense Summary', columns: [{ key: 'number', label: 'Expense No' }, { key: 'date', label: 'Date', type: 'date' }, { key: 'category', label: 'Category' }, { key: 'supplier', label: 'Supplier' }, { key: 'totalAmount', label: 'Amount', type: 'money' }, { key: 'approvalStatus', label: 'Status' }], rows: expenses });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Settings + alerts ─────────────────────────────────────────────────────────
router.get('/expense/settings', async (req, res) => {
    const s: any = (await db(req).collection('expense_settings').findOne({})) || {};
    res.json({ paymentMethods: s.paymentMethods ?? ['Cash', 'Bank Transfer', 'Cheque', 'Mobile Money', 'EFT'], taxRate: s.taxRate ?? 16, currency: s.currency ?? 'KES', financialYear: s.financialYear ?? String(new Date().getFullYear()), costCentres: s.costCentres ?? [], ...s });
});
router.patch('/expense/settings', async (req, res) => { await db(req).collection('expense_settings').updateOne({}, { $set: { ...req.body, updatedAt: new Date() } }, { upsert: true }); res.json({ ok: true }); });

router.get('/expense/alerts', async (req, res) => {
    try {
        const alerts: any[] = [];
        const pending = await db(req).collection('expenses').countDocuments({ deletedAt: { $exists: false }, approvalStatus: { $regex: /pending|submitted/i } }).catch(() => 0);
        if (pending) alerts.push({ level: 'info', message: `${pending} expense(s) awaiting approval` });
        const budgets = await db(req).collection('budgets').find({}).toArray().catch(() => []);
        const expenses = await db(req).collection('expenses').find({ deletedAt: { $exists: false }, approvalStatus: { $regex: /approved|paid/i } }).toArray().catch(() => []);
        budgets.forEach((b: any) => { const spent = expenses.filter((e: any) => e.category === b.category || e.department === b.department).reduce((s: number, e: any) => s + num(e.totalAmount), 0); if (num(b.amount) && spent / num(b.amount) >= 0.9) alerts.push({ level: 'warning', message: `Budget "${b.name || b.category}" is ${Math.round(spent / num(b.amount) * 100)}% used` }); });
        const overdue = await db(req).collection('expenses').countDocuments({ deletedAt: { $exists: false }, paymentStatus: { $regex: /unpaid/i } }).catch(() => 0);
        if (overdue) alerts.push({ level: 'warning', message: `${overdue} supplier invoice(s) unpaid` });
        res.json(alerts.slice(0, 50));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

export default router;
