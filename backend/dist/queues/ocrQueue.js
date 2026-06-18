"use strict";
/**
 * Node.js OCR & AI Queue Management
 * Uses BullMQ and Redis for background processing of OCR jobs, PDF parsing, AI classification, and exam generation.
 * Includes robust enterprise memory queue simulation if Redis is not running in the current environment.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ocrQueueInstance = exports.NodeOCRQueue = void 0;
const mongodb_1 = require("../lib/mongodb");
const ocrEngine_1 = require("../modules/OCR/ocrEngine");
const pdfParser_1 = require("../modules/questionImport/pdfParser");
const questionSplitter_1 = require("../modules/questionImport/questionSplitter");
const aiClassifier_1 = require("../modules/AI/aiClassifier");
class NodeOCRQueue {
    constructor() {
        this.isRedisAvailable = false;
        this.bullQueue = null;
        this.initQueue();
    }
    async initQueue() {
        try {
            // Default to ultra-fast memory queue unless Redis is explicitly configured
            if (process.env.REDIS_URL || process.env.USE_REDIS === 'true') {
                const { Queue, Worker } = await Promise.resolve().then(() => __importStar(require("bullmq")));
                this.bullQueue = new Queue("ocr-ai-processing", { connection: { host: "localhost", port: 6379 } });
                this.isRedisAvailable = true;
                new Worker("ocr-ai-processing", async (job) => {
                    await this.processJobLogic(job.data);
                }, { connection: { host: "localhost", port: 6379 } });
            }
            else {
                console.warn("[NodeOCRQueue] Redis not explicitly enabled. Operating via robust async memory queue for maximum speed.");
                this.isRedisAvailable = false;
            }
        }
        catch (err) {
            console.warn("[NodeOCRQueue] BullMQ/Redis connection unavailable. Operating via robust async memory queue.");
            this.isRedisAvailable = false;
        }
    }
    async addJob(jobData) {
        if (this.isRedisAvailable && this.bullQueue) {
            await this.bullQueue.add("process-ocr", jobData);
        }
        else {
            // Memory queue simulation
            setTimeout(async () => {
                await this.processJobLogic(jobData);
            }, 1500);
        }
    }
    async processJobLogic(data) {
        // Use the SAME database the job was created in (tenant DB), not meta.
        const db = data.tenantDbName ? (0, mongodb_1.getTenantDb)(data.tenantDbName) : (0, mongodb_1.getMetaDb)();
        try {
            const { jobId, buffer, filename, subjectId, chapterId, classId } = data;
            // Update status to processing
            await db.collection('ocr_jobs').updateOne({ jobId }, { $set: { status: "Processing", progress: 25, updatedAt: new Date() } });
            // 1. Parse PDF / Image
            const parsedDoc = await pdfParser_1.pdfParserInstance.parseDocumentBuffer(buffer, filename);
            await db.collection('ocr_jobs').updateOne({ jobId }, { $set: { progress: 50, updatedAt: new Date() } });
            // 2. OCR Extraction if needed
            const rawText = parsedDoc.textPages.join("\n");
            let fullText = rawText;
            // Only run OCR if the PDF has no native text OR if it's explicitly an image file
            if (!fullText.trim() || filename.match(/\.(png|jpe?g)$/i)) {
                const ocrResult = await ocrEngine_1.ocrEngineInstance.extractTextFromBuffer(buffer, filename);
                fullText = ocrResult.text || rawText;
            }
            await db.collection('ocr_jobs').updateOne({ jobId }, { $set: { progress: 70, updatedAt: new Date() } });
            // 3. Split into Questions
            const rawQuestions = questionSplitter_1.questionSplitterInstance.splitIntoQuestions(fullText);
            // 4. Classify & Enrich Questions
            const enrichedQuestions = [];
            for (const q of rawQuestions) {
                const classified = await aiClassifier_1.aiClassifierInstance.classifyQuestion(q);
                enrichedQuestions.push({
                    ...classified,
                    subjectId: subjectId || q.subjectId,
                    chapterId: chapterId || q.chapterId,
                    classId: classId || q.classId,
                    approvalStatus: "Approved"
                });
            }
            // Save completed results
            await db.collection('ocr_jobs').updateOne({ jobId }, {
                $set: {
                    status: "Completed",
                    progress: 100,
                    extractedQuestions: enrichedQuestions,
                    tables: parsedDoc.tables || [],
                    images: parsedDoc.images || [],
                    rawText: fullText,
                    updatedAt: new Date()
                }
            });
            console.log(`[NodeOCRQueue] Job ${jobId} completed successfully.`);
        }
        catch (error) {
            console.error(`[NodeOCRQueue] Job processing failed for ${data.jobId}:`, error);
            try {
                await db.collection('ocr_jobs').updateOne({ jobId: data.jobId }, { $set: { status: "Failed", error: error.message, updatedAt: new Date() } });
            }
            catch (e) { }
        }
    }
}
exports.NodeOCRQueue = NodeOCRQueue;
exports.ocrQueueInstance = new NodeOCRQueue();
