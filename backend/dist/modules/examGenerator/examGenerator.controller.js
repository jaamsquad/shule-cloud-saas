"use strict";
/**
 * Node.js Exam Generator Controller
 * Generates balanced examination papers matching blueprint criteria, avoiding duplicates, and balancing difficulty ratios.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateExamPaper = generateExamPaper;
exports.saveBlueprint = saveBlueprint;
exports.exportExamPDF = exportExamPDF;
exports.exportExamWord = exportExamWord;
const mongodb_1 = require("../../lib/mongodb");
const pdfExport_service_1 = require("./pdfExport.service");
const wordExport_service_1 = require("./wordExport.service");
const mongodb_2 = require("mongodb");
const getRequestDb = (req) => req.tenantDb || (0, mongodb_1.getMetaDb)();
async function generateExamPaper(req, res) {
    try {
        const db = getRequestDb(req);
        const { paperTitle, subjectId, classId, totalMarks, difficultyRatio, topics, sections, watermark, isManual, instructions } = req.body;
        const targetMarks = Number(totalMarks) || 100;
        const ratio = difficultyRatio || { easy: 30, medium: 50, hard: 20 };
        if (isManual) {
            let accumulatedMarks = 0;
            const generatedQuestions = [];
            if (sections && Array.isArray(sections)) {
                sections.forEach(sec => {
                    if (sec.questions && Array.isArray(sec.questions)) {
                        sec.questions.forEach((q) => {
                            accumulatedMarks += (Number(q.marks) || 5);
                            generatedQuestions.push(q);
                        });
                    }
                });
            }
            const verificationCode = `VERIFY-QR-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 10000)}`;
            const newExam = {
                paperTitle: paperTitle || "Manual Examination Paper",
                subjectId, classId,
                instructions: instructions || "Answer all questions in the provided booklet.",
                totalMarks: accumulatedMarks,
                targetMarks,
                difficultyRatio: ratio,
                watermark: watermark || "SHULECLOUD ERP CONFIDENTIAL",
                verificationCode,
                sections: sections || [],
                generatedQuestions,
                createdAt: new Date(),
                status: "Published"
            };
            const result = await db.collection('question_papers').insertOne(newExam);
            return res.status(201).json({ examId: result.insertedId, ...newExam, message: "Manual examination paper successfully compiled." });
        }
        const filter = {};
        if (subjectId)
            filter.subjectId = subjectId;
        if (classId)
            filter.classId = classId;
        if (topics && Array.isArray(topics) && topics.length > 0) {
            filter.topic = { $in: topics };
        }
        const allQuestions = await db.collection('questions').find(filter).toArray();
        // Separate by difficulty
        const easyQ = allQuestions.filter((q) => q.difficulty === 'EASY');
        const medQ = allQuestions.filter((q) => q.difficulty === 'MEDIUM');
        const hardQ = allQuestions.filter((q) => q.difficulty === 'HARD');
        // Shuffle helper
        const shuffle = (arr) => arr.sort(() => 0.5 - Math.random());
        shuffle(easyQ);
        shuffle(medQ);
        shuffle(hardQ);
        const generatedQuestions = [];
        let accumulatedMarks = 0;
        const easyMarksTarget = (targetMarks * (ratio.easy || 30)) / 100;
        const medMarksTarget = (targetMarks * (ratio.medium || 50)) / 100;
        // Pick Easy
        let currentEasyMarks = 0;
        for (const q of easyQ) {
            const m = Number(q.marks) || 5;
            if (currentEasyMarks + m <= easyMarksTarget) {
                generatedQuestions.push(q);
                currentEasyMarks += m;
                accumulatedMarks += m;
            }
        }
        // Pick Medium
        let currentMedMarks = 0;
        for (const q of medQ) {
            const m = Number(q.marks) || 5;
            if (currentMedMarks + m <= medMarksTarget) {
                generatedQuestions.push(q);
                currentMedMarks += m;
                accumulatedMarks += m;
            }
        }
        // Pick Hard to fill remaining
        for (const q of hardQ) {
            const m = Number(q.marks) || 5;
            if (accumulatedMarks + m <= targetMarks) {
                generatedQuestions.push(q);
                accumulatedMarks += m;
            }
        }
        // If still under target marks, fill from any remaining questions avoiding duplicates
        if (accumulatedMarks < targetMarks) {
            const remaining = allQuestions.filter((q) => !generatedQuestions.includes(q));
            shuffle(remaining);
            for (const q of remaining) {
                const m = Number(q.marks) || 5;
                if (accumulatedMarks + m <= targetMarks) {
                    generatedQuestions.push(q);
                    accumulatedMarks += m;
                }
            }
        }
        const verificationCode = `VERIFY-QR-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 10000)}`;
        const newExam = {
            paperTitle: paperTitle || "Generated Examination Paper",
            subjectId,
            classId,
            instructions: instructions || "Answer all questions in the provided booklet.",
            totalMarks: accumulatedMarks,
            targetMarks,
            difficultyRatio: ratio,
            watermark: watermark || "SHULECLOUD ERP CONFIDENTIAL",
            verificationCode,
            sections: sections || [],
            generatedQuestions,
            createdAt: new Date(),
            status: "Published"
        };
        const result = await db.collection('question_papers').insertOne(newExam);
        return res.status(201).json({
            examId: result.insertedId,
            ...newExam,
            message: "Examination paper successfully generated matching blueprint distribution."
        });
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
}
async function saveBlueprint(req, res) {
    try {
        const db = getRequestDb(req);
        const blueprint = { ...req.body, createdAt: new Date() };
        const result = await db.collection('exam_blueprints').insertOne(blueprint);
        return res.status(201).json({ blueprintId: result.insertedId, ...blueprint, message: "Exam blueprint saved successfully." });
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
}
async function exportExamPDF(req, res) {
    try {
        const db = getRequestDb(req);
        const exam = await db.collection('question_papers').findOne({ _id: new mongodb_2.ObjectId(req.params.id) });
        if (!exam)
            return res.status(404).json({ message: "Exam paper not found." });
        const pdfBuffer = await pdfExport_service_1.pdfExportInstance.generateExamPDFBuffer(exam);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${exam.paperTitle || 'exam'}.pdf"`);
        return res.send(pdfBuffer);
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
}
async function exportExamWord(req, res) {
    try {
        const db = getRequestDb(req);
        const exam = await db.collection('question_papers').findOne({ _id: new mongodb_2.ObjectId(req.params.id) });
        if (!exam)
            return res.status(404).json({ message: "Exam paper not found." });
        const wordBuffer = await wordExport_service_1.wordExportInstance.generateExamWordBuffer(exam);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename="${exam.paperTitle || 'exam'}.docx"`);
        return res.send(wordBuffer);
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
}
