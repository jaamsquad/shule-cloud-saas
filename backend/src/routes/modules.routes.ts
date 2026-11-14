import { Router, Request, Response } from 'express';
import { Db, ObjectId } from 'mongodb';
import { getMetaDb } from '../lib/mongodb';
import * as c from '../controllers/academics.controller';
import { enforceCrud } from '../lib/permissions';
import { issueStudentCertificate, CERT_TYPES } from '../modules/certificates/studentCerts.routes';
import { sendSignoutOtp, checkSignoutOtp } from '../lib/signoutOtp';

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
        // Resolve the real admission/registration number from the student record.
        let admNo = req.body?.admNo || req.body?.registrationNo || '';
        if (!admNo && studentId) {
            try { const st = await database.collection('students').findOne({ _id: new ObjectId(String(studentId)) }); admNo = st?.registrationNo || st?.admNo || ''; } catch { /* ignore */ }
        }
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
            admNo: admNo || '',
            registrationNo: admNo || '',
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

// ── Sports: staff add students by hand (searched by class or admission no.) ──
// Already-enrolled students are skipped, and so is anyone past the sport's capacity.
// The sport fee is invoiced when billFee is on (the default when the sport has a fee).
const oidOf = (v: any) => { try { return new ObjectId(String(v)); } catch { return null; } };
const nameOf = (st: any) => st?.studentName || `${st?.firstName || ''} ${st?.lastName || ''}`.trim() || st?.name || 'Student';
router.post('/sports/:id/participants', enforceCrud('sports', 'create'), async (req: Request, res: Response) => {
    try {
        const database = db(req);
        const sid = oidOf(req.params.id);
        const sport: any = sid ? await database.collection('sports').findOne({ _id: sid }) : null;
        if (!sport) return res.status(404).json({ message: 'Sport not found' });
        const ids: string[] = [...new Set((Array.isArray(req.body?.studentIds) ? req.body.studentIds : []).map(String))].slice(0, 500) as string[];
        if (!ids.length) return res.status(400).json({ message: 'Pick at least one student' });
        const fee = num(sport.fee);
        const billFee = req.body?.billFee === undefined ? fee > 0 : !!req.body.billFee;

        const existing: any[] = await database.collection('sports_enrollments').find({ sportId: String(sport._id) }).toArray();
        const enrolled = new Set(existing.filter(e => e.status !== 'declined').map(e => String(e.studentId)));
        const capacity = num(sport.capacity);
        let taken = existing.filter(e => e.status !== 'declined').length;
        const students: any[] = await database.collection('students').find({ _id: { $in: ids.map(oidOf).filter(Boolean) as ObjectId[] } }).toArray();
        const byId = new Map(students.map(st => [String(st._id), st]));
        const actor = (req as any).tenantContext?.user || {};

        const added: any[] = [], skipped: any[] = [];
        for (const id of ids) {
            const st = byId.get(id);
            if (!st) { skipped.push({ studentId: id, studentName: '', reason: 'Student not found' }); continue; }
            if (enrolled.has(id)) { skipped.push({ studentId: id, studentName: nameOf(st), reason: 'Already in this sport' }); continue; }
            if (capacity > 0 && taken >= capacity) { skipped.push({ studentId: id, studentName: nameOf(st), reason: `${sport.name} is full (${capacity})` }); continue; }
            const studentClass = st.studentClass || st.currentClass || '';
            const admNo = st.registrationNo || st.admissionNumber || st.admNo || '';
            let invoice: any = null;
            if (billFee && fee > 0) {
                invoice = await createInvoice(database, { studentId: id, studentName: nameOf(st), studentClass, amount: fee, description: `${sport.name} (Sports) — ${sport.term || 'Term'}`, category: 'Sports' });
            }
            const enrollment = {
                sportId: String(sport._id), sportName: sport.name, studentId: id, studentName: nameOf(st), studentClass,
                admNo, registrationNo: admNo, fee: billFee ? fee : 0,
                invoiceId: invoice?._id?.toString() || null, invoiceNo: invoice?.invoice_no || null,
                status: invoice ? 'awaiting_payment' : 'confirmed', approvalStatus: 'approved',
                source: 'staff', addedBy: actor.name || actor.staffId || 'admin', createdAt: new Date(),
            };
            const r = await database.collection('sports_enrollments').insertOne(enrollment);
            added.push({ ...enrollment, _id: r.insertedId });
            enrolled.add(id); taken++;
        }
        res.json({ added, skipped });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Sports: certificates for participants (same designs as the student profile) ──
// One certificate per chosen participant, each with its own number + QR; "{name}" and
// "{class}" in the wording are filled in per student. Recorded on the enrolment too.
router.post('/sports/:id/certificates', enforceCrud('certificates', 'create'), async (req: Request, res: Response) => {
    try {
        const database = db(req);
        const sid = oidOf(req.params.id);
        const sport: any = sid ? await database.collection('sports').findOne({ _id: sid }) : null;
        if (!sport) return res.status(404).json({ message: 'Sport not found' });
        const b = req.body || {};
        const type = CERT_TYPES[String(b.type)] && !['transfer', 'leaving', 'graduation', 'recommendation'].includes(String(b.type)) ? String(b.type) : 'participation';
        const ids: string[] = [...new Set((Array.isArray(b.enrollmentIds) ? b.enrollmentIds : []).map(String))].slice(0, 300) as string[];
        if (!ids.length) return res.status(400).json({ message: 'Pick at least one participant' });
        if (!String(b.body || '').trim()) return res.status(400).json({ message: 'Write what the certificate is awarded for.' });
        const rows: any[] = await database.collection('sports_enrollments').find({ _id: { $in: ids.map(oidOf).filter(Boolean) as ObjectId[] }, sportId: String(sport._id) }).toArray();
        const students: any[] = await database.collection('students').find({ _id: { $in: rows.map(r => oidOf(r.studentId)).filter(Boolean) as ObjectId[] } }).toArray();
        const byId = new Map(students.map(st => [String(st._id), st]));

        const issued: any[] = [], failed: any[] = [];
        for (const r of rows) {
            const st = byId.get(String(r.studentId));
            if (!st) { failed.push({ studentName: r.studentName || '', reason: 'No student record linked to this enrolment' }); continue; }
            const fill = (t: any) => String(t || '').replace(/\{name\}/gi, nameOf(st)).replace(/\{class\}/gi, st.studentClass || st.currentClass || '').replace(/\{sport\}/gi, sport.name || '');
            const doc = await issueStudentCertificate(req, st, { ...b, type, body: fill(b.body), title: fill(b.title), subtitle: fill(b.subtitle) }, { sportId: String(sport._id), sportName: sport.name, source: 'sports' });
            if (doc.error) { failed.push({ studentName: nameOf(st), reason: doc.error }); continue; }
            await database.collection('sports_enrollments').updateOne({ _id: r._id }, { $push: { certificates: { certId: doc.certId, type, issuedAt: new Date() } } } as any);
            issued.push(doc);
        }
        res.json({ issued, failed });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ── Front desk: student sign-out with a parent code (lib/signoutOtp) ──────────
router.post('/student-signouts/otp/send', enforceCrud('frontdesk', 'create'), async (req: Request, res: Response) => {
    try {
        const ctx = (req as any).tenantContext || {};
        const r: any = await sendSignoutOtp(db(req), String(ctx.tenantId || ''), String(req.body?.studentId || ''), { pickedBy: String(req.body?.pickedBy || '').slice(0, 80), reason: String(req.body?.reason || '').slice(0, 80), schoolName: ctx.tenantName });
        if (r.error) return res.status(r.status || 400).json({ message: r.error });
        res.json(r);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});
router.post('/student-signouts/record', enforceCrud('frontdesk', 'create'), async (req: Request, res: Response) => {
    try {
        const database = db(req);
        const b = req.body || {};
        const sid = oidOf(b.studentId);
        const st: any = sid ? await database.collection('students').findOne({ _id: sid }) : null;
        if (!st) return res.status(400).json({ message: 'Pick the student' });
        if (!String(b.parentName || '').trim()) return res.status(400).json({ message: 'Who is picking the student?' });
        let otp: any = null;
        if (String(b.otpCode || '').trim()) {
            otp = await checkSignoutOtp(database, String(st._id), String(b.otpCode));
            if (!otp.ok) return res.status(400).json({ message: otp.error });
        }
        const now = new Date();
        const actor = (req as any).tenantContext?.user || {};
        const doc = {
            studentId: String(st._id), studentName: nameOf(st), admNo: st.registrationNo || st.admissionNumber || st.admNo || '',
            studentClass: st.studentClass || st.currentClass || '',
            parentName: String(b.parentName).trim().slice(0, 100), parentPhone: String(b.parentPhone || '').slice(0, 30), idNumber: String(b.idNumber || '').slice(0, 30),
            reason: String(b.reason || '').slice(0, 200),
            date: /^\d{4}-\d{2}-\d{2}$/.test(b.date) ? b.date : todayStr(),
            timeOut: String(b.timeOut || '').slice(0, 10) || now.toTimeString().slice(0, 5),
            otpVerified: otp?.ok ? 'Yes' : 'No', otpSentTo: otp?.ok ? otp.sentTo : [], otpVerifiedAt: otp?.ok ? now : null,
            recordedBy: actor.name || actor.staffId || 'admin', createdAt: now,
        };
        const r = await database.collection('student_signouts').insertOne(doc);
        res.status(201).json({ ...doc, _id: r.insertedId });
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
