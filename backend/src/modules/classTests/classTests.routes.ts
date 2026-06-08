import { Router } from 'express';
import { ClassTestsController } from './classTests.controller';

const router = Router();

// Grading scale
router.get('/grading-scale', ClassTestsController.getGradingScale);
router.put('/grading-scale', ClassTestsController.updateGradingScale);

// Class Tests
router.get('/class-tests', ClassTestsController.getTests);
router.post('/class-tests', ClassTestsController.createTest);
router.get('/class-tests/:id', ClassTestsController.getTestDetail);
router.delete('/class-tests/:id', ClassTestsController.deleteTest);

// Marks Entry
router.get('/class-tests/:test_id/marks', ClassTestsController.getTestMarks);
router.post('/class-tests/:test_id/marks/bulk', ClassTestsController.bulkUpsertMarks);

// Results & Analytics
router.get('/class-tests/:test_id/results', ClassTestsController.getTestResults);

export default router;
