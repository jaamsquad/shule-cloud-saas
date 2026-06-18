/**
 * Node.js OCR & AI Queue Management
 * Uses BullMQ and Redis for background processing of OCR jobs, PDF parsing, AI classification, and exam generation.
 * Includes robust enterprise memory queue simulation if Redis is not running in the current environment.
 */

import { getMetaDb, getTenantDb } from "../lib/mongodb";
import { ocrEngineInstance } from "../modules/OCR/ocrEngine";
import { pdfParserInstance } from "../modules/questionImport/pdfParser";
import { questionSplitterInstance } from "../modules/questionImport/questionSplitter";
import { aiClassifierInstance } from "../modules/AI/aiClassifier";

export class NodeOCRQueue {
    private isRedisAvailable: boolean = false;
    private bullQueue: any = null;

    constructor() {
        this.initQueue();
    }

    private async initQueue() {
        try {
            // Default to ultra-fast memory queue unless Redis is explicitly configured
            if (process.env.REDIS_URL || process.env.USE_REDIS === 'true') {
                const { Queue, Worker } = await import("bullmq");
                this.bullQueue = new Queue("ocr-ai-processing", { connection: { host: "localhost", port: 6379 } });
                this.isRedisAvailable = true;

                new Worker("ocr-ai-processing", async (job) => {
                    await this.processJobLogic(job.data);
                }, { connection: { host: "localhost", port: 6379 } });
            } else {
                console.warn("[NodeOCRQueue] Redis not explicitly enabled. Operating via robust async memory queue for maximum speed.");
                this.isRedisAvailable = false;
            }
        } catch (err) {
            console.warn("[NodeOCRQueue] BullMQ/Redis connection unavailable. Operating via robust async memory queue.");
            this.isRedisAvailable = false;
        }
    }

    public async addJob(jobData: { jobId: string; buffer: Buffer; filename: string; subjectId?: string; chapterId?: string; classId?: string; ocrMode?: string; tenantDbName?: string | null }) {
        if (this.isRedisAvailable && this.bullQueue) {
            await this.bullQueue.add("process-ocr", jobData);
        } else {
            // Memory queue simulation
            setTimeout(async () => {
                await this.processJobLogic(jobData);
            }, 1500);
        }
    }

    private async processJobLogic(data: { jobId: string; buffer: Buffer; filename: string; subjectId?: string; chapterId?: string; classId?: string; ocrMode?: string; tenantDbName?: string | null }) {
        // Use the SAME database the job was created in (tenant DB), not meta.
        const db = data.tenantDbName ? getTenantDb(data.tenantDbName) : getMetaDb();
        try {
            const { jobId, buffer, filename, subjectId, chapterId, classId } = data;

            // Update status to processing
            await db.collection('ocr_jobs').updateOne({ jobId }, { $set: { status: "Processing", progress: 25, updatedAt: new Date() } });

            // 1. Parse PDF / Image
            const parsedDoc = await pdfParserInstance.parseDocumentBuffer(buffer, filename);
            await db.collection('ocr_jobs').updateOne({ jobId }, { $set: { progress: 50, updatedAt: new Date() } });

            // 2. OCR Extraction if needed
            const rawText = parsedDoc.textPages.join("\n");
            let fullText = rawText;
            // Only run OCR if the PDF has no native text OR if it's explicitly an image file
            if (!fullText.trim() || filename.match(/\.(png|jpe?g)$/i)) {
                const ocrResult = await ocrEngineInstance.extractTextFromBuffer(buffer, filename);
                fullText = ocrResult.text || rawText;
            }
            await db.collection('ocr_jobs').updateOne({ jobId }, { $set: { progress: 70, updatedAt: new Date() } });

            // 3. Split into Questions
            const rawQuestions = questionSplitterInstance.splitIntoQuestions(fullText);

            // 4. Classify & Enrich Questions
            const enrichedQuestions: any[] = [];
            for (const q of rawQuestions) {
                const classified = await aiClassifierInstance.classifyQuestion(q);
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
        } catch (error: any) {
            console.error(`[NodeOCRQueue] Job processing failed for ${data.jobId}:`, error);
            try {
                await db.collection('ocr_jobs').updateOne({ jobId: data.jobId }, { $set: { status: "Failed", error: error.message, updatedAt: new Date() } });
            } catch (e) {}
        }
    }
}

export const ocrQueueInstance = new NodeOCRQueue();
