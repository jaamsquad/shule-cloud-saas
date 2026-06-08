"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClassTestsController = void 0;
const mongodb_1 = require("../../lib/mongodb");
const mongodb_2 = require("mongodb");
const getRequestDb = (req) => req.tenantDb || (0, mongodb_1.getMetaDb)();
// Helper to get db & ensure tenancy
const getTenancyQuery = (req) => {
    const tenantId = req.tenantContext?.tenantId || req.tenant?._id;
    if (!tenantId)
        throw new Error("Tenant context missing");
    return { tenantId: new mongodb_2.ObjectId(tenantId) };
};
// Default grading scale
const DEFAULT_GRADING_SCALE = [
    { min_percent: 90, max_percent: 100, grade: "A+", label: "Excellent", points: 5.0 },
    { min_percent: 80, max_percent: 89, grade: "A", label: "Very Good", points: 4.0 },
    { min_percent: 70, max_percent: 79, grade: "B", label: "Good", points: 3.0 },
    { min_percent: 60, max_percent: 69, grade: "C", label: "Fair", points: 2.0 },
    { min_percent: 50, max_percent: 59, grade: "D", label: "Pass", points: 1.0 },
    { min_percent: 0, max_percent: 49, grade: "F", label: "Fail", points: 0.0 }
];
const calculateGrade = async (db, tenantId, percentage) => {
    const scaleDoc = await db.collection('grading_scales').findOne({ tenantId });
    const scales = scaleDoc?.scales || DEFAULT_GRADING_SCALE;
    const match = scales.find((s) => percentage >= s.min_percent && percentage <= s.max_percent);
    return match ? match.grade : "F";
};
class ClassTestsController {
    // --- GRADING SCALE ---
    static async getGradingScale(req, res) {
        try {
            const db = getRequestDb(req);
            const query = getTenancyQuery(req);
            let scale = await db.collection('grading_scales').findOne(query);
            if (!scale) {
                scale = { ...query, scales: DEFAULT_GRADING_SCALE };
                await db.collection('grading_scales').insertOne(scale);
            }
            res.json({ data: scale });
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    static async updateGradingScale(req, res) {
        try {
            const db = getRequestDb(req);
            const query = getTenancyQuery(req);
            const { scales } = req.body;
            await db.collection('grading_scales').updateOne(query, { $set: { scales } }, { upsert: true });
            res.json({ message: "Grading scale updated successfully" });
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    // --- CLASS TESTS ---
    static async getTests(req, res) {
        try {
            const db = getRequestDb(req);
            const query = { ...getTenancyQuery(req) };
            if (req.query.class_id)
                query['class_id'] = req.query.class_id;
            if (req.query.subject_id)
                query['subject_id'] = req.query.subject_id;
            if (req.query.academic_year_id)
                query['academic_year_id'] = req.query.academic_year_id;
            if (req.query.semester_id)
                query['semester_id'] = req.query.semester_id;
            const tests = await db.collection('class_tests').find(query).sort({ date: -1 }).toArray();
            res.json({ data: tests });
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    static async createTest(req, res) {
        try {
            const db = getRequestDb(req);
            const query = getTenancyQuery(req);
            const payload = {
                ...req.body,
                ...query,
                total_marks: Number(req.body.total_marks),
                created_at: new Date()
            };
            const result = await db.collection('class_tests').insertOne(payload);
            res.json({ data: { _id: result.insertedId, ...payload } });
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    static async getTestDetail(req, res) {
        try {
            const db = getRequestDb(req);
            const { id } = req.params;
            const query = { ...getTenancyQuery(req), _id: new mongodb_2.ObjectId(id) };
            const test = await db.collection('class_tests').findOne(query);
            if (!test)
                return res.status(404).json({ error: "Test not found" });
            const marksCount = await db.collection('test_marks').countDocuments({ test_id: new mongodb_2.ObjectId(id) });
            res.json({ data: { ...test, marksCount } });
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    static async deleteTest(req, res) {
        try {
            const db = getRequestDb(req);
            const { id } = req.params;
            const tenantQuery = getTenancyQuery(req);
            const query = { ...tenantQuery, _id: new mongodb_2.ObjectId(id) };
            const test = await db.collection('class_tests').findOne(query);
            if (!test)
                return res.status(404).json({ error: "Test not found" });
            // Cascade delete associated marks
            await db.collection('test_marks').deleteMany({ test_id: new mongodb_2.ObjectId(id) });
            await db.collection('class_tests').deleteOne(query);
            res.json({ message: "Test and all associated marks deleted" });
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    // --- MARKS ---
    static async getTestMarks(req, res) {
        try {
            const db = getRequestDb(req);
            const { test_id } = req.params;
            const query = getTenancyQuery(req);
            const test = await db.collection('class_tests').findOne({ ...query, _id: new mongodb_2.ObjectId(test_id) });
            if (!test)
                return res.status(404).json({ error: "Test not found" });
            const classIdStr = test.class_id || test.classId;
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
            // Fetch students in this class
            const students = await db.collection('students').find(studentQuery).toArray();
            // Fetch marks already entered
            const marks = await db.collection('test_marks').find({ test_id: new mongodb_2.ObjectId(test_id) }).toArray();
            const marksMap = new Map(marks.map((m) => [m.student_id.toString(), m]));
            const responseData = students.map((student) => {
                const m = marksMap.get(student._id.toString());
                return {
                    student_id: student._id,
                    student_name: `${student.firstName || ''} ${student.lastName || ''}`.trim() || student.studentName || student.fullName || "Unnamed Student",
                    admission_no: student.admissionNo || student.admNo || student.admission_no || "—",
                    avatar_url: student.avatarUrl || null,
                    mark: m ? {
                        id: m._id,
                        marks_obtained: m.marks_obtained,
                        grade: m.grade,
                        percentage: m.percentage,
                        remarks: m.remarks
                    } : null
                };
            });
            res.json({ data: responseData });
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    static async bulkUpsertMarks(req, res) {
        try {
            const db = getRequestDb(req);
            const { test_id } = req.params;
            const { records } = req.body; // Array of { student_id, marks_obtained, remarks }
            const tenantQuery = getTenancyQuery(req);
            const test = await db.collection('class_tests').findOne({ ...tenantQuery, _id: new mongodb_2.ObjectId(test_id) });
            if (!test)
                return res.status(404).json({ error: "Test not found" });
            let saved = 0;
            let updated = 0;
            for (const record of records) {
                const marksObtained = Number(record.marks_obtained);
                if (marksObtained > test.total_marks) {
                    return res.status(422).json({ error: `Marks obtained (${marksObtained}) exceeds total marks (${test.total_marks})`, code: "MARKS_EXCEED_TOTAL" });
                }
                const percentage = Math.round((marksObtained / test.total_marks) * 100);
                const grade = await calculateGrade(db, tenantQuery.tenantId, percentage);
                const query = {
                    test_id: new mongodb_2.ObjectId(test_id),
                    student_id: new mongodb_2.ObjectId(record.student_id)
                };
                const updatePayload = {
                    $set: {
                        marks_obtained: marksObtained,
                        percentage,
                        grade,
                        remarks: record.remarks || "",
                        updated_at: new Date()
                    },
                    $setOnInsert: {
                        created_at: new Date()
                    }
                };
                const upsertResult = await db.collection('test_marks').updateOne(query, updatePayload, { upsert: true });
                if (upsertResult.upsertedCount > 0)
                    saved++;
                else if (upsertResult.modifiedCount > 0)
                    updated++;
            }
            res.json({ data: { saved, updated, errors: [] } });
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    // --- RESULTS & ANALYTICS ---
    static async getTestResults(req, res) {
        try {
            const db = getRequestDb(req);
            const { test_id } = req.params;
            const tenantQuery = getTenancyQuery(req);
            const test = await db.collection('class_tests').findOne({ ...tenantQuery, _id: new mongodb_2.ObjectId(test_id) });
            if (!test)
                return res.status(404).json({ error: "Test not found" });
            const marks = await db.collection('test_marks').find({ test_id: new mongodb_2.ObjectId(test_id) }).toArray();
            if (marks.length === 0) {
                return res.json({
                    analytics: { highest: null, lowest: null, average: 0, pass_rate: 0, total_students: 0 },
                    distribution: [],
                    results: []
                });
            }
            // Fetch students to link names
            const studentIds = marks.map((m) => m.student_id);
            const students = await db.collection('students').find({ _id: { $in: studentIds } }).toArray();
            const studentMap = new Map(students.map((s) => [s._id.toString(), s]));
            // Sort marks descending to compute ranks
            const sortedMarks = [...marks].sort((a, b) => b.marks_obtained - a.marks_obtained);
            let rank = 1;
            const results = sortedMarks.map((m, index) => {
                if (index > 0 && m.marks_obtained < sortedMarks[index - 1].marks_obtained) {
                    rank = index + 1;
                }
                const student = studentMap.get(m.student_id.toString());
                return {
                    rank,
                    student_id: m.student_id,
                    student_name: student ? `${student.firstName || ''} ${student.lastName || ''}`.trim() || student.studentName || student.fullName || "Unnamed Student" : "Unknown Student",
                    admission_no: student ? student.admissionNo || student.admNo || student.admission_no || "—" : "—",
                    marks_obtained: m.marks_obtained,
                    total_marks: test.total_marks,
                    percentage: m.percentage,
                    grade: m.grade,
                    remarks: m.remarks
                };
            });
            // Analytics calculations
            const highest = results[0];
            const lowest = results[results.length - 1];
            const average = Number((results.reduce((acc, r) => acc + r.marks_obtained, 0) / results.length).toFixed(1));
            const passCount = results.filter(r => r.percentage >= 50).length;
            const pass_rate = Number(((passCount / results.length) * 100).toFixed(1));
            // Distribution
            const distribution = [
                { range: "0-49", count: results.filter(r => r.percentage < 50).length },
                { range: "50-59", count: results.filter(r => r.percentage >= 50 && r.percentage <= 59).length },
                { range: "60-69", count: results.filter(r => r.percentage >= 60 && r.percentage <= 69).length },
                { range: "70-79", count: results.filter(r => r.percentage >= 70 && r.percentage <= 79).length },
                { range: "80-89", count: results.filter(r => r.percentage >= 80 && r.percentage <= 89).length },
                { range: "90-100", count: results.filter(r => r.percentage >= 90).length }
            ];
            res.json({
                data: {
                    analytics: {
                        highest: highest ? { student_name: highest.student_name, marks: highest.marks_obtained } : null,
                        lowest: lowest ? { student_name: lowest.student_name, marks: lowest.marks_obtained } : null,
                        average,
                        pass_rate,
                        total_students: results.length
                    },
                    distribution,
                    results
                }
            });
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}
exports.ClassTestsController = ClassTestsController;
