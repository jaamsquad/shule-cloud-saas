"use strict";
/**
 * Node.js Question Import Controller
 * Handles document ingestion, queue initialization, status polling, and job cleanup.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadDocument = uploadDocument;
exports.getJobsHistory = getJobsHistory;
exports.getJobStatus = getJobStatus;
exports.getJobResults = getJobResults;
exports.deleteJob = deleteJob;
const mongodb_1 = require("../../lib/mongodb");
const ocrQueue_1 = require("../../queues/ocrQueue");
const helpers_1 = require("../../utils/helpers");
const getRequestDb = (req) => req.tenantDb || (0, mongodb_1.getMetaDb)();
async function uploadDocument(req, res) {
    try {
        const db = getRequestDb(req);
        const { file, filename, subjectId, chapterId, classId, ocrMode } = req.body;
        if (!file && !req.file) {
            return res.status(400).json({ message: "No document file provided for ingestion." });
        }
        const actualFilename = filename || (req.file ? req.file.originalname : "scanned_document.pdf");
        const buffer = req.file ? req.file.buffer : (0, helpers_1.extractBase64Data)(file);
        const jobId = `ocr-job-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const initialJobRecord = {
            jobId,
            filename: actualFilename,
            status: "Processing",
            progress: 15,
            subjectId,
            chapterId,
            classId,
            ocrMode: ocrMode || "DEEP_OCR",
            createdAt: new Date(),
            updatedAt: new Date(),
            extractedQuestions: [],
            tables: [],
            images: [],
            rawText: ""
        };
        await db.collection('ocr_jobs').insertOne(initialJobRecord);
        // Add job to BullMQ / Redis / Memory Queue. Pass the tenant DB name so the
        // worker writes results back to the SAME database the job was created in.
        await ocrQueue_1.ocrQueueInstance.addJob({
            jobId,
            buffer,
            filename: actualFilename,
            subjectId,
            chapterId,
            classId,
            ocrMode: ocrMode || "DEEP_OCR",
            tenantDbName: req.tenantContext?.databaseName || req.tenantDb?.databaseName || null,
        });
        return res.status(202).json({
            jobId,
            status: "Processing",
            message: "Document successfully ingested into Node.js AI OCR extraction queue."
        });
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
}
async function getJobsHistory(req, res) {
    try {
        const db = getRequestDb(req);
        const jobs = await db.collection('ocr_jobs').find().sort({ createdAt: -1 }).toArray();
        return res.json(jobs);
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
}
async function getJobStatus(req, res) {
    try {
        const db = getRequestDb(req);
        const job = await db.collection('ocr_jobs').findOne({ jobId: req.params.id });
        if (!job)
            return res.status(404).json({ message: "OCR Job not found." });
        return res.json(job);
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
}
async function getJobResults(req, res) {
    try {
        const db = getRequestDb(req);
        const job = await db.collection('ocr_jobs').findOne({ jobId: req.params.id });
        if (!job)
            return res.status(404).json({ message: "OCR Job results not found." });
        return res.json(job);
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
}
async function deleteJob(req, res) {
    try {
        const db = getRequestDb(req);
        await db.collection('ocr_jobs').deleteOne({ jobId: req.params.jobId });
        return res.json({ message: "OCR Job cleaned up successfully." });
    }
    catch (error) {
        return res.status(500).json({ message: error.message });
    }
}
