/**
 * Business side of the owner portal: quotations, invoices and contracts ShuleCloud issues
 * to schools — plus the public, shareable, printable pages for them.
 *
 *   /api/v1/owner/business/...        owner portal (owner JWT; roles super_owner / owner / finance / sales)
 *   /api/v1/public/docs/...           the customer's link  (no login; exempt from tenancy)
 *
 * See services/bizDocs.service.ts for the data model and payment settlement.
 */
import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import { getMetaDb } from '../lib/mongodb';
import { resolveMpesaConfig, isMpesaConfigured, stkPush, stkQuery, platformCallbackBaseV1, parseStkCallback, normalizeMsisdn } from '../services/mpesa.service';
import {
    DocType, DOC_TYPES, TERM_DAYS, todayISO, newPublicId, nextDocNumber, computeTotals, applyPayments,
    effectiveStatus, isPayable, recordPayment, settleBusinessPayment,
} from '../services/bizDocs.service';

const num = (v: any) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const str = (v: any, max = 500) => String(v ?? '').trim().slice(0, max);
const oid = (id: string) => { try { return new ObjectId(id); } catch { return null; } };
const meta = () => getMetaDb();
const isType = (t: any): t is DocType => DOC_TYPES.includes(t);

// ─── Company (issuer) details shown on every document ────────────────────────
const COMPANY_DEFAULTS = {
    companyName: 'ShuleCloud', tagline: 'School management, in the cloud', address: '', phone: '', email: '', website: 'www.shulecloud.com',
    kraPin: '', logo: '', bankName: '', accountName: '', accountNo: '', bankBranch: '',
    paymentInstructions: '', invoiceTerms: 'Payment is due by the due date shown. Services may be suspended on overdue accounts.',
    quoteTerms: 'This quotation is valid until the expiry date shown. Prices exclude any items not listed.',
    footer: 'Thank you for choosing ShuleCloud.', quoteValidityDays: 30,
};
const getCompany = async () => ({ ...COMPANY_DEFAULTS, ...(((await meta().collection('platform_settings').findOne({ key: 'business' })) as any)?.company || {}) });

// ═════════════════════════════════════════════════════════════════════════════
//  OWNER PORTAL
// ═════════════════════════════════════════════════════════════════════════════
export const ownerBusinessRouter = Router();

const BIZ_ROLES = ['super_owner', 'owner', 'finance', 'sales'];
ownerBusinessRouter.use((req: Request, res: Response, next) => {
    try {
        const auth = req.headers.authorization;
        if (!auth) return res.status(401).json({ message: 'Unauthorized' });
        const claims: any = jwt.verify(auth.split(' ')[1], process.env.OWNER_JWT_SECRET || 'owner_secret');
        if (!BIZ_ROLES.includes(String(claims.role || '').toLowerCase())) return res.status(403).json({ message: 'Your role does not have access to Business documents.' });
        (req as any).owner = claims;
        next();
    } catch { res.status(401).json({ message: 'Unauthorized' }); }
});
const actor = (req: Request) => { const c = (req as any).owner || {}; return c.name || c.email || 'owner'; };

// Company details
ownerBusinessRouter.get('/settings', async (_req, res) => { res.json(await getCompany()); });
ownerBusinessRouter.put('/settings', async (req, res) => {
    const b = req.body || {};
    const company: any = {};
    for (const k of Object.keys(COMPANY_DEFAULTS)) if (b[k] !== undefined) company[k] = k === 'logo' ? String(b[k] || '').slice(0, 400_000) : (k === 'quoteValidityDays' ? Math.min(365, Math.max(1, num(b[k]) || 30)) : str(b[k], 1000));
    await meta().collection('platform_settings').updateOne({ key: 'business' }, { $set: { ...Object.fromEntries(Object.entries(company).map(([k, v]) => [`company.${k}`, v])), updatedAt: new Date() } }, { upsert: true });
    res.json(await getCompany());
});

// Schools that can be billed (with the details to print on the document)
ownerBusinessRouter.get('/customers', async (_req, res) => {
    try {
        const tenants: any[] = await meta().collection('Tenant').find({}).toArray();
        res.json(tenants.map(t => ({
            tenantId: String(t._id), name: t.instituteName || t.name || t.subdomain, subdomain: t.subdomain,
            email: t.contactEmail || t.email || t.adminEmail || '', phone: t.contactPhone || t.phone || t.adminPhone || '',
            address: t.address || t.location || [t.city, t.county].filter(Boolean).join(', ') || '', status: t.status,
        })).sort((a, b) => String(a.name).localeCompare(String(b.name))));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── input cleaning ──
function cleanInput(type: DocType, b: any) {
    const c = b.customer || {};
    const out: any = {
        customer: { tenantId: c.tenantId ? str(c.tenantId, 40) : '', name: str(c.name, 200), contactPerson: str(c.contactPerson, 200), email: str(c.email, 200), phone: str(c.phone, 40), address: str(c.address, 400) },
        subject: str(b.subject, 300), salesperson: str(b.salesperson, 120), orderNumber: str(b.orderNumber, 80), currency: str(b.currency, 5) || 'KES',
        date: /^\d{4}-\d{2}-\d{2}$/.test(b.date) ? b.date : todayISO(),
        notes: str(b.notes, 3000), termsAndConditions: str(b.termsAndConditions, 6000),
        items: (Array.isArray(b.items) ? b.items : []).slice(0, 100).map((it: any) => ({ description: str(it.description, 800), quantity: num(it.quantity) || 0, rate: Math.max(0, num(it.rate)), taxPercent: Math.min(100, Math.max(0, num(it.taxPercent))) })).filter((it: any) => it.description || it.rate),
        discount: { value: Math.max(0, num(b.discount?.value)), type: b.discount?.type === 'amount' ? 'amount' : '%' },
        shipping: num(b.shipping), adjustment: num(b.adjustment),
    };
    if (type === 'invoice') {
        out.terms = TERM_DAYS[b.terms] !== undefined ? b.terms : 'Net 30';
        out.dueDate = /^\d{4}-\d{2}-\d{2}$/.test(b.dueDate) ? b.dueDate : new Date(new Date(out.date).getTime() + TERM_DAYS[out.terms] * 86400000).toISOString().slice(0, 10);
        // Paying this invoice in full puts the school on this plan.
        const s = b.subscription;
        out.subscription = s?.tenantId && s?.planId ? { tenantId: str(s.tenantId, 40), planId: str(s.planId, 40), planName: str(s.planName, 120) } : null;
    }
    if (type === 'quote') out.expiryDate = /^\d{4}-\d{2}-\d{2}$/.test(b.expiryDate) ? b.expiryDate : '';
    if (type === 'contract') {
        const k = b.contract || {};
        out.contract = {
            title: str(k.title, 300) || 'Software Subscription Agreement', startDate: str(k.startDate, 10), endDate: str(k.endDate, 10),
            billingCycle: str(k.billingCycle, 60), value: Math.max(0, num(k.value)),
            clauses: (Array.isArray(k.clauses) ? k.clauses : []).slice(0, 60).map((x: any) => ({ heading: str(x.heading, 200), body: str(x.body, 6000) })).filter((x: any) => x.heading || x.body),
            providerSignatory: { name: str(k.providerSignatory?.name, 150), title: str(k.providerSignatory?.title, 150) },
            clientSignatory: { name: str(k.clientSignatory?.name, 150), title: str(k.clientSignatory?.title, 150) },
        };
        const s = b.subscription;
        out.subscription = s?.tenantId && s?.planId ? { tenantId: str(s.tenantId, 40), planId: str(s.planId, 40), planName: str(s.planName, 120) } : null;
    }
    return out;
}

const view = (d: any) => ({ ...d, _id: String(d._id), status: effectiveStatus(d), storedStatus: d.status });

// List + headline numbers
ownerBusinessRouter.get('/docs', async (req, res) => {
    try {
        const type = req.query.type; if (!isType(type)) return res.status(400).json({ message: 'type must be invoice, quote or contract' });
        const docs: any[] = (await meta().collection('biz_documents').find({ type }).sort({ createdAt: -1 }).limit(1000).toArray()).map(view);
        const q = str(req.query.q, 100).toLowerCase();
        const list = q ? docs.filter(d => `${d.number} ${d.customer?.name} ${d.subject}`.toLowerCase().includes(q)) : docs;

        const monthStart = todayISO().slice(0, 7);
        const stats: any = { count: docs.length };
        if (type === 'invoice') {
            const open = docs.filter(d => ['sent', 'partially_paid', 'overdue'].includes(d.status));
            stats.outstanding = open.reduce((s, d) => s + num(d.balanceDue), 0);
            stats.overdue = docs.filter(d => d.status === 'overdue').reduce((s, d) => s + num(d.balanceDue), 0);
            stats.overdueCount = docs.filter(d => d.status === 'overdue').length;
            stats.paidThisMonth = docs.flatMap(d => d.payments || []).filter((p: any) => String(p.date).startsWith(monthStart)).reduce((s: number, p: any) => s + num(p.amount), 0);
        } else if (type === 'quote') {
            stats.totalValue = docs.reduce((s, d) => s + num(d.total), 0);
            stats.acceptedNotInvoiced = docs.filter(d => d.status === 'accepted' && !d.invoiceId).reduce((s, d) => s + num(d.total), 0);
            stats.sent = docs.filter(d => d.status === 'sent').length;
        } else {
            stats.signed = docs.filter(d => d.status === 'signed').length;
            stats.awaiting = docs.filter(d => d.status === 'sent').length;
            stats.totalValue = docs.filter(d => d.status === 'signed').reduce((s, d) => s + num(d.contract?.value), 0);
        }
        res.json({ docs: list, stats });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

ownerBusinessRouter.get('/docs/:id', async (req, res) => {
    const _id = oid(req.params.id); if (!_id) return res.status(400).json({ message: 'Invalid id' });
    const d: any = await meta().collection('biz_documents').findOne({ _id });
    if (!d) return res.status(404).json({ message: 'Not found' });
    res.json({ doc: view(d), company: await getCompany() });
});

ownerBusinessRouter.post('/docs', async (req, res) => {
    try {
        const type = req.body?.type; if (!isType(type)) return res.status(400).json({ message: 'type must be invoice, quote or contract' });
        const input = cleanInput(type, req.body);
        if (!input.customer.name) return res.status(400).json({ message: 'Choose or enter the customer.' });
        if (type !== 'contract' && !input.items.length) return res.status(400).json({ message: 'Add at least one item.' });
        const company = await getCompany();
        if (type === 'quote' && !input.expiryDate) input.expiryDate = new Date(new Date(input.date).getTime() + num(company.quoteValidityDays) * 86400000).toISOString().slice(0, 10);
        if (!input.termsAndConditions && type !== 'contract') input.termsAndConditions = type === 'invoice' ? company.invoiceTerms : company.quoteTerms;

        const totals = computeTotals(input);
        const doc: any = {
            type, number: await nextDocNumber(meta(), type), publicId: newPublicId(), status: 'draft', ...input, ...totals,
            payments: [], amountPaid: 0, balanceDue: totals.total, createdBy: actor(req), createdAt: new Date(), updatedAt: new Date(),
        };
        if (type === 'contract') doc.total = doc.contract.value, doc.balanceDue = 0;
        const r = await meta().collection('biz_documents').insertOne(doc);
        res.status(201).json({ doc: view({ ...doc, _id: r.insertedId }) });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

ownerBusinessRouter.put('/docs/:id', async (req, res) => {
    try {
        const _id = oid(req.params.id); if (!_id) return res.status(400).json({ message: 'Invalid id' });
        const d: any = await meta().collection('biz_documents').findOne({ _id });
        if (!d) return res.status(404).json({ message: 'Not found' });
        if (d.status === 'void') return res.status(409).json({ message: 'A void document cannot be edited.' });
        if (d.type === 'invoice' && (d.payments || []).length && ['paid'].includes(d.status)) return res.status(409).json({ message: 'A paid invoice cannot be edited.' });
        if (d.type === 'contract' && d.status === 'signed') return res.status(409).json({ message: 'A signed contract cannot be edited.' });
        const input = cleanInput(d.type, { ...req.body, date: req.body?.date || d.date });
        if (!input.customer.name) return res.status(400).json({ message: 'Choose or enter the customer.' });
        const totals = computeTotals(input);
        const next: any = { ...d, ...input, ...totals };
        if (d.type === 'contract') next.total = input.contract.value;
        const applied = d.type === 'invoice' ? applyPayments(next) : { amountPaid: 0, balanceDue: d.type === 'contract' ? 0 : totals.total, status: d.status };
        await meta().collection('biz_documents').updateOne({ _id }, { $set: { ...input, ...totals, ...(d.type === 'contract' ? { total: input.contract.value } : {}), ...applied, updatedAt: new Date(), updatedBy: actor(req) } });
        res.json({ doc: view(await meta().collection('biz_documents').findOne({ _id })) });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Only drafts are deleted; anything that has been sent is voided (numbers are never reused).
ownerBusinessRouter.delete('/docs/:id', async (req, res) => {
    const _id = oid(req.params.id); if (!_id) return res.status(400).json({ message: 'Invalid id' });
    const d: any = await meta().collection('biz_documents').findOne({ _id });
    if (!d) return res.status(404).json({ message: 'Not found' });
    if (d.status !== 'draft' || (d.payments || []).length) return res.status(409).json({ message: 'Only unsent drafts can be deleted — void it instead.' });
    await meta().collection('biz_documents').deleteOne({ _id });
    res.json({ ok: true });
});

// Manual status changes (mark sent / accepted / declined / signed / void / reopen)
const MANUAL: Record<DocType, string[]> = { invoice: ['draft', 'sent', 'void'], quote: ['draft', 'sent', 'accepted', 'declined', 'void'], contract: ['draft', 'sent', 'signed', 'void'] };
ownerBusinessRouter.post('/docs/:id/status', async (req, res) => {
    const _id = oid(req.params.id); if (!_id) return res.status(400).json({ message: 'Invalid id' });
    const d: any = await meta().collection('biz_documents').findOne({ _id });
    if (!d) return res.status(404).json({ message: 'Not found' });
    const status = String(req.body?.status || '');
    if (!MANUAL[d.type as DocType].includes(status)) return res.status(400).json({ message: `Cannot set a ${d.type} to "${status}".` });
    if (d.type === 'invoice' && status === 'void' && (d.payments || []).length) return res.status(409).json({ message: 'This invoice has payments — it cannot be voided.' });
    const set: any = { status, updatedAt: new Date() };
    if (status === 'sent' && !d.sentAt) set.sentAt = new Date();
    if (status === 'accepted') set.acceptedAt = new Date();
    if (status === 'declined') set.declinedAt = new Date();
    if (status === 'signed') set.signedAt = new Date();
    const merged = { ...d, ...set };
    if (d.type === 'invoice') Object.assign(set, applyPayments(merged));
    await meta().collection('biz_documents').updateOne({ _id }, { $set: set });
    res.json({ doc: view(await meta().collection('biz_documents').findOne({ _id })) });
});

// Record a payment received outside the online flow (bank, cash, cheque, M-PESA to the till…)
ownerBusinessRouter.post('/docs/:id/payments', async (req, res) => {
    try {
        const _id = oid(req.params.id); if (!_id) return res.status(400).json({ message: 'Invalid id' });
        const d: any = await meta().collection('biz_documents').findOne({ _id });
        if (!d || d.type !== 'invoice') return res.status(404).json({ message: 'Invoice not found' });
        if (d.status === 'void') return res.status(409).json({ message: 'This invoice is void.' });
        const amount = num(req.body?.amount);
        if (amount <= 0) return res.status(400).json({ message: 'Enter the amount received.' });
        if (amount > num(d.balanceDue) + 0.005) return res.status(400).json({ message: `The amount is more than the balance due (${d.balanceDue}).` });
        await recordPayment(meta(), _id, { amount, method: str(req.body?.method, 30) || 'Other', reference: str(req.body?.reference, 80), date: /^\d{4}-\d{2}-\d{2}$/.test(req.body?.date) ? req.body.date : todayISO(), by: actor(req), note: str(req.body?.note, 300) });
        res.json({ doc: view(await meta().collection('biz_documents').findOne({ _id })) });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Quote → invoice
ownerBusinessRouter.post('/docs/:id/convert', async (req, res) => {
    try {
        const _id = oid(req.params.id); if (!_id) return res.status(400).json({ message: 'Invalid id' });
        const q: any = await meta().collection('biz_documents').findOne({ _id });
        if (!q || q.type !== 'quote') return res.status(404).json({ message: 'Quotation not found' });
        if (q.invoiceId) return res.status(409).json({ message: 'This quotation has already been invoiced.' });
        const company = await getCompany();
        const date = todayISO();
        const input = { customer: q.customer, subject: q.subject, salesperson: q.salesperson, orderNumber: q.orderNumber, currency: q.currency, date, terms: 'Net 30', dueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10), items: q.items, discount: q.discount, shipping: q.shipping, adjustment: q.adjustment, notes: q.notes, termsAndConditions: company.invoiceTerms, subscription: q.subscription || null };
        const totals = computeTotals(input);
        const inv: any = { type: 'invoice', number: await nextDocNumber(meta(), 'invoice'), publicId: newPublicId(), status: 'draft', ...input, ...totals, payments: [], amountPaid: 0, balanceDue: totals.total, quoteId: String(q._id), quoteNumber: q.number, createdBy: actor(req), createdAt: new Date(), updatedAt: new Date() };
        const r = await meta().collection('biz_documents').insertOne(inv);
        await meta().collection('biz_documents').updateOne({ _id }, { $set: { invoiceId: String(r.insertedId), invoiceNumber: inv.number, ...(q.status === 'draft' || q.status === 'sent' ? { status: 'accepted', acceptedAt: new Date() } : {}), updatedAt: new Date() } });
        res.status(201).json({ doc: view({ ...inv, _id: r.insertedId }) });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// "Send": marks it sent and emails the link when the company mailbox (Settings → Company email) is set up.
ownerBusinessRouter.post('/docs/:id/send', async (req, res) => {
    try {
        const _id = oid(req.params.id); if (!_id) return res.status(400).json({ message: 'Invalid id' });
        const d: any = await meta().collection('biz_documents').findOne({ _id });
        if (!d) return res.status(404).json({ message: 'Not found' });
        if (d.status === 'void') return res.status(409).json({ message: 'This document is void.' });
        const link = `${str(req.body?.origin, 200) || 'https://shulecloud.com'}/lnk/doc/${d.type}/${d.publicId}`;
        const to = str(req.body?.to || d.customer?.email, 200);
        const label = d.type === 'quote' ? 'quotation' : d.type;
        let emailed = false, emailError = '';
        if (to && req.body?.email !== false) {
            try {
                const s: any = (await meta().collection('platform_email_settings').findOne({ key: 'smtp' })) || {};
                if (!s.host || !s.user || !s.pass) throw new Error('Company email is not set up (Settings → Company email), so the link was not emailed.');
                const company = await getCompany();
                const port = Number(s.port) || 587;
                const nodemailer = (await import('nodemailer')).default;
                const transporter = nodemailer.createTransport({ host: s.host, port, secure: port === 465, requireTLS: port !== 465, auth: { user: s.user, pass: s.pass }, connectionTimeout: 15000, greetingTimeout: 10000, socketTimeout: 20000 });
                const msg = str(req.body?.message, 2000);
                await transporter.sendMail({
                    from: `"${s.fromName || company.companyName}" <${s.user}>`, to, subject: `${company.companyName} ${label} ${d.number}${d.subject ? ` — ${d.subject}` : ''}`,
                    html: `<div style="font-family:Arial,sans-serif;color:#111;max-width:560px"><p>Dear ${str(d.customer?.contactPerson || d.customer?.name, 150)},</p>${msg ? `<p>${msg.replace(/\n/g, '<br>')}</p>` : `<p>Please find your ${label} <b>${d.number}</b>${d.type !== 'contract' ? ` for <b>${d.currency} ${Number(d.total).toLocaleString()}</b>` : ''} at the link below.</p>`}<p><a href="${link}" style="background:#534AB7;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:bold">View ${label}</a></p><p style="color:#666;font-size:12px">Or copy this link: ${link}</p><p>Regards,<br>${company.companyName}</p></div>`,
                });
                emailed = true;
            } catch (e: any) { emailError = e?.message || 'Email failed'; }
        }
        const set: any = { updatedAt: new Date(), ...(d.status === 'draft' ? { status: 'sent' } : {}), ...(d.sentAt ? {} : { sentAt: new Date() }) };
        await meta().collection('biz_documents').updateOne({ _id }, { $set: set });
        res.json({ link, emailed, emailError, doc: view(await meta().collection('biz_documents').findOne({ _id })) });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ═════════════════════════════════════════════════════════════════════════════
//  PUBLIC LINKS  —  /api/v1/public/docs/:type/:publicId
// ═════════════════════════════════════════════════════════════════════════════
export const publicDocsRouter = Router();

const findPublic = async (type: string, publicId: string) => {
    if (!isType(type) || !/^[A-Za-z0-9_-]{8,40}$/.test(publicId)) return null;
    return (await meta().collection('biz_documents').findOne({ type, publicId })) as any;
};

// What the customer may see — no internal fields.
const publicView = async (d: any) => {
    const cfg = await resolveMpesaConfig(meta()).catch(() => null);
    return {
        type: d.type, number: d.number, status: effectiveStatus(d), currency: d.currency, date: d.date, terms: d.terms, dueDate: d.dueDate, expiryDate: d.expiryDate,
        customer: d.customer, subject: d.subject, salesperson: d.salesperson, orderNumber: d.orderNumber,
        items: d.items, discount: d.discount, shipping: d.shipping, adjustment: d.adjustment,
        subTotal: d.subTotal, discountAmount: d.discountAmount, taxTotal: d.taxTotal, total: d.total, amountPaid: d.amountPaid, balanceDue: d.balanceDue,
        notes: d.notes, termsAndConditions: d.termsAndConditions, contract: d.contract || null, signedAt: d.signedAt || null, quoteNumber: d.quoteNumber,
        payments: (d.payments || []).map((p: any) => ({ amount: p.amount, method: p.method, reference: p.reference, date: p.date })),
        company: await getCompany(),
        canPayOnline: isPayable(d) && !!cfg && isMpesaConfigured(cfg) && cfg.enabled !== false,
    };
};

publicDocsRouter.get('/:type/:publicId', async (req, res) => {
    try {
        const d = await findPublic(req.params.type, req.params.publicId);
        if (!d || d.status === 'draft') return res.status(404).json({ message: 'This document was not found. Check the link, or ask the sender for a new one.' });
        if (!d.viewedAt) await meta().collection('biz_documents').updateOne({ _id: d._id }, { $set: { viewedAt: new Date() } });
        res.json(await publicView(d));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Customer pays an invoice: M-PESA STK push to the platform paybill for the balance due (or a part of it).
publicDocsRouter.post('/invoice/:publicId/pay', async (req, res) => {
    try {
        const d = await findPublic('invoice', req.params.publicId);
        if (!d || d.status === 'draft') return res.status(404).json({ message: 'Invoice not found.' });
        if (d.status === 'void') return res.status(409).json({ message: 'This invoice has been cancelled.' });
        if (!isPayable(d)) return res.status(409).json({ message: d.status === 'paid' ? 'This invoice is already paid. Thank you!' : 'This invoice is not open for payment.' });

        const phone = normalizeMsisdn(str(req.body?.phone, 20));
        if (!/^254(7|1)\d{8}$/.test(phone)) return res.status(400).json({ message: 'Enter a valid Safaricom number, e.g. 0712 345 678.' });
        const balance = num(d.balanceDue);
        const asked = req.body?.amount === undefined || req.body?.amount === '' ? balance : num(req.body.amount);
        const amount = Math.round(asked);
        if (!(amount >= 1) || amount > Math.ceil(balance)) return res.status(400).json({ message: `Enter an amount between 1 and ${Math.ceil(balance).toLocaleString()}.` });

        const cfg = await resolveMpesaConfig(meta());
        if (!isMpesaConfigured(cfg) || cfg.enabled === false) return res.status(503).json({ message: 'Online payment is not available right now. Please use the payment details on the invoice.' });
        const cb = platformCallbackBaseV1();
        if (!cb) return res.status(503).json({ message: 'Online payment is not available right now (callback URL not set).' });

        const r = await stkPush(cfg, { phone, amount, accountRef: String(d.number).slice(0, 12), description: `Invoice ${d.number}`, callbackUrl: `${cb}/mpesa/callback` });
        await meta().collection('biz_payments').insertOne({ docId: d._id, docNumber: d.number, checkoutRequestId: r.checkoutRequestId, merchantRequestId: r.merchantRequestId, amount, phone, status: 'pending', createdAt: new Date() });
        res.json({ checkoutRequestId: r.checkoutRequestId, message: r.customerMessage || 'Enter your M-PESA PIN on your phone to complete the payment.' });
    } catch (e: any) { res.status(502).json({ message: e.message || 'Could not start the M-PESA payment.' }); }
});

// The page polls this while the customer enters their PIN.
publicDocsRouter.get('/invoice/:publicId/pay-status', async (req, res) => {
    try {
        const d = await findPublic('invoice', req.params.publicId);
        const cid = str(req.query.checkoutRequestId, 80);
        if (!d || !cid) return res.json({ status: 'unknown' });
        let pay: any = await meta().collection('biz_payments').findOne({ checkoutRequestId: cid, docId: d._id });
        if (!pay) return res.json({ status: 'unknown' });
        if (pay.status === 'completed') return res.json({ status: 'completed', receipt: pay.mpesaReceipt || null });
        if (pay.status === 'failed') return res.json({ status: 'failed', message: pay.resultDesc || 'The payment was not completed.' });

        // Still pending: ask Safaricom directly, which also covers a callback that never arrived.
        try {
            const cfg = await resolveMpesaConfig(meta());
            const q: any = await stkQuery(cfg, cid);
            const code = Number(q.ResultCode);
            const processing = code === 1037 || /processing|being processed|500\.001\.1001/i.test(String(q.ResultDesc || ''));
            if (String(q.ResultCode) === '0') {
                await settleBusinessPayment(meta(), pay, { receipt: undefined });   // receipt is attached when the callback arrives
                pay = await meta().collection('biz_payments').findOne({ _id: pay._id });
                return res.json({ status: 'completed', receipt: pay?.mpesaReceipt || null });
            }
            if (!isNaN(code) && code !== 0 && !processing) {
                await meta().collection('biz_payments').updateOne({ _id: pay._id, status: 'pending' }, { $set: { status: 'failed', resultDesc: q.ResultDesc, completedAt: new Date() } });
                return res.json({ status: 'failed', message: q.ResultDesc || 'The payment was not completed.' });
            }
        } catch { /* keep waiting */ }
        res.json({ status: 'pending' });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Quotation: customer accepts or declines.
publicDocsRouter.post('/quote/:publicId/respond', async (req, res) => {
    const d = await findPublic('quote', req.params.publicId);
    if (!d || d.status === 'draft') return res.status(404).json({ message: 'Quotation not found.' });
    if (effectiveStatus(d) !== 'sent') return res.status(409).json({ message: `This quotation is ${effectiveStatus(d)} and can no longer be answered.` });
    const action = req.body?.action === 'decline' ? 'declined' : req.body?.action === 'accept' ? 'accepted' : '';
    if (!action) return res.status(400).json({ message: 'Choose accept or decline.' });
    await meta().collection('biz_documents').updateOne({ _id: d._id }, { $set: { status: action, [action === 'accepted' ? 'acceptedAt' : 'declinedAt']: new Date(), respondedBy: str(req.body?.name, 150), updatedAt: new Date() } });
    res.json({ status: action });
});

// Contract: customer signs online (typed name, recorded with the time and IP).
publicDocsRouter.post('/contract/:publicId/sign', async (req, res) => {
    const d = await findPublic('contract', req.params.publicId);
    if (!d || d.status === 'draft') return res.status(404).json({ message: 'Contract not found.' });
    if (d.status !== 'sent') return res.status(409).json({ message: d.status === 'signed' ? 'This contract has already been signed.' : 'This contract is not open for signing.' });
    const name = str(req.body?.name, 150);
    if (name.length < 3 || req.body?.agree !== true) return res.status(400).json({ message: 'Type your full name and tick the box to confirm you agree.' });
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress || '';
    await meta().collection('biz_documents').updateOne({ _id: d._id }, { $set: { status: 'signed', signedAt: new Date(), signature: { name, title: str(req.body?.title, 150), ip, at: new Date() }, 'contract.clientSignatory.name': name, updatedAt: new Date() } });
    res.json({ status: 'signed' });
});
