/**
 * Afey (top-bar AI helper) — chat, saved conversations and approve-before-send actions.
 *   GET    /afey/status
 *   POST   /afey/chat                 { messages, chatId? } → { reply, cards, actions, chatId }
 *   GET    /afey/chats                this person's conversations
 *   GET    /afey/chats/:id            one conversation (actions with their current status)
 *   DELETE /afey/chats/:id
 *   POST   /afey/actions/:id/approve  { message? } — sends it
 *   POST   /afey/actions/:id/cancel
 */
import { Router, Request, Response } from 'express';
import { Db, ObjectId } from 'mongodb';
import { callerOf, getAiConfig, schoolAiEnabled } from '../lib/aiAssistant';
import { afeyChat, canAct, runSmsAction, resolveTargets, fill } from '../lib/afey';
import { getMetaDb } from '../lib/mongodb';
import { resolveScope } from '../lib/dataScope';

const router = Router();
const tdb = (req: Request): Db | null => (req as any).tenantDb || null;
const oid = (v: any) => { try { return new ObjectId(String(v)); } catch { return null; } };
const isStaffSide = (c: any) => c && (c.kind === 'user' || c.kind === 'staff');

async function schoolName(req: Request) {
    const tid = (req as any).tenantContext?.tenantId;
    const t: any = tid ? await getMetaDb().collection('Tenant').findOne({ _id: oid(tid) as any }, { projection: { name: 1, instituteName: 1, subdomain: 1 } }).catch(() => null) : null;
    return t?.instituteName || t?.name || t?.subdomain || 'the school';
}

const SUGGEST_ACT = ['How many learners are absent today?', 'Summarise fee balances', 'SMS parents of fee defaulters about their balance', 'SMS all staff: staff meeting at 4pm today'];
const SUGGEST_READ = ['How many learners are absent today?', 'Summarise fee balances', 'Draft a notice about half-term break', 'Who has the highest absenteeism?'];

router.get('/afey/status', async (req: Request, res: Response) => {
    const c = callerOf(req);
    if (!isStaffSide(c)) return res.status(401).json({ message: 'Sign in first' });
    const cfg = await getAiConfig();
    const school = await schoolAiEnabled((req as any).tenantContext?.tenantId);
    res.json({ enabled: cfg.enabled && !!cfg.apiKey && school, platform: cfg.enabled && !!cfg.apiKey, school, canAct: canAct(c), name: c!.name, suggestions: canAct(c) ? SUGGEST_ACT : SUGGEST_READ });
});

const titleOf = (t: string) => { const s = t.replace(/\s+/g, ' ').trim(); return s.length > 48 ? s.slice(0, 46) + '…' : s; };

router.post('/afey/chat', async (req: Request, res: Response) => {
    try {
        const c = callerOf(req); const db = tdb(req);
        if (!isStaffSide(c)) return res.status(401).json({ message: 'Sign in first' });
        if (!db) return res.status(400).json({ message: 'No school context' });
        const messages = Array.isArray(req.body?.messages) ? req.body.messages : [];
        const out = await afeyChat(req, db, c!, messages, await schoolName(req));
        const last = messages[messages.length - 1];
        const entry = [
            { role: 'user', content: String(last?.content || ''), at: new Date() },
            { role: 'assistant', content: out.reply, cards: out.cards, actionIds: out.actions.map(a => String(a._id)), at: new Date() },
        ];
        let chatId = oid(req.body?.chatId);
        const mine = chatId ? await db.collection('afey_chats').findOne({ _id: chatId, owner: c!.id }) : null;
        if (mine) await db.collection('afey_chats').updateOne({ _id: chatId! }, { $push: { messages: { $each: entry } } as any, $set: { updatedAt: new Date() } });
        else chatId = (await db.collection('afey_chats').insertOne({ owner: c!.id, title: titleOf(String(last?.content || 'New chat')), messages: entry, createdAt: new Date(), updatedAt: new Date() })).insertedId;
        res.json({ ...out, chatId: String(chatId) });
    } catch (e: any) { res.status(e?.status || 500).json({ message: e.message || 'Afey could not answer.' }); }
});

router.get('/afey/chats', async (req: Request, res: Response) => {
    const c = callerOf(req); const db = tdb(req);
    if (!isStaffSide(c) || !db) return res.json([]);
    const list = await db.collection('afey_chats').find({ owner: c!.id }, { projection: { title: 1, updatedAt: 1 } }).sort({ updatedAt: -1 }).limit(60).toArray().catch(() => []);
    res.json(list.map((x: any) => ({ _id: String(x._id), title: x.title, updatedAt: x.updatedAt })));
});

router.get('/afey/chats/:id', async (req: Request, res: Response) => {
    const c = callerOf(req); const db = tdb(req);
    if (!isStaffSide(c) || !db) return res.status(401).json({ message: 'Sign in first' });
    const chat: any = await db.collection('afey_chats').findOne({ _id: oid(req.params.id) as any, owner: c!.id }).catch(() => null);
    if (!chat) return res.status(404).json({ message: 'Chat not found' });
    const ids = chat.messages.flatMap((m: any) => m.actionIds || []).map(oid).filter(Boolean);
    const acts = ids.length ? await db.collection('afey_actions').find({ _id: { $in: ids } }).toArray() : [];
    const byId = new Map(acts.map((a: any) => [String(a._id), a]));
    res.json({ _id: String(chat._id), title: chat.title, messages: chat.messages.map((m: any) => ({ role: m.role, content: m.content, cards: m.cards || [], actions: (m.actionIds || []).map((i: string) => byId.get(i)).filter(Boolean) })) });
});

router.delete('/afey/chats/:id', async (req: Request, res: Response) => {
    const c = callerOf(req); const db = tdb(req);
    if (!isStaffSide(c) || !db) return res.status(401).json({ message: 'Sign in first' });
    await db.collection('afey_chats').deleteOne({ _id: oid(req.params.id) as any, owner: c!.id });
    res.json({ ok: true });
});

router.post('/afey/actions/:id/approve', async (req: Request, res: Response) => {
    try {
        const c = callerOf(req); const db = tdb(req);
        if (!canAct(c)) return res.status(403).json({ message: 'Only an administrator or the office can approve sending.' });
        if (!db) return res.status(400).json({ message: 'No school context' });
        const _id = oid(req.params.id);
        const a: any = _id ? await db.collection('afey_actions').findOne({ _id }) : null;
        if (!a) return res.status(404).json({ message: 'Action not found' });
        if (a.status !== 'pending') return res.status(409).json({ message: `This was already ${a.status === 'done' ? 'sent' : a.status}.` });
        const edited = String(req.body?.message || '').trim();
        if (edited) a.message = edited.slice(0, 480);
        // claim it first so a double click can't send twice
        const claim = await db.collection('afey_actions').updateOne({ _id: _id!, status: 'pending' }, { $set: { status: 'sending', message: a.message, approvedBy: c!.id, approvedAt: new Date() } });
        if (!claim.modifiedCount) return res.status(409).json({ message: 'This is already being sent.' });
        try {
            const scope = await resolveScope(req, db);
            const result = await runSmsAction(db, String((req as any).tenantContext?.tenantId || 'default'), a, scope);
            const status = result.recipients && !result.queued && !result.sent ? 'failed' : 'done';
            await db.collection('afey_actions').updateOne({ _id: _id! }, { $set: { status, result, doneAt: new Date() } });
            res.json({ status, result, message: status === 'done' ? `Sent to ${result.recipients} recipient${result.recipients === 1 ? '' : 's'}.` : 'The SMS could not be sent. Check Communications → SMS settings.' });
        } catch (e: any) {
            await db.collection('afey_actions').updateOne({ _id: _id! }, { $set: { status: 'failed', result: { error: e.message } } });
            throw e;
        }
    } catch (e: any) { res.status(500).json({ message: e.message || 'Could not send' }); }
});

router.post('/afey/actions/:id/cancel', async (req: Request, res: Response) => {
    const c = callerOf(req); const db = tdb(req);
    if (!isStaffSide(c) || !db) return res.status(401).json({ message: 'Sign in first' });
    const r = await db.collection('afey_actions').updateOne({ _id: oid(req.params.id) as any, status: 'pending' }, { $set: { status: 'cancelled', cancelledBy: c!.id } });
    res.json({ status: r.modifiedCount ? 'cancelled' : 'unchanged' });
});

// Preview the message as one recipient will see it (after an edit)
router.post('/afey/actions/:id/preview', async (req: Request, res: Response) => {
    const c = callerOf(req); const db = tdb(req);
    if (!canAct(c) || !db) return res.status(403).json({ message: 'Not allowed' });
    const a: any = await db.collection('afey_actions').findOne({ _id: oid(req.params.id) as any });
    if (!a) return res.status(404).json({ message: 'Action not found' });
    const t = (await resolveTargets(db, a, await resolveScope(req, db)))[0];
    res.json({ text: t ? fill(String(req.body?.message || a.message), t.vars) : String(req.body?.message || a.message) });
});

export default router;
