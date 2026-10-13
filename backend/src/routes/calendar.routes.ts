import express, { Request, Response } from 'express';
import { Db, ObjectId } from 'mongodb';
import jwt from 'jsonwebtoken';
import { getMetaDb } from '../lib/mongodb';
import { getHolidaysInRange, DEFAULT_COUNTRY, COUNTRIES } from '../lib/holidays';
import { googleCalendarEnv, buildGoogleAuthUrl, exchangeCodeForTokens, listGoogleEvents } from '../lib/googleCalendar';
import { getConnection, saveConnection, disconnect as disconnectGoogle, syncEventToGoogle, deleteEventFromGoogle } from '../services/googleCalendarSync.service';
import { callerOf, isSchoolAdmin } from '../lib/aiAssistant';

const router = express.Router();
const getRequestDb = (req: Request): Db => (req as any).tenantDb || getMetaDb();
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

// ── New event taxonomy (section 5) — what every event is filtered/colour-coded by ──────────────
export const CATEGORIES = [
    { key: 'SCHOOL', name: 'School', color: '#5C67F2', icon: 'school' },
    { key: 'EXAM', name: 'Exams', color: '#dc2626', icon: 'pencil' },
    { key: 'ASSIGNMENT', name: 'Assignments', color: '#d97706', icon: 'clipboard-list' },
    { key: 'MEETING', name: 'Meetings', color: '#0891b2', icon: 'users' },
    { key: 'SPORTS', name: 'Sports', color: '#7c3aed', icon: 'medal' },
    { key: 'PERSONAL', name: 'Personal', color: '#16a34a', icon: 'user' },
    { key: 'PUBLIC_HOLIDAY', name: 'Public Holidays', color: '#f43f5e', icon: 'party-popper' },
    { key: 'RELIGIOUS', name: 'Religious', color: '#a16207', icon: 'flame' },
    { key: 'INTERNATIONAL', name: 'International', color: '#0ea5e9', icon: 'globe' },
    { key: 'OTHER', name: 'Other', color: '#6b7280', icon: 'pin' },
];
const NEW_KEYS = new Set(CATEGORIES.map(c => c.key));
// Legacy category keys (the original 14-category scheme) → the new taxonomy, so every event
// stored before this change keeps displaying and filtering correctly — nothing is migrated or
// dropped, only read-time normalised.
const LEGACY_MAP: Record<string, string> = {
    academic: 'SCHOOL', examinations: 'EXAM', sports: 'SPORTS', meetings: 'MEETING', fees: 'OTHER',
    transport: 'SCHOOL', hostel: 'SCHOOL', library: 'SCHOOL', medical: 'SCHOOL', religious: 'RELIGIOUS',
    public_holiday: 'PUBLIC_HOLIDAY', school_holiday: 'SCHOOL', administration: 'MEETING', other: 'OTHER',
};
const normalizeCategory = (source: string | undefined, rawCategory: any): string => {
    if (source === 'homework') return 'ASSIGNMENT';
    if (source === 'exam') return 'EXAM';
    if (source === 'fees') return 'OTHER';
    const c = String(rawCategory || '').trim();
    if (NEW_KEYS.has(c.toUpperCase())) return c.toUpperCase();
    return LEGACY_MAP[c] || 'OTHER';
};

const fmtDate = (date: Date) => date.toISOString().slice(0, 10);
const toIsoDate = (value: any) => {
    if (!value) return null;
    if (value instanceof Date) return fmtDate(value);
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return fmtDate(d);
};

const buildSyncEvents = async (db: any, start: string | null, end: string | null) => {
    const events: any[] = [];
    const startDate = start ? new Date(start) : new Date();
    const endDate = end ? new Date(end) : new Date(Date.now() + 1000 * 60 * 60 * 24 * 365);

    const addEvent = (item: any, title: string, category: string, dateField: string, data: any = {}) => {
        const date = toIsoDate(item?.[dateField] || item?.date || item?.startDate || item?.examDate || item?.dueDate);
        if (!date) return;
        if (startDate && endDate && new Date(date) < startDate) return;
        if (startDate && endDate && new Date(date) > endDate) return;
        events.push({
            _id: `sync-${String(item._id || Math.random())}`,
            title,
            description: data.description || 'Auto-synced from school records',
            category,
            eventDate: date,
            startTime: item.startTime || item.time || '',
            endTime: item.endTime || '',
            color: data.color || '#5C67F2',
            priority: data.priority || 'medium',
            visibility: 'organization',
            status: 'approved',
            organizer: item.organizer || 'System',
            source: data.source || 'system',
            isSynced: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
    };

    try {
        const exams = await db.collection('exams').find({}).project({ _id: 1, name: 1, examDate: 1, date: 1, startDate: 1, startTime: 1, endTime: 1 }).toArray();
        exams.forEach((item: any) => addEvent(item, item.name || 'Exam', 'examinations', 'examDate', { source: 'exam' }));
    } catch {}

    try {
        const homework = await db.collection('homework').find({}).project({ _id: 1, title: 1, dueDate: 1, date: 1, startTime: 1, endTime: 1 }).toArray();
        homework.forEach((item: any) => addEvent(item, item.title || 'Assignment Due', 'academic', 'dueDate', { source: 'homework' }));
    } catch {}

    try {
        const fees = await db.collection('invoices').find({}).project({ _id: 1, invoiceNo: 1, dueDate: 1, date: 1 }).toArray();
        fees.forEach((item: any) => addEvent(item, `Fee Due • ${item.invoiceNo || item._id}`, 'fees', 'dueDate', { source: 'fees' }));
    } catch {}

    return events;
};

/** Add the new, additive fields (category, source, editable, location, allDay) on top of a
 *  stored/synced event, WITHOUT touching its original fields — old consumers (the dashboard
 *  mini-calendar, the teacher app) that only read the old field names keep working unchanged. */
const normalizeEvent = (e: any) => ({
    ...e,
    // `category` is left exactly as stored (old consumers — the dashboard mini-calendar, the
    // teacher app — read it as-is, e.g. still lowercase "academic"). `displayCategory` is the
    // new fixed taxonomy (section 5) the new calendar UI filters/colours by.
    displayCategory: normalizeCategory(e.source, e.category),
    location: e.location || e.venue || '',
    source: e.isSynced ? 'shulecloud' : (e.source === 'google' ? 'google' : 'shulecloud'),
    isPublicHoliday: false,
    isObservance: false,
    approxDate: false,
    country: null,
    allDay: !e.startTime,
    editable: !e.isSynced,
});

const holidayToEvent = (h: ReturnType<typeof getHolidaysInRange>[number]) => ({
    _id: h.id, title: h.title, description: h.note || '', category: h.category, displayCategory: h.category,
    eventDate: h.eventDate, startTime: '', endTime: '', venue: '', location: '', organizer:
        h.source === 'public_holiday' ? (COUNTRIES[h.country || DEFAULT_COUNTRY]?.name ? `${COUNTRIES[h.country || DEFAULT_COUNTRY].name} Government` : 'Public Holiday') : h.source === 'religious' ? 'Religious observance' : 'International observance',
    source: h.source, country: h.country, isPublicHoliday: h.isPublicHoliday, isObservance: h.isObservance,
    approxDate: h.approxDate, allDay: true, editable: false, status: 'approved',
});

const googleEventToEvent = (ev: any) => {
    const start = ev.start || {}; const end = ev.end || {};
    const allDay = !start.dateTime;
    return {
        _id: `google-${ev.id}`, googleEventId: ev.id, title: ev.summary || '(No title)', description: ev.description || '',
        category: 'PERSONAL', displayCategory: 'PERSONAL', eventDate: allDay ? start.date : String(start.dateTime).slice(0, 10),
        startTime: allDay ? '' : String(start.dateTime).slice(11, 16), endTime: allDay ? '' : String(end.dateTime || '').slice(11, 16),
        venue: ev.location || '', location: ev.location || '', organizer: 'Google Calendar', source: 'google',
        country: null, isPublicHoliday: false, isObservance: false, approxDate: false, allDay, editable: false, status: 'approved',
    };
};

router.get('/calendar/categories', async (req: Request, res: Response) => {
    res.json(CATEGORIES);
});

// Kept for backward compatibility with any caller that still posts a custom category — the
// fixed 10-category taxonomy above (section 5 of the spec) is what the calendar UI now filters
// by, but nothing already in `calendar_categories` is touched or deleted.
router.post('/calendar/categories', async (req: Request, res: Response) => {
    try {
        const db = getRequestDb(req);
        const payload = req.body || {};
        const doc = {
            _id: new ObjectId(), key: payload.key || `custom_${Date.now()}`, name: payload.name || 'Custom Category',
            color: payload.color || '#5C67F2', icon: payload.icon || 'pin', permissions: payload.permissions || ['create', 'read', 'update'],
            createdAt: new Date(), updatedAt: new Date(),
        };
        await db.collection('calendar_categories').insertOne(doc);
        res.status(201).json(doc);
    } catch (error: any) {
        res.status(500).json({ message: error.message || 'Unable to create calendar category' });
    }
});

router.get('/calendar/events', async (req: Request, res: Response) => {
    try {
        const db = getRequestDb(req);
        const { start, end, status, categories, country, includeHolidays, includeGoogle } = req.query as any;
        const query: any = { deletedAt: { $exists: false } };
        if (status) query.status = status;
        if (start || end) {
            const startDate = start ? new Date(String(start)) : null;
            const endDate = end ? new Date(String(end)) : null;
            if (startDate && endDate) query.eventDate = { $gte: fmtDate(startDate), $lte: fmtDate(endDate) };
            else if (startDate) query.eventDate = { $gte: fmtDate(startDate) };
            else if (endDate) query.eventDate = { $lte: fmtDate(endDate) };
        }
        const docs = await db.collection('calendar_events').find(query).sort({ eventDate: 1, startTime: 1 }).toArray();
        const synced = await buildSyncEvents(db, start || null, end || null);
        let events: any[] = [...docs, ...synced].filter(Boolean).map(normalizeEvent);

        if (includeHolidays) {
            const cc = String(country || DEFAULT_COUNTRY).toUpperCase();
            const rangeStart = start ? fmtDate(new Date(String(start))) : fmtDate(new Date());
            const rangeEnd = end ? fmtDate(new Date(String(end))) : rangeStart;
            events = events.concat(getHolidaysInRange(rangeStart, rangeEnd, cc).map(holidayToEvent));
        }

        if (includeGoogle) {
            try {
                const caller = callerOf(req);
                const conn = caller ? await getConnection(db, caller.id) : null;
                if (conn && start && end) {
                    const token = conn.accessToken; // freshness is handled inside sync writes; a stale read here just skips quietly on 401
                    const items = await listGoogleEvents(token, conn.calendarId, String(start), String(end));
                    events = events.concat(items.map(googleEventToEvent));
                }
            } catch { /* Google read is best-effort — never break the ShuleCloud calendar */ }
        }

        if (categories) {
            const want = new Set(String(categories).split(',').map(s => s.trim().toUpperCase()).filter(Boolean));
            events = events.filter(e => want.has(e.displayCategory));
        }
        events.sort((a, b) => String(a.eventDate).localeCompare(String(b.eventDate)) || String(a.startTime || '').localeCompare(String(b.startTime || '')));
        res.json(events);
    } catch (error: any) {
        res.status(500).json({ message: error.message || 'Unable to load calendar events' });
    }
});

router.post('/calendar/events', async (req: Request, res: Response) => {
    try {
        const db = getRequestDb(req);
        const payload = req.body || {};
        const caller = callerOf(req);
        const doc: any = {
            _id: new ObjectId(),
            title: payload.title || 'Untitled Event',
            description: payload.description || '',
            category: NEW_KEYS.has(String(payload.category || '').toUpperCase()) ? String(payload.category).toUpperCase() : (payload.category || 'SCHOOL'),
            organizationId: payload.organizationId || null,
            branchId: payload.branchId || null,
            academicYear: payload.academicYear || null,
            term: payload.term || null,
            class: payload.class || null,
            stream: payload.stream || null,
            department: payload.department || null,
            audience: payload.audience || 'organization',
            venue: payload.location || payload.venue || '',
            eventDate: toIsoDate(payload.eventDate) || fmtDate(new Date()),
            startTime: payload.startTime || '',
            endTime: payload.endTime || '',
            duration: payload.duration || '',
            color: payload.color || '#5C67F2',
            priority: payload.priority || 'medium',
            visibility: payload.visibility || 'organization',
            status: payload.status || 'approved',
            organizer: payload.organizer || caller?.name || 'Admin',
            attachments: payload.attachments || [],
            notes: payload.notes || '',
            maxParticipants: payload.maxParticipants || null,
            registrationRequired: Boolean(payload.registrationRequired),
            recurring: Boolean(payload.recurring),
            recurrence: payload.recurrence || null,
            endDate: toIsoDate(payload.endDate) || null,
            approvalStatus: payload.approvalStatus || 'approved',
            createdBy: caller?.id || payload.createdBy || 'system',
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        await db.collection('calendar_events').insertOne(doc);
        let googleSync: any = undefined;
        if (caller && payload.syncToGoogle !== false) googleSync = await syncEventToGoogle(db, caller.id, doc);
        res.status(201).json({ ...doc, googleSync });
    } catch (error: any) {
        res.status(500).json({ message: error.message || 'Unable to create calendar event' });
    }
});

router.patch('/calendar/events/:id', async (req: Request, res: Response) => {
    try {
        const db = getRequestDb(req);
        const { id } = req.params;
        const payload = { ...req.body };
        if (payload.location !== undefined && payload.venue === undefined) payload.venue = payload.location;
        const update = { ...payload, updatedAt: new Date() };
        await db.collection('calendar_events').updateOne({ _id: new ObjectId(id) }, { $set: update });
        let googleSync: any = undefined;
        const caller = callerOf(req);
        if (caller) {
            const fresh = await db.collection('calendar_events').findOne({ _id: new ObjectId(id) });
            if (fresh) googleSync = await syncEventToGoogle(db, caller.id, fresh as any);
        }
        res.json({ ok: true, id, googleSync });
    } catch (error: any) {
        res.status(500).json({ message: error.message || 'Unable to update calendar event' });
    }
});

router.delete('/calendar/events/:id', async (req: Request, res: Response) => {
    try {
        const db = getRequestDb(req);
        const { id } = req.params;
        const existing = await db.collection('calendar_events').findOne({ _id: new ObjectId(id) });
        await db.collection('calendar_events').updateOne({ _id: new ObjectId(id) }, { $set: { deletedAt: new Date(), status: 'cancelled' } });
        const caller = callerOf(req);
        if (caller && existing?.googleEventId) await deleteEventFromGoogle(db, caller.id, existing.googleEventId);
        res.json({ ok: true, id });
    } catch (error: any) {
        res.status(500).json({ message: error.message || 'Unable to delete calendar event' });
    }
});

router.get('/calendar/summary', async (req: Request, res: Response) => {
    try {
        const db = getRequestDb(req);
        const date = req.query.date ? String(req.query.date) : fmtDate(new Date());
        const docs = await db.collection('calendar_events').find({ deletedAt: { $exists: false }, eventDate: { $gte: date } }).sort({ eventDate: 1 }).toArray();
        const today = docs.filter((item: any) => item.eventDate === date);
        const tomorrow = docs.filter((item: any) => {
            const d = new Date(date);
            d.setDate(d.getDate() + 1);
            return item.eventDate === fmtDate(d);
        });
        const upcoming = docs.slice(0, 8);
        res.json({ todayCount: today.length, tomorrowCount: tomorrow.length, upcomingCount: upcoming.length, today, tomorrow, upcoming });
    } catch (error: any) {
        res.status(500).json({ message: error.message || 'Unable to load calendar summary' });
    }
});

// ═══════════════════════════════════════════════════════════════════
// Google Calendar connection (OAuth2 authorization-code flow)
// ═══════════════════════════════════════════════════════════════════

const ALLOWED_RETURN_HOSTS = (origin: string) => {
    try {
        const host = new URL(origin).hostname.toLowerCase();
        return host === 'localhost' || host.endsWith('.localhost') || host === 'shulecloud.com' || host.endsWith('.shulecloud.com');
    } catch { return false; }
};

router.get('/calendar/google/status', async (req: Request, res: Response) => {
    try {
        const caller = callerOf(req);
        if (!caller) return res.json({ connected: false });
        const db = getRequestDb(req);
        const conn = await getConnection(db, caller.id);
        res.json(conn ? { connected: true, email: conn.email, connectedAt: conn.connectedAt, lastError: conn.lastError || null } : { connected: false });
    } catch (error: any) {
        res.status(500).json({ message: error.message || 'Unable to check Google Calendar status' });
    }
});

router.get('/calendar/google/auth-url', async (req: Request, res: Response) => {
    try {
        const caller = callerOf(req);
        if (!caller || !isSchoolAdmin(caller)) return res.status(403).json({ message: 'Only a school admin can connect Google Calendar' });
        const env = googleCalendarEnv();
        if (!env.configured) return res.status(503).json({ message: 'Google Calendar is not set up on this platform yet. Ask ShuleCloud support to add the Google OAuth credentials.' });
        const returnUrl = String(req.query.returnUrl || '');
        if (!returnUrl || !ALLOWED_RETURN_HOSTS(returnUrl)) return res.status(400).json({ message: 'Invalid return URL' });
        const tenantContext = (req as any).tenantContext;
        if (!tenantContext?.databaseName) return res.status(400).json({ message: 'School context missing' });
        const state = jwt.sign({ userId: caller.id, databaseName: tenantContext.databaseName, returnUrl }, JWT_SECRET, { expiresIn: '15m' });
        res.json({ url: buildGoogleAuthUrl(state) });
    } catch (error: any) {
        res.status(500).json({ message: error.message || 'Unable to start Google Calendar connection' });
    }
});

/** Google redirects the browser straight here — no custom headers, so the tenant and user come
 *  entirely from the signed `state` built above, not from the usual tenancy middleware. */
router.get('/calendar/google/callback', async (req: Request, res: Response) => {
    const { getTenantDb } = await import('../lib/mongodb');
    const fail = (returnUrl: string | null, reason: string) => {
        const target = returnUrl && ALLOWED_RETURN_HOSTS(returnUrl) ? returnUrl : 'https://shulecloud.com';
        res.redirect(`${target}${target.includes('?') ? '&' : '?'}google=error&reason=${encodeURIComponent(reason)}`);
    };
    let state: any;
    try { state = jwt.verify(String(req.query.state || ''), JWT_SECRET); } catch { return fail(null, 'Your session expired — try connecting again.'); }
    if (req.query.error) return fail(state.returnUrl, String(req.query.error) === 'access_denied' ? 'You declined Google Calendar access.' : 'Google declined the request.');
    const code = String(req.query.code || '');
    if (!code) return fail(state.returnUrl, 'Google did not send an authorization code.');
    try {
        const tokens = await exchangeCodeForTokens(code);
        const db = getTenantDb(state.databaseName);
        await saveConnection(db, state.userId, tokens);
        res.redirect(`${state.returnUrl}${state.returnUrl.includes('?') ? '&' : '?'}google=connected`);
    } catch (e: any) {
        fail(state.returnUrl, e.message || 'Could not finish connecting Google Calendar.');
    }
});

router.post('/calendar/google/disconnect', async (req: Request, res: Response) => {
    try {
        const caller = callerOf(req);
        if (!caller || !isSchoolAdmin(caller)) return res.status(403).json({ message: 'Only a school admin can disconnect Google Calendar' });
        const db = getRequestDb(req);
        await disconnectGoogle(db, caller.id);
        res.json({ ok: true });
    } catch (error: any) {
        res.status(500).json({ message: error.message || 'Unable to disconnect Google Calendar' });
    }
});

export default router;
