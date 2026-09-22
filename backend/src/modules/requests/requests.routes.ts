/**
 * Request Management & Approval Workflow module.
 *
 * A dynamic, multi-level approval engine. An employee submits a request; it routes
 * first to their reporting officer (staff.reportsTo), who can Approve / Reject /
 * Forward to any office or specific user. Forwarding is never hardcoded — each
 * approver chooses the next destination, so the path (Head Teacher → Procurement →
 * Finance → Completed, etc.) is decided at runtime. Procurement and Finance offices
 * have extra stage actions (quotations, orders, payment) and a request forwarded to
 * Procurement also drops a linked row into procurement_pr so it shows in that module.
 *
 * Collections (per tenant):
 *   requests, request_routes, request_comments, request_status_history,
 *   request_activity_logs, request_notifications, offices, request_categories
 */
import { Router, Request, Response } from 'express';
import { ObjectId, Db } from 'mongodb';
import jwt from 'jsonwebtoken';
import { getMetaDb } from '../../lib/mongodb';
import { sendEmail } from '../../services/communications.service';
import { applyInvoiceItemsUpdate } from '../../routes/fees.routes';

const router = Router();
const db = (req: Request): Db => (req as any).tenantDb || getMetaDb();
const oid = (s?: string) => { try { return s ? new ObjectId(s) : undefined; } catch { return undefined; } };

// ── Current actor ────────────────────────────────────────────────────────────
// Works for both a school admin (token role, no staffId) and a staff member
// (staffId → loads the staff record for name / role / department / reportsTo).
interface Actor { staffId: string | null; name: string; role: string; office: string; department: string; isAdmin: boolean; reportsTo?: string; }

async function actor(req: Request): Promise<Actor | null> {
    try {
        const token = (req.headers.authorization || '').split(' ')[1];
        const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        const role = String(decoded.role || '').toLowerCase();
        const isAdmin = !decoded.staffId || role === 'school_admin' || role === 'super_admin' || role === 'admin';
        if (decoded.staffId) {
            const s = await db(req).collection('staff').findOne({ _id: new ObjectId(String(decoded.staffId)) }).catch(() => null);
            if (s) {
                return {
                    staffId: String(s._id),
                    name: s.employeeName || s.name || decoded.name || 'Staff',
                    role: s.designation || decoded.role || 'Staff',
                    office: s.office || s.department || '',
                    department: s.department || '',
                    isAdmin,
                    reportsTo: s.reportsTo ? String(s.reportsTo) : undefined,
                };
            }
        }
        return { staffId: null, name: decoded.name || 'Administrator', role: decoded.role || 'school_admin', office: 'Administration', department: '', isAdmin: true };
    } catch { return null; }
}

const STATUS = {
    DRAFT: 'Draft', SUBMITTED: 'Submitted', SEEN: 'Seen', PENDING: 'Pending Approval',
    APPROVED: 'Approved', REJECTED: 'Rejected', FORWARDED: 'Forwarded', PROCESSING: 'Processing',
    WAIT_INFO: 'Waiting for Information', WAIT_QUOTE: 'Waiting for Quotation', ORDERED: 'Ordered',
    PURCHASED: 'Purchased', PAY_PENDING: 'Payment Pending', PAID: 'Paid', COMPLETED: 'Completed',
    CANCELLED: 'Cancelled', ARCHIVED: 'Archived',
};
const OPEN_STATUSES = [STATUS.SUBMITTED, STATUS.SEEN, STATUS.PENDING, STATUS.FORWARDED, STATUS.PROCESSING, STATUS.WAIT_INFO, STATUS.WAIT_QUOTE, STATUS.ORDERED, STATUS.PURCHASED, STATUS.PAY_PENDING];

const DEFAULT_OFFICES = ['Procurement', 'Finance', 'Administration', 'ICT', 'Principal', 'Deputy Principal', 'Head Teacher', 'Campus Director', 'Academic Director', 'Human Resource', 'Transport', 'Maintenance', 'Store', 'Library'];
const DEFAULT_CATEGORIES = ['Assets', 'Books', 'Furniture', 'Computers', 'Printers', 'Projectors', 'Maintenance', 'Repairs', 'Office Supplies', 'Transport', 'Fuel', 'Internet', 'School Events', 'Staff Welfare', 'Expense', 'ICT Equipment', 'Teaching Materials', 'Laboratory Equipment', 'Sports Equipment', 'Library Resources', 'Other'];

async function nextRequestNumber(req: Request): Promise<string> {
    const year = new Date().getFullYear();
    const n = await db(req).collection('requests').countDocuments({ number: new RegExp(`^REQ-${year}-`) }).catch(() => 0);
    return `REQ-${year}-${String(n + 1).padStart(6, '0')}`;
}

// ── History / audit / comments / notifications (never lost) ───────────────────
async function pushHistory(req: Request, requestId: string, a: Actor, action: string, fromStatus: string, toStatus: string, note = '') {
    await db(req).collection('request_status_history').insertOne({
        requestId, action, fromStatus, toStatus, note,
        byId: a.staffId, byName: a.name, byRole: a.role, office: a.office, at: new Date(),
    });
}
async function pushAudit(req: Request, requestId: string, a: Actor, action: string, oldStatus: string, newStatus: string, comment = '') {
    await db(req).collection('request_activity_logs').insertOne({
        requestId, action, userId: a.staffId, userName: a.name, role: a.role, office: a.office,
        comment, oldStatus, newStatus, ip: req.ip || req.headers['x-forwarded-for'] || '', at: new Date(),
    });
}
async function addComment(req: Request, requestId: string, a: Actor, text: string) {
    if (!text) return;
    await db(req).collection('request_comments').insertOne({
        requestId, text, byId: a.staffId, byName: a.name, byRole: a.role, office: a.office, at: new Date(),
    });
}
async function notify(req: Request, opts: { requestId: string; toId?: string | null; toOffice?: string; toRole?: string; kind: string; title: string; body?: string; number?: string }) {
    await db(req).collection('request_notifications').insertOne({
        requestId: opts.requestId, number: opts.number || '', toId: opts.toId || null, toOffice: opts.toOffice || null, toRole: opts.toRole || null,
        kind: opts.kind, title: opts.title, body: opts.body || '', read: false, at: new Date(),
    });
}
// Notify every school admin/super admin (monitoring). Stored office-targeted at 'Administration'.
async function notifyAdmins(req: Request, requestId: string, number: string, title: string, body = '') {
    await notify(req, { requestId, toRole: 'admin', kind: 'monitor', title, body, number });
}

/** Email a staff member (best-effort — never throws). Looks up their email by id. */
async function emailStaff(req: Request, staffId: string | null | undefined, subject: string, bodyHtml: string) {
    if (!staffId) return;
    try {
        const s = await db(req).collection('staff').findOne({ _id: oid(staffId) }).catch(() => null);
        const email = s?.email;
        if (!email) return;
        const html = `<div style="font-family:Arial,sans-serif;color:#1e293b">${bodyHtml}<p style="color:#94a3b8;font-size:12px">Sent automatically by ShuleCloud Request Management.</p></div>`;
        await sendEmail(db(req), { to: [email], subject, html });
    } catch { /* email optional */ }
}

/** Resolve a forward target ("Procurement Office" | a staffId) to a route descriptor. */
function parseTarget(target: string, targetUserId?: string) {
    if (targetUserId) return { kind: 'user' as const, userId: targetUserId, office: '' };
    const office = String(target || '').replace(/\s+Office$/i, '').trim();
    return { kind: 'office' as const, userId: null as string | null, office };
}

// ════════════════════════════════════════════════════════════════════════════
//  Offices & Categories (configurable from settings; seeded with defaults)
// ════════════════════════════════════════════════════════════════════════════
async function ensureSeed(req: Request) {
    const off = db(req).collection('offices');
    if (await off.countDocuments({}).catch(() => 1) === 0) {
        await off.insertMany(DEFAULT_OFFICES.map(name => ({ name, active: true, createdAt: new Date() }))).catch(() => {});
    }
    const cat = db(req).collection('request_categories');
    if (await cat.countDocuments({}).catch(() => 1) === 0) {
        await cat.insertMany(DEFAULT_CATEGORIES.map(name => ({ name, active: true, createdAt: new Date() }))).catch(() => {});
    }
}

router.get('/requests/offices', async (req, res) => {
    await ensureSeed(req);
    res.json(await db(req).collection('offices').find({ deletedAt: { $exists: false } }).sort({ name: 1 }).toArray());
});
router.post('/requests/offices', async (req, res) => {
    const name = String(req.body?.name || '').trim(); if (!name) return res.status(400).json({ message: 'Name required' });
    const r = await db(req).collection('offices').insertOne({ name, active: true, createdAt: new Date() });
    res.status(201).json({ _id: r.insertedId, name });
});
router.delete('/requests/offices/:id', async (req, res) => {
    await db(req).collection('offices').updateOne({ _id: oid(req.params.id) }, { $set: { deletedAt: new Date() } });
    res.json({ ok: true });
});

router.get('/requests/categories', async (req, res) => {
    await ensureSeed(req);
    res.json(await db(req).collection('request_categories').find({ deletedAt: { $exists: false } }).sort({ name: 1 }).toArray());
});
router.post('/requests/categories', async (req, res) => {
    const name = String(req.body?.name || '').trim(); if (!name) return res.status(400).json({ message: 'Name required' });
    const r = await db(req).collection('request_categories').insertOne({ name, active: true, createdAt: new Date() });
    res.status(201).json({ _id: r.insertedId, name });
});
router.delete('/requests/categories/:id', async (req, res) => {
    await db(req).collection('request_categories').updateOne({ _id: oid(req.params.id) }, { $set: { deletedAt: new Date() } });
    res.json({ ok: true });
});

// Eligible supervisors for the "Reports To" dropdown (all staff with name).
router.get('/requests/supervisors', async (req, res) => {
    const staff = await db(req).collection('staff').find({ deletedAt: { $exists: false } }, { projection: { employeeName: 1, name: 1, designation: 1, department: 1 } }).toArray();
    res.json(staff.map((s: any) => ({ _id: String(s._id), name: s.employeeName || s.name || 'Staff', role: s.designation || '', department: s.department || '' })));
});

// ════════════════════════════════════════════════════════════════════════════
//  Create / submit
// ════════════════════════════════════════════════════════════════════════════
router.post('/requests', async (req, res) => {
    try {
        const me = await actor(req); if (!me) return res.status(401).json({ message: 'Not authenticated' });
        const b = req.body || {};
        if (!b.title || !b.category) return res.status(400).json({ message: 'Category and title are required' });
        const number = await nextRequestNumber(req);
        const submit = b.status !== STATUS.DRAFT; // default = submit

        // First approver = the requester's reporting officer.
        let supervisor: any = null;
        if (me.reportsTo) supervisor = await db(req).collection('staff').findOne({ _id: oid(me.reportsTo) }).catch(() => null);

        const doc: any = {
            number, category: b.category, title: b.title, description: b.description || '',
            quantity: Number(b.quantity) || null, priority: b.priority || 'Medium',
            estimatedCost: Number(b.estimatedCost) || 0, comments: b.comments || '',
            attachments: Array.isArray(b.attachments) ? b.attachments : [],
            payload: b.payload && typeof b.payload === 'object' ? b.payload : null,   // e.g. a Fee Invoice Change carries { invoiceId, line_items, discount_type, discount_value }
            requesterId: me.staffId, requesterName: me.name, requesterRole: me.role, department: me.department || b.department || '',
            status: submit ? STATUS.SUBMITTED : STATUS.DRAFT,
            currentOwnerId: submit ? (supervisor ? String(supervisor._id) : null) : me.staffId,
            currentOwnerName: submit ? (supervisor ? (supervisor.employeeName || supervisor.name) : '') : me.name,
            currentOffice: submit && !supervisor ? 'Administration' : '',
            createdAt: new Date(), updatedAt: new Date(),
        };
        const r = await db(req).collection('requests').insertOne(doc);
        const id = String(r.insertedId);

        await pushHistory(req, id, me, 'create', '', doc.status);
        await pushAudit(req, id, me, 'create', '', doc.status, b.comments || '');
        if (submit) {
            await pushHistory(req, id, me, 'submit', STATUS.DRAFT, STATUS.SUBMITTED, supervisor ? `Sent to ${doc.currentOwnerName}` : 'Sent to Administration');
            if (supervisor) {
                await notify(req, { requestId: id, number, toId: String(supervisor._id), kind: 'assigned', title: `New request ${number}`, body: `${me.name} submitted "${b.title}"` });
                // Email the supervisor so they get it first, even when offline.
                await emailStaff(req, String(supervisor._id),
                    `New request ${number} needs your approval`,
                    `<h2 style="color:#5C67F2">New request awaiting your approval</h2>
                     <p><b>${me.name}</b>${me.department ? ` (${me.department})` : ''} submitted a request that reports to you:</p>
                     <p style="font-size:15px"><b>${b.title}</b> — ${b.category}, priority ${doc.priority}${doc.estimatedCost ? `, est. KES ${doc.estimatedCost.toLocaleString()}` : ''}</p>
                     ${b.description ? `<blockquote style="border-left:3px solid #5C67F2;padding-left:12px;color:#475569">${b.description}</blockquote>` : ''}
                     <p>Open it in your portal to Approve, Reject or Forward.</p>`);
            } else {
                await notify(req, { requestId: id, number, toOffice: 'Administration', kind: 'assigned', title: `New request ${number}`, body: `${me.name} submitted "${b.title}" (no supervisor set)` });
            }
            await notifyAdmins(req, id, number, `Request ${number} submitted`, `${me.name}: ${b.title}`);
        }
        res.status(201).json({ ...doc, _id: r.insertedId });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ════════════════════════════════════════════════════════════════════════════
//  Listing: my requests, my inbox (assigned to me / my office), admin all
// ════════════════════════════════════════════════════════════════════════════
function applyFilters(q: any, query: any) {
    const map: Record<string, string> = { category: 'category', status: 'status', priority: 'priority', office: 'currentOffice', department: 'department', number: 'number' };
    Object.entries(map).forEach(([qk, field]) => { if (query[qk] && query[qk] !== 'all') q[field] = String(query[qk]); });
    if (query.from || query.to) { q.createdAt = {}; if (query.from) q.createdAt.$gte = new Date(query.from); if (query.to) q.createdAt.$lte = new Date(query.to); }
    return q;
}

router.get('/requests/mine', async (req, res) => {
    const me = await actor(req); if (!me) return res.status(401).json({ message: 'Not authenticated' });
    const q: any = { deletedAt: { $exists: false }, requesterId: me.staffId };
    applyFilters(q, req.query);
    res.json(await db(req).collection('requests').find(q).sort({ createdAt: -1 }).limit(1000).toArray());
});

// Requests currently waiting on me (assigned to me directly or to my office).
router.get('/requests/inbox', async (req, res) => {
    const me = await actor(req); if (!me) return res.status(401).json({ message: 'Not authenticated' });
    const ors: any[] = [];
    if (me.staffId) ors.push({ currentOwnerId: me.staffId });
    if (me.office) ors.push({ currentOffice: new RegExp(`^${me.office}$`, 'i') });
    // Map a role to its office (e.g. Procurement Officer → Procurement).
    const roleOffice = String(me.role || '').replace(/officer|office|director|manager/ig, '').trim();
    if (roleOffice) ors.push({ currentOffice: new RegExp(roleOffice, 'i') });
    if (!ors.length) return res.json([]);
    const q: any = { deletedAt: { $exists: false }, $or: ors, status: { $in: OPEN_STATUSES } };
    if (req.query.status && req.query.status !== 'all') { delete q.status; q.status = String(req.query.status); }
    applyFilters(q, { ...req.query, status: undefined });
    res.json(await db(req).collection('requests').find(q).sort({ updatedAt: -1 }).limit(1000).toArray());
});

// Admin / monitoring — everything.
router.get('/requests/all', async (req, res) => {
    const me = await actor(req); if (!me) return res.status(401).json({ message: 'Not authenticated' });
    const q: any = { deletedAt: { $exists: false } };
    applyFilters(q, req.query);
    if (req.query.assignedTo) q.currentOwnerId = String(req.query.assignedTo);
    res.json(await db(req).collection('requests').find(q).sort({ createdAt: -1 }).limit(2000).toArray());
});

// Full detail with timeline, comments, history, audit.
router.get('/requests/:id', async (req, res) => {
    const me = await actor(req); if (!me) return res.status(401).json({ message: 'Not authenticated' });
    const r = await db(req).collection('requests').findOne({ _id: oid(req.params.id) });
    if (!r) return res.status(404).json({ message: 'Not found' });
    const [history, comments, audit] = await Promise.all([
        db(req).collection('request_status_history').find({ requestId: req.params.id }).sort({ at: 1 }).toArray(),
        db(req).collection('request_comments').find({ requestId: req.params.id }).sort({ at: 1 }).toArray(),
        db(req).collection('request_activity_logs').find({ requestId: req.params.id }).sort({ at: 1 }).toArray(),
    ]);
    // Who is looking? Drives which controls the UI shows.
    const isRequester = !!me.staffId && r.requesterId === me.staffId;
    const ownsByUser = !!me.staffId && r.currentOwnerId === me.staffId;
    const ownsByOffice = !!me.office && new RegExp(`^${me.office}$`, 'i').test(r.currentOffice || '');
    const closed = [STATUS.COMPLETED, STATUS.REJECTED, STATUS.CANCELLED].includes(r.status);
    // An approver may act only if the request currently rests with them (and they
    // are not merely the requester viewing their own request), or if they're admin.
    const canAct = !closed && ((ownsByUser || ownsByOffice) && !isRequester || (me.isAdmin && (ownsByUser || ownsByOffice)));
    const canEdit = isRequester && (r.status === STATUS.DRAFT || r.status === STATUS.WAIT_INFO);
    const canResubmit = isRequester && r.status === STATUS.WAIT_INFO;

    // Mark as seen by the current owner (first time they open it).
    if (r.status === STATUS.SUBMITTED && (ownsByUser || ownsByOffice) && !isRequester) {
        await db(req).collection('requests').updateOne({ _id: r._id }, { $set: { status: STATUS.SEEN, updatedAt: new Date() } });
        await pushHistory(req, req.params.id, me, 'seen', STATUS.SUBMITTED, STATUS.SEEN);
        r.status = STATUS.SEEN;
    }
    res.json({ ...r, history, comments, audit, viewer: { isRequester, isAdmin: me.isAdmin, office: me.office, canAct, canEdit, canResubmit } });
});

// ════════════════════════════════════════════════════════════════════════════
//  Actions
// ════════════════════════════════════════════════════════════════════════════
async function loadOwn(req: Request): Promise<any> {
    return db(req).collection('requests').findOne({ _id: oid(req.params.id) });
}

/** Approver actions require the request to currently rest with the actor (or admin).
 *  The requester acting on their own request is rejected. Returns true if allowed. */
function mayAct(r: any, me: Actor): boolean {
    if (me.isAdmin) return true;
    const isRequester = !!me.staffId && r.requesterId === me.staffId;
    if (isRequester) return false;
    const ownsByUser = !!me.staffId && r.currentOwnerId === me.staffId;
    const ownsByOffice = !!me.office && new RegExp(`^${me.office}$`, 'i').test(r.currentOffice || '');
    return ownsByUser || ownsByOffice;
}

// Approve (with comment) and optionally forward in the same step.
router.post('/requests/:id/approve', async (req, res) => {
    try {
        const me = await actor(req); if (!me) return res.status(401).json({ message: 'Not authenticated' });
        const r = await loadOwn(req); if (!r) return res.status(404).json({ message: 'Not found' });
        if (!mayAct(r, me)) return res.status(403).json({ message: 'This request is not assigned to you.' });
        const from = r.status;
        await addComment(req, req.params.id, me, req.body?.comment || '');

        const t = req.body?.forwardTo ? parseTarget(req.body.forwardTo, req.body?.forwardUserId) : null;
        const set: any = { status: STATUS.APPROVED, updatedAt: new Date() };
        let toLabel = '';
        if (t) {
            set.status = STATUS.FORWARDED;
            if (t.kind === 'user') {
                const u = await db(req).collection('staff').findOne({ _id: oid(t.userId!) }).catch(() => null);
                set.currentOwnerId = t.userId; set.currentOwnerName = u ? (u.employeeName || u.name) : 'User'; set.currentOffice = '';
                toLabel = set.currentOwnerName;
                await notify(req, { requestId: req.params.id, number: r.number, toId: t.userId, kind: 'forwarded', title: `Request ${r.number} forwarded to you`, body: r.title });
            } else {
                set.currentOwnerId = null; set.currentOwnerName = ''; set.currentOffice = t.office;
                toLabel = `${t.office} Office`;
                await notify(req, { requestId: req.params.id, number: r.number, toOffice: t.office, kind: 'forwarded', title: `Request ${r.number} forwarded to ${t.office}`, body: r.title });
                // Integrate with Procurement: drop a linked PR row so it appears there.
                if (/procurement/i.test(t.office)) {
                    await db(req).collection('procurement_pr').insertOne({
                        number: r.number, sourceRequestId: req.params.id, department: r.department, requestedBy: r.requesterName,
                        items: r.title, quantity: r.quantity, estimatedCost: r.estimatedCost, priority: r.priority,
                        date: new Date().toISOString().slice(0, 10), status: 'Submitted', createdAt: new Date(),
                    }).catch(() => {});
                }
            }
        }
        await db(req).collection('requests').updateOne({ _id: r._id }, { $set: set });
        // A finally-approved Fee Invoice Change is now applied to the invoice — not before.
        let applyError = '';
        if (!t && set.status === STATUS.APPROVED && r.category === 'Fee Invoice Change' && r.payload?.invoiceId) {
            const schoolId = (req as any).tenantContext?.tenantId || 'default_school';
            const applied = await applyInvoiceItemsUpdate(db(req), schoolId, String(r.payload.invoiceId), r.payload).catch((e: any) => ({ ok: false, status: 500, message: e.message }));
            if (!applied.ok) applyError = applied.message || 'Could not apply the change';
        }
        await pushHistory(req, req.params.id, me, t ? 'approve_forward' : 'approve', from, set.status, t ? `Approved → ${toLabel}` : (applyError ? `Approved, but could not apply: ${applyError}` : 'Approved'));
        await pushAudit(req, req.params.id, me, t ? 'approve_forward' : 'approve', from, set.status, req.body?.comment || '');
        await notify(req, { requestId: req.params.id, number: r.number, toId: r.requesterId, kind: 'approved', title: `Request ${r.number} approved`, body: t ? `Forwarded to ${toLabel}` : 'Approved by ' + me.name });
        await notifyAdmins(req, req.params.id, r.number, `Request ${r.number} ${t ? 'forwarded' : 'approved'}`, `${me.name}${t ? ' → ' + toLabel : ''}`);
        res.json({ ok: true, status: set.status, applyError: applyError || undefined });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post('/requests/:id/reject', async (req, res) => {
    try {
        const me = await actor(req); if (!me) return res.status(401).json({ message: 'Not authenticated' });
        const r = await loadOwn(req); if (!r) return res.status(404).json({ message: 'Not found' });
        if (!mayAct(r, me)) return res.status(403).json({ message: 'This request is not assigned to you.' });
        const reason = String(req.body?.reason || req.body?.comment || '').trim();
        if (!reason) return res.status(400).json({ message: 'A rejection reason is required' });
        await addComment(req, req.params.id, me, reason);
        await db(req).collection('requests').updateOne({ _id: r._id }, { $set: { status: STATUS.REJECTED, updatedAt: new Date(), rejectedReason: reason } });
        await pushHistory(req, req.params.id, me, 'reject', r.status, STATUS.REJECTED, reason);
        await pushAudit(req, req.params.id, me, 'reject', r.status, STATUS.REJECTED, reason);
        await notify(req, { requestId: req.params.id, number: r.number, toId: r.requesterId, kind: 'rejected', title: `Request ${r.number} rejected`, body: reason });
        await notifyAdmins(req, req.params.id, r.number, `Request ${r.number} rejected`, reason);
        res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Forward without an explicit approve (e.g. a simple hand-off).
router.post('/requests/:id/forward', async (req, res) => {
    try {
        const me = await actor(req); if (!me) return res.status(401).json({ message: 'Not authenticated' });
        const r = await loadOwn(req); if (!r) return res.status(404).json({ message: 'Not found' });
        if (!mayAct(r, me)) return res.status(403).json({ message: 'This request is not assigned to you.' });
        const target = req.body?.forwardTo; if (!target && !req.body?.forwardUserId) return res.status(400).json({ message: 'Choose where to forward' });
        const t = parseTarget(target, req.body?.forwardUserId);
        await addComment(req, req.params.id, me, req.body?.comment || '');
        const set: any = { status: STATUS.FORWARDED, updatedAt: new Date() };
        let toLabel = '';
        if (t.kind === 'user') {
            const u = await db(req).collection('staff').findOne({ _id: oid(t.userId!) }).catch(() => null);
            set.currentOwnerId = t.userId; set.currentOwnerName = u ? (u.employeeName || u.name) : 'User'; set.currentOffice = ''; toLabel = set.currentOwnerName;
            await notify(req, { requestId: req.params.id, number: r.number, toId: t.userId, kind: 'forwarded', title: `Request ${r.number} forwarded to you`, body: r.title });
        } else {
            set.currentOwnerId = null; set.currentOwnerName = ''; set.currentOffice = t.office; toLabel = `${t.office} Office`;
            await notify(req, { requestId: req.params.id, number: r.number, toOffice: t.office, kind: 'forwarded', title: `Request ${r.number} forwarded to ${t.office}`, body: r.title });
            if (/procurement/i.test(t.office)) {
                await db(req).collection('procurement_pr').insertOne({ number: r.number, sourceRequestId: req.params.id, department: r.department, requestedBy: r.requesterName, items: r.title, quantity: r.quantity, estimatedCost: r.estimatedCost, priority: r.priority, date: new Date().toISOString().slice(0, 10), status: 'Submitted', createdAt: new Date() }).catch(() => {});
            }
        }
        await db(req).collection('requests').updateOne({ _id: r._id }, { $set: set });
        await pushHistory(req, req.params.id, me, 'forward', r.status, STATUS.FORWARDED, `Forwarded → ${toLabel}`);
        await pushAudit(req, req.params.id, me, 'forward', r.status, STATUS.FORWARDED, req.body?.comment || '');
        await notifyAdmins(req, req.params.id, r.number, `Request ${r.number} forwarded`, `${me.name} → ${toLabel}`);
        res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Request more information (returns to requester — editable, must be resubmitted).
router.post('/requests/:id/request-info', async (req, res) => {
    try {
        const me = await actor(req); if (!me) return res.status(401).json({ message: 'Not authenticated' });
        const r = await loadOwn(req); if (!r) return res.status(404).json({ message: 'Not found' });
        if (!mayAct(r, me)) return res.status(403).json({ message: 'This request is not assigned to you.' });
        const note = String(req.body?.comment || '').trim(); if (!note) return res.status(400).json({ message: 'Say what information you need' });
        await addComment(req, req.params.id, me, note);
        // Hand the request back to the requester so they can edit & resubmit. Remember
        // where to return it to (this approver) so resubmit routes straight back.
        await db(req).collection('requests').updateOne({ _id: r._id }, { $set: {
            status: STATUS.WAIT_INFO, updatedAt: new Date(), editable: true, infoNote: note,
            returnedBy: { id: me.staffId, name: me.name, office: me.office },
            currentOwnerId: r.requesterId, currentOwnerName: r.requesterName, currentOffice: '',
        } });
        await pushHistory(req, req.params.id, me, 'request_info', r.status, STATUS.WAIT_INFO, `Returned for more info: ${note}`);
        await pushAudit(req, req.params.id, me, 'request_info', r.status, STATUS.WAIT_INFO, note);
        await notify(req, { requestId: req.params.id, number: r.number, toId: r.requesterId, kind: 'info', title: `${r.number} returned for more information`, body: note });

        // Email the requester (best-effort — never fails the request).
        try {
            const requester = r.requesterId ? await db(req).collection('staff').findOne({ _id: oid(r.requesterId) }).catch(() => null) : null;
            const email = requester?.email;
            if (email) {
                const html = `<div style="font-family:Arial,sans-serif;color:#1e293b">
                    <h2 style="color:#5C67F2">Request ${r.number} needs more information</h2>
                    <p>Hello ${r.requesterName || ''},</p>
                    <p><b>${me.name}</b>${me.office ? ` (${me.office})` : ''} has returned your request <b>"${r.title}"</b> and asked for more information:</p>
                    <blockquote style="border-left:3px solid #5C67F2;padding-left:12px;color:#475569">${note}</blockquote>
                    <p>Please open the request in your portal, update it, and resubmit.</p>
                    <p style="color:#94a3b8;font-size:12px">Sent automatically by ShuleCloud Request Management.</p>
                </div>`;
                await sendEmail(db(req), { to: [email], subject: `Action needed: Request ${r.number} returned for more info`, html });
            }
        } catch { /* email optional */ }

        res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Requester resubmits a returned request → back to the approver who returned it.
router.post('/requests/:id/resubmit', async (req, res) => {
    try {
        const me = await actor(req); if (!me) return res.status(401).json({ message: 'Not authenticated' });
        const r = await loadOwn(req); if (!r) return res.status(404).json({ message: 'Not found' });
        if (r.requesterId !== me.staffId && !me.isAdmin) return res.status(403).json({ message: 'Only the requester can resubmit' });
        if (r.status !== STATUS.WAIT_INFO && r.status !== STATUS.DRAFT) return res.status(409).json({ message: 'This request is not awaiting resubmission' });
        await addComment(req, req.params.id, me, req.body?.comment || 'Resubmitted with updates');

        // Route back to whoever returned it; else to the reporting officer.
        const back = r.returnedBy;
        const set: any = { status: STATUS.SUBMITTED, updatedAt: new Date(), editable: false };
        if (back?.id) { set.currentOwnerId = back.id; set.currentOwnerName = back.name; set.currentOffice = back.office || ''; }
        else if (back?.office) { set.currentOwnerId = null; set.currentOwnerName = ''; set.currentOffice = back.office; }
        else {
            const sup = me.reportsTo ? await db(req).collection('staff').findOne({ _id: oid(me.reportsTo) }).catch(() => null) : null;
            set.currentOwnerId = sup ? String(sup._id) : null; set.currentOwnerName = sup ? (sup.employeeName || sup.name) : ''; set.currentOffice = sup ? '' : 'Administration';
        }
        await db(req).collection('requests').updateOne({ _id: r._id }, { $set: set });
        await pushHistory(req, req.params.id, me, 'resubmit', r.status, STATUS.SUBMITTED, `Resubmitted to ${set.currentOwnerName || set.currentOffice}`);
        await pushAudit(req, req.params.id, me, 'resubmit', r.status, STATUS.SUBMITTED, req.body?.comment || '');
        if (set.currentOwnerId) {
            await notify(req, { requestId: req.params.id, number: r.number, toId: set.currentOwnerId, kind: 'assigned', title: `${r.number} resubmitted`, body: r.title });
            await emailStaff(req, set.currentOwnerId, `Request ${r.number} resubmitted with updates`,
                `<h2 style="color:#5C67F2">A request was resubmitted to you</h2><p><b>${me.name}</b> updated and resubmitted <b>"${r.title}"</b>. Open it in your portal to review.</p>`);
        } else {
            await notify(req, { requestId: req.params.id, number: r.number, toOffice: set.currentOffice, kind: 'assigned', title: `${r.number} resubmitted`, body: r.title });
        }
        await notifyAdmins(req, req.params.id, r.number, `Request ${r.number} resubmitted`, r.title);
        res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Plain comment on any stage.
router.post('/requests/:id/comment', async (req, res) => {
    const me = await actor(req); if (!me) return res.status(401).json({ message: 'Not authenticated' });
    const text = String(req.body?.text || '').trim(); if (!text) return res.status(400).json({ message: 'Empty comment' });
    await addComment(req, req.params.id, me, text);
    await pushAudit(req, req.params.id, me, 'comment', '', '', text);
    res.json({ ok: true });
});

// Procurement / Finance / generic stage transitions (set a status + optional comment/data).
const STAGE_ACTIONS: Record<string, string> = {
    'request-quotation': STATUS.WAIT_QUOTE, 'mark-ordered': STATUS.ORDERED, 'mark-purchased': STATUS.PURCHASED,
    'approve-budget': STATUS.PROCESSING, 'approve-payment': STATUS.PAY_PENDING, 'mark-paid': STATUS.PAID, 'processing': STATUS.PROCESSING,
};
router.post('/requests/:id/stage/:action', async (req, res) => {
    try {
        const me = await actor(req); if (!me) return res.status(401).json({ message: 'Not authenticated' });
        const r = await loadOwn(req); if (!r) return res.status(404).json({ message: 'Not found' });
        if (!mayAct(r, me)) return res.status(403).json({ message: 'This request is not assigned to you.' });
        const to = STAGE_ACTIONS[req.params.action]; if (!to) return res.status(400).json({ message: 'Unknown action' });
        await addComment(req, req.params.id, me, req.body?.comment || '');
        const set: any = { status: to, updatedAt: new Date() };
        if (req.body?.supplier) set.supplier = req.body.supplier;
        if (Array.isArray(req.body?.attachments)) set.attachments = [...(r.attachments || []), ...req.body.attachments];
        await db(req).collection('requests').updateOne({ _id: r._id }, { $set: set });
        await pushHistory(req, req.params.id, me, req.params.action, r.status, to, req.body?.comment || '');
        await pushAudit(req, req.params.id, me, req.params.action, r.status, to, req.body?.comment || '');
        await notify(req, { requestId: req.params.id, number: r.number, toId: r.requesterId, kind: 'update', title: `Request ${r.number}: ${to}`, body: me.name });
        res.json({ ok: true, status: to });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Complete.
router.post('/requests/:id/complete', async (req, res) => {
    const me = await actor(req); if (!me) return res.status(401).json({ message: 'Not authenticated' });
    const r = await loadOwn(req); if (!r) return res.status(404).json({ message: 'Not found' });
    if (!mayAct(r, me)) return res.status(403).json({ message: 'This request is not assigned to you.' });
    await addComment(req, req.params.id, me, req.body?.comment || '');
    await db(req).collection('requests').updateOne({ _id: r._id }, { $set: { status: STATUS.COMPLETED, completedAt: new Date(), updatedAt: new Date(), currentOffice: '', currentOwnerId: null } });
    await pushHistory(req, req.params.id, me, 'complete', r.status, STATUS.COMPLETED, req.body?.comment || '');
    await pushAudit(req, req.params.id, me, 'complete', r.status, STATUS.COMPLETED, req.body?.comment || '');
    await notify(req, { requestId: req.params.id, number: r.number, toId: r.requesterId, kind: 'completed', title: `Request ${r.number} completed`, body: r.title });
    await notifyAdmins(req, req.params.id, r.number, `Request ${r.number} completed`, r.title);
    res.json({ ok: true });
});

router.post('/requests/:id/cancel', async (req, res) => {
    const me = await actor(req); if (!me) return res.status(401).json({ message: 'Not authenticated' });
    const r = await loadOwn(req); if (!r) return res.status(404).json({ message: 'Not found' });
    await db(req).collection('requests').updateOne({ _id: r._id }, { $set: { status: STATUS.CANCELLED, updatedAt: new Date() } });
    await pushHistory(req, req.params.id, me, 'cancel', r.status, STATUS.CANCELLED, req.body?.comment || '');
    res.json({ ok: true });
});

router.put('/requests/:id', async (req, res) => {
    const me = await actor(req); if (!me) return res.status(401).json({ message: 'Not authenticated' });
    const r = await loadOwn(req); if (!r) return res.status(404).json({ message: 'Not found' });
    // Only the requester may edit, and only while a draft / returned for info.
    // Once submitted (or further along), the request is locked from edits.
    if (r.requesterId !== me.staffId && !me.isAdmin) return res.status(403).json({ message: 'Not allowed' });
    const editable = r.status === STATUS.DRAFT || r.status === STATUS.WAIT_INFO;
    if (!editable && !me.isAdmin) return res.status(409).json({ message: 'This request has been submitted and can no longer be edited.' });
    const set: any = { updatedAt: new Date() };
    ['title', 'description', 'category', 'priority', 'quantity', 'estimatedCost', 'comments', 'attachments', 'department'].forEach(k => { if (req.body[k] !== undefined) set[k] = req.body[k]; });
    await db(req).collection('requests').updateOne({ _id: r._id }, { $set: set });
    res.json({ ok: true });
});

router.delete('/requests/:id', async (req, res) => {
    const me = await actor(req); if (!me) return res.status(401).json({ message: 'Not authenticated' });
    await db(req).collection('requests').updateOne({ _id: oid(req.params.id) }, { $set: { deletedAt: new Date() } });
    res.json({ ok: true });
});

// ════════════════════════════════════════════════════════════════════════════
//  Notifications & unread counters
// ════════════════════════════════════════════════════════════════════════════
function notifFilter(me: Actor): any {
    const ors: any[] = [];
    if (me.staffId) ors.push({ toId: me.staffId });
    if (me.office) ors.push({ toOffice: new RegExp(`^${me.office}$`, 'i') });
    if (me.isAdmin) ors.push({ toRole: 'admin' });
    return ors.length ? { $or: ors } : { _id: { $exists: false } };
}
router.get('/requests/notifications/list', async (req, res) => {
    const me = await actor(req); if (!me) return res.status(401).json({ message: 'Not authenticated' });
    res.json(await db(req).collection('request_notifications').find(notifFilter(me)).sort({ at: -1 }).limit(100).toArray());
});
router.get('/requests/notifications/count', async (req, res) => {
    const me = await actor(req); if (!me) return res.json({ inbox: 0, unread: 0 });
    const f = notifFilter(me);
    const [unread, inbox] = await Promise.all([
        db(req).collection('request_notifications').countDocuments({ ...f, read: false }).catch(() => 0),
        (async () => {
            const ors: any[] = [];
            if (me.staffId) ors.push({ currentOwnerId: me.staffId });
            if (me.office) ors.push({ currentOffice: new RegExp(`^${me.office}$`, 'i') });
            if (!ors.length) return 0;
            return db(req).collection('requests').countDocuments({ deletedAt: { $exists: false }, $or: ors, status: { $in: [STATUS.SUBMITTED, STATUS.FORWARDED] } }).catch(() => 0);
        })(),
    ]);
    res.json({ unread, inbox });
});
router.post('/requests/notifications/read', async (req, res) => {
    const me = await actor(req); if (!me) return res.status(401).json({ message: 'Not authenticated' });
    const f = notifFilter(me);
    if (req.body?.id) await db(req).collection('request_notifications').updateOne({ _id: oid(req.body.id) }, { $set: { read: true } });
    else if (req.body?.requestId) await db(req).collection('request_notifications').updateMany({ ...f, requestId: String(req.body.requestId) }, { $set: { read: true } });
    else await db(req).collection('request_notifications').updateMany({ ...f, read: false }, { $set: { read: true } });
    res.json({ ok: true });
});

// ════════════════════════════════════════════════════════════════════════════
//  Dashboards / stats (role-aware)
// ════════════════════════════════════════════════════════════════════════════
router.get('/requests/stats/overview', async (req, res) => {
    try {
        const me = await actor(req); if (!me) return res.status(401).json({ message: 'Not authenticated' });
        const col = db(req).collection('requests');
        const base = { deletedAt: { $exists: false } };
        const mineBase = { ...base, requesterId: me.staffId };

        const inboxOrs: any[] = [];
        if (me.staffId) inboxOrs.push({ currentOwnerId: me.staffId });
        if (me.office) inboxOrs.push({ currentOffice: new RegExp(`^${me.office}$`, 'i') });
        const inboxBase: any = inboxOrs.length ? { ...base, $or: inboxOrs } : { _id: { $exists: false } };

        const cnt = (q: any) => col.countDocuments(q).catch(() => 0);
        const [myTotal, myPending, myApproved, myRejected, myCompleted] = await Promise.all([
            cnt(mineBase), cnt({ ...mineBase, status: { $in: OPEN_STATUSES } }), cnt({ ...mineBase, status: STATUS.APPROVED }),
            cnt({ ...mineBase, status: STATUS.REJECTED }), cnt({ ...mineBase, status: STATUS.COMPLETED }),
        ]);
        const [inNew, inPending, inApproved, inRejected] = await Promise.all([
            cnt({ ...inboxBase, status: { $in: [STATUS.SUBMITTED, STATUS.FORWARDED] } }),
            cnt({ ...inboxBase, status: { $in: OPEN_STATUSES } }),
            cnt({ ...inboxBase, status: STATUS.APPROVED }), cnt({ ...inboxBase, status: STATUS.REJECTED }),
        ]);

        const admin: any = {};
        if (me.isAdmin) {
            const [total, pending, completed, rejected] = await Promise.all([
                cnt(base), cnt({ ...base, status: { $in: OPEN_STATUSES } }), cnt({ ...base, status: STATUS.COMPLETED }), cnt({ ...base, status: STATUS.REJECTED }),
            ]);
            const byOffice = await col.aggregate([{ $match: base }, { $group: { _id: '$currentOffice', n: { $sum: 1 } } }]).toArray().catch(() => []);
            const byCategory = await col.aggregate([{ $match: base }, { $group: { _id: '$category', n: { $sum: 1 } } }]).toArray().catch(() => []);
            const byMonth = await col.aggregate([{ $match: base }, { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, n: { $sum: 1 } } }, { $sort: { _id: 1 } }]).toArray().catch(() => []);
            Object.assign(admin, {
                total, pending, completed, rejected,
                byOffice: Object.fromEntries(byOffice.map((o: any) => [o._id || 'Unassigned', o.n])),
                byCategory: Object.fromEntries(byCategory.map((o: any) => [o._id || 'Other', o.n])),
                byMonth: Object.fromEntries(byMonth.map((o: any) => [o._id, o.n])),
            });
        }
        res.json({
            role: me.role, office: me.office, isAdmin: me.isAdmin,
            mine: { total: myTotal, pending: myPending, approved: myApproved, rejected: myRejected, completed: myCompleted },
            inbox: { new: inNew, pending: inPending, approved: inApproved, rejected: inRejected },
            admin,
        });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

export default router;
