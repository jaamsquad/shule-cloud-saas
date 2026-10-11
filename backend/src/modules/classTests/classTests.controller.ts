import { Request, Response } from 'express';
import { getMetaDb } from '../../lib/mongodb';
import { ObjectId } from 'mongodb';
import { resolveGrading } from '../../lib/grading';
const getRequestDb = (req: any) => req.tenantDb || getMetaDb();

// Helper to get db & ensure tenancy
const getTenancyQuery = (req: Request) => {
    const tenantId = req.tenantContext?.tenantId || (req as any).tenant?._id;
    if (!tenantId) throw new Error("Tenant context missing");
    return { tenantId: new ObjectId(tenantId) };
};

// The 5-point A+/A/B… scale this module used to insert for every school. A saved scale
// identical to it was never chosen by the school, so it's treated as "not set".
const LEGACY_AUTO_SCALE = [
    { min_percent: 90, max_percent: 100, grade: "A+", label: "Excellent", points: 5.0 },
    { min_percent: 80, max_percent: 89, grade: "A", label: "Very Good", points: 4.0 },
    { min_percent: 70, max_percent: 79, grade: "B", label: "Good", points: 3.0 },
    { min_percent: 60, max_percent: 69, grade: "C", label: "Fair", points: 2.0 },
    { min_percent: 50, max_percent: 59, grade: "D", label: "Pass", points: 1.0 },
    { min_percent: 0, max_percent: 49, grade: "F", label: "Fail", points: 0.0 }
];
const isLegacyAuto = (scales: any) => {
    if (!Array.isArray(scales) || scales.length !== LEGACY_AUTO_SCALE.length) return false;
    return scales.every((s: any, i: number) => {
        const d: any = LEGACY_AUTO_SCALE[i];
        return s && s.grade === d.grade && Number(s.min_percent) === d.min_percent && Number(s.max_percent) === d.max_percent && Number(s.points) === d.points;
    });
};
/** A class-test scale the school actually saved (else null → use the configured grading). */
const savedTestScale = async (db: any, tenantId: ObjectId) => {
    const doc = await db.collection('grading_scales').findOne({ tenantId });
    return doc && Array.isArray(doc.scales) && doc.scales.length && !isLegacyAuto(doc.scales) ? doc : null;
};
/** The configured grading (class template → class → global → curriculum → default) in this module's shape. */
const configuredAsTestScale = async (db: any, classId?: string, className?: string) =>
    (await resolveGrading(db, classId, className)).scale.map(b => ({ min_percent: b.from, max_percent: b.upto, grade: b.grade, label: b.remark, points: b.points }));

/** pct → grade for a class test: the school's saved class-test scale, else the class's configured grading. */
const testGrader = async (db: any, tenantId: ObjectId, classId?: string, className?: string): Promise<(pct: number) => string> => {
    const saved = await savedTestScale(db, tenantId);
    if (saved) return (percentage: number) => saved.scales.find((s: any) => percentage >= s.min_percent && percentage <= s.max_percent)?.grade || "F";
    const grading = await resolveGrading(db, classId, className);
    return (percentage: number) => grading.gradeOf(percentage).grade;
};

export class ClassTestsController {
    // --- GRADING SCALE ---
    public static async getGradingScale(req: Request, res: Response) {
        try {
            const db = getRequestDb(req);
            const query = getTenancyQuery(req);
            // The school's own class-test scale if it saved one; otherwise the configured
            // grading (nothing is written — no hard-coded default is stored).
            let scale: any = await savedTestScale(db, query.tenantId);
            if (!scale) {
                const classId = req.query.class_id ? String(req.query.class_id) : undefined;
                const className = req.query.class_name ? String(req.query.class_name) : undefined;
                scale = { ...query, scales: await configuredAsTestScale(db, classId, className) };
            }
            res.json({ data: scale });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    public static async updateGradingScale(req: Request, res: Response) {
        try {
            const db = getRequestDb(req);
            const query = getTenancyQuery(req);
            const { scales } = req.body;
            await db.collection('grading_scales').updateOne(
                query,
                { $set: { scales } },
                { upsert: true }
            );
            res.json({ message: "Grading scale updated successfully" });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    // --- CLASS TESTS ---
    public static async getTests(req: Request, res: Response) {
        try {
            const db = getRequestDb(req);
            const query: any = { ...getTenancyQuery(req) };
            if (req.query.class_id) query['class_id'] = req.query.class_id;
            if (req.query.subject_id) query['subject_id'] = req.query.subject_id;
            if (req.query.academic_year_id) query['academic_year_id'] = req.query.academic_year_id;
            if (req.query.semester_id) query['semester_id'] = req.query.semester_id;

            const tests = await db.collection('class_tests').find(query).sort({ date: -1 }).toArray();
            res.json({ data: tests });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    public static async createTest(req: Request, res: Response) {
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
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    public static async getTestDetail(req: Request, res: Response) {
        try {
            const db = getRequestDb(req);
            const { id } = req.params;
            const query = { ...getTenancyQuery(req), _id: new ObjectId(id) };
            const test = await db.collection('class_tests').findOne(query);
            if (!test) return res.status(404).json({ error: "Test not found" });
            
            const marksCount = await db.collection('test_marks').countDocuments({ test_id: new ObjectId(id) });
            res.json({ data: { ...test, marksCount } });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    public static async deleteTest(req: Request, res: Response) {
        try {
            const db = getRequestDb(req);
            const { id } = req.params;
            const tenantQuery = getTenancyQuery(req);
            const query = { ...tenantQuery, _id: new ObjectId(id) };
            
            const test = await db.collection('class_tests').findOne(query);
            if (!test) return res.status(404).json({ error: "Test not found" });

            // Cascade delete associated marks
            await db.collection('test_marks').deleteMany({ test_id: new ObjectId(id) });
            await db.collection('class_tests').deleteOne(query);

            res.json({ message: "Test and all associated marks deleted" });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    // --- MARKS ---
    public static async getTestMarks(req: Request, res: Response) {
        try {
            const db = getRequestDb(req);
            const { test_id } = req.params;
            const query = getTenancyQuery(req);

            const test = await db.collection('class_tests').findOne({ ...query, _id: new ObjectId(test_id) });
            if (!test) return res.status(404).json({ error: "Test not found" });

            const classIdStr = test.class_id || test.classId;
            let className = '';
            if (ObjectId.isValid(classIdStr)) {
                const classDoc = await db.collection('classes').findOne({ _id: new ObjectId(classIdStr) });
                if (classDoc) {
                    className = classDoc.levelName || classDoc.name;
                }
            }

            const classFilters: any[] = [];
            if (classIdStr) {
                classFilters.push({ classId: classIdStr });
                if (ObjectId.isValid(classIdStr)) {
                    classFilters.push({ classId: new ObjectId(classIdStr) });
                }
            }
            if (className) {
                classFilters.push({ studentClass: className });
                classFilters.push({ studentClass: { $regex: new RegExp(`^${className}$`, 'i') } });
            }

            const studentQuery: any = {};
            if (classFilters.length > 0) {
                studentQuery.$or = classFilters;
            }

            // Fetch students in this class
            const students = await db.collection('students').find(studentQuery).toArray();

            // Fetch marks already entered
            const marks = await db.collection('test_marks').find({ test_id: new ObjectId(test_id) }).toArray();
            const marksMap = new Map(marks.map((m: any) => [m.student_id.toString(), m]));

            const responseData = (students as any[]).map((student: any) => {
                const m: any = marksMap.get(student._id.toString());
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
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    public static async bulkUpsertMarks(req: Request, res: Response) {
        try {
            const db = getRequestDb(req);
            const { test_id } = req.params;
            const { records } = req.body; // Array of { student_id, marks_obtained, remarks }
            const tenantQuery = getTenancyQuery(req);

            const test = await db.collection('class_tests').findOne({ ...tenantQuery, _id: new ObjectId(test_id) });
            if (!test) return res.status(404).json({ error: "Test not found" });

            let saved = 0;
            let updated = 0;

            // The test's class (id + name) so grades follow that class's configured grading.
            const testClassId = test.class_id || test.classId ? String(test.class_id || test.classId) : undefined;
            let testClassName: string | undefined = test.class_name || test.className || undefined;
            if (!testClassName && testClassId && ObjectId.isValid(testClassId)) {
                const classDoc: any = await db.collection('classes').findOne({ _id: new ObjectId(testClassId) }).catch(() => null);
                testClassName = classDoc?.levelName || classDoc?.name || undefined;
            }

            const calculateGrade = await testGrader(db, tenantQuery.tenantId, testClassId, testClassName);

            for (const record of records) {
                const marksObtained = Number(record.marks_obtained);
                if (marksObtained > test.total_marks) {
                    return res.status(422).json({ error: `Marks obtained (${marksObtained}) exceeds total marks (${test.total_marks})`, code: "MARKS_EXCEED_TOTAL" });
                }

                const percentage = Math.round((marksObtained / test.total_marks) * 100);
                const grade = calculateGrade(percentage);

                const query = {
                    test_id: new ObjectId(test_id),
                    student_id: new ObjectId(record.student_id)
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
                if (upsertResult.upsertedCount > 0) saved++;
                else if (upsertResult.modifiedCount > 0) updated++;
            }

            res.json({ data: { saved, updated, errors: [] } });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    // --- RESULTS & ANALYTICS ---
    public static async getTestResults(req: Request, res: Response) {
        try {
            const db = getRequestDb(req);
            const { test_id } = req.params;
            const tenantQuery = getTenancyQuery(req);

            const test = await db.collection('class_tests').findOne({ ...tenantQuery, _id: new ObjectId(test_id) });
            if (!test) return res.status(404).json({ error: "Test not found" });

            const marks = await db.collection('test_marks').find({ test_id: new ObjectId(test_id) }).toArray();
            if (marks.length === 0) {
                return res.json({
                    analytics: { highest: null, lowest: null, average: 0, pass_rate: 0, total_students: 0 },
                    distribution: [],
                    results: []
                });
            }

            // Fetch students to link names
            const studentIds = marks.map((m: any) => m.student_id);
            const students = await db.collection('students').find({ _id: { $in: studentIds } }).toArray();
            const studentMap = new Map(students.map((s: any) => [s._id.toString(), s]));

            // Sort marks descending to compute ranks
            const sortedMarks = [...marks].sort((a: any, b: any) => b.marks_obtained - a.marks_obtained);

            let rank = 1;
            const results = sortedMarks.map((m: any, index: number) => {
                if (index > 0 && m.marks_obtained < sortedMarks[index - 1].marks_obtained) {
                    rank = index + 1;
                }
                const student: any = studentMap.get(m.student_id.toString());
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
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }
}