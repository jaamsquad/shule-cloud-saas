/**
 * Procurement module — request → PO → goods → invoice → payment.
 *
 * SHARES with Expense: procurement_suppliers, procurement_pr, procurement_po
 * (those CRUD endpoints are already served by the Expense module). This module
 * adds: quotations, goods-received (GRN, updates inventory), invoice matching
 * (3-way), contracts, tenders, dashboard, reports, and supplier performance.
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
const audit = async (req: Request, action: string, target: string, meta: any = {}) => { try { await db(req).collection('audit_logs').insertOne({ scope: 'procurement', action, target, meta, user: user(req), changedAt: new Date(), createdAt: new Date() }); } catch { /* */ } };

async function nextNumber(req: Request, coll: string, prefix: string) {
    const year = new Date().getFullYear();
    const count = await db(req).collection(coll).countDocuments({ number: new RegExp(`^${prefix}-${year}-`) }).catch(() => 0);
    return `${prefix}-${year}-${String(count + 1).padStart(4, '0')}`;
}

function crud(coll: string, prefix?: string, afterCreate?: (req: Request, doc: any) => Promise<void>) {
    router.get(`/${coll}`, async (req, res) => {
        try { const q: any = { deletedAt: { $exists: false } }; ['supplier', 'status', 'department', 'po'].forEach(k => { if (req.query[k]) q[k] = String(req.query[k]); }); res.json(await db(req).collection(coll).find(q).sort({ createdAt: -1 }).limit(1000).toArray()); }
        catch (e: any) { res.status(500).json({ message: e.message }); }
    });
    router.post(`/${coll}`, async (req, res) => {
        try { const doc: any = { ...req.body, createdBy: user(req), createdAt: new Date() }; if (prefix && !doc.number) doc.number = await nextNumber(req, coll, prefix); const r = await db(req).collection(coll).insertOne(doc); if (afterCreate) await afterCreate(req, { _id: r.insertedId, ...doc }); await audit(req, `create_${coll}`, String(r.insertedId), { number: doc.number }); res.status(201).json({ _id: r.insertedId, ...doc }); }
        catch (e: any) { res.status(500).json({ message: e.message }); }
    });
    router.patch(`/${coll}/:id`, async (req, res) => {
        try { await db(req).collection(coll).updateOne({ _id: oid(req.params.id)! }, { $set: { ...sanitizeUpdate(req.body), updatedAt: new Date(), updatedBy: user(req) } }); await audit(req, `update_${coll}`, req.params.id); res.json({ ok: true }); }
        catch (e: any) { res.status(500).json({ message: e.message }); }
    });
    router.delete(`/${coll}/:id`, async (req, res) => {
        try { await db(req).collection(coll).updateOne({ _id: oid(req.params.id)! }, { $set: { deletedAt: new Date(), deletedBy: user(req) } }); await audit(req, `delete_${coll}`, req.params.id); res.json({ ok: true }); }
        catch (e: any) { res.status(500).json({ message: e.message }); }
    });
}

crud('procurement_quotations', 'RFQ');
crud('procurement_contracts', 'CON');
crud('procurement_tenders', 'TND');
// Goods received → bump inventory (pos_products) on create.
crud('procurement_grn', 'GRN', async (req, doc) => {
    try {
        if (doc.itemName && num(doc.acceptedQuantity)) {
            await db(req).collection('pos_products').updateOne({ name: doc.itemName }, { $inc: { stock: num(doc.acceptedQuantity) } });
        }
    } catch { /* inventory optional */ }
});

// ── Dashboard ─────────────────────────────────────────────────────────────────
router.get('/procurement/stats', async (req, res) => {
    try {
        const [prs, pos, suppliers, grns, contracts] = await Promise.all([
            db(req).collection('procurement_pr').find({ deletedAt: { $exists: false } }).toArray().catch(() => []),
            db(req).collection('procurement_po').find({ deletedAt: { $exists: false } }).toArray().catch(() => []),
            db(req).collection('procurement_suppliers').find({ deletedAt: { $exists: false } }).toArray().catch(() => []),
            db(req).collection('procurement_grn').find({ deletedAt: { $exists: false } }).toArray().catch(() => []),
            db(req).collection('procurement_contracts').find({ deletedAt: { $exists: false } }).toArray().catch(() => []),
        ]);
        const byMonth: Record<string, number> = {}; const byDept: Record<string, number> = {}; const byCat: Record<string, number> = {};
        pos.forEach((p: any) => { const m = String(p.date || p.createdAt).slice(0, 7); if (m) byMonth[m] = (byMonth[m] || 0) + num(p.totalCost); byDept[p.department || 'General'] = (byDept[p.department || 'General'] || 0) + num(p.totalCost); });
        prs.forEach((p: any) => { byCat[p.category || 'General'] = (byCat[p.category || 'General'] || 0) + num(p.estimatedCost); });

        res.json({
            cards: {
                pendingRequests: prs.filter((p: any) => /submitted|pending|draft/i.test(p.status || '')).length,
                approvedRequests: prs.filter((p: any) => /approved/i.test(p.status || '')).length,
                purchaseOrders: pos.length,
                outstandingDeliveries: pos.filter((p: any) => !/delivered/i.test(p.status || '')).length,
                goodsReceived: grns.length,
                pendingPayments: pos.filter((p: any) => /unpaid|pending/i.test(p.paymentStatus || '')).length,
                activeSuppliers: suppliers.filter((s: any) => !/inactive/i.test(s.status || '')).length,
                activeContracts: contracts.filter((c: any) => !c.endDate || new Date(c.endDate) > new Date()).length,
            },
            charts: { byMonth, byDept, byCat },
        });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Supplier performance ──────────────────────────────────────────────────────
router.get('/procurement/supplier-performance', async (req, res) => {
    try {
        const [suppliers, pos, grns] = await Promise.all([
            db(req).collection('procurement_suppliers').find({ deletedAt: { $exists: false } }).toArray().catch(() => []),
            db(req).collection('procurement_po').find({ deletedAt: { $exists: false } }).toArray().catch(() => []),
            db(req).collection('procurement_grn').find({ deletedAt: { $exists: false } }).toArray().catch(() => []),
        ]);
        const rows = suppliers.map((s: any) => {
            const myPos = pos.filter((p: any) => p.supplier === s.name);
            const myGrns = grns.filter((g: any) => g.supplier === s.name);
            const onTime = myGrns.filter((g: any) => g.deliveryDate && g.expectedDelivery && new Date(g.deliveryDate) <= new Date(g.expectedDelivery)).length;
            const total = myPos.reduce((a: number, p: any) => a + num(p.totalCost), 0);
            return { name: s.name, totalOrders: myPos.length, onTime, late: myGrns.length - onTime, totalPurchases: total, rating: s.rating || (myGrns.length ? Math.round(onTime / myGrns.length * 5 * 10) / 10 : 0) };
        });
        res.json(rows);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Invoice matching (3-way: PR ↔ PO ↔ Invoice) ───────────────────────────────
router.post('/procurement/match', async (req, res) => {
    try {
        const { poNumber, invoiceQty, invoicePrice, invoiceNumber } = req.body || {};
        const po = await db(req).collection('procurement_po').findOne({ number: poNumber, deletedAt: { $exists: false } });
        if (!po) return res.status(404).json({ message: 'Purchase order not found' });
        const issues: string[] = [];
        if (num(invoiceQty) !== num(po.quantity)) issues.push(`Quantity mismatch: PO ${po.quantity} vs invoice ${invoiceQty}`);
        if (num(invoicePrice) && num(po.unitPrice) && num(invoicePrice) !== num(po.unitPrice)) issues.push(`Price mismatch: PO ${po.unitPrice} vs invoice ${invoicePrice}`);
        const dup = await db(req).collection('procurement_invoices').findOne({ invoiceNumber, supplier: po.supplier });
        if (dup) issues.push('Duplicate invoice number for this supplier');
        await db(req).collection('procurement_invoices').insertOne({ invoiceNumber, poNumber, supplier: po.supplier, invoiceQty: num(invoiceQty), invoicePrice: num(invoicePrice), matched: issues.length === 0, issues, createdAt: new Date(), createdBy: user(req) });
        res.json({ matched: issues.length === 0, issues, po: { number: po.number, quantity: po.quantity, unitPrice: po.unitPrice, supplier: po.supplier } });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});
router.get('/procurement_invoices', async (req, res) => {
    try { res.json(await db(req).collection('procurement_invoices').find({}).sort({ createdAt: -1 }).limit(500).toArray()); }
    catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Reports ───────────────────────────────────────────────────────────────────
router.get('/procurement/reports/:kind', async (req, res) => {
    try {
        const kind = req.params.kind;
        if (kind === 'pos') { const pos = await db(req).collection('procurement_po').find({ deletedAt: { $exists: false } }).toArray().catch(() => []); return res.json({ title: 'Purchase Order Report', columns: [{ key: 'number', label: 'PO No' }, { key: 'supplier', label: 'Supplier' }, { key: 'totalCost', label: 'Total', type: 'money' }, { key: 'status', label: 'Status' }, { key: 'date', label: 'Date', type: 'date' }], rows: pos }); }
        if (kind === 'grn') { const grns = await db(req).collection('procurement_grn').find({ deletedAt: { $exists: false } }).toArray().catch(() => []); return res.json({ title: 'Goods Received Report', columns: [{ key: 'number', label: 'GRN No' }, { key: 'supplier', label: 'Supplier' }, { key: 'itemName', label: 'Item' }, { key: 'acceptedQuantity', label: 'Accepted' }, { key: 'deliveryDate', label: 'Delivered', type: 'date' }], rows: grns }); }
        if (kind === 'contracts') { const c = await db(req).collection('procurement_contracts').find({ deletedAt: { $exists: false } }).toArray().catch(() => []); return res.json({ title: 'Contract Report', columns: [{ key: 'number', label: 'Contract No' }, { key: 'supplier', label: 'Supplier' }, { key: 'contractValue', label: 'Value', type: 'money' }, { key: 'startDate', label: 'Start', type: 'date' }, { key: 'endDate', label: 'End', type: 'date' }], rows: c }); }
        const prs = await db(req).collection('procurement_pr').find({ deletedAt: { $exists: false } }).toArray().catch(() => []);
        res.json({ title: 'Purchase Request Report', columns: [{ key: 'number', label: 'Request No' }, { key: 'department', label: 'Department' }, { key: 'estimatedCost', label: 'Est. Cost', type: 'money' }, { key: 'priority', label: 'Priority' }, { key: 'status', label: 'Status' }], rows: prs });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Settings + alerts ─────────────────────────────────────────────────────────
router.get('/procurement/settings', async (req, res) => { const s: any = (await db(req).collection('procurement_settings').findOne({})) || {}; res.json({ approvalLevels: s.approvalLevels ?? ['Department Head', 'Finance Officer', 'Procurement Officer', 'Principal'], categories: s.categories ?? ['Stationery', 'ICT', 'Furniture', 'Food', 'Construction', 'Services'], ...s }); });
router.patch('/procurement/settings', async (req, res) => { await db(req).collection('procurement_settings').updateOne({}, { $set: { ...req.body, updatedAt: new Date() } }, { upsert: true }); res.json({ ok: true }); });
router.get('/procurement/alerts', async (req, res) => {
    try {
        const alerts: any[] = [];
        const pending = await db(req).collection('procurement_pr').countDocuments({ deletedAt: { $exists: false }, status: { $regex: /submitted|pending/i } }).catch(() => 0); if (pending) alerts.push({ level: 'info', message: `${pending} request(s) need approval` });
        const contracts = await db(req).collection('procurement_contracts').find({ deletedAt: { $exists: false } }).toArray().catch(() => []);
        const soon = new Date(Date.now() + 30 * 86400000); contracts.forEach((c: any) => { if (c.endDate && new Date(c.endDate) < soon && new Date(c.endDate) > new Date()) alerts.push({ level: 'warning', message: `Contract ${c.number} (${c.supplier}) expires soon` }); });
        const overdue = await db(req).collection('procurement_po').countDocuments({ deletedAt: { $exists: false }, status: { $not: /delivered/i }, expectedDelivery: { $lt: new Date().toISOString().slice(0, 10) } }).catch(() => 0); if (overdue) alerts.push({ level: 'warning', message: `${overdue} delivery(ies) overdue` });
        res.json(alerts.slice(0, 50));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

export default router;
