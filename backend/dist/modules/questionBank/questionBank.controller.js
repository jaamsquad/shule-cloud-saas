"use strict";
/**
 * Node.js Question Bank Controller
 * CRUD operations and bulk ingestion for central Question Bank collection.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getQuestions = getQuestions;
exports.createQuestion = createQuestion;
exports.updateQuestion = updateQuestion;
exports.deleteQuestion = deleteQuestion;
exports.bulkCreateQuestions = bulkCreateQuestions;
const mongodb_1 = require("../../lib/mongodb");
const mongodb_2 = require("mongodb");
const getRequestDb = (req) => req.tenantDb || (0, mongodb_1.getMetaDb)();
async function getQuestions(req, res) {
    try {
        const db = getRequestDb(req);
        const filter = {};
        if (req.query.subjectId)
            filter.subjectId = req.query.subjectId;
        if (req.query.chapterId)
            filter.chapterId = req.query.chapterId;
        if (req.query.classId)
            filter.classId = req.query.classId;
        if (req.query.difficulty)
            filter.difficulty = req.query.difficulty;
        if (req.query.bloomLevel)
            filter.bloomLevel = req.query.bloomLevel;
        if (req.query.questionType)
            filter.questionType = req.query.questionType;
        const questions = await db.collection('questions').find(filter).sort({ createdAt: -1 }).toArray();
        return res.json(questions);
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
}
async function createQuestion(req, res) {
    try {
        const db = getRequestDb(req);
        const newQuestion = { ...req.body, createdAt: new Date() };
        const result = await db.collection('questions').insertOne(newQuestion);
        return res.status(201).json({ _id: result.insertedId, ...newQuestion });
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
}
async function updateQuestion(req, res) {
    try {
        const db = getRequestDb(req);
        const { id } = req.params;
        const updateData = { ...req.body, updatedAt: new Date() };
        delete updateData._id;
        await db.collection('questions').updateOne({ _id: new mongodb_2.ObjectId(id) }, { $set: updateData });
        return res.json({ message: "Question updated successfully" });
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
}
async function deleteQuestion(req, res) {
    try {
        const db = getRequestDb(req);
        const { id } = req.params;
        await db.collection('questions').deleteOne({ _id: new mongodb_2.ObjectId(id) });
        return res.json({ message: "Question deleted successfully" });
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
}
async function bulkCreateQuestions(req, res) {
    try {
        const db = getRequestDb(req);
        const { questions } = req.body;
        if (!Array.isArray(questions) || questions.length === 0) {
            return res.status(400).json({ message: "No questions provided for bulk ingestion." });
        }
        const formatted = questions.map((q) => ({
            questionText: q.questionText || "",
            questionType: q.questionType || "Essay",
            subjectId: q.subjectId || q.subject || "General",
            classId: q.classId || "General",
            chapterId: q.chapterId || q.chapter || "General",
            topic: q.topic || q.topicId || "General",
            difficulty: q.difficulty || "MEDIUM",
            bloomLevel: q.bloomLevel || "Applying",
            marks: Number(q.marks) || 5,
            options: q.options || [],
            correctAnswer: q.correctAnswer || "",
            explanation: q.explanation || "Extracted via AI OCR Engine",
            sourceDocument: q.sourceDocument || q.filename || "Direct Bank Upload",
            aiConfidence: q.aiConfidence || 1.0,
            tags: q.tags || ["QuestionBank"],
            createdAt: new Date()
        }));
        const result = await db.collection('questions').insertMany(formatted);
        return res.status(201).json({ insertedCount: result.insertedCount, message: "Questions successfully verified & saved to central Question Bank" });
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
}
