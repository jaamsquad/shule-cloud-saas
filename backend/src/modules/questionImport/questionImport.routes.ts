/**
 * Node.js Question Import Routes
 * Express routes for document upload, OCR queue status, and job logs.
 */

import { Router } from "express";
import multer from "multer";
import * as c from "./questionImport.controller";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

router.post('/question-import/upload', upload.single('file'), c.uploadDocument);
router.get('/question-import/jobs', c.getJobsHistory);
router.get('/question-import/status/:id', c.getJobStatus);
router.get('/question-import/results/:id', c.getJobResults);
router.delete('/question-import/:jobId', c.deleteJob);

export default router;
