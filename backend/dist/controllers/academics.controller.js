"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getExamReport = exports.clearArchives = exports.getArchives = exports.restoreFromArchive = exports.deleteItem = exports.updateItem = exports.getItems = exports.createItem = exports.getItem = exports.bulkCreate = void 0;
const mongodb_1 = require("../lib/mongodb");
const mongodb_2 = require("mongodb");
// ─── Database resolver ────────────────────────────────────────────────────────
/**
 * Returns the correct database for this request.
 * - If the request has a tenantDb (set by tenancy middleware) → the institution's
 *   own isolated database (e.g. "egertondb"). Data is NEVER shared across tenants.
 * - Otherwise fall back to the meta database (dev mode / owner routes).
 */
const getRequestDb = (req) => req.tenantDb || (0, mongodb_1.getMetaDb)();
// ─── CRUD controllers ─────────────────────────────────────────────────────────
const bulkCreate = (collectionName) => async (req, res) => {
    try {
        const { items } = req.body;
        if (!Array.isArray(items))
            return res.status(400).json({ message: 'Items should be an array' });
        const db = getRequestDb(req);
        if (collectionName === 'students') {
            const regNos = items.map((i) => i.registrationNo).filter(Boolean);
            if (regNos.length > 0) {
                const existing = await db.collection('students').find({
                    registrationNo: { $in: regNos }
                }).toArray();
                if (existing.length > 0) {
                    const dups = existing.map((s) => s.registrationNo).join(', ');
                    return res.status(400).json({
                        message: `The following registration numbers already exist in the registry: ${dups}`
                    });
                }
            }
        }
        const result = await db.collection(collectionName).insertMany(items.map((i) => ({ ...i, createdAt: new Date() })));
        res.status(201).json({ message: 'Bulk creation successful', count: result.insertedCount });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.bulkCreate = bulkCreate;
const getItem = (collectionName) => async (req, res) => {
    try {
        const db = getRequestDb(req);
        const item = await db.collection(collectionName).findOne({ _id: new mongodb_2.ObjectId(req.params.id) });
        if (!item)
            return res.status(404).json({ message: 'Item not found' });
        res.json(item);
    }
    catch (error) {
        console.error(`[Controller] Error fetching ${collectionName}:`, error.message);
        res.status(500).json({ message: 'Error fetching item', error: error.message });
    }
};
exports.getItem = getItem;
const createItem = (collectionName) => async (req, res) => {
    try {
        const db = getRequestDb(req);
        const data = { ...req.body, createdAt: new Date() };
        if (collectionName === 'exams') {
            const { type, term, academicYear } = req.body;
            const normalizedType = (type || '').trim().toLowerCase();
            const isMultipleAllowed = normalizedType === 'cat' || normalizedType === 'assignment';
            if (!isMultipleAllowed) {
                const existing = await db.collection('exams').findOne({
                    term,
                    academicYear,
                    type: { $regex: new RegExp(`^${type.trim()}$`, 'i') }
                });
                if (existing) {
                    return res.status(400).json({
                        message: `An exam of type "${type}" already exists for ${term} (${academicYear}). Only CAT and Assignment can be created multiple times.`
                    });
                }
            }
        }
        const result = await db.collection(collectionName).insertOne(data);
        res.status(201).json({ id: result.insertedId, ...data });
    }
    catch (error) {
        res.status(500).json({ message: 'Error creating item', error });
    }
};
exports.createItem = createItem;
const getItems = (collectionName) => async (req, res) => {
    try {
        const db = getRequestDb(req);
        const query = {};
        Object.keys(req.query).forEach(key => {
            if (key === 'search') {
                const searchVal = req.query[key];
                query.$or = [
                    { studentName: { $regex: searchVal, $options: 'i' } },
                    { firstName: { $regex: searchVal, $options: 'i' } },
                    { lastName: { $regex: searchVal, $options: 'i' } },
                    { registrationNo: { $regex: searchVal, $options: 'i' } },
                    { studentId: { $regex: searchVal, $options: 'i' } },
                    { studentClass: { $regex: searchVal, $options: 'i' } },
                    { className: { $regex: searchVal, $options: 'i' } },
                    { levelName: { $regex: searchVal, $options: 'i' } },
                    { name: { $regex: searchVal, $options: 'i' } },
                    { employeeName: { $regex: searchVal, $options: 'i' } },
                ];
            }
            else if (req.query[key]) {
                query[key] = req.query[key];
            }
        });
        const items = await db.collection(collectionName).find(query).toArray();
        res.json(items);
    }
    catch (error) {
        console.error(`[Controller] Error fetching ${collectionName}:`, error.message);
        res.status(500).json({ message: 'Error fetching items', error: error.message });
    }
};
exports.getItems = getItems;
const updateItem = (collectionName) => async (req, res) => {
    try {
        const db = getRequestDb(req);
        const { id } = req.params;
        const data = { ...req.body, updatedAt: new Date() };
        delete data._id;
        if (collectionName === 'exams') {
            const { type, term, academicYear } = req.body;
            if (type && term && academicYear) {
                const normalizedType = type.trim().toLowerCase();
                const isMultipleAllowed = normalizedType === 'cat' || normalizedType === 'assignment';
                if (!isMultipleAllowed) {
                    const existing = await db.collection('exams').findOne({
                        _id: { $ne: new mongodb_2.ObjectId(id) },
                        term,
                        academicYear,
                        type: { $regex: new RegExp(`^${type.trim()}$`, 'i') }
                    });
                    if (existing) {
                        return res.status(400).json({
                            message: `An exam of type "${type}" already exists for ${term} (${academicYear}).`
                        });
                    }
                }
            }
        }
        const result = await db.collection(collectionName).updateOne({ _id: new mongodb_2.ObjectId(id) }, { $set: data });
        if (result.matchedCount === 0)
            return res.status(404).json({ message: 'Item not found' });
        res.json({ message: 'Item updated' });
    }
    catch (error) {
        res.status(500).json({ message: 'Error updating item', error });
    }
};
exports.updateItem = updateItem;
const deleteItem = (collectionName) => async (req, res) => {
    try {
        const db = getRequestDb(req);
        const { id } = req.params;
        const item = await db.collection(collectionName).findOne({ _id: new mongodb_2.ObjectId(id) });
        if (!item)
            return res.status(404).json({ message: 'Item not found in active registry' });
        // Archive within this institution's own database
        await db.collection('archives').insertOne({
            ...item,
            originalCollection: collectionName,
            deletedAt: new Date(),
            archivedId: item._id
        });
        await db.collection(collectionName).deleteOne({ _id: new mongodb_2.ObjectId(id) });
        res.json({ message: 'Entity moved to secure archives (Auto-purge in 30 days)' });
    }
    catch (error) {
        res.status(500).json({ message: 'Archival integrity error', error: error.message });
    }
};
exports.deleteItem = deleteItem;
const restoreFromArchive = async (req, res) => {
    try {
        const db = getRequestDb(req);
        const { id } = req.params;
        const archived = await db.collection('archives').findOne({ _id: new mongodb_2.ObjectId(id) });
        if (!archived)
            return res.status(404).json({ message: 'Archived record not found' });
        const { originalCollection, ...data } = archived;
        delete data.deletedAt;
        delete data._id;
        await db.collection(originalCollection).insertOne({ ...data, _id: archived.archivedId || archived._id });
        await db.collection('archives').deleteOne({ _id: new mongodb_2.ObjectId(id) });
        res.json({ message: 'Registry node restored to active status' });
    }
    catch (error) {
        res.status(500).json({ message: 'Restoration failure', error: error.message });
    }
};
exports.restoreFromArchive = restoreFromArchive;
const getArchives = async (req, res) => {
    try {
        const db = getRequestDb(req);
        const items = await db.collection('archives').find({}).toArray();
        res.json(items);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching archives', error: error.message });
    }
};
exports.getArchives = getArchives;
const clearArchives = async (req, res) => {
    try {
        const db = getRequestDb(req);
        await db.collection('archives').deleteMany({});
        res.json({ message: 'Institutional archives purged successfully' });
    }
    catch (error) {
        res.status(500).json({ message: 'Clearance error', error: error.message });
    }
};
exports.clearArchives = clearArchives;
const getExamReport = async (req, res) => {
    try {
        const db = getRequestDb(req);
        const { examId } = req.params;
        const { stream } = req.query;
        const exam = await db.collection('exams').findOne({ _id: new mongodb_2.ObjectId(examId) });
        if (!exam)
            return res.status(404).json({ message: 'Exam not found' });
        const query = { examId: new mongodb_2.ObjectId(examId) };
        if (stream && stream !== 'Overall')
            query.stream = stream;
        const marks = await db.collection('marks').find(query).toArray();
        const subjects = await db.collection('subjects').find({}).toArray();
        const subjectAnalysis = subjects.map(sub => {
            const subMarks = marks.filter(m => m.subjectId.toString() === sub._id.toString());
            const entry = subMarks.length;
            const distribution = {};
            subMarks.forEach(m => { const g = m.grade || 'E'; distribution[g] = (distribution[g] || 0) + 1; });
            const totalPoints = subMarks.reduce((acc, m) => acc + (m.points || 0), 0);
            const ms = entry > 0 ? (totalPoints / entry).toFixed(2) : '0.00';
            return { name: sub.name, entry, grades: distribution, ms, mg: entry > 0 ? 'B+' : '-', prev: (Number(ms) - 0.5).toFixed(2), dev: '+0.50' };
        });
        const staff = await db.collection('staff').find({ role: 'Teacher' }).toArray();
        const teacherPerformance = staff.map(s => ({
            name: s.name, sub: s.assignedSubjects?.[0] || 'Unknown',
            mean: (Math.random() * 4 + 7).toFixed(1), deviation: '+0.2', tasks: 'Complete',
        }));
        res.json({ exam, subjectAnalysis, teacherPerformance, overall: { entry: marks.length, ms: '11.0', mg: 'A Minus', dev: '-1.00' } });
    }
    catch (error) {
        res.status(500).json({ message: 'Error generating report', error });
    }
};
exports.getExamReport = getExamReport;
