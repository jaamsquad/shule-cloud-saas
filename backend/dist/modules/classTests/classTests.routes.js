"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const classTests_controller_1 = require("./classTests.controller");
const router = (0, express_1.Router)();
// Grading scale
router.get('/grading-scale', classTests_controller_1.ClassTestsController.getGradingScale);
router.put('/grading-scale', classTests_controller_1.ClassTestsController.updateGradingScale);
// Class Tests
router.get('/class-tests', classTests_controller_1.ClassTestsController.getTests);
router.post('/class-tests', classTests_controller_1.ClassTestsController.createTest);
router.get('/class-tests/:id', classTests_controller_1.ClassTestsController.getTestDetail);
router.delete('/class-tests/:id', classTests_controller_1.ClassTestsController.deleteTest);
// Marks Entry
router.get('/class-tests/:test_id/marks', classTests_controller_1.ClassTestsController.getTestMarks);
router.post('/class-tests/:test_id/marks/bulk', classTests_controller_1.ClassTestsController.bulkUpsertMarks);
// Results & Analytics
router.get('/class-tests/:test_id/results', classTests_controller_1.ClassTestsController.getTestResults);
exports.default = router;
