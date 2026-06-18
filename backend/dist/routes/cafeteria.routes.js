"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const mongodb_1 = require("mongodb");
const wallet_service_1 = require("../services/wallet.service");
const router = (0, express_1.Router)();
const getDb = (req) => req.tenantDb;
const today = () => new Date().toISOString().slice(0, 10);
// Resolve a scanned value: admission/reg no, portal username, or a WALLET code (SCW…/WAL-…).
const resolveStudent = async (db, code) => {
    const c = String(code || '').trim();
    if (!c)
        return null;
    let s = await db.collection('students').findOne({ $or: [{ registrationNo: c }, { admNo: c }, { portalUsername: c }, { studentId: c }] });
    if (s)
        return s;
    if (/^(SCW|WAL-)/i.test(c)) {
        const w = await db.collection('wallets').findOne({ code: { $regex: `^${c}$`, $options: 'i' } });
        if (w?.studentId) {
            try {
                s = await db.collection('students').findOne({ _id: new mongodb_1.ObjectId(w.studentId) });
            }
            catch { /* */ }
            if (s)
                return s;
        }
        // Deterministic fallback: SCW = SCW + last 6 of the student _id.
        const suffix = c.replace(/^(SCW|WAL-)/i, '').toLowerCase();
        if (suffix.length === 6) {
            const all = await db.collection('students').find({}, { projection: { _id: 1 } }).toArray();
            const hit = all.find((x) => String(x._id).slice(-6).toLowerCase() === suffix);
            if (hit)
                s = await db.collection('students').findOne({ _id: hit._id });
        }
    }
    return s;
};
const studentCard = async (db, s) => {
    const w = await (0, wallet_service_1.ensureWallet)(db, String(s._id)).catch(() => null);
    return {
        id: String(s._id), name: s.studentName || s.name,
        admissionNo: s.registrationNo || s.admNo || '',
        class: s.studentClass || '', boarding: s.boarding || s.residence || s.boardingStatus || 'Day Scholar',
        photo: s.photo || s.studentPhoto || s.avatar || s.image || null,
        walletCode: w?.code || `SCW${String(s._id).slice(-6).toUpperCase()}`,
        walletBalance: Number(w?.balance ?? s.walletBalance ?? 0),
    };
};
// ── Kitchen: look up a scanned student (no serve yet) ─────────────────────────
router.get('/cafeteria/student/:code', async (req, res) => {
    try {
        const db = getDb(req);
        const s = await resolveStudent(db, String(req.params.code).trim());
        if (!s)
            return res.status(404).json({ message: `No student found for "${req.params.code}"` });
        res.json(await studentCard(db, s));
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
});
// ── Kitchen: serve a meal (with food photo evidence) ──────────────────────────
router.post('/cafeteria/serve', async (req, res) => {
    try {
        const db = getDb(req);
        const { code, mealType = 'Lunch', photo, staffName } = req.body || {};
        const student = await resolveStudent(db, String(code || '').trim());
        if (!student)
            return res.status(404).json({ message: `No student found for "${code}"` });
        const date = today();
        const existing = await db.collection('meal_services').findOne({ studentId: String(student._id), date, mealType });
        if (existing)
            return res.status(400).json({ message: `${student.studentName} was already served ${mealType} today` });
        const doc = {
            studentId: String(student._id), studentName: student.studentName,
            admissionNo: student.registrationNo || student.admNo || '', studentClass: student.studentClass || '',
            boarding: student.boarding || student.residence || 'Day Scholar',
            mealType, date, time: new Date(), photo: photo || null, staffName: staffName || 'Kitchen Staff', createdAt: new Date(),
        };
        await db.collection('meal_services').insertOne(doc);
        res.status(201).json({ ...doc, student: await studentCard(db, student) });
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
});
// ── Kitchen: today's meal counts + recent ─────────────────────────────────────
router.get('/cafeteria/meals/today', async (req, res) => {
    try {
        const db = getDb(req);
        const rows = await db.collection('meal_services').find({ date: today() }).sort({ time: -1 }).toArray();
        const c = (t) => rows.filter((r) => r.mealType === t).length;
        const totalStudents = await db.collection('students').countDocuments({});
        res.json({ breakfast: c('Breakfast'), lunch: c('Lunch'), supper: c('Supper'), served: rows.length, pending: Math.max(0, totalStudents - new Set(rows.map((r) => r.studentId)).size), rows: rows.slice(0, 60) });
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
});
// ── Kitchen: students who did NOT take a meal ─────────────────────────────────
// Query: ?date=YYYY-MM-DD&mealType=Breakfast|Lunch|Supper|none
//   mealType = a specific meal → students not served THAT meal that day.
//   mealType = "none" (or "any"/blank) → students who took NO meal at all that day.
router.get('/cafeteria/meals/missed', async (req, res) => {
    try {
        const db = getDb(req);
        const date = String(req.query.date || today());
        const mealType = String(req.query.mealType || 'none');
        const q = String(req.query.q || '').trim();
        // Served records for the day (optionally narrowed to one meal type).
        const servedFilter = { date };
        if (mealType && !['none', 'any', 'all', ''].includes(mealType.toLowerCase()))
            servedFilter.mealType = mealType;
        const served = await db.collection('meal_services').find(servedFilter).toArray();
        const servedIds = new Set(served.map((r) => String(r.studentId)));
        // All students (optionally search-filtered) minus those served.
        const sFilter = {};
        if (q)
            sFilter.$or = [
                { studentName: { $regex: q, $options: 'i' } },
                { registrationNo: { $regex: q, $options: 'i' } },
                { admNo: { $regex: q, $options: 'i' } },
                { studentClass: { $regex: q, $options: 'i' } },
            ];
        const students = await db.collection('students').find(sFilter).sort({ studentName: 1 }).toArray();
        const missed = students
            .filter((s) => !servedIds.has(String(s._id)))
            .map((s) => ({
            _id: String(s._id),
            studentName: s.studentName || `${s.firstName || ''} ${s.lastName || ''}`.trim(),
            admissionNo: s.registrationNo || s.admNo || '',
            studentClass: s.studentClass || s.currentClass || '',
            boarding: s.boarding || s.residence || 'Day Scholar',
        }));
        res.json({
            date, mealType,
            totalStudents: students.length,
            servedCount: servedIds.size,
            missedCount: missed.length,
            missed,
        });
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
});
// ── Kitchen: meal history ─────────────────────────────────────────────────────
router.get('/cafeteria/meals', async (req, res) => {
    try {
        const db = getDb(req);
        const { date, mealType, q } = req.query;
        const filter = {};
        if (date)
            filter.date = date;
        if (mealType)
            filter.mealType = mealType;
        if (q)
            filter.$or = [{ studentName: { $regex: String(q), $options: 'i' } }, { admissionNo: { $regex: String(q), $options: 'i' } }];
        const rows = await db.collection('meal_services').find(filter).sort({ time: -1 }).limit(300).toArray();
        res.json(rows);
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
});
// ── Canteen settings (Included in Fees / Wallet / Both) ───────────────────────
router.get('/canteen/settings', async (req, res) => {
    try {
        const s = await getDb(req).collection('canteen_settings').findOne({});
        res.json({ mode: s?.mode || 'wallet' });
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
});
router.post('/canteen/settings', async (req, res) => {
    try {
        await getDb(req).collection('canteen_settings').updateOne({}, { $set: { mode: req.body?.mode || 'wallet', updatedAt: new Date() } }, { upsert: true });
        res.json({ ok: true });
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
});
// ── Canteen: quick sale (wallet deduction / fees) ─────────────────────────────
router.post('/canteen/sale', async (req, res) => {
    try {
        const db = getDb(req);
        const { code, items = [], paymentMode } = req.body || {};
        if (!Array.isArray(items) || !items.length)
            return res.status(400).json({ message: 'No items in the sale' });
        const total = items.reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.qty) || 1), 0);
        const student = code ? await resolveStudent(db, String(code).trim()) : null;
        const settings = await db.collection('canteen_settings').findOne({});
        const mode = (paymentMode || settings?.mode || 'wallet').toLowerCase();
        let newBalance = null;
        if (mode === 'wallet') {
            if (!student)
                return res.status(400).json({ message: 'Scan a student card for wallet payment' });
            const itemList = items.map((i) => `${i.name}×${i.qty}`).join(', ');
            const w = await (0, wallet_service_1.debitWallet)(db, String(student._id), total, { category: 'Canteen', description: `Canteen: ${itemList}`, reference: `CSALE-${Date.now().toString().slice(-7)}` });
            newBalance = Number(w.balance);
        }
        // mode "fees" / "included" → no deduction, just recorded against the student
        const doc = {
            orderNo: `CSALE-${Date.now().toString().slice(-7)}`,
            studentId: student ? String(student._id) : null, studentName: student?.studentName || 'Walk-in',
            admissionNo: student?.registrationNo || student?.admNo || '',
            items, total, paymentMode: mode, date: today(), createdAt: new Date(),
        };
        await db.collection('canteen_sales').insertOne(doc);
        for (const it of items) {
            if (it.productId && mongodb_1.ObjectId.isValid(it.productId))
                await db.collection('pos_products').updateOne({ _id: new mongodb_1.ObjectId(it.productId) }, { $inc: { stock: -(Number(it.qty) || 1) } }).catch(() => { });
        }
        res.status(201).json({ ...doc, newBalance });
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
});
// ── Canteen: today stats + transactions ───────────────────────────────────────
router.get('/canteen/sales/today', async (req, res) => {
    try {
        const db = getDb(req);
        const rows = await db.collection('canteen_sales').find({ date: today() }).sort({ createdAt: -1 }).toArray();
        const totalSales = rows.reduce((s, r) => s + (r.total || 0), 0);
        const itemCounts = {};
        rows.forEach((r) => (r.items || []).forEach((i) => { itemCounts[i.name] = (itemCounts[i.name] || 0) + (Number(i.qty) || 1); }));
        const topItems = Object.entries(itemCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, qty]) => ({ name, qty }));
        const wallet = rows.filter((r) => r.paymentMode === 'wallet').reduce((s, r) => s + (r.total || 0), 0);
        res.json({ totalSales, count: rows.length, students: new Set(rows.map((r) => r.studentId).filter(Boolean)).size, wallet, topItems, rows: rows.slice(0, 60) });
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
});
router.get('/canteen/sales', async (req, res) => {
    try {
        const rows = await getDb(req).collection('canteen_sales').find({}).sort({ createdAt: -1 }).limit(300).toArray();
        res.json(rows);
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
});
// ── Foods (dishes that can be served) ─────────────────────────────────────────
router.get('/cafeteria/foods', async (req, res) => {
    try {
        res.json(await getDb(req).collection('cafeteria_foods').find({}).sort({ name: 1 }).toArray());
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
});
router.post('/cafeteria/foods', async (req, res) => {
    try {
        const db = getDb(req);
        const name = String(req.body?.name || '').trim();
        if (!name)
            return res.status(400).json({ message: 'Food name is required' });
        const category = req.body?.category || 'Main';
        const r = await db.collection('cafeteria_foods').insertOne({ name, category, createdAt: new Date() });
        res.status(201).json({ _id: r.insertedId, name, category });
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
});
router.delete('/cafeteria/foods/:id', async (req, res) => {
    try {
        await getDb(req).collection('cafeteria_foods').deleteOne({ _id: new mongodb_1.ObjectId(req.params.id) });
        res.json({ ok: true });
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
});
// ── Weekly meal timetable (the plan the kitchen serves from) ──────────────────
router.get('/cafeteria/menu', async (req, res) => {
    try {
        const d = await getDb(req).collection('cafeteria_menu').findOne({});
        res.json({ plan: d?.plan || {} });
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
});
router.post('/cafeteria/menu', async (req, res) => {
    try {
        await getDb(req).collection('cafeteria_menu').updateOne({}, { $set: { plan: req.body?.plan || {}, updatedAt: new Date() } }, { upsert: true });
        res.json({ ok: true });
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
});
exports.default = router;
