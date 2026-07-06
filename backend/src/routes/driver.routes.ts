/**
 * ShuleCloud Driver app API — powers the Flutter driver app.
 *
 * A "driver" is a STAFF member with a transport role, linked to one or more
 * `transport_zones` (by driverId / coDriverId / name). Auth mirrors the staff
 * portal: login with portalUsername/portalPassword → a JWT (PORTAL_SECRET) that
 * carries { staffId }. Every route is tenant-scoped by the usual subdomain
 * middleware, so the app must send `x-tenant-subdomain: <school>` (the School
 * Code) or hit the school's subdomain host.
 *
 * Mounted at /api/v1 → the app's ApiConfig.baseUrl should be
 *   https://<school>.shulecloud.com/api/v1
 * and paths below are the app's `/driver/*` and `/tracker/*` endpoints.
 */
import { Router, Request, Response } from 'express';
import { Db, ObjectId } from 'mongodb';
import jwt from 'jsonwebtoken';
import { getMetaDb } from '../lib/mongodb';

const router = Router();
const db = (req: Request): Db => (req as any).tenantDb || getMetaDb();
const SECRET = process.env.JWT_SECRET || 'shulecloud_student_secret_2024';
const oid = (id: any): ObjectId | null => { try { return new ObjectId(String(id)); } catch { return null; } };

// ── Auth helper ───────────────────────────────────────────────────────────────
// Verifies the driver JWT and loads the staff record. Returns null when invalid.
const driverFromReq = async (req: Request) => {
    try {
        const token = (req.headers.authorization || '').split(' ')[1];
        if (!token) return null;
        const decoded: any = jwt.verify(token, SECRET);
        if (!decoded?.staffId) return null;
        const staff = await db(req).collection('staff').findOne({ _id: new ObjectId(String(decoded.staffId)) });
        if (!staff) return null;
        return { id: String(staff._id), name: staff.employeeName || staff.name || decoded.name || 'Driver', staff };
    } catch {
        return null;
    }
};

// Wrap a handler so it always has an authenticated driver.
const authed = (handler: (req: Request, res: Response, me: NonNullable<Awaited<ReturnType<typeof driverFromReq>>>) => Promise<unknown>) =>
    async (req: Request, res: Response) => {
        const me = await driverFromReq(req);
        if (!me) return res.status(401).json({ message: 'Not authenticated' });
        try { await handler(req, res, me); }
        catch (e: any) { res.status(500).json({ message: e.message }); }
    };

// The transport zones this driver is assigned to (their "routes").
const zonesForDriver = async (req: Request, me: { id: string; name: string }) => {
    return db(req).collection('transport_zones').find({
        $or: [
            { driverId: me.id }, { coDriverId: me.id },
            { driver: me.name }, { coDriver: me.name },
        ],
    }).toArray().catch(() => []);
};

// A driver profile derived from the staff + their primary transport zone.
const driverProfile = (staff: any, zone: any) => ({
    id: String(staff._id),
    name: staff.employeeName || staff.name || 'Driver',
    email: staff.email || null,
    phone: staff.phone || null,
    photoUrl: staff.photo || staff.avatar || staff.staffPhoto || null,
    busId: String(zone?._id || ''),
    busPlate: zone?.busReg || zone?.busNumber || zone?.busName || 'Bus',
    routeId: String(zone?._id || ''),
    routeName: zone?.name || zone?.routeName || 'Route',
});

// ════════════════════════════════════════════════════════════════════════════
//  AUTH
// ════════════════════════════════════════════════════════════════════════════

// POST /driver/login  { schoolCode, identifier, password }
// schoolCode is informational (the subdomain already scopes the tenant).
router.post('/driver/login', async (req: Request, res: Response) => {
    try {
        const { identifier, password } = req.body || {};
        if (!identifier || !password) return res.status(400).json({ message: 'Enter your Driver ID and password' });

        const database = db(req);
        // Match by portal username OR email OR staff number.
        const staff = await database.collection('staff').findOne({
            $or: [
                { portalUsername: identifier },
                { email: identifier },
                { staffNo: identifier }, { employeeId: identifier },
            ],
        });
        if (!staff || staff.portalPassword !== password) {
            return res.status(401).json({ message: 'Invalid credentials. Check your Driver ID and password.' });
        }

        const me = { id: String(staff._id), name: staff.employeeName || staff.name || 'Driver' };
        const zones = await zonesForDriver(req, me);
        const zone = zones[0] || null;

        const accessToken = jwt.sign(
            { staffId: me.id, role: 'driver', name: me.name, type: 'access' },
            SECRET,
            { expiresIn: '1d' },
        );
        const refreshToken = jwt.sign(
            { staffId: me.id, role: 'driver', type: 'refresh' },
            SECRET,
            { expiresIn: '30d' },
        );

        res.json({ accessToken, refreshToken, driver: driverProfile(staff, zone) });
    } catch (e: any) {
        res.status(500).json({ message: e.message });
    }
});

// POST /driver/refresh  { refreshToken } → new access token
router.post('/driver/refresh', async (req: Request, res: Response) => {
    try {
        const { refreshToken } = req.body || {};
        if (!refreshToken) return res.status(400).json({ message: 'refreshToken required' });
        const decoded: any = jwt.verify(refreshToken, SECRET);
        if (decoded?.type !== 'refresh' || !decoded.staffId) return res.status(401).json({ message: 'Invalid refresh token' });
        const accessToken = jwt.sign(
            { staffId: decoded.staffId, role: 'driver', type: 'access' },
            SECRET,
            { expiresIn: '1d' },
        );
        res.json({ accessToken, refreshToken });
    } catch {
        res.status(401).json({ message: 'Invalid or expired refresh token' });
    }
});

// GET /driver/me → the driver profile (used for auto-login refresh).
router.get('/driver/me', authed(async (req, res, me) => {
    const zones = await zonesForDriver(req, me);
    res.json(driverProfile(me.staff, zones[0] || null));
}));

// ════════════════════════════════════════════════════════════════════════════
//  ROUTE + TRIP LIFECYCLE
// ════════════════════════════════════════════════════════════════════════════

// GET /driver/route/today → the driver's primary route + its stops.
router.get('/driver/route/today', authed(async (req, res, me) => {
    const zones = await zonesForDriver(req, me);
    const zone: any = zones[0];
    if (!zone) return res.json({ id: '', name: 'No route assigned', busPlate: '', stops: [] });

    const profile: any = await db(req).collection('school_profile').findOne({}).catch(() => null) || {};
    const stops = Array.isArray(zone.stops) ? zone.stops : [];
    res.json({
        id: String(zone._id),
        name: zone.name || zone.routeName || 'Route',
        busPlate: zone.busReg || zone.busNumber || zone.busName || 'Bus',
        schoolLat: profile.lat ?? null,
        schoolLng: profile.lng ?? null,
        stops: stops.map((s: any, i: number) => ({
            id: String(s.id || s._id || i),
            name: s.name || s.stop || `Stop ${i + 1}`,
            lat: s.lat ?? null,
            lng: s.lng ?? null,
            scheduledTime: s.time || s.scheduledTime || '',
            studentCount: Number(s.studentCount || 0),
            status: s.status || 'pending',
        })),
    });
}));

const upsertTrip = async (req: Request, me: { id: string }, zoneId: string, state: string) => {
    const now = new Date();
    const trips = db(req).collection('driver_trips');
    if (state === 'started') {
        const r = await trips.insertOne({ driverId: me.id, routeId: zoneId, state, startedAt: now, createdAt: now });
        return { _id: r.insertedId, routeId: zoneId, state, startedAt: now };
    }
    // For pause/resume/end, update the driver's latest open trip.
    const tripId = oid((req.body || {}).tripId);
    const filter = tripId ? { _id: tripId } : { driverId: me.id };
    const set: any = { state, updatedAt: now };
    if (state === 'completed') set.endedAt = now;
    await trips.updateOne(filter, { $set: set }, { upsert: false });
    const doc = await trips.findOne(filter, { sort: { createdAt: -1 } });
    return doc || { _id: tripId, routeId: zoneId, state };
};

router.post('/driver/trip/start', authed(async (req, res, me) => {
    const zones = await zonesForDriver(req, me);
    const zoneId = String((req.body || {}).routeId || zones[0]?._id || '');
    const t: any = await upsertTrip(req, me, zoneId, 'started');
    res.json({ id: String(t._id), routeId: zoneId, state: 'started', startedAt: t.startedAt });
}));

router.post('/driver/trip/pause', authed(async (req, res, me) => {
    const t: any = await upsertTrip(req, me, '', 'paused');
    res.json({ id: String(t._id || ''), state: 'paused' });
}));

router.post('/driver/trip/resume', authed(async (req, res, me) => {
    const t: any = await upsertTrip(req, me, '', 'started');
    res.json({ id: String(t._id || ''), state: 'started' });
}));

router.post('/driver/trip/end', authed(async (req, res, me) => {
    const t: any = await upsertTrip(req, me, '', 'completed');
    res.json({ id: String(t._id || ''), state: 'completed', endedAt: new Date() });
}));

// ════════════════════════════════════════════════════════════════════════════
//  LIVE TRACKING
// ════════════════════════════════════════════════════════════════════════════

// POST /tracker/location — one GPS point. Stored as the bus's latest position and
// appended to a capped trail so parents/admins can watch the bus live.
router.post('/tracker/location', authed(async (req, res, me) => {
    const p = req.body || {};
    const doc = {
        driverId: me.id, busId: String(p.busId || ''), tripId: String(p.tripId || ''),
        lat: Number(p.lat), lng: Number(p.lng),
        speed: Number(p.speed || 0), heading: Number(p.heading || 0),
        accuracy: Number(p.accuracy || 0), altitude: Number(p.altitude || 0),
        battery: Number(p.battery || 0),
        at: p.timestamp ? new Date(Number(p.timestamp)) : new Date(),
    };
    const database = db(req);
    await database.collection('bus_locations').insertOne(doc);
    // Keep a single "latest" doc per bus for quick reads.
    await database.collection('bus_positions').updateOne(
        { busId: doc.busId || me.id },
        { $set: { ...doc, updatedAt: new Date() } },
        { upsert: true },
    );
    res.json({ ok: true });
}));

// POST /tracker/location/batch — flush queued offline points at once.
router.post('/tracker/location/batch', authed(async (req, res, me) => {
    const points: any[] = Array.isArray((req.body || {}).points) ? req.body.points : [];
    if (points.length === 0) return res.json({ ok: true, saved: 0 });
    const docs = points.map((p) => ({
        driverId: me.id, busId: String(p.busId || ''), tripId: String(p.tripId || ''),
        lat: Number(p.lat), lng: Number(p.lng),
        speed: Number(p.speed || 0), heading: Number(p.heading || 0),
        accuracy: Number(p.accuracy || 0), altitude: Number(p.altitude || 0),
        battery: Number(p.battery || 0),
        at: p.timestamp ? new Date(Number(p.timestamp)) : new Date(),
    }));
    await db(req).collection('bus_locations').insertMany(docs);
    res.json({ ok: true, saved: docs.length });
}));

// ════════════════════════════════════════════════════════════════════════════
//  STUDENTS + BOARDING
// ════════════════════════════════════════════════════════════════════════════

// GET /driver/students — students on the driver's route (by transportZone).
router.get('/driver/students', authed(async (req, res, me) => {
    const zones = await zonesForDriver(req, me);
    const zoneNames = zones.map((z: any) => z.name).filter(Boolean);
    const query: any = zoneNames.length ? { transportZone: { $in: zoneNames } } : {};
    const students = await db(req).collection('students').find(query).sort({ studentName: 1 }).toArray().catch(() => []);

    // Today's boarding status, if recorded.
    const today = new Date().toISOString().slice(0, 10);
    const events = await db(req).collection('transport_pickups')
        .find({ at: { $gte: new Date(`${today}T00:00:00`) } }).toArray().catch(() => []);
    const statusById: Record<string, string> = {};
    events.forEach((e: any) => { statusById[String(e.studentId)] = e.type === 'drop' ? 'dropped' : 'boarded'; });

    res.json(students.map((s: any) => ({
        id: String(s._id),
        name: s.studentName || s.name,
        admissionNo: s.registrationNo || s.admNo || '',
        className: s.studentClass || s.currentClass || '',
        photoUrl: s.photo || s.image || null,
        pickupStop: s.pickupStop || s.transportZone || '',
        dropStop: s.dropStop || s.transportZone || '',
        parentName: s.parentName || s.fatherName || s.motherName || null,
        parentPhone: s.parentPhone || s.fatherPhone || s.motherPhone || null,
        medicalAlert: s.medicalAlert || null,
        status: statusById[String(s._id)] || 'waiting',
    })));
}));

const recordBoarding = async (req: Request, me: { name: string }, type: 'pickup' | 'drop') => {
    const { studentId } = req.body || {};
    const database = db(req);
    const student: any = studentId ? await database.collection('students').findOne({ _id: oid(studentId) as ObjectId }).catch(() => null) : null;
    await database.collection('transport_pickups').insertOne({
        studentId: String(studentId || ''),
        studentName: student?.studentName || student?.name || '',
        type, by: me.name, at: new Date(), createdAt: new Date(),
    });
};

router.post('/driver/students/board', authed(async (req, res, me) => {
    await recordBoarding(req, me, 'pickup');
    res.json({ ok: true });
}));

router.post('/driver/students/drop', authed(async (req, res, me) => {
    await recordBoarding(req, me, 'drop');
    res.json({ ok: true });
}));

// POST /driver/students/scan  { code } — resolve a scanned QR/adm number.
router.post('/driver/students/scan', authed(async (req, res) => {
    const code = String((req.body || {}).code || '').trim();
    if (!code) return res.status(400).json({ message: 'No code scanned' });
    const s: any = await db(req).collection('students').findOne({
        $or: [{ registrationNo: code }, { admNo: code }, { _id: oid(code) || undefined }],
    });
    if (!s) return res.status(404).json({ message: `No student matches "${code}"` });
    res.json({
        id: String(s._id),
        name: s.studentName || s.name,
        admissionNo: s.registrationNo || s.admNo || '',
        className: s.studentClass || s.currentClass || '',
        photoUrl: s.photo || s.image || null,
        pickupStop: s.pickupStop || s.transportZone || '',
        dropStop: s.dropStop || s.transportZone || '',
        parentName: s.parentName || null,
        parentPhone: s.parentPhone || s.fatherPhone || s.motherPhone || null,
        medicalAlert: s.medicalAlert || null,
        status: 'waiting',
    });
}));

// ════════════════════════════════════════════════════════════════════════════
//  SAFETY & OPS
// ════════════════════════════════════════════════════════════════════════════

router.post('/driver/sos', authed(async (req, res, me) => {
    const zones = await zonesForDriver(req, me);
    const zone: any = zones[0] || {};
    await db(req).collection('driver_sos').insertOne({
        driverId: me.id, driverName: me.name,
        busPlate: zone.busReg || zone.busName || '', routeName: zone.name || '',
        tripId: String((req.body || {}).tripId || ''),
        lat: Number((req.body || {}).lat || 0), lng: Number((req.body || {}).lng || 0),
        at: new Date(), createdAt: new Date(),
    });
    res.json({ ok: true, message: 'SOS alert received' });
}));

router.post('/driver/incident', authed(async (req, res, me) => {
    const b = req.body || {};
    await db(req).collection('driver_incidents').insertOne({
        driverId: me.id, driverName: me.name,
        type: b.type || 'Other', description: b.description || '',
        lat: b.lat ?? null, lng: b.lng ?? null,
        photo: b.photo || null,   // base64 — move to file/object storage for production
        at: new Date(), createdAt: new Date(),
    });
    res.json({ ok: true });
}));

router.post('/driver/inspection', authed(async (req, res, me) => {
    await db(req).collection('driver_inspections').insertOne({
        driverId: me.id, driverName: me.name,
        checks: (req.body || {}).checks || {},
        at: new Date(), createdAt: new Date(),
    });
    res.json({ ok: true });
}));

// GET /driver/notifications — announcements + driver-directed messages.
router.get('/driver/notifications', authed(async (req, res) => {
    const anns = await db(req).collection('announcements')
        .find({}).sort({ createdAt: -1 }).limit(30).toArray().catch(() => []);
    res.json(anns.map((a: any) => ({
        id: String(a._id),
        kind: 'announcement',
        title: a.title || 'Announcement',
        body: a.message || a.body || '',
        createdAt: a.createdAt || new Date(),
        read: false,
    })));
}));

// ════════════════════════════════════════════════════════════════════════════
//  ADMIN LIVE TRACKING  (school-admin authenticated via normal tenancy)
// ════════════════════════════════════════════════════════════════════════════
// These are consumed by the admin portal's Transport → Live Tracking page.
// "Online" = the bus reported a position within the last ONLINE_WINDOW ms.
const ONLINE_WINDOW_MS = 2 * 60 * 1000; // 2 minutes

// GET /transport/live/buses → every bus's latest position + online status + the
// driver/route it belongs to. Joins bus_positions (live) with transport_zones.
router.get('/transport/live/buses', async (req: Request, res: Response) => {
    try {
        const database = db(req);
        const [positions, zones, staff] = await Promise.all([
            database.collection('bus_positions').find({}).toArray().catch(() => []),
            database.collection('transport_zones').find({}).toArray().catch(() => []),
            database.collection('staff').find({}).toArray().catch(() => []),
        ]);
        const now = Date.now();
        const staffById: Record<string, any> = {};
        staff.forEach((s: any) => { staffById[String(s._id)] = s; });
        const posByBus: Record<string, any> = {};
        positions.forEach((p: any) => { posByBus[String(p.busId)] = p; });

        // One row per transport zone (= a bus/route). Attach live position if any.
        const rows = zones.map((z: any) => {
            // The driver app reports busId = the zone _id (see driver route/tracker).
            const pos = posByBus[String(z._id)] || posByBus[String(z.busId || '')] || null;
            const updatedAt = pos?.updatedAt ? new Date(pos.updatedAt).getTime() : (pos?.at ? new Date(pos.at).getTime() : 0);
            const online = updatedAt > 0 && (now - updatedAt) < ONLINE_WINDOW_MS;
            const driver = z.driverId ? staffById[String(z.driverId)] : null;
            return {
                busId: String(z._id),
                routeName: z.name || z.routeName || 'Route',
                busPlate: z.busReg || z.busNumber || z.busName || '',
                driverName: z.driver || (driver ? (driver.employeeName || driver.name) : '') || '',
                driverPhone: z.driverPhone || (driver ? driver.phone : '') || '',
                online,
                lastSeen: updatedAt ? new Date(updatedAt).toISOString() : null,
                lat: pos?.lat ?? null,
                lng: pos?.lng ?? null,
                speed: pos?.speed ?? null,      // m/s
                heading: pos?.heading ?? null,
                battery: pos?.battery ?? null,
                tripId: pos?.tripId || null,
            };
        });
        // Buses that have reported but aren't tied to a zone (defensive).
        const zoneIds = new Set(zones.map((z: any) => String(z._id)));
        positions.forEach((p: any) => {
            if (!zoneIds.has(String(p.busId))) {
                const updatedAt = p.updatedAt ? new Date(p.updatedAt).getTime() : (p.at ? new Date(p.at).getTime() : 0);
                rows.push({
                    busId: String(p.busId), routeName: 'Unassigned', busPlate: '', driverName: '', driverPhone: '',
                    online: updatedAt > 0 && (now - updatedAt) < ONLINE_WINDOW_MS,
                    lastSeen: updatedAt ? new Date(updatedAt).toISOString() : null,
                    lat: p.lat ?? null, lng: p.lng ?? null, speed: p.speed ?? null, heading: p.heading ?? null,
                    battery: p.battery ?? null, tripId: p.tripId || null,
                });
            }
        });
        res.json({ buses: rows, onlineWindowMs: ONLINE_WINDOW_MS, serverTime: new Date().toISOString() });
    } catch (e: any) {
        res.status(500).json({ message: e.message });
    }
});

// GET /transport/live/trail/:busId?limit=200 → the recent GPS trail for one bus,
// oldest→newest, for drawing the path and a location log.
router.get('/transport/live/trail/:busId', async (req: Request, res: Response) => {
    try {
        const busId = String(req.params.busId);
        const limit = Math.min(1000, Math.max(1, Number(req.query.limit) || 200));
        const rows = await db(req).collection('bus_locations')
            .find({ busId }).sort({ at: -1 }).limit(limit).toArray().catch(() => []);
        const trail = rows.reverse().map((r: any) => ({
            lat: r.lat, lng: r.lng, speed: r.speed ?? 0, heading: r.heading ?? 0,
            battery: r.battery ?? null, at: r.at,
        }));
        res.json({ busId, points: trail.length, trail });
    } catch (e: any) {
        res.status(500).json({ message: e.message });
    }
});

export default router;
