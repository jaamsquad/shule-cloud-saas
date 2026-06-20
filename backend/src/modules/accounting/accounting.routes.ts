/**
 * Accounting (General Ledger) module — double-entry bookkeeping core.
 *
 * Consumes journals auto-posted by Expense (accounting_journals, source:'expense')
 * and Fees, plus manual journal entries. Owns: accounting_accounts (chart of
 * accounts), accounting_journals, accounting_budgets, accounting_periods,
 * accounting_reconciliation. Derives ledger, trial balance, P&L, balance sheet,
 * cash flow, AR/AP.
 */
import { Router, Request } from 'express';
import { ObjectId } from 'mongodb';
import { getMetaDb } from '../../lib/mongodb';

const router = Router();
const db = (req: Request) => (req as any).tenantDb || getMetaDb();
const num = (v: any) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const oid = (id: string) => { try { return new ObjectId(id); } catch { return null; } };
const user = (req: Request) => (req as any).tenantContext?.user || 'admin';
const ksh = (n: number) => `KSh ${Math.round(n).toLocaleString()}`;
const audit = async (req: Request, action: string, target: string, meta: any = {}) => { try { await db(req).collection('audit_logs').insertOne({ scope: 'accounting', action, target, meta, user: user(req), changedAt: new Date(), createdAt: new Date() }); } catch { /* */ } };

const ACCOUNT_TYPES = ['Asset', 'Liability', 'Equity', 'Income', 'Expense'];

async function nextNumber(req: Request, coll: string, prefix: string) {
    const year = new Date().getFullYear();
    const count = await db(req).collection(coll).countDocuments({ number: new RegExp(`^${prefix}-${year}-`) }).catch(() => 0);
    return `${prefix}-${year}-${String(count + 1).padStart(4, '0')}`;
}

// Pull all journals (posted) and aggregate debit/credit per account.
async function ledgerByAccount(req: Request) {
    const journals = await db(req).collection('accounting_journals').find({ deletedAt: { $exists: false }, status: { $ne: 'draft' } }).toArray().catch(() => []);
    const map: Record<string, { debit: number; credit: number }> = {};
    journals.forEach((j: any) => (j.lines || []).forEach((l: any) => {
        const k = l.account || 'Unclassified'; (map[k] ||= { debit: 0, credit: 0 });
        if (l.type === 'debit') map[k].debit += num(l.amount); else map[k].credit += num(l.amount);
    }));
    return { journals, map };
}

// ── Generic soft-delete CRUD ──────────────────────────────────────────────────
function crud(coll: string) {
    router.get(`/${coll}`, async (req, res) => {
        try { const q: any = { deletedAt: { $exists: false } }; ['type', 'status', 'account', 'year'].forEach(k => { if (req.query[k]) q[k] = String(req.query[k]); }); res.json(await db(req).collection(coll).find(q).sort({ createdAt: -1 }).limit(2000).toArray()); }
        catch (e: any) { res.status(500).json({ message: e.message }); }
    });
    router.post(`/${coll}`, async (req, res) => {
        try { const doc = { ...req.body, createdBy: user(req), createdAt: new Date() }; const r = await db(req).collection(coll).insertOne(doc); await audit(req, `create_${coll}`, String(r.insertedId)); res.status(201).json({ _id: r.insertedId, ...doc }); }
        catch (e: any) { res.status(500).json({ message: e.message }); }
    });
    router.patch(`/${coll}/:id`, async (req, res) => {
        try {
            // Posted journal entries cannot be edited.
            if (coll === 'accounting_journals') { const j = await db(req).collection(coll).findOne({ _id: oid(req.params.id)! }); if (j?.status === 'posted') return res.status(403).json({ message: 'Posted journal entries cannot be modified' }); }
            await db(req).collection(coll).updateOne({ _id: oid(req.params.id)! }, { $set: { ...req.body, updatedAt: new Date(), updatedBy: user(req) } }); await audit(req, `update_${coll}`, req.params.id); res.json({ ok: true });
        } catch (e: any) { res.status(500).json({ message: e.message }); }
    });
    router.delete(`/${coll}/:id`, async (req, res) => {
        try {
            if (coll === 'accounting_journals') { const j = await db(req).collection(coll).findOne({ _id: oid(req.params.id)! }); if (j?.status === 'posted') return res.status(403).json({ message: 'Posted journals cannot be deleted' }); }
            await db(req).collection(coll).updateOne({ _id: oid(req.params.id)! }, { $set: { deletedAt: new Date(), deletedBy: user(req) } }); await audit(req, `delete_${coll}`, req.params.id); res.json({ ok: true });
        } catch (e: any) { res.status(500).json({ message: e.message }); }
    });
}
['accounting_accounts', 'accounting_budgets', 'accounting_periods', 'accounting_reconciliation'].forEach(crud);

// Journal entries — validate debits == credits before post.
router.get('/accounting_journals', async (req, res) => {
    try { const q: any = { deletedAt: { $exists: false } }; if (req.query.status) q.status = String(req.query.status); res.json(await db(req).collection('accounting_journals').find(q).sort({ createdAt: -1 }).limit(1000).toArray()); }
    catch (e: any) { res.status(500).json({ message: e.message }); }
});
router.post('/accounting_journals', async (req, res) => {
    try {
        const b = req.body || {}; const lines = Array.isArray(b.lines) ? b.lines : [];
        const debit = lines.filter((l: any) => l.type === 'debit').reduce((s: number, l: any) => s + num(l.amount), 0);
        const credit = lines.filter((l: any) => l.type === 'credit').reduce((s: number, l: any) => s + num(l.amount), 0);
        if (b.status === 'posted' && Math.round(debit * 100) !== Math.round(credit * 100)) return res.status(400).json({ message: `Unbalanced: debits ${debit} ≠ credits ${credit}` });
        const number = b.number || await nextNumber(req, 'accounting_journals', 'JV');
        const doc = { ...b, number, debitTotal: debit, creditTotal: credit, status: b.status || 'draft', source: b.source || 'manual', createdBy: user(req), createdAt: new Date() };
        const r = await db(req).collection('accounting_journals').insertOne(doc);
        await audit(req, 'create_journal', String(r.insertedId), { number });
        res.status(201).json({ _id: r.insertedId, ...doc });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});
router.post('/accounting_journals/:id/post', async (req, res) => {
    try {
        const j = await db(req).collection('accounting_journals').findOne({ _id: oid(req.params.id)! });
        if (!j) return res.status(404).json({ message: 'Not found' });
        if (Math.round(num(j.debitTotal) * 100) !== Math.round(num(j.creditTotal) * 100)) return res.status(400).json({ message: 'Cannot post an unbalanced entry' });
        await db(req).collection('accounting_journals').updateOne({ _id: j._id }, { $set: { status: 'posted', postedAt: new Date(), postedBy: user(req) } });
        await audit(req, 'post_journal', req.params.id);
        res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Seed a default chart of accounts.
router.post('/accounting/seed', async (req, res) => {
    if (await db(req).collection('accounting_accounts').countDocuments({}) > 0) return res.json({ ok: true, message: 'Already seeded' });
    const A = [
        ['1000', 'Cash', 'Asset'], ['1010', 'Bank', 'Asset'], ['1100', 'Accounts Receivable', 'Asset'], ['1500', 'School Assets', 'Asset'],
        ['2000', 'Accounts Payable', 'Liability'], ['2100', 'Loans', 'Liability'], ['2200', 'Accrued Expenses', 'Liability'],
        ['3000', 'Capital', 'Equity'], ['3100', 'Retained Earnings', 'Equity'],
        ['4000', 'School Fees', 'Income'], ['4100', 'Transport Income', 'Income'], ['4200', 'Canteen Income', 'Income'], ['4300', 'Donations', 'Income'],
        ['5000', 'Salaries', 'Expense'], ['5100', 'Utilities', 'Expense'], ['5200', 'Maintenance', 'Expense'], ['5300', 'Supplies', 'Expense'], ['5400', 'Transport Costs', 'Expense'],
    ];
    await db(req).collection('accounting_accounts').insertMany(A.map(([code, name, type]) => ({ code, name, type, openingBalance: 0, status: 'Active', createdAt: new Date() })));
    res.json({ ok: true, count: A.length });
});

// ── Dashboard ─────────────────────────────────────────────────────────────────
router.get('/accounting/stats', async (req, res) => {
    try {
        const { map } = await ledgerByAccount(req);
        const accounts = await db(req).collection('accounting_accounts').find({ deletedAt: { $exists: false } }).toArray().catch(() => []);
        const typeOf: Record<string, string> = {}; accounts.forEach((a: any) => typeOf[a.name] = a.type);
        const bal = (acct: string) => (map[acct]?.debit || 0) - (map[acct]?.credit || 0);
        let assets = 0, liabilities = 0, equity = 0, income = 0, expenses = 0;
        Object.keys(map).forEach(acct => { const t = typeOf[acct] || 'Expense'; const b = bal(acct); if (t === 'Asset') assets += b; else if (t === 'Liability') liabilities += -b; else if (t === 'Equity') equity += -b; else if (t === 'Income') income += -b; else expenses += b; });
        const cash = bal('Cash') + bal('Bank');

        // Receivables from unpaid invoices; payables from unpaid expenses.
        const invoices = await db(req).collection('invoices').find({ deletedAt: { $exists: false } }).toArray().catch(() => []);
        const ar = invoices.reduce((s: number, i: any) => s + num(i.balance ?? i.total_due), 0);
        const payExp = await db(req).collection('expenses').find({ deletedAt: { $exists: false }, paymentStatus: { $regex: /unpaid/i } }).toArray().catch(() => []);
        const ap = payExp.reduce((s: number, e: any) => s + num(e.totalAmount), 0);

        res.json({
            cards: { totalAssets: assets, totalLiabilities: liabilities, totalEquity: equity, totalIncome: income, totalExpenses: expenses, netProfit: income - expenses, accountsReceivable: ar, accountsPayable: ap, cashBalance: cash },
            charts: {
                incomeVsExpense: { Income: Math.round(income), Expenses: Math.round(expenses) },
                expenseBreakdown: Object.fromEntries(Object.entries(map).filter(([a]) => typeOf[a] === 'Expense').map(([a, v]) => [a, v.debit - v.credit])),
                revenueBreakdown: Object.fromEntries(Object.entries(map).filter(([a]) => typeOf[a] === 'Income').map(([a, v]) => [a, v.credit - v.debit])),
            },
        });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── General Ledger (entries for an account) ───────────────────────────────────
router.get('/accounting/ledger', async (req, res) => {
    try {
        const { journals } = await ledgerByAccount(req);
        const acct = req.query.account ? String(req.query.account) : null;
        let balance = 0; const rows: any[] = [];
        journals.sort((a: any, b: any) => new Date(a.date || a.createdAt).getTime() - new Date(b.date || b.createdAt).getTime()).forEach((j: any) => {
            (j.lines || []).forEach((l: any) => {
                if (acct && l.account !== acct) return;
                const debit = l.type === 'debit' ? num(l.amount) : 0; const credit = l.type === 'credit' ? num(l.amount) : 0;
                balance += debit - credit;
                rows.push({ date: j.date || j.createdAt, description: j.description, account: l.account, reference: j.reference || j.number, debit, credit, balance });
            });
        });
        res.json({ account: acct, rows });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Trial balance ─────────────────────────────────────────────────────────────
router.get('/accounting/trial-balance', async (req, res) => {
    try {
        const { map } = await ledgerByAccount(req);
        const accounts = await db(req).collection('accounting_accounts').find({}).toArray().catch(() => []);
        const codeOf: Record<string, string> = {}; accounts.forEach((a: any) => codeOf[a.name] = a.code);
        const rows = Object.entries(map).map(([account, v]) => ({ code: codeOf[account] || '', account, debit: v.debit, credit: v.credit, balance: v.debit - v.credit }));
        const totalDebit = rows.reduce((s, r) => s + r.debit, 0); const totalCredit = rows.reduce((s, r) => s + r.credit, 0);
        res.json({ rows, totalDebit, totalCredit, balanced: Math.round(totalDebit * 100) === Math.round(totalCredit * 100) });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Income statement / balance sheet / cash flow ──────────────────────────────
router.get('/accounting/income-statement', async (req, res) => {
    try {
        const { map } = await ledgerByAccount(req);
        const accounts = await db(req).collection('accounting_accounts').find({}).toArray().catch(() => []);
        const typeOf: Record<string, string> = {}; accounts.forEach((a: any) => typeOf[a.name] = a.type);
        const income = Object.entries(map).filter(([a]) => typeOf[a] === 'Income').map(([account, v]) => ({ account, amount: v.credit - v.debit }));
        const expenses = Object.entries(map).filter(([a]) => typeOf[a] === 'Expense').map(([account, v]) => ({ account, amount: v.debit - v.credit }));
        const totalIncome = income.reduce((s, r) => s + r.amount, 0); const totalExpense = expenses.reduce((s, r) => s + r.amount, 0);
        res.json({ income, expenses, totalIncome, totalExpense, netProfit: totalIncome - totalExpense });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});
router.get('/accounting/balance-sheet', async (req, res) => {
    try {
        const { map } = await ledgerByAccount(req);
        const accounts = await db(req).collection('accounting_accounts').find({}).toArray().catch(() => []);
        const typeOf: Record<string, string> = {}; accounts.forEach((a: any) => typeOf[a.name] = a.type);
        const assets = Object.entries(map).filter(([a]) => typeOf[a] === 'Asset').map(([account, v]) => ({ account, amount: v.debit - v.credit }));
        const liabilities = Object.entries(map).filter(([a]) => typeOf[a] === 'Liability').map(([account, v]) => ({ account, amount: v.credit - v.debit }));
        const equity = Object.entries(map).filter(([a]) => typeOf[a] === 'Equity').map(([account, v]) => ({ account, amount: v.credit - v.debit }));
        const tA = assets.reduce((s, r) => s + r.amount, 0); const tL = liabilities.reduce((s, r) => s + r.amount, 0); let tE = equity.reduce((s, r) => s + r.amount, 0);
        // Net profit rolls into equity.
        const inc = Object.entries(map).filter(([a]) => typeOf[a] === 'Income').reduce((s, [, v]) => s + (v.credit - v.debit), 0);
        const exp = Object.entries(map).filter(([a]) => typeOf[a] === 'Expense').reduce((s, [, v]) => s + (v.debit - v.credit), 0);
        tE += inc - exp;
        res.json({ assets, liabilities, equity: [...equity, { account: 'Net Surplus (Income − Expenses)', amount: inc - exp }], totalAssets: tA, totalLiabilities: tL, totalEquity: tE, balanced: Math.round(tA * 100) === Math.round((tL + tE) * 100) });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});
router.get('/accounting/cash-flow', async (req, res) => {
    try {
        const { map } = await ledgerByAccount(req);
        const accounts = await db(req).collection('accounting_accounts').find({}).toArray().catch(() => []);
        const typeOf: Record<string, string> = {}; accounts.forEach((a: any) => typeOf[a.name] = a.type);
        const inc = Object.entries(map).filter(([a]) => typeOf[a] === 'Income').reduce((s, [, v]) => s + (v.credit - v.debit), 0);
        const exp = Object.entries(map).filter(([a]) => typeOf[a] === 'Expense').reduce((s, [, v]) => s + (v.debit - v.credit), 0);
        const cash = (map['Cash']?.debit || 0) - (map['Cash']?.credit || 0) + (map['Bank']?.debit || 0) - (map['Bank']?.credit || 0);
        res.json({ operating: inc - exp, investing: 0, financing: 0, openingBalance: 0, closingBalance: cash, net: inc - exp });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── AR / AP with aging ────────────────────────────────────────────────────────
router.get('/accounting/receivables', async (req, res) => {
    try {
        const invoices = await db(req).collection('invoices').find({ deletedAt: { $exists: false } }).toArray().catch(() => []);
        const aging = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
        const rows = invoices.filter((i: any) => num(i.balance ?? i.total_due) > 0).map((i: any) => {
            const days = Math.floor((Date.now() - new Date(i.date || i.createdAt).getTime()) / 86400000);
            const bal = num(i.balance ?? i.total_due);
            const bucket = days <= 30 ? '0-30' : days <= 60 ? '31-60' : days <= 90 ? '61-90' : '90+'; (aging as any)[bucket] += bal;
            return { student: i.studentName || '—', invoice: i.invoice_no, balance: bal, days, bucket };
        });
        res.json({ rows, aging, total: rows.reduce((s: number, r: any) => s + r.balance, 0) });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});
router.get('/accounting/payables', async (req, res) => {
    try {
        const exps = await db(req).collection('expenses').find({ deletedAt: { $exists: false }, paymentStatus: { $regex: /unpaid|partial/i } }).toArray().catch(() => []);
        const rows = exps.map((e: any) => ({ supplier: e.supplier || '—', invoice: e.invoiceNumber || e.number, amount: num(e.totalAmount), date: e.date }));
        res.json({ rows, total: rows.reduce((s: number, r: any) => s + r.amount, 0) });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Settings ──────────────────────────────────────────────────────────────────
router.get('/accounting/settings', async (req, res) => { const s: any = (await db(req).collection('accounting_settings').findOne({})) || {}; res.json({ accountTypes: ACCOUNT_TYPES, financialYear: s.financialYear ?? String(new Date().getFullYear()), currency: s.currency ?? 'KES', ...s }); });
router.patch('/accounting/settings', async (req, res) => { await db(req).collection('accounting_settings').updateOne({}, { $set: { ...req.body, updatedAt: new Date() } }, { upsert: true }); res.json({ ok: true }); });

void ksh;
export default router;
