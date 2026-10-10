import express, { Request, Response } from 'express';
import { Db, ObjectId } from 'mongodb';
import { getMetaDb } from '../lib/mongodb';

const router = express.Router();
const getRequestDb = (req: Request): Db => (req as any).tenantDb || getMetaDb();

const DEFAULT_CATEGORIES = [
    { key: 'academic', name: 'Academic', color: '#2563eb', icon: 'book-open' },
    { key: 'examinations', name: 'Examinations', color: '#dc2626', icon: 'pencil' },
    { key: 'sports', name: 'Sports', color: '#7c3aed', icon: 'medal' },
    { key: 'meetings', name: 'Meetings', color: '#0891b2', icon: 'users' },
    { key: 'fees', name: 'Fees', color: '#d97706', icon: 'credit-card' },
    { key: 'transport', name: 'Transport', color: '#0f766e', icon: 'bus' },
    { key: 'hostel', name: 'Hostel', color: '#be185d', icon: 'home' },
    { key: 'library', name: 'Library', color: '#4f46e5', icon: 'library' },
    { key: 'medical', name: 'Medical', color: '#16a34a', icon: 'stethoscope' },
    { key: 'religious', name: 'Religious', color: '#a16207', icon: 'flame' },
    { key: 'public_holiday', name: 'Public Holiday', color: '#f43f5e', icon: 'party-popper' },
    { key: 'school_holiday', name: 'School Holiday', color: '#64748b', icon: 'palmtree' },
    { key: 'administration', name: 'Administration', color: '#475569', icon: 'building' },
    { key: 'other', name: 'Other', color: '#6b7280', icon: 'pin' },
];

const fmtDate = (date: Date) => date.toISOString().slice(0, 10);

const toIsoDate = (value: any) => {
    if (!value) return null;
    if (value instanceof Date) return fmtDate(value);
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return fmtDate(d);
};

const getCategoryMap = async (db: any) => {
    const existing = await db.collection('calendar_categories').find({ deletedAt: { $exists: false } }).toArray().catch(() => []);
    if (existing.length) return Object.fromEntries(existing.map((c: any) => [String(c.key || c._id), c]));
    return Object.fromEntries(DEFAULT_CATEGORIES.map((c: any) => [c.key, { ...c, _id: new ObjectId().toHexString() }]));
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

router.get('/calendar/categories', async (req: Request, res: Response) => {
    try {
        const db = getRequestDb(req);
        const docs = await db.collection('calendar_categories').find({ deletedAt: { $exists: false } }).toArray().catch(() => []);
        res.json(docs.length ? docs : DEFAULT_CATEGORIES);
    } catch (error: any) {
        res.status(500).json({ message: error.message || 'Unable to load calendar categories' });
    }
});

router.post('/calendar/categories', async (req: Request, res: Response) => {
    try {
        const db = getRequestDb(req);
        const payload = req.body || {};
        const doc = {
            _id: new ObjectId(),
            key: payload.key || `custom_${Date.now()}`,
            name: payload.name || 'Custom Category',
            color: payload.color || '#5C67F2',
            icon: payload.icon || 'pin',
            permissions: payload.permissions || ['create','read','update'],
            createdAt: new Date(),
            updatedAt: new Date(),
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
        const { start, end, status } = req.query as any;
        const query: any = { deletedAt: { $exists: false } };
        if (status) query.status = status;
        if (start || end) {
            const startDate = start ? new Date(String(start)) : null;
            const endDate = end ? new Date(String(end)) : null;
            if (startDate && endDate) {
                query.eventDate = { $gte: fmtDate(startDate), $lte: fmtDate(endDate) };
            } else if (startDate) {
                query.eventDate = { $gte: fmtDate(startDate) };
            } else if (endDate) {
                query.eventDate = { $lte: fmtDate(endDate) };
            }
        }
        const docs = await db.collection('calendar_events').find(query).sort({ eventDate: 1, startTime: 1 }).toArray();
        const synced = await buildSyncEvents(db, start || null, end || null);
        res.json([...docs, ...synced].filter(Boolean));
    } catch (error: any) {
        res.status(500).json({ message: error.message || 'Unable to load calendar events' });
    }
});

router.post('/calendar/events', async (req: Request, res: Response) => {
    try {
        const db = getRequestDb(req);
        const payload = req.body || {};
        const doc = {
            _id: new ObjectId(),
            title: payload.title || 'Untitled Event',
            description: payload.description || '',
            category: payload.category || 'other',
            organizationId: payload.organizationId || null,
            branchId: payload.branchId || null,
            academicYear: payload.academicYear || null,
            term: payload.term || null,
            class: payload.class || null,
            stream: payload.stream || null,
            department: payload.department || null,
            audience: payload.audience || 'organization',
            venue: payload.venue || '',
            eventDate: toIsoDate(payload.eventDate) || fmtDate(new Date()),
            startTime: payload.startTime || '',
            endTime: payload.endTime || '',
            duration: payload.duration || '',
            color: payload.color || '#5C67F2',
            priority: payload.priority || 'medium',
            visibility: payload.visibility || 'organization',
            status: payload.status || 'approved',
            organizer: payload.organizer || 'Admin',
            attachments: payload.attachments || [],
            notes: payload.notes || '',
            maxParticipants: payload.maxParticipants || null,
            registrationRequired: Boolean(payload.registrationRequired),
            recurring: Boolean(payload.recurring),
            recurrence: payload.recurrence || null,
            endDate: toIsoDate(payload.endDate) || null,
            approvalStatus: payload.approvalStatus || 'approved',
            createdBy: payload.createdBy || 'system',
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        await db.collection('calendar_events').insertOne(doc);
        res.status(201).json(doc);
    } catch (error: any) {
        res.status(500).json({ message: error.message || 'Unable to create calendar event' });
    }
});

router.patch('/calendar/events/:id', async (req: Request, res: Response) => {
    try {
        const db = getRequestDb(req);
        const { id } = req.params;
        const update = { ...req.body, updatedAt: new Date() };
        await db.collection('calendar_events').updateOne({ _id: new ObjectId(id) }, { $set: update });
        res.json({ ok: true, id });
    } catch (error: any) {
        res.status(500).json({ message: error.message || 'Unable to update calendar event' });
    }
});

router.delete('/calendar/events/:id', async (req: Request, res: Response) => {
    try {
        const db = getRequestDb(req);
        const { id } = req.params;
        await db.collection('calendar_events').updateOne({ _id: new ObjectId(id) }, { $set: { deletedAt: new Date(), status: 'cancelled' } });
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
        res.json({
            todayCount: today.length,
            tomorrowCount: tomorrow.length,
            upcomingCount: upcoming.length,
            today,
            tomorrow,
            upcoming,
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message || 'Unable to load calendar summary' });
    }
});

export default router;
