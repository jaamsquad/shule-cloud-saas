/**
 * Node.js Exam Generator Routes
 * Express routes for automated exam generation, blueprints, and high-fidelity PDF/Word exports.
 */

import { Router } from "express";
import * as c from "./examGenerator.controller";

const router = Router();

router.post('/exam-generator/generate', c.generateExamPaper);
router.post('/exam-generator/blueprint', c.saveBlueprint);
router.get('/exams/:id/pdf', c.exportExamPDF);
router.get('/exams/:id/word', c.exportExamWord);

export default router;
