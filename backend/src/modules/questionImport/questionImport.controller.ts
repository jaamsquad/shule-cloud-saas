/**
 * Node.js Question Import Controller
 * Handles document ingestion, queue initialization, status polling, and job cleanup.
 */

import { Request, Response } from "express";
import { getMetaDb } from "../../lib/mongodb";
import { ocrQueueInstance } from "../../queues/ocrQueue";
import { extractBase64Data } from "../../utils/helpers";
const getRequestDb = (req: any) => req.tenantDb || getMetaDb();

export async function uploadDocument(req: Request, res: Response) {
    try {
        const db = getRequestDb(req);
        const { file, filename, subjectId, chapterId, classId, ocrMode } = req.body;

        if (!file && !req.file) {
            return res.status(400).json({ message: "No document file provided for ingestion." });
        }

        const actualFilename = filename || (req.file ? req.file.originalname : "scanned_document.pdf");
        const buffer = req.file ? req.file.buffer : extractBase64Data(file);

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

        // Add job to BullMQ / Redis / Memory Queue
        await ocrQueueInstance.addJob({
            jobId,
            buffer,
            filename: actualFilename,
            subjectId,
            chapterId,
            classId,
            ocrMode: ocrMode || "DEEP_OCR"
        });

        return res.status(202).json({
            jobId,
            status: "Processing",
            message: "Document successfully ingested into Node.js AI OCR extraction queue."
        });
    } catch (error: any) {
        return res.status(500).json({ message: error.message });
    }
}

export async function getJobsHistory(req: Request, res: Response) {
    try {
        const db = getRequestDb(req);
        const jobs = await db.collection('ocr_jobs').find().sort({ createdAt: -1 }).toArray();
        return res.json(jobs);
    } catch (error: any) {
        return res.status(500).json({ message: error.message });
    }
}

export async function getJobStatus(req: Request, res: Response) {
    try {
        const db = getRequestDb(req);
        const job = await db.collection('ocr_jobs').findOne({ jobId: req.params.id });
        if (!job) return res.status(404).json({ message: "OCR Job not found." });
        return res.json(job);
    } catch (error: any) {
        return res.status(500).json({ message: error.message });
    }
}

export async function getJobResults(req: Request, res: Response) {
    try {
        const db = getRequestDb(req);
        const job = await db.collection('ocr_jobs').findOne({ jobId: req.params.id });
        if (!job) return res.status(404).json({ message: "OCR Job results not found." });
        return res.json(job);
    } catch (error: any) {
        return res.status(500).json({ message: error.message });
    }
}

export async function deleteJob(req: Request, res: Response) {
    try {
        const db = getRequestDb(req);
        await db.collection('ocr_jobs').deleteOne({ jobId: req.params.jobId });
        return res.json({ message: "OCR Job cleaned up successfully." });
    } catch (error: any) {
        return res.status(500).json({ message: error.message });
    }
}