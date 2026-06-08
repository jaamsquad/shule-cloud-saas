/**
 * Node.js Question Bank Routes
 * Express routes for central Question Bank collection.
 */

import { Router } from "express";
import * as c from "./questionBank.controller";

const router = Router();

router.get('/questions', c.getQuestions);
router.post('/questions', c.createQuestion);
router.put('/questions/:id', c.updateQuestion);
router.delete('/questions/:id', c.deleteQuestion);
router.post('/questions/bulk', c.bulkCreateQuestions);

export default router;
