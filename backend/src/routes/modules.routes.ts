import { Router, Request, Response, NextFunction } from 'express';
import { Db, ObjectId } from 'mongodb';
import jwt from 'jsonwebtoken';
import { getMetaDb } from '../lib/mongodb';
import * as c from '../controllers/academics.controller';
import { resolveStaffCrud } from '../lib/permissions';

// ── CRUD enforcement ─────────────────────────────────────────────────────────
// Blocks create/update/delete unless the caller's role/staff CRUD matrix grants
// the action for this module. Admins always pass. Read (GET) is never blocked.
// The token is already authenticated by tenancy middleware upstream; here we only
// read its claims (role/staffId) to authorize the action.
const decodeClaims = (req: Request): any => {
    try {
        const auth = req.headers.authorization;
        if (!auth) return {};
        return jwt.decode(auth.split(' ')[1]) || {};
    } catch { return {}; }
};

const enforceCrud = (moduleKey: string, action: 'create' | 'update' | 'delete') =>
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const claims = decodeClaims(req);
            const role = String(claims.role || '').toLowerCase();
            // Admins bypass all CRUD checks.
            if (!role || role === 'school_admin' || role === 'super_admin') return next();

            const database = (req as any).tenantDb || getMetaDb();
            let staff: any = null;
            const sid = claims.staffId || claims.sub || claims.userId;
            if (sid) { try { staff = await database.collection('staff').findOne({ _id: new ObjectId(sid) }); } catch { /* ignore */ } }
            if (!staff) staff = { designation: role.replace(/_/g, ' ') };

            const crud = await resolveStaffCrud(database, staff);
            const allowed = Array.isArray(crud[moduleKey]) && crud[moduleKey].includes(action);
            if (!allowed) return res.status(403).json({ message: `Not allowed to ${action} in ${moduleKey}` });
            next();
        } catch (e: any) {
            // Fail closed for writes on unexpected errors.
            res.status(403).json({ message: 'Permission check failed' });
        }
    };

// ─────────────────────────────────────────────────────────────────────────────
// Extra MIS modules: Sports, Trips & Excursions, Front Desk, Secretary.
// These reuse the generic CRUD controller (tenant-DB aware) for storage, and add
// a few computed dashboard endpoints. Each behaves like a mini-system while still
// integrating with fees (invoices), students, attendance and communications.
// ─────────────────────────────────────────────────────────────────────────────

const router = Router();
const db = (req: Request): Db => (req as any).tenantDb || getMetaDb();
const num = (v: any) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const todayStr = () => new Date().toISOString().slice(0, 10);

// Register full CRUD for a collection under a base path, enforcing the module's
// CRUD matrix on writes (reads are open to anyone who can see the module).
const crud = (base: string, collection: string, moduleKey: string) => {
    router.get(`/${base}`, c.getItems(collection));
    router.post(`/${base}`, enforceCrud(moduleKey, 'create'), c.createItem(collection));
    router.patch(`/${base}/:id`, enforceCrud(moduleKey, 'update'), c.updateItem(collection));
    router.delete(`/${base}/:id`, enforceCrud(moduleKey, 'delete'), c.deleteItem(collection));
};

// ── Collections ──────────────────────────────────────────────────────────────
crud('sports', 'sports', 'sports');
crud('sports-enrollments', 'sports_enrollments', 'sports');
crud('sports-attendance', 'sports_attendance', 'sports');
crud('sports-performance', 'sports_performance', 'sports');

crud('trips', 'trips', 'trips');
crud('trip-participants', 'trip_participants', 'trips');
crud('trip-documents', 'trip_documents', 'trips');
crud('trip-attendance', 'trip_attendance', 'trips');

crud('visitors', 'visitors', 'frontdesk');
crud('student-signouts', 'student_signouts', 'frontdesk');
crud('deliveries', 'deliveries', 'frontdesk');
crud('appointments', 'appointments', 'frontdesk');

crud('secretary-meetings', 'secretary_meetings', 'secretary');

// ── Helper: post a fee invoice for a sport/trip enrolment ────────────────────
// Mirrors the fee module's invoice shape so it shows up in Generated Invoices.
async function createInvoice(database: Db, opts: { studentId?: string; studentName?: string; studentClass?: string; amount: number; description: string; category: string }) {
    const count = await database.collection('invoices').countDocuments({});
    const invoice_no = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;
    const doc: any = {
        invoice_no,
        student_id: opts.studentId || null,
        studentName: opts.studentName || '',
        studentClass: opts.studentClass || '',
        items: [{ description: opts.description, amount: opts.amount }],
        total: opts.amount,
        total_due: opts.amount,
        balance: opts.amount,
        amountPaid: 0,
        status: 'unpaid',
        category: opts.category,
        createdAt: new Date(),
        date: todayStr(),
    };
    const r = await database.collection('invoices').insertOne(doc);
    return { _id: r.insertedId, invoice_no };
}

// ── Sports: enroll a student (parent or admin) → auto-post the sport fee ──────
router.post('/sports/:id/enroll', async (req: Request, res: Response) => {
    try {
        const database = db(req);
        const sport = await database.collection('sports').findOne({ _id: new ObjectId(req.params.id) });
        if (!sport) return res.status(404).json({ message: 'Sport not found' });

        const { studentId, studentName, studentClass } = req.body || {};
        const fee = num(sport.fee);
        let invoice: any = null;
        if (fee > 0) {
            invoice = await createInvoice(database, {
                studentId, studentName, studentClass, amount: fee,
                description: `${sport.name} (Sports) — ${sport.term || 'Term'}`,
                category: 'Sports',
            });
        }
        const enrollment = {
            sportId: req.params.id,
            sportName: sport.name,
            studentId: studentId || null,
            studentName: studentName || '',
            studentClass: studentClass || '',
            fee,
            invoiceId: invoice?._id?.toString() || null,
            invoiceNo: invoice?.invoice_no || null,
            status: fee > 0 ? 'awaiting_payment' : 'confirmed',
            approvalStatus: 'pending',
            createdAt: new Date(),
        };
        const r = await database.collection('sports_enrollments').insertOne(enrollment);
        res.json({ ...enrollment, _id: r.insertedId });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Trips: enroll/approve a student → auto-post the trip fee ─────────────────
router.post('/trips/:id/enroll', async (req: Request, res: Response) => {
    try {
        const database = db(req);
        const trip = await database.collection('trips').findOne({ _id: new ObjectId(req.params.id) });
        if (!trip) return res.status(404).json({ message: 'Trip not found' });

        const { studentId, studentName, studentClass, decision } = req.body || {};
        if (decision === 'decline') {
            const r = await database.collection('trip_participants').insertOne({
                tripId: req.params.id, tripName: trip.name, studentId, studentName, studentClass,
                status: 'declined', paid: false, createdAt: new Date(),
            });
            return res.json({ _id: r.insertedId, status: 'declined' });
        }

        const fee = num(trip.fee);
        let invoice: any = null;
        if (fee > 0) {
            invoice = await createInvoice(database, {
                studentId, studentName, studentClass, amount: fee,
                description: `${trip.name} (Trip) — ${trip.destination || ''}`.trim(),
                category: 'Trips',
            });
        }
        const participant = {
            tripId: req.params.id,
            tripName: trip.name,
            studentId: studentId || null,
            studentName: studentName || '',
            studentClass: studentClass || '',
            fee,
            invoiceId: invoice?._id?.toString() || null,
            invoiceNo: invoice?.invoice_no || null,
            paid: false,
            status: fee > 0 ? 'awaiting_payment' : 'confirmed',
            createdAt: new Date(),
        };
        const r = await database.collection('trip_participants').insertOne(participant);
        res.json({ ...participant, _id: r.insertedId });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Sports dashboard summary ─────────────────────────────────────────────────
router.get('/sports/summary/dashboard', async (req: Request, res: Response) => {
    try {
        const database = db(req);
        const [sports, enrollments] = await Promise.all([
            database.collection('sports').find({}).toArray(),
            database.collection('sports_enrollments').find({}).toArray(),
        ]);
        const perSport: Record<string, number> = {};
        let collected = 0, pending = 0, awaitingApproval = 0;
        for (const e of enrollments) {
            perSport[e.sportName] = (perSport[e.sportName] || 0) + 1;
            if (e.status === 'confirmed') collected += num(e.fee);
            else if (e.status === 'awaiting_payment') pending += num(e.fee);
            if (e.approvalStatus === 'pending') awaitingApproval += 1;
        }
        const coaches = new Set(sports.map((s: any) => s.coach).filter(Boolean));
        const events = sports.flatMap((s: any) => (s.schedule ? [s.schedule] : []));
        res.json({
            data: {
                totalSports: sports.length,
                totalRegistered: enrollments.length,
                activeCoaches: coaches.size,
                upcomingEvents: events.length,
                feesCollected: collected,
                pendingPayments: pending,
                awaitingApproval,
                participantsPerSport: Object.entries(perSport).map(([name, count]) => ({ name, count })),
            },
        });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Trips dashboard summary ──────────────────────────────────────────────────
router.get('/trips/summary/dashboard', async (req: Request, res: Response) => {
    try {
        const database = db(req);
        const [trips, participants] = await Promise.all([
            database.collection('trips').find({}).toArray(),
            database.collection('trip_participants').find({}).toArray(),
        ]);
        let revenue = 0, pending = 0, paidCount = 0;
        for (const p of participants) {
            if (p.paid || p.status === 'confirmed') { revenue += num(p.fee); paidCount += 1; }
            else if (p.status === 'awaiting_payment') pending += num(p.fee);
        }
        const teachers = new Set(trips.flatMap((t: any) => t.teachers || []).filter(Boolean));
        const upcoming = trips.filter((t: any) => !t.date || t.date >= todayStr());
        res.json({
            data: {
                upcomingTrips: upcoming.length,
                totalTrips: trips.length,
                paidParticipants: paidCount,
                pendingPayments: pending,
                totalRevenue: revenue,
                teachersAssigned: teachers.size,
            },
        });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Front Desk dashboard summary ─────────────────────────────────────────────
router.get('/frontdesk/summary/dashboard', async (req: Request, res: Response) => {
    try {
        const database = db(req);
        const today = todayStr();
        const [visitors, signouts, deliveries, appointments] = await Promise.all([
            database.collection('visitors').find({ date: today }).toArray().catch(() => []),
            database.collection('student_signouts').find({ date: today }).toArray().catch(() => []),
            database.collection('deliveries').find({ date: today }).toArray().catch(() => []),
            database.collection('appointments').find({}).toArray().catch(() => []),
        ]);
        res.json({
            data: {
                visitorsToday: visitors.length,
                studentsSignedOut: signouts.length,
                deliveries: deliveries.length,
                appointments: appointments.filter((a: any) => a.status !== 'done').length,
                emergencyCases: visitors.filter((v: any) => /emergency/i.test(v.purpose || '')).length,
            },
        });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Secretary dashboard summary ──────────────────────────────────────────────
router.get('/secretary/summary/dashboard', async (req: Request, res: Response) => {
    try {
        const database = db(req);
        const today = todayStr();
        const [students, meetings, invoices] = await Promise.all([
            database.collection('students').find({}).toArray().catch(() => []),
            database.collection('secretary_meetings').find({}).toArray().catch(() => []),
            database.collection('invoices').find({}).toArray().catch(() => []),
        ]);
        const admissionsToday = students.filter((s: any) => {
            const d = s.admissionDate || s.createdAt;
            return d && String(d).slice(0, 10) === today;
        }).length;
        const balances = invoices.reduce((a: number, i: any) => a + num(i.balance), 0);
        const upcomingMeetings = meetings.filter((m: any) => !m.date || m.date >= today).length;
        res.json({
            data: {
                admissionsToday,
                totalStudents: students.length,
                feeBalances: balances,
                upcomingMeetings,
                pendingCertificates: 0,
            },
        });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

export default router;
