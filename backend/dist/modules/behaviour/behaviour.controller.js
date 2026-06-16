"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BehaviourController = void 0;
const mongodb_1 = require("../../lib/mongodb");
const mongodb_2 = require("mongodb");
const getRequestDb = (req) => req.tenantDb || (0, mongodb_1.getMetaDb)();
const getTenancyQuery = (req) => {
    const tenantId = req.tenantContext?.tenantId || req.tenant?._id;
    if (!tenantId)
        throw new Error("Tenant context missing");
    return { tenantId: new mongodb_2.ObjectId(tenantId) };
};
const getStudentsInClass = async (db, classIdStr) => {
    let className = '';
    if (mongodb_2.ObjectId.isValid(classIdStr)) {
        const classDoc = await db.collection('classes').findOne({ _id: new mongodb_2.ObjectId(classIdStr) });
        if (classDoc) {
            className = classDoc.levelName || classDoc.name;
        }
    }
    const classFilters = [];
    if (classIdStr) {
        classFilters.push({ classId: classIdStr });
        if (mongodb_2.ObjectId.isValid(classIdStr)) {
            classFilters.push({ classId: new mongodb_2.ObjectId(classIdStr) });
        }
    }
    if (className) {
        classFilters.push({ studentClass: className });
        classFilters.push({ studentClass: { $regex: new RegExp(`^${className}$`, 'i') } });
    }
    const studentQuery = {};
    if (classFilters.length > 0) {
        studentQuery.$or = classFilters;
    }
    return await db.collection('students').find(studentQuery).toArray();
};
// Map rating 1-5 to default letter grade
const mapRatingToGrade = (rating, scaleType) => {
    if (scaleType === 'LETTER_5') {
        const mapping = { 5: 'A+', 4: 'A', 3: 'B', 2: 'C', 1: 'D' };
        return mapping[rating] || 'D';
    }
    return rating.toString();
};
class BehaviourController {
    // --- RATING SCALE ---
    static async getRatingScale(req, res) {
        try {
            const db = getRequestDb(req);
            const query = getTenancyQuery(req);
            let scale = await db.collection('rating_scales').findOne(query);
            if (!scale) {
                scale = {
                    ...query,
                    type: 'NUMERIC_5',
                    mappings: [
                        { rating: 5, grade: '5', label: 'Excellent' },
                        { rating: 4, grade: '4', label: 'Very Good' },
                        { rating: 3, grade: '3', label: 'Good' },
                        { rating: 2, grade: '2', label: 'Fair' },
                        { rating: 1, grade: '1', label: 'Weak' }
                    ]
                };
                await db.collection('rating_scales').insertOne(scale);
            }
            res.json({ data: scale });
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    static async updateRatingScale(req, res) {
        try {
            const db = getRequestDb(req);
            const query = getTenancyQuery(req);
            const { type, mappings } = req.body;
            await db.collection('rating_scales').updateOne(query, { $set: { type, mappings } }, { upsert: true });
            res.json({ message: "Rating scale updated" });
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    // --- BEHAVIOUR TRAITS CONFIG ---
    static async getTraits(req, res) {
        try {
            const db = getRequestDb(req);
            const query = { ...getTenancyQuery(req) };
            if (req.query.domain)
                query['domain'] = req.query.domain;
            const traits = await db.collection('behaviour_traits').find(query).sort({ order: 1 }).toArray();
            // Seed if empty
            if (traits.length === 0 && !req.query.domain) {
                const seed = [
                    { ...query, name: "Punctuality", domain: "AFFECTIVE", category: "Conduct", order: 1, is_active: true },
                    { ...query, name: "Cooperation", domain: "AFFECTIVE", category: "Social", order: 2, is_active: true },
                    { ...query, name: "Honesty", domain: "AFFECTIVE", category: "Conduct", order: 3, is_active: true },
                    { ...query, name: "Handwriting", domain: "PSYCHOMOTOR", category: "Creative", order: 4, is_active: true },
                    { ...query, name: "Games & Sports", domain: "PSYCHOMOTOR", category: "Sports", order: 5, is_active: true },
                    { ...query, name: "Musical Talent", domain: "PSYCHOMOTOR", category: "Arts", order: 6, is_active: true }
                ];
                await db.collection('behaviour_traits').insertMany(seed);
                const freshTraits = await db.collection('behaviour_traits').find(query).sort({ order: 1 }).toArray();
                return res.json({ data: freshTraits });
            }
            res.json({ data: traits });
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    static async createTrait(req, res) {
        try {
            const db = getRequestDb(req);
            const query = getTenancyQuery(req);
            const payload = { ...req.body, ...query, order: Number(req.body.order || 0), is_active: true };
            const result = await db.collection('behaviour_traits').insertOne(payload);
            res.json({ data: { _id: result.insertedId, ...payload } });
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    static async updateTrait(req, res) {
        try {
            const db = getRequestDb(req);
            const { id } = req.params;
            const query = { ...getTenancyQuery(req), _id: new mongodb_2.ObjectId(id) };
            await db.collection('behaviour_traits').updateOne(query, { $set: req.body });
            res.json({ message: "Trait updated" });
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    static async deleteTrait(req, res) {
        try {
            const db = getRequestDb(req);
            const { id } = req.params;
            const query = { ...getTenancyQuery(req), _id: new mongodb_2.ObjectId(id) };
            await db.collection('behaviour_traits').deleteOne(query);
            res.json({ message: "Trait deleted" });
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    // --- BEHAVIOUR RATINGS ---
    static async getRatings(req, res) {
        try {
            const db = getRequestDb(req);
            const tenantQuery = getTenancyQuery(req);
            const { class_id, academic_year_id, semester_id, domain } = req.query;
            if (!class_id || !academic_year_id || !semester_id || !domain) {
                return res.status(400).json({ error: "Missing query filters" });
            }
            // Fetch students
            const students = await getStudentsInClass(db, class_id);
            // Fetch active traits for domain
            const traits = await db.collection('behaviour_traits').find({
                ...tenantQuery,
                domain: domain,
                is_active: true
            }).toArray();
            // Fetch ratings
            const ratings = await db.collection('behaviour_ratings').find({
                ...tenantQuery,
                class_id: new mongodb_2.ObjectId(class_id),
                academic_year_id: academic_year_id,
                semester_id: semester_id
            }).toArray();
            const ratingsMap = new Map();
            ratings.forEach((r) => {
                const key = `${r.student_id.toString()}_${r.trait_id.toString()}`;
                ratingsMap.set(key, r);
            });
            const data = students.map((student) => {
                const studentRatings = {};
                traits.forEach((trait) => {
                    const key = `${student._id.toString()}_${trait._id.toString()}`;
                    const r = ratingsMap.get(key);
                    studentRatings[trait._id.toString()] = r ? { rating: r.rating, grade: r.grade } : null;
                });
                return {
                    student_id: student._id,
                    student_name: student.studentName || student.name || `${student.firstName || ''} ${student.lastName || ''}`.trim() || 'Student',
                    admission_no: student.registrationNo || student.admissionNo || student.admNo || '',
                    ratings: studentRatings
                };
            });
            res.json({ data });
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    static async bulkUpsertRatings(req, res) {
        try {
            const db = getRequestDb(req);
            const tenantQuery = getTenancyQuery(req);
            const { academic_year_id, semester_id, class_id, records } = req.body;
            const scaleDoc = await db.collection('rating_scales').findOne(tenantQuery);
            const scaleType = scaleDoc?.type || 'NUMERIC_5';
            let saved = 0;
            let updated = 0;
            for (const record of records) {
                for (const tr of record.trait_ratings) {
                    const rating = Number(tr.rating);
                    if (rating < 1 || rating > 5) {
                        return res.status(422).json({ error: "Rating must be 1–5 range", code: "INVALID_RATING" });
                    }
                    const grade = mapRatingToGrade(rating, scaleType);
                    const query = {
                        ...tenantQuery,
                        student_id: new mongodb_2.ObjectId(record.student_id),
                        class_id: new mongodb_2.ObjectId(class_id),
                        trait_id: new mongodb_2.ObjectId(tr.trait_id),
                        academic_year_id,
                        semester_id
                    };
                    const updatePayload = {
                        $set: {
                            rating,
                            grade,
                            updated_at: new Date()
                        },
                        $setOnInsert: {
                            marked_at: new Date()
                        }
                    };
                    const result = await db.collection('behaviour_ratings').updateOne(query, updatePayload, { upsert: true });
                    if (result.upsertedCount > 0)
                        saved++;
                    else if (result.modifiedCount > 0)
                        updated++;
                }
            }
            res.json({ data: { saved, updated, errors: [] } });
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    // --- OBSERVATIONS ---
    static async getObservations(req, res) {
        try {
            const db = getRequestDb(req);
            const tenantQuery = getTenancyQuery(req);
            const { class_id, academic_year_id, semester_id } = req.query;
            const students = await getStudentsInClass(db, class_id);
            const obsList = await db.collection('student_observations').find({
                ...tenantQuery,
                class_id: new mongodb_2.ObjectId(class_id),
                academic_year_id: academic_year_id,
                semester_id: semester_id
            }).toArray();
            const obsMap = new Map(obsList.map((o) => [o.student_id.toString(), o]));
            const data = students.map((student) => {
                const obs = obsMap.get(student._id.toString());
                return {
                    student_id: student._id,
                    student_name: student.studentName || student.name || `${student.firstName || ''} ${student.lastName || ''}`.trim() || 'Student',
                    admission_no: student.registrationNo || student.admissionNo || student.admNo || '',
                    class_teacher_remark: obs?.class_teacher_remark || '',
                    counsellor_note: obs?.counsellor_note || '',
                    principal_remark: obs?.principal_remark || '',
                    updated_at: obs?.updated_at || null
                };
            });
            res.json({ data });
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    static async bulkUpsertObservations(req, res) {
        try {
            const db = getRequestDb(req);
            const tenantQuery = getTenancyQuery(req);
            const { academic_year_id, semester_id, class_id, records } = req.body;
            for (const record of records) {
                const query = {
                    ...tenantQuery,
                    student_id: new mongodb_2.ObjectId(record.student_id),
                    class_id: new mongodb_2.ObjectId(class_id),
                    academic_year_id,
                    semester_id
                };
                const updatePayload = {
                    $set: {
                        class_teacher_remark: record.class_teacher_remark || '',
                        counsellor_note: record.counsellor_note || '',
                        principal_remark: record.principal_remark || '',
                        updated_at: new Date()
                    }
                };
                await db.collection('student_observations').updateOne(query, updatePayload, { upsert: true });
            }
            res.json({ message: "Observations saved successfully" });
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    // --- OBSERVATION PHRASES ---
    static async getPhrases(req, res) {
        try {
            const db = getRequestDb(req);
            const query = getTenancyQuery(req);
            const phrases = await db.collection('observation_phrases').find(query).toArray();
            if (phrases.length === 0) {
                const seed = [
                    { ...query, text: "Excellent conduct throughout the term" },
                    { ...query, text: "Needs improvement in punctuality" },
                    { ...query, text: "Shows great leadership qualities" }
                ];
                await db.collection('observation_phrases').insertMany(seed);
                const fresh = await db.collection('observation_phrases').find(query).toArray();
                return res.json({ data: fresh });
            }
            res.json({ data: phrases });
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    static async createPhrase(req, res) {
        try {
            const db = getRequestDb(req);
            const query = getTenancyQuery(req);
            const result = await db.collection('observation_phrases').insertOne({
                ...query,
                text: req.body.text
            });
            res.json({ data: { _id: result.insertedId, text: req.body.text } });
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    static async deletePhrase(req, res) {
        try {
            const db = getRequestDb(req);
            const { id } = req.params;
            const query = { ...getTenancyQuery(req), _id: new mongodb_2.ObjectId(id) };
            await db.collection('observation_phrases').deleteOne(query);
            res.json({ message: "Phrase deleted" });
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    // --- REPORTS ---
    static async getDomainReport(req, res) {
        try {
            const db = getRequestDb(req);
            const tenantQuery = getTenancyQuery(req);
            const { class_id, academic_year_id, semester_id, domain } = req.query;
            const students = await getStudentsInClass(db, class_id);
            const traits = await db.collection('behaviour_traits').find({
                ...tenantQuery,
                domain: domain,
                is_active: true
            }).toArray();
            const ratings = await db.collection('behaviour_ratings').find({
                ...tenantQuery,
                class_id: new mongodb_2.ObjectId(class_id),
                academic_year_id: academic_year_id,
                semester_id: semester_id
            }).toArray();
            const ratingsMap = new Map();
            ratings.forEach((r) => {
                const key = `${r.student_id.toString()}_${r.trait_id.toString()}`;
                ratingsMap.set(key, r);
            });
            let sumTotalRatings = 0;
            let ratingCount = 0;
            const studentsReport = students.map((student) => {
                const studentRatings = {};
                let studentSum = 0;
                let studentCount = 0;
                traits.forEach((trait) => {
                    const key = `${student._id.toString()}_${trait._id.toString()}`;
                    const r = ratingsMap.get(key);
                    if (r) {
                        studentRatings[trait._id.toString()] = { rating: r.rating, grade: r.grade };
                        studentSum += r.rating;
                        studentCount++;
                        sumTotalRatings += r.rating;
                        ratingCount++;
                    }
                    else {
                        studentRatings[trait._id.toString()] = null;
                    }
                });
                const average_rating = studentCount > 0 ? Number((studentSum / studentCount).toFixed(1)) : 0;
                let overall_grade = '—';
                if (average_rating > 0) {
                    if (average_rating >= 4.5)
                        overall_grade = 'Excellent';
                    else if (average_rating >= 3.5)
                        overall_grade = 'Very Good';
                    else if (average_rating >= 2.5)
                        overall_grade = 'Good';
                    else if (average_rating >= 1.5)
                        overall_grade = 'Fair';
                    else
                        overall_grade = 'Weak';
                }
                return {
                    student_id: student._id,
                    student_name: student.studentName || student.name || `${student.firstName || ''} ${student.lastName || ''}`.trim() || 'Student',
                    admission_no: student.registrationNo || student.admissionNo || student.admNo || '',
                    ratings: studentRatings,
                    average_rating,
                    overall_grade
                };
            });
            // Find best behaved student
            const sortedByAvg = [...studentsReport].sort((a, b) => b.average_rating - a.average_rating);
            const best_student = sortedByAvg[0] && sortedByAvg[0].average_rating > 0
                ? { student_name: sortedByAvg[0].student_name, avg_rating: sortedByAvg[0].average_rating }
                : null;
            const class_avg_rating = ratingCount > 0 ? Number((sumTotalRatings / ratingCount).toFixed(1)) : 0;
            res.json({
                data: {
                    summary: {
                        best_student,
                        class_avg_rating,
                        students_rated: studentsReport.filter((s) => s.average_rating > 0).length,
                        total_students: students.length,
                        most_common_rating: { label: 'Very Good', count: ratingCount }
                    },
                    traits,
                    students: studentsReport
                }
            });
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}
exports.BehaviourController = BehaviourController;
